const fs = require('fs');
let content = fs.readFileSync('src/components/BuscadorIntegrante.tsx', 'utf8');

content = content.replace(
  /m\.lastName\.toLowerCase\(\)/g,
  "(m.lastName || '').toLowerCase()"
);
content = content.replace(
  /m\.firstName\.toLowerCase\(\)/g,
  "(m.firstName || '').toLowerCase()"
);

fs.writeFileSync('src/components/BuscadorIntegrante.tsx', content);
