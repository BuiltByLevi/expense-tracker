import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Local testing only: `VITE_USE_FIREBASE_EMULATOR=true npm run dev` points the
// app at the Firebase emulators, so features that write data (e.g. statement
// import) can be tried end to end without touching a real account. The DEV
// check is a build-time constant, so none of this exists in production builds.
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  connectAuthEmulator(auth, `http://${import.meta.env.VITE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099'}`, { disableWarnings: true });
  const [host, port] = (import.meta.env.VITE_FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':');
  connectFirestoreEmulator(db, host, Number(port));
}
