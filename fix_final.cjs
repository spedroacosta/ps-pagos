const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf-8');

// I will look for `<optgroup label="Cuotas Especiales">` to `</select></div>` and replace it properly.
const regex = /<optgroup label="Cuotas Especiales">[\s\S]*?<\/div>/;

const replacement = `<optgroup label="Cuotas Especiales">
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
          </select>
        </div>`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/components/InvoiceModal.tsx', code);
