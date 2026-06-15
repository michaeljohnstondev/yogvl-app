// FILE: services/profilePicturePromptService.js - Profile Picture Suggestion Service

import * as ImagePicker from 'expo-image-picker';
import { hasProfilePicture, uploadProfilePicture } from './profilePictureService';

/**
 * Check if user should be prompted to add a profile picture
 * @param {Object} userData - User data object
 * @returns {boolean} True if user should be prompted
 */
export const shouldPromptForProfilePicture = (userData) => {
  if (!userData) return false;
  return !hasProfilePicture(userData);
};

/**
 * Show profile picture suggestion alert with camera/library options
 * @param {Object} vibeAlert - VibeAlert instance
 * @param {string} currentUserId - Current user's ID
 * @param {Object} userData - User data object
 * @param {string} context - Context for the prompt (e.g., 'create_event', 'join_event')
 * @param {Function} onComplete - Callback after user completes or skips
 */
export const promptForProfilePicture = async ({
  vibeAlert,
  currentUserId,
  userData,
  context = 'general',
  onComplete = () => {},
}) => {
  if (!shouldPromptForProfilePicture(userData)) {
    onComplete(false); // No prompt needed
    return;
  }

  // Determine context-specific message
  let message = 'Other users will see who is attending. Would you like to add a profile picture?';

  if (context === 'create_event') {
    message = 'You are creating an event! Other attendees will see who is hosting. Would you like to add a profile picture so they know what you look like?';
  } else if (context === 'join_event') {
    message = 'You are joining an event! Other attendees will see who is coming. Would you like to add a profile picture so they know what you look like?';
  }

  // Show confirmation alert with camera/library options
  vibeAlert.menu(
    'Add Profile Picture?',
    message,
    [
      {
        text: 'Take Photo',
        onPress: async () => {
          const uploaded = await openCamera(vibeAlert, currentUserId, userData);
          onComplete(uploaded);
        },
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          const uploaded = await openImageLibrary(vibeAlert, currentUserId, userData);
          onComplete(uploaded);
        },
      },
      {
        text: 'Skip for Now',
        style: 'cancel',
        onPress: () => onComplete(false),
      },
    ]
  );
};

/**
 * Open camera to take a photo
 * @param {Object} vibeAlert - VibeAlert instance
 * @param {string} currentUserId - Current user's ID
 * @param {Object} userData - User data object
 * @returns {Promise<boolean>} True if photo was uploaded
 */
const openCamera = async (vibeAlert, currentUserId, userData) => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      vibeAlert.error(
        'Permission Needed',
        'Camera permission is required to take photos.'
      );
      return false;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      return await handleImageUpload(vibeAlert, currentUserId, userData, result.assets[0].uri);
    }

    return false;
  } catch (error) {
    console.error('[ProfilePicturePrompt] Camera error:', error);
    vibeAlert.error('Error', 'Failed to open camera. Please try again.');
    return false;
  }
};

/**
 * Open image library to choose a photo
 * @param {Object} vibeAlert - VibeAlert instance
 * @param {string} currentUserId - Current user's ID
 * @param {Object} userData - User data object
 * @returns {Promise<boolean>} True if photo was uploaded
 */
const openImageLibrary = async (vibeAlert, currentUserId, userData) => {
  try {
    // No permission request — launchImageLibraryAsync routes through
    // Android's system Photo Picker on API 33+ (single-image hand-off,
    // no broad gallery access required). Satisfies Google Play's
    // photo/video permissions policy without a perm prompt.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      return await handleImageUpload(vibeAlert, currentUserId, userData, result.assets[0].uri);
    }

    return false;
  } catch (error) {
    console.error('[ProfilePicturePrompt] Image library error:', error);
    vibeAlert.error('Error', 'Failed to open photo library. Please try again.');
    return false;
  }
};

/**
 * Handle image upload
 * @param {Object} vibeAlert - VibeAlert instance
 * @param {string} currentUserId - Current user's ID
 * @param {Object} userData - User data object
 * @param {string} imageUri - Image URI to upload
 * @returns {Promise<boolean>} True if upload was successful
 */
const handleImageUpload = async (vibeAlert, currentUserId, userData, imageUri) => {
  if (!imageUri) {
    vibeAlert.error('Error', 'No image selected');
    return false;
  }

  try {
    console.log('[ProfilePicturePrompt] Uploading image:', imageUri);
    const result = await uploadProfilePicture(currentUserId, imageUri, userData);

    if (result.success) {
      vibeAlert.success('Success', 'Profile picture added!');
      return true;
    } else {
      console.error('[ProfilePicturePrompt] Upload failed:', result.error);
      vibeAlert.error('Error', result.error || 'Failed to upload profile picture');
      return false;
    }
  } catch (error) {
    console.error('[ProfilePicturePrompt] Upload error:', error);
    vibeAlert.error('Error', 'Failed to upload profile picture');
    return false;
  }
};
