// FILE: services/fcmService.js - Firebase Cloud Messaging Service for Push Notifications
//
// ⚠️  WARNING: DO NOT USE expo-notifications IN THIS PROJECT
// ⚠️  Use Firebase Cloud Messaging (@react-native-firebase/messaging) ONLY
// ⚠️  Foreground notifications should be handled through FCM, not expo-notifications
//

import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging'; // MODIFIED: Removed FirebaseMessagingTypes
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { doc, updateDoc, getDoc } from '../lib/firebase';
import { db } from '../auth/services/firebase';
import { notificationDisplayService } from './notificationDisplayService';
import { notificationEngine } from './shared/NotificationEngine';

const STORAGE_KEYS = {
  FCM_TOKEN: 'fcm_push_token',
  PERMISSION_REQUESTED: 'notification_permission_requested',
};


// Configure Firebase messaging for background message handling
try {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log(
      '[FCMService] Message handled in the background!',
      remoteMessage
    );
    // Handle background notification here if needed
  });
} catch (error) {
  console.warn('[FCMService] Failed to set background message handler:', error);
}

class FCMService {
  constructor() {
    this.isInitialized = false;
    this.currentToken = null;
    this.currentUserId = null;
    this.navigationRef = null;
    this.foregroundListener = null;
    this.notificationOpenedListener = null;
    this.lastNavigationTime = 0;
  }

