const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf-8');

const regex = /let targetTitle = 'Mensualidad';\s*const isTransactionMode = selectedTargetId\.startsWith\('tx-'\);\s*const selectedTx = isTransactionMode \? memberPayments\.find\(p => p\.id === selectedTargetId\.replace\('tx-', ''\)\) : null;\s*if \(isTransactionMode && selectedTx\) \{\s*targetTitle = selectedTx\.targetLabel \|\| 'Pago Multi-concepto';\s*\}/m;

const replacement = `let targetTitle = 'Mensualidad';
  const isTransactionMode = selectedTargetId.startsWith('tx-');
  const selectedTx = isTransactionMode ? memberPayments.find(p => p.id === selectedTargetId.replace('tx-', '')) : null;

  if (isTransactionMode && selectedTx) {
    targetTitle = selectedTx.targetLabel || 'Pago de Transacción';
    requiredFee = selectedTx.amountUSD;
  }`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/components/InvoiceModal.tsx', code);
