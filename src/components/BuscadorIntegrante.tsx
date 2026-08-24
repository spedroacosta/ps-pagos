import React, { useState, useEffect } from 'react';
import {
  Search,
  UserCheck,
  AlertOctagon,
  PlusCircle,
  Receipt,
  Mail,
  Calendar,
  CreditCard,
  Hash,
  DollarSign,
  TrendingUp,
  History,
  CheckCircle2,
  Calculator,
  ShieldAlert,
  X,
  Key,
} from 'lucide-react';
import { Member, MonthConfig, SpecialQuota, PaymentEntry, MemberSolvencySummary, LateFeeConfig } from '../types';
import { calculateMemberSolvency, formatUSD, formatVES, getMethodLabel } from '../utils/calculations';
import { ConversionCalculator } from './ConversionCalculator';
import { getTenantHeaders } from '../utils/api';

interface BuscadorIntegranteProps {
  members: Member[];
  months: MonthConfig[];
  quotas: SpecialQuota[];
  payments: PaymentEntry[];
  selectedMemberId?: string;
  onOpenPaymentModalForMember: (memberId: string) => void;
  onOpenInvoiceModal: (summary: MemberSolvencySummary) => void;
  lateFeeConfig?: LateFeeConfig | null;
  onUpdateMember?: (member: Member) => void;
  tenantId?: string;
  bcvRate?: number;
}

