const fs = require('fs');
let code = fs.readFileSync('src/components/ResumenSolvencia.tsx', 'utf-8');

const prefix = `      if (statusFilter === 'partial') {
        const hasPartialMonth = visibleMonths.some((m) => s.monthsStatus[m.id]?.status === 'parcial');
        const hasPartialQuota = visibleQuotas.some((q) => s.quotasStatus[q.id]?.status === 'parcial');
        return hasPartialMonth || hasPartialQuota;
      }
      if (statusFilter === 'fined') return (s.lateFeesSummary?.owedLateFeesUSD || 0) > 0.01;`;

code = code.replace(prefix, '');
fs.writeFileSync('src/components/ResumenSolvencia.tsx', code);
