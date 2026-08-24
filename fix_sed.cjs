const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

content = content.replace(/\\n7\. RECONOCIMIENTO DE EGRESOS \/ GASTOS DE LA PROMOCIÓN:\\n- Si el texto describe un egreso, gasto o salida/g, '\\n- Si el texto describe un egreso, gasto o salida');

fs.writeFileSync('server.ts', content);
