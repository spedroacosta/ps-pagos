const fs = require('fs');
let content = fs.readFileSync('src/components/PaymentModal.tsx', 'utf-8');

// 1. Add state hook
const stateHook = `  const [notes, setNotes] = useState('');`;
const newStateHook = `  const [notes, setNotes] = useState('');
  const [conceptAmounts, setConceptAmounts] = useState<Record<string, string>>({});`;
content = content.replace(stateHook, newStateHook);

// 2. Clear state on close/submit
const submitCall = `      selectedConcepts,`;
const newSubmitCall = `      selectedConcepts,
      manualAllocationsOriginal: Object.fromEntries(Object.entries(conceptAmounts).map(([k, v]) => [k, parseFloat(v) || 0])),`;
content = content.replace(submitCall, newSubmitCall);

const closeCall = `    setNotes('');`;
const newCloseCall = `    setNotes('');
    setConceptAmounts({});`;
content = content.replace(closeCall, newCloseCall);

// 3. Update the UI block for concepts
const regex = /<div className="bg-slate-50 border border-slate-300 rounded-xl p-3 space-y-2 max-h-48 overflow-y-auto">[\s\S]*?(?= *{\/\* Submit Button \*\/})/m;

const replacement = `<div className="bg-slate-50 border border-slate-300 rounded-xl p-3 space-y-2 max-h-48 overflow-y-auto">
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-extrabold text-indigo-700 block tracking-wider">Mensualidades</span>
                {months.map((m) => {
                  const key = \`month:\${m.id}\`;
                  const isChecked = selectedConcepts.includes(key);
                  return (
                    <div key={key} className={\`flex flex-col p-2 rounded-lg text-xs border transition-all \${isChecked ? 'bg-indigo-50 border-indigo-300 font-bold text-indigo-950' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}\`}>
                      <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleConcept(key)}>
                        <div className="flex items-center space-x-2">
                          {isChecked ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                          <span>{m.name} {m.year}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-normal">\${m.feeUSD_direct || 12} dir. / \${m.feeUSD_bcv || 16} BCV</span>
                      </div>
                      {isChecked && (
                        <div className="mt-2 pl-6 flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                          <label className="text-[10px] font-semibold text-slate-500">Abonar:</label>
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
                      const key = \`quota:\${q.id}\`;
                      const isChecked = selectedConcepts.includes(key);
                      return (
                        <div key={key} className={\`flex flex-col p-2 rounded-lg text-xs border transition-all \${isChecked ? 'bg-orange-50 border-orange-300 font-bold text-orange-950' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}\`}>
                          <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleConcept(key)}>
                            <div className="flex items-center space-x-2">
                              {isChecked ? <CheckSquare className="w-4 h-4 text-orange-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                              <span>Cuota: {q.title}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-normal">\${q.feeUSD_direct || q.feeUSD} dir.</span>
                          </div>
                          {isChecked && (
                            <div className="mt-2 pl-6 flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                              <label className="text-[10px] font-semibold text-slate-500">Abonar:</label>
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
                  const key = \`late_fee:\${m.id}\`;
                  const isChecked = selectedConcepts.includes(key);
                  return (
                    <div key={key} className={\`flex flex-col p-2 rounded-lg text-xs border transition-all \${isChecked ? 'bg-rose-50 border-rose-300 font-bold text-rose-950' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}\`}>
                      <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleConcept(key)}>
                        <div className="flex items-center space-x-2">
                          {isChecked ? <CheckSquare className="w-4 h-4 text-rose-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                          <span>Multa de {m.name} {m.year}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-normal">Fijado de forma individual</span>
                      </div>
                      {isChecked && (
                        <div className="mt-2 pl-6 flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                          <label className="text-[10px] font-semibold text-slate-500">Abonar:</label>
                          <input type="number" step="0.01" className="w-24 bg-white border border-rose-200 rounded px-2 py-1 text-xs text-rose-900 font-bold focus:outline-none" placeholder="Opcional" value={conceptAmounts[key] || ''} onChange={(e) => setConceptAmounts({...conceptAmounts, [key]: e.target.value})} />
                        </div>
                      )}
                    </div>
                  );
                })}

                {editingPayment && editingPayment.targetId === '' && (
                  <>
                    <span className="text-[9px] uppercase font-extrabold text-teal-700 block tracking-wider mt-2">Carga Masiva</span>
                    <div onClick={() => toggleConcept('month:')} className={\`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer border transition-all \${selectedConcepts.includes('month:') ? 'bg-teal-50 border-teal-300 font-bold text-teal-950' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}\`}>
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
                    <span className="font-bold text-indigo-900">{currency === 'VES' ? \`\${formatVES(d.amountOriginal)} (\${formatUSD(d.amountUSD)})\` : formatUSD(d.amountUSD)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1">Método de Pago</label>
              <select value={method} onChange={(e) => handleMethodChange(e.target.value as PaymentMethod)} className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer">
                <option value="pago_movil">Pago móvil</option>
                <option value="transferencia_ves">Transferencia</option>
                <option value="efectivo_usd">Efectivo $</option>
                <option value="binance">Binance</option>
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
`;

content = content.replace(regex, replacement);

fs.writeFileSync('src/components/PaymentModal.tsx', content);
