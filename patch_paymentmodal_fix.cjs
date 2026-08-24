const fs = require('fs');
let code = fs.readFileSync('src/components/PaymentModal.tsx', 'utf-8');

code = code.replace(
/  const handleSubmit = \(e: React.FormEvent\) => \{\n    e.preventDefault\(\);\n    if \(!memberId\) \{\n      alert\('Por favor selecciona un integrante'\);\n      return;\n    \}\n    if \(numAmount <= 0\) \{\n      alert\('Por favor ingresa un monto válido'\);\n      return;\n    \}\n    if \(selectedConcepts.length === 0\) \{\n      alert\('Por favor selecciona al menos un concepto \\(mes o cuota especial\\)'\);\n      return;\n    \}/g,
`  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) {
      alert('Por favor selecciona un integrante');
      return;
    }
    
    let finalAmount = numAmount;
    const manualAllocationsOriginal = Object.fromEntries(Object.entries(conceptAmounts).map(([k, v]) => [k, parseFloat(v) || 0]));
    if (Object.keys(manualAllocationsOriginal).length > 0 && finalAmount === 0) {
      finalAmount = Object.values(manualAllocationsOriginal).reduce((a, b) => a + b, 0);
    }

    if (finalAmount <= 0) {
      alert('Por favor ingresa un monto válido o desglosa los montos a abonar');
      return;
    }
    if (selectedConcepts.length === 0) {
      alert('Por favor selecciona al menos un concepto (mes o cuota especial)');
      return;
    }`
);

fs.writeFileSync('src/components/PaymentModal.tsx', code);
