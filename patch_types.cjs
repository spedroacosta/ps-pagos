const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf-8');

const regex = /  selectedConcepts\?: string\[\];\n}/;
const replacement = `  selectedConcepts?: string[];
  manualAllocationsOriginal?: Record<string, number>;
}`;
code = code.replace(regex, replacement);
fs.writeFileSync('src/types.ts', code);
