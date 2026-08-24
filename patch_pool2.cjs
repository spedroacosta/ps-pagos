const fs = require('fs');
const lines = fs.readFileSync('src/utils/calculations.ts', 'utf-8').split('\n');

const out = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('remainingPoolOriginal = Math.max(0, remainingPoolOriginal - allocOriginal);')) {
     continue; // We will insert it at a specific place instead
  }
  out.push(lines[i]);
  if (lines[i].includes('// Convert allocated original currency back to direct USD equivalent')) {
     out.splice(out.length - 1, 0, '    remainingPoolOriginal = Math.max(0, remainingPoolOriginal - allocOriginal);');
  }
}
fs.writeFileSync('src/utils/calculations.ts', out.join('\n'));
