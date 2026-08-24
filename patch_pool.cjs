const fs = require('fs');
let code = fs.readFileSync('src/utils/calculations.ts', 'utf-8');

const regex = /      \}\n            remainingPoolOriginal = Math.max\(0, remainingPoolOriginal - allocOriginal\);\n    \}/g;

const replacement = `      }
    }
    
    // Always subtract the allocated amount from the pool for the next iteration
    remainingPoolOriginal = Math.max(0, remainingPoolOriginal - allocOriginal);`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/utils/calculations.ts', code);
