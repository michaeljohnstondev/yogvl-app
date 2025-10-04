// firebase.js
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your Firebase project configuration
const firebaseConfig = {
  apiKey: 'AIzaSyAzPw31ftyHFvAmfJEF0ohFEun7T68tF8c',
  authDomain: 'bigvibestudios-b9839.firebaseapp.com',
  projectId: 'bigvibestudios-b9839',
  storageBucket: 'bigvibestudios-b9839.firebasestorage.app',
  messagingSenderId: '824215388091',
  appId: '1:824215388091:web:2a800abb59b72cdeae8e9e',
  measurementId: 'G-7MNJ7HD4F8',
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with AsyncStorage persistence for React Native
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Initialize Firestore with settings
export const db = getFirestore(app);

// Enable offline persistence and better error handling
import { enableIndexedDbPersistence } from 'firebase/firestore';
try {
  // Only enable persistence in production or if you want offline support
  // Comment this out if it causes issues during development
  // enableIndexedDbPersistence(db);
} catch (err) {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open, persistence can only be enabled in one tab at a time
    console.warn('[Firebase] Persistence failed - multiple tabs open');
  } else if (err.code === 'unimplemented') {
    // The current browser doesn't support persistence
    console.warn('[Firebase] Persistence not available');
  }
}

// Initialize Firebase Storage
export const storage = getStorage(app);

export default app;
