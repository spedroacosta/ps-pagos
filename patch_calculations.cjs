const fs = require('fs');
let code = fs.readFileSync('src/utils/calculations.ts', 'utf-8');

const regex = /        results\.push\(\{\n          targetType: tType,\n          targetId: id,\n          targetLabel,\n          amountOriginal: alloc,\n          amountUSD: isDirectUsd \? alloc : \(alloc \/ bcvRate\)\n        \}\);/g;

const replacement = `
        let requiredFee_direct = 12;
        let requiredFee_bcv = 16;
        if (tType === 'month') {
          const m = months.find((m) => m.id === id);
          if (m) {
            requiredFee_direct = m.feeUSD_direct || m.feeUSD || 12;
            requiredFee_bcv = m.feeUSD_bcv || m.feeUSD || 16;
          }
        } else if (tType === 'late_fee') {
          requiredFee_direct = 2; // Default fallback for waterfall
          requiredFee_bcv = 3;    // Default fallback for waterfall
        } else {
          const q = quotas.find((q) => q.id === id);
          if (q) {
            requiredFee_direct = q.feeUSD_direct || q.feeUSD || 0;
            requiredFee_bcv = q.feeUSD_bcv || q.feeUSD_direct || 0;
          }
        }

        let allocDirectUSD = 0;
        if (isDirectUsd) {
          allocDirectUSD = alloc;
        } else {
          if (requiredFee_bcv > 0 && bcvRate > 0) {
            allocDirectUSD = (alloc / bcvRate) * (requiredFee_direct / requiredFee_bcv);
          } else {
            allocDirectUSD = (alloc / bcvRate);
          }
        }

        results.push({
          targetType: tType,
          targetId: id,
          targetLabel,
          amountOriginal: alloc,
          amountUSD: allocDirectUSD
        });`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/utils/calculations.ts', code);
