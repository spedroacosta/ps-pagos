import React, { useState, useEffect, useMemo } from 'react';
import { X, DollarSign, Calculator, Calendar, Tag, CreditCard, Hash, FileText, CheckCircle2, CheckSquare, Square } from 'lucide-react';
import { Member, MonthConfig, SpecialQuota, PaymentMethod, PaymentEntry, CustomPaymentMethod } from '../types';
import { formatUSD, formatVES, distributePaymentAcrossConcepts, getCaracasDateString, getAllPaymentMethods, isUsdMethod } from '../utils/calculations';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  months: MonthConfig[];
  quotas: SpecialQuota[];
  payments?: PaymentEntry[];
  currentBcvRate: number;
  onSavePayment: (payment: Omit<PaymentEntry, 'id' | 'dateEntered'>) => void;
  onSaveBatchPayments?: (payments: Omit<PaymentEntry, 'id' | 'dateEntered'>[]) => void;
  editingPayment?: PaymentEntry | null;
  onUpdatePayment?: (id: string, updatedPayment: Omit<PaymentEntry, 'id' | 'dateEntered'>) => void;
  initialMemberId?: string;
  initialTargetType?: 'month' | 'quota' | 'late_fee';
  initialTargetId?: string;
  customPaymentMethods?: CustomPaymentMethod[];
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  members,
  months,
  quotas,
  payments = [],
  currentBcvRate,
  onSavePayment,
  onSaveBatchPayments,
  editingPayment = null,
  onUpdatePayment,
  initialMemberId = '',
  initialTargetType = 'month',
  initialTargetId = '',
  customPaymentMethods = [],
}) => {
  const [memberId, setMemberId] = useState(initialMemberId);
  const [method, setMethod] = useState<PaymentMethod>('pago_movil');
  const [paymentDate, setPaymentDate] = useState(getCaracasDateString());
  const [currency, setCurrency] = useState<'USD' | 'VES'>('VES');
  const [amountOriginal, setAmountOriginal] = useState<string>('');
  const [bcvRate, setBcvRate] = useState<number>(currentBcvRate);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [conceptAmounts, setConceptAmounts] = useState<Record<string, string>>({});

  // Concept mode: array of selected concept keys e.g. "month:2026-06" or "quota:sq-1"
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>([]);
  const [isFetchingHistRate, setIsFetchingHistRate] = useState(false);

  // Fetch historical rate when payment date changes
  useEffect(() => {
    if (paymentDate && /^\d{4}-\d{2}-\d{2}$/.test(paymentDate) && isOpen && !editingPayment) {
      setIsFetchingHistRate(true);
      fetch(`/api/bcv?date=${paymentDate}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.rate) {
            setBcvRate(data.rate);
          }
        })
        .catch((err) => console.error("Error fetching historical rate:", err))
        .finally(() => setIsFetchingHistRate(false));
    }
  }, [paymentDate, isOpen, editingPayment]);

  useEffect(() => {
    if (isOpen) {
      if (editingPayment) {
        setMemberId(editingPayment.memberId || '');
        setMethod(editingPayment.method || 'pago_movil');
        setPaymentDate(editingPayment.paymentDate || getCaracasDateString());
        setCurrency(editingPayment.currency || 'VES');
        setAmountOriginal(
          editingPayment.amountOriginal !== undefined && editingPayment.amountOriginal !== null
            ? editingPayment.amountOriginal.toString()
            : ''
        );
        setBcvRate(editingPayment.bcvRate || currentBcvRate || 1);
        setReference(editingPayment.reference || '');
        setNotes(editingPayment.notes || '');

        if (editingPayment.breakdown && Array.isArray(editingPayment.breakdown) && editingPayment.breakdown.length > 0) {
          const mapped = editingPayment.breakdown
            .filter((b) => b && (b.targetType || b.targetId))
            .map((b) => `${b.targetType || 'month'}:${b.targetId || ''}`);
          if (mapped.length > 0) {
            setSelectedConcepts(mapped);
          } else {
            setSelectedConcepts([`${editingPayment.targetType || 'month'}:${editingPayment.targetId || ''}`]);
          }
        } else {
          setSelectedConcepts([`${editingPayment.targetType || 'month'}:${editingPayment.targetId || ''}`]);
        }
      } else {
        setMemberId(initialMemberId || (members[0]?.id || ''));
        const defaultId = initialTargetId || (initialTargetType === 'month' ? (months[4]?.id || months[0]?.id || '') : (initialTargetType === 'late_fee' ? 'global' : (quotas[0]?.id || '')));
        setSelectedConcepts([`${initialTargetType}:${defaultId}`]);
        setBcvRate(currentBcvRate);
        setMethod('pago_movil');
        setPaymentDate(getCaracasDateString());
        setCurrency('VES');
        setAmountOriginal('');
        setReference('');
        setNotes('');
    setConceptAmounts({});
      }
    }
  }, [isOpen, editingPayment, initialMemberId, initialTargetType, initialTargetId, members, months, quotas, currentBcvRate]);

  const handleMethodChange = (newMethod: PaymentMethod) => {
    setMethod(newMethod);
    const isUSD = isUsdMethod(newMethod, undefined, customPaymentMethods);
    setCurrency(isUSD ? 'USD' : 'VES');
  };

  const numAmount = parseFloat(amountOriginal) || 0;
  const calculatedUSD = currency === 'USD' 
    ? numAmount 
    : (bcvRate > 0 ? numAmount / bcvRate : 0);

  const selectedMember = members.find((m) => m.id === memberId);

  const currentDistribution = useMemo(() => {
    if (!memberId || selectedConcepts.length === 0 || numAmount <= 0) return [];
    const filteredPayments = editingPayment
      ? payments.filter((p) => p.id !== editingPayment.id)
      : payments;
    const manualAllocationsOriginal = Object.fromEntries(Object.entries(conceptAmounts).map(([k, v]) => [k, parseFloat(String(v)) || 0]));
    let finalAmount = numAmount;
    if (Object.keys(manualAllocationsOriginal).length > 0 && finalAmount === 0) {
      finalAmount = Object.values(manualAllocationsOriginal).reduce((a, b) => a + b, 0);
    }
    return distributePaymentAcrossConcepts({
      memberId,
      selectedConcepts,
      manualAllocationsOriginal,
      amountOriginal: finalAmount,
      currency,
      method,
      bcvRate,
      months,
      quotas,
      existingPayments: filteredPayments,
      customMethods: customPaymentMethods,
    });
  }, [memberId, selectedConcepts, numAmount, currency, method, bcvRate, months, quotas, payments, editingPayment, customPaymentMethods]);

  if (!isOpen) return null;

  const toggleConcept = (conceptKey: string) => {
    setSelectedConcepts((prev) =>
      prev.includes(conceptKey)
        ? prev.filter((k) => k !== conceptKey)
        : [...prev, conceptKey]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) {
      alert('Por favor selecciona un integrante');
      return;
    }
    let finalAmount = numAmount;
    const manualAllocationsOriginal = Object.fromEntries(Object.entries(conceptAmounts).map(([k, v]) => [k, parseFloat(String(v)) || 0]));
    if (Object.keys(manualAllocationsOriginal).length > 0 && finalAmount === 0) {
      finalAmount = Object.values(manualAllocationsOriginal).reduce((a, b) => a + b, 0);
    }

    if (finalAmount <= 0) {
      alert('Por favor ingresa un monto válido o desglosa los montos a abonar');
      return;
    }
    if (selectedConcepts.length === 0) {
      alert('Por favor selecciona al menos un concepto (mes o cuota especial)');
      return;
    }

    const memberName = selectedMember ? `${selectedMember.lastName}, ${selectedMember.firstName}` : '';
    const count = selectedConcepts.length;

    const distribution = currentDistribution;

    if (editingPayment && onUpdatePayment) {
      const labelList = distribution.map(d => d.targetLabel).join(', ');
      const first = distribution[0] || {
        targetType: 'month',
        targetId: '',
        targetLabel: 'Saldo Inicial',
      };

      onUpdatePayment(editingPayment.id, {
        memberId,
        memberName,
        method,
        paymentDate,
        amountOriginal: finalAmount,
        currency,
        bcvRate,
        amountUSD: calculatedUSD,
        reference: reference || 'S/R',
        notes: notes,
        targetType: first.targetType,
        targetId: first.targetId,
        targetLabel: count > 1 ? `Multi-concepto: ${labelList}` : first.targetLabel,
        breakdown: distribution,
      });
    } else {
      const labelList = distribution.map(d => d.targetLabel).join(', ');
      const first = distribution[0] || {
        targetType: 'month',
        targetId: '',
        targetLabel: 'Saldo Inicial',
      };

      const singlePayment: Omit<PaymentEntry, 'id' | 'dateEntered'> = {
        memberId,
        memberName,
        method,
        paymentDate,
        amountOriginal: finalAmount,
        currency,
        bcvRate,
        amountUSD: calculatedUSD,
        reference: reference || 'S/R',
        notes: notes,
        targetType: first.targetType,
        targetId: first.targetId,
        targetLabel: count > 1 ? `Multi-concepto: ${labelList}` : first.targetLabel,
        breakdown: distribution,
      };

      onSavePayment(singlePayment);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#162e58]/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl text-slate-900 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-[#162e58] text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#b53c00]/20 border border-[#b53c00]/30 flex items-center justify-center text-[#d95c0f]">
              <DollarSign className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {editingPayment ? 'Editar Pago / Entrada' : 'Registrar Nuevo Pago'}
              </h3>
              <p className="text-xs text-slate-300">
                {editingPayment ? 'Modifica los datos del registro de pago' : 'Completa los datos del abono o mensualidad'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Member Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">
              Integrante <span className="text-red-500">*</span>
            </label>
            <select
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
              required
            >
              <option value="" disabled>-- Selecciona un integrante --</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.lastName}, {m.firstName} ({m.cedula || 'Sin Cédula'})
                </option>
              ))}
            </select>
          </div>

          {/* CONCEPT SECTION */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
              <span>Concepto <span className="text-red-500">*</span></span>
              {selectedConcepts.length > 0 && (
                <span className="text-[10px] font-bold text-orange-600 lowercase bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                  {selectedConcepts.length} seleccionado{selectedConcepts.length > 1 ? 's' : ''}
                </span>
              )}
            </label>
            <div className="bg-slate-50 border border-slate-300 rounded-xl p-3 space-y-2 max-h-48 overflow-y-auto">
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-extrabold text-indigo-700 block tracking-wider">Mensualidades</span>
                {months.map((m) => {
                  const key = `month:${m.id}`;
                  const isChecked = selectedConcepts.includes(key);
                  return (
                    <div key={key} className={`flex flex-col p-2 rounded-lg text-xs border transition-all ${isChecked ? 'bg-indigo-50 border-indigo-300 font-bold text-indigo-950' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                      <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleConcept(key)}>
                        <div className="flex items-center space-x-2">
                          {isChecked ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                          <span>{m.name} {m.year}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-normal">${m.feeUSD_direct || 12} dir. / ${m.feeUSD_bcv || 16} BCV</span>
                      </div>
                      {isChecked && (
                        <div className="mt-2 pl-6 flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                          <label className="text-[10px] font-semibold text-slate-500">Abonar {currency === 'VES' ? '(Bs.)' : '($)'}:</label>
                          <input type="number" step="0.01" className="w-24 bg-white border border-indigo-200 rounded px-2 py-1 text-xs text-indigo-900 font-bold focus:outline-none" placeholder="Opcional" value={conceptAmounts[key] || ''} onChange={(e) => setConceptAmounts({...conceptAmounts, [key]: e.target.value})} />
                        </div>
                      )}
                    </div>
                  );
                })}

                {quotas.length > 0 && (
                  <>
                    <span className="text-[9px] uppercase font-extrabold text-orange-700 block tracking-wider mt-2">Cuotas Especiales</span>
                    {quotas.map((q) => {
                      const key = `quota:${q.id}`;
                      const isChecked = selectedConcepts.includes(key);
                      return (
                        <div key={key} className={`flex flex-col p-2 rounded-lg text-xs border transition-all ${isChecked ? 'bg-orange-50 border-orange-300 font-bold text-orange-950' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                          <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleConcept(key)}>
                            <div className="flex items-center space-x-2">
                              {isChecked ? <CheckSquare className="w-4 h-4 text-orange-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                              <span>Cuota: {q.title}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-normal">${q.feeUSD_direct || q.feeUSD} dir.</span>
                          </div>
                          {isChecked && (
                            <div className="mt-2 pl-6 flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                              <label className="text-[10px] font-semibold text-slate-500">Abonar {currency === 'VES' ? '(Bs.)' : '($)'}:</label>
                              <input type="number" step="0.01" className="w-24 bg-white border border-orange-200 rounded px-2 py-1 text-xs text-orange-900 font-bold focus:outline-none" placeholder="Opcional" value={conceptAmounts[key] || ''} onChange={(e) => setConceptAmounts({...conceptAmounts, [key]: e.target.value})} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}

                <span className="text-[9px] uppercase font-extrabold text-rose-700 block tracking-wider mt-2">Cargos por Atraso</span>
                {months.map((m) => {
                  const key = `late_fee:${m.id}`;
                  const isChecked = selectedConcepts.includes(key);
                  return (
                    <div key={key} className={`flex flex-col p-2 rounded-lg text-xs border transition-all ${isChecked ? 'bg-rose-50 border-rose-300 font-bold text-rose-950' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                      <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleConcept(key)}>
                        <div className="flex items-center space-x-2">
                          {isChecked ? <CheckSquare className="w-4 h-4 text-rose-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                          <span>Multa de {m.name} {m.year}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-normal">Fijado de forma individual</span>
                      </div>
                      {isChecked && (
                        <div className="mt-2 pl-6 flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                          <label className="text-[10px] font-semibold text-slate-500">Abonar {currency === 'VES' ? '(Bs.)' : '($)'}:</label>
                          <input type="number" step="0.01" className="w-24 bg-white border border-rose-200 rounded px-2 py-1 text-xs text-rose-900 font-bold focus:outline-none" placeholder="Opcional" value={conceptAmounts[key] || ''} onChange={(e) => setConceptAmounts({...conceptAmounts, [key]: e.target.value})} />
                        </div>
                      )}
                    </div>
                  );
                })}

                {editingPayment && editingPayment.targetId === '' && (
                  <>
                    <span className="text-[9px] uppercase font-extrabold text-teal-700 block tracking-wider mt-2">Carga Masiva</span>
                    <div onClick={() => toggleConcept('month:')} className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer border transition-all ${selectedConcepts.includes('month:') ? 'bg-teal-50 border-teal-300 font-bold text-teal-950' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                      <div className="flex items-center space-x-2">
                        {selectedConcepts.includes('month:') ? <CheckSquare className="w-4 h-4 text-teal-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                        <span>Saldo Inicial (Carga Masiva)</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Currency & Amount Input */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Moneda</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value as 'USD' | 'VES')} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer">
                <option value="VES">Bs (VES)</option>
                <option value="USD">$ (USD)</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Monto Total <span className="text-red-500">*</span></label>
              <div className="relative">
                <input type="number" step="0.01" placeholder={currency === 'VES' ? 'ej. 444.00' : 'ej. 22.00'} value={amountOriginal} onChange={(e) => setAmountOriginal(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-orange-500" />
                <span className="absolute right-3 top-2 text-xs text-slate-400 font-semibold">{currency === 'VES' ? 'Bs.' : '$ USD'}</span>
              </div>
            </div>
          </div>

          {currency === 'VES' && (
            <div className="bg-orange-50/50 border border-orange-200 rounded-xl p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-700 flex items-center gap-1 font-semibold">Tasa BCV Aplicada:</span>
                <div className="flex items-center space-x-1">
                  <input type="number" step="0.01" value={bcvRate} onChange={(e) => setBcvRate(parseFloat(e.target.value) || 0)} className="w-20 bg-white border border-slate-300 rounded text-right px-2 py-0.5 text-slate-900 font-bold text-xs" />
                  <span className="text-slate-500 font-medium">Bs/$</span>
                </div>
              </div>
              <div className="pt-1.5 border-t border-orange-200/60 flex items-center justify-between font-bold text-xs">
                <span className="text-slate-700">Equivalente a abonar:</span>
                <span className="text-emerald-700 text-sm font-extrabold">{formatUSD(calculatedUSD)} USD</span>
              </div>
            </div>
          )}

          {/* Breakdown helper if multi concept */}
          {selectedConcepts.length > 1 && currentDistribution.length > 0 && (
            <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-2.5 text-xs text-indigo-900 space-y-1.5">
              <span className="font-bold block text-[11px] text-indigo-950">💡 Distribución de Fondos:</span>
              <div className="text-[11px] text-indigo-700 space-y-1 bg-white/60 p-2 rounded-lg border border-indigo-100 font-medium">
                {currentDistribution.map((d, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span>• {d.targetLabel}:</span>
                    <span className="font-bold text-indigo-900">{currency === 'VES' ? `${formatVES(d.amountOriginal)} (${formatUSD(d.amountUSD)})` : formatUSD(d.amountUSD)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Método de Pago</label>
              <select value={method} onChange={(e) => handleMethodChange(e.target.value as PaymentMethod)} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer">
                {getAllPaymentMethods(customPaymentMethods).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.currency})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Fecha</label>
              <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Referencia</label>
              <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono font-bold focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Nota</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none" />
            </div>
          </div>
          {/* Submit Button */}
          <div className="pt-3 flex items-center justify-end space-x-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-[#b53c00] hover:bg-[#963000] text-white font-bold text-xs px-5 py-2 rounded-xl shadow-2xs flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar Pago</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
