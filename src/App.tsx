import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { ResumenSolvencia } from './components/ResumenSolvencia';
import { BuscadorIntegrante } from './components/BuscadorIntegrante';
import { EntradasLedger } from './components/EntradasLedger';
import { RegistroPagos } from './components/RegistroPagos';
import { Configuracion } from './components/Configuracion';
import { EgresosModule } from './components/EgresosModule';
import { PaymentModal } from './components/PaymentModal';
import { InvoiceModal } from './components/InvoiceModal';
import { WorkspaceAuthGate } from './components/WorkspaceAuthGate';
import { SuperAdminPanel } from './components/SuperAdminPanel';
import { PublicQueryPortal } from './components/PublicQueryPortal';
import { getTenantHeaders, clearTenantCredentials } from './utils/api';

import { Member, MonthConfig, SpecialQuota, PaymentEntry, DollarPurchase, MemberSolvencySummary, LateFeeConfig, ExpenseEntry, ExpenseConfig } from './types';
import {
  INITIAL_MEMBERS,
  INITIAL_MONTHS,
  INITIAL_SPECIAL_QUOTAS,
  INITIAL_PAYMENTS,
  INITIAL_DOLLAR_PURCHASES,
} from './data/initialData';
import { calculateMemberSolvency, getCaracasDateString } from './utils/calculations';

// ---------------------------------------------------------
// ROUTER ENTRY POINT
// ---------------------------------------------------------
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* General home route: handles login or redirects to the active session dashboard */}
        <Route path="/" element={<HomeRoute />} />

        {/* Dedicated SuperAdmin Consola Route */}
        <Route path="/consola" element={<ConsolaRoute />} />
        <Route path="/consola/*" element={<ConsolaRoute />} />

        {/* Public Member Query Route: Look up balance securely by Cédula */}
        <Route path="/consulta" element={<PublicQueryRoute />} />
        <Route path="/:urlTenantId/consulta" element={<PublicQueryRoute />} />
        <Route path="/:urlTenantId/consulta/*" element={<PublicQueryRoute />} />

        {/* Private Admin Dashboard Routes */}
        <Route path="/:urlTenantId/resumen" element={<TenantDashboardRoute initialTab="solvencia" />} />
        <Route path="/:urlTenantId/integrantes" element={<TenantDashboardRoute initialTab="buscador" />} />
        <Route path="/:urlTenantId/ledger" element={<TenantDashboardRoute initialTab="movimientos" />} />
        <Route path="/:urlTenantId/registro" element={<TenantDashboardRoute initialTab="registro_pagos" />} />
        <Route path="/:urlTenantId/whatsapp" element={<TenantDashboardRoute initialTab="registro_pagos" />} />
        <Route path="/:urlTenantId/dolares" element={<TenantDashboardRoute initialTab="registro_pagos" />} />
        <Route path="/:urlTenantId/configuracion" element={<TenantDashboardRoute initialTab="config" />} />

        {/* Fallback route for promotions */}
        <Route path="/:urlTenantId/*" element={<TenantDashboardRoute initialTab="solvencia" />} />
      </Routes>
    </BrowserRouter>
  );
}

// ---------------------------------------------------------
// ROOT ROUTE (/)
// Handles client login or redirects authenticated users
// ---------------------------------------------------------
function HomeRoute() {
  const navigate = useNavigate();
  const [tenantId, setTenantId] = useState<string | null>(sessionStorage.getItem('tenantId'));

  useEffect(() => {
    if (tenantId) {
      if (tenantId === 'superadmin') {
        navigate('/consola');
      } else {
        navigate(`/${tenantId}/resumen`);
      }
    }
  }, [tenantId, navigate]);

  return (
    <WorkspaceAuthGate
      onAuthSuccess={(id, name) => {
        sessionStorage.setItem('tenantId', id);
        sessionStorage.setItem('tenantName', name);
        setTenantId(id);
        if (id === 'superadmin') {
          navigate('/consola');
        } else {
          navigate(`/${id}/resumen`);
        }
      }}
    />
  );
}

