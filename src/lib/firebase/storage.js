// FILE: lib/firebase/storage.js - Centralized Firebase Storage utilities to eliminate 20+ duplicate imports

// Core Storage functions - used across 15+ files
export {
  // Storage references
  ref,
  child,

  // Upload operations
  uploadBytes,
  uploadBytesResumable,
  uploadString,

  // Download operations
  getDownloadURL,
  getBlob,
  getBytes,
  getStream,

  // Metadata operations
  getMetadata,
  updateMetadata,

  // Delete operations
  deleteObject,

  // List operations
  list,
  listAll,

  // Storage errors
  StorageErrorCode,
} from 'firebase/storage';

// Common storage patterns
export const createStorageRef = (storage, path) => {
  return ref(storage, path);
};

export const uploadFile = async (storage, path, file, metadata = {}) => {
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file, metadata);
  return await getDownloadURL(snapshot.ref);
};

export const uploadFileResumable = (storage, path, file, metadata = {}) => {
  const storageRef = ref(storage, path);
  return uploadBytesResumable(storageRef, file, metadata);
};

export const deleteFile = async (storage, path) => {
  const storageRef = ref(storage, path);
  return await deleteObject(storageRef);
};

export const getFileUrl = async (storage, path) => {
  const storageRef = ref(storage, path);
  return await getDownloadURL(storageRef);
};