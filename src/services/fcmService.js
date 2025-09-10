// FILE: services/fcmService.js - Firebase Cloud Messaging Service for Push Notifications

import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../auth/services/firebase';

const STORAGE_KEYS = {
  FCM_TOKEN: 'fcm_push_token',
  PERMISSION_REQUESTED: 'notification_permission_requested',
};

// Configure Firebase messaging for background message handling
try {
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('[FCMService] Message handled in the background!', remoteMessage);
    // Handle background notification here if needed
  });
} catch (error) {
  console.warn('[FCMService] Failed to set background message handler:', error);
}

class FCMService {
  constructor() {
    this.isInitialized = false;
    this.currentToken = null;
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
      console.log('[FCMService] Firebase messaging service initialized successfully');

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
    this.foregroundListener = messaging().onMessage(async remoteMessage => {
      console.log('[FCMService] Foreground message received:', remoteMessage);
      this.handleForegroundMessage(remoteMessage);
    });

    // Listener for when user taps on notification (app was in background)
    this.notificationOpenedListener = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('[FCMService] Notification opened app:', remoteMessage);
      if (remoteMessage?.data) {
        this.navigateFromNotification(remoteMessage.data);
      }
    });

    // Check if app was opened from a notification (app was quit)
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('[FCMService] App opened from notification:', remoteMessage);
          if (remoteMessage?.data) {
            // Delay navigation to allow app to fully initialize
            setTimeout(() => {
              this.navigateFromNotification(remoteMessage.data);
            }, 1000);
          }
        }
      });

    console.log('[FCMService] Firebase message listeners set up');
  }

  /**
   * Request notification permission from user using Firebase messaging
   * Returns the permission status
   */
  async requestPermission() {
    try {
      console.log('[FCMService] Requesting notification permission...');

      if (!Device.isDevice) {
        console.warn('[FCMService] Must use physical device for push notifications');
        return { granted: false, error: 'Physical device required' };
      }

      let authStatus;
      
      if (Platform.OS === 'ios') {
        // Request permission for iOS
        authStatus = await messaging().requestPermission();
        
        const granted = 
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;
          
        // Store that we've requested permission
        await AsyncStorage.setItem(STORAGE_KEYS.PERMISSION_REQUESTED, 'true');

        console.log('[FCMService] iOS permission result:', authStatus, 'granted:', granted);
        
        return { 
          granted, 
          status: authStatus,
          provisional: authStatus === messaging.AuthorizationStatus.PROVISIONAL 
        };
      } else {
        // Android - check if permission is already granted
        authStatus = await messaging().hasPermission();
        const granted = authStatus === messaging.AuthorizationStatus.AUTHORIZED;
        
        if (!granted) {
          // Request permission for Android
          authStatus = await messaging().requestPermission();
        }
        
        const finalGranted = authStatus === messaging.AuthorizationStatus.AUTHORIZED;
        
        // Store that we've requested permission
        await AsyncStorage.setItem(STORAGE_KEYS.PERMISSION_REQUESTED, 'true');

        console.log('[FCMService] Android permission result:', authStatus, 'granted:', finalGranted);
        
        return { 
          granted: finalGranted, 
          status: authStatus,
          provisional: false 
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
        console.warn('[FCMService] Must use physical device for push notifications');
        return null;
      }

      // Get the FCM registration token
      const token = await messaging().getToken();

      if (token) {
        console.log('[FCMService] FCM token obtained successfully');
        
        // Store token locally
        await AsyncStorage.setItem(STORAGE_KEYS.FCM_TOKEN, token);
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
      const token = this.currentToken || await this.getFCMToken();
      if (!token) {
        console.warn('[FCMService] No FCM token available for registration');
        return false;
      }

      // Update user document with push token
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'deviceInfo.fcmToken': token,
        'deviceInfo.expoPushToken': token, // Keep compatibility with existing code
        'deviceInfo.platform': Platform.OS,
        'deviceInfo.lastTokenUpdate': new Date(),
        'deviceInfo.notificationsEnabled': true,
      });

      return true;

    } catch (error) {
      console.error('[FCMService] Failed to register token for user:', error);
      return false;
    }
  }

  /**
   * Handle messages received when app is in foreground
   */
  handleForegroundMessage(remoteMessage) {
    console.log('[FCMService] Foreground message received:', {
      title: remoteMessage.notification?.title,
      body: remoteMessage.notification?.body,
      data: remoteMessage.data,
    });

    // Firebase automatically displays the notification in foreground
    // DO NOT navigate or trigger any state changes here to avoid screen resets
    // Navigation only happens when user taps the notification
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
    if (now - this.lastNavigationTime < 1000) { // 1 second cooldown
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
          } else {
            this.navigationRef.navigate('SocialListScreen');
          }
          break;

        case 'invitation_received':
          if (eventId) {
            this.navigationRef.navigate('EventDetail', { eventId });
          } else {
            this.navigationRef.navigate('InvitationsScreen');
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
          } else {
            this.navigationRef.navigate('HomeScreen');
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
      const granted = authStatus === messaging.AuthorizationStatus.AUTHORIZED;
      
      return { 
        granted, 
        status: authStatus,
        provisional: authStatus === messaging.AuthorizationStatus.PROVISIONAL,
        denied: authStatus === messaging.AuthorizationStatus.DENIED,
        notDetermined: authStatus === messaging.AuthorizationStatus.NOT_DETERMINED
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
      console.error('[FCMService] Failed to get user notification preferences:', error);
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
        'deviceInfo.expoPushToken': null, // Keep compatibility
        'deviceInfo.notificationsEnabled': false,
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