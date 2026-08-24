const fs = require('fs');
let content = fs.readFileSync('src/components/RegistroPagos.tsx', 'utf-8');

// We will add state for manual allocations
const stateHook = `  const [mNotes, setMNotes] = useState('');`;
const newStateHook = `  const [mNotes, setMNotes] = useState('');
  const [mConceptAmounts, setMConceptAmounts] = useState<Record<string, string>>({});`;
content = content.replace(stateHook, newStateHook);

// Also we need to clear it on submit
const clearHook = `    setMSelectedConcepts([]);`;
const newClearHook = `    setMSelectedConcepts([]);
    setMConceptAmounts({});`;
content = content.replace(clearHook, newClearHook);

// In distributePaymentAcrossConcepts we pass it
const distCall = `    const distribution = distributePaymentAcrossConcepts({
      memberId: mMemberId,
      selectedConcepts: mSelectedConcepts,
      amountOriginal: numAmount,
      currency: mCurrency,
      method: mMethod,
      bcvRate: mBcvRate,
      months,
      quotas,
    });`;
const newDistCall = `    const manualAllocationsOriginal: Record<string, number> = {};
    for (const key of mSelectedConcepts) {
       if (mConceptAmounts[key]) {
         manualAllocationsOriginal[key] = parseFloat(mConceptAmounts[key]) || 0;
       }
    }
    
    // If they provided manual amounts, auto-calculate numAmount if it's empty or 0
    let finalAmount = numAmount;
    if (Object.keys(manualAllocationsOriginal).length > 0 && finalAmount === 0) {
       finalAmount = Object.values(manualAllocationsOriginal).reduce((a, b) => a + b, 0);
    }

    const distribution = distributePaymentAcrossConcepts({
      memberId: mMemberId,
      selectedConcepts: mSelectedConcepts,
      amountOriginal: finalAmount,
      currency: mCurrency,
      method: mMethod,
      bcvRate: mBcvRate,
      months,
      quotas,
      manualAllocationsOriginal
    });`;
content = content.replace(distCall, newDistCall);

fs.writeFileSync('src/components/RegistroPagos.tsx', content);
