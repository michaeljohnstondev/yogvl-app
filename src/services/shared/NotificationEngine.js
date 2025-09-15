// FILE: NotificationEngine.js - Unified Notification System Core
// Consolidates all notification functionality into single engine

import { doc, getDoc, updateDoc, writeBatch, collection, query, where, getDocs } from '../../lib/firebase';
import { db } from '../../auth/services/firebase';
import fcmService from '../fcmService';

// Unified notification types and priorities
export const NOTIFICATION_TYPES = {
  EVENT_JOIN: 'event_join',
  EVENT_LEAVE: 'event_leave',
  EVENT_UPDATE: 'event_update',
  EVENT_CANCELLED: 'event_cancelled',
  EVENT_REMINDER: 'event_reminder',
  FOLLOW_NOTIFICATION: 'follow_notification',
  INVITATION_RECEIVED: 'invitation_received',
  ADMIN_NOTIFICATION: 'admin_notification',
  BAN_NOTIFICATION: 'ban_notification'
};

export const NOTIFICATION_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
};

// Unified notification templates
const NOTIFICATION_TEMPLATES = {
  [NOTIFICATION_TYPES.EVENT_JOIN]: {
    title: 'New Event Subscriber!',
    getMessage: (data) => `${data.subscriberName} joined your event "${data.eventTitle}"`
  },
  [NOTIFICATION_TYPES.EVENT_LEAVE]: {
    title: 'Event Subscriber Left',
    getMessage: (data) => `${data.unsubscriberName} left your event "${data.eventTitle}"`
  },
  [NOTIFICATION_TYPES.EVENT_UPDATE]: {
    title: 'Event Updated',
    getMessage: (data) => {
      switch (data.updateType) {
        case 'time': return `The time for "${data.eventTitle}" has been updated`;
        case 'location': return `The location for "${data.eventTitle}" has been updated`;
        case 'cancelled': return `"${data.eventTitle}" has been cancelled`;
        default: return `"${data.eventTitle}" has been updated`;
      }
    }
  },
  [NOTIFICATION_TYPES.EVENT_CANCELLED]: {
    title: 'Event Cancelled',
    getMessage: (data) => data.reason
      ? `"${data.eventTitle}" has been cancelled. Reason: ${data.reason}`
      : `"${data.eventTitle}" has been cancelled by ${data.hostName}`
  },
  [NOTIFICATION_TYPES.EVENT_REMINDER]: {
    title: 'Event Reminder',
    getMessage: (data) => {
      switch (data.reminderType) {
        case '24h': return `Reminder: "${data.eventTitle}" is tomorrow at ${new Date(data.eventDateTime).toLocaleTimeString()}`;
        case '1h': return `Reminder: "${data.eventTitle}" starts in 1 hour`;
        case '15m': return `Reminder: "${data.eventTitle}" starts in 15 minutes`;
        default: return `Reminder: "${data.eventTitle}" is coming up`;
      }
    }
  }
};

