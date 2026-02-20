// FILE: lib/firebase/auth.js - Centralized Firebase Auth utilities to eliminate 50+ duplicate imports

// Core Auth functions - used across 20+ files
export {
  // Authentication operations
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updatePassword,
  updateEmail,
  updateProfile,
  deleteUser,

  // Auth state management
  onAuthStateChanged,
  getAuth,

  // User management
  reauthenticateWithCredential,
  EmailAuthProvider,

  // Google / OAuth
  signInWithCredential,
  GoogleAuthProvider,
  linkWithCredential,

  // Auth errors
  AuthErrorCodes,
} from 'firebase/auth';

// Common auth patterns
export const getCurrentUser = (auth) => {
  return auth.currentUser;
};

export const isUserAuthenticated = (auth) => {
  return !!auth.currentUser;
};

export const getUserEmail = (auth) => {
  return auth.currentUser?.email || null;
};

export const getUserUid = (auth) => {
  return auth.currentUser?.uid || null;
};

// Auth state listener helper
export const createAuthStateListener = (auth, callback) => {
  return onAuthStateChanged(auth, callback);
};
