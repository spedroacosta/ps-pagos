import React, { useState, useMemo, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Search,
  Filter,
  Download,
  Plus,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Receipt,
  Eye,
  UserPlus,
  ArrowUpDown,
  Sparkles,
  Info,
  Calendar,
  ChevronDown,
  CheckSquare,
  Square,
  TrendingDown,
} from 'lucide-react';
import { Member, MonthConfig, SpecialQuota, PaymentEntry, MemberSolvencySummary, LateFeeConfig, ExpenseEntry, ExpenseConfig } from '../types';
import { calculateMemberSolvency, formatUSD, formatVES } from '../utils/calculations';

interface ResumenSolvenciaProps {
  members: Member[];
  months: MonthConfig[];
  quotas: SpecialQuota[];
  payments: PaymentEntry[];
  onOpenPaymentModalForMember: (memberId: string, targetType?: 'month' | 'quota' | 'late_fee', targetId?: string) => void;
  onOpenInvoiceModal: (summary: MemberSolvencySummary) => void;
  onSelectMemberForSearch: (memberId: string) => void;
  lateFeeConfig?: LateFeeConfig | null;
  expenses?: ExpenseEntry[];
  expenseConfig?: ExpenseConfig;
  totalCollectedUSD?: number;
  totalCollectedVES?: number;
  totalDollarPurchasesUSD?: number;
  totalDollarPurchasesVES?: number;
}

