const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf-8');

const regex = /\{p\.currency === 'VES' \? p\.amountOriginal \+ ' Bs' : p\.amountOriginal \+ '         \)\}/;

const replacement = `{p.currency === 'VES' ? p.amountOriginal + ' Bs' : p.amountOriginal + ' $'})
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
        )}`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/components/InvoiceModal.tsx', code);
