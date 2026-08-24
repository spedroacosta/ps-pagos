const admin = require('firebase-admin');
const fs = require('fs');
if (fs.existsSync('serviceAccountKey.json')) {
  admin.initializeApp({
    credential: admin.credential.cert(require('./serviceAccountKey.json'))
  });
  const db = admin.firestore();
  
  async function check() {
    const tenants = await db.collection('tenants').get();
    for (const docSnap of tenants.docs) {
      console.log('Tenant:', docSnap.id, docSnap.data().name);
      const membersDoc = await db.collection('tenants_data').doc(docSnap.id).collection('data').doc('members').get();
      if (membersDoc.exists) {
        console.log('Members count:', membersDoc.data().items?.length);
      } else {
        console.log('No members document');
      }
    }
    process.exit(0);
  }
  check();
} else {
  console.log('No service account key');
}
