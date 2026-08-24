const fs = require('fs');
let code = fs.readFileSync('src/components/Configuracion.tsx', 'utf-8');

code = code.replace(
/            <\/div>\n        <\/div>\n      \}\)\n      \{\/\* --- Tab Panel: Notifications \(SMTP & Telegram Bot\) --- \*\/\}/,
`            </div>
          
          {/* Conversions & Rule of 3 Calculator */}
          <ConversionCalculator months={months} currentBcvRate={bcvRate} />
        </div>
      )}
      {/* --- Tab Panel: Notifications (SMTP & Telegram Bot) --- */}`
);

fs.writeFileSync('src/components/Configuracion.tsx', code);
