const fs = require('fs');
let code = fs.readFileSync('src/components/RegistroPagos.tsx', 'utf-8');

// replace amountOriginal: numAmount, with amountOriginal: finalAmount,
code = code.replace(/amountOriginal: numAmount,/g, 'amountOriginal: finalAmount,');

// replace amountOriginal: item.amountOriginal, with amountOriginal: item.amountOriginal, inside bulk fallback?
// No, just the manual entry one.
fs.writeFileSync('src/components/RegistroPagos.tsx', code);
