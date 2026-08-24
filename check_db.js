import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const configPath = './firebase-applet-config.json';
if (fs.existsSync(configPath)) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const app = initializeApp(config);
  const db = getFirestore(app, config.firestoreDatabaseId || '(default)');

  async function check() {
    try {
      const tenants = await getDocs(collection(db, 'tenants'));
      for (const docSnap of tenants.docs) {
        console.log('Tenant:', docSnap.id, docSnap.data().name);
        const membersDoc = await getDoc(doc(db, 'tenants_data', docSnap.id, 'data', 'members'));
        if (membersDoc.exists()) {
          console.log('Members count:', membersDoc.data().items?.length);
        } else {
          console.log('No members document');
        }
      }
    } catch(e) { console.error(e); }
    process.exit(0);
  }
  check();
}
