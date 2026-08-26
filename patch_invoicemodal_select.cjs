const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf-8');

// 1. Change the default selectedTargetId to be the latest transaction
const defaultTargetTarget = `const [selectedTargetId, setSelectedTargetId] = useState<string>(months[5]?.id || months[0]?.id || '2026-06');`;
const defaultTargetReplacement = `const rawMemberPaymentsInit = payments.filter(p => p.memberId === member?.id);
  const latestTx = rawMemberPaymentsInit.length > 0 ? rawMemberPaymentsInit[rawMemberPaymentsInit.length - 1] : null;
  const [selectedTargetId, setSelectedTargetId] = useState<string>(initialTargetId || (latestTx ? 'tx-' + latestTx.id : (months[5]?.id || months[0]?.id || '2026-06')));`;
code = code.replace(defaultTargetTarget, defaultTargetReplacement);

// 2. Modify the options rendering so it ONLY shows transactions
const selectTarget = `<select
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-xs cursor-pointer print:hidden"
            value={selectedTargetId}
            onChange={(e) => setSelectedTargetId(e.target.value)}
          >
            <optgroup label="Meses Pagados">
              {months.map((m) => (
                <option key={m.id} value={m.id}>
                  Mensualidad de {m.name} {m.year} (\${m.feeUSD_direct || m.feeUSD})
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
const selectReplacement = `<select
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-xs cursor-pointer print:hidden"
            value={selectedTargetId}
            onChange={(e) => setSelectedTargetId(e.target.value)}
          >
            {memberPayments.length > 0 ? (
              <optgroup label="Transacciones Recientes">
                {memberPayments.map((p) => (
                  <option key={'tx-' + p.id} value={'tx-' + p.id}>
                    {p.paymentDate} - {p.reference} ({p.currency === 'VES' ? p.amountOriginal + ' Bs' : p.amountOriginal + ' $'})
                  </option>
                ))}
              </optgroup>
            ) : (
              <option disabled>No hay transacciones registradas</option>
            )}
          </select>`;
code = code.replace(selectTarget, selectReplacement);

// 3. Make sure the table shows everything paid in that transaction.
// When selectedTargetId starts with 'tx-', targetTitle is the multi-concept payment.
// Let's check how displayPayments is set for tx-.

fs.writeFileSync('src/components/InvoiceModal.tsx', code);
