const fs = require('fs');
let content = fs.readFileSync('src/components/RegistroPagos.tsx', 'utf-8');

content = content.replace(/\$\{q\.amountUSD\} USD/, '\\${q.feeUSD_direct || q.feeUSD} dir. / \\${q.feeUSD_bcv || q.feeUSD} BCV');

fs.writeFileSync('src/components/RegistroPagos.tsx', content);
