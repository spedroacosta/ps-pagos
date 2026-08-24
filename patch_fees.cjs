const fs = require('fs');
let code = fs.readFileSync('src/components/Configuracion.tsx', 'utf-8');

const calculatorStr = `          {/* Conversions & Rule of 3 Calculator */}\n          <ConversionCalculator months={months} currentBcvRate={bcvRate} />`;

code = code.replace(calculatorStr, '');
code = code.replace(
/          \{\/\* Late Fees Configuration \*\/\}/,
`          {/* Conversions & Rule of 3 Calculator */}
          <ConversionCalculator months={months} currentBcvRate={bcvRate} />\n
          {/* Late Fees Configuration */}`
);

fs.writeFileSync('src/components/Configuracion.tsx', code);
