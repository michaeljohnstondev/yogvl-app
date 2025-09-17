// FILE: lib/firebase/index.js - Central Firebase exports to eliminate 830+ duplicate imports across 76+ files

// Re-export all Firebase utilities from centralized modules
export * from './firestore.js';
export * from './auth.js';
export * from './storage.js';

// Export Firebase instances from the main config
export { auth, db, storage } from '../../auth/services/firebase.js';

// Common Firebase patterns used across the app
export const FirebaseCollections = {
  USERS: 'users',
  EVENTS: 'events',
  STUDIOS: 'studios',
  NOTIFICATIONS: 'notifications',
  TEMPLATES: 'templates',
  INVITATIONS: 'invitations',
  ATTENDANCE: 'attendance',
  COMMENTS: 'comments',
  VENUES: 'venues',
  GROUPS: 'groups',
};

export const FirebaseErrorCodes = {
  PERMISSION_DENIED: 'permission-denied',
  NOT_FOUND: 'not-found',
  ALREADY_EXISTS: 'already-exists',
  FAILED_PRECONDITION: 'failed-precondition',
  ABORTED: 'aborted',
  UNAVAILABLE: 'unavailable',
  UNAUTHENTICATED: 'unauthenticated',
};
