const fs = require('fs');
let appCode = fs.readFileSync('src/App.tsx', 'utf-8');

const targetApp = `            const exps = Array.isArray(json.data.expenses) ? json.data.expenses : [];`;
const replacementApp = `            const exps = Array.isArray(json.data.expenses) ? json.data.expenses : [];
            
            // Check for Auto Backup
            const autoBackupEnabled = localStorage.getItem('autoBackupDrive') === 'true';
            const todayStr = new Date().toISOString().split('T')[0];
            const lastBackupStr = localStorage.getItem('lastAutoBackupDate');
            const driveToken = localStorage.getItem('driveToken');
            
            if (autoBackupEnabled && driveToken && lastBackupStr !== todayStr) {
               console.log("Triggering auto backup to Google Drive...");
               fetch('/api/backup/drive', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': \`Bearer \${driveToken}\`,
                    ...getTenantHeaders()
                  },
                  body: JSON.stringify({ 
                    fileName: \`control_pagos_respaldo_\${todayStr}.json\`, 
                    fileContent: JSON.stringify({
                      members: mems,
                      months: Array.isArray(json.data.months) && json.data.months.length > 0 ? json.data.months : [],
                      quotas: qts,
                      payments: pays,
                      dollarPurchases: dps,
                      expenses: exps,
                      exportedAt: new Date().toISOString(),
                      version: '2.0'
                    }, null, 2) 
                  })
               }).then(r => r.json()).then(res => {
                  if (res.success || res.id) {
                     console.log("Auto backup successful.");
                     localStorage.setItem('lastAutoBackupDate', todayStr);
                  }
               }).catch(e => console.error("Auto backup failed:", e));
            }`;

appCode = appCode.replace(targetApp, replacementApp);
fs.writeFileSync('src/App.tsx', appCode);

let configCode = fs.readFileSync('src/components/Configuracion.tsx', 'utf-8');
const targetConfig = `<div className="space-y-4">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {`;
const replacementConfig = `<div className="space-y-4">
                <div className="flex items-center space-x-3 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    id="autoBackupDrive"
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    checked={localStorage.getItem('autoBackupDrive') === 'true'}
                    onChange={(e) => {
                      if (e.target.checked) {
                        if (!localStorage.getItem('driveToken')) {
                          alert('Debes iniciar sesión con Google primero para activar las copias automáticas.');
                          e.target.checked = false;
                          return;
                        }
                        localStorage.setItem('autoBackupDrive', 'true');
                      } else {
                        localStorage.setItem('autoBackupDrive', 'false');
                      }
                      // trigger re-render hack by updating an unused state or simply relying on the UI interaction
                      setIsRestoring(prev => !prev);
                      setTimeout(() => setIsRestoring(prev => !prev), 0);
                    }}
                  />
                  <label htmlFor="autoBackupDrive" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Activar copias automáticas diarias a Google Drive
                  </label>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {`;

configCode = configCode.replace(targetConfig, replacementConfig);
fs.writeFileSync('src/components/Configuracion.tsx', configCode);
