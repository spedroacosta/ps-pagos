const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf-8');

const faultyStringRegex = /\{p\.currency === 'VES' \? p\.amountOriginal \+ ' Bs' : p\.amountOriginal \+ ' [\s\S]*?<\/div>\n\n            \{\/\* Right: Logos \*\/\}/;

code = code.replace(faultyStringRegex, `{p.currency === 'VES' ? p.amountOriginal + ' Bs' : p.amountOriginal + ' $'})
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
        {/* Email status feedback message */}
        {emailStatus && (
          <div className="mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium flex items-center justify-between print:hidden shadow-xs">
            <span>{emailStatus}</span>
            <button onClick={() => setEmailStatus(null)} className="text-emerald-700 font-bold cursor-pointer">✕</button>
          </div>
        )}
        {/* Printable Receipt Canvas */}
        <div id="printable-invoice" className="p-10 bg-white text-slate-900 font-sans max-w-[800px] mx-auto select-none border border-slate-100 space-y-6">
          {/* Header Row */}
          <div className="flex justify-between items-start">
            {/* Left: Receipt Title & Promotion Name */}
            <div className="space-y-4">
              <h1 className="text-3xl font-black tracking-tight uppercase text-slate-950 font-sans">
                Recibo de Pago
              </h1>
              <div className="space-y-0.5">
                <h2 className="text-xl font-black text-slate-900 tracking-wide uppercase">
                  {sessionStorage.getItem('tenantName') || "PROMOCIÓN 106"}
                </h2>
                <p className="text-xs font-bold text-slate-500 tracking-widest uppercase">
                  MÉDICOS CIRUJANOS
                </p>
              </div>
            </div>

            {/* Right: Logos */}`);

fs.writeFileSync('src/components/InvoiceModal.tsx', code);