// ---------------------------------------------------------
// DEDICATED CONSOLA ROUTE (/consola)
// SuperAdmin Panel & Login
// ---------------------------------------------------------
function ConsolaRoute() {
  const navigate = useNavigate();
  const [tenantId, setTenantId] = useState<string | null>(sessionStorage.getItem('tenantId'));

  const handleLogout = () => {
    clearTenantCredentials();
    sessionStorage.removeItem('tenantLogoUrl');
    sessionStorage.removeItem('superAdminToken');
    setTenantId(null);
    navigate('/');
  };

  if (tenantId === 'superadmin') {
    const superAdminToken = sessionStorage.getItem('superAdminToken') || '';
    return (
      <SuperAdminPanel
        token={superAdminToken}
        onLogout={handleLogout}
        onLoginAsTenant={(id, name, passwordHash) => {
          sessionStorage.setItem('tenantId', id);
          sessionStorage.setItem('tenantName', name);
          sessionStorage.setItem('tenantAuth', passwordHash);
          setTenantId(id);
          navigate(`/${id}/resumen`);
        }}
      />
    );
  }

  return (
    <WorkspaceAuthGate
      isConsolaOnly={true}
      onAuthSuccess={(id, name) => {
        sessionStorage.setItem('tenantId', id);
        sessionStorage.setItem('tenantName', name);
        setTenantId(id);
      }}
    />
  );
}

// ---------------------------------------------------------
// PUBLIC LOOKUP ROUTE (/:tenantId/consulta)
// ---------------------------------------------------------
function PublicQueryRoute() {
  const { urlTenantId } = useParams<{ urlTenantId: string }>();
  const navigate = useNavigate();

  const effectiveTenantId = urlTenantId || sessionStorage.getItem('tenantId') || 'original';

  return (
    <PublicQueryPortal
      tenantId={effectiveTenantId}
      onGoBackToGate={() => navigate('/')}
    />
  );
}

// ---------------------------------------------------------
// PRIVATE TENANT ROUTE GATEWAY
// ---------------------------------------------------------
function TenantDashboardRoute({ initialTab }: { initialTab: string }) {
  const { urlTenantId } = useParams<{ urlTenantId: string }>();
  const navigate = useNavigate();

  const authenticatedTenantId = sessionStorage.getItem('tenantId');
  const isAuthorized = authenticatedTenantId === urlTenantId || authenticatedTenantId === 'superadmin';

  if (!isAuthorized) {
    // Show WorkspaceAuthGate prefilled and locked for this tenant
    return (
      <WorkspaceAuthGate
        prefilledTenantId={urlTenantId}
        onAuthSuccess={(id, name) => {
          if (id === 'superadmin') {
            window.location.reload();
          } else {
            navigate(`/${id}/resumen`);
          }
        }}
      />
    );
  }

  return (
    <AdminDashboardContainer
      tenantId={urlTenantId!}
      initialTab={initialTab}
    />
  );
}

// ---------------------------------------------------------
// ADMIN DASHBOARD CONTAINER (Mains state & components)
// ---------------------------------------------------------
interface AdminDashboardContainerProps {
  tenantId: string;
  initialTab: string;
}

