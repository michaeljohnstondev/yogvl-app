// eventPosterService.js - Event Poster Image Management Service
//
// Mirrors profilePictureService but writes to the event's storage bucket
// path. The caller is responsible for persisting the returned URL to the
// event document — this service only owns the Storage side.

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from '../lib/firebase';
import { storage } from '../auth/services/firebase';

// True for image-picker results that haven't been uploaded yet.
// expo-image-picker returns file:// on iOS/Android, content:// on some
// Android devices, and ph:// on iOS photo library. Treat anything that
// isn't an https URL as a local URI that needs uploading.
export const isLocalPosterUri = (uri) => {
  if (!uri || typeof uri !== 'string') return false;
  return !/^https?:\/\//i.test(uri);
};

const deletePosterByUrl = async (posterUrl) => {
  if (!posterUrl || !posterUrl.includes('firebase')) return;
  try {
    const url = new URL(posterUrl);
    const pathMatch = url.pathname.match(/\/o\/(.+?)\?/);
    if (!pathMatch) return;
    const decodedPath = decodeURIComponent(pathMatch[1]);
    await deleteObject(ref(storage, decodedPath));
  } catch (error) {
    // File may already be gone — non-fatal
    console.log('[eventPosterService] Could not delete old poster:', error.message);
  }
};

/**
 * Upload an event poster image. Deletes the previous poster (if any)
 * after the new one is in place.
 *
 * @param {string} studioId
 * @param {string} eventId
 * @param {string} localUri - URI from expo-image-picker
 * @param {string} [oldPosterUrl] - previous Firebase URL to clean up
 * @returns {Promise<string>} downloadURL
 */
export const uploadEventPoster = async (studioId, eventId, localUri, oldPosterUrl = null) => {
  if (!studioId || !eventId || !localUri) {
    throw new Error('uploadEventPoster: missing studioId, eventId, or localUri');
  }

  const response = await fetch(localUri);
  const blob = await response.blob();

  const timestamp = Date.now();
  const path = `studios/${studioId}/events/${eventId}/poster_${timestamp}.jpg`;
  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, blob, {
    contentType: 'image/jpeg',
  });

  const downloadURL = await new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      null,
      reject,
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        } catch (err) {
          reject(err);
        }
      }
    );
  });

  // Fire-and-forget cleanup; don't fail the upload if delete fails
  if (oldPosterUrl && oldPosterUrl !== downloadURL) {
    deletePosterByUrl(oldPosterUrl);
  }

  return downloadURL;
};

/**
 * Remove an event poster from Storage. Does NOT update Firestore.
 */
export const removeEventPoster = async (posterUrl) => {
  await deletePosterByUrl(posterUrl);
};
