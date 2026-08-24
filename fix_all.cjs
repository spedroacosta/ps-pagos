const fs = require('fs');
let code = fs.readFileSync('src/components/InvoiceModal.tsx', 'utf-8');

// I will just read all lines, and if I find this broken line, I will replace it with the correct closing and continue.
const lines = code.split('\n');
const fixedLines = [];
let i = 0;
while (i < lines.length) {
  if (lines[i].includes("p.amountOriginal + ' ")) {
     fixedLines.push(lines[i].replace("p.amountOriginal + ' ", "p.amountOriginal + ' $'})"));
     fixedLines.push("                  </option>");
     fixedLines.push("                ))} ");
     fixedLines.push("              </optgroup>");
     fixedLines.push("            )}");
     fixedLines.push("          </select>");
     fixedLines.push("        </div>");
     fixedLines.push("        {/* Email status feedback message */}");
     fixedLines.push("        {emailStatus && (");
     fixedLines.push("          <div className=\"mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-medium flex items-center justify-between print:hidden shadow-xs\">");
     fixedLines.push("            <span>{emailStatus}</span>");
     fixedLines.push("            <button onClick={() => setEmailStatus(null)} className=\"text-emerald-700 font-bold cursor-pointer\">✕</button>");
     fixedLines.push("          </div>");
     fixedLines.push("        )}");
     fixedLines.push("        {/* Printable Receipt Canvas */}");
     fixedLines.push("        <div id=\"printable-invoice\" className=\"p-10 bg-white text-slate-900 font-sans max-w-[800px] mx-auto select-none border border-slate-100 space-y-6\">");
     fixedLines.push("          {/* Header Row */}");
     fixedLines.push("          <div className=\"flex justify-between items-start\">");
     fixedLines.push("            {/* Left: Receipt Title & Promotion Name */}");
     fixedLines.push("            <div className=\"space-y-4\">");
     fixedLines.push("              <h1 className=\"text-3xl font-black tracking-tight uppercase text-slate-950 font-sans\">");
     fixedLines.push("                Recibo de Pago");
     fixedLines.push("              </h1>");
     fixedLines.push("              <div className=\"space-y-0.5\">");
     fixedLines.push("                <h2 className=\"text-xl font-black text-slate-900 tracking-wide uppercase\">");
     fixedLines.push("                  {sessionStorage.getItem('tenantName') || \"PROMOCIÓN 106\"}");
     fixedLines.push("                </h2>");
     fixedLines.push("                <p className=\"text-xs font-bold text-slate-500 tracking-widest uppercase\">");
     fixedLines.push("                  MÉDICOS CIRUJANOS");
     fixedLines.push("                </p>");
     fixedLines.push("              </div>");
     fixedLines.push("            </div>");
     fixedLines.push("            {/* Right: Logos */}");
     
     // Now skip until we see the logos
     while (i < lines.length && !lines[i].includes("Right: Logos")) {
       i++;
     }
  } else {
    fixedLines.push(lines[i]);
  }
  i++;
}

fs.writeFileSync('src/components/InvoiceModal.tsx', fixedLines.join('\n'));
