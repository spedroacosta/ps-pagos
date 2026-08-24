const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const targetStr = `                selectedConcepts: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Lista de conceptos seleccionados en formato "type:id" (ej: ["quota:sq-1", "month:2026-05", "month:2026-06"]) en orden de prioridad o desglose indicado por el usuario'
                },`;

const replacement = `                selectedConcepts: {
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

if (code.includes(targetStr)) {
  code = code.replace(targetStr, replacement);
  fs.writeFileSync('server.ts', code);
  console.log('Patched frontend schema successfully');
} else {
  console.log('Could not find target string in server.ts');
}
