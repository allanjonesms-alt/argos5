import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
  console.log("Signing in anonymously...");
  await signInAnonymously(auth);
  console.log("Signed in. Fetching users...");
  
  const usersSnap = await getDocs(collection(db, 'users'));
  console.log(`Found ${usersSnap.size} user documents:`);
  usersSnap.forEach(doc => {
    console.log(`- ID: ${doc.id}, Data:`, JSON.stringify(doc.data()));
  });

  const collections = ['occurrences', 'occurrences_ro', 'individuals', 'approaches'];
  for (const coll of collections) {
    try {
      const snap = await getDocs(collection(db, coll));
      console.log(`Collection '${coll}' size: ${snap.size}`);
      if (snap.size > 0) {
        console.log(`Sample document from '${coll}':`, snap.docs[0].id, JSON.stringify(snap.docs[0].data()));
      }
    } catch (e) {
      console.log(`Could not read collection '${coll}':`, e.message);
    }
  }
}

run().catch(console.error);
