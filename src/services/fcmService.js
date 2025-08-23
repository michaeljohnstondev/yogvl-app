// FILE: services/fcmService.js - Firebase Cloud Messaging Service for Push Notifications

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../auth/services/firebase';

const STORAGE_KEYS = {
  FCM_TOKEN: 'fcm_token',
  PERMISSION_REQUESTED: 'notification_permission_requested',
};

class FCMService {
  constructor() {
    this.isInitialized = false;
    this.currentToken = null;
    this.navigationRef = null; // Will be set by App.js
  }

  /**
   * Initialize the FCM service
   * Call this once when the app starts up
   * Note: This is a placeholder implementation for React Native
   * Full FCM functionality requires native setup (google-services.json, etc.)
   */
  async initialize() {
    try {
      console.log('[FCMService] Initializing (React Native placeholder)...');

      // For React Native, FCM requires native configuration
      // This is a placeholder that doesn't break the app
      console.log('[FCMService] FCM service initialized in placeholder mode');
      console.log('[FCMService] To enable push notifications:');
      console.log('[FCMService] 1. Add google-services.json (Android)');
      console.log('[FCMService] 2. Add GoogleService-Info.plist (iOS)');
      console.log('[FCMService] 3. Install @react-native-firebase/messaging');
      console.log('[FCMService] 4. Configure native platforms');

      this.isInitialized = true;
      console.log('[FCMService] Initialization complete (placeholder mode)');

      return true;
    } catch (error) {
      console.error('[FCMService] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Request notification permission from user
   * Placeholder implementation for React Native
   */
  async requestPermission() {
    try {
      console.log('[FCMService] Permission request (placeholder mode)');
      await AsyncStorage.setItem(STORAGE_KEYS.PERMISSION_REQUESTED, 'true');
      return true;
    } catch (error) {
      console.error('[FCMService] Permission request failed:', error);
      return false;
    }
  }

  /**
   * Get FCM token and store it
   * Placeholder implementation for React Native
   */
  async getFCMToken() {
    try {
      console.log('[FCMService] Getting FCM token (placeholder mode)');
      
      // Generate a placeholder token for development
      const placeholderToken = `placeholder_token_${Date.now()}`;
      
      // Store token locally
      await AsyncStorage.setItem(STORAGE_KEYS.FCM_TOKEN, placeholderToken);
      this.currentToken = placeholderToken;
      
      console.log('[FCMService] Placeholder token generated:', placeholderToken.substring(0, 20) + '...');
      return placeholderToken;
    } catch (error) {
      console.error('[FCMService] Failed to get FCM token:', error);
      return null;
    }
  }

  /**
   * Register user's FCM token with their Firebase user document
   */
  async registerTokenForUser(userId) {
    try {
      if (!userId) {
        console.warn('[FCMService] No user ID provided for token registration');
        return false;
      }

      const token = this.currentToken || await this.getFCMToken();
      if (!token) {
        console.warn('[FCMService] No FCM token available for registration');
        return false;
      }

      // Update user document with FCM token
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'deviceInfo.fcmToken': token,
        'deviceInfo.platform': Platform.OS,
        'deviceInfo.lastTokenUpdate': new Date(),
      });

      console.log('[FCMService] Token registered for user:', userId);
      return true;

    } catch (error) {
      console.error('[FCMService] Failed to register token for user:', error);
      return false;
    }
  }

  /**
   * Set navigation reference for deep linking
   */
  setNavigationRef(navigationRef) {
    this.navigationRef = navigationRef;
  }

  /**
   * Set up message handlers for foreground messages
   * Placeholder implementation for React Native
   */
  setupMessageHandlers() {
    console.log('[FCMService] Setting up message handlers (placeholder mode)');
    // In a real implementation, this would set up native FCM message handlers
  }

  /**
   * Handle messages received while app is in foreground
   */
  handleForegroundMessage(payload) {
    // For now, just log. You could show in-app notifications here
    console.log('[FCMService] Handling foreground message:', {
      title: payload.notification?.title,
      body: payload.notification?.body,
      data: payload.data,
    });

    // You might want to:
    // - Show a custom in-app notification
    // - Update badge count
    // - Trigger app state updates
    // - Play custom sounds
  }

  /**
   * Handle when user taps on a notification
   */
  handleNotificationTap(payload) {
    console.log('[FCMService] Handling notification tap:', {
      title: payload.notification?.title,
      body: payload.notification?.body,
      data: payload.data,
    });

    // Parse the data to determine navigation
    const { type, eventId, screen } = payload.data || {};
    
    // Navigate to appropriate screen
    this.navigateFromNotification({ type, eventId, screen });
  }

  /**
   * Navigate to appropriate screen based on notification data
   */
  navigateFromNotification({ type, eventId, screen }) {
    console.log('[FCMService] Navigation requested:', { type, eventId, screen });
    
    if (!this.navigationRef) {
      console.warn('[FCMService] Navigation ref not set, cannot navigate');
      return;
    }

    try {
      switch (type) {
        case 'event_reminder':
        case 'host_change':
        case 'comment':
          if (eventId) {
            this.navigationRef.navigate('EventDetail', { eventId });
          }
          break;
        
        case 'friend_added':
        case 'friend_followed':
          this.navigationRef.navigate('UserProfile');
          break;
        
        default:
          if (screen) {
            this.navigationRef.navigate(screen);
          }
          break;
      }
    } catch (error) {
      console.error('[FCMService] Navigation error:', error);
    }
  }

  /**
   * Get current notification permission status
   * Placeholder implementation for React Native
   */
  async getPermissionStatus() {
    try {
      // Return placeholder status - in real implementation this would check native permissions
      return { granted: true, provisional: false, denied: false, notDetermined: false };
    } catch (error) {
      console.error('[FCMService] Failed to get permission status:', error);
      return { granted: false, error: error.message };
    }
  }

  /**
   * Check if user has notifications enabled in their preferences
   */
  async getUserNotificationPreferences(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        console.warn('[FCMService] User document not found:', userId);
        return null;
      }

      const preferences = userSnap.data()?.userdata?.settings?.notifications;
      
      return {
        app: preferences?.app || {},
        hosting: preferences?.hosting || {},
        attending: preferences?.attending || {},
      };
    } catch (error) {
      console.error('[FCMService] Failed to get user notification preferences:', error);
      return null;
    }
  }

  /**
   * Remove FCM token when user logs out
   */
  async removeTokenForUser(userId) {
    try {
      if (!userId) return false;

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'deviceInfo.fcmToken': null,
        'deviceInfo.lastTokenUpdate': new Date(),
      });

      // Clear local storage
      await AsyncStorage.removeItem(STORAGE_KEYS.FCM_TOKEN);
      this.currentToken = null;

      console.log('[FCMService] Token removed for user:', userId);
      return true;

    } catch (error) {
      console.error('[FCMService] Failed to remove token for user:', error);
      return false;
    }
  }

  /**
   * Get current FCM token
   */
  getCurrentToken() {
    return this.currentToken;
  }

  /**
   * Check if service is initialized
   */
  isReady() {
    return this.isInitialized;
  }
}

// Export singleton instance
export const fcmService = new FCMService();
export default fcmService;