const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');

const anchor = 'const [isRefreshingBcv, setIsRefreshingBcv] = useState<boolean>(false);';
const insertion = `
  const hasLocalBackup = typeof window !== 'undefined' && !!localStorage.getItem('promo_members');
  const restoreLocalBackup = () => {
    if (window.confirm("¿Seguro que deseas restaurar los datos guardados en la memoria caché de este navegador? Esto sobrescribirá lo que esté en el servidor.")) {
      try {
        const mems = JSON.parse(localStorage.getItem('promo_members') || '[]');
        if (mems.length > 0) {
          setMembers(mems);
          const mnths = JSON.parse(localStorage.getItem('promo_months') || '[]');
          if (mnths.length > 0) setMonths(mnths);
          const py = JSON.parse(localStorage.getItem('promo_payments') || '[]');
          if (py.length > 0) setPayments(py);
          const qts = JSON.parse(localStorage.getItem('promo_quotas') || '[]');
          if (qts.length > 0) setQuotas(qts);
          alert("¡Datos locales restaurados! El sistema los está sincronizando con la nube ahora mismo.");
        } else {
          alert("No se encontraron datos de integrantes en el caché.");
        }
      } catch(e) {
        alert("Error al restaurar: " + e);
      }
    }
  };
`;

content = content.replace(anchor, anchor + '\n' + insertion);

const bannerAnchor = '{/* Header & Nav */}';
const bannerInsertion = `
      {hasLocalBackup && members.length === 0 && isInitialized && (
        <div className="bg-amber-100 border-b border-amber-200 px-4 py-3 text-amber-900 flex flex-col sm:flex-row items-center justify-between z-50 relative">
          <div className="flex items-center space-x-2 text-sm">
            <span className="font-bold">⚠️ Se han encontrado datos de una sesión anterior en este navegador.</span>
            <span>Si perdiste información recientemente, puedes recuperarla ahora.</span>
          </div>
          <button onClick={restoreLocalBackup} className="mt-2 sm:mt-0 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-sm">
            Recuperar Datos del Navegador
          </button>
        </div>
      )}
`;

content = content.replace(bannerAnchor, bannerInsertion + '\n      ' + bannerAnchor);
fs.writeFileSync('src/App.tsx', content);
