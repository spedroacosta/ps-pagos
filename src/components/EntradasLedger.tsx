import React, { useState, useMemo, useEffect } from 'react';
import { CustomDateRangePicker } from './CustomDateRangePicker';
import {
  Receipt,
  Search,
  Filter,
  Trash2,
  Edit2,
  Calendar,
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  PieChart as PieIcon,
  BarChart3,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Wallet,
  Coins,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { PaymentEntry, MonthConfig, SpecialQuota, DollarPurchase, ExpenseEntry, ExpenseConfig } from '../types';
import { formatUSD, formatVES, getMethodLabel } from '../utils/calculations';
import { EgresosModule } from './EgresosModule';

interface EntradasLedgerProps {
  payments: PaymentEntry[];
  months: MonthConfig[];
  quotas: SpecialQuota[];
  onDeletePayment: (paymentId: string) => void;
  onEditPayment?: (payment: PaymentEntry) => void;
  dollarPurchases?: DollarPurchase[];
  onDeleteDollarPurchase?: (id: string) => void;
  // Expense Props
  expenses?: ExpenseEntry[];
  expenseCategories?: string[];
  expenseConfig?: ExpenseConfig;
  onAddExpense?: (expense: Omit<ExpenseEntry, 'id'>) => void;
  onEditExpense?: (id: string, expense: Omit<ExpenseEntry, 'id'>) => void;
  onDeleteExpense?: (id: string) => void;
  onAddExpenseCategory?: (categoryName: string) => void;
  onDeleteExpenseCategory?: (categoryName: string) => void;
  onUpdateExpenseConfig?: (config: ExpenseConfig) => void;
  bcvRate?: number;
}

export const EntradasLedger: React.FC<EntradasLedgerProps> = ({
  payments,
  months,
  quotas,
  onDeletePayment,
  onEditPayment,
  dollarPurchases = [],
  onDeleteDollarPurchase,
  expenses = [],
  expenseCategories = ['Logística', 'Eventos', 'Administrativo', 'Protocolo', 'Imprevistos'],
  expenseConfig = { enabled: false },
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  onAddExpenseCategory,
  onDeleteExpenseCategory,
  onUpdateExpenseConfig,
  bcvRate = 61.5,
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'VES' | 'USD'>('all');
  const [showBulkImport, setShowBulkImport] = useState<boolean>(false);
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc');
  const [activeSubTab, setActiveSubTab] = useState<'mensualidades' | 'compra_dolares' | 'egresos'>('mensualidades');

  useEffect(() => {
    if (!expenseConfig?.enabled && activeSubTab === 'egresos') {
      setActiveSubTab('mensualidades');
    }
  }, [expenseConfig?.enabled, activeSubTab]);

  // Expenses totals
  const totalExpensesVES = useMemo(() => {
    return (expenses || []).filter((e) => e.currency === 'VES').reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const totalExpensesUSD = useMemo(() => {
    return (expenses || []).filter((e) => e.currency === 'USD').reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  // Filtered and sorted dollar purchases list
  const monthlyDollarPurchases = useMemo(() => {
    const list = dollarPurchases || [];
    const filtered = list.filter((p) => {
      if (startDate && p.date < startDate) return false;
      if (endDate && p.date > endDate) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return p.notes.toLowerCase().includes(q) || p.date.includes(q);
      }
      return true;
    });

    return filtered.sort((a, b) => {
      return sortDirection === 'asc'
        ? a.date.localeCompare(b.date)
        : b.date.localeCompare(a.date);
    });
  }, [dollarPurchases, startDate, endDate, searchQuery, sortDirection]);

  const totalDollarPurchasesUSD = useMemo(() => {
    return monthlyDollarPurchases.reduce((sum, p) => sum + p.usdAmount, 0);
  }, [monthlyDollarPurchases]);

  const totalDollarPurchasesVES = useMemo(() => {
    return monthlyDollarPurchases.reduce((sum, p) => sum + p.bsAmount, 0);
  }, [monthlyDollarPurchases]);

  // Helper to identify movement payments (with toggle to exclude initial bulk import seed data if desired)
  const movementPayments = useMemo(() => {
    return payments.filter((p) => {
      const isBulk =
        p.id.startsWith('init-p-') ||
        p.reference === 'INICIAL' ||
        (p.reference && p.reference.toLowerCase().includes('masiva')) ||
        (p.notes && p.notes.toLowerCase().includes('masiva'));
      if (isBulk && !showBulkImport) {
        return false;
      }
      return true;
    });
  }, [payments, showBulkImport]);

  // Filtered and sorted payments list
  const filteredPayments = useMemo(() => {
    const list = movementPayments.filter((p) => {
      // Date range filter
      if (startDate && p.paymentDate && p.paymentDate < startDate) return false;
      if (endDate && p.paymentDate && p.paymentDate > endDate) return false;

      // Currency filter
      if (currencyFilter !== 'all' && p.currency !== currencyFilter) {
        return false;
      }

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchName = p.memberName.toLowerCase().includes(query);
        const matchRef = p.reference.toLowerCase().includes(query);
        const matchNotes = p.notes.toLowerCase().includes(query);
        const matchLabel = p.targetLabel.toLowerCase().includes(query);
        return matchName || matchRef || matchNotes || matchLabel;
      }

      return true;
    });

    // Sort by paymentDate
    return list.sort((a, b) => {
      const dateA = a.paymentDate || '';
      const dateB = b.paymentDate || '';
      if (dateA !== dateB) {
        return sortDirection === 'asc'
          ? dateA.localeCompare(dateB)
          : dateB.localeCompare(dateA);
      }
      // If same date, fallback to stable sort by id (or dateEntered) descending
      const idA = a.id || '';
      const idB = b.id || '';
      return idB.localeCompare(idA);
    });
  }, [movementPayments, startDate, endDate, currencyFilter, searchQuery, sortDirection]);

  // Aggregate stats for the selected month (ignoring search and currency filters)
  const totals = useMemo(() => {
    let totalVES = 0;
    let convertedVesUSD = 0;
    let regularUSD = 0;
    let grandTotalUSD = 0;

    movementPayments.forEach((p) => {
      // Apply ONLY date range filter
      if (startDate && p.paymentDate && p.paymentDate < startDate) return;
      if (endDate && p.paymentDate && p.paymentDate > endDate) return;

      grandTotalUSD += p.amountUSD;
      if (p.currency === 'VES') {
        totalVES += p.amountOriginal;
        convertedVesUSD += p.amountUSD;
      } else {
        regularUSD += p.amountOriginal;
      }
    });

    return {
      totalVES,
      convertedVesUSD,
      regularUSD,
      grandTotalUSD,
    };
  }, [movementPayments, startDate, endDate]);

  // Prepare Chart data by movement month
  const chartData = useMemo(() => {
    return months.map((m) => {
      const monthPayments = movementPayments.filter((p) => p.paymentDate && p.paymentDate.startsWith(m.id));
      let vesUSD = 0;
      let cashUSD = 0;

      monthPayments.forEach((p) => {
        if (p.currency === 'VES') {
          vesUSD += p.amountUSD;
        } else {
          cashUSD += p.amountUSD;
        }
      });

      return {
        name: m.name,
        'Bolívares (a Tasa BCV)': Math.round(vesUSD * 100) / 100,
        'Dólares Regulares': Math.round(cashUSD * 100) / 100,
        Total: Math.round((vesUSD + cashUSD) * 100) / 100,
      };
    });
  }, [months, movementPayments]);

  // Net balances
  const netVESInVault = totals.totalVES - totalDollarPurchasesVES - totalExpensesVES;
  const netUSDInVault = totals.regularUSD + totalDollarPurchasesUSD - totalExpensesUSD;

  return (
    <div className="space-y-5">
      {/* Resumen Consolidado Total de Ingresos y Egresos en la Pestaña Movimientos (Solo si el módulo de egresos está activo) */}
      {expenseConfig?.enabled && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 tracking-wide">
                  Resumen Consolidado de Flujo de Caja (Entradas & Salidas)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Balance integrado de cobros, compras de divisas y egresos ejecutados
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg">
                Tasa BCV: {bcvRate.toFixed(2)} Bs/$
              </span>
            </div>
          </div>

          {/* Financial Flow Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bolívares Column */}
            <div className="bg-amber-50/40 border border-amber-200/80 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                <span className="font-extrabold text-xs text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-600" />
                  <span>Movimientos en Bolívares (VES)</span>
                </span>
                <span className={`text-[11px] font-black font-mono px-2 py-0.5 rounded-md ${netVESInVault >= 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}`}>
                  {formatVES(netVESInVault)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="bg-white p-2 rounded-lg border border-amber-100/80 shadow-2xs">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Ingresos (1)</span>
                  <span className="font-black text-emerald-700 font-mono block mt-0.5">{formatVES(totals.totalVES)}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-amber-100/80 shadow-2xs">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Comp. USD (2)</span>
                  <span className="font-black text-amber-700 font-mono block mt-0.5">-{formatVES(totalDollarPurchasesVES)}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-amber-100/80 shadow-2xs">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Gastos (3)</span>
                  <span className="font-black text-rose-700 font-mono block mt-0.5">-{formatVES(totalExpensesVES)}</span>
                </div>
              </div>
              <div className="text-[10px] text-slate-500 flex justify-between items-center pt-0.5">
                <span>Saldo Neto Bs en Caja:</span>
                <span className="font-mono text-slate-600 font-bold">(1) Ingresos - (2) Compra USD - (3) Gastos</span>
              </div>
            </div>

            {/* Dólares Column */}
            <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                <span className="font-extrabold text-xs text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Movimientos en Dólares (USD)</span>
                </span>
                <span className={`text-[11px] font-black font-mono px-2 py-0.5 rounded-md ${netUSDInVault >= 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'}`}>
                  {formatUSD(netUSDInVault)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="bg-white p-2 rounded-lg border border-emerald-100/80 shadow-2xs">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Ing. USD (1)</span>
                  <span className="font-black text-emerald-700 font-mono block mt-0.5">{formatUSD(totals.regularUSD)}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-emerald-100/80 shadow-2xs">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase block">USD Comprados (2)</span>
                  <span className="font-black text-emerald-600 font-mono block mt-0.5">+{formatUSD(totalDollarPurchasesUSD)}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-emerald-100/80 shadow-2xs">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Gastos USD (3)</span>
                  <span className="font-black text-rose-700 font-mono block mt-0.5">-{formatUSD(totalExpensesUSD)}</span>
                </div>
              </div>
              <div className="text-[10px] text-slate-500 flex justify-between items-center pt-0.5">
                <span>Saldo Neto USD Disponible:</span>
                <span className="font-mono text-slate-600 font-bold">(1) Ing. Directos + (2) Comprados - (3) Gastos</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab Navigation */}
      <div className="flex border-b border-slate-200 bg-slate-50 p-1 rounded-xl shadow-2xs gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('mensualidades')}
          className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer min-w-max ${
            activeSubTab === 'mensualidades'
              ? 'bg-[#162e58] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-4 h-4 text-indigo-300" />
          <span>Ingresos de Mensualidades ({filteredPayments.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('compra_dolares')}
          className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer min-w-max ${
            activeSubTab === 'compra_dolares'
              ? 'bg-emerald-700 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <ArrowUpDown className="w-4 h-4 text-emerald-300" />
          <span>Cambio de Divisas / Compra USD ({monthlyDollarPurchases.length})</span>
        </button>

        {expenseConfig?.enabled && (
          <button
            onClick={() => setActiveSubTab('egresos')}
            className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer min-w-max ${
              activeSubTab === 'egresos'
                ? 'bg-rose-700 text-white shadow-sm'
                : 'text-rose-900 bg-rose-50/80 hover:bg-rose-100'
            }`}
          >
            <TrendingDown className="w-4 h-4 text-rose-500" />
            <span>Egresos / Gastos ({expenses.length})</span>
          </button>
        )}
      </div>

      {/* SUBTAB CONTENT 3: EGRESOS Y GASTOS */}
      {activeSubTab === 'egresos' && expenseConfig?.enabled ? (
        <EgresosModule
          expenses={expenses}
          expenseCategories={expenseCategories}
          expenseConfig={expenseConfig}
          onAddExpense={onAddExpense || (() => {})}
          onEditExpense={onEditExpense || (() => {})}
          onDeleteExpense={onDeleteExpense || (() => {})}
          onAddCategory={onAddExpenseCategory || (() => {})}
          onDeleteCategory={onDeleteExpenseCategory || (() => {})}
          onUpdateConfig={onUpdateExpenseConfig || (() => {})}
          bcvRate={bcvRate}
        />
      ) : (
        <>
          {/* Filters and Month Selector */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-col lg:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full lg:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por integrante, referencia o nota..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center space-x-2 w-full lg:w-auto">
          <CustomDateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
          />
        </div>

        {/* Cargas Masivas Toggle */}
        <div className="flex items-center space-x-2 bg-slate-50 px-2.5 py-1.5 border border-slate-200 rounded-lg w-full lg:w-auto">
          <input
            type="checkbox"
            id="showBulkImport"
            checked={showBulkImport}
            onChange={(e) => setShowBulkImport(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
          />
          <label htmlFor="showBulkImport" className="text-xs text-slate-600 font-bold cursor-pointer select-none">
            Ver Cargas Masivas
          </label>
        </div>

        {/* Currency Filter */}
        <div className="flex items-center space-x-1 bg-slate-50 p-1 border border-slate-200 rounded-lg w-full lg:w-auto justify-center lg:justify-start">
          <button
            onClick={() => setCurrencyFilter('all')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
              currencyFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setCurrencyFilter('VES')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
              currencyFilter === 'VES'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bolívares (VES)
          </button>
          <button
            onClick={() => setCurrencyFilter('USD')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
              currencyFilter === 'USD'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dólares (USD)
          </button>
        </div>
      </div>

      {/* Financial Summary Cards for the Selected Month / Filter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs text-slate-900">
          <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
            Total Bolívares Recogidos del Mes
          </span>
          <span className="text-xl font-bold text-indigo-600 mt-0.5 block">
            {formatVES(totals.totalVES)}
          </span>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Total bolívares ingresados en el período
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs text-slate-900">
          <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
            Total en Dólares de esos Bolívares (Tasa BCV)
          </span>
          <span className="text-xl font-bold text-slate-900 mt-0.5 block">
            {formatUSD(totals.convertedVesUSD)}
          </span>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Conversión a la tasa oficial del BCV
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs text-slate-900">
          <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
            Total Dólares Directos
          </span>
          <span className="text-xl font-bold text-emerald-700 mt-0.5 block">
            {formatUSD(totals.regularUSD)}
          </span>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Ingresos directos en efectivo $ y otros medios digitales (Binance)
          </p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/30 border border-emerald-200 rounded-xl p-3.5 shadow-sm text-slate-900">
          <span className="text-[10px] font-bold text-emerald-800 block uppercase tracking-wider">
            Total Fondos en Dólares ($)
          </span>
          <span className="text-xl font-bold text-emerald-900 mt-0.5 block">
            {formatUSD(totals.regularUSD + totalDollarPurchasesUSD)}
          </span>
          <p className="text-[10px] text-slate-600 mt-0.5 font-medium">
            {formatUSD(totals.regularUSD)} Directos + {formatUSD(totalDollarPurchasesUSD)} Comprados
          </p>
        </div>
      </div>

      {activeSubTab === 'mensualidades' ? (
        <>
          {/* Visual Bar Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-slate-900">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600" />
                  Recaudación Mensual: Bolívares (Tasa BCV) vs. Dólares Directos
                </h3>
                <p className="text-[11px] text-slate-500">Comparativa de ingresos por moneda y mes</p>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `$${val}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', fontSize: '12px' }}
                    itemStyle={{ color: '#0f172a' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="Bolívares (a Tasa BCV)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Dólares Regulares" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payments Ledger Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm text-slate-900">
            <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                Historial de Movimientos e Ingresos ({filteredPayments.length})
              </h3>
              <span className="text-[10px] text-slate-500 font-semibold">
                Ordenado por Fecha: {sortDirection === 'desc' ? 'Recientes primero ⬇️' : 'Antiguos primero ⬆️'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th
                      className="px-3 py-2.5 cursor-pointer hover:bg-slate-100 select-none transition-colors duration-150"
                      onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                      title="Ordenar por fecha"
                    >
                      <div className="flex items-center space-x-1">
                        <span>Fecha</span>
                        {sortDirection === 'asc' ? (
                          <ArrowUp className="w-3 h-3 text-indigo-600" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-indigo-600" />
                        )}
                      </div>
                    </th>
                    <th className="px-3.5 py-2.5">Integrante</th>
                    <th className="px-3 py-2.5">Método</th>
                    <th className="px-3 py-2.5 text-right">Monto Original</th>
                    <th className="px-3 py-2.5 text-right">Tasa BCV</th>
                    <th className="px-3 py-2.5 text-right font-bold text-emerald-700">Equiv. $ USD</th>
                    <th className="px-3 py-2.5">Referencia</th>
                    <th className="px-3.5 py-2.5">Concepto / Mes</th>
                    <th className="px-3 py-2.5 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-900">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-8 text-center text-slate-400">
                        No se encontraron movimientos registrados con el filtro aplicado.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 py-2 text-slate-500 font-mono text-[11px]">{p.paymentDate}</td>
                        <td className="px-3.5 py-2 font-bold text-slate-900">{p.memberName}</td>
                        <td className="px-3 py-2">
                          <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-medium">
                            {getMethodLabel(p.method)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                          {p.currency === 'VES' ? formatVES(p.amountOriginal) : formatUSD(p.amountOriginal)}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-500 font-mono text-[11px]">
                          {p.currency === 'VES' ? `${p.bcvRate} Bs/$` : '-'}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-700">
                          {formatUSD(p.amountUSD)}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-600 text-[11px]">
                          {p.reference || 'S/R'}
                        </td>
                        <td className="px-3.5 py-2 text-slate-700 font-medium">
                          {p.breakdown && p.breakdown.length > 1 ? (
                            <span
                              className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-[10px] mr-1.5 font-bold inline-block"
                              title={p.breakdown.map((b) => `${b.targetLabel} (${formatUSD(b.amountUSD)} USD)`).join('\n')}
                            >
                              Multi-concepto ({p.breakdown.length}): {p.breakdown.map((b) => b.targetLabel).join(', ')}
                            </span>
                          ) : (
                            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.2 rounded text-[10px] mr-1.5 font-bold">
                              {p.targetLabel}
                            </span>
                          )}
                          {p.notes}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => {
                                if (onEditPayment) {
                                  onEditPayment(p);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                              title="Editar este pago"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`¿Eliminar el registro de pago de ${p.memberName}?`)) {
                                  onDeletePayment(p.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                              title="Eliminar este pago"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* Dollar Purchases List */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm text-slate-900">
          <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-emerald-600" />
              Historial de Compras de Dólares ({monthlyDollarPurchases.length})
            </h3>
            <span className="text-[10px] text-slate-500 font-bold">
              Total invertido: {formatVES(totalDollarPurchasesVES)} | Adquirido: {formatUSD(totalDollarPurchasesUSD)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5">Fecha de Operación</th>
                  <th className="px-3 py-2.5 text-right">Bolívares Invertidos</th>
                  <th className="px-3 py-2.5 text-right font-bold text-emerald-700">Dólares Comprados ($)</th>
                  <th className="px-3 py-2.5 text-right">Tasa Implícita</th>
                  <th className="px-3.5 py-2.5">Detalles / Notas</th>
                  {onDeleteDollarPurchase && <th className="px-3 py-2.5 text-center">Acción</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-900">
                {monthlyDollarPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      No se encontraron registros de compra de dólares para el período o búsqueda actual.
                    </td>
                  </tr>
                ) : (
                  monthlyDollarPurchases.map((purchase) => (
                    <tr key={purchase.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-2 text-slate-500 font-mono text-[11px]">{purchase.date}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">{formatVES(purchase.bsAmount)}</td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-700 font-mono">{formatUSD(purchase.usdAmount)}</td>
                      <td className="px-3 py-2 text-right text-slate-500 font-mono text-[11px]">
                        {purchase.rate ? `${purchase.rate.toFixed(2)} Bs/$` : `${(purchase.bsAmount / purchase.usdAmount).toFixed(2)} Bs/$`}
                      </td>
                      <td className="px-3.5 py-2 text-slate-700 font-medium">{purchase.notes}</td>
                      {onDeleteDollarPurchase && (
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => {
                              if (confirm('¿Estás seguro de que deseas eliminar este registro de compra de dólares?')) {
                                onDeleteDollarPurchase(purchase.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Eliminar este registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
