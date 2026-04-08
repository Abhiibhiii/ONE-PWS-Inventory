import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

// Production logging for Firebase initialization
if (process.env.NODE_ENV === 'production') {
  console.log('🔥 Firebase: Initializing...');
  console.log('🌐 Auth Domain:', firebaseConfig.authDomain);
  console.log('📍 Current Hostname:', window.location.hostname);
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'TODO_KEYHERE') {
    console.warn('⚠️ Firebase: API Key is missing or invalid in firebase-applet-config.json');
  }
}

// Initialize Firebase SDK safely
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

if (process.env.NODE_ENV === 'production') {
  console.log('✅ Firebase: SDK initialized successfully.');
}

// Validate connection to Firestore
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    if (process.env.NODE_ENV === 'production') {
      console.log('✅ Firestore: Connection test successful.');
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("❌ Firestore: Please check your Firebase configuration. The client is offline.");
    } else {
      // We don't log other errors as they might be expected (e.g. permission denied)
      if (process.env.NODE_ENV === 'production') {
        console.log('ℹ️ Firestore: Connection test completed (might have failed due to permissions, which is normal).');
      }
    }
  }
}
testConnection();
