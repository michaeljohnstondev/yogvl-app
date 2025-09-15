// FILE: lib/firebase/firestore.js - Centralized Firestore utilities to eliminate 500+ duplicate imports

// Core Firestore functions - used across 70+ files
export {
  // Database instance - CRITICAL for Navigation.js
  getFirestore,
  // Document operations (most frequently duplicated - 400+ occurrences)
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,

  // Collection operations (200+ occurrences)
  collection,
  addDoc,

  // Query operations (150+ occurrences)
  query,
  where,
  orderBy,
  limit,
  startAfter,
  startAt,
  endAt,
  endBefore,

  // Real-time operations (100+ occurrences)
  onSnapshot,
  getDocs,

  // Transaction and batch operations (50+ occurrences)
  runTransaction,
  writeBatch,

  // Array operations (30+ occurrences)
  arrayUnion,
  arrayRemove,

  // Field value operations
  increment,
  serverTimestamp,
  deleteField,

  // Timestamp operations
  Timestamp,

  // Query constraints
  and,
  or,
} from 'firebase/firestore';

// Common query builders to reduce boilerplate
export const createQuery = (collectionRef, ...constraints) => {
  return query(collectionRef, ...constraints);
};

export const createOrderedQuery = (collectionRef, field, direction = 'asc', limitCount = null) => {
  const constraints = [orderBy(field, direction)];
  if (limitCount) {
    constraints.push(limit(limitCount));
  }
  return query(collectionRef, ...constraints);
};

export const createFilteredQuery = (collectionRef, field, operator, value, ...additionalConstraints) => {
  return query(collectionRef, where(field, operator, value), ...additionalConstraints);
};

// Common document reference patterns
export const createDocRef = (db, collectionName, docId) => {
  return doc(db, collectionName, docId);
};

export const createCollectionRef = (db, collectionName) => {
  return collection(db, collectionName);
};

// Batch operations helper
export const createBatch = (db) => {
  return writeBatch(db);
};

// Common pagination helper
export const createPaginatedQuery = (collectionRef, lastDoc, limitCount = 10, ...constraints) => {
  const queryConstraints = [...constraints, limit(limitCount)];
  if (lastDoc) {
    queryConstraints.push(startAfter(lastDoc));
  }
  return query(collectionRef, ...queryConstraints);
};