const fs = require('fs');
let code = fs.readFileSync('src/components/PaymentModal.tsx', 'utf-8');

code = code.replace(/parseFloat\(v\)/g, 'parseFloat(String(v))');

fs.writeFileSync('src/components/PaymentModal.tsx', code);
