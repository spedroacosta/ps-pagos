import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, CreditCard, Shield, Plus, Edit2, Trash2, LogIn, LogOut, Search, 
  X, Calendar, Key, CheckCircle, AlertTriangle, RefreshCw, Layers, ExternalLink, Download 
} from 'lucide-react';

interface SuperTenant {
  id: string;
  name: string;
  createdAt: string;
  licenseKey: string;
  expiresAt: string;
  passwordHash: string;
  membersCount: number;
  paymentsCount: number;
  dollarPurchasesCount: number;
}

interface SuperAdminPanelProps {
  token: string;
  onLogout: () => void;
  onLoginAsTenant: (tenantId: string, tenantName: string, passwordHash: string) => void;
}

interface ActiveSession {
  sessionId: string;
  tenantId: string;
  tenantName: string;
  userAgent: string;
  ip: string;
  loggedInAt: string;
  lastActiveAt: string;
}

export const SuperAdminPanel: React.FC<SuperAdminPanelProps> = ({ token, onLogout, onLoginAsTenant }) => {
  const [tenants, setTenants] = useState<SuperTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Active Sessions States
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [currentSubTab, setCurrentSubTab] = useState<'tenants' | 'sessions' | 'config' | 'licenses'>('tenants');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<SuperTenant | null>(null);

  // Form states
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formLicenseKey, setFormLicenseKey] = useState('TRIAL');
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Config & Backup state
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [passUpdateMsg, setPassUpdateMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [backupConfig, setBackupConfig] = useState<{
    autoBackupEnabled: boolean;
    frequency: string;
    targets: { firestore: boolean; googleDrive: boolean };
    googleDriveFolderId: string;
  }>({
    autoBackupEnabled: true,
    frequency: 'daily',
    targets: { firestore: true, googleDrive: false },
    googleDriveFolderId: ''
  });
  const [backupMsg, setBackupMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Licenses Generator state
  const [genPromoName, setGenPromoName] = useState('');
  const [genDays, setGenDays] = useState(365);
  const [generatedLicenses, setGeneratedLicenses] = useState<Array<{
    licenseKey: string;
    expiresAt: string;
    days: number;
    promoName: string;
    createdAt: string;
  }>>([]);

  useEffect(() => {
    fetchTenants();
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await fetch('/api/superadmin/sessions', {
        headers: {
          'x-superadmin-token': token
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error('Error loading active sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!window.confirm('¿Estás seguro de que deseas cerrar y revocar esta sesión de forma remota? El usuario será desconectado inmediatamente.')) {
      return;
    }
    try {
      const res = await fetch('/api/superadmin/sessions/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-superadmin-token': token
        },
        body: JSON.stringify({ sessionId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchSessions();
      } else {
        alert(data.error || 'Error al cerrar la sesión.');
      }
    } catch (err) {
      alert('Error de red al revocar la sesión.');
    }
  };

  const fetchTenants = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/superadmin/tenants', {
        headers: {
          'x-superadmin-token': token
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTenants(data.tenants || []);
      } else {
        setError(data.error || 'Error al cargar las promociones del sistema.');
      }
    } catch (err) {
      setError('Fallo de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formId.trim() || !formName.trim() || !formPassword.trim()) {
      alert('Por favor completa todos los campos.');
      return;
    }

    if (!/^[a-z0-9-]+$/.test(formId.trim().toLowerCase())) {
      alert('El ID de promoción sólo puede contener letras minúsculas, números y guiones.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/superadmin/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-superadmin-token': token
        },
        body: JSON.stringify({
          tenantId: formId.trim().toLowerCase(),
          name: formName.trim(),
          password: formPassword.trim(),
          licenseKey: formLicenseKey.trim() || 'TRIAL',
          expiresAt: formExpiresAt ? new Date(formExpiresAt).toISOString() : undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsCreateOpen(false);
        resetForm();
        fetchTenants();
      } else {
        alert(data.error || 'Error al crear la promoción.');
      }
    } catch (err) {
      alert('Error de red al crear la promoción.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    if (!formName.trim() || !formPassword.trim()) {
      alert('El nombre y la contraseña son requeridos.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/superadmin/tenants/${selectedTenant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-superadmin-token': token
        },
        body: JSON.stringify({
          name: formName.trim(),
          password: formPassword.trim(),
          licenseKey: formLicenseKey.trim(),
          expiresAt: new Date(formExpiresAt).toISOString()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsEditOpen(false);
        setSelectedTenant(null);
        resetForm();
        fetchTenants();
      } else {
        alert(data.error || 'Error al actualizar la promoción.');
      }
    } catch (err) {
      alert('Error de red al actualizar la promoción.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    if (deleteConfirmText.trim().toUpperCase() !== 'ELIMINAR') {
      alert('Por favor escribe ELIMINAR para confirmar la operación.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/superadmin/tenants/${selectedTenant.id}`, {
        method: 'DELETE',
        headers: {
          'x-superadmin-token': token
        }
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsDeleteOpen(false);
        setSelectedTenant(null);
        setDeleteConfirmText('');
        fetchTenants();
      } else {
        alert(data.error || 'Error al eliminar la promoción.');
      }
    } catch (err) {
      alert('Error de red al eliminar la promoción.');
    } finally {
      setActionLoading(false);
    }
  };

  const resetForm = () => {
    setFormId('');
    setFormName('');
    setFormPassword('');
    setFormLicenseKey('TRIAL');
    // Set default expires to +30 days
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 14);
    setFormExpiresAt(nextMonth.toISOString().slice(0, 10));
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const openEditModal = (tenant: SuperTenant) => {
    setSelectedTenant(tenant);
    setFormId(tenant.id);
    setFormName(tenant.name);
    setFormPassword(tenant.passwordHash);
    setFormLicenseKey(tenant.licenseKey);
    setFormExpiresAt(new Date(tenant.expiresAt).toISOString().slice(0, 10));
    setIsEditOpen(true);
  };

  const openDeleteModal = (tenant: SuperTenant) => {
    setSelectedTenant(tenant);
    setDeleteConfirmText('');
    setIsDeleteOpen(true);
  };

  const setExpiryPreset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setFormExpiresAt(d.toISOString().slice(0, 10));
  };

  // Filtered tenants list
  const filteredTenants = tenants.filter(t => 
    t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats calculations
  const totalPromos = tenants.length;
  const activePromos = tenants.filter(t => new Date(t.expiresAt).getTime() > Date.now()).length;
  const expiredPromos = totalPromos - activePromos;
  const totalMembers = tenants.reduce((acc, t) => acc + (t.membersCount || 0), 0);
  const totalPayments = tenants.reduce((acc, t) => acc + (t.paymentsCount || 0), 0);

  return (
    <div id="super-admin-root" className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Super Admin Top Header */}
      <header className="bg-indigo-900 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-3">
            <div className="bg-white/10 p-2 rounded-lg">
              <Shield className="w-6 h-6 text-indigo-200" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">Consola de Administración General</h1>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-xs bg-indigo-800 text-indigo-100 font-bold px-2.5 py-1 rounded-full flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Modo Administrador</span>
            </span>
            <button 
              onClick={onLogout}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-800 hover:bg-indigo-700 rounded-lg text-sm font-bold transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Panel</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Statistics Blocks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Promociones Totales</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{totalPromos}</h3>
              <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                <span className="font-semibold text-emerald-600">{activePromos} Activas</span>
                <span>•</span>
                <span className="font-semibold text-rose-600">{expiredPromos} Vencidas</span>
              </div>
            </div>
            <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600">
              <Building2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total de Integrantes</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{totalMembers}</h3>
              <p className="text-[11px] text-slate-500 mt-1">Registrados globalmente</p>
            </div>
            <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transacciones Totales</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{totalPayments}</h3>
              <p className="text-[11px] text-slate-500 mt-1">Pagos reportados e ingresados</p>
            </div>
            <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Base de Datos</p>
              <h3 className="text-base font-black text-slate-800 mt-2">Firestore Activo</h3>
              <p className="text-[11px] text-emerald-600 font-bold flex items-center space-x-1 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                <span>Persistencia durable activada</span>
              </p>
            </div>
            <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600">
              <Layers className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm overflow-x-auto w-full gap-1">
          <button
            onClick={() => setCurrentSubTab('tenants')}
            className={`flex-1 min-w-[120px] py-2 px-4 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              currentSubTab === 'tenants'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Promociones ({tenants.length})
          </button>

          <button
            onClick={() => {
              setCurrentSubTab('sessions');
              fetchSessions();
            }}
            className={`flex-1 min-w-[140px] py-2 px-4 rounded-lg text-xs font-bold transition-all flex justify-center items-center space-x-1.5 whitespace-nowrap cursor-pointer ${
              currentSubTab === 'sessions'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>Sesiones Activas</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
              currentSubTab === 'sessions' ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {sessions.length}
            </span>
          </button>

          <button
            onClick={() => setCurrentSubTab('config')}
            className={`flex-1 min-w-[170px] py-2 px-4 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              currentSubTab === 'config'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Configuración y Respaldos
          </button>

          <button
            onClick={() => setCurrentSubTab('licenses')}
            className={`flex-1 min-w-[150px] py-2 px-4 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              currentSubTab === 'licenses'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Sistema de Licencias
          </button>
        </div>

        {currentSubTab === 'tenants' && (
          /* Workspace List Controls */
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-800">Promociones y Espacios de Trabajo</h2>
                <p className="text-xs text-slate-500 mt-0.5">Administra claves, vencimientos, licencias y visualiza estadísticas de uso.</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative rounded-lg shadow-sm w-full sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar por ID o Nombre..."
                    className="block w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 text-slate-900"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button
                  onClick={openCreateModal}
                  className="w-full sm:w-auto flex justify-center items-center space-x-1.5 py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Registrar Promo</span>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-sm font-semibold text-slate-500">Cargando promociones...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-rose-600 space-y-2">
                <AlertTriangle className="w-8 h-8 mx-auto" />
                <p className="font-bold">{error}</p>
                <button 
                  onClick={fetchTenants}
                  className="mt-2 text-xs font-bold text-indigo-600 hover:underline"
                >
                  Intentar de nuevo
                </button>
              </div>
            ) : filteredTenants.length === 0 ? (
              <div className="text-center py-16 text-slate-400 space-y-2">
                <Building2 className="w-12 h-12 mx-auto text-slate-300" />
                <p className="font-bold">No se encontraron promociones</p>
                <p className="text-xs">Usa el botón para registrar la primera promoción del sistema.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-100">
                      <th className="py-3 px-6">ID y Nombre de Promo</th>
                      <th className="py-3 px-6">Creado / Estado</th>
                      <th className="py-3 px-6">Licencia / Expira</th>
                      <th className="py-3 px-6 text-center">Clave de Acceso</th>
                      <th className="py-3 px-6 text-center">Registros</th>
                      <th className="py-3 px-6 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-800">
                    {filteredTenants.map((t) => {
                      const expires = new Date(t.expiresAt);
                      const isExpired = expires.getTime() < Date.now();
                      const created = t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A';

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-4 px-6">
                            <div className="font-black text-slate-900">{t.name}</div>
                            <div className="text-xs text-indigo-600 font-bold font-mono">/{t.id}</div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="text-xs text-slate-500 font-semibold">{created}</div>
                            <div className="mt-1">
                              {isExpired ? (
                                <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200 font-black px-2 py-0.5 rounded-full">
                                  Expirada
                                </span>
                              ) : (
                                <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-black px-2 py-0.5 rounded-full">
                                  Activa
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-semibold text-xs text-slate-600">Clave: {t.licenseKey}</div>
                            <div className="text-xs text-slate-500 mt-1 font-semibold flex items-center space-x-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{expires.toLocaleDateString()}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center font-mono text-xs font-bold text-slate-600">
                            <span className="bg-slate-100 px-2 py-1 rounded select-all border border-slate-200">
                              {t.passwordHash}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <div className="inline-grid grid-cols-2 gap-x-2 text-xs text-slate-500 font-semibold">
                              <span className="text-right">Integrantes:</span>
                              <span className="text-left font-black text-indigo-600">{t.membersCount}</span>
                              <span className="text-right">Pagos:</span>
                              <span className="text-left font-black text-emerald-600">{t.paymentsCount}</span>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => onLoginAsTenant(t.id, t.name, t.passwordHash)}
                                title="Acceder como Administrador de esta Promo"
                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center space-x-1 text-xs font-bold"
                              >
                                <LogIn className="w-4 h-4" />
                                <span>Entrar</span>
                              </button>
                              <button
                                onClick={() => openEditModal(t)}
                                title="Editar Configuración / Licencia"
                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  alert(`Generando copia de seguridad manual para ${t.name}...`);
                                  window.location.href = `/api/superadmin/tenants/${t.id}/backup?token=${token}`;
                                }}
                                title="Descargar Copia de Seguridad"
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openDeleteModal(t)}
                                title="Eliminar permanentemente"
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {currentSubTab === 'sessions' && (
          /* Active Sessions List Controls */
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-800">Gestión de Sesiones en Tiempo Real</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visualiza los usuarios y promociones que están logeados actualmente en el sistema. Puedes revocar su sesión de forma remota.
                </p>
              </div>
              <button
                onClick={fetchSessions}
                disabled={sessionsLoading}
                className="flex items-center space-x-1.5 py-2 px-4 border border-slate-200 rounded-lg shadow-sm text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${sessionsLoading ? 'animate-spin' : ''}`} />
                <span>Actualizar</span>
              </button>
            </div>

            {sessionsLoading ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-sm font-semibold text-slate-500">Cargando sesiones activas...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-16 text-slate-400 space-y-2">
                <Users className="w-12 h-12 mx-auto text-slate-300" />
                <p className="font-bold">No hay sesiones activas en este momento</p>
                <p className="text-xs">Los usuarios que cierren su navegador o cierren sesión se removerán de aquí.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b border-slate-100">
                      <th className="py-3 px-6">Promoción (Inquilino)</th>
                      <th className="py-3 px-6">Dirección IP</th>
                      <th className="py-3 px-6">Dispositivo / Agente de Usuario</th>
                      <th className="py-3 px-6">Hora de Inicio</th>
                      <th className="py-3 px-6">Última Actividad</th>
                      <th className="py-3 px-6 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-800">
                    {sessions.map((s) => {
                      const loggedInDate = new Date(s.loggedInAt).toLocaleString();
                      const lastActiveDate = new Date(s.lastActiveAt).toLocaleString();
                      return (
                        <tr key={s.sessionId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-4 px-6">
                            <div className="font-black text-slate-900">{s.tenantName}</div>
                            <div className="text-xs text-indigo-600 font-bold font-mono">/{s.tenantId}</div>
                          </td>
                          <td className="py-4 px-6 font-mono text-xs font-semibold text-slate-600">
                            {s.ip}
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-500 max-w-xs truncate" title={s.userAgent}>
                            {s.userAgent}
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-600 font-semibold">
                            {loggedInDate}
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-600 font-semibold">
                            {lastActiveDate}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => handleRevokeSession(s.sessionId)}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors flex items-center space-x-1 ml-auto"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Cerrar Sesión</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* CONFIG & BACKUPS TAB */}
        {currentSubTab === 'config' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-8">
            {/* SuperAdmin Password Change */}
            <div>
              <h2 className="text-base font-black text-slate-800 mb-1 flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-600" />
                Seguridad y Clave Master
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Cambia el código de acceso maestro del panel SuperAdmin.
              </p>

              {passUpdateMsg && (
                <div className={`p-3 rounded-lg text-xs font-bold mb-3 ${passUpdateMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                  {passUpdateMsg.text}
                </div>
              )}

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newAdminPassword.trim()) return;
                  try {
                    const res = await fetch('/api/superadmin/change-password', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'x-superadmin-token': token
                      },
                      body: JSON.stringify({ newPassword: newAdminPassword.trim() })
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                      setPassUpdateMsg({ type: 'success', text: 'Contraseña actualizada exitosamente.' });
                      setNewAdminPassword('');
                    } else {
                      setPassUpdateMsg({ type: 'error', text: data.error || 'Error al actualizar contraseña.' });
                    }
                  } catch (err: any) {
                    setPassUpdateMsg({ type: 'error', text: err.message });
                  }
                }}
                className="max-w-md space-y-3"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nueva Contraseña de Administrador Master</label>
                  <input
                    type="password"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    placeholder="Mínimo 4 caracteres..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newAdminPassword.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer disabled:opacity-50"
                >
                  Actualizar Contraseña Master
                </button>
              </form>
            </div>

            {/* Automated Backups Configuration */}
            <div className="border-t border-slate-100 pt-6">
              <h2 className="text-base font-black text-slate-800 mb-1 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-indigo-600" />
                Configuración de Respaldos Automáticos
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Personaliza la frecuencia y destinos (Google Drive / Firestore) para copias de seguridad automáticas de cada promoción.
              </p>

              {backupMsg && (
                <div className={`p-3 rounded-lg text-xs font-bold mb-3 ${backupMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                  {backupMsg.text}
                </div>
              )}

              <div className="space-y-4 max-w-2xl bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Respaldos Automáticos Globales</span>
                    <span className="text-[10px] text-slate-500">Activa o desactiva la ejecución periódica del sistema de respaldo</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={backupConfig.autoBackupEnabled}
                    onChange={(e) => setBackupConfig(prev => ({ ...prev, autoBackupEnabled: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Frecuencia por Defecto</label>
                    <select
                      value={backupConfig.frequency}
                      onChange={(e) => setBackupConfig(prev => ({ ...prev, frequency: e.target.value }))}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="daily">Diario (Cada 24 horas)</option>
                      <option value="weekly">Semanal (Cada 7 días)</option>
                      <option value="monthly">Mensual (Cada 30 días)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Destinos de Almacenamiento</label>
                    <div className="space-y-1 mt-1 text-xs text-slate-700 font-semibold">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={backupConfig.targets.firestore}
                          onChange={(e) => setBackupConfig(prev => ({ ...prev, targets: { ...prev.targets, firestore: e.target.checked } }))}
                          className="w-3.5 h-3.5 text-indigo-600 rounded"
                        />
                        <span>Nube Firestore</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={backupConfig.targets.googleDrive}
                          onChange={(e) => setBackupConfig(prev => ({ ...prev, targets: { ...prev.targets, googleDrive: e.target.checked } }))}
                          className="w-3.5 h-3.5 text-indigo-600 rounded"
                        />
                        <span>Google Drive</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/superadmin/backup-config', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'x-superadmin-token': token
                          },
                          body: JSON.stringify(backupConfig)
                        });
                        const data = await res.json();
                        if (res.ok && data.success) {
                          setBackupMsg({ type: 'success', text: 'Configuración de respaldos guardada.' });
                        } else {
                          setBackupMsg({ type: 'error', text: 'Error al guardar la configuración.' });
                        }
                      } catch (err: any) {
                        setBackupMsg({ type: 'error', text: err.message });
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer"
                  >
                    Guardar Configuración de Respaldos
                  </button>
                </div>
              </div>
            </div>

            {/* Manual Backup Download per Tenant */}
            <div className="border-t border-slate-100 pt-6">
              <h2 className="text-base font-black text-slate-800 mb-1 flex items-center gap-2">
                <Download className="w-5 h-5 text-indigo-600" />
                Descarga de Respaldos Manuales por Promoción
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Descarga un archivo JSON comprimido con la base de datos completa de cualquier promoción registrada.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {tenants.map(t => (
                  <div key={t.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900 block">{t.name}</span>
                      <span className="text-[10px] text-slate-500">ID: {t.id} ({t.membersCount} integrantes)</span>
                    </div>
                    <a
                      href={`/api/superadmin/tenants/${t.id}/backup?token=${encodeURIComponent(token)}`}
                      download
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1.5 rounded-lg border border-indigo-200 flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Descargar
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* COMMERCIAL LICENSES SYSTEM TAB */}
        {currentSubTab === 'licenses' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
            <div>
              <h2 className="text-base font-black text-slate-800 mb-1 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
                Generador de Licencias Comerciales
              </h2>
              <p className="text-xs text-slate-500">
                Genera claves de licencias activas para comercializar la aplicación a nuevas promociones o clientes.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-lg space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de la Promoción Destino (Opcional):</label>
                <input
                  type="text"
                  value={genPromoName}
                  onChange={(e) => setGenPromoName(e.target.value)}
                  placeholder="Ej. Colegio San Ignacio 2026..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Duración / Validez de la Licencia:</label>
                <select
                  value={genDays}
                  onChange={(e) => setGenDays(parseInt(e.target.value))}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={14}>14 Días (Prueba Gratis Extendida)</option>
                  <option value={180}>180 Días (Medio Año / Semestral)</option>
                  <option value={365}>365 Días (1 Año / Anual Comercial)</option>
                  <option value={730}>730 Días (2 Años)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await fetch('/api/superadmin/generate-license', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'x-superadmin-token': token
                      },
                      body: JSON.stringify({ days: genDays, promoName: genPromoName })
                    });
                    const data = await res.json();
                    if (res.ok && data.success) {
                      setGeneratedLicenses(prev => [data.license, ...prev]);
                    }
                  } catch (err) {
                    console.error('Error generating license:', err);
                  }
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Generar Nueva Clave de Licencia</span>
              </button>
            </div>

            {/* Generated Licenses History */}
            {generatedLicenses.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Licencias Generadas en esta Sesión ({generatedLicenses.length})</h3>
                <div className="space-y-2">
                  {generatedLicenses.map((lic, idx) => (
                    <div key={idx} className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <div className="font-mono font-extrabold text-emerald-900 text-sm tracking-wide flex items-center gap-2">
                          {lic.licenseKey}
                          <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                            {lic.days} días
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Para: {lic.promoName || 'Cualquier promoción'} | Expira: {new Date(lic.expiresAt).toLocaleDateString('es-VE')}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(lic.licenseKey);
                          alert(`Clave copiada al portapapeles: ${lic.licenseKey}`);
                        }}
                        className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold px-3 py-1 rounded-lg cursor-pointer transition-colors"
                      >
                        Copiar Clave
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="bg-indigo-900 text-white p-5 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-indigo-200" />
                <h3 className="font-black text-base">Registrar Nueva Promoción</h3>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-indigo-200 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nombre de la Promoción *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej: Colegio Santiago de León 2026"
                  className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 text-slate-900"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Código de Promo único (ID) *
                </label>
                <p className="text-[10px] text-slate-400 mb-1">
                  Se utilizará para su acceso y base de datos. Solo letras minúsculas, números y guiones.
                </p>
                <input
                  type="text"
                  required
                  placeholder="ej: santiago-2026"
                  className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 text-slate-900 font-mono"
                  value={formId}
                  onChange={(e) => setFormId(e.target.value.toLowerCase())}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Contraseña de la Promo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Elige una clave de acceso"
                  className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 text-slate-900 font-mono"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Licencia
                  </label>
                  <input
                    type="text"
                    placeholder="ej: TRIAL, LIC-1241"
                    className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 text-slate-900"
                    value={formLicenseKey}
                    onChange={(e) => setFormLicenseKey(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Expira El *
                  </label>
                  <input
                    type="date"
                    required
                    className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 text-slate-900"
                    value={formExpiresAt}
                    onChange={(e) => setFormExpiresAt(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExpiryPreset(14)}
                  className="bg-slate-100 hover:bg-slate-200 text-[10px] font-bold py-1 px-2 rounded text-slate-600"
                >
                  +14 Días
                </button>
                <button
                  type="button"
                  onClick={() => setExpiryPreset(90)}
                  className="bg-slate-100 hover:bg-slate-200 text-[10px] font-bold py-1 px-2 rounded text-slate-600"
                >
                  +90 Días
                </button>
                <button
                  type="button"
                  onClick={() => setExpiryPreset(365)}
                  className="bg-slate-100 hover:bg-slate-200 text-[10px] font-bold py-1 px-2 rounded text-slate-600"
                >
                  +1 Año (Licencia)
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center space-x-1.5"
                >
                  {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Guardar Promo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && selectedTenant && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="bg-indigo-900 text-white p-5 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-indigo-200" />
                <h3 className="font-black text-base">Editar Promoción: /{selectedTenant.id}</h3>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="text-indigo-200 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nombre de la Promoción *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej: Colegio Santiago de León 2026"
                  className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 text-slate-900"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Contraseña de la Promo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Clave de acceso"
                  className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 text-slate-900 font-mono"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Licencia
                  </label>
                  <input
                    type="text"
                    placeholder="ej: TRIAL, LIC-1241"
                    className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 text-slate-900"
                    value={formLicenseKey}
                    onChange={(e) => setFormLicenseKey(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Expira El *
                  </label>
                  <input
                    type="date"
                    required
                    className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 text-slate-900"
                    value={formExpiresAt}
                    onChange={(e) => setFormExpiresAt(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExpiryPreset(14)}
                  className="bg-slate-100 hover:bg-slate-200 text-[10px] font-bold py-1 px-2 rounded text-slate-600"
                >
                  +14 Días
                </button>
                <button
                  type="button"
                  onClick={() => setExpiryPreset(90)}
                  className="bg-slate-100 hover:bg-slate-200 text-[10px] font-bold py-1 px-2 rounded text-slate-600"
                >
                  +90 Días
                </button>
                <button
                  type="button"
                  onClick={() => setExpiryPreset(365)}
                  className="bg-slate-100 hover:bg-slate-200 text-[10px] font-bold py-1 px-2 rounded text-slate-600"
                >
                  +1 Año
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center space-x-1.5"
                >
                  {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteOpen && selectedTenant && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="bg-rose-900 text-white p-5 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-rose-200" />
                <h3 className="font-black text-base">¡Alerta de Operación Destructiva!</h3>
              </div>
              <button onClick={() => setIsDeleteOpen(false)} className="text-rose-200 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleDelete} className="p-6 space-y-4">
              <div className="bg-rose-50 text-rose-900 border border-rose-200 p-4 rounded-xl text-xs space-y-2">
                <p className="font-bold">Estás a punto de eliminar la promoción: <span className="font-black">"{selectedTenant.name}"</span> (/{selectedTenant.id})</p>
                <p>Esto borrará de forma <strong>permanente e irreversible</strong>:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Su registro de acceso del sistema.</li>
                  <li>Toda la base de datos de integrantes registrados.</li>
                  <li>Todo el registro histórico de pagos y abonos.</li>
                  <li>Toda su configuración de SMTP y robots de Telegram.</li>
                </ul>
                <p className="font-bold text-rose-700">Esta acción no se puede deshacer.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Para confirmar, escribe <strong>ELIMINAR</strong> abajo:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Escribe ELIMINAR"
                  className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-rose-500 focus:border-rose-500 bg-slate-50 text-slate-900 font-bold font-mono text-center uppercase"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsDeleteOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || deleteConfirmText.trim().toUpperCase() !== 'ELIMINAR'}
                  className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Eliminar permanentemente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
