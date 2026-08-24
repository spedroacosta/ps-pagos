const fs = require('fs');
let content = fs.readFileSync('src/components/Configuracion.tsx', 'utf-8');

const anchor = `<button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="bg-[#162e58] hover:bg-[#0a1e3f] text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center space-x-1.5 shadow-xs transition-all cursor-pointer w-full"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Backup Manual (.JSON)</span>
                </button>`;

const replacement = anchor + `
                <button
                  type="button"
                  onClick={() => {
                    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
                      alert('El script de Google no se ha cargado. Por favor, recarga la página.');
                      return;
                    }
                    const client = google.accounts.oauth2.initTokenClient({
                      client_id: "753906353358-ld8k47do0qkqfsnmidk4t50ojrbaihre.apps.googleusercontent.com",
                      scope: 'https://www.googleapis.com/auth/drive.file',
                      callback: (tokenResponse) => {
                        if (tokenResponse && tokenResponse.access_token) {
                          localStorage.setItem('driveToken', tokenResponse.access_token);
                          alert('¡Conectado exitosamente con Google! Ahora puedes hacer respaldos automáticos en Drive.');
                        }
                      },
                    });
                    client.requestAccessToken();
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center space-x-1.5 shadow-xs transition-all cursor-pointer w-full"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12.01 1.493l-4.47 7.732h8.941l4.47-7.732h-8.94m-5.462 1.706L2.073 10.93l4.472 7.73 4.47-7.73-4.467-7.73zM18.442 12.637l-4.47 7.732H5.03l4.47-7.732h8.942z"/></svg>
                  <span>Iniciar Sesión con Google</span>
                </button>`;

content = content.replace(anchor, replacement);
fs.writeFileSync('src/components/Configuracion.tsx', content);
