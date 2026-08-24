const fs = require('fs');
let content = fs.readFileSync('src/components/RegistroPagos.tsx', 'utf-8');

const anchor = `                    </>
                  )}
                </div>
              </div>`;

const replacement = `                    </>
                  )}
                  
                  <span className="text-[9px] uppercase font-extrabold text-rose-800 block tracking-wider mt-2.5">Cargos por Atraso</span>
                  <div
                    onClick={() => toggleManualConcept('late_fee:global')}
                    className={\`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer border transition-all \${
                      mSelectedConcepts.includes('late_fee:global')
                        ? 'bg-rose-50 border-rose-200 font-bold text-rose-950'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }\`}
                  >
                    <div className="flex items-center space-x-2">
                      {mSelectedConcepts.includes('late_fee:global') ? (
                        <CheckSquare className="w-4 h-4 text-rose-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                      <span>Multas por Atraso de Mensualidades</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-normal">
                      Fijado individualmente
                    </span>
                  </div>

                </div>
              </div>`;

content = content.replace(anchor, replacement);
fs.writeFileSync('src/components/RegistroPagos.tsx', content);
