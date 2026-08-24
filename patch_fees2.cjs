const fs = require('fs');
let code = fs.readFileSync('src/components/Configuracion.tsx', 'utf-8');

code = code.replace(
/          \{\/\* Conversions & Rule of 3 Calculator \*\/\}\n          <ConversionCalculator months=\{months\} currentBcvRate=\{bcvRate\} \/>\n\n          \{\/\* Late Fees Configuration \*\/\}/,
`          {/* Late Fees Configuration */}`
);

code = code.replace(
/        <\/div>\n      \}\)\n\n      \{\/\* --- Tab Panel: Notifications \(SMTP & Telegram Bot\) --- \*\/\}/,
`          {/* Conversions & Rule of 3 Calculator */}
          <ConversionCalculator months={months} currentBcvRate={bcvRate} />
        </div>
      )}

      {/* --- Tab Panel: Notifications (SMTP & Telegram Bot) --- */}`
);

fs.writeFileSync('src/components/Configuracion.tsx', code);
