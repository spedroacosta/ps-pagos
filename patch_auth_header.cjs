const fs = require('fs');
let content = fs.readFileSync('src/components/Configuracion.tsx', 'utf-8');

const anchor = `        headers: {
          'Content-Type': 'application/json',
          ...getTenantHeaders()
        },`;

const replacement = `        headers: {
          'Content-Type': 'application/json',
          ...getTenantHeaders(),
          ...(localStorage.getItem('driveToken') ? { 'Authorization': 'Bearer ' + localStorage.getItem('driveToken') } : {})
        },`;

content = content.replace(anchor, replacement);
fs.writeFileSync('src/components/Configuracion.tsx', content);
