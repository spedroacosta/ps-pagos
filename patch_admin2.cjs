const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
/const \{ tenantId, name, password, licenseKey, expiresAt \} = req.body;/,
`const { tenantId, name, password, licenseKey, expiresAt, adminEmail } = req.body;`
);

code = code.replace(
/      createdAt: new Date\(\)\.toISOString\(\),\n    \};/,
`      createdAt: new Date().toISOString(),
      adminEmail: adminEmail ? adminEmail.trim() : undefined
    };`
);

fs.writeFileSync('server.ts', code);
