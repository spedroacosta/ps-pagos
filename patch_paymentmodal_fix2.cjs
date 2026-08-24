const fs = require('fs');
let code = fs.readFileSync('src/components/PaymentModal.tsx', 'utf-8');

code = code.replace(
/    if \(numAmount <= 0\) \{\n      alert\('Por favor ingresa un monto válido'\);\n      return;\n    \}/g,
`    let finalAmount = numAmount;
    const manualAllocationsOriginal = Object.fromEntries(Object.entries(conceptAmounts).map(([k, v]) => [k, parseFloat(v) || 0]));
    if (Object.keys(manualAllocationsOriginal).length > 0 && finalAmount === 0) {
      finalAmount = Object.values(manualAllocationsOriginal).reduce((a, b) => a + b, 0);
    }

    if (finalAmount <= 0) {
      alert('Por favor ingresa un monto válido o desglosa los montos a abonar');
      return;
    }`
);

fs.writeFileSync('src/components/PaymentModal.tsx', code);
