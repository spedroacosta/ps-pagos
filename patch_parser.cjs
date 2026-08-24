const fs = require('fs');
let code = fs.readFileSync('src/components/WhatsAppParser.tsx', 'utf-8');

// Patch handleConfirmBatch
const regexBatch = /      const distribution = distributePaymentAcrossConcepts\(\{\n        memberId: item\.matchedMemberId!,\n        selectedConcepts: concepts,\n        amountOriginal: item\.amountOriginal,\n        currency: item\.currency,\n        method: item\.method,\n        bcvRate: item\.bcvRate \|\| currentBcvRate,\n        months,\n        quotas,\n        existingPayments: payments,\n      \}\);/g;

const replaceBatch = `      let manualAllocationsOriginal: Record<string, number> | undefined = item.manualAllocationsOriginal;
      if (!manualAllocationsOriginal && item.conceptAllocationsUSD && item.conceptAllocationsUSD.length > 0) {
        manualAllocationsOriginal = {};
        item.conceptAllocationsUSD.forEach(alloc => {
           if (item.currency === 'VES') {
              manualAllocationsOriginal![alloc.conceptKey] = alloc.amountUSD * (item.bcvRate || currentBcvRate);
           } else {
              manualAllocationsOriginal![alloc.conceptKey] = alloc.amountUSD;
           }
        });
      }

      const distribution = distributePaymentAcrossConcepts({
        memberId: item.matchedMemberId!,
        selectedConcepts: concepts,
        amountOriginal: item.amountOriginal,
        currency: item.currency,
        method: item.method,
        bcvRate: item.bcvRate || currentBcvRate,
        months,
        quotas,
        existingPayments: payments,
        manualAllocationsOriginal,
      });`;

code = code.replace(regexBatch, replaceBatch);

// Patch preview rendering
const regexPreview = /              const itemDistribution = distributePaymentAcrossConcepts\(\{\n                memberId: item\.matchedMemberId \|\| '',\n                selectedConcepts,\n                amountOriginal: item\.amountOriginal,\n                currency: item\.currency,\n                method: item\.method,\n                bcvRate: item\.bcvRate \|\| currentBcvRate,\n                months,\n                quotas,\n                existingPayments: payments,\n              \}\);/g;

const replacePreview = `              let manualAllocationsOriginal: Record<string, number> | undefined = item.manualAllocationsOriginal;
              if (!manualAllocationsOriginal && item.conceptAllocationsUSD && item.conceptAllocationsUSD.length > 0) {
                manualAllocationsOriginal = {};
                item.conceptAllocationsUSD.forEach(alloc => {
                   if (item.currency === 'VES') {
                      manualAllocationsOriginal![alloc.conceptKey] = alloc.amountUSD * (item.bcvRate || currentBcvRate);
                   } else {
                      manualAllocationsOriginal![alloc.conceptKey] = alloc.amountUSD;
                   }
                });
              }

              const itemDistribution = distributePaymentAcrossConcepts({
                memberId: item.matchedMemberId || '',
                selectedConcepts,
                amountOriginal: item.amountOriginal,
                currency: item.currency,
                method: item.method,
                bcvRate: item.bcvRate || currentBcvRate,
                months,
                quotas,
                existingPayments: payments,
                manualAllocationsOriginal,
              });`;

code = code.replace(regexPreview, replacePreview);
fs.writeFileSync('src/components/WhatsAppParser.tsx', code);
