const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');
const startIdx = content.indexOf('        try {\n          const lfRes = await fetch(');
const endIdx = content.indexOf('    loadServerData();\n  }, [tenantId]);');

if (startIdx !== -1 && endIdx !== -1) {
  const newText = `        try {
          const lfRes = await fetch('/api/late-fee-config', { headers: getTenantHeaders() });
          if (lfRes.ok) {
            const lfJson = await lfRes.json();
            if (lfJson.success && lfJson.config) {
              setLateFeeConfig(lfJson.config);            
            }
          }
        } catch (lfErr) {
          console.log('Error loading late fee config:', lfErr);
        }
        
        setIsInitialized(true);
      } catch (e) {
        console.error("Error crítico al cargar datos:", e);
        alert("Error de red. Por favor, recarga la página.");
      }
    }
`;
  content = content.substring(0, startIdx) + newText + content.substring(endIdx);
  fs.writeFileSync('src/App.tsx', content);
  console.log('Fixed!');
} else {
  console.log('Not found');
}
