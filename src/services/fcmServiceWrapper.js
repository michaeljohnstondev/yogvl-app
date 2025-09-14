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
    console.warn(
      '[FCMWrapper] Firebase messaging not available:',
      error.message
    );
    return false;
  }
}

/**
 * Silent FCM service for Expo Go
 * Provides same interface but silently does nothing - no warnings or errors
 */
class FallbackFCMService {
  constructor() {
    this.isInitialized = false;
    this.currentToken = null;
    this.navigationRef = null;
  }

  async initialize() {
    this.isInitialized = true;
    return true; // Return true so app thinks it worked
  }

  async requestPermission() {
    return { granted: true }; // Return true to avoid blocking UI flows
  }

  async getFCMToken() {
    return null;
  }

  async getExpoPushToken() {
    return null;
  }

  async registerTokenForUser(userId) {
    return true; // Return true to avoid blocking login flow
  }

  async removeTokenForUser(userId) {
    return true;
  }

  async getPermissionStatus() {
    return { granted: true };
  }

  async getUserNotificationPreferences(userId) {
    return {
      app: {},
      hosting: {},
      attending: {},
    };
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
    // Silent cleanup
  }
}

/**
 * Get the appropriate FCM service based on environment
 * Returns real FCM service in builds, fallback service in Expo Go
 */
function createFCMService() {
  if (isFirebaseAvailable()) {
    const { fcmService } = require('./fcmService');
    return fcmService;
  } else {
    // Silent fallback for Expo Go - no console logs to avoid noise
    return new FallbackFCMService();
  }
}

// Export the appropriate service
export const fcmService = createFCMService();
export default fcmService;

// Export utilities for debugging
export { isFirebaseAvailable };