  /**
   * Initialize the Firebase messaging service
   * Sets up message handlers and listeners
   */
  async initialize() {
    try {
      console.log('[FCMService] Initializing Firebase messaging service...');

      // Note: FCM handles notification channels automatically

      // Request permission for iOS (Android permissions are handled automatically)
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED || // MODIFIED
          authStatus === messaging.AuthorizationStatus.PROVISIONAL; // MODIFIED

        if (!enabled) {
          console.warn('[FCMService] iOS notification permission not granted');
        }
      }

      // Set up Firebase message listeners
      this.setupFirebaseListeners();

      this.isInitialized = true;
      console.log(
        '[FCMService] Firebase messaging service initialized successfully'
      );

      return true;
    } catch (error) {
      console.error('[FCMService] Initialization failed:', error);
      return false;
    }
  }


  /**
   * Set up Firebase message listeners for foreground and tap handling
   */
  setupFirebaseListeners() {
    // Listener for messages received while app is in foreground
    this.foregroundListener = messaging().onMessage(async (remoteMessage) => {
      console.log('[FCMService] Foreground message received:', remoteMessage);
      this.handleForegroundMessage(remoteMessage);
    });

    // Listener for when user taps on notification (app was in background)
    this.notificationOpenedListener = messaging().onNotificationOpenedApp(
      (remoteMessage) => {
        console.log('[FCMService] Notification opened app:', remoteMessage);
        if (remoteMessage?.data) {
          this.navigateFromNotification(remoteMessage.data);
        }
      }
    );

    // Check if app was opened from a notification (app was quit)
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log(
            '[FCMService] App opened from notification:',
            remoteMessage
          );
          if (remoteMessage?.data) {
            // Delay navigation to allow app to fully initialize
            setTimeout(() => {
              this.navigateFromNotification(remoteMessage.data);
            }, 1000);
          }
        }
      });

    // Note: Notification tap handling is managed by FCM onNotificationOpenedApp listener above

    console.log('[FCMService] Firebase notification listeners set up');
  }

  /**
   * Request notification permission from user using Firebase messaging
   * Returns the permission status
   */
  async requestPermission() {
    try {
      console.log('[FCMService] Requesting notification permission...');

      if (!Device.isDevice) {
        console.warn(
          '[FCMService] Must use physical device for push notifications'
        );
        return { granted: false, error: 'Physical device required' };
      }

      let authStatus;

      if (Platform.OS === 'ios') {
        // Request permission for iOS
        authStatus = await messaging().requestPermission();

        const granted =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED || // MODIFIED
          authStatus === messaging.AuthorizationStatus.PROVISIONAL; // MODIFIED

        // Store that we've requested permission securely
        await SecureStore.setItemAsync(
          STORAGE_KEYS.PERMISSION_REQUESTED,
          'true'
        );

        console.log(
          '[FCMService] iOS permission result:',
          authStatus,
          'granted:',
          granted
        );

        return {
          granted,
          status: authStatus,
          provisional: authStatus === messaging.AuthorizationStatus.PROVISIONAL, // MODIFIED
        };
      } else {
        // Android - check if permission is already granted
        authStatus = await messaging().hasPermission();
        const granted = authStatus === messaging.AuthorizationStatus.AUTHORIZED; // MODIFIED

        if (!granted) {
          // Request permission for Android
          authStatus = await messaging().requestPermission();
        }

        const finalGranted =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED; // MODIFIED

        // Store that we've requested permission securely
        await SecureStore.setItemAsync(
          STORAGE_KEYS.PERMISSION_REQUESTED,
          'true'
        );

        console.log(
          '[FCMService] Android permission result:',
          authStatus,
          'granted:',
          finalGranted
        );

        return {
          granted: finalGranted,
          status: authStatus,
          provisional: false,
        };
      }
    } catch (error) {
      console.error('[FCMService] Permission request failed:', error);
      return { granted: false, error: error.message };
    }
  }

  /**
   * Get Firebase Cloud Messaging token
   * This is the token used to send notifications to this device
   */
  async getFCMToken() {
    try {
      console.log('[FCMService] Getting FCM token...');

      if (!Device.isDevice) {
        console.warn(
          '[FCMService] Must use physical device for push notifications'
        );
        return null;
      }

      // Get the FCM registration token
      const token = await messaging().getToken();

      if (token) {
        console.log('[FCMService] FCM token obtained successfully');

        // Store token securely with encryption
        await SecureStore.setItemAsync(STORAGE_KEYS.FCM_TOKEN, token);
        this.currentToken = token;

        return token;
      } else {
        console.warn('[FCMService] No FCM token received');
        return null;
      }
    } catch (error) {
      console.error('[FCMService] Failed to get FCM token:', error);
      return null;
    }
  }

  /**
   * Get cached FCM token (legacy method name for compatibility)
   */
  async getExpoPushToken() {
    return this.getFCMToken();
  }

  /**
   * Register user's push token with their Firebase user document
   * Only updates if token has actually changed to reduce Firestore writes
   */
  async registerTokenForUser(userId) {
    try {
      if (!userId) {
        console.warn('[FCMService] No user ID provided for token registration');
        return false;
      }

      // First request permission
      const permissionResult = await this.requestPermission();
      if (!permissionResult.granted) {
        console.warn('[FCMService] Notification permission not granted');
        return false;
      }

      // Get push token
      const token = this.currentToken || (await this.getFCMToken());
      if (!token) {
        console.warn('[FCMService] No FCM token available for registration');
        return false;
      }

      // Check if token has changed before updating
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const currentToken = userDoc.data()?.deviceInfo?.fcmToken;
        const currentPlatform = userDoc.data()?.deviceInfo?.platform;

        // Only update if token or platform changed
        if (currentToken === token && currentPlatform === Platform.OS) {
          console.log('[FCMService] Token unchanged, skipping update');
          return true;
        }
      }

      // Update user document with push token (only when changed)
      await updateDoc(userRef, {
        'deviceInfo.fcmToken': token,
        'deviceInfo.platform': Platform.OS,
        'deviceInfo.lastTokenUpdate': new Date(),
        'deviceInfo.notificationsEnabled': true,
        // Remove legacy expoPushToken field - no longer needed
      });

      console.log('[FCMService] FCM token updated for user:', userId);

      // Store current user ID for foreground notification storage
      this.currentUserId = userId;

      return true;
    } catch (error) {
      console.error('[FCMService] Failed to register token for user:', error);
      return false;
    }
  }

  /**
   * Handle messages received when app is in foreground
   * Uses NotificationDisplayService to show VibeAlert banners
   * Also stores notification in dashboard for later viewing
   */
  async handleForegroundMessage(remoteMessage) {
    console.log('[FCMService] Foreground message received:', {
      title: remoteMessage.notification?.title,
      body: remoteMessage.notification?.body,
      data: remoteMessage.data,
    });

    try {
      // Display notification banner using VibeAlert system
      const displaySuccess = notificationDisplayService.displayWithNavigation(
        remoteMessage,
        (data) => this.navigateFromNotification(data)
      );

      // Store notification in dashboard for later viewing
      await this.storeForegroundNotificationInDashboard(remoteMessage);

      if (!displaySuccess) {
        console.warn('[FCMService] Failed to display foreground notification banner');

        // Fallback: Store message data for potential navigation handling
        if (remoteMessage.data) {
          this.lastNotificationData = remoteMessage.data;
        }
      }
    } catch (error) {
      console.error('[FCMService] Error handling foreground message:', error);

      // Store message data as fallback
      if (remoteMessage.data) {
        this.lastNotificationData = remoteMessage.data;
      }
    }
  }

  /**
   * Store foreground notification in dashboard
   * This ensures users can see all notifications even if they missed the banner
   */
  async storeForegroundNotificationInDashboard(remoteMessage) {
    try {
      // Extract notification details
      const title = remoteMessage.notification?.title || remoteMessage.data?.title || 'Notification';
      const message = remoteMessage.notification?.body || remoteMessage.data?.message || remoteMessage.data?.body || '';
      const type = remoteMessage.data?.type || 'info';

      // Get current user ID (we can't determine user from FCM message alone)
      // This will be set when user logs in via registerTokenForUser
      if (!this.currentUserId) {
        console.warn('[FCMService] Cannot store foreground notification - no current user ID');
        return;
      }

      // Store in notification dashboard using NotificationEngine
      const storeResult = await notificationEngine.storeInAppNotification({
        userId: this.currentUserId,
        type: type,
        title: title,
        message: message,
        data: remoteMessage.data || {},
        priority: 'normal',
      });

      console.log('[FCMService] Foreground notification stored in dashboard:', storeResult);
    } catch (error) {
      console.error('[FCMService] Failed to store foreground notification in dashboard:', error);
    }
  }

  /**
   * Navigate to appropriate screen based on notification data
   */
  navigateFromNotification(data) {
    console.log('[FCMService] Navigation requested:', data);

    if (!this.navigationRef) {
      console.warn('[FCMService] Navigation ref not set, cannot navigate');
      return;
    }

    // Prevent rapid navigation calls that can cause screen resets
    const now = Date.now();
    if (now - this.lastNavigationTime < 1000) {
      // 1 second cooldown
      console.log('[FCMService] Skipping navigation due to recent navigation');
      return;
    }
    this.lastNavigationTime = now;

    try {
      const { type, eventId, screen, userId } = data;

      switch (type) {
        case 'event_reminder':
        case 'event_updated':
        case 'event_comment':
          if (eventId) {
            this.navigationRef.navigate('EventDetail', { eventId });
          }
          break;

        case 'follow_notification':
        case 'mutual_follow':
          if (userId) {
            this.navigationRef.navigate('UserProfile', { userId });
          }
          break;

        case 'invitation_received':
          if (eventId) {
            this.navigationRef.navigate('EventDetail', { eventId });
          }
          break;

        case 'admin_notification':
          // Navigate to notifications screen for admin messages
          this.navigationRef.navigate('Notifications');
          break;

        case 'ban_notification':
          // Navigate to home where banned modal will show
          this.navigationRef.navigate('Home');
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
   * Set navigation reference for deep linking
   */
  setNavigationRef(navigationRef) {
    this.navigationRef = navigationRef;
  }

  /**
   * Get current notification permission status using Firebase messaging
   */
  async getPermissionStatus() {
    try {
      const authStatus = await messaging().hasPermission();
      const granted = authStatus === messaging.AuthorizationStatus.AUTHORIZED; // MODIFIED

      return {
        granted,
        status: authStatus,
        provisional: authStatus === messaging.AuthorizationStatus.PROVISIONAL, // MODIFIED
        denied: authStatus === messaging.AuthorizationStatus.DENIED, // MODIFIED
        notDetermined:
          authStatus === messaging.AuthorizationStatus.NOT_DETERMINED, // MODIFIED
      };
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
      console.error(
        '[FCMService] Failed to get user notification preferences:',
        error
      );
      return null;
    }
  }

  /**
   * Remove push token when user logs out
   */
  async removeTokenForUser(userId) {
    try {
      if (!userId) return false;

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'deviceInfo.fcmToken': null,
        'deviceInfo.notificationsEnabled': false,
        'deviceInfo.lastTokenUpdate': new Date(),
      });

      // Clear secure storage
      await SecureStore.deleteItemAsync(STORAGE_KEYS.FCM_TOKEN);
      this.currentToken = null;
      this.currentUserId = null;

      console.log('[FCMService] Token removed for user:', userId);
      return true;
    } catch (error) {
      console.error('[FCMService] Failed to remove token for user:', error);
      return false;
    }
  }

  // Local notification method removed - using FCM push notifications only

  /**
   * Get current push token
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

  /**
   * Clean up Firebase listeners when app is closed
   */
  cleanup() {
    if (this.foregroundListener) {
      this.foregroundListener();
    }
    if (this.notificationOpenedListener) {
      this.notificationOpenedListener();
    }
    console.log('[FCMService] Firebase messaging cleanup complete');
  }
}

// Export singleton instance
export const fcmService = new FCMService();
export default fcmService;
