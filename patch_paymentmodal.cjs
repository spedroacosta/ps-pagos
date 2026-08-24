const fs = require('fs');
let code = fs.readFileSync('src/components/PaymentModal.tsx', 'utf-8');

code = code.replace(/    return distributePaymentAcrossConcepts\(\{\n      memberId,\n      selectedConcepts,\n      manualAllocationsOriginal: Object.fromEntries\(Object.entries\(conceptAmounts\).map\(\(\[k, v\]\) => \[k, parseFloat\(v\) \|\| 0\]\)\),\n      amountOriginal: numAmount,/g, 
`    const manualAllocationsOriginal = Object.fromEntries(Object.entries(conceptAmounts).map(([k, v]) => [k, parseFloat(v) || 0]));
    let finalAmount = numAmount;
    if (Object.keys(manualAllocationsOriginal).length > 0 && finalAmount === 0) {
      finalAmount = Object.values(manualAllocationsOriginal).reduce((a, b) => a + b, 0);
    }
    return distributePaymentAcrossConcepts({
      memberId,
      selectedConcepts,
      manualAllocationsOriginal,
      amountOriginal: finalAmount,`);

// Also inside the handleSave function
code = code.replace(/    let primary = distribution\[0\] \|\| \{/g,
`    let finalAmount = numAmount;
    const manualAllocationsOriginal = Object.fromEntries(Object.entries(conceptAmounts).map(([k, v]) => [k, parseFloat(v) || 0]));
    if (Object.keys(manualAllocationsOriginal).length > 0 && finalAmount === 0) {
      finalAmount = Object.values(manualAllocationsOriginal).reduce((a, b) => a + b, 0);
    }
    let primary = distribution[0] || {`);

code = code.replace(/      amountOriginal: numAmount,/g, '      amountOriginal: finalAmount,');

fs.writeFileSync('src/components/PaymentModal.tsx', code);