export const ResumenSolvencia: React.FC<ResumenSolvenciaProps> = ({
  members,
  months,
  quotas,
  payments,
  onOpenPaymentModalForMember,
  onOpenInvoiceModal,
  onSelectMemberForSearch,
  lateFeeConfig,
  expenses = [],
  expenseConfig = { enabled: false },
  totalCollectedUSD = 0,
  totalCollectedVES = 0,
  totalDollarPurchasesUSD = 0,
  totalDollarPurchasesVES = 0,
}) => {

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'solvent' | 'debt' | 'partial' | 'fined'>('all');

  // Selected Months state for custom column visibility (defaults dynamically to past & current months)
  const [selectedMonthIds, setSelectedMonthIds] = useState<string[]>(() => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    return months
      .filter((m) => m.year < curYear || (m.year === curYear && m.monthNumber <= curMonth))
      .map((m) => m.id);
  });

  // Selected Special Quotas state for custom column visibility (defaults to all quotas)
  const [selectedQuotaIds, setSelectedQuotaIds] = useState<string[]>(() => quotas.map((q) => q.id));

  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);

  // Keep selectedMonthIds and selectedQuotaIds in sync if months/quotas update
  useEffect(() => {
    if (selectedMonthIds.length === 0 && months.length > 0) {
      const now = new Date();
      const curYear = now.getFullYear();
      const curMonth = now.getMonth() + 1;
      setSelectedMonthIds(
        months
          .filter((m) => m.year < curYear || (m.year === curYear && m.monthNumber <= curMonth))
          .map((m) => m.id)
      );
    }
  }, [months]);

  useEffect(() => {
    // Automatically select newly added quotas if not configured yet
    setSelectedQuotaIds((prev) => {
      const allQuotaIds = quotas.map((q) => q.id);
      if (prev.length === 0 && quotas.length > 0) return allQuotaIds;
      // Keep previous valid ones plus any new ones
      const newIds = allQuotaIds.filter((id) => !prev.includes(id));
      return [...prev.filter((id) => allQuotaIds.includes(id)), ...newIds];
    });
  }, [quotas]);

  const visibleMonths = useMemo(() => {
    return months.filter((m) => selectedMonthIds.includes(m.id));
  }, [months, selectedMonthIds]);

  const visibleQuotas = useMemo(() => {
    return quotas.filter((q) => selectedQuotaIds.includes(q.id));
  }, [quotas, selectedQuotaIds]);

  const toggleMonth = (id: string) => {
    setSelectedMonthIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  const toggleQuota = (id: string) => {
    setSelectedQuotaIds((prev) =>
      prev.includes(id) ? prev.filter((qId) => qId !== id) : [...prev, id]
    );
  };

  const handleSelectAllMonthsAndQuotas = () => {
    setSelectedMonthIds(months.map((m) => m.id));
    setSelectedQuotaIds(quotas.map((q) => q.id));
  };

  const handleSelectPastAndCurrentMonths = () => {
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const pastOrCurrentIds = months
      .filter((m) => m.year < curYear || (m.year === curYear && m.monthNumber <= curMonth))
      .map((m) => m.id);
    setSelectedMonthIds(pastOrCurrentIds);
  };

  // Compute solvency summaries for all members with visible months calculation
  const memberSummaries = useMemo(() => {
    return members.map((member) => calculateMemberSolvency(member, months, quotas, payments, lateFeeConfig || undefined));
  }, [members, months, quotas, payments, lateFeeConfig]);

  // Compute reactive debt & solvency based ONLY on visibleMonths and visibleQuotas
  const memberSummariesWithVisibleDebt = useMemo(() => {
    return memberSummaries.map((s) => {
      const visibleMonthsOwed = visibleMonths.reduce((sum, m) => {
        const st = s.monthsStatus[m.id];
        return sum + (st ? st.owedUSD : 0);
      }, 0);
      const quotasOwed = visibleQuotas.reduce((sum, q) => {
        const st = s.quotasStatus[q.id];
        return sum + (st ? st.owedUSD : 0);
      }, 0);
      const visibleOwedUSD = visibleMonthsOwed + quotasOwed + (s.lateFeesSummary?.owedLateFeesUSD || 0);
      const isVisibleSolvent = visibleOwedUSD <= 0.01;
      return {
        ...s,
        visibleOwedUSD,
        isVisibleSolvent,
      };
    });
  }, [memberSummaries, visibleMonths, visibleQuotas]);

  // Filtered list
  const filteredSummaries = useMemo(() => {
    return memberSummariesWithVisibleDebt.filter((s) => {
      const q = searchQuery.toLowerCase();
      const nameMatch =
        (s.member.lastName || '').toLowerCase().includes(q) ||
        (s.member.firstName || '').toLowerCase().includes(q) ||
        String(s.member.cedula || '').toLowerCase().includes(q) ||
        (s.member.email || '').toLowerCase().includes(q);

      if (!nameMatch) return false;

      if (statusFilter === 'solvent') return s.isVisibleSolvent;
      if (statusFilter === 'debt') return !s.isVisibleSolvent;
      if (statusFilter === 'partial') {
        const hasPartialMonth = visibleMonths.some((m) => s.monthsStatus[m.id]?.status === 'parcial');
        const hasPartialQuota = visibleQuotas.some((q) => s.quotasStatus[q.id]?.status === 'parcial');
        return hasPartialMonth || hasPartialQuota;
      }
      if (statusFilter === 'fined') {
        return (s.lateFeesSummary?.owedLateFeesUSD || 0) > 0.01 || (s.lateFeesSummary?.lateFeesCount || 0) > 0;
      }
      return true;
    });
  }, [memberSummariesWithVisibleDebt, searchQuery, statusFilter, visibleMonths, visibleQuotas]);

  // Overall Statistics calculated strictly from visible months
  const totalMembers = members.length;
  const solventMembers = memberSummariesWithVisibleDebt.filter((s) => s.isVisibleSolvent).length;
  const finedMembersCount = memberSummariesWithVisibleDebt.filter(
    (s) => (s.lateFeesSummary?.owedLateFeesUSD || 0) > 0.01 || (s.lateFeesSummary?.lateFeesCount || 0) > 0
  ).length;
  const percentSolvent = totalMembers > 0 ? Math.round((solventMembers / totalMembers) * 100) : 0;
  const totalCollectiveDebt = memberSummariesWithVisibleDebt.reduce((sum, s) => sum + s.visibleOwedUSD, 0);

  // Expense Calculations
  const totalExpensesVES = useMemo(() => {
    return expenses.filter((e) => e.currency === 'VES').reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const totalExpensesUSD = useMemo(() => {
    return expenses.filter((e) => e.currency === 'USD').reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const netVESInVault = totalCollectedVES - totalDollarPurchasesVES - totalExpensesVES;
  const netUSDInVault = totalCollectedUSD + totalDollarPurchasesUSD - totalExpensesUSD;

  // Export PDF
  const handleExportPDF = () => {
    // Dynamic Columns
    const tableColumn = ["No.", "Cédula", "Apellidos", "Nombres", "Estatus"];
    visibleMonths.forEach((m) => tableColumn.push(`${m.name.slice(0, 3)} ${m.year.toString().slice(-2)}`));
    visibleQuotas.forEach((q) => tableColumn.push(q.title.slice(0, 6)));
    tableColumn.push("Deuda Meses Filtrados");

    // Landscape orientation if many columns
    const doc = new jsPDF({ orientation: tableColumn.length > 7 ? 'landscape' : 'portrait' });
    
    // Title
    doc.setFontSize(14);
    doc.setTextColor(22, 46, 88); // #162e58
    doc.text('Resumen de Solvencia - Promoción', 14, 15);
    
    // Subtitle
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Meses mostrados: ${visibleMonths.map(m => m.name).join(', ')} | Emisión: ${new Date().toLocaleDateString('es-VE')}`, 14, 21);

    // Table Data
    const tableRows = filteredSummaries.map((s, idx) => {
      const row = [
        (idx + 1).toString(),
        s.member.cedula || 'N/A',
        s.member.lastName,
        s.member.firstName,
        s.isVisibleSolvent ? 'SOLVENTE' : 'MOROSO'
      ];
      
      visibleMonths.forEach((m) => {
        const st = s.monthsStatus[m.id];
        if (!st || st.status === 'deuda') {
          row.push('PENDIENTE');
        } else if (st.status === 'parcial') {
          row.push(`PARCIAL (${st.owedUSD.toFixed(0)})`);
        } else {
          row.push('PAGADO');
        }
      });
      
      visibleQuotas.forEach((q) => {
        const st = s.quotasStatus[q.id];
        if (!st || st.status === 'deuda') {
          row.push('PENDIENTE');
        } else if (st.status === 'parcial') {
          row.push(`PARCIAL (${st.owedUSD.toFixed(0)})`);
        } else {
          row.push('PAGADO');
        }
      });

      row.push(`${s.visibleOwedUSD.toFixed(2)}`);
      return row;
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [22, 46, 88], textColor: [255, 255, 255], fontStyle: 'bold' },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 4) {
          if (data.cell.raw === 'SOLVENTE') {
            data.cell.styles.textColor = [5, 150, 105]; // emerald-600
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [220, 38, 38]; // red-600
            data.cell.styles.fontStyle = 'bold';
          }
        }
        if (data.section === 'body' && data.column.index > 4 && data.column.index < tableColumn.length - 1) {
          data.cell.styles.halign = 'center';
          if (typeof data.cell.raw === 'string' && data.cell.raw.startsWith('PAGADO')) {
            data.cell.styles.textColor = [5, 150, 105];
          } else if (typeof data.cell.raw === 'string' && data.cell.raw.startsWith('PARCIAL')) {
            data.cell.styles.textColor = [217, 119, 6];
          } else {
            data.cell.styles.textColor = [220, 38, 38];
          }
        }
        if (data.section === 'body' && data.column.index === tableColumn.length - 1) {
          data.cell.styles.halign = 'right';
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    doc.save(`resumen_solvencia_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Overview Metric Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Solventes
            </span>
            <div className="flex items-baseline space-x-2 mt-0.5">
              <span className="text-xl font-bold text-emerald-700">{solventMembers}</span>
              <span className="text-xs font-bold text-emerald-600">({percentSolvent}%)</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block font-semibold">
              Morosos (Deuda Total)
            </span>
            <span className="text-xl font-bold text-red-600 mt-0.5 block">
              {formatUSD(totalCollectiveDebt)}
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Cuotas Especiales Activas
            </span>
            <span className="text-xl font-bold text-amber-900 mt-0.5 block">{quotas.length}</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Balance de Egresos y Fondo Disponibles (si el módulo está activo) */}
      {expenseConfig?.enabled && (
        <div className="bg-gradient-to-r from-rose-50/90 via-white to-amber-50/70 border border-rose-200/80 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-rose-200/60 pb-2">
            <div className="flex items-center space-x-2 text-rose-950 font-extrabold text-xs">
              <TrendingDown className="w-4 h-4 text-rose-600" />
              <span>Balance Financiero de Egresos & Caja de la Promoción</span>
            </div>
            <span className="text-[10px] font-extrabold text-rose-700 bg-rose-100/90 border border-rose-200 px-2 py-0.5 rounded-md">
              Egresos Habilitados
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white/90 p-2.5 rounded-xl border border-rose-100/90 shadow-2xs">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Total Gastado en Bs</span>
              <span className="text-sm font-black text-rose-700 font-mono block mt-0.5">
                {formatVES(totalExpensesVES)}
              </span>
            </div>

            <div className="bg-white/90 p-2.5 rounded-xl border border-rose-100/90 shadow-2xs">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Total Gastado en USD</span>
              <span className="text-sm font-black text-rose-700 font-mono block mt-0.5">
                {formatUSD(totalExpensesUSD)}
              </span>
            </div>

            <div className="bg-white/90 p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-extrabold uppercase text-slate-500 block">Saldo Neto Bs en Caja</span>
              <span className={`text-sm font-black font-mono block mt-0.5 ${netVESInVault >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatVES(netVESInVault)}
              </span>
              <span className="text-[9px] text-slate-400 font-medium block">Ingresos Bs - Gastos Bs</span>
            </div>

            <div className="bg-white/90 p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-extrabold uppercase text-slate-500 block">Saldo Neto USD Disponible</span>
              <span className={`text-sm font-black font-mono block mt-0.5 ${netUSDInVault >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatUSD(netUSDInVault)}
              </span>
              <span className="text-[9px] text-slate-400 font-medium block">(Ing. USD + Comp. USD) - Gastos</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, cédula o correo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-[#162e58] text-white font-semibold shadow-2xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Todos ({memberSummaries.length})
          </button>
          <button
            onClick={() => setStatusFilter('solvent')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              statusFilter === 'solvent'
                ? 'bg-emerald-600 text-white font-semibold shadow-2xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Solventes ({solventMembers})
          </button>
          <button
            onClick={() => setStatusFilter('partial')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              statusFilter === 'partial'
                ? 'bg-amber-700 text-white font-semibold shadow-2xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Parciales
          </button>
          <button
            onClick={() => setStatusFilter('debt')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              statusFilter === 'debt'
                ? 'bg-red-600 text-white font-semibold shadow-2xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Morosos ({totalMembers - solventMembers})
          </button>
          <button
            onClick={() => setStatusFilter('fined')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              statusFilter === 'fined'
                ? 'bg-fuchsia-700 text-white font-semibold shadow-2xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            Multados ({finedMembersCount})
          </button>
        </div>

        {/* Custom Month & Quota Selector Dropdown & Export */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial">
            <button
              onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
              className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center justify-between space-x-1.5 border border-slate-200 shadow-2xs cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#b53c00]" />
                <span>
                  Mostrar Meses ({visibleMonths.length}/{months.length})
                  {quotas.length > 0 && ` y Cuotas (${visibleQuotas.length}/${quotas.length})`}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>

            {isMonthDropdownOpen && (
              <div className="absolute right-0 mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-lg z-50 p-2.5 text-xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 px-1">
                  <span className="font-bold text-slate-800">Filtrar Columnas Visibles</span>
                  <div className="flex space-x-1">
                    <button
                      onClick={handleSelectAllMonthsAndQuotas}
                      className="text-[10px] text-orange-600 hover:underline font-bold"
                    >
                      Todos
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={handleSelectPastAndCurrentMonths}
                      className="text-[10px] text-blue-600 hover:underline font-bold"
                    >
                      Vigentes
                    </button>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 scrollbar-thin pr-1">
                  {/* Cuotas Ordinarias (Meses) */}
                  <div>
                    <div className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 px-1 mb-1">
                      Meses Ordinarios
                    </div>
                    <div className="space-y-1">
                      {months.map((m) => {
                        const isSelected = selectedMonthIds.includes(m.id);
                        return (
                          <label
                            key={m.id}
                            className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors ${
                              isSelected ? 'bg-orange-50/80 text-amber-950 font-semibold' : 'hover:bg-slate-50 text-slate-600'
                            }`}
                            onClick={() => toggleMonth(m.id)}
                          >
                            <div className="flex items-center space-x-2">
                              {isSelected ? (
                                <CheckSquare className="w-3.5 h-3.5 text-[#b53c00]" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              <span>{m.name}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">${m.feeUSD_direct || m.feeUSD}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cuotas Especiales */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between px-1 mb-1">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-600">
                        Cuotas Especiales
                      </span>
                      {quotas.length > 0 && (
                        <button
                          onClick={() => {
                            if (selectedQuotaIds.length === quotas.length) {
                              setSelectedQuotaIds([]);
                            } else {
                              setSelectedQuotaIds(quotas.map((q) => q.id));
                            }
                          }}
                          className="text-[9px] text-amber-700 hover:underline font-bold"
                        >
                          {selectedQuotaIds.length === quotas.length ? 'Desmarcar' : 'Marcar todas'}
                        </button>
                      )}
                    </div>
                    {quotas.length === 0 ? (
                      <div className="p-1.5 text-[11px] text-slate-400 italic">
                        No hay cuotas especiales registradas.
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {quotas.map((q) => {
                          const isSelected = selectedQuotaIds.includes(q.id);
                          return (
                            <label
                              key={q.id}
                              className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors ${
                                isSelected ? 'bg-amber-100/70 text-amber-950 font-semibold' : 'hover:bg-slate-50 text-slate-600'
                              }`}
                              onClick={() => toggleQuota(q.id)}
                            >
                              <div className="flex items-center space-x-2">
                                {isSelected ? (
                                  <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                                ) : (
                                  <Square className="w-3.5 h-3.5 text-slate-400" />
                                )}
                                <span>{q.title}</span>
                              </div>
                              <span className="text-[10px] text-amber-700 font-mono font-bold">${q.feeUSD}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-1.5 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => setIsMonthDropdownOpen(false)}
                    className="bg-[#162e58] text-white px-2.5 py-1 rounded text-[10px] font-bold hover:bg-[#0f2142]"
                  >
                    Listo
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportPDF}
            className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center justify-center space-x-1.5 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#b53c00]" />
            <span className="hidden sm:inline">Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* Resumen de Solvencia Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="font-bold text-xs text-[#162e58] uppercase tracking-wider">Resumen de Solvencia</h3>
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
              (Haz clic en cualquier celda para abonar pago)
            </span>
          </div>

          <div className="flex items-center space-x-3 text-[10px] font-semibold">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-emerald-800">Solvente</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-amber-800">Parcial</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span className="text-red-800">Pendiente</span>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-[#162e58] text-slate-100 uppercase text-[10px] font-bold tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-3 py-2.5 w-10 text-center text-slate-300">Nº</th>
                <th className="px-3.5 py-2.5 min-w-[170px] text-white">Apellidos y Nombres</th>
                <th className="px-3 py-2.5 min-w-[90px] text-slate-300">Cédula</th>
                <th className="px-3 py-2.5 text-center min-w-[95px] border-l border-slate-700/60 text-slate-200">Estatus</th>
                {/* Months Headers */}
                {visibleMonths.map((m) => (
                  <th key={m.id} className="px-2 py-2.5 text-center min-w-[80px] border-l border-slate-700/60">
                    <div>{m.name}</div>
                    <div className="text-[9px] text-amber-300 font-bold">${m.feeUSD_direct || m.feeUSD || 12}</div>
                  </th>
                ))}
                {/* Special Quotas Headers */}
                {visibleQuotas.map((q) => (
                  <th key={q.id} className="px-2 py-2.5 text-center min-w-[90px] border-l border-slate-700/60 bg-amber-900/30 text-amber-200">
                    <div>{q.title}</div>
                    <div className="text-[9px] text-amber-400 font-bold">${q.feeUSD}</div>
                  </th>
                ))}
                <th className="px-3 py-2.5 text-right min-w-[90px] border-l border-slate-700/60 text-orange-300">Deuda</th>
                <th className="px-3 py-2.5 text-center min-w-[100px] text-slate-300">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-900">
              {filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan={5 + visibleMonths.length + visibleQuotas.length} className="px-6 py-8 text-center text-slate-400">
                    No hay integrantes registrados o coincidentes. Agrega integrantes desde la opción "Nuevo Pago" o importando en WhatsApp.
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((s, idx) => (
                  <tr key={s.member.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-3 py-2 text-center text-slate-400 font-mono font-medium">
                      {idx + 1}
                    </td>
                    <td className="px-3.5 py-2 font-bold text-slate-900">
                      <button
                        onClick={() => onSelectMemberForSearch(s.member.id)}
                        className="hover:text-orange-600 transition-colors text-left cursor-pointer"
                      >
                        {s.member.lastName}, {s.member.firstName}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-slate-500 font-mono text-[11px]">
                      {s.member.cedula || 'N/A'}
                    </td>
                    <td className="px-3 py-2 text-center border-l border-slate-100">
                      {s.isVisibleSolvent ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Solvente</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                          <XCircle className="w-3 h-3 text-red-600" />
                          <span>Moroso</span>
                        </span>
                      )}
                    </td>

                    {/* Months Status Cells */}
                    {visibleMonths.map((m) => {
                      const st = s.monthsStatus[m.id];
                      
                      const now = new Date();
                      let currentYear = now.getFullYear();
                      let currentMonthNum = now.getMonth() + 1;
                      try {
                        const caracasStr = new Intl.DateTimeFormat('sv-SE', {
                          timeZone: 'America/Caracas',
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        }).format(now);
                        const [y, mon] = caracasStr.split('-').map(Number);
                        currentYear = y;
                        currentMonthNum = mon;
                      } catch (e) {}
                      const currentLinear = currentYear * 12 + currentMonthNum;
                      const monthLinear = m.year * 12 + m.monthNumber;
                      const isFuture = monthLinear > currentLinear;

                      return (
                        <td key={m.id} className="px-1 py-1.5 text-center border-l border-slate-100">
                          {st ? (
                            <button
                              onClick={() => onOpenPaymentModalForMember(s.member.id, 'month', m.id)}
                              className={`w-full py-1 px-1 rounded text-[10px] font-bold transition-transform active:scale-95 cursor-pointer ${
                                st.status === 'solvente'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200'
                                  : isFuture
                                  ? 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                                  : st.status === 'parcial'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200 hover:bg-amber-200'
                                  : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                              }`}
                              title={`Clic para registrar pago de ${m.name}`}
                            >
                              {st.status === 'solvente' && `$${st.paidUSD.toFixed(2).replace('.00', '')}`}
                              {st.status === 'parcial' && `$${st.paidUSD.toFixed(2)}`}
                              {st.status === 'deuda' && (st.paidUSD > 0 ? `$${st.paidUSD.toFixed(2)}` : '0')}
                            </button>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Special Quotas Cells */}
                    {visibleQuotas.map((q) => {
                      const st = s.quotasStatus[q.id];
                      return (
                        <td key={q.id} className="px-1 py-1.5 text-center border-l border-slate-100 bg-amber-50/20">
                          {st ? (
                            <button
                              onClick={() => onOpenPaymentModalForMember(s.member.id, 'quota', q.id)}
                              className={`w-full py-1 px-1 rounded text-[10px] font-bold transition-transform active:scale-95 cursor-pointer ${
                                st.status === 'solvente'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200'
                                  : st.status === 'parcial'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200 hover:bg-amber-200'
                                  : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                              }`}
                              title={`Clic para registrar pago de cuota ${q.title}`}
                            >
                              {st.status === 'solvente' && `$${st.paidUSD.toFixed(2).replace('.00', '')}`}
                              {st.status === 'parcial' && `$${st.paidUSD.toFixed(2)}`}
                              {st.status === 'deuda' && (st.paidUSD > 0 ? `$${st.paidUSD.toFixed(2)}` : '0')}
                            </button>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Only Deuda total Column */}
                    <td className="px-3 py-2 text-right font-bold text-red-600 border-l border-slate-100">
                      <div className="flex flex-col items-end">
                        <span>${s.visibleOwedUSD.toFixed(2)}</span>
                        {s.lateFeesSummary && s.lateFeesSummary.owedLateFeesUSD > 0 && (
                          <span className="text-[9px] text-rose-500 font-extrabold block" title={`${s.lateFeesSummary.lateFeesCount} multas por atraso`}>
                            (Inc. ${s.lateFeesSummary.owedLateFeesUSD.toFixed(2)} multas)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          onClick={() => onSelectMemberForSearch(s.member.id)}
                          className="p-1 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors cursor-pointer"
                          title="Ver detalle"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onOpenInvoiceModal(s)}
                          className="p-1 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                          title="Generar Comprobante por Mes"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onOpenPaymentModalForMember(s.member.id)}
                          className="p-1 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                          title="Abonar Pago"
                        >
                          <Plus className="w-3.5 h-3.5" />
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
    </div>
  );
};
