import React, { useState, useEffect } from 'react';
import { Calculator, ArrowRightLeft, DollarSign, Info, CheckCircle2 } from 'lucide-react';
import { MonthConfig } from '../types';

interface ConversionCalculatorProps {
  months: MonthConfig[];
  currentBcvRate: number;
}

export const ConversionCalculator: React.FC<ConversionCalculatorProps> = ({ months, currentBcvRate }) => {
  const [selectedMonthId, setSelectedMonthId] = useState<string>(months[0]?.id || '');
  const activeMonth = months.find(m => m.id === selectedMonthId) || months[0] || {
    feeUSD_direct: 12,
    feeUSD_bcv: 16,
    name: 'Mes Base'
  };

  const feeDirect = activeMonth.feeUSD_direct || activeMonth.feeUSD || 12;
  const feeBcv = activeMonth.feeUSD_bcv || 16;
  const [bcvRate, setBcvRate] = useState<number>(currentBcvRate || 61.5);

  useEffect(() => {
    if (currentBcvRate && currentBcvRate > 0) {
      setBcvRate(currentBcvRate);
    }
  }, [currentBcvRate]);

  // Mode 1: Paid Direct -> Find BCV/Bs remaining
  const [paidDirectInput, setPaidDirectInput] = useState<string>('0');
  const paidDirect = parseFloat(paidDirectInput) || 0;
  const remainingDirect = Math.max(0, feeDirect - paidDirect);
  const remainingBcvFromDirect = feeDirect > 0 ? (remainingDirect * feeBcv) / feeDirect : 0;
  const remainingBsFromDirect = remainingBcvFromDirect * bcvRate;

  // Mode 2: Paid BCV -> Find Direct remaining
  const [paidBcvInput, setPaidBcvInput] = useState<string>('0');
  const paidBcv = parseFloat(paidBcvInput) || 0;
  const remainingBcv = Math.max(0, feeBcv - paidBcv);
  const remainingDirectFromBcv = feeBcv > 0 ? (remainingBcv * feeDirect) / feeBcv : 0;
  const remainingBsFromBcv = remainingBcv * bcvRate;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Calculadora de Equivalencia y Conversión</h3>
            <p className="text-xs text-slate-500">Regla de 3 para pagos parciales ($ Directos vs $ Tasa BCV)</p>
          </div>
        </div>

        {/* Month Selector & BCV Rate */}
        <div className="flex items-center space-x-2">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase">Mes Base</label>
            <select
              value={selectedMonthId}
              onChange={(e) => setSelectedMonthId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {months.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.feeUSD_direct || m.feeUSD || 12}$ Dir / {m.feeUSD_bcv || 16}$ BCV)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase">Tasa BCV (Bs/$)</label>
            <input
              type="number"
              value={bcvRate}
              onChange={(e) => setBcvRate(parseFloat(e.target.value) || 0)}
              className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Grid of 2 Conversion Modes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* MODE 1: Pagó en $ Directos */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-3 relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              1. Pagó en $ Directos (Efectivo / Binance)
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              Cuota: {feeDirect}$
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Monto Pagado en $ Directos:</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">$</span>
              <input
                type="number"
                value={paidDirectInput}
                onChange={(e) => setPaidDirectInput(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg pl-7 pr-3 py-1.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Ej. 10"
              />
            </div>
          </div>

          {/* Result Card */}
          <div className="bg-white border border-emerald-200/80 rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-600">
              <span>Restante en $ Directos:</span>
              <span className="font-bold text-slate-900">${remainingDirect.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-indigo-700 font-semibold pt-1 border-t border-slate-100">
              <span>Equivalente Restante a Tasa BCV ($):</span>
              <span className="font-bold text-sm text-indigo-900">${remainingBcvFromDirect.toFixed(2)} BCV</span>
            </div>
            <div className="flex justify-between items-center text-xs text-emerald-700 font-bold pt-1 border-t border-slate-100">
              <span>Equivalente Restante en Bolívares:</span>
              <span className="text-sm font-extrabold text-emerald-800">Bs. {remainingBsFromDirect.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* MODE 2: Pagó a Tasa BCV */}
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 space-y-3 relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
              2. Pagó a Tasa BCV ($ o Bolívares)
            </span>
            <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
              Cuota: {feeBcv}$ BCV
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Monto Pagado en $ BCV (o equivalente):</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">$</span>
              <input
                type="number"
                value={paidBcvInput}
                onChange={(e) => setPaidBcvInput(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg pl-7 pr-3 py-1.5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Ej. 10"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Equivalente en Bolívares pagados: Bs. {((parseFloat(paidBcvInput) || 0) * bcvRate).toFixed(2)}
            </p>
          </div>

          {/* Result Card */}
          <div className="bg-white border border-indigo-200/80 rounded-lg p-3 space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-600">
              <span>Restante a Tasa BCV ($):</span>
              <span className="font-bold text-slate-900">${remainingBcv.toFixed(2)} BCV</span>
            </div>
            <div className="flex justify-between items-center text-xs text-indigo-700 font-semibold pt-1 border-t border-slate-100">
              <span>Restante en Bolívares:</span>
              <span className="font-bold text-slate-900">Bs. {remainingBsFromBcv.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-emerald-700 font-bold pt-1 border-t border-slate-100">
              <span>Equivalente Restante en $ Directos:</span>
              <span className="text-sm font-extrabold text-emerald-800">${remainingDirectFromBcv.toFixed(2)} Directos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Formula Explanation Banner */}
      <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-blue-900">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Fórmula aplicada (Regla de 3 Proporcional):</p>
          <p className="mt-0.5 text-blue-800">
            Relación del mes: <strong className="font-semibold">{feeDirect}$ Directos = {feeBcv}$ BCV</strong>.
            Si se abona un pago parcial en una de las monedas, la deuda restante se calcula proporcionalmente para que el integrante pueda cancelar la diferencia exacta en la divisa que prefiera.
          </p>
        </div>
      </div>
    </div>
  );
};
