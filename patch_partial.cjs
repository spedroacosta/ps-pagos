const fs = require('fs');
let code = fs.readFileSync('src/utils/calculations.ts', 'utf-8');

// Replace the current manual logic
const regex = /  if \(params.manualAllocationsOriginal && Object.keys\(params.manualAllocationsOriginal\).length > 0\) \{\n    const results: ConceptDistributionItem\[\] = \[\];\n    for \(const key of selectedConcepts\) \{\n      const alloc = params.manualAllocationsOriginal\[key\];\n      if \(alloc && alloc > 0\) \{[\s\S]*?    \}\n    return results;\n  \}/;

const replacement = `  // We will handle partial manual allocations within the waterfall.`;

code = code.replace(regex, replacement);

fs.writeFileSync('src/utils/calculations.ts', code);
