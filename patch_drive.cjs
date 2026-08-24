const fs = require('fs');
let code = fs.readFileSync('src/components/Configuracion.tsx', 'utf-8');

code = code.replace(
/      const response = await fetch\('\/api\/backup\/drive', \{\n        method: 'POST',\n        headers: \{\n          'Content-Type': 'application\/json',\n          \.\.\.getTenantHeaders\(\)\n        \},/,
`      const driveToken = localStorage.getItem('driveToken');
      const response = await fetch('/api/backup/drive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': driveToken ? \`Bearer \${driveToken}\` : '',
          ...getTenantHeaders()
        },`
);

fs.writeFileSync('src/components/Configuracion.tsx', code);
