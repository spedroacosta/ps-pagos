const fs = require('fs');
let code = fs.readFileSync('src/components/ResumenSolvencia.tsx', 'utf-8');

code = code.replace(/useState<'all' \| 'solvent' \| 'debt' \| 'partial'>\('all'\)/, "useState<'all' | 'solvent' | 'debt' | 'partial' | 'fined'>('all')");

code = code.replace(
/      if \(statusFilter === 'partial'\) \{\n        const hasPartialMonth = visibleMonths.some\(\(m\) => s.monthsStatus\[m.id\]\?\.status === 'parcial'\);\n        const hasPartialQuota = visibleQuotas.some\(\(q\) => s.quotasStatus\[q.id\]\?\.status === 'parcial'\);\n        return hasPartialMonth || hasPartialQuota;\n      \}/,
`      if (statusFilter === 'partial') {
        const hasPartialMonth = visibleMonths.some((m) => s.monthsStatus[m.id]?.status === 'parcial');
        const hasPartialQuota = visibleQuotas.some((q) => s.quotasStatus[q.id]?.status === 'parcial');
        return hasPartialMonth || hasPartialQuota;
      }
      if (statusFilter === 'fined') return (s.lateFeesSummary?.owedLateFeesUSD || 0) > 0.01;`
);

code = code.replace(
/          <button\n            onClick=\{\(\) => setStatusFilter\('debt'\)\}\n            className=\{\`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer \$\{\n              statusFilter === 'debt'\n                \? 'bg-red-600 text-white font-semibold shadow-2xs'\n                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'\n            \}\`\}\n          >\n            Morosos \(\{totalMembers - solventMembers\}\)\n          <\/button>/,
`          <button
            onClick={() => setStatusFilter('debt')}
            className={\`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer \${
              statusFilter === 'debt'
                ? 'bg-red-600 text-white font-semibold shadow-2xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }\`}
          >
            Morosos ({totalMembers - solventMembers})
          </button>
          <button
            onClick={() => setStatusFilter('fined')}
            className={\`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer \${
              statusFilter === 'fined'
                ? 'bg-fuchsia-700 text-white font-semibold shadow-2xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }\`}
          >
            Multados
          </button>`
);

fs.writeFileSync('src/components/ResumenSolvencia.tsx', code);
