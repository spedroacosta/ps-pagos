const fs = require('fs');
let code = fs.readFileSync('src/utils/calculations.ts', 'utf-8');

const regex = /    \} else if \(tType === 'late_fee'\) {\n      targetLabel = 'Multas por Atraso';\n      requiredFee_direct = 0;\n      requiredFee_bcv = 0;/g;

const replace = `    } else if (tType === 'late_fee') {
      if (id === 'global') {
        targetLabel = 'Multas por Atraso';
      } else {
        const m = months.find((m) => m.id === id);
        targetLabel = m ? \`Multa de \${m.name} \${m.year}\` : \`Multa \${id}\`;
      }
      requiredFee_direct = 2; // Default fallback for waterfall
      requiredFee_bcv = 3;    // Default fallback for waterfall`;

code = code.replace(regex, replace);

fs.writeFileSync('src/utils/calculations.ts', code);
