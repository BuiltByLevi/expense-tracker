import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
// Imported from the SCOPED package, not the `firebase/auth` umbrella: only
// @firebase/auth declares a "react-native" export condition, so it is the
// only path that resolves to the React Native build. The umbrella package
// resolves to the browser build, which lacks getReactNativePersistence and
// would silently fall back to in-memory auth (session lost on every restart).
import {
  getReactNativePersistence,
  initializeAuth,
  type Auth,
} from '@firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Same Firebase project as the web app — the mobile app reads EXPO_PUBLIC_*
 * vars holding the identical values the web app reads as VITE_*. Existing
 * users, UIDs, and Firestore documents are shared; no separate project.
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const missing = Object.entries(firebaseConfig)
  .filter(([, v]) => !v)
  .map(([k]) => k);
if (missing.length > 0) {
  // Fail loudly at startup rather than surfacing as opaque auth/network errors
  // deep inside a screen. Names only — never the values.
  throw new Error(
    `Firebase config missing: ${missing.join(', ')}. Copy mobile/.env.example to mobile/.env and fill it in.`
  );
}

// Expo Router re-executes modules on Fast Refresh; guard against a duplicate
// app/auth init, which throws at runtime.
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let authInstance: Auth;
try {
  // Unlike the web SDK's getAuth(), React Native has no browser storage, so
  // the session would be lost on every cold start without an explicit
  // AsyncStorage persistence adapter.
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // Already initialized on a previous Fast Refresh pass.
  const { getAuth } = require('@firebase/auth');
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const db = getFirestore(app);