export const BuscadorIntegrante: React.FC<BuscadorIntegranteProps> = ({
  members,
  months,
  quotas,
  payments,
  selectedMemberId = '',
  onOpenPaymentModalForMember,
  onOpenInvoiceModal,
  lateFeeConfig,
  onUpdateMember,
  tenantId,
  bcvRate = 61.5,
}) => {
  const [activeMemberId, setActiveMemberId] = useState<string>(selectedMemberId || members[0]?.id || '');
  const [searchFilter, setSearchFilter] = useState('');

  // Calculator modal state
  const [isCalcOpen, setIsCalcOpen] = useState(false);

  // Forgive late fee modal state
  const [isForgiveModalOpen, setIsForgiveModalOpen] = useState(false);
  const [forgivePassword, setForgivePassword] = useState('');
  const [forgiveError, setForgiveError] = useState<string | null>(null);
  const [isForgiving, setIsForgiving] = useState(false);
  const [selectedForgiveMonths, setSelectedForgiveMonths] = useState<string[]>([]);

  useEffect(() => {
    if (selectedMemberId) {
      setActiveMemberId(selectedMemberId);
    }
  }, [selectedMemberId]);

  const activeMember = members.find((m) => m.id === activeMemberId) || members[0];

  const solvencySummary = activeMember
    ? calculateMemberSolvency(activeMember, months, quotas, payments, lateFeeConfig || undefined)
    : null;

  const memberPayments = activeMember
    ? payments.filter((p) => p.memberId === activeMember.id)
    : [];

  // Identify current month status (e.g. Mayo or current active month)
  const currentMonthConfig = months[4] || months[months.length - 1]; // Mayo 2026 default or active
  const currentMonthStatus = solvencySummary?.monthsStatus[currentMonthConfig.id];

  const filteredMembers = members.filter(
    (m) =>
      (m.lastName || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      (m.firstName || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      m.cedula?.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleSearchFilterChange = (query: string) => {
    setSearchFilter(query);
    if (!query.trim()) return;
    const matches = members.filter(
      (m) =>
        (m.lastName || '').toLowerCase().includes(query.toLowerCase()) ||
        (m.firstName || '').toLowerCase().includes(query.toLowerCase()) ||
        m.cedula?.toLowerCase().includes(query.toLowerCase())
    );
    if (matches.length > 0) {
      setActiveMemberId(matches[0].id);
    }
  };

  const clearSearch = () => {
    setSearchFilter('');
  };

  return (
    <div className="space-y-4">
      {/* Top Search & Member Selector Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#162e58] flex items-center justify-center text-[#d95c0f]">
            <Search className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-[#162e58] text-sm">Buscador y Consulta Individual por Integrante</h3>
            <p className="text-[11px] text-slate-500">
              Escribe el nombre o cédula del integrante para ver su estado de solvencia y comprobantes.
            </p>
          </div>
        </div>

        {/* Search Bar Input & Dropdown Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, apellido o cédula..."
              value={searchFilter}
              onChange={(e) => handleSearchFilterChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-8 py-1.5 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold px-1 rounded cursor-pointer"
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>

          <div>
            <select
              value={activeMemberId}
              onChange={(e) => {
                setActiveMemberId(e.target.value);
              }}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.lastName}, {m.firstName} ({m.cedula || 'Sin Cédula'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Search Matching Pills if typing */}
        {searchFilter.trim() && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[10px] text-slate-400 uppercase font-bold mr-1">
              Coincidencias ({filteredMembers.length}):
            </span>
            {filteredMembers.slice(0, 5).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setActiveMemberId(m.id);
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                  m.id === activeMemberId
                    ? 'bg-[#162e58] text-white border-[#162e58] shadow-2xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                }`}
              >
                {m.lastName}, {m.firstName} ({m.cedula || 'S/C'})
              </button>
            ))}
            {filteredMembers.length > 5 && (
              <span className="text-[10px] text-slate-400 italic">
                +{filteredMembers.length - 5} más
              </span>
            )}
            {filteredMembers.length === 0 && (
              <span className="text-xs text-red-500 font-medium">
                No se encontró ningún integrante con "{searchFilter}"
              </span>
            )}
          </div>
        )}
      </div>

      {activeMember && solvencySummary && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Member Profile & Solvency Summary Box */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-sm text-slate-900">
            {/* Header Identity */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Cédula: {activeMember.cedula || 'N/A'}
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">
                  {activeMember.lastName}, {activeMember.firstName}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">{activeMember.email || 'Correo no registrado'}</p>
              </div>
              {solvencySummary.isUpToDate ? (
                <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 uppercase">
                  <UserCheck className="w-3.5 h-3.5" /> SOLVENTE
                </span>
              ) : (
                <span className="bg-red-100 text-red-800 border border-red-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 uppercase">
                  <AlertOctagon className="w-3.5 h-3.5" /> CON DEUDA
                </span>
              )}
            </div>

            {/* Current Month Highlight Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Mes en Curso ({currentMonthConfig.name} {currentMonthConfig.year})
              </span>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-slate-600">Cuota fijada:</span>
                <span className="font-bold text-slate-900">${currentMonthConfig.feeUSD}.00 USD</span>
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-slate-600">Abonado al mes:</span>
                <span className="font-bold text-emerald-700">
                  ${(currentMonthStatus?.paidUSD || 0).toFixed(2)} USD
                </span>
              </div>
              <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">Estado Mes:</span>
                {currentMonthStatus?.status === 'solvente' && (
                  <span className="font-bold text-emerald-800">✅ SOLVENTE</span>
                )}
                {currentMonthStatus?.status === 'parcial' && (
                  <span className="font-bold text-amber-800">
                    ⚠️ PARCIAL (Resta ${(currentMonthConfig.feeUSD - currentMonthStatus.paidUSD).toFixed(2)})
                  </span>
                )}
                {currentMonthStatus?.status === 'deuda' && (
                  <span className="font-bold text-red-700">
                    ❌ DEBE ${currentMonthConfig.feeUSD}.00 USD
                  </span>
                )}
              </div>
            </div>

            {/* Totals Box */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Total Pagado</span>
                <span className="text-base font-bold text-emerald-700 mt-0.5 block">
                  {formatUSD(solvencySummary.totalPaidUSD)}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-[9px] uppercase font-bold text-slate-500 block">Deuda Acumulada</span>
                <span className="text-base font-bold text-red-600 mt-0.5 block">
                  {formatUSD(solvencySummary.totalOwedUSD)}
                </span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={() => onOpenPaymentModalForMember(activeMember.id)}
                className="w-full bg-[#162e58] hover:bg-[#102447] text-white font-semibold text-xs py-2 rounded-md shadow-2xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-[#d95c0f]" />
                <span>Registrar Pago</span>
              </button>

              <button
                onClick={() => onOpenInvoiceModal(solvencySummary)}
                className="w-full bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs py-2 rounded-md border border-slate-200 shadow-2xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
              >
                <Receipt className="w-4 h-4 text-[#b53c00]" />
                <span>Generar Comprobante por Mes</span>
              </button>

              <button
                onClick={() => setIsCalcOpen(true)}
                className="w-full bg-slate-50 hover:bg-indigo-50 text-indigo-900 font-bold text-xs py-2 rounded-md border border-indigo-200 shadow-2xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
              >
                <Calculator className="w-4 h-4 text-indigo-600" />
                <span>Calculadora de Conversión</span>
              </button>
            </div>
          </div>

          {/* CALCULATOR MODAL */}
          {isCalcOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="font-bold text-sm text-slate-800">Calculadora Regla de 3</span>
                  <button onClick={() => setIsCalcOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <ConversionCalculator months={months} currentBcvRate={bcvRate} />
              </div>
            </div>
          )}

          {/* Right Side: Detailed Breakdown & History Timeline */}
          <div className="lg:col-span-2 space-y-4">
            {/* Month-by-month & Special Quotas Breakdown */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-slate-900">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                Desglose por Mensualidades
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {months.map((m) => {
                  const st = solvencySummary.monthsStatus[m.id];
                  if (!st) return null;

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
                    <div
                      key={m.id}
                      className={`p-2.5 rounded-lg border text-xs space-y-1 transition-all ${
                        st.status === 'solvente'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : isFuture
                          ? 'bg-slate-50 border-slate-200 text-slate-500'
                          : st.status === 'parcial'
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : 'bg-red-50 border-red-200 text-red-900'
                      }`}
                    >
                      <div className="font-bold flex justify-between">
                        <span className={isFuture && st.status !== 'solvente' ? 'text-slate-400 font-medium' : ''}>{m.name}</span>
                        <span className={isFuture && st.status !== 'solvente' ? 'text-slate-400 font-medium' : ''}>${m.feeUSD}</span>
                      </div>
                      <div className={`text-[10px] ${isFuture && st.status !== 'solvente' ? 'text-slate-400 font-medium' : ''}`}>
                        Abonado: <strong>${st.paidUSD.toFixed(2)}</strong>
                      </div>
                      <div className="text-[9px] uppercase font-bold pt-1 border-t border-slate-200/60">
                        {st.status === 'solvente' && '✅ Solvente'}
                        {st.status === 'parcial' && (isFuture ? `⚪ Parcial ($${st.paidUSD.toFixed(2)})` : `⚠️ Parcial ($${st.paidUSD.toFixed(2)})`)}
                        {st.status === 'deuda' && (isFuture ? '⚪ Pendiente' : '❌ Pendiente')}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Special Quotas Breakdown */}
              {quotas.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-amber-800 mb-2.5 flex items-center gap-1.5">
                    Cuotas Especiales y Eventos
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {quotas.map((q) => {
                      const st = solvencySummary.quotasStatus[q.id];
                      if (!st) return null;
                      return (
                        <div
                          key={q.id}
                          className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900 block">{q.title}</span>
                            <span className="text-[10px] text-slate-500">Monto: ${q.feeUSD} USD</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-emerald-700 block">${st.paidUSD.toFixed(2)} USD</span>
                            <span className="text-[10px] font-bold">
                              {st.status === 'solvente' ? '✅ SOLVENTE' : '❌ PENDIENTE'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Late Fees / Multas por Atraso Section */}
              {solvencySummary.lateFeesSummary && solvencySummary.lateFeesSummary.lateFeesCount > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                      <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                      Multas por Atraso de Pago Acumuladas
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setForgivePassword('');
                        setForgiveError(null);
                        setSelectedForgiveMonths(solvencySummary.lateFeesSummary?.lateFeeMonths || []);
                        setIsForgiveModalOpen(true);
                      }}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <ShieldAlert className="w-3 h-3" />
                      Perdonar Multa
                    </button>
                  </div>
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-rose-900 block">
                        Se detectaron {solvencySummary.lateFeesSummary.lateFeesCount} mensualidad(es) atrasada(s) por más de 2 meses.
                      </span>
                      <span className="text-[10px] text-rose-700 block font-medium">
                        Cargos: {solvencySummary.lateFeesSummary.lateFeesCount} multa(s) × ${lateFeeConfig?.feeUSD_direct ?? 2}.00 USD directo (o ${lateFeeConfig?.feeUSD_bcv ?? 3}.00 BCV).
                      </span>
                    </div>
                    <div className="text-right flex items-center space-x-4 self-end sm:self-center">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-500">Total Multas: ${solvencySummary.lateFeesSummary.totalLateFeesUSD_direct.toFixed(2)} USD</div>
                        <div className="text-[10px] text-slate-500">Abonado: ${solvencySummary.lateFeesSummary.paidLateFeesUSD.toFixed(2)} USD</div>
                        <div className="text-xs font-bold text-rose-700">Pendiente: ${solvencySummary.lateFeesSummary.owedLateFeesUSD.toFixed(2)} USD</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* FORGIVE LATE FEE MODAL */}
            {isForgiveModalOpen && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2 text-rose-700">
                      <ShieldAlert className="w-5 h-5" />
                      <h3 className="font-bold text-sm text-slate-900">Perdonar Multas por Mora</h3>
                    </div>
                    <button
                      onClick={() => setIsForgiveModalOpen(false)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-slate-600">
                    Selecciona las multas que deseas perdonar para{' '}
                    <strong className="text-slate-900">{activeMember.lastName}, {activeMember.firstName}</strong>:
                  </p>

                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {(solvencySummary.lateFeesSummary?.lateFeeMonths || []).map(monthId => {
                      const month = months.find(m => m.id === monthId);
                      const monthName = month ? `${month.name} ${month.year}` : monthId;
                      return (
                        <label key={monthId} className="flex items-center space-x-2 text-xs">
                          <input 
                            type="checkbox"
                            checked={selectedForgiveMonths.includes(monthId)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedForgiveMonths([...selectedForgiveMonths, monthId]);
                              } else {
                                setSelectedForgiveMonths(selectedForgiveMonths.filter(id => id !== monthId));
                              }
                            }}
                            className="rounded text-rose-600 focus:ring-rose-500"
                          />
                          <span className="text-slate-700 font-medium">{monthName}</span>
                        </label>
                      );
                    })}
                  </div>

                  {forgiveError && (
                    <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-bold">
                      {forgiveError}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">Contraseña de la Promoción:</label>
                    <div className="relative">
                      <Key className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="password"
                        value={forgivePassword}
                        onChange={(e) => setForgivePassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                        placeholder="Ingresa la contraseña..."
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsForgiveModalOpen(false)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isForgiving || !forgivePassword.trim() || selectedForgiveMonths.length === 0}
                      onClick={async () => {
                        setIsForgiving(true);
                        setForgiveError(null);
                        try {
                          const res = await fetch('/api/verify-password', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              ...getTenantHeaders()
                            },
                            body: JSON.stringify({ password: forgivePassword.trim() })
                          });
                          const data = await res.json();
                          if (res.ok && data.success) {
                            // Password is correct! Forgive selected late fees
                            const updatedForgiven = { ...(activeMember.forgivenLateFees || {}) };
                            selectedForgiveMonths.forEach(mId => {
                              updatedForgiven[mId] = true;
                            });
                            const updatedMember = { ...activeMember, forgivenLateFees: updatedForgiven };
                            if (onUpdateMember) {
                              onUpdateMember(updatedMember);
                            }
                            setIsForgiveModalOpen(false);
                            alert('Las multas de este integrante han sido perdonadas exitosamente.');
                          } else {
                            setForgiveError(data.error || 'Contraseña incorrecta.');
                          }
                        } catch (err: any) {
                          setForgiveError(err.message || 'Error al verificar la contraseña.');
                        } finally {
                          setIsForgiving(false);
                        }
                      }}
                      className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50"
                    >
                      {isForgiving ? 'Verificando...' : 'Confirmar Exoneración'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Payment History Timeline */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm text-slate-900">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                Historial Registrado de Pagos ({memberPayments.length})
              </h3>

              {memberPayments.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No hay pagos registrados para este integrante aún.
                </div>
              ) : (
                <div className="space-y-2">
                  {memberPayments.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-xs">{p.targetLabel}</span>
                          <span className="bg-slate-200 text-slate-700 text-[10px] px-2 py-0.2 rounded-full font-medium">
                            {getMethodLabel(p.method)}
                          </span>
                        </div>
                        <div className="text-slate-500 flex flex-wrap items-center gap-2 text-[10px]">
                          <span>Fecha: {p.paymentDate}</span>
                          <span>Ref: <strong className="text-slate-700">{p.reference}</strong></span>
                          {p.notes && <span>Nota: {p.notes}</span>}
                        </div>
                      </div>

                      <div className="text-right sm:border-l sm:border-slate-200 sm:pl-3">
                        <div className="font-bold text-emerald-700 text-xs">
                          +${p.amountUSD.toFixed(2)} USD
                        </div>
                        {p.currency === 'VES' && (
                          <div className="text-[10px] text-slate-500">
                            {formatVES(p.amountOriginal)} (tasa {p.bcvRate} Bs/$)
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
