import React, { useState } from 'react';
import {
  MessageSquareCode,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  X,
  Calendar,
  CreditCard,
  Hash,
  DollarSign,
  CheckSquare,
  Square,
  ChevronDown,
} from 'lucide-react';
import { Member, MonthConfig, SpecialQuota, ParsedWhatsAppItem, PaymentEntry, PaymentMethod } from '../types';
import { formatUSD, formatVES, getMethodLabel, distributePaymentAcrossConcepts, getCaracasDateString } from '../utils/calculations';
import { getTenantHeaders } from '../utils/api';

interface WhatsAppParserProps {
  members: Member[];
  months: MonthConfig[];
  quotas: SpecialQuota[];
  payments: PaymentEntry[];
  currentBcvRate: number;
  onBatchAddPayments: (payments: Omit<PaymentEntry, 'id' | 'dateEntered'>[]) => void;
}

export const WhatsAppParser: React.FC<WhatsAppParserProps> = ({
  members,
  months,
  quotas,
  payments,
  currentBcvRate,
  onBatchAddPayments,
}) => {
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedWhatsAppItem[]>([]);
  const [hasParsed, setHasParsed] = useState(false);

  const handleParseText = async () => {
    if (!rawText.trim()) {
      setErrorMsg('Por favor pega al menos un mensaje de WhatsApp para analizar.');
      return;
    }

    setIsParsing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/parse-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getTenantHeaders()
        },
        body: JSON.stringify({
          rawText,
          members,
          currentBcvRate,
          monthsConfig: months,
          specialQuotas: quotas,
        }),
      });

      const data = await res.json();

      if (res.ok && data.items) {
        const formatted: ParsedWhatsAppItem[] = data.items.map((item: any, idx: number) => {
          const matchedMem = members.find((m) => m.id === item.matchedMemberId);
          const defaultTargetId = item.targetId || months[4]?.id || months[0]?.id || '2026-05';
          const defaultTargetType = item.targetType === 'quota' ? 'quota' : 'month';
          const initialConcepts = item.selectedConcepts && Array.isArray(item.selectedConcepts) && item.selectedConcepts.length > 0
            ? item.selectedConcepts
            : [`${defaultTargetType}:${defaultTargetId}`];

          return {
            id: `parsed-${Date.now()}-${idx}`,
            rawText: item.rawTextExcerpt || rawText.slice(0, 50),
            matchedMemberId: item.matchedMemberId || '',
            matchedMemberName: matchedMem
              ? `${matchedMem.lastName}, ${matchedMem.firstName}`
              : (item.matchedMemberId ? item.matchedMemberName : 'Seleccionar Integrante...'),
            matchConfidence: item.matchedMemberId ? (item.matchConfidence || 80) : 0,
            paymentDate: item.paymentDate || getCaracasDateString(),
            method: (item.method as PaymentMethod) || 'pago_movil',
            amountOriginal: Number(item.amountOriginal) || 0,
            currency: item.currency === 'USD' ? 'USD' : 'VES',
            bcvRate: Number(item.bcvRate) || currentBcvRate,
            reference: item.reference || 'S/R',
            targetType: defaultTargetType,
            targetId: defaultTargetId,
            targetLabel: item.targetLabel || 'Mayo 2026',
            selectedConcepts: initialConcepts,
            notes: item.notes || 'Parseado de WhatsApp',
            approved: true,
          };
        });

        setParsedItems(formatted);
        setHasParsed(true);
      } else {
        setErrorMsg(data.error || 'No se pudieron extraer pagos del texto.');
      }
    } catch (err: any) {
      setErrorMsg(`Error conectando con el analizador IA: ${err.message}`);
    } finally {
      setIsParsing(false);
    }
  };

  const toggleItemApproval = (id: string) => {
    setParsedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, approved: !item.approved } : item))
    );
  };

  const updateItemMember = (itemId: string, memberId: string) => {
    const mem = members.find((m) => m.id === memberId);
    setParsedItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              matchedMemberId: memberId,
              matchedMemberName: mem ? `${mem.lastName}, ${mem.firstName}` : item.matchedMemberName,
              matchConfidence: 100,
            }
          : item
      )
    );
  };

  const removeItem = (id: string) => {
    setParsedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItemField = (id: string, field: keyof ParsedWhatsAppItem, value: any) => {
    setParsedItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'method') {
            if (value === 'efectivo_usd' || value === 'binance') {
              updated.currency = 'USD';
            } else if (value === 'pago_movil' || value === 'transferencia_ves' || value === 'efectivo_ves') {
              updated.currency = 'VES';
            }
          }
          return updated;
        }
        return item;
      })
    );

    if (field === 'paymentDate' && value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      fetch(`/api/bcv?date=${value}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.rate) {
            setParsedItems((prev) =>
              prev.map((item) =>
                item.id === id ? { ...item, bcvRate: data.rate } : item
              )
            );
          }
        })
        .catch((err) => console.error("Error fetching historical rate for item:", err));
    }
  };

  const toggleItemConceptKey = (itemId: string, conceptKey: string) => {
    setParsedItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const current = item.selectedConcepts || [`${item.targetType}:${item.targetId}`];
        let next: string[];
        if (current.includes(conceptKey)) {
          next = current.filter((k) => k !== conceptKey);
        } else {
          next = [...current, conceptKey];
        }
        return { ...item, selectedConcepts: next };
      })
    );
  };

  const handleConfirmBatch = () => {
    const approved = parsedItems.filter((i) => i.approved && i.matchedMemberId && i.amountOriginal > 0);

    if (approved.length === 0) {
      alert('No hay elementos marcados para registrar.');
      return;
    }

    const allPaymentsToSubmit: Omit<PaymentEntry, 'id' | 'dateEntered'>[] = [];

    approved.forEach((item) => {
      const concepts = item.selectedConcepts && item.selectedConcepts.length > 0 
        ? item.selectedConcepts 
        : [`${item.targetType}:${item.targetId}`];
      
      const count = concepts.length;

      const distribution = distributePaymentAcrossConcepts({
        memberId: item.matchedMemberId!,
        selectedConcepts: concepts,
        amountOriginal: item.amountOriginal,
        currency: item.currency,
        method: item.method,
        bcvRate: item.bcvRate || currentBcvRate,
        months,
        quotas,
        existingPayments: payments,
      });

      if (distribution.length > 0) {
        const primary = distribution[0];
        const labelList = distribution.map(d => d.targetLabel).join(', ');

        allPaymentsToSubmit.push({
          memberId: item.matchedMemberId!,
          memberName: item.matchedMemberName || '',
          method: item.method,
          paymentDate: item.paymentDate,
          amountOriginal: item.amountOriginal,
          currency: item.currency,
          bcvRate: item.bcvRate || currentBcvRate,
          amountUSD: distribution.reduce((sum, d) => sum + d.amountUSD, 0),
          reference: item.reference || 'S/R',
          notes: item.notes || '',
          targetType: primary.targetType,
          targetId: primary.targetId,
          targetLabel: count > 1 ? `Multi-concepto: ${labelList}` : primary.targetLabel,
          breakdown: distribution,
        });
      } else {
        const fallbackUSD = item.currency === 'USD' 
          ? item.amountOriginal 
          : (item.bcvRate || currentBcvRate) > 0 
            ? item.amountOriginal / (item.bcvRate || currentBcvRate) 
            : 0;

        allPaymentsToSubmit.push({
          memberId: item.matchedMemberId!,
          memberName: item.matchedMemberName || '',
          method: item.method,
          paymentDate: item.paymentDate,
          amountOriginal: item.amountOriginal,
          currency: item.currency,
          bcvRate: item.bcvRate || currentBcvRate,
          amountUSD: fallbackUSD,
          reference: item.reference || 'S/R',
          notes: item.notes || '',
          targetType: item.targetType || 'month',
          targetId: item.targetId || '',
          targetLabel: item.targetLabel || '',
        });
      }
    });

    onBatchAddPayments(allPaymentsToSubmit);
    alert(`¡Éxito! Se han registrado ${allPaymentsToSubmit.length} pagos correctamente.`);
    setRawText('');
    setParsedItems([]);
    setHasParsed(false);
  };

  return (
    <div className="space-y-5">
      {/* Intro Banner & Input Card - macOS Liquid Glass */}
      <div className="glass-dark-card rounded-2xl p-6 text-white space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-3 rounded-xl shadow-md text-white border border-white/20">
              <MessageSquareCode className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">Importación Inteligente WhatsApp</h2>
                <span className="bg-white/10 text-indigo-200 text-[10px] px-2.5 py-0.5 rounded-full font-bold border border-white/20 flex items-center gap-1 uppercase tracking-wider backdrop-blur-md">
                  <Sparkles className="w-3 h-3 text-amber-300" /> AI Gemini 2.5
                </span>
              </div>
              <p className="text-xs text-indigo-200/90 mt-0.5">
                Pega reportes de chat y la IA estructurará el integrante, monto en Bs/USD, método y referencia. Puedes seleccionar múltiples conceptos con checks por pago.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-indigo-200">
            Mensajes de WhatsApp a Analizar
          </label>
          <textarea
            rows={4}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`Ejemplo:
"Buenas tardes comite. Pago movil de Pedro Acosta 444 Bs a tasa BCV ref 948271 por la cuota del mes de mayo y junio."
"Reporto transferencia BDV Mariana Acosta 8$ binance ref 554210 mensualidad de mayo"`}
            className="w-full bg-slate-950/60 border border-white/20 rounded-xl p-3.5 text-xs font-mono text-indigo-100 placeholder-indigo-300/40 focus:outline-none focus:ring-2 focus:ring-orange-500/80 focus:border-transparent backdrop-blur-md"
          ></textarea>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-500/20 border border-red-400/40 rounded-xl text-xs text-red-200 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-300 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-end pt-1">
          <button
            onClick={handleParseText}
            disabled={isParsing || !rawText.trim()}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg flex items-center space-x-2 transition-all cursor-pointer border border-emerald-300/40"
          >
            {isParsing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Analizando mensajes con IA...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>Procesar Mensajes con IA</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Parsed Draft Results Confirmation Table */}
      {hasParsed && (
        <div className="glass-card rounded-2xl p-5 space-y-4 text-slate-900 border border-white/80 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Pagos Extraídos ({parsedItems.length})
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Marca los conceptos (meses / cuotas) con checkbox para cada pago. Si marcas más de uno, el monto se distribuye automáticamente.
              </p>
            </div>
            <button
              onClick={handleConfirmBatch}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md flex items-center space-x-2 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Registrar {parsedItems.filter((i) => i.approved).length} Pagos Validados</span>
            </button>
          </div>

          <div className="space-y-3">
            {parsedItems.map((item) => {
              const selectedConcepts = item.selectedConcepts || [`${item.targetType}:${item.targetId}`];
              const usdVal = item.currency === 'USD' 
                ? item.amountOriginal 
                : item.amountOriginal / (item.bcvRate || currentBcvRate);

              const itemDistribution = distributePaymentAcrossConcepts({
                memberId: item.matchedMemberId || '',
                selectedConcepts,
                amountOriginal: item.amountOriginal,
                currency: item.currency,
                method: item.method,
                bcvRate: item.bcvRate || currentBcvRate,
                months,
                quotas,
                existingPayments: payments,
              });

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border text-xs space-y-3 transition-all ${
                    item.approved
                      ? 'bg-white/80 border-slate-200/90 shadow-xs'
                      : 'bg-slate-100/50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Select Checkbox & Member Match Dropdown */}
                    <div className="flex items-center space-x-3 flex-1">
                      <input
                        type="checkbox"
                        checked={item.approved}
                        onChange={() => toggleItemApproval(item.id)}
                        className="w-4 h-4 text-orange-600 bg-white border-slate-300 rounded focus:ring-orange-500 cursor-pointer"
                      />
                      <div className="flex-1">
                        <span className="text-[9px] uppercase font-bold text-slate-500 block tracking-wider">
                          Integrante Coincidente ({item.matchConfidence}% Confianza)
                        </span>
                        <select
                          value={item.matchedMemberId}
                          onChange={(e) => updateItemMember(item.id, e.target.value)}
                          className={`w-full max-w-sm bg-white border rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer ${
                            !item.matchedMemberId
                              ? 'border-amber-400 text-amber-800 bg-amber-50'
                              : 'border-slate-300 text-slate-900'
                          }`}
                        >
                          <option value="">-- SELECCIONAR INTEGRANTE --</option>
                          {members.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.lastName}, {m.firstName} ({m.cedula || 'Sin Cédula'})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Amount & Currency Inline Edit */}
                    <div className="flex items-center space-x-2 bg-slate-50/90 p-2 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">Monto:</span>
                        <input
                          type="number"
                          step="any"
                          value={item.amountOriginal || ''}
                          onChange={(e) => updateItemField(item.id, 'amountOriginal', parseFloat(e.target.value) || 0)}
                          className="w-28 border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">Moneda:</span>
                        <select
                          value={item.currency}
                          onChange={(e) => updateItemField(item.id, 'currency', e.target.value)}
                          className="border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-900 cursor-pointer bg-white"
                        >
                          <option value="VES">VES (Bs)</option>
                          <option value="USD">USD ($)</option>
                        </select>
                      </div>

                      {item.currency === 'VES' && (
                        <div className="pl-1 text-[10px] text-slate-500 font-semibold">
                          = <span className="font-extrabold text-emerald-700">{formatUSD(usdVal)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CONCEPT SELECTION CHECKBOXES LIST */}
                  <div className="border-t border-slate-200/80 pt-2.5">
                    <label className="text-[10px] uppercase font-bold text-slate-700 tracking-wider mb-1 flex items-center justify-between">
                      <span>Concepto(s) a Abonar (selecciona con checks):</span>
                      {selectedConcepts.length > 0 && (
                        <span className="text-[10px] font-bold text-orange-600 lowercase bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                          {selectedConcepts.length} seleccionado{selectedConcepts.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </label>

                    {selectedConcepts.length > 1 && item.amountOriginal > 0 && itemDistribution.length > 0 && (
                      <div className="mb-2.5 p-2 bg-indigo-50/70 border border-indigo-100 rounded-lg text-[10px] text-indigo-950 font-medium space-y-0.5">
                        <span className="font-bold text-indigo-900 block text-[9px] uppercase tracking-wider mb-0.5">💡 Desglose de distribución inteligente:</span>
                        {itemDistribution.map((d, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span>• {d.targetLabel}:</span>
                            <span className="font-extrabold text-indigo-800">
                              {item.currency === 'VES' ? `${formatVES(d.amountOriginal)} (${formatUSD(d.amountUSD)})` : formatUSD(d.amountUSD)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 max-h-40 overflow-y-auto space-y-1">
                      <span className="text-[9px] uppercase font-extrabold text-indigo-700 block tracking-wider">Mensualidades</span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {months.map((m) => {
                          const key = `month:${m.id}`;
                          const isChecked = selectedConcepts.includes(key);
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => toggleItemConceptKey(item.id, key)}
                              className={`flex items-center space-x-1.5 p-1.5 rounded-lg border text-left cursor-pointer transition-all ${
                                isChecked
                                  ? 'bg-indigo-50 border-indigo-400 text-indigo-950 font-bold'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {isChecked ? (
                                <CheckSquare className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              )}
                              <span className="text-[10px] truncate">
                                {m.name} {m.year} (${m.feeUSD_direct || m.feeUSD || 12})
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {quotas.length > 0 && (
                        <>
                          <span className="text-[9px] uppercase font-extrabold text-orange-700 block tracking-wider mt-2">Cuotas Especiales</span>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {quotas.map((q) => {
                              const key = `quota:${q.id}`;
                              const isChecked = selectedConcepts.includes(key);
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => toggleItemConceptKey(item.id, key)}
                                  className={`flex items-center space-x-1.5 p-1.5 rounded-lg border text-left cursor-pointer transition-all ${
                                    isChecked
                                      ? 'bg-orange-50 border-orange-400 text-orange-950 font-bold'
                                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  {isChecked ? (
                                    <CheckSquare className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                                  ) : (
                                    <Square className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  )}
                                  <span className="text-[10px] truncate">
                                    {q.title} (${q.feeUSD})
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Method, Date, Reference & Delete Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1 items-end">
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">
                        Método de Pago:
                      </span>
                      <select
                        value={item.method}
                        onChange={(e) => updateItemField(item.id, 'method', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs text-slate-900 font-medium cursor-pointer"
                      >
                        <option value="pago_movil">Pago móvil</option>
                        <option value="transferencia_ves">Transferencia</option>
                        <option value="efectivo_usd">Efectivo $</option>
                        <option value="binance">Binance</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[9px] text-slate-500 uppercase font-bold block flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-orange-600 inline" /> Fecha de Pago:
                      </span>
                      <input
                        type="date"
                        value={item.paymentDate}
                        onChange={(e) => updateItemField(item.id, 'paymentDate', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2 py-1 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div>
                      <span className="text-[9px] text-slate-500 uppercase font-bold block">
                        Referencia Bancaria:
                      </span>
                      <input
                        type="text"
                        value={item.reference}
                        onChange={(e) => updateItemField(item.id, 'reference', e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-mono font-bold text-slate-900"
                      />
                    </div>

                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl px-3 py-1 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                        title="Eliminar este pago del borrador"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Descartar</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
