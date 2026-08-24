const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf-8');

const replacement = `
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

const searchRegex = /\{memberPayments\.length > 0 && \([\s\S]*?<\/div>/;
code = code.replace(searchRegex, replacement.trim());
fs.writeFileSync('src/components/InvoiceModal.tsx', code);
