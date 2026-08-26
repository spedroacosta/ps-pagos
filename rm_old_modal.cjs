const fs = require('fs');
let code = fs.readFileSync('src/components/PublicQueryPortal.tsx', 'utf-8');

const regex = /\{selectedReceiptTargetId && queryResult && solvencySummary && \([\s\S]*?\{\/\* Modal Actions \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*\)\}/;

code = code.replace(regex, "");
fs.writeFileSync('src/components/PublicQueryPortal.tsx', code);
