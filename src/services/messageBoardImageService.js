// messageBoardImageService.js - Message Board Image Upload Service
//
// Mirrors eventPosterService's pattern. Owns the Storage side of an
// image attachment on a message-board post: uploads a picker-returned
// local URI to events/{eventId}/messageBoard/{timestamp}.jpg under the
// studio path, returns the download URL. Caller persists the URL onto
// the comment doc via useComments.addComment(content, parentId, url).
//
// Cleanup is handled server-side by the onEventDeleted Cloud Function,
// which recursively wipes the entire events/{eventId}/messageBoard/
// folder when an event is deleted. Individual comment deletion can
// also call deleteMessageBoardImageByUrl for one-off cleanup.

import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from '../lib/firebase';
import { storage } from '../auth/services/firebase';

// True for image-picker results that haven't been uploaded yet.
// expo-image-picker returns file://, content://, or ph:// for local
// URIs; anything not https is treated as local needing upload.
export const isLocalMessageImageUri = (uri) => {
  if (!uri || typeof uri !== 'string') return false;
  return !/^https?:\/\//i.test(uri);
};

/**
 * Upload a message-board image attachment to Storage.
 *
 * @param {string} studioId
 * @param {string} eventId
 * @param {string} localUri - URI from expo-image-picker
 * @returns {Promise<string>} downloadURL
 */
export const uploadMessageBoardImage = async (studioId, eventId, localUri) => {
  if (!studioId || !eventId || !localUri) {
    throw new Error(
      'uploadMessageBoardImage: missing studioId, eventId, or localUri'
    );
  }

  const response = await fetch(localUri);
  const blob = await response.blob();

  const timestamp = Date.now();
  const path = `studios/${studioId}/events/${eventId}/messageBoard/${timestamp}.jpg`;
  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, blob, {
    contentType: 'image/jpeg',
  });

  await new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      null,
      (err) => reject(err),
      () => resolve()
    );
  });

  return getDownloadURL(storageRef);
};

/**
 * Delete a previously uploaded message-board image by its download URL.
 * Used for one-off cleanup (e.g. a single comment with an image is
 * deleted). Event-wide cleanup is handled by onEventDeleted.
 *
 * @param {string} imageUrl - The Firebase Storage download URL
 */
export const deleteMessageBoardImageByUrl = async (imageUrl) => {
  if (!imageUrl || !imageUrl.includes('firebase')) return;
  try {
    const url = new URL(imageUrl);
    const pathMatch = url.pathname.match(/\/o\/(.+?)\?/);
    if (!pathMatch) return;
    const decodedPath = decodeURIComponent(pathMatch[1]);
    await deleteObject(ref(storage, decodedPath));
  } catch (error) {
    // File may already be gone — non-fatal
    console.log(
      '[messageBoardImageService] Could not delete image:',
      error.message
    );
  }
};
