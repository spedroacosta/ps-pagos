import React, { useState, useMemo, useEffect } from 'react';
import {
  MessageSquareCode,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  ArrowRightLeft,
  X,
  Calendar,
  CreditCard,
  Hash,
  DollarSign,
  CheckSquare,
  Square,
  ChevronDown,
  User,
  Calculator,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { Member, MonthConfig, SpecialQuota, ParsedWhatsAppItem, PaymentEntry, PaymentMethod, DollarPurchase } from '../types';
import { formatUSD, formatVES, getMethodLabel, distributePaymentAcrossConcepts, getCaracasDateString } from '../utils/calculations';
import { getTenantHeaders } from '../utils/api';

interface RegistroPagosProps {
  members: Member[];
  months: MonthConfig[];
  quotas: SpecialQuota[];
  payments: PaymentEntry[];
  dollarPurchases: DollarPurchase[];
  currentBcvRate: number;
  onBatchAddPayments: (payments: Omit<PaymentEntry, 'id' | 'dateEntered'>[]) => void;
  onAddDollarPurchase: (purchase: Omit<DollarPurchase, 'id'>) => void;
}


const SearchableMemberSelect = ({ members, value, onChange }: { members: Member[], value: string, onChange: (id: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const selected = members.find(m => m.id === value);
  const filtered = members.filter(m => `${m.lastName} ${m.firstName} ${m.cedula}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative w-full">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-950 cursor-pointer flex justify-between items-center"
      >
        <span>{selected ? `${selected.lastName}, ${selected.firstName} (${selected.cedula || 'Sin Cédula'})` : '-- Selecciona un integrante --'}</span>
        <span className="text-slate-400">▼</span>
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input
              autoFocus
              type="text"
              placeholder="Buscar por nombre o cédula..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {filtered.length > 0 ? filtered.map(m => (
              <div
                key={m.id}
                onClick={() => { onChange(m.id); setIsOpen(false); setSearch(''); }}
                className={`px-3 py-2 text-xs font-bold rounded-lg cursor-pointer hover:bg-indigo-50 transition-colors ${m.id === value ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}`}
              >
                {m.lastName}, {m.firstName} ({m.cedula || 'Sin Cédula'})
              </div>
            )) : (
              <div className="px-3 py-2 text-xs text-slate-500 italic text-center">No se encontraron resultados</div>
            )}
          </div>
        </div>
      )}
      
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
};

export const RegistroPagos: React.FC<RegistroPagosProps> = ({
  members,
  months,
  quotas,
  payments,
  dollarPurchases,
  currentBcvRate,
  onBatchAddPayments,
  onAddDollarPurchase,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'ai_import' | 'manual_payment' | 'manual_dolares'>('ai_import');

  // ==========================================
  // 1. AI IMPORTATION STATE & LOGIC
  // ==========================================
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedWhatsAppItem[]>([]);
  const [hasParsed, setHasParsed] = useState(false);

  const handleParseText = async () => {
    if (!rawText.trim()) {
      setErrorMsg('Por favor pega al menos un mensaje de chat para analizar.');
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
          const isDollarPurchase = Boolean(item.isDollarPurchase);
          const matchedMem = members.find((m) => m.id === item.matchedMemberId);
          const defaultTargetId = item.targetId || months[4]?.id || months[0]?.id || '2026-05';
          const defaultTargetType = item.targetType === 'quota' ? 'quota' : 'month';
          const initialConcepts = item.selectedConcepts && Array.isArray(item.selectedConcepts) && item.selectedConcepts.length > 0
            ? item.selectedConcepts
            : [`${defaultTargetType}:${defaultTargetId}`];

          return {
            id: `parsed-${Date.now()}-${idx}`,
            rawText: item.rawTextExcerpt || rawText.slice(0, 50),
            matchedMemberId: isDollarPurchase ? '' : (item.matchedMemberId || ''),
            matchedMemberName: isDollarPurchase
              ? 'Fondo de Promoción (Compra Dólares)'
              : (matchedMem
                  ? `${matchedMem.lastName}, ${matchedMem.firstName}`
                  : (item.matchedMemberId ? item.matchedMemberName : 'Seleccionar Integrante...')),
            matchConfidence: isDollarPurchase ? 100 : (item.matchedMemberId ? (item.matchConfidence || 80) : 0),
            paymentDate: item.paymentDate || getCaracasDateString(),
            method: (item.method as PaymentMethod) || 'pago_movil',
            amountOriginal: Number(item.amountOriginal) || 0,
            currency: item.currency === 'USD' ? 'USD' : 'VES',
            bcvRate: Number(item.bcvRate) || currentBcvRate,
            reference: item.reference || 'S/R',
            targetType: isDollarPurchase ? 'month' : defaultTargetType,
            targetId: isDollarPurchase ? '' : defaultTargetId,
            targetLabel: isDollarPurchase ? 'Compra de Dólares' : (item.targetLabel || 'Mayo 2026'),
            selectedConcepts: isDollarPurchase ? [] : initialConcepts,
            notes: item.notes || (isDollarPurchase ? 'Compra de divisas' : 'Parseado de WhatsApp'),
            approved: true,
            isDollarPurchase,
            usdAmount: item.usdAmount ? Number(item.usdAmount) : undefined,
          };
        });

        setParsedItems(formatted);
        setHasParsed(true);
      } else {
        setErrorMsg(data.error || 'No se pudieron extraer transacciones del texto.');
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

  const handleSaveAllParsed = () => {
    const approved = parsedItems.filter((i) => i.approved);
    if (approved.length === 0) {
      alert('No hay transacciones aprobadas para registrar.');
      return;
    }

    let paymentsCount = 0;
    let purchasesCount = 0;

    const paymentsToSubmit: Omit<PaymentEntry, 'id' | 'dateEntered'>[] = [];

    approved.forEach((item) => {
      if (item.isDollarPurchase) {
        // Submit dollar purchase directly
        const usdVal = item.usdAmount || (item.bcvRate > 0 ? item.amountOriginal / item.bcvRate : 0);
        onAddDollarPurchase({
          date: item.paymentDate,
          bsAmount: item.amountOriginal,
          usdAmount: Math.round(usdVal * 100) / 100,
          rate: item.bcvRate,
          notes: item.notes || 'Compra de divisas (IA)',
        });
        purchasesCount++;
      } else {
        // Standard payment
        if (!item.matchedMemberId) {
          alert(`Por favor asigna un integrante al pago con monto ${item.amountOriginal} antes de guardar.`);
          throw new Error('Member missing');
        }

        const concepts = item.selectedConcepts || [];
        const count = concepts.length;

        const distribution = distributePaymentAcrossConcepts({
          memberId: item.matchedMemberId,
          selectedConcepts: concepts,
          amountOriginal: item.amountOriginal,
          currency: item.currency,
          method: item.method,
          bcvRate: item.bcvRate || currentBcvRate,
          months,
          quotas,
        });

        const labelList = distribution.map((d) => d.targetLabel).join(', ');
        const primary = distribution[0] || {
          targetType: item.targetType || 'month',
          targetId: item.targetId || '',
          targetLabel: item.targetLabel || '',
        };

        paymentsToSubmit.push({
          memberId: item.matchedMemberId,
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
        paymentsCount++;
      }
    });

    if (paymentsToSubmit.length > 0) {
      onBatchAddPayments(paymentsToSubmit);
    }

    let msg = '¡Éxito!';
    if (paymentsCount > 0) msg += ` Se registraron ${paymentsCount} mensualidades/cuotas.`;
    if (purchasesCount > 0) msg += ` Se registraron ${purchasesCount} compras de dólares de forma automatizada.`;
    alert(msg);

    setRawText('');
    setParsedItems([]);
    setHasParsed(false);
  };

  // ==========================================
  // 2. MANUAL MEMBER PAYMENT LOGIC
  // ==========================================
  const [mMemberId, setMMemberId] = useState('');
  const [mMethod, setMMethod] = useState<PaymentMethod>('pago_movil');
  const [mPaymentDate, setMPaymentDate] = useState(getCaracasDateString());
  const [mCurrency, setMCurrency] = useState<'USD' | 'VES'>('VES');
  const [mAmountOriginal, setMAmountOriginal] = useState('');
  const [mBcvRate, setMBcvRate] = useState<number>(currentBcvRate);
  const [mReference, setMReference] = useState('');
  const [mNotes, setMNotes] = useState('');
  const [mConceptAmounts, setMConceptAmounts] = useState<Record<string, string>>({});
  const [mSelectedConcepts, setMSelectedConcepts] = useState<string[]>([]);

  useEffect(() => {
    setMBcvRate(currentBcvRate);
  }, [currentBcvRate]);

  const handleManualMethodChange = (newMethod: PaymentMethod) => {
    setMMethod(newMethod);
    if (newMethod === 'efectivo_usd' || newMethod === 'binance') {
      setMCurrency('USD');
    } else {
      setMCurrency('VES');
    }
  };

  const toggleManualConcept = (conceptKey: string) => {
    setMSelectedConcepts((prev) =>
      prev.includes(conceptKey)
        ? prev.filter((k) => k !== conceptKey)
        : [...prev, conceptKey]
    );
  };

  const handleManualPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(mAmountOriginal) || 0;

    if (!mMemberId) {
      alert('Por favor selecciona un integrante.');
      return;
    }
    if (numAmount <= 0) {
      alert('Por favor ingresa un monto válido.');
      return;
    }
    if (mSelectedConcepts.length === 0) {
      alert('Por favor selecciona al menos un concepto (mes o cuota).');
      return;
    }

    const selectedMember = members.find((m) => m.id === mMemberId);
    const memberName = selectedMember ? `${selectedMember.lastName}, ${selectedMember.firstName}` : '';

    const manualAllocationsOriginal: Record<string, number> = {};
    for (const key of mSelectedConcepts) {
       if (mConceptAmounts[key]) {
         manualAllocationsOriginal[key] = parseFloat(mConceptAmounts[key]) || 0;
       }
    }
    
    // If they provided manual amounts, auto-calculate numAmount if it's empty or 0
    let finalAmount = numAmount;
    if (Object.keys(manualAllocationsOriginal).length > 0 && finalAmount === 0) {
       finalAmount = Object.values(manualAllocationsOriginal).reduce((a, b) => a + b, 0);
    }

    const distribution = distributePaymentAcrossConcepts({
      memberId: mMemberId,
      selectedConcepts: mSelectedConcepts,
      amountOriginal: finalAmount,
      currency: mCurrency,
      method: mMethod,
      bcvRate: mBcvRate,
      months,
      quotas,
      manualAllocationsOriginal
    });

    const labelList = distribution.map((d) => d.targetLabel).join(', ');
    const primary = distribution[0] || {
      targetType: 'month' as const,
      targetId: '',
      targetLabel: '',
    };

    onBatchAddPayments([
      {
        memberId: mMemberId,
        memberName,
        method: mMethod,
        paymentDate: mPaymentDate,
        amountOriginal: finalAmount,
        currency: mCurrency,
        bcvRate: mBcvRate,
        amountUSD: distribution.reduce((sum, d) => sum + d.amountUSD, 0),
        reference: mReference || 'S/R',
        notes: mNotes,
        targetType: primary.targetType,
        targetId: primary.targetId,
        targetLabel: mSelectedConcepts.length > 1 ? `Multi-concepto: ${labelList}` : primary.targetLabel,
        breakdown: distribution,
      },
    ]);

    alert(`¡Pago de ${memberName} registrado con éxito!`);
    setMAmountOriginal('');
    setMReference('');
    setMNotes('');
    setMSelectedConcepts([]);
    setMConceptAmounts({});
  };

  // ==========================================
  // 3. MANUAL DOLLAR PURCHASE STATE & LOGIC
  // ==========================================
  const [dpDate, setDpDate] = useState(getCaracasDateString());
  const [dpBsAmount, setDpBsAmount] = useState('');
  const [dpUsdAmount, setDpUsdAmount] = useState('');
  const [dpNotes, setDpNotes] = useState('');

  const numBs = parseFloat(dpBsAmount) || 0;
  const numUSD = parseFloat(dpUsdAmount) || 0;
  const impliedRate = numUSD > 0 ? numBs / numUSD : 0;

  const handleManualPurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numBs <= 0 || numUSD <= 0) {
      alert('Por favor ingresa montos válidos.');
      return;
    }

    onAddDollarPurchase({
      date: dpDate,
      bsAmount: numBs,
      usdAmount: numUSD,
      rate: Math.round(impliedRate * 100) / 100,
      notes: dpNotes || 'Compra de divisas en mercado paralelo (Registro Manual)',
    });

    alert(`¡Compra de $${numUSD} registrada con éxito!`);
    setDpBsAmount('');
    setDpUsdAmount('');
    setDpNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-slate-900">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
            <PlusCircle className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Registro Unificado de Ingestas y Pagos</h2>
            <p className="text-[11px] text-slate-500">
              Registra pagos mediante análisis IA de chat de WhatsApp/Telegram o ingresa transacciones manualmente.
            </p>
          </div>
        </div>

        {/* BCV Widget */}
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl self-start md:self-auto">
          <TrendingUp className="w-3.5 h-3.5 text-rose-600" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Tasa BCV Referencia:</span>
          <span className="text-xs font-mono font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
            {currentBcvRate.toFixed(2)} Bs/$
          </span>
        </div>
      </div>

      {/* Sub-Tabs Nav */}
      <div className="flex border-b border-slate-200/80 bg-slate-50/50 p-1.5 rounded-2xl gap-1">
        <button
          onClick={() => setActiveSubTab('ai_import')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'ai_import'
              ? 'bg-white text-rose-700 shadow-xs border border-slate-200 font-extrabold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <MessageSquareCode className="w-4 h-4" />
          <span>🤖 Importar desde Chat IA</span>
        </button>

        <button
          onClick={() => setActiveSubTab('manual_payment')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'manual_payment'
              ? 'bg-white text-rose-700 shadow-xs border border-slate-200 font-extrabold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <User className="w-4 h-4" />
          <span>📝 Registrar Pago Manual</span>
        </button>

        <button
          onClick={() => setActiveSubTab('manual_dolares')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'manual_dolares'
              ? 'bg-white text-rose-700 shadow-xs border border-slate-200 font-extrabold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span>🔄 Registrar Compra de Dólares</span>
        </button>
      </div>

      {/* SUBTAB CONTENT */}
      <div>
        {/* 1. AI IMPORT SUBTAB */}
        {activeSubTab === 'ai_import' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300">
                    Analizador de Transacciones con IA Gemini
                  </h3>
                </div>
                <span className="bg-rose-500/10 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-500/20 uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-yellow-300" /> PRO
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Pega el texto copiado de WhatsApp o Telegram que contenga reportes de pagos de integrantes
                  <b> o reportes de compra de dólares de la comisión</b> (ej: <i>"Se compraron 100$ a tasa 41 Bs/$"</i>).
                  La Inteligencia Artificial extraerá cada movimiento automáticamente.
                </p>
                <textarea
                  rows={4}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Ejemplo:
"Buenas tardes. Pago movil de Pedro Acosta 444 Bs ref 948271 por la cuota del mes de mayo.
También informamos que hoy compramos $100 en divisas con bolívares de la cuenta a tasa 41.2 ref 12345."`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleParseText}
                  disabled={isParsing || !rawText.trim()}
                  className="bg-rose-600 hover:bg-rose-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md flex items-center space-x-2 transition-all transform active:scale-95 cursor-pointer border border-rose-500/30"
                >
                  {isParsing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Analizando con IA...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-yellow-300" />
                      <span>Analizar Texto</span>
                    </>
                  )}
                </button>
              </div>

              {errorMsg && (
                <div className="bg-red-950/40 border border-red-800 text-red-200 rounded-xl p-3 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Parsed Output Items */}
            {hasParsed && (
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Transacciones Extraídas por la IA ({parsedItems.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Verifica y ajusta antes de registrar permanentemente.
                  </p>
                </div>

                <div className="space-y-4">
                  {parsedItems.map((item) => (
                    <div
                      key={item.id}
                      className={`border rounded-xl p-4 space-y-3 transition-all ${
                        !item.approved
                          ? 'bg-slate-50/50 border-slate-200 opacity-60'
                          : item.isDollarPurchase
                          ? 'bg-amber-50/50 border-amber-200 ring-1 ring-amber-200/50'
                          : 'bg-emerald-50/40 border-emerald-200/80 ring-1 ring-emerald-100'
                      }`}
                    >
                      {/* Header row */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/50 pb-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={item.approved}
                            onChange={() => toggleItemApproval(item.id)}
                            className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                          />
                          {item.isDollarPurchase ? (
                            <span className="bg-amber-600 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                              <ArrowRightLeft className="w-3 h-3" /> COMPRA DE DÓLARES (IA)
                            </span>
                          ) : (
                            <span className="bg-emerald-700 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                              <CheckCircle2 className="w-3 h-3" /> MENSUALIDAD / CUOTA
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            title="Descartar esta transacción"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Content Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-800">
                        {/* Column 1: Match/Concept */}
                        <div className="space-y-2">
                          {!item.isDollarPurchase ? (
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                                Integrante Asociado
                              </label>
                              <select
                                value={item.matchedMemberId || ''}
                                onChange={(e) => updateItemMember(item.id, e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-900"
                              >
                                <option value="">-- No identificado --</option>
                                {members.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.lastName}, {m.firstName}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                                Destino de Fondos
                              </label>
                              <span className="bg-slate-100 text-slate-700 font-bold px-2 py-1 rounded border border-slate-200/80 block text-xs">
                                🏢 Fondo Común de la Promoción
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Column 2: Transaction info */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                              Monto Original
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.amountOriginal}
                              onChange={(e) => updateItemField(item.id, 'amountOriginal', parseFloat(e.target.value) || 0)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                              Moneda
                            </label>
                            <select
                              value={item.currency}
                              onChange={(e) => updateItemField(item.id, 'currency', e.target.value as 'VES' | 'USD')}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold"
                            >
                              <option value="VES">VES (Bs.)</option>
                              <option value="USD">USD ($)</option>
                            </select>
                          </div>
                        </div>

                        {/* Column 3: Reference, Date, Tasa */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                              Referencia
                            </label>
                            <input
                              type="text"
                              value={item.reference}
                              onChange={(e) => updateItemField(item.id, 'reference', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                              Fecha Transacción
                            </label>
                            <input
                              type="date"
                              value={item.paymentDate}
                              onChange={(e) => updateItemField(item.id, 'paymentDate', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Additional Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                            Notas / Contexto
                          </label>
                          <input
                            type="text"
                            value={item.notes}
                            onChange={(e) => updateItemField(item.id, 'notes', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                              Tasa Aplicada
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.bcvRate}
                              onChange={(e) => updateItemField(item.id, 'bcvRate', parseFloat(e.target.value) || 0)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                            />
                          </div>

                          {item.isDollarPurchase ? (
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                                Dólares Comprados ($)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={item.usdAmount || (item.bcvRate > 0 ? Math.round((item.amountOriginal / item.bcvRate) * 100) / 100 : 0)}
                                onChange={(e) => updateItemField(item.id, 'usdAmount', parseFloat(e.target.value) || 0)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-emerald-800"
                              />
                            </div>
                          ) : (
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                                Concepto Abono
                              </label>
                              <span className="bg-slate-100 text-indigo-950 font-bold px-2 py-1.5 rounded block text-[10px] truncate">
                                {item.targetLabel}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Concept multi-selector (only for member payments) */}
                      {!item.isDollarPurchase && item.selectedConcepts && (
                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/60 space-y-1">
                          <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                            Desglose de Conceptos Abonados:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {months.map((m) => {
                              const key = `month:${m.id}`;
                              const isChecked = item.selectedConcepts?.includes(key);
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => {
                                    const current = item.selectedConcepts || [];
                                    const updated = current.includes(key)
                                      ? current.filter((x) => x !== key)
                                      : [...current, key];
                                    updateItemField(item.id, 'selectedConcepts', updated);
                                  }}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                                    isChecked
                                      ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                                      : 'bg-white border-slate-200 text-slate-500'
                                  }`}
                                >
                                  {m.name}
                                </button>
                              );
                            })}
                            {quotas.map((q) => {
                              const key = `quota:${q.id}`;
                              const isChecked = item.selectedConcepts?.includes(key);
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => {
                                    const current = item.selectedConcepts || [];
                                    const updated = current.includes(key)
                                      ? current.filter((x) => x !== key)
                                      : [...current, key];
                                    updateItemField(item.id, 'selectedConcepts', updated);
                                  }}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                                    isChecked
                                      ? 'bg-orange-50 border-orange-300 text-orange-800'
                                      : 'bg-white border-slate-200 text-slate-500'
                                  }`}
                                >
                                  {q.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Submit all approved */}
                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleSaveAllParsed}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-md flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95 border border-emerald-500/20"
                  >
                    <CheckCircle2 className="w-4.5 h-4.5" />
                    <span>Aprobar y Registrar Transacciones ({parsedItems.filter(i => i.approved).length})</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. MANUAL MEMBER PAYMENT SUBTAB */}
        {activeSubTab === 'manual_payment' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-1.5">
              <User className="w-4 h-4 text-rose-600" />
              Registro Manual de Mensualidad o Cuota Especial
            </h3>

            <form onSubmit={handleManualPaymentSubmit} className="space-y-4">
              {/* Member & Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    Integrante <span className="text-rose-600">*</span>
                  </label>
                  <SearchableMemberSelect 
                    members={members} 
                    value={mMemberId} 
                    onChange={setMMemberId} 
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    Fecha del Pago
                  </label>
                  <input
                    type="date"
                    value={mPaymentDate}
                    onChange={(e) => setMPaymentDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    required
                  />
                </div>
              </div>

              {/* Concepts Selector */}
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1 flex items-center justify-between">
                  <span>Seleccionar Conceptos a Abonar <span className="text-rose-600">*</span></span>
                  {mSelectedConcepts.length > 0 && (
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                      {mSelectedConcepts.length} seleccionado{mSelectedConcepts.length > 1 ? 's' : ''}
                    </span>
                  )}
                </label>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 max-h-48 overflow-y-auto">
                  <span className="text-[9px] uppercase font-extrabold text-indigo-800 block tracking-wider">Mensualidades</span>
                  {months.map((m) => {
                    const key = `month:${m.id}`;
                    const isChecked = mSelectedConcepts.includes(key);
                    return (
                      <div key={key} className={`flex flex-col p-2 rounded-lg text-xs border transition-all ${isChecked ? 'bg-indigo-50 border-indigo-200 font-bold text-indigo-950' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleManualConcept(key)}>
                          <div className="flex items-center space-x-2">
                            {isChecked ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                            <span>{m.name} {m.year}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-normal">
                            ${m.feeUSD_direct} dir. / ${m.feeUSD_bcv} BCV
                          </span>
                        </div>
                        {isChecked && (
                          <div className="mt-2 pl-6 flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                            <label className="text-[10px] font-semibold text-slate-500">Abonar {mCurrency === 'VES' ? '(Bs.)' : '($)'}:</label>
                            <div className="relative w-32">
                              <input type="number" step="0.01" className="w-full bg-white border border-indigo-200 rounded px-2 py-1 text-xs text-indigo-900 font-bold focus:outline-none" placeholder="Opcional" value={mConceptAmounts[key] || ''} onChange={(e) => setMConceptAmounts({...mConceptAmounts, [key]: e.target.value})} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {quotas.length > 0 && (
                    <>
                      <span className="text-[9px] uppercase font-extrabold text-orange-800 block tracking-wider mt-2.5">Cuotas Especiales</span>
                      {quotas.map((q) => {
                        const key = `quota:${q.id}`;
                        const isChecked = mSelectedConcepts.includes(key);
                        return (
                          <div key={key} className={`flex flex-col p-2 rounded-lg text-xs border transition-all ${isChecked ? 'bg-orange-50 border-orange-200 font-bold text-orange-950' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                            <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleManualConcept(key)}>
                              <div className="flex items-center space-x-2">
                                {isChecked ? <CheckSquare className="w-4 h-4 text-orange-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                                <span>{q.title}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-normal">
                                ${q.feeUSD_direct || q.feeUSD} USD / ${q.feeUSD_bcv || q.feeUSD} BCV
                              </span>
                            </div>
                            {isChecked && (
                              <div className="mt-2 pl-6 flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                                <label className="text-[10px] font-semibold text-slate-500">Abonar {mCurrency === 'VES' ? '(Bs.)' : '($)'}:</label>
                                <div className="relative w-32">
                                  <input type="number" step="0.01" className="w-full bg-white border border-orange-200 rounded px-2 py-1 text-xs text-orange-900 font-bold focus:outline-none" placeholder="Opcional" value={mConceptAmounts[key] || ''} onChange={(e) => setMConceptAmounts({...mConceptAmounts, [key]: e.target.value})} />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}
                  
                  <span className="text-[9px] uppercase font-extrabold text-rose-800 block tracking-wider mt-2.5">Cargos por Atraso (Por Mes)</span>
                  {months.map((m) => {
                    const key = `late_fee:${m.id}`;
                    const isChecked = mSelectedConcepts.includes(key);
                    return (
                      <div key={key} className={`flex flex-col p-2 rounded-lg text-xs border transition-all ${isChecked ? 'bg-rose-50 border-rose-200 font-bold text-rose-950' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleManualConcept(key)}>
                          <div className="flex items-center space-x-2">
                            {isChecked ? <CheckSquare className="w-4 h-4 text-rose-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                            <span>Multa de {m.name} {m.year}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-normal">Fijado individualmente</span>
                        </div>
                        {isChecked && (
                          <div className="mt-2 pl-6 flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                            <label className="text-[10px] font-semibold text-slate-500">Abonar {mCurrency === 'VES' ? '(Bs.)' : '($)'}:</label>
                            <div className="relative w-32">
                              <input type="number" step="0.01" className="w-full bg-white border border-rose-200 rounded px-2 py-1 text-xs text-rose-900 font-bold focus:outline-none" placeholder="Opcional" value={mConceptAmounts[key] || ''} onChange={(e) => setMConceptAmounts({...mConceptAmounts, [key]: e.target.value})} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Amount, currency, method, rate */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    Método de Pago
                  </label>
                  <select
                    value={mMethod}
                    onChange={(e) => handleManualMethodChange(e.target.value as PaymentMethod)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-950 focus:outline-none"
                  >
                    <option value="pago_movil">Pago Móvil (VES)</option>
                    <option value="transferencia_ves">Transferencia (VES)</option>
                    <option value="efectivo_usd">Efectivo ($ USD)</option>
                    <option value="binance">Binance Pay ($ USD)</option>
                    <option value="efectivo_ves">Efectivo Bs. (VES)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    Monto Original <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={mCurrency === 'VES' ? 'ej. 4500' : 'ej. 12'}
                    value={mAmountOriginal}
                    onChange={(e) => setMAmountOriginal(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-950 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    Moneda
                  </label>
                  <span className="bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-extrabold block text-slate-700 h-[38px] flex items-center justify-center">
                    {mCurrency === 'VES' ? 'Bolívares (VES)' : 'Dólares (USD)'}
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    Tasa BCV Aplicada
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={mCurrency === 'USD'}
                    value={mBcvRate}
                    onChange={(e) => setMBcvRate(parseFloat(e.target.value) || currentBcvRate)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-950 focus:outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Reference and Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    Número de Referencia / Comprobante
                  </label>
                  <input
                    type="text"
                    placeholder="ej. 1928371"
                    value={mReference}
                    onChange={(e) => setMReference(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    Notas o Comentarios Adicionales
                  </label>
                  <input
                    type="text"
                    placeholder="ej. Pago de mensualidad de mayo"
                    value={mNotes}
                    onChange={(e) => setMNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Equiv display */}
              {parseFloat(mAmountOriginal) > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs flex justify-between items-center text-emerald-900">
                  <div className="flex items-center space-x-1.5 font-bold">
                    <Calculator className="w-4 h-4 text-emerald-600" />
                    <span>Equivalente aproximado en divisas:</span>
                  </div>
                  <span className="font-extrabold text-sm font-mono">
                    {mCurrency === 'USD'
                      ? formatUSD(parseFloat(mAmountOriginal))
                      : formatUSD(mBcvRate > 0 ? parseFloat(mAmountOriginal) / mBcvRate : 0)}
                  </span>
                </div>
              )}

              {/* Submit button */}
              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center space-x-1.5"
                >
                  <PlusCircle className="w-4.5 h-4.5" />
                  <span>Registrar Pago Manualmente</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 3. MANUAL DOLLAR PURCHASE SUBTAB */}
        {activeSubTab === 'manual_dolares' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ArrowRightLeft className="w-4 h-4 text-rose-600" />
                Conversión de Fondos: Registrar Compra de Dólares
              </h3>
              <p className="text-[11px] text-slate-500 leading-none">
                Usa bolívares recaudados para adquirir dólares en efectivo o digital.
              </p>
            </div>

            <form onSubmit={handleManualPurchaseSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    Fecha de Operación
                  </label>
                  <input
                    type="date"
                    value={dpDate}
                    onChange={(e) => setDpDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-950 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    Bolívares Invertidos (Bs.) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="ej. 4100.00"
                    value={dpBsAmount}
                    onChange={(e) => setDpBsAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-950 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                    Dólares Adquiridos ($ USD) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="ej. 100.00"
                    value={dpUsdAmount}
                    onChange={(e) => setDpUsdAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-emerald-800 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Tasa implícita card */}
              {numBs > 0 && numUSD > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs flex justify-between items-center text-amber-900">
                  <span className="font-bold">Tasa Implícita de Compra:</span>
                  <span className="font-extrabold font-mono text-sm">
                    1 USD = {impliedRate.toFixed(4)} BS
                  </span>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-500 mb-1">
                  Notas / Detalles Adicionales
                </label>
                <input
                  type="text"
                  placeholder="ej. Se compraron $100 a tasa 41,00 Bs"
                  value={dpNotes}
                  onChange={(e) => setDpNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800"
                />
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="submit"
                  className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center space-x-1.5"
                >
                  <ArrowRightLeft className="w-4.5 h-4.5" />
                  <span>Registrar Compra de Dólares</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
