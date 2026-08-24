const fs = require('fs');
let content = fs.readFileSync('src/components/ResumenSolvencia.tsx', 'utf8');

content = content.replace(
  /s\.member\.lastName\.toLowerCase\(\)/g,
  "(s.member.lastName || '').toLowerCase()"
);
content = content.replace(
  /s\.member\.firstName\.toLowerCase\(\)/g,
  "(s.member.firstName || '').toLowerCase()"
);

fs.writeFileSync('src/components/ResumenSolvencia.tsx', content);
