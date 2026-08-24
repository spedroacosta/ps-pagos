const fs = require('fs');
let content = fs.readFileSync('src/components/RegistroPagos.tsx', 'utf-8');

const regex = /<div className="bg-slate-50 border border-slate-200 rounded-xl p-3\.5 space-y-1\.5 max-h-48 overflow-y-auto">[\s\S]*?(?= *{\/\* Amount, currency, method, rate \*\/})/m;

const replacement = `<div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 max-h-48 overflow-y-auto">
                  <span className="text-[9px] uppercase font-extrabold text-indigo-800 block tracking-wider">Mensualidades</span>
                  {months.map((m) => {
                    const key = \`month:\${m.id}\`;
                    const isChecked = mSelectedConcepts.includes(key);
                    return (
                      <div key={key} className={\`flex flex-col p-2 rounded-lg text-xs border transition-all \${isChecked ? 'bg-indigo-50 border-indigo-200 font-bold text-indigo-950' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}\`}>
                        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleManualConcept(key)}>
                          <div className="flex items-center space-x-2">
                            {isChecked ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                            <span>{m.name} {m.year}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-normal">
                            \${m.feeUSD_direct} dir. / \${m.feeUSD_bcv} BCV
                          </span>
                        </div>
                        {isChecked && (
                          <div className="mt-2 pl-6 flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                            <label className="text-[10px] font-semibold text-slate-500">Abonar:</label>
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
                        const key = \`quota:\${q.id}\`;
                        const isChecked = mSelectedConcepts.includes(key);
                        return (
                          <div key={key} className={\`flex flex-col p-2 rounded-lg text-xs border transition-all \${isChecked ? 'bg-orange-50 border-orange-200 font-bold text-orange-950' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}\`}>
                            <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleManualConcept(key)}>
                              <div className="flex items-center space-x-2">
                                {isChecked ? <CheckSquare className="w-4 h-4 text-orange-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                                <span>{q.title}</span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-normal">
                                \${q.feeUSD_direct || q.feeUSD} USD / \${q.feeUSD_bcv || q.feeUSD} BCV
                              </span>
                            </div>
                            {isChecked && (
                              <div className="mt-2 pl-6 flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                                <label className="text-[10px] font-semibold text-slate-500">Abonar:</label>
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
                    const key = \`late_fee:\${m.id}\`;
                    const isChecked = mSelectedConcepts.includes(key);
                    return (
                      <div key={key} className={\`flex flex-col p-2 rounded-lg text-xs border transition-all \${isChecked ? 'bg-rose-50 border-rose-200 font-bold text-rose-950' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}\`}>
                        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleManualConcept(key)}>
                          <div className="flex items-center space-x-2">
                            {isChecked ? <CheckSquare className="w-4 h-4 text-rose-600" /> : <Square className="w-4 h-4 text-slate-400" />}
                            <span>Multa de {m.name} {m.year}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-normal">Fijado individualmente</span>
                        </div>
                        {isChecked && (
                          <div className="mt-2 pl-6 flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                            <label className="text-[10px] font-semibold text-slate-500">Abonar:</label>
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
              
`;

content = content.replace(regex, replacement);
fs.writeFileSync('src/components/RegistroPagos.tsx', content);
