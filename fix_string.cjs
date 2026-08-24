const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf-8');

const regex = /\{p\.currency === 'VES' \? p\.amountOriginal \+ ' Bs' : p\.amountOriginal \+ ' \n/;
code = code.replace(regex, "{p.currency === 'VES' ? p.amountOriginal + ' Bs' : p.amountOriginal + ' $'})\n");

fs.writeFileSync('src/components/InvoiceModal.tsx', code);
