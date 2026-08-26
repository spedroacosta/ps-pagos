const fs = require('fs');
let code = fs.readFileSync('src/components/SuperAdminPanel.tsx', 'utf-8');

// 1. Add setFormAdminEmail to openEditModal
code = code.replace(
  /setFormId\(tenant\.id\);\s*setFormName\(tenant\.name\);/,
  "setFormId(tenant.id);\n    setFormName(tenant.name);\n    setFormAdminEmail(tenant.adminEmail || '');"
);

// 2. Add formId and formAdminEmail to the edit form. The edit form currently starts with `formName`.
const editFormTarget = `<form onSubmit={handleEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nombre de la Promoción *
                </label>`;

const editFormReplacement = `<form onSubmit={handleEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    ID / URL de la Promo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej: promo106"
                    className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 text-slate-900"
                    value={formId}
                    onChange={(e) => setFormId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Este ID es la URL (/promo106).</p>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Correo del Administrador
                  </label>
                  <input
                    type="email"
                    placeholder="admin@ejemplo.com"
                    className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 text-slate-900"
                    value={formAdminEmail}
                    onChange={(e) => setFormAdminEmail(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nombre de la Promoción *
                </label>`;

code = code.replace(editFormTarget, editFormReplacement);

fs.writeFileSync('src/components/SuperAdminPanel.tsx', code);
