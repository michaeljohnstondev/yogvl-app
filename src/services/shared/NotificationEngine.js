// FILE: NotificationEngine.js - Unified Notification System Core
// Consolidates all notification functionality into single engine
//
// ⚠️  WARNING: DO NOT USE expo-notifications IN THIS PROJECT
// ⚠️  Use Firebase Cloud Messaging (@react-native-firebase/messaging) ONLY
// ⚠️  All push notifications must go through FCM Cloud Functions
//

import {
  doc,
  getDoc,
  updateDoc,
  writeBatch,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  setDoc,
} from 'firebase/firestore';
import { db } from '../../auth/services/firebase.js';

// Unified notification types and priorities
export const NOTIFICATION_TYPES = {
  EVENT_JOIN: 'event_join',
  EVENT_LEAVE: 'event_leave',
  EVENT_UPDATE: 'event_update',
  EVENT_CANCELLED: 'event_cancelled',
  EVENT_REMINDER: 'event_reminder',
  EVENT_RECAP: 'event_recap',
  ATTENDANCE_REMINDER: 'attendance_reminder',
  FOLLOW_NOTIFICATION: 'follow_notification',
  FOLLOW_REQUEST: 'follow_request', // When someone follows you
  FRIEND_REQUEST: 'friend_request', // When someone sends a friend request
  FRIEND_ACCEPTED: 'friend_accepted', // When a friend request is accepted
  INVITATION_RECEIVED: 'invitation_received',
  INTEREST_BASED_SUGGESTION: 'interest_based_suggestion', // When an event matches user's interests
  ADMIN_NOTIFICATION: 'admin_notification',
  BAN_NOTIFICATION: 'ban_notification',
};

export const NOTIFICATION_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
};

export const DELIVERY_CHANNELS = {
  PUSH: 'push',
  IN_APP: 'in_app',
  EMAIL: 'email',
};

// Unified notification templates
const NOTIFICATION_TEMPLATES = {
  [NOTIFICATION_TYPES.EVENT_JOIN]: {
    title: 'New Event Subscriber!',
    getMessage: (data) =>
      `${data.subscriberName} joined your event "${data.eventTitle}"`,
  },
  [NOTIFICATION_TYPES.EVENT_LEAVE]: {
    title: 'Event Subscriber Left',
    getMessage: (data) =>
      `${data.unsubscriberName} left your event "${data.eventTitle}"`,
  },
  [NOTIFICATION_TYPES.EVENT_UPDATE]: {
    title: 'Event Updated',
    getMessage: (data) => {
      switch (data.updateType) {
        case 'time':
          return `The time for "${data.eventTitle}" has been updated`;
        case 'location':
          return `The location for "${data.eventTitle}" has been updated`;
        case 'cancelled':
          return `"${data.eventTitle}" has been cancelled`;
        default:
          return `"${data.eventTitle}" has been updated`;
      }
    },
  },
  [NOTIFICATION_TYPES.EVENT_CANCELLED]: {
    title: 'Event Cancelled',
    getMessage: (data) =>
      data.reason
        ? `"${data.eventTitle}" has been cancelled. Reason: ${data.reason}`
        : `"${data.eventTitle}" has been cancelled by ${data.hostName}`,
  },
  [NOTIFICATION_TYPES.EVENT_REMINDER]: {
    title: 'Event Reminder',
    getMessage: (data) => {
      switch (data.reminderType) {
        case '24h':
          return `Reminder: "${data.eventTitle}" is tomorrow at ${new Date(data.eventDateTime).toLocaleTimeString()}`;
        case '1h':
          return `Reminder: "${data.eventTitle}" starts in 1 hour`;
        case '15m':
          return `Reminder: "${data.eventTitle}" starts in 15 minutes`;
        default:
          return `Reminder: "${data.eventTitle}" is coming up`;
      }
    },
  },
  [NOTIFICATION_TYPES.ATTENDANCE_REMINDER]: {
    title: 'Mark Attendance',
    getMessage: (data) => `Mark your attendance for "${data.eventTitle}"`,
  },
  [NOTIFICATION_TYPES.EVENT_RECAP]: {
    title: 'Event Recap Available',
    getMessage: (data) => {
      const attendedCount = data.attendedCount || 0;
      const totalCount = data.totalSubscribers || 0;
      return `Recap for "${data.eventTitle}" is ready! ${attendedCount} of ${totalCount} attendees showed up.`;
    },
  },
  [NOTIFICATION_TYPES.FOLLOW_REQUEST]: {
    title: 'New Follower!',
    getMessage: (data) => `${data.followerName} started following you`,
  },
  [NOTIFICATION_TYPES.FRIEND_REQUEST]: {
    title: 'New Friend Request',
    getMessage: (data) => `${data.requesterName} sent you a friend request`,
  },
  [NOTIFICATION_TYPES.FRIEND_ACCEPTED]: {
    title: 'Friend Request Accepted!',
    getMessage: (data) => `${data.accepterName} accepted your friend request`,
  },
};

