import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Firebase configuration provided by the user
export const firebaseConfig = {
  apiKey: "AIzaSyDi3QwS5IilFBGYt96S5OQwHCB03c8ulPQ",
  authDomain: "shopuniversities.firebaseapp.com",
  projectId: "shopuniversities",
  storageBucket: "shopuniversities.firebasestorage.app",
  messagingSenderId: "344186577304",
  appId: "1:344186577304:web:01135f7548108e1621cbed",
  measurementId: "G-E75L1K07GN"
};

export const isFirebaseConfigured = true;

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Initialize Analytics only in browser environment
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

