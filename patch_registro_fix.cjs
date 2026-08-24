const fs = require('fs');
let code = fs.readFileSync('src/components/RegistroPagos.tsx', 'utf-8');

code = code.replace(
/    if \(numAmount <= 0\) \{\n      alert\('Por favor ingresa un monto válido.'\);\n      return;\n    \}\n    if \(mSelectedConcepts.length === 0\) \{\n      alert\('Por favor selecciona al menos un concepto \\(mes o cuota\\).'\);\n      return;\n    \}\n\n    const selectedMember = members.find\(\(m\) => m.id === mMemberId\);\n    const memberName = selectedMember \? `\$\{selectedMember.lastName\}, \$\{selectedMember.firstName\}` : '';\n\n    const manualAllocationsOriginal: Record<string, number> = \{\};\n    for \(const key of mSelectedConcepts\) \{\n       if \(mConceptAmounts\[key\]\) \{\n         manualAllocationsOriginal\[key\] = parseFloat\(mConceptAmounts\[key\]\) \|\| 0;\n       \}\n    \}\n    \n    \/\/ If they provided manual amounts, auto-calculate numAmount if it's empty or 0\n    let finalAmount = numAmount;\n    if \(Object.keys\(manualAllocationsOriginal\).length > 0 && finalAmount === 0\) \{\n       finalAmount = Object.values\(manualAllocationsOriginal\).reduce\(\(a, b\) => a \+ b, 0\);\n    \}/g,
`    const manualAllocationsOriginal: Record<string, number> = {};
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

    if (finalAmount <= 0) {
      alert('Por favor ingresa un monto válido o desglosa los montos a abonar.');
      return;
    }
    if (mSelectedConcepts.length === 0) {
      alert('Por favor selecciona al menos un concepto (mes o cuota).');
      return;
    }

    const selectedMember = members.find((m) => m.id === mMemberId);
    const memberName = selectedMember ? \`\${selectedMember.lastName}, \${selectedMember.firstName}\` : '';`
);

fs.writeFileSync('src/components/RegistroPagos.tsx', code);
