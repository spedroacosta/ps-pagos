const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const findTenantRegex = /    } catch \(err\) {\n      console\.error\('Error finding tenant in Firestore:', err\);\n    }/g;
code = code.replace(findTenantRegex, `    } catch (err) {
      console.error('Error finding tenant in Firestore:', err);
      throw new Error('Timeout consultando perfil en base de datos. Intenta nuevamente.');
    }`);

const configRegex = /    } catch \(err\) {\n      console\.error\('Error loading config from Firestore:', err\);\n    }/g;
code = code.replace(configRegex, `    } catch (err) {
      console.error('Error loading config from Firestore:', err);
      throw new Error('Timeout consultando configuración. Intenta nuevamente.');
    }`);

fs.writeFileSync('server.ts', code);
