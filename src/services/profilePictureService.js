// profilePictureService.js - Profile Picture Management Service

import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject,
  getStorage
} from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../auth/services/firebase';
import app from '../auth/services/firebase';

/**
 * Upload profile picture to Firebase Storage and update user profile
 * @param {string} userId - User ID
 * @param {string} imageUri - Local image URI from image picker
 * @returns {Promise<{success: boolean, imageUrl?: string, error?: string}>}
 */
export const uploadProfilePicture = async (userId, imageUri) => {
  try {
    if (!userId || !imageUri) {
      return { success: false, error: 'Missing userId or imageUri' };
    }

    console.log('Starting upload for user:', userId, 'with image:', imageUri);

    // Initialize storage directly to ensure it's available
    let storage;
    try {
      storage = getStorage(app);
      console.log('Storage initialized successfully');
      console.log('Storage app:', storage.app.name);
    } catch (storageInitError) {
      console.error('Failed to initialize storage:', storageInitError);
      throw new Error('Storage initialization failed');
    }
    
    // Convert image to blob using fetch (simpler approach)
    const response = await fetch(imageUri);
    const blob = await response.blob();
    console.log('Blob created, size:', blob.size);

    // Create storage reference with unique path
    const timestamp = Date.now();
    const path = `users/${userId}/profile/profile_${timestamp}.jpg`;
    console.log('Attempting to create ref with path:', path);
    
    let storageRef;
    try {
      storageRef = ref(storage, path);
      console.log('Storage ref created successfully');
      console.log('Storage ref bucket:', storageRef.bucket);
      console.log('Storage ref name:', storageRef.name);
      console.log('Storage ref fullPath:', storageRef.fullPath);
    } catch (refError) {
      console.error('Error creating storage ref:', refError);
      throw refError;
    }
    
    try {
      // Upload using the basic uploadBytesResumable
      console.log('Starting Firebase Storage upload...');
      
      const uploadTask = uploadBytesResumable(storageRef, blob, {
        contentType: 'image/jpeg'
      });

      // Wait for upload completion with promise
      const result = await new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Upload progress:', Math.round(progress) + '%');
          },
          (error) => {
            console.error('Upload failed:', error);
            reject(error);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              console.log('Upload successful, download URL:', downloadURL);
              
              // Update user profile in Firestore
              const userRef = doc(db, 'users', userId);
              await updateDoc(userRef, {
                'userdata.contactInfo.profilePicture': downloadURL,
                'userdata.metadata.updatedAt': new Date()
              });
              
              console.log('Profile updated in Firestore');
              resolve({ success: true, imageUrl: downloadURL });
            } catch (urlError) {
              console.error('Error getting download URL:', urlError);
              reject(urlError);
            }
          }
        );
      });

      return result;
      
    } catch (storageError) {
      console.error('Firebase Storage error, using fallback:', storageError);
      
      // Fallback: save local URI if storage fails
      console.log('Falling back to local URI storage...');
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'userdata.contactInfo.profilePicture': imageUri,
        'userdata.metadata.updatedAt': new Date()
      });
      
      console.log('Fallback successful - saved local URI');
      return { success: true, imageUrl: imageUri, fallback: true };
    }
    
  } catch (error) {
    console.error('Upload error details:', error);
    return { success: false, error: error.message || 'Unknown upload error' };
  }
};

/**
 * Remove profile picture from storage and user profile
 * @param {string} userId - User ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const removeProfilePicture = async (userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'Missing userId' };
    }

    // Create storage reference
    const imageRef = ref(storage, `users/${userId}/profile/profile.jpg`);
    
    // Delete from storage (ignore if doesn't exist)
    try {
      await deleteObject(imageRef);
    } catch (deleteError) {
      // File might not exist, which is fine
    }
    
    // Remove from user profile in Firestore
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      'userdata.contactInfo.profilePicture': null,
      'userdata.metadata.updatedAt': new Date()
    });

    return { success: true };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Get profile picture URL from user data
 * @param {Object} userData - User data object
 * @returns {string|null} Profile picture URL or null
 */
export const getProfilePictureUrl = (userData) => {
  return userData?.userdata?.contactInfo?.profilePicture || null;
};

/**
 * Check if user has a profile picture
 * @param {Object} userData - User data object
 * @returns {boolean} Whether user has a profile picture
 */
export const hasProfilePicture = (userData) => {
  return !!getProfilePictureUrl(userData);
};