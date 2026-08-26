const fs = require('fs');
let code = fs.readFileSync('src/components/RegistroPagos.tsx', 'utf-8');

const newComponent = `
const SearchableMemberSelect = ({ members, value, onChange }: { members: Member[], value: string, onChange: (id: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const selected = members.find(m => m.id === value);
  const filtered = members.filter(m => \`\${m.lastName} \${m.firstName} \${m.cedula}\`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative w-full">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-950 cursor-pointer flex justify-between items-center"
      >
        <span>{selected ? \`\${selected.lastName}, \${selected.firstName} (\${selected.cedula || 'Sin Cédula'})\` : '-- Selecciona un integrante --'}</span>
        <span className="text-slate-400">▼</span>
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 flex flex-col overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input
              autoFocus
              type="text"
              placeholder="Buscar por nombre o cédula..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {filtered.length > 0 ? filtered.map(m => (
              <div
                key={m.id}
                onClick={() => { onChange(m.id); setIsOpen(false); setSearch(''); }}
                className={\`px-3 py-2 text-xs font-bold rounded-lg cursor-pointer hover:bg-indigo-50 transition-colors \${m.id === value ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'}\`}
              >
                {m.lastName}, {m.firstName} ({m.cedula || 'Sin Cédula'})
              </div>
            )) : (
              <div className="px-3 py-2 text-xs text-slate-500 italic text-center">No se encontraron resultados</div>
            )}
          </div>
        </div>
      )}
      
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
};

export const RegistroPagos`;

code = code.replace("export const RegistroPagos", newComponent);
fs.writeFileSync('src/components/RegistroPagos.tsx', code);
