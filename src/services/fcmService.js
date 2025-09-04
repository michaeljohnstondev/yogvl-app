// FILE: services/fcmService.js - Expo Notifications Service for Push Notifications

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../auth/services/firebase';

const STORAGE_KEYS = {
  EXPO_TOKEN: 'expo_push_token',
  PERMISSION_REQUESTED: 'notification_permission_requested',
};

// Configure how notifications are handled when the app is in the foreground
// Wrap in try-catch to prevent startup crashes
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (error) {
  console.warn('[FCMService] Failed to set notification handler:', error);
}

class FCMService {
  constructor() {
    this.isInitialized = false;
    this.currentToken = null;
    this.navigationRef = null;
    this.notificationListener = null;
    this.responseListener = null;
    this.lastNavigationTime = 0;
  }

  /**
   * Initialize the notification service
   * Sets up notification channels and listeners
   */
  async initialize() {
    try {
      console.log('[FCMService] Initializing Expo Notifications...');

      // Set up Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#00D4FF',
          sound: true,
          enableVibrate: true,
        });

        // Create additional channels for different notification types
        await Notifications.setNotificationChannelAsync('event-reminders', {
          name: 'Event Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B35',
          sound: true,
        });

        await Notifications.setNotificationChannelAsync('social', {
          name: 'Social Updates',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 150, 150, 150],
          lightColor: '#00D4FF',
          sound: false,
        });
      }

      // Set up notification listeners
      this.setupNotificationListeners();

      this.isInitialized = true;
      console.log('[FCMService] Initialization complete');

      return true;
    } catch (error) {
      console.error('[FCMService] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Set up notification listeners for foreground and tap handling
   */
  setupNotificationListeners() {
    // Listener for notifications received while app is in foreground
    this.notificationListener = Notifications.addNotificationReceivedListener(
      this.handleForegroundNotification.bind(this)
    );

    // Listener for when user taps on notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      this.handleNotificationResponse.bind(this)
    );

    console.log('[FCMService] Notification listeners set up');
  }

  /**
   * Request notification permission from user
   * Returns the permission status
   */
  async requestPermission() {
    try {
      console.log('[FCMService] Requesting notification permissions...');

      if (!Device.isDevice) {
        console.warn('[FCMService] Must use physical device for push notifications');
        return { granted: false, error: 'Physical device required' };
      }

      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      console.log('[FCMService] Permission status:', finalStatus);

      // Store that we've requested permission
      await AsyncStorage.setItem(STORAGE_KEYS.PERMISSION_REQUESTED, 'true');

      const isGranted = finalStatus === 'granted';
      return { 
        granted: isGranted, 
        status: finalStatus,
        provisional: finalStatus === 'provisional' 
      };

    } catch (error) {
      console.error('[FCMService] Permission request failed:', error);
      return { granted: false, error: error.message };
    }
  }

  /**
   * Get Expo push token
   * This is the token used to send notifications to this device
   */
  async getExpoPushToken() {
    try {
      console.log('[FCMService] Getting Expo push token...');

      if (!Device.isDevice) {
        console.warn('[FCMService] Must use physical device for push notifications');
        return null;
      }

      // Get the project ID from app config
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        console.error('[FCMService] No project ID found in config');
        return null;
      }

      // Get the push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: projectId,
      });

      const token = tokenData.data;
      console.log('[FCMService] Expo push token obtained:', token.substring(0, 20) + '...');

      // Store token locally
      await AsyncStorage.setItem(STORAGE_KEYS.EXPO_TOKEN, token);
      this.currentToken = token;

      return token;
    } catch (error) {
      console.error('[FCMService] Failed to get Expo push token:', error);
      return null;
    }
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
      const token = this.currentToken || await this.getExpoPushToken();
      if (!token) {
        console.warn('[FCMService] No push token available for registration');
        return false;
      }

      // Update user document with push token
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'deviceInfo.expoPushToken': token,
        'deviceInfo.platform': Platform.OS,
        'deviceInfo.lastTokenUpdate': new Date(),
        'deviceInfo.notificationsEnabled': true,
      });

      console.log('[FCMService] Token registered for user:', userId);
      return true;

    } catch (error) {
      console.error('[FCMService] Failed to register token for user:', error);
      return false;
    }
  }

  /**
   * Handle notifications received when app is in foreground
   */
  handleForegroundNotification(notification) {
    console.log('[FCMService] Foreground notification received:', {
      title: notification.request.content.title,
      body: notification.request.content.body,
      data: notification.request.content.data,
    });

    // The notification is automatically displayed by expo-notifications
    // DO NOT navigate or trigger any state changes here to avoid screen resets
    // Navigation only happens when user taps the notification (handleNotificationResponse)
  }

  /**
   * Handle when user taps on a notification
   */
  handleNotificationResponse(response) {
    console.log('[FCMService] Notification tapped:', {
      title: response.notification.request.content.title,
      body: response.notification.request.content.body,
      data: response.notification.request.content.data,
    });

    // Parse the data to determine navigation
    const data = response.notification.request.content.data || {};
    this.navigateFromNotification(data);
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
    console.log('[FCMService] Navigation reference set');
  }

  /**
   * Get current notification permission status
   */
  async getPermissionStatus() {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return { 
        granted: status === 'granted', 
        status,
        provisional: status === 'provisional',
        denied: status === 'denied',
        notDetermined: status === 'undetermined'
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
        'deviceInfo.expoPushToken': null,
        'deviceInfo.notificationsEnabled': false,
        'deviceInfo.lastTokenUpdate': new Date(),
      });

      // Clear local storage
      await AsyncStorage.removeItem(STORAGE_KEYS.EXPO_TOKEN);
      this.currentToken = null;

      console.log('[FCMService] Token removed for user:', userId);
      return true;

    } catch (error) {
      console.error('[FCMService] Failed to remove token for user:', error);
      return false;
    }
  }

  /**
   * Send a local notification (for testing)
   */
  async sendLocalNotification(title, body, data = {}) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: body,
          data: data,
          sound: true,
        },
        trigger: null, // Show immediately
      });
      console.log('[FCMService] Local notification sent');
    } catch (error) {
      console.error('[FCMService] Failed to send local notification:', error);
    }
  }

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
   * Clean up listeners when app is closed
   */
  cleanup() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
    console.log('[FCMService] Cleanup complete');
  }
}

// Export singleton instance
export const fcmService = new FCMService();
export default fcmService;