import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDi3QwS5IilFBGYt96S5OQwHCB03c8ulPQ",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "shopuniversities.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "shopuniversities",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "shopuniversities.appspot.com", // Changed to appspot.com as it's more common
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "344186577304",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:344186577304:web:01135f7548108e1621cbed",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-E75L1K07GN"
};

export const isFirebaseConfigured = true;

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Initialize Analytics only in browser environment
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

