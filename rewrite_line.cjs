const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf-8');

const regex = /\{p\.currency === 'VES' \? p\.amountOriginal \+ ' Bs' : p\.amountOriginal \+ ' \}\)Bs' : p\.amountOriginal \+ ' /;
code = code.replace(regex, "{p.currency === 'VES' ? p.amountOriginal + ' Bs' : p.amountOriginal + ' $'}");

fs.writeFileSync('src/components/InvoiceModal.tsx', code);
