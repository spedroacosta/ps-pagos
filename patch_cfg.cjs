const fs = require('fs');
let code = fs.readFileSync('src/components/Configuracion.tsx', 'utf-8');
code = 'declare const google: any;\n' + code;
fs.writeFileSync('src/components/Configuracion.tsx', code);
