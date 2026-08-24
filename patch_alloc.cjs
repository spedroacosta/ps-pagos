const fs = require('fs');
let code = fs.readFileSync('src/utils/calculations.ts', 'utf-8');

const regex = /    \/\/ Allocate from pool\n    let allocOriginal = 0;\n\n    if \(i === count - 1\) \{/g;

const replacement = `    // Allocate from pool
    let allocOriginal = 0;
    const manualAlloc = params.manualAllocationsOriginal ? params.manualAllocationsOriginal[key] : undefined;

    if (manualAlloc !== undefined && manualAlloc > 0) {
      allocOriginal = Math.min(remainingPoolOriginal, manualAlloc);
    } else if (i === count - 1) {`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/utils/calculations.ts', code);
