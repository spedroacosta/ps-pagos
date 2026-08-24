const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf-8');

// Modify the initial target state logic if needed, but the main change is in the UI
code = code.replace(
/            \{quotas.length > 0 && \(\n              <optgroup label="Cuotas Especiales">\n                \{quotas.map\(\(q\) => \(\n                  <option key=\{q.id\} value=\{q.id\}>\n                    \{q.title\} \(\\\$\{q.feeUSD\}\)\n                  <\/option>\n                \)\)\}\n              <\/optgroup>\n            \)\}/,
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

// Define memberPayments first before using it
code = code.replace(
/  const memberPayments = payments.filter\(\(p\) => p.memberId === member.id\);/,
`  const memberPayments = payments.filter((p) => p.memberId === member.id).sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());`
);

// We need to modify how the PDF table handles 'tx-' mode
code = code.replace(
/  let targetTitle = 'Mensualidad';\n\n  if \(selectedMonth\) \{/g,
`  let targetTitle = 'Mensualidad';
  const isTransactionMode = selectedTargetId.startsWith('tx-');
  const selectedTx = isTransactionMode ? memberPayments.find(p => p.id === selectedTargetId.replace('tx-', '')) : null;

  if (isTransactionMode && selectedTx) {
    targetTitle = selectedTx.targetLabel || 'Pago Multi-concepto';
  } else if (selectedMonth) {`
);

code = code.replace(
/  \/\/ Determine actual paid and debt from pre-calculated solvency summary to account for bulk\/initial imports\n  const totalPaidForTarget = computedStatus \? computedStatus.paidUSD : targetPayments.reduce\(\(sum, p\) => sum \+ p.amountUSD, 0\);/g,
`  // Determine actual paid and debt from pre-calculated solvency summary to account for bulk/initial imports
  const totalPaidForTarget = isTransactionMode && selectedTx 
    ? selectedTx.amountUSD 
    : computedStatus ? computedStatus.paidUSD : targetPayments.reduce((sum, p) => sum + p.amountUSD, 0);`
);

code = code.replace(
/  const displayPayments = \[\.\.\.targetPayments\];\n  if \(hasBulkContribution\) \{\n    memberBulkPayments.forEach\(\(bp\) => \{\n      if \(\!displayPayments.some\(\(dp\) => dp.id === bp.id\)\) \{\n        displayPayments.push\(bp\);\n      \}\n    \}\);\n  \}/g,
`  const displayPayments = isTransactionMode && selectedTx 
    ? (selectedTx.breakdown ? selectedTx.breakdown.map((b, i) => ({
        id: selectedTx.id + '-' + i,
        reference: selectedTx.reference,
        paymentDate: selectedTx.paymentDate,
        amountUSD: b.amountUSD,
        amountOriginal: b.amountOriginal,
        currency: selectedTx.currency,
        method: selectedTx.method,
        notes: b.targetLabel,
      } as PaymentEntry)) : [selectedTx])
    : [...targetPayments];

  if (hasBulkContribution && !isTransactionMode) {
    memberBulkPayments.forEach((bp) => {
      if (!displayPayments.some((dp) => dp.id === bp.id)) {
        displayPayments.push(bp);
      }
    });
  }`
);

// Update table to show breakdown properly for transactions
code = code.replace(
/                              <span className="font-bold text-slate-800">\n                                \{p.reference === 'INICIAL' \|\| p.id.startsWith\('init-p-'\) \|\| \(p.notes && p.notes.toLowerCase\(\).includes\('masiva'\)\)\n                                  \? 'Abono de Solvencia Inicial'\n                                  : \`Pago \(\$\{getMethodLabel\(p.method\)\}\)\`\}\n                              <\/span>\n                              <span className="text-slate-400 ml-1.5">\| Ref: \{p.reference\} \| \{p.paymentDate\}<\/span>/,
`                              <span className="font-bold text-slate-800">
                                {isTransactionMode 
                                  ? p.notes || \`Abono (\${getMethodLabel(p.method)})\`
                                  : p.reference === 'INICIAL' || p.id.startsWith('init-p-') || (p.notes && p.notes.toLowerCase().includes('masiva'))
                                  ? 'Abono de Solvencia Inicial'
                                  : \`Pago (\${getMethodLabel(p.method)})\`}
                              </span>
                              <span className="text-slate-400 ml-1.5">| Ref: {p.reference} | {p.paymentDate}</span>`
);

fs.writeFileSync('src/components/InvoiceModal.tsx', code);