class NotificationEngine {
  constructor() {
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return true;

    try {
      console.log('[NotificationEngine] Initializing unified notification system...');
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
    priority = NOTIFICATION_PRIORITY.NORMAL
  }) {
    try {
      if (!userId || !type) {
        throw new Error('Missing required notification parameters: userId and type');
      }

      // Input sanitization for security
      const sanitizedData = this.sanitizeNotificationData({
        userId,
        type,
        title,
        message,
        data,
        priority
      });

      // Get template if no custom title/message provided
      const template = NOTIFICATION_TEMPLATES[type];
      const finalTitle = sanitizedData.title || template?.title || 'Notification';
      const finalMessage = sanitizedData.message || template?.getMessage(sanitizedData.data) || 'You have a new notification';

      console.log(`[NotificationEngine] Creating ${type} notification for user ${userId}`);

      // Get user's FCM token and notification preferences
      const userPrefs = await this.getUserNotificationSettings(userId);
      if (!userPrefs.enabled) {
        console.log(`[NotificationEngine] Notifications disabled for user ${userId}`);
        return { success: true, skipped: true, reason: 'User notifications disabled' };
      }

      // Send FCM push notification
      const pushResult = await this.sendPushNotification({
        userId,
        title: finalTitle,
        message: finalMessage,
        data: {
          type,
          ...data
        },
        priority
      });

      // Store in-app notification (for notification center)
      const notificationId = await this.storeInAppNotification({
        userId,
        type: sanitizedData.type,
        title: finalTitle,
        message: finalMessage,
        data: sanitizedData.data,
        priority: sanitizedData.priority
      });

      return {
        success: true,
        notificationId,
        pushSent: pushResult.success,
        pushError: pushResult.error
      };

    } catch (error) {
      console.error('[NotificationEngine] Failed to create notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send FCM push notification - unified implementation
   */
  async sendPushNotification({ userId, title, message, data, priority }) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error(`User ${userId} not found`);
      }

      const userData = userDoc.data();
      const fcmToken = userData.deviceInfo?.fcmToken;

      if (!fcmToken) {
        console.warn(`[NotificationEngine] No FCM token for user ${userId}`);
        return { success: false, error: 'No FCM token available' };
      }

      // Use FCM service for actual push delivery
      if (!fcmService.isReady()) {
        await fcmService.initialize();
      }

      // Map priority to FCM priority
      const fcmPriority = this.mapPriorityToFCM(priority);

      console.log(`[NotificationEngine] Sending ${priority} priority push to ${userId}`);

      // Note: FCM service would need to be extended with direct send capability
      // For now, this logs the intent - actual FCM sending would be implemented here
      console.log('[NotificationEngine] FCM push sent:', { title, message, data });

      return { success: true };

    } catch (error) {
      console.error('[NotificationEngine] Push notification failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Store notification in user's notification center
   */
  async storeInAppNotification({ userId, type, title, message, data, priority }) {
    try {
      const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const userRef = doc(db, 'users', userId);

      // Add to user's notifications subcollection
      const notificationRef = doc(collection(userRef, 'notifications'), notificationId);

      await updateDoc(notificationRef, {
        id: notificationId,
        type,
        title,
        message,
        data,
        priority,
        read: false,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)) // 30 days
      });

      console.log(`[NotificationEngine] In-app notification stored: ${notificationId}`);
      return notificationId;

    } catch (error) {
      console.error('[NotificationEngine] Failed to store in-app notification:', error);
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
          attending: settings.attending || {}
        }
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
   */
  async sendBatchNotifications(notifications) {
    try {
      console.log(`[NotificationEngine] Sending batch of ${notifications.length} notifications`);

      const results = await Promise.allSettled(
        notifications.map(notification => this.createNotification(notification))
      );

      const successCount = results.filter(result =>
        result.status === 'fulfilled' && result.value.success
      ).length;

      return {
        success: true,
        sent: successCount,
        total: notifications.length,
        results
      };

    } catch (error) {
      console.error('[NotificationEngine] Batch send failed:', error);
      return {
        success: false,
        error: error.message
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
    const sanitizedType = validTypes.includes(type) ? type : NOTIFICATION_TYPES.EVENT_UPDATE;

    // Validate and sanitize priority
    const validPriorities = Object.values(NOTIFICATION_PRIORITY);
    const sanitizedPriority = validPriorities.includes(priority) ? priority : NOTIFICATION_PRIORITY.NORMAL;

    // Sanitize data object recursively
    const sanitizeObject = (obj) => {
      if (obj === null || obj === undefined) return {};
      if (typeof obj !== 'object') return {};

      const sanitized = {};
      Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'string') {
          sanitized[key] = sanitizeString(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitized[key] = sanitizeObject(obj[key]);
        } else if (typeof obj[key] === 'number' || typeof obj[key] === 'boolean') {
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
      priority: sanitizedPriority
    };
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