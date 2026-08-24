const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const regex = /      if \(hasAnyFirestoreData\) {\n        firestoreData = result;\n      }\n    } catch \(err\) {\n      console\.error\(\`Error fetching tenant \${cleanTenantId} from Firestore:\`, err\);\n    }/g;

const replacement = `      if (hasAnyFirestoreData) {
        firestoreData = result;
      }
    } catch (err) {
      console.error(\`Error fetching tenant \${cleanTenantId} from Firestore:\`, err);
      throw new Error('No se pudo conectar a la base de datos Firestore (Posible timeout por inicio en frío). Por favor reintente o recargue la página. ' + (err.message || ''));
    }`;

code = code.replace(regex, replacement);
fs.writeFileSync('server.ts', code);
