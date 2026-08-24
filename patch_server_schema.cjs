const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const regex1 = /                  selectedConcepts: \{\n                    type: Type\.ARRAY,\n                    items: \{ type: Type\.STRING \}\n                  \},/g;
const replace1 = `                  selectedConcepts: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  conceptAllocationsUSD: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        conceptKey: { type: Type.STRING },
                        amountUSD: { type: Type.NUMBER }
                      }
                    }
                  },`;
code = code.replace(regex1, replace1);

const regex2 = /                selectedConcepts: \{\n                  type: Type\.ARRAY,\n                  items: \{ type: Type\.STRING \},\n                  description: 'Lista de conceptos seleccionados en formato "type:id" \\(ej: \\\["quota:sq-1", "month:2026-05", "month:2026-06"\\\]\\) en orden de prioridad o desglose indicado por el usuario'\n                \},/g;
const replace2 = `                selectedConcepts: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Lista de conceptos seleccionados en formato "type:id" (ej: ["quota:sq-1", "month:2026-05", "late_fee:2026-05"])'
                },
                conceptAllocationsUSD: {
                  type: Type.ARRAY,
                  description: 'Cantidades EXACTAS en DÓLARES asignadas a cada bolsillo (concepto) según la descripción del usuario. Solo incluir si el usuario define expresamente los montos. Ej: [{"conceptKey": "late_fee:2026-05", "amountUSD": 3}, {"conceptKey": "month:2026-05", "amountUSD": 14}]',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      conceptKey: { type: Type.STRING },
                      amountUSD: { type: Type.NUMBER }
                    }
                  }
                },`;
code = code.replace(regex2, replace2);

// Now update the system prompt in server.ts so it knows about late_fee:<month_id>
// Wait, the system prompt is generated dynamically for both telegram and whatsapp. Let's patch "late_fee:global".
code = code.replace(/late_fee:global/g, 'late_fee:<month_id>');
// And add explanation to prompt
const regexPrompt = /Meses disponibles:\\n\$\{monthsConfig/g;
const replacePrompt = `Meses disponibles:\\n\${monthsConfig`;
// I will just use sed or run a quick replace to add rules to the prompt:
code = code.replace(`Si el pago incluye múltiples conceptos de una vez, utiliza \`selectedConcepts\` con el formato ["type:id"].`, `Si el pago incluye múltiples conceptos (Ej: "Multa de Mayo 3$ + Mensualidad Mayo 14$"), utiliza \`selectedConcepts\` (ej: ["late_fee:2026-05", "month:2026-05"]) Y ADEMÁS llena \`conceptAllocationsUSD\` especificando los dólares asignados a cada uno.`);
code = code.replace(`Para multas por atraso, usa targetType="late_fee" y targetId="global".`, `Para multas por atraso, usa targetType="late_fee" y targetId="YYYY-MM" del mes al que pertenece la multa.`);

fs.writeFileSync('server.ts', code);
