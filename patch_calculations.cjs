const fs = require('fs');
let code = fs.readFileSync('src/utils/calculations.ts', 'utf-8');

const distSignature = `export function distributePaymentAcrossConcepts(params: {
  memberId: string;
  selectedConcepts: string[];
  amountOriginal: number;
  currency: 'USD' | 'VES';
  method: string;
  bcvRate: number;
  months: MonthConfig[];
  quotas: SpecialQuota[];
  existingPayments?: PaymentEntry[];
}): ConceptDistributionItem[] {`;

const distReplacement = `export function distributePaymentAcrossConcepts(params: {
  memberId: string;
  selectedConcepts: string[];
  amountOriginal: number;
  currency: 'USD' | 'VES';
  method: string;
  bcvRate: number;
  months: MonthConfig[];
  quotas: SpecialQuota[];
  existingPayments?: PaymentEntry[];
  manualAllocationsOriginal?: Record<string, number>;
}): ConceptDistributionItem[] {`;

code = code.replace(distSignature, distReplacement);

const waterfallStart = `  const isDirectUsd = currency === 'USD' || ['efectivo_usd', 'binance', 'zelle', 'banesco_panama'].includes(method);
  
  // Total original currency pool to distribute (either USD or VES)`;

const waterfallReplacement = `  const isDirectUsd = currency === 'USD' || ['efectivo_usd', 'binance', 'zelle', 'banesco_panama'].includes(method);
  
  if (params.manualAllocationsOriginal && Object.keys(params.manualAllocationsOriginal).length > 0) {
    const results: ConceptDistributionItem[] = [];
    for (const key of selectedConcepts) {
      const alloc = params.manualAllocationsOriginal[key];
      if (alloc && alloc > 0) {
        const [type, id] = key.split(':');
        const tType = type as 'month' | 'quota' | 'late_fee';
        let targetLabel = id;
        if (tType === 'month') {
          const m = months.find((m) => m.id === id);
          if (m) targetLabel = \`\${m.name} \${m.year}\`;
        } else if (tType === 'quota') {
          const q = quotas.find((q) => q.id === id);
          if (q) targetLabel = q.title;
        } else if (tType === 'late_fee') {
          if (id === 'global') {
            targetLabel = 'Multas por Atraso';
          } else {
            const m = months.find((m) => m.id === id);
            targetLabel = m ? \`Multa de \${m.name} \${m.year}\` : \`Multa \${id}\`;
          }
        }
        
        results.push({
          targetType: tType,
          targetId: id,
          targetLabel,
          amountOriginal: alloc,
          amountUSD: isDirectUsd ? alloc : (alloc / bcvRate)
        });
      }
    }
    return results;
  }
  
  // Total original currency pool to distribute (either USD or VES)`;

code = code.replace(waterfallStart, waterfallReplacement);

fs.writeFileSync('src/utils/calculations.ts', code);
