const fs = require('fs');
let code = fs.readFileSync('src/components/ResumenSolvencia.tsx', 'utf-8');

const regex = /return hasPartialMonth \|\| hasPartialQuota;\s*\}\s*return true;/m;
code = code.replace(regex, "return hasPartialMonth || hasPartialQuota;\n      }\n      if (statusFilter === 'fined') return (s.lateFeesSummary?.owedLateFeesUSD || 0) > 0.01;\n      return true;");

fs.writeFileSync('src/components/ResumenSolvencia.tsx', code);
