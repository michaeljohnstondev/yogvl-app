// services/fcmServiceWrapper.js - Conditional FCM Service Loader

/**
 * Check if React Native Firebase is available
 * Returns false in Expo Go, true in development/production builds
 */
function isFirebaseAvailable() {
  try {
    require('@react-native-firebase/messaging');
    return true;
  } catch (error) {
    console.warn('[FCMWrapper] Firebase messaging not available:', error.message);
    return false;
  }
}

/**
 * Fallback FCM service for Expo Go
 * Provides same interface but no actual functionality
 */
class FallbackFCMService {
  constructor() {
    this.isInitialized = false;
    this.currentToken = null;
    this.navigationRef = null;
    console.warn('[FCMWrapper] Using fallback FCM service - no notifications in Expo Go');
  }

  async initialize() {
    console.warn('[FCMWrapper] FCM not available in Expo Go - skipping initialization');
    this.isInitialized = true;
    return false;
  }

  async requestPermission() {
    console.warn('[FCMWrapper] FCM not available in Expo Go - permission request skipped');
    return { granted: false, error: 'FCM not available in Expo Go' };
  }

  async getFCMToken() {
    console.warn('[FCMWrapper] FCM not available in Expo Go - no token available');
    return null;
  }

  async getExpoPushToken() {
    return this.getFCMToken();
  }

  async registerTokenForUser(userId) {
    console.warn('[FCMWrapper] FCM not available in Expo Go - token registration skipped');
    return false;
  }

  async removeTokenForUser(userId) {
    console.warn('[FCMWrapper] FCM not available in Expo Go - token removal skipped');
    return false;
  }

  async getPermissionStatus() {
    return { granted: false, error: 'FCM not available in Expo Go' };
  }

  async getUserNotificationPreferences(userId) {
    return null;
  }

  setNavigationRef(navigationRef) {
    this.navigationRef = navigationRef;
  }

  getCurrentToken() {
    return null;
  }

  isReady() {
    return this.isInitialized;
  }

  cleanup() {
    console.log('[FCMWrapper] Fallback cleanup complete');
  }
}

/**
 * Get the appropriate FCM service based on environment
 * Returns real FCM service in builds, fallback service in Expo Go
 */
function createFCMService() {
  if (isFirebaseAvailable()) {
    console.log('[FCMWrapper] Firebase available - using real FCM service');
    const { fcmService } = require('./fcmService');
    return fcmService;
  } else {
    console.log('[FCMWrapper] Firebase not available - using fallback service');
    return new FallbackFCMService();
  }
}

// Export the appropriate service
export const fcmService = createFCMService();
export default fcmService;

// Export utilities for debugging
export { isFirebaseAvailable };