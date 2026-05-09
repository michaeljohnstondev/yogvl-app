// FILE: services/fcmService.js - Firebase Cloud Messaging Service for Push Notifications
//
// ⚠️  WARNING: DO NOT USE expo-notifications IN THIS PROJECT
// ⚠️  Use Firebase Cloud Messaging (@react-native-firebase/messaging) ONLY
// ⚠️  Foreground notifications should be handled through FCM, not expo-notifications
//

import { Platform, AppState } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  PENDING_NOTIFICATION: 'pending_notification_action',
  CURRENT_USER_ID: 'fcm_current_user_id',
};

// Configure Firebase messaging for background message handling
try {
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('[FCMService] 📱 Background message received');
    console.log('[FCMService] Type:', remoteMessage?.data?.type);
    console.log('[FCMService] Event ID:', remoteMessage?.data?.eventId);

    // Store notification data for when app opens
    if (remoteMessage?.data) {
      try {
        await SecureStore.setItemAsync(
          STORAGE_KEYS.PENDING_NOTIFICATION,
          JSON.stringify(remoteMessage.data)
        );
        console.log(`[FCMService] ✅ Stored ${remoteMessage.data.type} notification for app launch`);
      } catch (error) {
        console.error('[FCMService] Failed to store pending notification:', error);
      }
    }

    // Mirror the notification into the user's in-app dashboard so the
    // bell icon / notification list stays in sync even when the app
    // wasn't open. Foreground messages already write via NotificationEngine
    // in handleForegroundMessage; this covers the background/closed case.
    try {
      const userId = await SecureStore.getItemAsync(STORAGE_KEYS.CURRENT_USER_ID);
      if (!userId) {
        console.log('[FCMService] No stored userId — skipping background in-app dashboard write');
        return;
      }

      const title = remoteMessage?.notification?.title
        || remoteMessage?.data?.title
        || 'Notification';
      const message = remoteMessage?.notification?.body
        || remoteMessage?.data?.message
        || remoteMessage?.data?.body
        || '';
      if (title === 'Notification' && message === '') return;

      const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(db, 'users', userId, 'notifications'), {
        type: remoteMessage?.data?.type || 'info',
        title,
        message,
        data: remoteMessage?.data || {},
        read: false,
        createdAt: serverTimestamp(),
      });
      console.log('[FCMService] ✅ Wrote background notification to in-app dashboard');
    } catch (error) {
      console.error('[FCMService] Failed to write background notification to in-app dashboard:', error);
    }
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
    this.pendingNavigation = null;
    this.initialNotification = null;
    this.foregroundListener = null;
    this.notificationOpenedListener = null;
    this.lastNavigationTime = 0;
    this.pendingNotifications = []; // Queue for notifications received before user login
    this.isAuthReady = false; // Track if auth is complete
    this.authReadyCallbacks = []; // Callbacks to run when auth is ready
  }

  /**
   * Initialize the Firebase messaging service
   * Sets up message handlers and listeners
   * NOTE: Does NOT request permission - that happens contextually via notificationPermissionService
   */
  async initialize() {
    try {

      // Note: FCM handles notification channels automatically

      // DO NOT request permission here - it will be requested contextually
      // when user creates/joins events, shows interest, or follows users
      // This provides better UX following iOS/Android best practices

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
      // Store notification data for potential app restart (within 5 minutes)
      if (remoteMessage?.data) {
        try {
          await AsyncStorage.setItem(
            STORAGE_KEYS.PENDING_NOTIFICATION,
            JSON.stringify({
              data: remoteMessage.data,
              timestamp: Date.now()
            })
          );
        } catch (error) {
          console.error('[FCMService] Failed to store notification:', error);
        }
      }
      this.handleForegroundMessage(remoteMessage);
    });

    // Listener for when user taps on notification (app was in background)
    this.notificationOpenedListener = messaging().onNotificationOpenedApp(
      async (remoteMessage) => {
        if (remoteMessage?.data) {
          // Store notification with timestamp for potential app restart
          try {
            await AsyncStorage.setItem(
              STORAGE_KEYS.PENDING_NOTIFICATION,
              JSON.stringify({
                data: remoteMessage.data,
                timestamp: Date.now()
              })
            );
          } catch (error) {
            console.error('[FCMService] Failed to store notification:', error);
          }
          this.navigateFromNotification(remoteMessage.data);
        }
      }
    );

    // Check if app was opened from a notification (app was quit)
    messaging().getInitialNotification()
      .then(async (remoteMessage) => {
        if (remoteMessage?.data) {
          // Store initial notification to process after navigation is ready
          this.initialNotification = remoteMessage.data;
        } else {
          // Fallback: Check if we stored a notification
          try {
            const storedItem = await SecureStore.getItemAsync(STORAGE_KEYS.PENDING_NOTIFICATION);
            if (storedItem) {
              const notificationData = JSON.parse(storedItem);
              this.initialNotification = notificationData;
              // Always clear the stored notification
              await SecureStore.deleteItemAsync(STORAGE_KEYS.PENDING_NOTIFICATION);
            }
          } catch (error) {
            console.error('[FCMService] Error checking stored notification:', error);
          }
        }
      })
      .catch((error) => {
        console.error('[FCMService] Error getting initial notification:', error);
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
      console.log('[FCMService] 🔍 getFCMToken called');
      console.log('[FCMService] Device.isDevice:', Device.isDevice);
      console.log('[FCMService] Platform.OS:', Platform.OS);

      if (!Device.isDevice) {
        console.warn(
          '[FCMService] Must use physical device for push notifications'
        );
        return null;
      }

      // iOS requires registering device for remote messages before getting token
      if (Platform.OS === 'ios') {
        console.log('[FCMService] 📱 Registering iOS device for remote messages...');
        await messaging().registerDeviceForRemoteMessages();
        console.log('[FCMService] ✅ iOS device registered for remote messages');
      }

      console.log('[FCMService] 📱 Requesting FCM token from Firebase...');

      // Get the FCM registration token
      const token = await messaging().getToken();

      console.log('[FCMService] Token received:', token ? `${token.substring(0, 20)}...` : 'NULL');

      if (token) {
        console.log('[FCMService] ✅ FCM token successfully received, length:', token.length);

        // Store token securely with encryption
        await SecureStore.setItemAsync(STORAGE_KEYS.FCM_TOKEN, token);
        this.currentToken = token;

        return token;
      } else {
        console.warn('[FCMService] ⚠️ No FCM token received from messaging().getToken()');
        console.warn('[FCMService] This usually means APNs is not configured or permission was denied');
        return null;
      }
    } catch (error) {
      console.error('[FCMService] ❌ Failed to get FCM token:', error);
      console.error('[FCMService] Error code:', error.code);
      console.error('[FCMService] Error message:', error.message);
      console.error('[FCMService] Error stack:', error.stack);

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

      // Set current user ID IMMEDIATELY so remote logging works even if token fails
      this.currentUserId = userId;

      // Persist for the background message handler (which can't access this instance)
      try {
        await SecureStore.setItemAsync(STORAGE_KEYS.CURRENT_USER_ID, userId);
      } catch (error) {
        console.warn('[FCMService] Failed to persist current userId:', error);
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
   * Remove FCM token from user document on logout
   * Prevents cross-account notification delivery bug
   */
  async removeTokenForUser(userId) {
    try {
      if (!userId) {
        console.warn('[FCMService] No user ID provided for token removal');
        return false;
      }

      console.log(`[FCMService] 🗑️  Removing FCM token for user ${userId}`);

      const userRef = doc(db, 'users', userId);

      // Remove FCM token from user document
      await updateDoc(userRef, {
        'deviceInfo.fcmToken': null,
        'deviceInfo.lastTokenUpdate': new Date(),
        'deviceInfo.notificationsEnabled': false,
      });

      // Clear local state
      this.currentUserId = null;
      this.currentToken = null;

      // Clear local storage
      try {
        await SecureStore.deleteItemAsync(STORAGE_KEYS.FCM_TOKEN);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.CURRENT_USER_ID);
        await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_NOTIFICATION);
        console.log('[FCMService] ✅ Cleared local FCM storage');
      } catch (storageError) {
        // Non-critical - continue even if storage clear fails
        console.warn('[FCMService] ⚠️  Failed to clear local storage:', storageError);
      }

      console.log(`[FCMService] ✅ Removed FCM token for user ${userId}`);
      return true;
    } catch (error) {
      console.error('[FCMService] ❌ Failed to remove token for user:', error);
      return false;
    }
  }

  /**
   * Handle messages received when app is in foreground
   * Uses NotificationDisplayService to show VibeAlert banners
   * Also stores notification in dashboard for later viewing
   */
  async handleForegroundMessage(remoteMessage) {
    console.log('[FCMService] handleForegroundMessage called');

    // ALWAYS store notification data for potential app restart (failsafe)
    if (remoteMessage?.data) {
      try {
        await AsyncStorage.setItem(
          STORAGE_KEYS.PENDING_NOTIFICATION,
          JSON.stringify({
            data: remoteMessage.data,
            timestamp: Date.now()
          })
        );
        console.log('[FCMService] ✅ Stored notification in handleForegroundMessage');
      } catch (error) {
        console.error('[FCMService] Failed to store notification:', error);
      }
    }

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

      // Skip storing blank notifications (both title is default and message is empty)
      if (title === 'Notification' && message === '') {
        console.log('[FCMService] ⚠️ Skipping blank notification - no meaningful content');
        console.log('[FCMService] Notification data:', JSON.stringify(remoteMessage, null, 2));
        return;
      }

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

      // Determine priority based on notification type
      let priority = 'normal';
      if (type === 'event_deleted' || type === 'event_cancelled') {
        priority = 'urgent'; // Red accent for cancelled events
      } else if (type === 'cohost_invitation' || type === 'event_reminder') {
        priority = 'high'; // Orange accent for important notifications
      }

      // For comment notifications, batch them by event
      if (type === 'host_comment' || type === 'guest_comment') {
        console.log(`[FCMService] 💬 Comment notification detected - type: ${type}`);
        const eventId = remoteMessage.data?.eventId;
        const eventTitle = remoteMessage.data?.eventTitle;

        console.log(`[FCMService] Event data - eventId: ${eventId}, eventTitle: ${eventTitle}`);

        if (eventId) {
          console.log(`[FCMService] ✅ Calling batchCommentNotificationInDashboard for event ${eventId}`);
          await this.batchCommentNotificationInDashboard({
            userId: this.currentUserId,
            eventId,
            eventTitle,
            type,
            priority,
            data: remoteMessage.data || {}
          });
          return;
        } else {
          console.log(`[FCMService] ⚠️ No eventId found, falling back to regular notification storage`);
        }
      }

      // Store in notification dashboard using NotificationEngine
      console.log(`[FCMService] 📝 Storing notification via NotificationEngine - type: ${type}, title: ${title}`);
      const storeResult = await notificationEngine.storeInAppNotification({
        userId: this.currentUserId,
        type: type,
        title: title,
        message: message,
        data: remoteMessage.data || {},
        priority: priority,
      });

    } catch (error) {
      console.error('[FCMService] Failed to store foreground notification in dashboard:', error);
    }
  }

  /**
   * Batch comment notifications by event in the dashboard
   * Updates existing notification or creates new one
   */
  async batchCommentNotificationInDashboard({ userId, eventId, eventTitle, type, priority, data }) {
    try {
      const { collection, query, where, getDocs, updateDoc, doc: firestoreDoc, setDoc, Timestamp } = await import('firebase/firestore');

      console.log(`[FCMService] 🔍 Checking for existing comment notifications for event ${eventId}`);

      // Check for existing unread comment notification for this event
      const notificationsRef = collection(db, 'users', userId, 'notifications');
      const q = query(
        notificationsRef,
        where('data.eventId', '==', eventId),
        where('type', 'in', ['host_comment', 'guest_comment']),
        where('read', '==', false)
      );

      const existingNotifs = await getDocs(q);

      console.log(`[FCMService] 📋 Found ${existingNotifs.size} existing unread comment notification(s) for event ${eventId}`);

      if (!existingNotifs.empty) {
        // Update existing notification with count
        const existingNotif = existingNotifs.docs[0];
        const existingData = existingNotif.data();
        const currentCount = existingData.data?.commentCount || 1;
        const newCount = currentCount + 1;

        console.log(`[FCMService] 📊 Batching comment notification - updating from ${currentCount} to ${newCount} messages for event ${eventId}`);

        await updateDoc(existingNotif.ref, {
          title: eventTitle,
          message: `${newCount} new message${newCount > 1 ? 's' : ''}`,
          'data.commentCount': newCount,
          createdAt: Timestamp.now(), // Update timestamp to keep it at top
        });

        console.log(`[FCMService] ✅ Updated existing notification to ${newCount} messages`);
      } else {
        // Create new notification
        console.log(`[FCMService] 📝 Creating new comment notification for event ${eventId}`);

        const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const notificationRef = firestoreDoc(notificationsRef, notificationId);

        await setDoc(notificationRef, {
          id: notificationId,
          type,
          title: eventTitle,
          message: '1 new message',
          data: {
            ...data,
            commentCount: 1
          },
          priority,
          read: false,
          createdAt: Timestamp.now(),
          expiresAt: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days
        });

        console.log(`[FCMService] ✅ Created new notification with ID ${notificationId}`);
      }
    } catch (error) {
      console.error('[FCMService] ❌ Failed to batch comment notification:', error);
      console.error('[FCMService] Error details:', error.message);
      console.error('[FCMService] Error stack:', error.stack);
    }
  }

  /**
   * Navigate to appropriate screen based on notification data
   * Supports both legacy navigation and new navigation stack pattern
   */
  async navigateFromNotification(data) {
    console.log('[FCMService] ========================================');
    console.log('[FCMService] 📍 navigateFromNotification called');
    console.log('[FCMService] ========================================');
    console.log('[FCMService] Full notification data:', JSON.stringify(data, null, 2));
    console.log('[FCMService] Notification type:', data?.type);
    console.log('[FCMService] Event ID:', data?.eventId);
    console.log('[FCMService] Screen:', data?.screen);

    // Guard: Ignore navigation if data is invalid or empty
    if (!data || (!data.type && !data.screen && !data.eventId)) {
      console.warn('[FCMService] ⚠️ Ignoring navigation - data is empty or invalid');
      // Clear any stale stored notifications
      try {
        await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_NOTIFICATION);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.PENDING_NOTIFICATION);
        console.log('[FCMService] ✅ Cleared stale notification storage');
      } catch (error) {
        // Ignore errors
      }
      return;
    }

    if (!this.navigationRef) {
      console.warn('[FCMService] ❌ Navigation ref not set, queueing navigation for later');
      this.pendingNavigation = { data };
      return;
    }

    console.log('[FCMService] ✅ Navigation ref is set, proceeding with navigation');
    console.log('[FCMService] Current navigation state:', this.navigationRef.getRootState());

    // Clear stored notification since we're handling it now
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_NOTIFICATION);
      console.log('[FCMService] Cleared stored notification');
    } catch (error) {
      // Ignore errors when clearing
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
        console.log('[FCMService] 📚 Using navigation stack pattern');
        this.handleNavigationStack(data);
        return;
      }

      // Legacy navigation handling (fallback)
      const { type, eventId, screen, userId, studioId } = data;
      console.log('[FCMService] 📱 Using legacy navigation pattern');
      console.log('[FCMService] Navigation data:', { type, eventId, screen, userId, studioId });

      switch (type) {
        case 'event_reminder':
        case 'event_updated':
        case 'event_comment':
          console.log('[FCMService] 🎯 Navigating to EventDetail for type:', type);
          if (eventId) {
            console.log('[FCMService] 🚀 Calling navigate("EventDetail", { eventId:', eventId, '})');
            this.navigationRef.navigate('EventDetail', { eventId });
            console.log('[FCMService] ✅ Navigate call completed');
          } else {
            console.warn('[FCMService] ⚠️ No eventId provided for', type);
          }
          break;

        case 'event_recap':
          console.log('[FCMService] 🎯 Navigating to EventWrapUp for event recap');
          if (eventId && studioId) {
            console.log('[FCMService] 🚀 Calling navigate("EventWrapUp", { eventId:', eventId, 'studioId:', studioId, '})');
            this.navigationRef.navigate('EventWrapUp', { eventId, studioId });
            console.log('[FCMService] ✅ Navigate call completed');
          } else {
            console.warn('[FCMService] ⚠️ Missing eventId or studioId for event_recap:', { eventId, studioId });
          }
          break;

        case 'follow_notification':
        case 'mutual_follow':
          console.log('[FCMService] 👤 Navigating to UserProfile for type:', type);
          if (userId) {
            console.log('[FCMService] 🚀 Calling navigate("UserProfile", { userId:', userId, '})');
            this.navigationRef.navigate('UserProfile', { userId });
            console.log('[FCMService] ✅ Navigate call completed');
          } else {
            console.warn('[FCMService] ⚠️ No userId provided for', type);
          }
          break;

        case 'invitation_received':
        case 'cohost_invitation':
          console.log('[FCMService] 💌 Navigating to EventDetail for invitation (type:', type, ')');
          if (eventId) {
            console.log('[FCMService] 🚀 Calling navigate("EventDetail", { eventId:', eventId, '})');
            this.navigationRef.navigate('EventDetail', { eventId });
            console.log('[FCMService] ✅ Navigate call completed');
          } else {
            console.warn('[FCMService] ⚠️ No eventId provided for invitation');
          }
          break;

        case 'interest_based_suggestion':
          console.log('[FCMService] 🎯 Interest-based suggestion - navigating to EventDetail:', eventId);
          if (eventId) {
            console.log('[FCMService] 🚀 Calling navigate("EventDetail", { eventId:', eventId, '})');
            this.navigationRef.navigate('EventDetail', { eventId });
            console.log('[FCMService] ✅ Navigation called for interest suggestion');
          } else {
            console.warn('[FCMService] ⚠️ No eventId in interest suggestion data');
          }
          break;

        case 'official_event':
          console.log('[FCMService] 🎪 Official event notification - navigating to EventDetail:', eventId);
          if (eventId) {
            console.log('[FCMService] 🚀 Calling navigate("EventDetail", { eventId:', eventId, '})');
            this.navigationRef.navigate('EventDetail', { eventId });
            console.log('[FCMService] ✅ Navigation called for official event');
          } else {
            console.warn('[FCMService] ⚠️ No eventId in official event data');
          }
          break;

        case 'admin_notification':
          console.log('[FCMService] 🔧 Navigating to Notifications for admin message');
          console.log('[FCMService] 🚀 Calling navigate("Notifications")');
          this.navigationRef.navigate('Notifications');
          console.log('[FCMService] ✅ Navigate call completed');
          break;

        case 'ban_notification':
          console.log('[FCMService] 🚫 Navigating to Home for ban notification');
          console.log('[FCMService] 🚀 Calling navigate("Home")');
          this.navigationRef.navigate('Home');
          console.log('[FCMService] ✅ Navigate call completed');
          break;

        default:
          console.log('[FCMService] ❓ Unknown notification type:', type);
          if (screen) {
            console.log('[FCMService] 🚀 Calling navigate with screen:', screen);
            this.navigationRef.navigate(screen);
            console.log('[FCMService] ✅ Navigate call completed');
          } else {
            console.warn('[FCMService] ⚠️ No screen provided for unknown type');
          }
          break;
      }
      console.log('[FCMService] ========================================');
      console.log('[FCMService] 📍 navigateFromNotification completed');
      console.log('[FCMService] ========================================');
    } catch (error) {
      console.error('[FCMService] ❌❌❌ Navigation error:', error);
      console.error('[FCMService] Error stack:', error.stack);
    }
  }

  /**
   * Handle new navigation stack pattern with resetStack and navigationStack
   */
  handleNavigationStack(data) {
    try {
      const screens = data.navigationStack.split(',').map(s => s.trim());

      console.log(`[FCMService] 📚 Navigation stack:`, screens);
      console.log(`[FCMService] 📦 Full data:`, JSON.stringify(data, null, 2));

      // Get the final screen in the navigation stack (destination)
      const finalScreen = screens[screens.length - 1];
      const params = this.getNavigationParams(finalScreen, data);

      console.log(`[FCMService] 🎯 Final destination: ${finalScreen}`);
      console.log(`[FCMService] 📋 Navigation params:`, JSON.stringify(params, null, 2));

      // Reset navigation stack to Home first
      console.log(`[FCMService] 🔄 Resetting navigation to Home...`);
      this.navigationRef.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });

      // Navigate directly to the final destination
      console.log(`[FCMService] 🚀 Navigating to ${finalScreen} with params:`, params);
      this.navigationRef.navigate(finalScreen, params);
      console.log(`[FCMService] ✅ Navigation to ${finalScreen} completed successfully`);

    } catch (error) {
      console.error('[FCMService] ❌ Navigation stack error:', error);
      console.error('[FCMService] Error stack:', error.stack);

      // Fallback to legacy navigation
      this.navigateFromNotification({ ...data, resetStack: undefined, navigationStack: undefined });
    }
  }

  /**
   * Get navigation parameters for each screen type
   */
  getNavigationParams(screen, data) {
    const notificationType = data.type || 'unknown';
    console.log(`[FCMService] 🔍 Getting params for ${screen}, notification type: ${notificationType}`);

    switch (screen) {
      case 'EventDetail':
        const params = {
          eventId: data.eventId,
          studioId: data.studioId,
          // If coming from a comment notification, pass comment data
          ...(data.commentId && {
            scrollToComment: data.commentId,
            openMessageBoard: true
          })
        };

        // Log invitation-specific navigation
        if (notificationType === 'cohost_invitation' || notificationType === 'event_invitation') {
          console.log(`[FCMService] 📨 ${notificationType} - navigating to event ${data.eventId}`);
        }

        return params;

      case 'UserProfile':
        return {
          userId: data.profileUserId || data.followerId || data.userId
        };

      case 'MessageBoard':
        return {
          eventId: data.eventId,
          eventTitle: data.eventTitle,
          ...(data.commentId && { scrollToComment: data.commentId })
        };

      case 'Home':
      default:
        return {};
    }
  }

  /**
   * Called when authentication is complete and user data is loaded
   * This signals that we can safely navigate
   */
  setAuthReady(userId) {
    this.isAuthReady = true;
    this.currentUserId = userId;

    // Execute any auth-ready callbacks
    this.authReadyCallbacks.forEach(callback => callback());
    this.authReadyCallbacks = [];

    // Try to execute initial notification if we have both navigation and auth ready
    this.tryExecuteInitialNotification();
  }

  /**
   * Set navigation reference for deep linking
   */
  setNavigationRef(navigationRef) {
    this.navigationRef = navigationRef;

    // Execute any pending navigation from background tap
    if (this.pendingNavigation) {
      const { data } = this.pendingNavigation;
      this.pendingNavigation = null;
      this.navigateFromNotification(data);
    }

    // Try to execute initial notification if we have both navigation and auth ready
    this.tryExecuteInitialNotification();
  }

  /**
   * Execute initial notification only when both navigation and auth are ready
   */
  tryExecuteInitialNotification() {
    if (this.initialNotification && this.navigationRef && this.isAuthReady) {
      const data = this.initialNotification;
      this.initialNotification = null;
      // Small delay to ensure everything is settled
      setTimeout(() => {
        this.navigateFromNotification(data);
      }, 500);
    }
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
        // Determine priority based on notification type
        let priority = 'normal';
        if (notification.type === 'event_deleted' || notification.type === 'event_cancelled') {
          priority = 'urgent'; // Red accent for cancelled events
        } else if (notification.type === 'cohost_invitation' || notification.type === 'event_reminder') {
          priority = 'high'; // Orange accent for important notifications
        }

        // For comment notifications, batch them by event
        if (notification.type === 'host_comment' || notification.type === 'guest_comment') {
          const eventId = notification.data?.eventId;
          const eventTitle = notification.data?.eventTitle;

          if (eventId) {
            await this.batchCommentNotificationInDashboard({
              userId: this.currentUserId,
              eventId,
              eventTitle,
              type: notification.type,
              priority,
              data: notification.data
            });
            continue;
          }
        }

        await notificationEngine.storeInAppNotification({
          userId: this.currentUserId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          priority: priority,
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
      await SecureStore.deleteItemAsync(STORAGE_KEYS.CURRENT_USER_ID);
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
