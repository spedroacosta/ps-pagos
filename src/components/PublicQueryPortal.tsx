import React, { useState, useEffect } from 'react';
import {
  Search,
  UserCheck,
  AlertOctagon,
  Printer,
  Calendar,
  CreditCard,
  History,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  FileText,
  Download,
  LogOut,
  RefreshCw,
  X,
  TrendingUp,
  Mail,
  User,
  Calculator,
} from 'lucide-react';
import { Member, MonthConfig, SpecialQuota, PaymentEntry, MemberSolvencySummary, LateFeeConfig } from '../types';
import { calculateMemberSolvency, formatUSD, formatVES, getMethodLabel } from '../utils/calculations';
import { ConversionCalculator } from './ConversionCalculator';

interface PublicQueryPortalProps {
  tenantId: string;
  onGoBackToGate: () => void;
}

export const PublicQueryPortal: React.FC<PublicQueryPortalProps> = ({
  tenantId,
  onGoBackToGate,
}) => {
  const [cedulaInput, setCedulaInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Loaded member query data
  const [queryResult, setQueryResult] = useState<{
    tenant: { id: string; name: string; logoUrl: string | null; circularLogoUrl?: string | null };
    member: Member;
    months: MonthConfig[];
    quotas: SpecialQuota[];
    payments: PaymentEntry[];
    lateFee?: LateFeeConfig;
  } | null>(null);

  // Printable receipt state
  const [selectedReceiptTargetId, setSelectedReceiptTargetId] = useState<string | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [isCalcOpen, setIsCalcOpen] = useState(false);
  const [portalBcvRate, setPortalBcvRate] = useState<number>(61.5);

  useEffect(() => {
    fetch('/api/bcv')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.rate && !isNaN(data.rate)) {
          setPortalBcvRate(data.rate);
        }
      })
      .catch(() => {});
  }, []);

  const handleQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cedulaInput.trim()) {
      setError('Por favor escribe tu número de cédula.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setQueryResult(null);

    try {
      const res = await fetch(`/api/public/tenant/${tenantId}/query?cedula=${encodeURIComponent(cedulaInput.trim())}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setQueryResult(data);
        if (data.months && data.months.length > 0) {
          // Preselect current active or first month for receipt preview
          setSelectedReceiptTargetId(null);
        }
      } else {
        setError(data.error || 'No se pudo encontrar la información. Verifica tu cédula o consulta con tu Comité.');
      }
    } catch (err) {
      setError('Ocurrió un error al conectar con el servidor. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearResult = () => {
    setQueryResult(null);
    setCedulaInput('');
    setError(null);
  };

  // Generate solvency summary if query results are loaded
  const solvencySummary = queryResult
    ? calculateMemberSolvency(queryResult.member, queryResult.months, queryResult.quotas, queryResult.payments, queryResult.lateFee)
    : null;

  const percentPaid = solvencySummary
    ? (solvencySummary.totalPaidUSD + solvencySummary.totalOwedUSD > 0
      ? Math.round((solvencySummary.totalPaidUSD / (solvencySummary.totalPaidUSD + solvencySummary.totalOwedUSD)) * 100)
      : 100)
    : 100;

  // Render receipt download logic inside modal
  

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Dynamic Header */}
      <header className="bg-[#162e58] text-white shadow-md border-b-4 border-[#d95c0f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {queryResult?.tenant.logoUrl ? (
              <img
                src={queryResult.tenant.circularLogoUrl || queryResult.tenant.logoUrl}
                alt="Logo"
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full bg-white object-cover border border-[#d95c0f]"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#1e427b] flex items-center justify-center text-[#d95c0f] border border-[#d95c0f]">
                <GraduationCap className="w-5 h-5" />
              </div>
            )}
            <div>
              <span className="text-[10px] text-orange-400 font-bold tracking-wider uppercase block">
                Portal de Integrantes • Consulta de Solvencia
              </span>
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight">
                {queryResult?.tenant.name || 'Cargando Promoción...'}
              </h1>
            </div>
          </div>

          <button
            onClick={onGoBackToGate}
            className="flex items-center space-x-1 text-xs text-slate-300 hover:text-white font-bold bg-[#1e427b] hover:bg-[#254f91] px-3 py-1.5 rounded-lg border border-[#d95c0f]/20 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Step 1: Input Query Form (Only visible when no result or during query) */}
        {!queryResult && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-md max-w-lg mx-auto space-y-6 text-slate-900 mt-6 sm:mt-12">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#d95c0f] flex items-center justify-center mx-auto border border-orange-100 shadow-2xs">
                <Search className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-[#162e58]">Consulta tu Solvencia</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Ingresa tu número de cédula de identidad para consultar tus mensualidades solventadas, abonos pendientes, deudas y descargar tus comprobantes de pago oficiales.
              </p>
            </div>

            <form onSubmit={handleQuery} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Cédula de Identidad del Integrante
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 12.345.678 o V12345678"
                    className="block w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 bg-slate-50 text-slate-900 font-semibold"
                    value={cedulaInput}
                    onChange={(e) => setCedulaInput(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-bold text-white bg-[#162e58] hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                {isLoading ? 'Buscando...' : 'Consultar Estado'}
              </button>
            </form>

            <div className="border-t border-slate-100 pt-4 text-center">
              <button
                onClick={onGoBackToGate}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                ← Volver al portal principal de la App
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Member Query Results View */}
        {queryResult && solvencySummary && (
          <div className="space-y-6">
            
            {/* Quick action bar to query another cédula */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-900 shadow-2xs">
              <span className="text-xs font-bold text-slate-700">
                Mostrando información de: <strong className="text-[#162e58]">{queryResult.member.lastName}, {queryResult.member.firstName}</strong>
              </span>
              <button
                onClick={handleClearResult}
                className="bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
              >
                Consultar otra Cédula
              </button>
            </div>

            {/* Profile Overview Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6 text-slate-900 relative">
              <div className="md:col-span-2 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    Cédula: {queryResult.member.cedula || 'N/A'}
                  </span>
                  {solvencySummary.isUpToDate ? (
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 uppercase">
                      <UserCheck className="w-3 h-3" /> SOLVENTE
                    </span>
                  ) : (
                    <span className="bg-red-100 text-red-800 border border-red-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 uppercase">
                      <AlertOctagon className="w-3 h-3" /> CON DEUDA
                    </span>
                  )}
                </div>

                <div>
                  <h2 className="text-xl font-bold text-[#162e58] leading-tight">
                    {queryResult.member.lastName}, {queryResult.member.firstName}
                  </h2>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {queryResult.member.email || 'Correo electrónico no registrado'}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-xs text-slate-600">
                  <p className="font-semibold text-slate-800 mb-1">Nota del Comité de Finanzas:</p>
                  <p className="italic">
                    "Los pagos son verificados y consolidados por el comité en un plazo de 24 a 48 horas tras tu reporte en WhatsApp. Cualquier discrepancia, por favor ponte en contacto directo."
                  </p>
                </div>
              </div>

              {/* Financial Totals */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-between space-y-3">
                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                  Resumen de Cuenta (USD)
                </h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="text-xs text-slate-600">Total Solventado:</span>
                    <span className="font-extrabold text-emerald-700 text-sm">
                      {formatUSD(solvencySummary.totalPaidUSD)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600">Saldo Pendiente:</span>
                    <span className={`font-extrabold text-sm ${solvencySummary.totalOwedUSD > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                      {formatUSD(solvencySummary.totalOwedUSD)}
                    </span>
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Efectividad de Pago</span>
                  <span className="text-lg font-black text-[#162e58]">
                    {percentPaid}%
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCalcOpen(true)}
                  className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Calculator className="w-4 h-4 text-indigo-600" />
                  <span>Calculadora de Conversión</span>
                </button>
              </div>
            </div>

            {/* CALCULATOR MODAL FOR PUBLIC QUERY PORTAL */}
            {isCalcOpen && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="font-bold text-sm text-slate-800">Calculadora de Pagos en $ Directos / Tasa BCV</span>
                    <button onClick={() => setIsCalcOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <ConversionCalculator months={queryResult.months} currentBcvRate={portalBcvRate} />
                </div>
              </div>
            )}

            {/* Monthly and Quotas breakdown */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-slate-900">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 pb-2">
                <Calendar className="w-4 h-4 text-orange-500" />
                Desglose Detallado de Mensualidades
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {queryResult.months.map((m) => {
                  const statusObj = solvencySummary.monthsStatus[m.id];
                  if (!statusObj) return null;

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
                      className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                        statusObj.status === 'solvente'
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                          : isFuture
                          ? 'bg-slate-50 border-slate-200 text-slate-500'
                          : statusObj.status === 'parcial'
                          ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                          : 'bg-red-50/70 border-red-200 text-red-900'
                      }`}
                    >
                      <div className="font-extrabold flex justify-between">
                        <span className={isFuture && statusObj.status !== 'solvente' ? 'text-slate-400 font-medium' : ''}>{m.name}</span>
                        <span className={isFuture && statusObj.status !== 'solvente' ? 'text-slate-400 font-medium' : ''}>${m.feeUSD}</span>
                      </div>
                      <div className="text-[10px] flex justify-between items-baseline pt-1 border-t border-slate-200/50">
                        <span className={`opacity-80 ${isFuture && statusObj.status !== 'solvente' ? 'text-slate-400' : ''}`}>Abonado:</span>
                        <span className={`font-bold ${isFuture && statusObj.status !== 'solvente' ? 'text-slate-500' : ''}`}>${statusObj.paidUSD.toFixed(2)}</span>
                      </div>
                      <div className="font-bold text-[10px] text-right">
                        {statusObj.status === 'solvente' && (
                          <span className="text-emerald-800">✅ Solventado</span>
                        )}
                        {statusObj.status === 'parcial' && (
                          isFuture ? (
                            <span className="text-slate-400">⚪ Resta ${statusObj.owedUSD.toFixed(2)}</span>
                          ) : (
                            <span className="text-amber-800">⚠️ Resta ${statusObj.owedUSD.toFixed(2)}</span>
                          )
                        )}
                        {statusObj.status === 'deuda' && (
                          isFuture ? (
                            <span className="text-slate-400">⚪ Pendiente</span>
                          ) : (
                            <span className="text-red-700">❌ Pendiente</span>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Special Quotas if any exist */}
              {queryResult.quotas.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="font-bold text-xs uppercase text-slate-400">Cuotas Especiales</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {queryResult.quotas.map((q) => {
                      const statusObj = solvencySummary.quotasStatus[q.id];
                      if (!statusObj) return null;
                      return (
                        <div
                          key={q.id}
                          className={`p-3 rounded-xl border text-xs flex justify-between items-center ${
                            statusObj.status === 'solvente'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                              : 'bg-red-50 border-red-200 text-red-900'
                          }`}
                        >
                          <div>
                            <span className="font-extrabold block">{q.title}</span>
                            <span className="text-[10px] opacity-80">
                              Fijado: ${q.feeUSD} | Pagado: ${statusObj.paidUSD}
                            </span>
                          </div>
                          <span className="font-bold text-[11px]">
                            {statusObj.status === 'solvente' ? '✅ Solventado' : `❌ Pendiente $${statusObj.owedUSD}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Late Fees if any exist */}
              {solvencySummary.lateFeesSummary && solvencySummary.lateFeesSummary.lateFeesCount > 0 && (
                <div className="space-y-2 pt-3 border-t border-slate-100 mt-3 text-slate-900">
                  <h4 className="font-bold text-xs uppercase text-rose-500 flex items-center gap-1.5">
                    <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                    Multas por Atraso de Pago
                  </h4>
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs space-y-2">
                    <div>
                      <span className="font-extrabold text-rose-900 block">
                        Se detectaron {solvencySummary.lateFeesSummary.lateFeesCount} mensualidad(es) vencidas por más de 2 meses.
                      </span>
                      <span className="text-[10px] text-rose-700 block font-medium leading-normal">
                        Cargos: {solvencySummary.lateFeesSummary.lateFeesCount} multa(s) × ${queryResult.lateFee?.feeUSD_direct ?? 2}.00 USD directo (o ${queryResult.lateFee?.feeUSD_bcv ?? 3}.00 a tasa BCV).
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-rose-200/50 text-[11px]">
                      <div>
                        <span className="text-rose-700 block font-medium">Acumulado:</span>
                        <strong className="text-rose-900">${solvencySummary.lateFeesSummary.totalLateFeesUSD_direct.toFixed(2)} USD</strong>
                      </div>
                      <div>
                        <span className="text-rose-700 block font-medium">Abonado:</span>
                        <strong className="text-rose-900">${solvencySummary.lateFeesSummary.paidLateFeesUSD.toFixed(2)} USD</strong>
                      </div>
                      <div>
                        <span className="text-rose-700 block font-medium">Pendiente:</span>
                        <strong className="text-rose-950">${solvencySummary.lateFeesSummary.owedLateFeesUSD.toFixed(2)} USD</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Receipts / Timetable */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-slate-900">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 pb-2">
                <History className="w-4 h-4 text-indigo-500" />
                Historial de Comprobantes de Pago
              </h3>

              {queryResult.payments.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">
                  No hay ningún pago registrado a tu nombre todavía.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                        <th className="px-3 py-2 text-left">Fecha</th>
                        <th className="px-3 py-2 text-left">Concepto</th>
                        <th className="px-3 py-2 text-left">Referencia</th>
                        <th className="px-3 py-2 text-left">Método</th>
                        <th className="px-3 py-2 text-right">Monto</th>
                        <th className="px-3 py-2 text-center">Recibo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {queryResult.payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 text-slate-700">
                          <td className="px-3 py-2.5 whitespace-nowrap">{p.paymentDate}</td>
                          <td className="px-3 py-2.5 font-bold text-[#162e58]">{p.targetLabel}</td>
                          <td className="px-3 py-2.5 font-mono">{p.reference}</td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-[11px]">{getMethodLabel(p.method)}</td>
                          <td className="px-3 py-2.5 text-right whitespace-nowrap font-bold">
                            {p.currency === 'USD' ? formatUSD(p.amountUSD) : `${formatVES(p.amountOriginal)} (${formatUSD(p.amountUSD)})`}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              onClick={() => {
                                setSelectedReceiptTargetId('tx-' + p.id);
                                setIsInvoiceModalOpen(true);
                              }}
                              className="inline-flex items-center space-x-1 font-bold text-[10px] text-orange-600 bg-orange-50 hover:bg-[#162e58] hover:text-white px-2 py-1 rounded border border-orange-100 transition-colors cursor-pointer"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Ver</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {/* Printable Receipt Preview Overlay Modal */}
      

      {/* Footer */}
      <footer className="bg-slate-100 border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        © 2026 {queryResult?.tenant.name || 'SaaS'} • Desarrollado por el Comité de Finanzas. Todos los derechos reservados.
      </footer>
      {isInvoiceModalOpen && queryResult && solvencySummary && (
        <InvoiceModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          member={queryResult.member}
          solvencySummary={solvencySummary}
          months={queryResult.months}
          quotas={queryResult.quotas}
          payments={queryResult.payments}
          initialTargetId={selectedReceiptTargetId || undefined}
        />
      )}
    </div>
  );
};
