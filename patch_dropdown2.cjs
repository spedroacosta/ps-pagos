const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf-8');

const regex = /<select\n            value=\{selectedTargetId\}\n            onChange=\{\(e\) => setSelectedTargetId\(e.target.value\)\}\n            className="w-full sm:w-64 bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-1\.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"\n          >[\s\S]*?<\/select>/;

const newSelect = `<select
            value={selectedTargetId}
            onChange={(e) => setSelectedTargetId(e.target.value)}
            className="w-full sm:w-64 bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
          >
            <optgroup label="Mensualidades">
              {months.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.year} (\${m.feeUSD_direct || m.feeUSD || 12} directos / \${m.feeUSD_bcv || 16} BCV)
                </option>
              ))}
            </optgroup>
            {quotas.length > 0 && (
              <optgroup label="Cuotas Especiales">
                {quotas.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title} (\${q.feeUSD})
                  </option>
                ))}
              </optgroup>
            )}
            {memberPayments.length > 0 && (
              <optgroup label="Transacciones Recientes">
                {memberPayments.map((p) => (
                  <option key={'tx-' + p.id} value={'tx-' + p.id}>
                    {p.paymentDate} - {p.reference} ({p.currency === 'VES' ? p.amountOriginal + ' Bs' : p.amountOriginal + ' $'})
                  </option>
                ))}
              </optgroup>
            )}
          </select>`;

code = code.replace(regex, newSelect);
fs.writeFileSync('src/components/InvoiceModal.tsx', code);
