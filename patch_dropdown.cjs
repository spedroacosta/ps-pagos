const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf-8');

code = code.replace(
/            \{quotas\.length > 0 && \(\n              <optgroup label="Cuotas Especiales">\n                \{quotas\.map\(\(q\) => \(\n                  <option key=\{q\.id\} value=\{q\.id\}>\n                    \{q\.title\} \(\\\$\{q\.feeUSD\}\)\n                  <\/option>\n                \)\)\}\n              <\/optgroup>\n            \)\}/,
`            {quotas.length > 0 && (
              <optgroup label="Cuotas Especiales">
                {quotas.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title} (\${q.feeUSD})
                  </option>
                ))}
              </optgroup>
            )}
            {memberPayments.length > 0 && (
              <optgroup label="Transacciones">
                {memberPayments.map((p) => (
                  <option key={'tx-' + p.id} value={'tx-' + p.id}>
                    {p.paymentDate} - {p.reference} ({p.currency === 'VES' ? p.amountOriginal + ' Bs' : p.amountOriginal + ' $'})
                  </option>
                ))}
              </optgroup>
            )}`
);
fs.writeFileSync('src/components/InvoiceModal.tsx', code);
