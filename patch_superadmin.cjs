const fs = require('fs');
let code = fs.readFileSync('src/components/SuperAdminPanel.tsx', 'utf-8');

code = code.replace(
/  const \[formName, setFormName\] = useState\(''\);/,
`  const [formName, setFormName] = useState('');
  const [formAdminEmail, setFormAdminEmail] = useState('');`
);

code = code.replace(
/  const resetForm = \(\) => \{\n    setFormId\(''\);\n    setFormName\(''\);\n    setFormPassword\(''\);/,
`  const resetForm = () => {
    setFormId('');
    setFormName('');
    setFormAdminEmail('');
    setFormPassword('');`
);

code = code.replace(
/  const openEdit = \(tenant: SuperTenant\) => \{\n    setSelectedTenant\(tenant\);\n    setFormId\(tenant.id\);\n    setFormName\(tenant.name\);\n    setFormPassword\(tenant.passwordHash\);/,
`  const openEdit = (tenant: SuperTenant) => {
    setSelectedTenant(tenant);
    setFormId(tenant.id);
    setFormName(tenant.name);
    setFormAdminEmail((tenant as any).adminEmail || '');
    setFormPassword(tenant.passwordHash);`
);

code = code.replace(
/        body: JSON.stringify\(\{\n          tenantId: formId.trim\(\).toLowerCase\(\),\n          name: formName.trim\(\),\n          password: formPassword.trim\(\),\n          licenseKey: formLicenseKey.trim\(\) \|\| 'TRIAL',\n          expiresAt: formExpiresAt \? new Date\(formExpiresAt\).toISOString\(\) : undefined\n        \}\)/,
`        body: JSON.stringify({
          tenantId: formId.trim().toLowerCase(),
          name: formName.trim(),
          adminEmail: formAdminEmail.trim(),
          password: formPassword.trim(),
          licenseKey: formLicenseKey.trim() || 'TRIAL',
          expiresAt: formExpiresAt ? new Date(formExpiresAt).toISOString() : undefined
        })`
);

code = code.replace(
/        body: JSON.stringify\(\{\n          name: formName.trim\(\),\n          password: formPassword.trim\(\),\n          licenseKey: formLicenseKey.trim\(\),\n          expiresAt: new Date\(formExpiresAt\).toISOString\(\)\n        \}\)/,
`        body: JSON.stringify({
          newId: formId.trim().toLowerCase(),
          name: formName.trim(),
          adminEmail: formAdminEmail.trim(),
          password: formPassword.trim(),
          licenseKey: formLicenseKey.trim(),
          expiresAt: new Date(formExpiresAt).toISOString()
        })`
);

code = code.replace(
/              <div>\n                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">\n                  Nombre de Promo \*\n                <\/label>\n                <input\n                  type="text"\n                  required\n                  placeholder="ej: Promoción Santiago 2026"\n                  className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 text-slate-900"\n                  value=\{formName\}\n                  onChange=\{\(e\) => setFormName\(e.target.value\)\}\n                \/>\n              <\/div>/g,
`              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nombre de Promo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej: Promoción Santiago 2026"
                  className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 text-slate-900"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Correo del Administrador
                </label>
                <input
                  type="email"
                  placeholder="ej: admin@promo.com"
                  className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 text-slate-900"
                  value={formAdminEmail}
                  onChange={(e) => setFormAdminEmail(e.target.value)}
                />
              </div>`
);

fs.writeFileSync('src/components/SuperAdminPanel.tsx', code);
