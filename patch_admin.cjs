const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
/const \{ name, password, licenseKey, expiresAt \} = req.body;/,
`const { newId, name, password, licenseKey, expiresAt, adminEmail } = req.body;`
);

code = code.replace(
/    if \(name\) tenant.name = name.trim\(\);\n    if \(password\) tenant.passwordHash = password.trim\(\);\n    if \(licenseKey\) tenant.licenseKey = licenseKey.trim\(\);\n    if \(expiresAt\) tenant.expiresAt = expiresAt;/,
`    if (name) tenant.name = name.trim();
    if (password) tenant.passwordHash = password.trim();
    if (licenseKey) tenant.licenseKey = licenseKey.trim();
    if (expiresAt) tenant.expiresAt = expiresAt;
    if (adminEmail !== undefined) (tenant as any).adminEmail = adminEmail.trim();

    // If changing ID
    if (newId && newId.trim().toLowerCase() !== id.toLowerCase()) {
      const cleanNewId = newId.trim().toLowerCase();
      if (!/^[a-z0-9-]+$/.test(cleanNewId)) {
        return res.status(400).json({ error: 'El ID de promoción sólo debe contener letras minúsculas, números y guiones.' });
      }
      const existing = await findTenant(cleanNewId);
      if (existing) {
        return res.status(400).json({ error: 'El nuevo ID de promoción ya está en uso.' });
      }
      
      // We need to rename data files and tenant list entries
      const fs = require('fs');
      const path = require('path');
      
      // Update tenant object
      const oldId = tenant.id;
      tenant.id = cleanNewId;
      
      // 1. Local tenants list
      if (fs.existsSync(TENANTS_FILE)) {
        try {
          const list = JSON.parse(fs.readFileSync(TENANTS_FILE, 'utf-8'));
          list[cleanNewId] = tenant;
          delete list[oldId];
          fs.writeFileSync(TENANTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
        } catch(e) {}
      }
      
      // 2. Rename server_data file if exists
      const oldDataFile = path.join(process.cwd(), \`server_data_\${oldId}.json\`);
      const newDataFile = path.join(process.cwd(), \`server_data_\${cleanNewId}.json\`);
      if (fs.existsSync(oldDataFile)) {
        try {
          fs.renameSync(oldDataFile, newDataFile);
        } catch(e) {}
      }

      // 3. Firestore update (if db)
      if (db) {
        try {
          const { doc, setDoc, deleteDoc } = require('firebase/firestore');
          await setDoc(doc(db, 'tenants', cleanNewId), tenant);
          await deleteDoc(doc(db, 'tenants', oldId));
        } catch(e) {}
      }
      
      // Also update any active sessions
      for (const s of activeSessions) {
        if (s.tenantId === oldId) {
          s.tenantId = cleanNewId;
        }
      }
      
      return res.json({ success: true, tenant });
    }`
);

fs.writeFileSync('server.ts', code);
