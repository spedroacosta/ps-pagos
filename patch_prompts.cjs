const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const regex1 = /- Si el texto describe el pago de una multa o atraso \(ej: "multa", "atraso", "penalidad", "pago de multa mes de junio"\), asócialo al targetType "late_fee", targetId "global" y targetLabel "Multas por Atraso de Mensualidades"\.\\n/g;

const replace1 = `- Si el texto describe el pago de una multa o atraso (ej: "multa", "atraso", "penalidad", "pago de multa mes de junio"), asócialo al targetType "late_fee", targetId "YYYY-MM" del mes al que pertenece la multa.
- Si el pago incluye múltiples conceptos (Ej: "Multa de Mayo 3$ + Mensualidad Mayo 14$"), utiliza \`selectedConcepts\` (ej: ["late_fee:2026-05", "month:2026-05"]) Y ADEMÁS llena \`conceptAllocationsUSD\` especificando los dólares asignados a cada uno.\n`;

code = code.replace(regex1, replace1);

const regex2 = /- Si el texto describe el pago de una multa o atraso \(ej: "multa", "atraso", "penalidad", "pago de multa mes de junio"\), asócialo al targetType "late_fee", targetId "global" y targetLabel "Multas por Atraso de Mensualidades"\./g;

const replace2 = `- Si el texto describe el pago de una multa o atraso (ej: "multa", "atraso", "penalidad", "pago de multa mes de junio"), asócialo al targetType "late_fee", targetId "YYYY-MM" del mes al que pertenece la multa.
- Si el pago incluye múltiples conceptos (Ej: "Multa de Mayo 3$ + Mensualidad Mayo 14$"), utiliza \`selectedConcepts\` (ej: ["late_fee:2026-05", "month:2026-05"]) Y ADEMÁS llena \`conceptAllocationsUSD\` especificando los dólares asignados a cada uno.`;

code = code.replace(regex2, replace2);

fs.writeFileSync('server.ts', code);
