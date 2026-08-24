const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf-8');

const faultyStr = `{p.currency === 'VES' ? p.amountOriginal + ' Bs' : p.amountOriginal + ' `;

if (code.includes(faultyStr)) {
  const newStr = `{p.currency === 'VES' ? p.amountOriginal + ' Bs' : p.amountOriginal + ' $'})
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>`;
  
  // Replace the faulty portion up to the </div>
  const searchRegex = /\{p\.currency === 'VES' \? p\.amountOriginal \+ ' Bs' : p\.amountOriginal \+ ' [\s\S]*?<\/div>/;
  code = code.replace(searchRegex, newStr);
  fs.writeFileSync('src/components/InvoiceModal.tsx', code);
}
