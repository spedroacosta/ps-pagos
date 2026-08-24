import React, { useState, useEffect } from 'react';
import { Key, BarChart3, Building2, UserCheck, AlertCircle, RefreshCw, Sparkles, CheckCircle, Laptop, ShieldCheck } from 'lucide-react';

interface WorkspaceAuthGateProps {
  onAuthSuccess: (tenantId: string, tenantName: string, token: string) => void;
  prefilledTenantId?: string;
  isConsolaOnly?: boolean;
}

export const WorkspaceAuthGate: React.FC<WorkspaceAuthGateProps> = ({
  onAuthSuccess,
  prefilledTenantId,
  isConsolaOnly = false
}) => {
  const [superAdminPass, setSuperAdminPass] = useState('');
  
  // Login fields
  const [loginId, setLoginId] = useState(prefilledTenantId || '');
  const [loginPassword, setLoginPassword] = useState('');

  // Sync prefilled ID
  useEffect(() => {
    if (prefilledTenantId) {
      setLoginId(prefilledTenantId);
    }
  }, [prefilledTenantId]);
  
  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !loginPassword.trim()) {
      setError('Por favor completa todos los campos.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/tenant/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: loginId.trim().toLowerCase(),
          password: loginPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Save tenant details
        sessionStorage.setItem('tenantId', data.tenant.id);
        sessionStorage.setItem('tenantAuth', loginPassword);
        sessionStorage.setItem('tenantName', data.tenant.name);
        sessionStorage.setItem('is_fresh_login', 'true');
        if (data.sessionId) {
          sessionStorage.setItem('sessionId', data.sessionId);
        }
        
        onAuthSuccess(data.tenant.id, data.tenant.name, loginPassword);
      } else {
        setError(data.error || 'Usuario o contraseña incorrectos.');
      }
    } catch (err) {
      setError('Error al conectar con el servidor. Por favor intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuperAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!superAdminPass.trim()) {
      setError('Por favor completa el código de acceso.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/superadmin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: superAdminPass }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem('tenantId', 'superadmin');
        sessionStorage.setItem('tenantName', 'Administrador General');
        sessionStorage.setItem('superAdminToken', data.token);
        sessionStorage.setItem('is_fresh_login', 'true');
        onAuthSuccess('superadmin', 'Administrador General', data.token);
      } else {
        setError(data.error || 'Código de acceso de Administrador General incorrecto.');
      }
    } catch (err) {
      setError('Error al conectar con el servidor. Por favor intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isConsolaOnly) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center items-center space-x-3 mb-3">
            <div className="bg-[#162e58] p-3 rounded-2xl shadow-xl text-white border border-indigo-400/30">
              <ShieldCheck className="w-8 h-8 text-indigo-200" />
            </div>
          </div>
          <h1 className="text-center text-2xl font-black text-white tracking-tight font-serif">
            Consola de Administración
          </h1>
          <p className="mt-1 text-center text-xs uppercase tracking-widest font-extrabold text-indigo-300">
            Acceso Exclusivo de Gestión General
          </p>
        </div>

        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-slate-800/90 py-8 px-6 shadow-2xl rounded-2xl border border-slate-700/80 sm:px-10">
            {error && (
              <div className="mb-4 bg-red-950/80 border border-red-800 rounded-xl p-3 flex items-start space-x-2 text-red-200 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSuperAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Clave de Acceso Principal
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Key className="h-4 w-4 text-indigo-400" />
                  </div>
                  <input
                    type="password"
                    required
                    placeholder="Escribe la clave de Super Admin"
                    className="block w-full pl-10 pr-3 py-2.5 text-sm border border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-900 text-white placeholder-slate-500 font-medium"
                    value={superAdminPass}
                    onChange={(e) => setSuperAdminPass(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-indigo-500/40 rounded-xl shadow-lg text-sm font-bold text-white bg-[#162e58] hover:bg-indigo-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  'Ingresar a la Consola'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center space-x-3">
          <div className="bg-[#162e58] p-3 rounded-2xl shadow-xl text-white border border-[#162e58]">
            <BarChart3 className="w-8 h-8 text-indigo-200" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-serif leading-none">
              Control de Pagos Y Auditoría
            </h1>
            <p className="text-[10px] uppercase tracking-widest font-extrabold text-[#162e58] mt-1">
              Sistema de Gestión Financiera
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200/80 sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start space-x-2 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start space-x-2 text-emerald-800 text-xs">
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Usuario
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserCheck className="h-4 w-4 text-[#162e58]" />
                </div>
                <input
                  type="text"
                  required
                  disabled={!!prefilledTenantId}
                  placeholder="Ingresa tu usuario"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#162e58] focus:border-[#162e58] bg-slate-50 text-slate-900 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed font-semibold"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Contraseña
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Key className="h-4 w-4 text-[#162e58]" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#162e58] focus:border-[#162e58] bg-slate-50 text-slate-900"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-extrabold text-white bg-[#162e58] hover:bg-[#112445] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#162e58] transition-all cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                'Ingresar al Sistema'
              )}
            </button>
          </form>

          <div className="mt-8 border-t border-slate-100 pt-4 text-center">
            <div className="flex justify-center items-center space-x-1.5 text-slate-400 text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-[#162e58]" />
              <span>Acceso seguro y protegido para la gestión financiera.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
