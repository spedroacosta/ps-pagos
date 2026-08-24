const fs = require('fs');
let code = fs.readFileSync('src/components/PaymentModal.tsx', 'utf-8');

// We will apply some regex to see what we can do.
console.log(code.substring(0, 100));
