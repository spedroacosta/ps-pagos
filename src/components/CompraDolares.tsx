import React, { useState, useMemo } from 'react';
import { ArrowRightLeft, PlusCircle, Trash2, Calendar, DollarSign, Calculator, TrendingUp } from 'lucide-react';
import { DollarPurchase } from '../types';
import { formatUSD, formatVES, getCaracasDateString } from '../utils/calculations';

interface CompraDolaresProps {
  purchases: DollarPurchase[];
  onAddPurchase: (purchase: Omit<DollarPurchase, 'id'>) => void;
  onDeletePurchase: (id: string) => void;
}

export const CompraDolares: React.FC<CompraDolaresProps> = ({
  purchases,
  onAddPurchase,
  onDeletePurchase,
}) => {
  const [date, setDate] = useState(getCaracasDateString());
  const [bsAmount, setBsAmount] = useState('');
  const [usdAmount, setUsdAmount] = useState('');
  const [notes, setNotes] = useState('');

  const numBs = parseFloat(bsAmount) || 0;
  const numUSD = parseFloat(usdAmount) || 0;
  const impliedRate = numUSD > 0 ? numBs / numUSD : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numBs <= 0 || numUSD <= 0) {
      alert('Por favor ingresa montos válidos');
      return;
    }

    onAddPurchase({
      date,
      bsAmount: numBs,
      usdAmount: numUSD,
      rate: Math.round(impliedRate * 100) / 100,
      notes: notes || 'Compra de divisas en mercado paralelo',
    });

    setBsAmount('');
    setUsdAmount('');
    setNotes('');
  };

  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');

  const uniqueMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    purchases.forEach((p) => {
      if (p.date) {
        monthsSet.add(p.date.slice(0, 7));
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [purchases]);

  const formatMonthLabel = (yearMonth: string) => {
    const [year, month] = yearMonth.split('-');
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const monthIdx = parseInt(month, 10) - 1;
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${monthNames[monthIdx]} ${year}`;
    }
    return yearMonth;
  };

  const filteredPurchases = useMemo(() => {
    if (selectedMonthFilter === 'all') return purchases;
    return purchases.filter((p) => p.date && p.date.startsWith(selectedMonthFilter));
  }, [purchases, selectedMonthFilter]);

  const totalBsSpent = filteredPurchases.reduce((sum, p) => sum + p.bsAmount, 0);
  const totalUsdBought = filteredPurchases.reduce((sum, p) => sum + p.usdAmount, 0);
  const avgRate = totalUsdBought > 0 ? totalBsSpent / totalUsdBought : 0;

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-slate-900">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <ArrowRightLeft className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Registro de Compra de Dólares (Divisas)</h2>
            <p className="text-[11px] text-slate-500">
              Registra la conversión de bolívares recaudados a dólares en efectivo o cuenta digital
            </p>
          </div>
        </div>
      </div>

      {/* Summary Metrics & Input Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Registration Form */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-2xs text-slate-900">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <PlusCircle className="w-4 h-4 text-indigo-600" />
            Registrar Transacción de Cambio
          </h3>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Fecha de Operación
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Bolívares Invertidos (Bs.)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="ej. 3900.00"
                value={bsAmount}
                onChange={(e) => setBsAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Dólares Adquiridos ($ USD)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="ej. 100.00"
                value={usdAmount}
                onChange={(e) => setUsdAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-emerald-700 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            {/* Implied Rate Card */}
            {impliedRate > 0 && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2.5 text-xs flex justify-between items-center text-indigo-900">
                <span className="text-slate-600 font-medium text-[11px]">Tasa Implícita:</span>
                <span className="text-indigo-700 font-bold text-xs">
                  {impliedRate.toFixed(2)} Bs/$
                </span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                Nota / Observación
              </label>
              <input
                type="text"
                placeholder="ej. Compra de $100 efectivo para pago de fiesta"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2 rounded-md shadow-2xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Guardar Operación de Cambio</span>
            </button>
          </form>
        </div>

        {/* Right Side: Logged Purchases Table & Accumulated Totals */}
        <div className="lg:col-span-2 space-y-4">
          {/* Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs text-slate-900">
              <span className="text-[10px] font-bold text-slate-500 block uppercase">
                Bs. Convertidos
              </span>
              <span className="text-base font-bold text-slate-900 mt-0.5 block">
                {formatVES(totalBsSpent)}
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs text-slate-900">
              <span className="text-[10px] font-bold text-slate-500 block uppercase">
                Dólares Comprados
              </span>
              <span className="text-base font-bold text-emerald-700 mt-0.5 block">
                {formatUSD(totalUsdBought)}
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs text-slate-900">
              <span className="text-[10px] font-bold text-slate-500 block uppercase">
                Tasa Promedio Efectiva
              </span>
              <span className="text-base font-bold text-amber-700 mt-0.5 block">
                {avgRate.toFixed(2)} Bs/$
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs text-slate-900">
            <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                Historial de Operaciones de Cambio
              </h3>
              <div className="flex items-center space-x-2">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-xs text-slate-500 font-semibold">Filtrar Mes:</span>
                <select
                  value={selectedMonthFilter}
                  onChange={(e) => setSelectedMonthFilter(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">Todos los Meses</option>
                  {uniqueMonths.map((ym) => (
                    <option key={ym} value={ym}>
                      {formatMonthLabel(ym)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2 text-right">Bs. Invertidos</th>
                    <th className="px-3 py-2 text-right font-bold text-emerald-700">$ Adquiridos</th>
                    <th className="px-3 py-2 text-right">Tasa Real</th>
                    <th className="px-3 py-2">Nota</th>
                    <th className="px-3 py-2 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-900">
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-6 text-center text-slate-400">
                        No hay transacciones de compra de dólares registradas para este período.
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 py-2 font-mono text-slate-500">{p.date}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                          {formatVES(p.bsAmount)}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-700">
                          {formatUSD(p.usdAmount)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-amber-800 font-bold">
                          {p.rate.toFixed(2)} Bs/$
                        </td>
                        <td className="px-3 py-2 text-slate-600">{p.notes}</td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => {
                              if (confirm('¿Eliminar esta compra de dólares?')) {
                                onDeletePurchase(p.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
