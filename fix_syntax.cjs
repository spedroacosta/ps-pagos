const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

// The unescaped backticks in the prompt template literals
code = code.replace(/utiliza `selectedConcepts`/g, 'utiliza \\`selectedConcepts\\`');
code = code.replace(/llena `conceptAllocationsUSD`/g, 'llena \\`conceptAllocationsUSD\\`');

fs.writeFileSync('server.ts', code);