function AdminDashboardContainer({ tenantId, initialTab }: AdminDashboardContainerProps) {
  const navigate = useNavigate();
  const [tenantName, setTenantName] = useState<string | null>(sessionStorage.getItem('tenantName'));
  const [tenantLogoUrl, setTenantLogoUrl] = useState<string | null>(sessionStorage.getItem('tenantLogoUrl'));
  const [tenantLogoCircularUrl, setTenantLogoCircularUrl] = useState<string | null>(sessionStorage.getItem('tenantLogoCircularUrl'));

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [bcvRate, setBcvRate] = useState<number>(41.85);
  const [isRefreshingBcv, setIsRefreshingBcv] = useState<boolean>(false);

  const hasLocalBackup = typeof window !== 'undefined' && !!localStorage.getItem('promo_members');
  const restoreLocalBackup = () => {
    if (window.confirm("¿Seguro que deseas restaurar los datos guardados en la memoria caché de este navegador? Esto sobrescribirá lo que esté en el servidor.")) {
      try {
        const mems = JSON.parse(localStorage.getItem('promo_members') || '[]');
        if (mems.length > 0) {
          setMembers(mems);
          const mnths = JSON.parse(localStorage.getItem('promo_months') || '[]');
          if (mnths.length > 0) setMonths(mnths);
          const py = JSON.parse(localStorage.getItem('promo_payments') || '[]');
          if (py.length > 0) setPayments(py);
          const qts = JSON.parse(localStorage.getItem('promo_quotas') || '[]');
          if (qts.length > 0) setQuotas(qts);
          alert("¡Datos locales restaurados! El sistema los está sincronizando con la nube ahora mismo.");
        } else {
          alert("No se encontraron datos de integrantes en el caché.");
        }
      } catch(e) {
        alert("Error al restaurar: " + e);
      }
    }
  };


  const [members, setMembers] = useState<Member[]>([]);  const [months, setMonths] = useState<MonthConfig[]>(INITIAL_MONTHS);  const [quotas, setQuotas] = useState<SpecialQuota[]>([]);  const [payments, setPayments] = useState<PaymentEntry[]>([]);  const [dollarPurchases, setDollarPurchases] = useState<DollarPurchase[]>([]);  const [lateFeeConfig, setLateFeeConfig] = useState<LateFeeConfig | null>(null);  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);  const [expenseCategories, setExpenseCategories] = useState<string[]>(['Logística', 'Eventos', 'Administrativo', 'Protocolo', 'Imprevistos']);  const [expenseConfig, setExpenseConfig] = useState<ExpenseConfig>({ enabled: false });

  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Sync activeTab with routing if initialTab changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleLogout = () => {
    // Call server logout to invalidate session
    fetch('/api/tenant/logout', { method: 'POST', headers: getTenantHeaders() }).catch(() => {});
    clearTenantCredentials();
    sessionStorage.removeItem('tenantLogoUrl');
    sessionStorage.removeItem('tenantLogoCircularUrl');
    sessionStorage.removeItem('superAdminToken');
    try {
      localStorage.removeItem('promo_members');
      localStorage.removeItem('promo_months');
      localStorage.removeItem('promo_quotas');
      localStorage.removeItem('promo_payments');
      localStorage.removeItem('promo_dollar_purchases');
      localStorage.removeItem('promo_late_fee_config');
    } catch {}
    navigate('/');
    window.location.reload();
  };

  // Automatically fetch profile details (name & logo)
  useEffect(() => {
    if (!tenantId || tenantId === 'superadmin') return;
    async function loadProfile() {
      try {
        const res = await fetch('/api/tenant/profile', {
          headers: getTenantHeaders()
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setTenantName(json.name);
            sessionStorage.setItem('tenantName', json.name);
            if (json.logoUrl) {
              setTenantLogoUrl(json.logoUrl);
              sessionStorage.setItem('tenantLogoUrl', json.logoUrl);
            } else {
              setTenantLogoUrl(null);
              sessionStorage.removeItem('tenantLogoUrl');
            }
            if (json.logoCircularUrl) {
              setTenantLogoCircularUrl(json.logoCircularUrl);
              sessionStorage.setItem('tenantLogoCircularUrl', json.logoCircularUrl);
            } else {
              setTenantLogoCircularUrl(null);
              sessionStorage.removeItem('tenantLogoCircularUrl');
            }
          }
        }
      } catch (e) {
        console.log('Error loading tenant profile:', e);
      }
    }
    loadProfile();
  }, [tenantId]);

  // Fetch full data from backend database on startup
  useEffect(() => {
    if (!tenantId || tenantId === 'superadmin') return;
    async function loadServerData() {
      try {
        const res = await fetch('/api/data', {
          headers: getTenantHeaders()
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const mems = Array.isArray(json.data.members) ? json.data.members : [];
            setMembers(mems);
            

            if (Array.isArray(json.data.months) && json.data.months.length > 0) {
              setMonths(json.data.months);
              
            }

            const qts = Array.isArray(json.data.quotas) ? json.data.quotas : [];
            setQuotas(qts);
            

            const pays = Array.isArray(json.data.payments) ? json.data.payments : [];
            setPayments(pays);
            

            const dps = Array.isArray(json.data.dollarPurchases) ? json.data.dollarPurchases : [];
            setDollarPurchases(dps);
            

            const exps = Array.isArray(json.data.expenses) ? json.data.expenses : [];
            
            // Check for Auto Backup
            const autoBackupEnabled = localStorage.getItem('autoBackupDrive') === 'true';
            const todayStr = new Date().toISOString().split('T')[0];
            const lastBackupStr = localStorage.getItem('lastAutoBackupDate');
            const driveToken = localStorage.getItem('driveToken');
            
            if (autoBackupEnabled && driveToken && lastBackupStr !== todayStr) {
               console.log("Triggering auto backup to Google Drive...");
               fetch('/api/backup/drive', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${driveToken}`,
                    ...getTenantHeaders()
                  },
                  body: JSON.stringify({ 
                    fileName: `control_pagos_respaldo_${todayStr}.json`, 
                    fileContent: JSON.stringify({
                      members: mems,
                      months: Array.isArray(json.data.months) && json.data.months.length > 0 ? json.data.months : [],
                      quotas: qts,
                      payments: pays,
                      dollarPurchases: dps,
                      expenses: exps,
                      exportedAt: new Date().toISOString(),
                      version: '2.0'
                    }, null, 2) 
                  })
               }).then(r => r.json()).then(res => {
                  if (res.success || res.id) {
                     console.log("Auto backup successful.");
                     localStorage.setItem('lastAutoBackupDate', todayStr);
                  }
               }).catch(e => console.error("Auto backup failed:", e));
            }
            setExpenses(exps);
            

            const cats = Array.isArray(json.data.expenseCategories) && json.data.expenseCategories.length > 0
              ? json.data.expenseCategories
              : ['Logística', 'Eventos', 'Administrativo', 'Protocolo', 'Imprevistos'];
            setExpenseCategories(cats);
            

            const cfg = json.data.expenseConfig && typeof json.data.expenseConfig === 'object'
              ? json.data.expenseConfig
              : { enabled: false };
            setExpenseConfig(cfg);
            
          }
        }

        try {
          const lfRes = await fetch('/api/late-fee-config', { headers: getTenantHeaders() });
          if (lfRes.ok) {
            const lfJson = await lfRes.json();
            if (lfJson.success && lfJson.config) {
              setLateFeeConfig(lfJson.config);            
            }
          }
        } catch (lfErr) {
          console.log('Error loading late fee config:', lfErr);
        }
        
        setIsInitialized(true);
      } catch (e) {
        console.error("Error crítico al cargar datos:", e);
        alert("Error de red. Por favor, recarga la página.");
      }
    }
    loadServerData();
  }, [tenantId]);

  // Save changes and sync back to database immediately
  const syncToServer = async (payload: any) => {
    if (!tenantId || tenantId === 'superadmin') return;
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getTenantHeaders()
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.log('Error syncing to server:', e);
    }
  };

  useEffect(() => {
    if (!isInitialized) return;
    
    // Save to localStorage immediately on any state change for local resilience
    
    
    
    
    
    
    
    
    
    syncToServer({ members, months, quotas, payments, dollarPurchases, expenses, expenseCategories, expenseConfig });
  }, [members, months, quotas, payments, dollarPurchases, expenses, expenseCategories, expenseConfig, isInitialized]);

  // Expense Handlers
  const handleAddExpense = (expenseData: Omit<ExpenseEntry, 'id'>) => {
    const newEntry: ExpenseEntry = {
      ...expenseData,
      id: `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setExpenses((prev) => [newEntry, ...prev]);
  };

  const handleEditExpense = (id: string, updatedData: Omit<ExpenseEntry, 'id'>) => {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...updatedData } : e)));
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const handleAddExpenseCategory = (catName: string) => {
    if (!catName || expenseCategories.includes(catName)) return;
    setExpenseCategories((prev) => [...prev, catName]);
  };

  const handleDeleteExpenseCategory = (catName: string) => {
    setExpenseCategories((prev) => prev.filter((c) => c !== catName));
  };

  const handleUpdateExpenseConfig = (config: ExpenseConfig) => {
    setExpenseConfig(config);
    
  };

  // Fetch BCV Currency Rates
  const fetchBcvRate = async (force = false) => {
    setIsRefreshingBcv(true);
    try {
      const res = await fetch(`/api/bcv${force ? '?force=true' : ''}`);
      const data = await res.json();
      if (data && data.rate && !isNaN(data.rate)) {
        setBcvRate(data.rate);
      }
    } catch (e) {
      console.log("Error fetching BCV rate", e);
    } finally {


      setIsRefreshingBcv(false);
    }
  };

  useEffect(() => {
    fetchBcvRate(true);
    const interval = setInterval(() => fetchBcvRate(true), 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Modals state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentEntry | null>(null);
  const [paymentModalParams, setPaymentModalParams] = useState<{
    memberId?: string;
    targetType?: 'month' | 'quota';
    targetId?: string;
  }>({});

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedInvoiceSummary, setSelectedInvoiceSummary] = useState<MemberSolvencySummary | null>(null);
  const [selectedMemberForSearch, setSelectedMemberForSearch] = useState<string>('');

  // Aggregated totals
  const totalCollectedUSD = useMemo(() => {
    return payments
      .filter((p) => !(p.id.startsWith('init-p-') || p.reference === 'INICIAL' || (p.notes && p.notes.toLowerCase().includes('masiva'))))
      .reduce((sum, p) => sum + p.amountUSD, 0);
  }, [payments]);

  const totalCollectedVES = useMemo(() => {
    return payments
      .filter((p) => p.currency === 'VES' && !(p.id.startsWith('init-p-') || p.reference === 'INICIAL' || (p.notes && p.notes.toLowerCase().includes('masiva'))))
      .reduce((sum, p) => sum + p.amountOriginal, 0);
  }, [payments]);

  const totalDollarPurchasesUSD = useMemo(() => {
    return dollarPurchases.reduce((sum, p) => sum + p.usdAmount, 0);
  }, [dollarPurchases]);

  const totalDollarPurchasesVES = useMemo(() => {
    return dollarPurchases.reduce((sum, p) => sum + p.bsAmount, 0);
  }, [dollarPurchases]);

  // Action handers
  const handleOpenPaymentModalForMember = (
    memberId?: string,
    targetType?: 'month' | 'quota',
    targetId?: string
  ) => {
    setPaymentModalParams({ memberId, targetType, targetId });
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = (paymentData: Omit<PaymentEntry, 'id' | 'dateEntered'>) => {
    const newPayment: PaymentEntry = {
      ...paymentData,
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      dateEntered: getCaracasDateString(),
    };
    setPayments((prev) => [newPayment, ...prev]);
  };

  const handleBatchAddPayments = (newPayments: Omit<PaymentEntry, 'id' | 'dateEntered'>[]) => {
    const formatted: PaymentEntry[] = newPayments.map((p, idx) => ({
      ...p,
      id: `pay-${Date.now()}-${idx}`,
      dateEntered: getCaracasDateString(),
    }));
    setPayments((prev) => [...formatted, ...prev]);
  };

  const handleDeletePayment = (paymentId: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== paymentId));
  };

  const handleEditPayment = (payment: PaymentEntry) => {
    setEditingPayment(payment);
    setIsPaymentModalOpen(true);
  };

  const handleUpdatePayment = (id: string, updatedData: Omit<PaymentEntry, 'id' | 'dateEntered'>) => {
    setPayments((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              ...updatedData,
            }
          : p
      )
    );
    setEditingPayment(null);
  };

  const handleOpenInvoiceModal = (summary: MemberSolvencySummary) => {
    setSelectedInvoiceSummary(summary);
    setIsInvoiceModalOpen(true);
  };

  const handleSelectMemberForSearch = (memberId: string) => {
    setSelectedMemberForSearch(memberId);
    handleTabClick('buscador');
  };

  const handleUpdateMonthFee = (monthId: string, feeUSD_direct: number, feeUSD_bcv: number) => {
    setMonths((prev) =>
      prev.map((m) =>
        m.id === monthId
          ? { ...m, feeUSD: feeUSD_direct, feeUSD_direct, feeUSD_bcv }
          : m
      )
    );
  };

  const handleAddQuota = (quotaData: Omit<SpecialQuota, 'id'>) => {
    const newQuota: SpecialQuota = {
      ...quotaData,
      id: `sq-${Date.now()}`,
    };
    setQuotas((prev) => [...prev, newQuota]);
  };

  const handleDeleteQuota = (quotaId: string) => {
    setQuotas((prev) => prev.filter((q) => q.id !== quotaId));
  };

  const handleAddMember = (memberData: Omit<Member, 'id'>) => {
    const newMember: Member = {
      ...memberData,
      id: `mem-${Date.now()}`,
    };
    setMembers((prev) => [...prev, newMember]);
  };

  const handleUpdateMember = (updatedMember: Member) => {
    setMembers((prev) => prev.map((m) => (m.id === updatedMember.id ? updatedMember : m)));
  };

  const handleDeleteMember = (memberId: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  const handleAddDollarPurchase = (purchaseData: Omit<DollarPurchase, 'id'>) => {
    const newPurchase: DollarPurchase = {
      ...purchaseData,
      id: `dp-${Date.now()}`,
    };
    setDollarPurchases((prev) => [newPurchase, ...prev]);
  };

  const handleDeleteDollarPurchase = (id: string) => {
    setDollarPurchases((prev) => prev.filter((p) => p.id !== id));
  };

  const handleRestoreFullDatabase = async (backupData: {
    members: Member[];
    months: MonthConfig[];
    quotas: SpecialQuota[];
    payments: PaymentEntry[];
    dollarPurchases: DollarPurchase[];
  }) => {
    setMembers(backupData.members || []);
    setMonths(backupData.months || []);
    setQuotas(backupData.quotas || []);
    setPayments(backupData.payments || []);
    setDollarPurchases(backupData.dollarPurchases || []);

    
    
    
    
    

    try {
      const res = await fetch('/api/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getTenantHeaders()
        },
        body: JSON.stringify(backupData),
      });
      if (!res.ok) {
        throw new Error('Fallo al restaurar en el servidor');
      }
      return true;
    } catch (e) {
      console.error('Error restoring full database on server:', e);
      throw e;
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleManualSave = async () => {
    setIsSaving(true);
    try {
      
      
      
      
      
      await syncToServer({ members, months, quotas, payments, dollarPurchases });
    } catch (e) {
      console.log("Error in manual save:", e);
    } finally {


      setTimeout(() => setIsSaving(false), 500);
    }
  };

  // Synchronize URL with Tab changes for clean Sitemap URLs
  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'solvencia') navigate(`/${tenantId}/resumen`);
    else if (tab === 'buscador') navigate(`/${tenantId}/integrantes`);
    else if (tab === 'movimientos') navigate(`/${tenantId}/ledger`);
    else if (tab === 'registro_pagos') navigate(`/${tenantId}/registro`);
    else if (tab === 'config') navigate(`/${tenantId}/configuracion`);
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700/80 rounded-2xl p-8 shadow-2xl flex flex-col items-center space-y-4 max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin flex items-center justify-center"></div>
          <div>
            <h3 className="text-white font-extrabold text-base font-serif">Cargando Promoción...</h3>
            <p className="text-slate-400 text-xs mt-1">Conectando con la base de datos del servidor y sincronizando registros de integrantes y movimientos.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      
      {hasLocalBackup && members.length === 0 && isInitialized && (
        <div className="bg-amber-100 border-b border-amber-200 px-4 py-3 text-amber-900 flex flex-col sm:flex-row items-center justify-between z-50 relative">
          <div className="flex items-center space-x-2 text-sm">
            <span className="font-bold">⚠️ Se han encontrado datos de una sesión anterior en este navegador.</span>
            <span>Si perdiste información recientemente, puedes recuperarla ahora.</span>
          </div>
          <button onClick={restoreLocalBackup} className="mt-2 sm:mt-0 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm">
            Recuperar Datos del Navegador
          </button>
        </div>
      )}

      {/* Header & Nav */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabClick}
        bcvRate={bcvRate}
        setBcvRate={setBcvRate}
        onRefreshBcv={() => fetchBcvRate(true)}
        isRefreshingBcv={isRefreshingBcv}
        totalCollectedUSD={totalCollectedUSD}
        totalCollectedVES={totalCollectedVES}
        totalDollarPurchasesUSD={totalDollarPurchasesUSD}
        onOpenPaymentModal={() => handleOpenPaymentModalForMember()}
        onManualSave={handleManualSave}
        isSaving={isSaving}
        tenantName={tenantName}
        tenantLogoUrl={tenantLogoUrl}
        tenantLogoCircularUrl={tenantLogoCircularUrl}
        onLogout={handleLogout}
        expenseConfig={expenseConfig}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={activeTab === 'solvencia' ? '' : 'hidden'}>
          <ResumenSolvencia
            members={members}
            months={months}
            quotas={quotas}
            payments={payments}
            onOpenPaymentModalForMember={handleOpenPaymentModalForMember}
            onOpenInvoiceModal={handleOpenInvoiceModal}
            onSelectMemberForSearch={handleSelectMemberForSearch}
            lateFeeConfig={lateFeeConfig}
            expenses={expenses}
            expenseConfig={expenseConfig}
            totalCollectedUSD={totalCollectedUSD}
            totalCollectedVES={totalCollectedVES}
            totalDollarPurchasesUSD={totalDollarPurchasesUSD}
            totalDollarPurchasesVES={totalDollarPurchasesVES}
          />
        </div>

        <div className={activeTab === 'buscador' ? '' : 'hidden'}>
          <BuscadorIntegrante
            members={members}
            months={months}
            quotas={quotas}
            payments={payments}
            selectedMemberId={selectedMemberForSearch}
            onOpenPaymentModalForMember={handleOpenPaymentModalForMember}
            onOpenInvoiceModal={handleOpenInvoiceModal}
            lateFeeConfig={lateFeeConfig}
            onUpdateMember={handleUpdateMember}
            tenantId={tenantId}
            bcvRate={bcvRate}
          />
        </div>

        <div className={activeTab === 'movimientos' ? '' : 'hidden'}>
          <EntradasLedger
            payments={payments}
            months={months}
            quotas={quotas}
            onDeletePayment={handleDeletePayment}
            onEditPayment={handleEditPayment}
            dollarPurchases={dollarPurchases}
            onDeleteDollarPurchase={handleDeleteDollarPurchase}
            expenses={expenses}
            expenseCategories={expenseCategories}
            expenseConfig={expenseConfig}
            onAddExpense={handleAddExpense}
            onEditExpense={handleEditExpense}
            onDeleteExpense={handleDeleteExpense}
            onAddExpenseCategory={handleAddExpenseCategory}
            onDeleteExpenseCategory={handleDeleteExpenseCategory}
            onUpdateExpenseConfig={handleUpdateExpenseConfig}
            bcvRate={bcvRate}
          />
        </div>

        <div className={activeTab === 'registro_pagos' ? '' : 'hidden'}>
          <RegistroPagos
            members={members}
            months={months}
            quotas={quotas}
            payments={payments}
            dollarPurchases={dollarPurchases}
            currentBcvRate={bcvRate}
            onBatchAddPayments={handleBatchAddPayments}
            onAddDollarPurchase={handleAddDollarPurchase}
          />
        </div>

        <div className={activeTab === 'config' ? '' : 'hidden'}>
          <Configuracion
            months={months}
            onUpdateMonthFee={handleUpdateMonthFee}
            quotas={quotas}
            onAddQuota={handleAddQuota}
            onDeleteQuota={handleDeleteQuota}
            members={members}
            onAddMember={handleAddMember}
            onUpdateMember={handleUpdateMember}
            onDeleteMember={handleDeleteMember}
            payments={payments}
            dollarPurchases={dollarPurchases}
            onRestoreFullDatabase={handleRestoreFullDatabase}
            tenantId={tenantId || ''}
            tenantName={tenantName || ''}
            setTenantName={setTenantName}
            tenantLogoUrl={tenantLogoUrl}
            setTenantLogoUrl={setTenantLogoUrl}
            tenantLogoCircularUrl={tenantLogoCircularUrl}
            setTenantLogoCircularUrl={setTenantLogoCircularUrl}
            lateFeeConfig={lateFeeConfig}
            onUpdateLateFeeConfig={(config) => setLateFeeConfig(config)}
            bcvRate={bcvRate}
            expenseConfig={expenseConfig}
            onUpdateExpenseConfig={handleUpdateExpenseConfig}
            expenseCategories={expenseCategories}
            onAddExpenseCategory={handleAddExpenseCategory}
            onDeleteExpenseCategory={handleDeleteExpenseCategory}
          />
        </div>
      </main>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setEditingPayment(null);
        }}
        members={members}
        months={months}
        quotas={quotas}
        payments={payments}
        currentBcvRate={bcvRate}
        onSavePayment={handleSavePayment}
        onSaveBatchPayments={handleBatchAddPayments}
        editingPayment={editingPayment}
        onUpdatePayment={handleUpdatePayment}
        initialMemberId={paymentModalParams.memberId}
        initialTargetType={paymentModalParams.targetType}
        initialTargetId={paymentModalParams.targetId}
      />

      {/* Invoice Modal */}
      {selectedInvoiceSummary && (
        <InvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          member={selectedInvoiceSummary.member}
          solvencySummary={selectedInvoiceSummary}
          months={months}
          quotas={quotas}
          payments={payments}
        />
      )}
    </div>
  );
}