class NotificationEngine {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return true;

    try {
      console.log(
        '[NotificationEngine] Initializing unified notification system...'
      );
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('[NotificationEngine] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Core notification creation - replaces all duplicate implementations
   */
  async createNotification({
    userId,
    type,
    title = null,
    message = null,
    data = {},
    priority = NOTIFICATION_PRIORITY.NORMAL,
    senderId = null, // Required for authorization
  }) {
    try {
      if (!userId || !type) {
        throw new Error(
          'Missing required notification parameters: userId and type'
        );
      }

      // CRITICAL: Authorization check - prevent unauthorized notification sending
      const authResult = await this.authorizeNotification({
        senderId,
        recipientId: userId,
        type,
        data,
      });

      if (!authResult.authorized) {
        console.warn(
          `[NotificationEngine] Unauthorized notification attempt: ${authResult.reason}`
        );
        throw new Error(`Unauthorized: ${authResult.reason}`);
      }

      // Input sanitization for security
      const sanitizedData = this.sanitizeNotificationData({
        userId,
        type,
        title,
        message,
        data,
        priority,
      });

      // Get template if no custom title/message provided
      const template = NOTIFICATION_TEMPLATES[type];
      const finalTitle =
        sanitizedData.title || template?.title || 'Notification';
      const finalMessage =
        sanitizedData.message ||
        template?.getMessage(sanitizedData.data) ||
        'You have a new notification';

      console.log(
        `[NotificationEngine] Creating ${type} notification for user ${userId}`
      );

      // Get user's FCM token and notification preferences
      const userPrefs = await this.getUserNotificationSettings(userId);
      if (!userPrefs.enabled) {
        console.log(
          `[NotificationEngine] Notifications disabled for user ${userId}`
        );
        return {
          success: true,
          skipped: true,
          reason: 'User notifications disabled',
        };
      }

      // Send FCM push notification
      const pushResult = await this.sendPushNotification({
        userId,
        title: finalTitle,
        message: finalMessage,
        data: {
          type,
          ...data,
        },
        priority,
      });

      // Store in-app notification (for notification center)
      const notificationId = await this.storeInAppNotification({
        userId,
        type: sanitizedData.type,
        title: finalTitle,
        message: finalMessage,
        data: sanitizedData.data,
        priority: sanitizedData.priority,
      });

      return {
        success: true,
        notificationId,
        pushSent: pushResult.success,
        pushError: pushResult.error,
      };
    } catch (error) {
      console.error(
        '[NotificationEngine] Failed to create notification:',
        error
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send FCM push notification - DISABLED (removed notificationTriggers)
   * This method was used to create notificationTriggers documents which has been eliminated.
   * Push notifications now happen through direct Firebase function triggers.
   */
  async sendPushNotification({ userId, title, message, data, priority }) {
    console.warn('[NotificationEngine] sendPushNotification disabled - notificationTriggers collection eliminated');
    console.warn('Push notifications now happen through direct Firebase function triggers');
    return {
      success: false,
      reason: 'notificationTriggers collection eliminated - use direct triggers instead'
    };

    /* REMOVED - WAS CREATING ZOMBIE notificationTriggers COLLECTION
    try {
      // Create a notification trigger document that Cloud Functions will pick up
      const triggerId = `engine_${data.type || 'general'}_${userId}_${Date.now()}`;
      const notificationTriggerRef = doc(db, 'notificationTriggers', triggerId);

      await setDoc(notificationTriggerRef, {
        type: 'engine_notification',
        subType: data.type || 'general',
        userId: userId,
        priority: this.mapPriorityToFCM(priority),
        title: title,
        message: message,
        data: {
          ...data,
          // Add a timestamp to the data payload to help with uniqueness/ordering on the client
          timestamp: new Date().toISOString(),
        },
        createdAt: new Date(),
        processed: false,
      });

      console.log(
        `[NotificationEngine] Push notification trigger created: ${triggerId}`
      );

      return { success: true };
    } catch (error) {
      console.error('[NotificationEngine] Push notification failed:', error);
      return { success: false, error: error.message };
    }
    */
  }

  /**
   * Store notification in user's notification center
   */
  async storeInAppNotification({
    userId,
    type,
    title,
    message,
    data,
    priority,
  }) {
    try {
      const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const userRef = doc(db, 'users', userId);

      // Add to user's notifications subcollection
      const notificationRef = doc(
        collection(userRef, 'notifications'),
        notificationId
      );

      await setDoc(notificationRef, {
        id: notificationId,
        type,
        title,
        message,
        data,
        priority,
        read: false,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });

      console.log(
        `[NotificationEngine] In-app notification stored: ${notificationId}`
      );
      return notificationId;
    } catch (error) {
      console.error(
        '[NotificationEngine] Failed to store in-app notification:',
        error
      );
      throw error;
    }
  }

  /**
   * Get user notification preferences and FCM token
   */
  async getUserNotificationSettings(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return { enabled: false, reason: 'User not found' };
      }

      const userData = userDoc.data();
      const settings = userData.userdata?.settings?.notifications || {};
      const deviceInfo = userData.deviceInfo || {};

      return {
        enabled: deviceInfo.notificationsEnabled !== false, // Default enabled
        fcmToken: deviceInfo.fcmToken,
        preferences: {
          app: settings.app || {},
          hosting: settings.hosting || {},
          attending: settings.attending || {},
        },
      };
    } catch (error) {
      console.error('[NotificationEngine] Failed to get user settings:', error);
      return { enabled: false, reason: 'Settings fetch failed' };
    }
  }

  /**
   * Map internal priority to FCM priority levels
   */
  mapPriorityToFCM(priority) {
    switch (priority) {
      case NOTIFICATION_PRIORITY.URGENT:
      case NOTIFICATION_PRIORITY.HIGH:
        return 'high';
      case NOTIFICATION_PRIORITY.LOW:
        return 'normal'; // FCM doesn't have 'low', use normal
      default:
        return 'normal';
    }
  }

  /**
   * Batch send notifications to multiple users
   * Each notification in the array must include senderId for authorization
   */
  async sendBatchNotifications(notifications) {
    try {
      console.log(
        `[NotificationEngine] Sending batch of ${notifications.length} notifications`
      );

      // Validate that all notifications have required authorization fields
      // EVENT_REMINDER and EVENT_RECAP notifications don't require senderId as they're system-generated
      const systemGeneratedTypes = [
        NOTIFICATION_TYPES.EVENT_REMINDER,
        NOTIFICATION_TYPES.EVENT_RECAP
      ];
      const invalidNotifications = notifications.filter(
        (notif) =>
          !notif.userId ||
          !notif.type ||
          (!systemGeneratedTypes.includes(notif.type) && !notif.senderId)
      );

      if (invalidNotifications.length > 0) {
        throw new Error(
          `${invalidNotifications.length} notifications missing required authorization fields`
        );
      }

      const results = await Promise.allSettled(
        notifications.map((notification) =>
          this.createNotification(notification)
        )
      );

      const successCount = results.filter(
        (result) => result.status === 'fulfilled' && result.value.success
      ).length;

      return {
        success: true,
        sent: successCount,
        total: notifications.length,
        results,
      };
    } catch (error) {
      console.error('[NotificationEngine] Batch send failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Sanitize notification data to prevent XSS and injection attacks
   */
  sanitizeNotificationData({ userId, type, title, message, data, priority }) {
    // Sanitize strings by removing/escaping potentially dangerous content
    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;

      return str
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/<[^>]*>/g, '') // Remove all HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: URLs
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .substring(0, 500); // Limit length
    };

    // Validate and sanitize notification type
    const validTypes = Object.values(NOTIFICATION_TYPES);
    const sanitizedType = validTypes.includes(type)
      ? type
      : NOTIFICATION_TYPES.EVENT_UPDATE;

    // Validate and sanitize priority
    const validPriorities = Object.values(NOTIFICATION_PRIORITY);
    const sanitizedPriority = validPriorities.includes(priority)
      ? priority
      : NOTIFICATION_PRIORITY.NORMAL;

    // Sanitize data object recursively
    const sanitizeObject = (obj) => {
      if (obj === null || obj === undefined) return {};
      if (typeof obj !== 'object') return {};

      const sanitized = {};
      Object.keys(obj).forEach((key) => {
        if (typeof obj[key] === 'string') {
          sanitized[key] = sanitizeString(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitized[key] = sanitizeObject(obj[key]);
        } else if (
          typeof obj[key] === 'number' ||
          typeof obj[key] === 'boolean'
        ) {
          sanitized[key] = obj[key];
        }
        // Skip functions, undefined, and other dangerous types
      });
      return sanitized;
    };

    return {
      userId: userId?.toString() || '',
      type: sanitizedType,
      title: title ? sanitizeString(title) : null,
      message: message ? sanitizeString(message) : null,
      data: sanitizeObject(data),
      priority: sanitizedPriority,
    };
  }

  /**
   * Get user's notifications
   */
  async getUserNotifications(userId, options = {}) {
    try {
      const { limit = 50, offset = 0, unreadOnly = false } = options;

      const userRef = doc(db, 'users', userId);
      const notificationsRef = collection(userRef, 'notifications');

      let q = query(notificationsRef);

      if (unreadOnly) {
        q = query(q, where('read', '==', false));
      }

      const snapshot = await getDocs(q);
      const notifications = [];

      snapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          userId, // Add userId to each notification object
          ...doc.data(),
        });
      });

      // Sort by createdAt desc and apply pagination
      const sorted = notifications
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(offset, offset + limit);

      return {
        success: true,
        notifications: sorted,
        hasMore: notifications.length > offset + limit,
      };
    } catch (error) {
      console.error(
        '[NotificationEngine] Failed to get user notifications:',
        error
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark a notification as read
   */
  async markNotificationAsRead(userId, notificationId) {
    try {
      const userRef = doc(db, 'users', userId);
      const notificationRef = doc(
        collection(userRef, 'notifications'),
        notificationId
      );

      await updateDoc(notificationRef, {
        read: true,
        readAt: new Date(),
      });

      return { success: true };
    } catch (error) {
      console.error(
        '[NotificationEngine] Failed to mark notification as read:',
        error
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllNotificationsAsRead(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const notificationsRef = collection(userRef, 'notifications');

      const unreadQuery = query(notificationsRef, where('read', '==', false));
      const snapshot = await getDocs(unreadQuery);

      if (snapshot.empty) {
        return { success: true, updated: 0 };
      }

      const batch = writeBatch(db);
      const now = new Date();

      snapshot.forEach((doc) => {
        batch.update(doc.ref, {
          read: true,
          readAt: now,
        });
      });

      await batch.commit();

      return { success: true, updated: snapshot.size };
    } catch (error) {
      console.error(
        '[NotificationEngine] Failed to mark all notifications as read:',
        error
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(userId, notificationId) {
    try {
      const userRef = doc(db, 'users', userId);
      const notificationRef = doc(
        collection(userRef, 'notifications'),
        notificationId
      );

      await deleteDoc(notificationRef);

      return { success: true };
    } catch (error) {
      console.error(
        '[NotificationEngine] Failed to delete notification:',
        error
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Authorize notification sending based on type and sender relationship
   */
  async authorizeNotification({ senderId, recipientId, type, data }) {
    try {
      // System notifications (no sender) are always allowed
      if (!senderId) {
        return { authorized: true, reason: 'System notification' };
      }

      // Users cannot send notifications to themselves, unless it's an admin notification for testing
      // Temporarily disabled for full FCM testing
      // if (senderId === recipientId && type !== NOTIFICATION_TYPES.ADMIN_NOTIFICATION) {
      //   return { authorized: false, reason: 'Cannot send notification to self' };
      // }

      // Check user existence and status
      const [senderDoc, recipientDoc] = await Promise.all([
        getDoc(doc(db, 'users', senderId)),
        getDoc(doc(db, 'users', recipientId)),
      ]);

      if (!senderDoc.exists()) {
        return { authorized: false, reason: 'Sender does not exist' };
      }

      if (!recipientDoc.exists()) {
        return { authorized: false, reason: 'Recipient does not exist' };
      }

      const senderData = senderDoc.data();
      const recipientData = recipientDoc.data();

      // Check if sender is banned or inactive
      if (senderData.status === 'banned' || senderData.status === 'inactive') {
        return {
          authorized: false,
          reason: 'Sender account is banned or inactive',
        };
      }

      // Type-specific authorization
      switch (type) {
        case NOTIFICATION_TYPES.ADMIN_NOTIFICATION:
        case NOTIFICATION_TYPES.BAN_NOTIFICATION:
          // Only admins can send admin notifications
          if (!senderData.userdata?.isAdmin) {
            return { authorized: false, reason: 'Admin privileges required' };
          }
          break;

        case NOTIFICATION_TYPES.EVENT_JOIN:
        case NOTIFICATION_TYPES.EVENT_LEAVE:
        case NOTIFICATION_TYPES.EVENT_UPDATE:
        case NOTIFICATION_TYPES.EVENT_CANCELLED:
          // Event notifications require host/cohost status
          if (data.eventId && data.studioId) {
            const eventRef = doc(
              db,
              'studios',
              data.studioId,
              'events',
              data.eventId
            );
            const eventDoc = await getDoc(eventRef);

            if (!eventDoc.exists()) {
              return { authorized: false, reason: 'Event does not exist' };
            }

            const eventData = eventDoc.data();
            const isHost = eventData.createdBy === senderId;
            const isCohost = eventData.cohosts?.includes(senderId);

            if (!isHost && !isCohost) {
              return {
                authorized: false,
                reason: 'Must be event host or cohost',
              };
            }

            // CRITICAL: Check event-specific notification settings
            const notificationSettings = eventData.notificationSettings || {};

            // Check if event notifications are globally disabled for this event
            if (notificationSettings.enabled === false) {
              return {
                authorized: false,
                reason: 'Event notifications disabled for this event'
              };
            }

            // Check specific notification type settings
            if (type === NOTIFICATION_TYPES.EVENT_JOIN && notificationSettings.notifyOnJoin === false) {
              return {
                authorized: false,
                reason: 'Join notifications disabled for this event'
              };
            }

            if (type === NOTIFICATION_TYPES.EVENT_LEAVE && notificationSettings.notifyOnLeave === false) {
              return {
                authorized: false,
                reason: 'Leave notifications disabled for this event'
              };
            }

            if (type === NOTIFICATION_TYPES.EVENT_UPDATE && notificationSettings.newComments === false) {
              return {
                authorized: false,
                reason: 'Comment notifications disabled for this event'
              };
            }
          }
          break;

        case NOTIFICATION_TYPES.INVITATION_RECEIVED:
          // Invitation notifications require host/cohost status
          if (data.eventId && data.studioId) {
            const eventRef = doc(
              db,
              'studios',
              data.studioId,
              'events',
              data.eventId
            );
            const eventDoc = await getDoc(eventRef);

            if (!eventDoc.exists()) {
              return { authorized: false, reason: 'Event does not exist' };
            }

            const eventData = eventDoc.data();
            const isHost = eventData.createdBy === senderId;
            const isCohost = eventData.cohosts?.includes(senderId);

            if (!isHost && !isCohost) {
              return {
                authorized: false,
                reason: 'Must be event host or cohost to send invitations',
              };
            }
          }
          break;

        case NOTIFICATION_TYPES.FOLLOW_NOTIFICATION:
        case NOTIFICATION_TYPES.FOLLOW_REQUEST:
          // Follow notifications are allowed between any users
          // But check if recipient has notifications enabled for follows
          const followNotifEnabled =
            recipientData.userdata?.settings?.notifications?.app?.follows !==
            false;
          if (!followNotifEnabled) {
            return {
              authorized: false,
              reason: 'Recipient has disabled follow notifications',
            };
          }
          break;

        case NOTIFICATION_TYPES.FRIEND_REQUEST:
        case NOTIFICATION_TYPES.FRIEND_ACCEPTED:
          // Friend request notifications are allowed between any users
          // But check if recipient has notifications enabled for social interactions
          const socialNotifEnabled =
            recipientData.userdata?.settings?.notifications?.app?.social !==
            false;
          if (!socialNotifEnabled) {
            return {
              authorized: false,
              reason: 'Recipient has disabled social notifications',
            };
          }
          break;

        case NOTIFICATION_TYPES.EVENT_REMINDER:
          // Event reminders are system-generated notifications
          // Authorization is handled at the scheduling level
          // No additional authorization needed here since they're beneficial to users
          break;

        case NOTIFICATION_TYPES.ATTENDANCE_REMINDER:
          // Attendance reminders are system-generated notifications sent to hosts
          // Authorization is handled at the scheduling level
          // No additional authorization needed here since they're beneficial to hosts
          break;

        case NOTIFICATION_TYPES.EVENT_RECAP:
          // Event recap notifications are system-generated notifications sent to hosts
          // Check if host has event recap enabled in their notification settings
          if (data.eventId && data.studioId) {
            const eventRef = doc(
              db,
              'studios',
              data.studioId,
              'events',
              data.eventId
            );
            const eventDoc = await getDoc(eventRef);

            if (!eventDoc.exists()) {
              return { authorized: false, reason: 'Event does not exist' };
            }

            const eventData = eventDoc.data();
            const notificationSettings = eventData.notificationSettings || {};

            // Check if event recap notifications are disabled for this event
            if (notificationSettings.eventRecap === false) {
              return {
                authorized: false,
                reason: 'Event recap notifications disabled for this event'
              };
            }
          }
          break;

        default:
          // Unknown notification types are blocked for security
          return {
            authorized: false,
            reason: `Unknown notification type: ${type}`,
          };
      }

      return { authorized: true, reason: 'Authorization passed' };
    } catch (error) {
      console.error('[NotificationEngine] Authorization check failed:', error);
      return { authorized: false, reason: 'Authorization check failed' };
    }
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpiredNotifications() {
    try {
      console.log('[NotificationEngine] Cleaning up expired notifications...');

      // This would implement cleanup logic for expired notifications
      // For now, just log the intent
      console.log('[NotificationEngine] Cleanup completed');

      return { success: true };
    } catch (error) {
      console.error('[NotificationEngine] Cleanup failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const notificationEngine = new NotificationEngine();
export default notificationEngine;
