// FILE: services/fcmService.js - Firebase Cloud Messaging Service for Push Notifications
//
// ⚠️  WARNING: DO NOT USE expo-notifications IN THIS PROJECT
// ⚠️  Use Firebase Cloud Messaging (@react-native-firebase/messaging) ONLY
// ⚠️  Foreground notifications should be handled through FCM, not expo-notifications
//

import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
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
    this.pendingNotifications = []; // Queue for notifications received before user login
  }

  /**
   * Initialize the Firebase messaging service
   * Sets up message handlers and listeners
   */
  async initialize() {
    try {

      // Note: FCM handles notification channels automatically

      // Request permission for iOS (Android permissions are handled automatically)
      if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) {
          console.warn('[FCMService] iOS notification permission not granted');
        }
      }

      // Set up Firebase message listeners
      this.setupFirebaseListeners();

      this.isInitialized = true;

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
      this.handleForegroundMessage(remoteMessage);
    });

    // Listener for when user taps on notification (app was in background)
    this.notificationOpenedListener = messaging().onNotificationOpenedApp(
      (remoteMessage) => {
        if (remoteMessage?.data) {
          this.navigateFromNotification(remoteMessage.data);
        }
      }
    );

    // Check if app was opened from a notification (app was quit)
    messaging().getInitialNotification()
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

  }

  /**
   * Request notification permission from user using Firebase messaging
   * Returns the permission status
   */
  async requestPermission() {
    try {

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
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        // Store that we've requested permission securely
        await SecureStore.setItemAsync(
          STORAGE_KEYS.PERMISSION_REQUESTED,
          'true'
        );


        return {
          granted,
          status: authStatus,
          provisional: authStatus === messaging.AuthorizationStatus.PROVISIONAL,
        };
      } else {
        // Android - check if permission is already granted
        authStatus = await messaging().hasPermission();
        const granted = authStatus === messaging.AuthorizationStatus.AUTHORIZED;

        if (!granted) {
          // Request permission for Android
          authStatus = await messaging().requestPermission();
        }

        const finalGranted =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED;

        // Store that we've requested permission securely
        await SecureStore.setItemAsync(
          STORAGE_KEYS.PERMISSION_REQUESTED,
          'true'
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

      if (!Device.isDevice) {
        console.warn(
          '[FCMService] Must use physical device for push notifications'
        );
        return null;
      }

      // Get the FCM registration token
      const token = await messaging().getToken();

      if (token) {

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


      // Store current user ID for foreground notification storage
      this.currentUserId = userId;

      // Process any pending notifications that arrived before user login
      if (this.pendingNotifications.length > 0) {
        await this.processPendingNotifications();
      }

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
        console.log('[FCMService] Queuing notification - user not authenticated yet');
        this.pendingNotifications.push({
          title,
          message,
          type,
          data: remoteMessage.data || {},
          timestamp: new Date()
        });
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

    } catch (error) {
      console.error('[FCMService] Failed to store foreground notification in dashboard:', error);
    }
  }

  /**
   * Navigate to appropriate screen based on notification data
   * Supports both legacy navigation and new navigation stack pattern
   */
  navigateFromNotification(data) {

    if (!this.navigationRef) {
      console.warn('[FCMService] Navigation ref not set, cannot navigate');
      return;
    }

    // Prevent rapid navigation calls that can cause screen resets
    const now = Date.now();
    if (now - this.lastNavigationTime < 1000) {
      // 1 second cooldown
      return;
    }
    this.lastNavigationTime = now;

    try {
      // Check for new navigation stack pattern
      if (data.resetStack === 'true' && data.navigationStack) {
        this.handleNavigationStack(data);
        return;
      }

      // Legacy navigation handling (fallback)
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
   * Handle new navigation stack pattern with resetStack and navigationStack
   */
  handleNavigationStack(data) {
    try {
      const screens = data.navigationStack.split(',');

      // Get the final screen in the navigation stack (destination)
      const finalScreen = screens[screens.length - 1].trim();
      const params = this.getNavigationParams(finalScreen, data);

      console.log(`[FCMService] Navigating directly to final destination: ${finalScreen} with params:`, params);

      // Reset navigation stack to Home first
      this.navigationRef.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });

      // Navigate directly to the final destination
      this.navigationRef.navigate(finalScreen, params);

    } catch (error) {
      console.error('[FCMService] Navigation stack error:', error);

      // Fallback to legacy navigation
      this.navigateFromNotification({ ...data, resetStack: undefined, navigationStack: undefined });
    }
  }

  /**
   * Get navigation parameters for each screen type
   */
  getNavigationParams(screen, data) {
    switch (screen) {
      case 'EventDetail':
        return {
          eventId: data.eventId,
          studioId: data.studioId,
          // If coming from a comment notification, pass comment data
          ...(data.commentId && {
            scrollToComment: data.commentId,
            openMessageBoard: true
          })
        };

      case 'UserProfile':
        return {
          userId: data.profileUserId || data.followerId || data.userId
        };

      case 'MessageBoard':
        return {
          eventId: data.eventId,
          studioId: data.studioId,
          ...(data.commentId && { scrollToComment: data.commentId })
        };

      case 'Home':
      default:
        return {};
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
      const granted = authStatus === messaging.AuthorizationStatus.AUTHORIZED;

      return {
        granted,
        status: authStatus,
        provisional: authStatus === messaging.AuthorizationStatus.PROVISIONAL,
        denied: authStatus === messaging.AuthorizationStatus.DENIED,
        notDetermined:
          authStatus === messaging.AuthorizationStatus.NOT_DETERMINED,
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
   * Process notifications that arrived before user authentication
   * Called after successful token registration
   */
  async processPendingNotifications() {
    try {
      if (!this.currentUserId || this.pendingNotifications.length === 0) {
        return;
      }

      console.log(`[FCMService] Processing ${this.pendingNotifications.length} queued notifications`);

      for (const notification of this.pendingNotifications) {
        await notificationEngine.storeInAppNotification({
          userId: this.currentUserId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          priority: 'normal',
        });
      }

      // Clear the queue
      this.pendingNotifications = [];
    } catch (error) {
      console.error('[FCMService] Failed to process pending notifications:', error);
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

      // Clear any pending notifications
      this.pendingNotifications = [];

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
  }
}

// Export singleton instance
export const fcmService = new FCMService();
export default fcmService;
