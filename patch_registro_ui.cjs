const fs = require('fs');
let code = fs.readFileSync('src/components/RegistroPagos.tsx', 'utf-8');

// We want to replace <label className="text-[10px] font-semibold text-slate-500">Abonar:</label>
// with <label className="text-[10px] font-semibold text-slate-500">Abonar {mCurrency === 'VES' ? '(Bs.)' : '($)'}:</label>

code = code.replace(/<label className="text-\[10px\] font-semibold text-slate-500">Abonar:<\/label>/g, 
  "<label className=\"text-[10px] font-semibold text-slate-500\">Abonar {mCurrency === 'VES' ? '(Bs.)' : '($)'}:</label>");

// Same for PaymentModal.tsx
let modalCode = fs.readFileSync('src/components/PaymentModal.tsx', 'utf-8');
modalCode = modalCode.replace(/<label className="text-\[10px\] font-semibold text-slate-500">Abonar:<\/label>/g, 
  "<label className=\"text-[10px] font-semibold text-slate-500\">Abonar {currency === 'VES' ? '(Bs.)' : '($)'}:</label>");

fs.writeFileSync('src/components/RegistroPagos.tsx', code);
fs.writeFileSync('src/components/PaymentModal.tsx', modalCode);

