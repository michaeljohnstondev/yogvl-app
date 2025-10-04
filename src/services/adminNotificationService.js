// FILE: services/adminNotificationService.js - Admin Notification System
// ✅ UPDATED: Now uses modern direct Firebase function triggers
// ✅ No longer creates notificationTriggers documents (eliminated collection)
// ✅ Uses adminNotifications collection for direct trigger architecture

import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';

/**
 * DATABASE STRUCTURE FOR ADMIN NOTIFICATIONS:
 *
 * /users/{userId}/adminNotifications
 * {
 *   notifications: [
 *     {
 *       id: string,
 *       type: 'warning' | 'strike' | 'announcement' | 'system' | 'policy' | 'custom',
 *       priority: 'normal' | 'high',
 *       issuedAt: Timestamp,
 *       issuedBy: string, // admin userId
 *       message: string,
 *       additionalInfo?: string,
 *       requiresResponse: boolean,
 *       acknowledged: boolean,
 *       acknowledgedAt?: Timestamp,
 *       relatedReport?: string, // reportId if notification is from moderation action
 *       expiresAt?: Timestamp // optional expiration
 *     }
 *   ],
 *   stats: {
 *     totalNotifications: number,
 *     unacknowledgedCount: number,
 *     lastNotificationAt?: Timestamp
 *   }
 * }
 */

class AdminNotificationService {
  /**
   * Get user's admin notifications
   * @param {string} userId - User ID
   * @returns {Object|null} Admin notifications or null if none exist
   */
  async getAdminNotifications(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return null;
      }

      const userData = userDoc.data();
      return userData.adminNotifications || null;
    } catch (error) {
      console.error(
        '[adminNotificationService] Error getting notifications:',
        error
      );
      throw error;
    }
  }

  /**
   * Send notification to user
   * @param {string} userId - Target user ID
   * @param {string} type - Notification type
   * @param {string} message - Notification message
   * @param {Object} options - Additional options
   */
  async sendNotification(userId, type, message, options = {}) {
    try {
      const notification = {
        id: `notif_${Date.now()}`,
        type,
        priority: options.priority || 'normal',
        issuedAt: Timestamp.now(),
        issuedBy: options.adminUserId || 'system_admin',
        message,
        additionalInfo: options.additionalInfo || null,
        requiresResponse: options.requiresResponse !== false, // Default to true
        acknowledged: false,
        relatedReport: options.relatedReport || null,
        expiresAt: options.expiresAt || null,
      };

      const currentNotifications = await this.getAdminNotifications(userId);
      const notifications = [
        ...(currentNotifications?.notifications || []),
        notification,
      ];
      const unacknowledgedCount = notifications.filter(
        (n) => !n.acknowledged
      ).length;

      const updatedNotifications = {
        notifications,
        stats: {
          totalNotifications: notifications.length,
          unacknowledgedCount,
          lastNotificationAt: Timestamp.now(),
        },
        updatedAt: Timestamp.now(),
      };

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        adminNotifications: updatedNotifications,
      });

      // Trigger push notification
      await this.triggerPushNotification(userId, notification);

      console.log(
        `[adminNotificationService] Notification sent to user ${userId}: ${type}`
      );
      return { success: true, notificationId: notification.id };
    } catch (error) {
      console.error(
        '[adminNotificationService] Error sending notification:',
        error
      );
      throw error;
    }
  }

  /**
   * Send warning notification (from moderation action)
   * @param {string} userId - Target user ID
   * @param {string} message - Warning message
   * @param {string} adminUserId - Admin user ID
   * @param {string} reportId - Related report ID
   */
  async sendWarningNotification(userId, message, adminUserId, reportId) {
    return this.sendNotification(userId, 'warning', message, {
      priority: 'high',
      adminUserId,
      relatedReport: reportId,
      requiresResponse: true,
      additionalInfo:
        'Multiple warnings may result in strikes or temporary restrictions.',
    });
  }

  /**
   * Send strike notification (from moderation action)
   * @param {string} userId - Target user ID
   * @param {string} message - Strike message
   * @param {string} adminUserId - Admin user ID
   * @param {string} reportId - Related report ID
   * @param {number} totalStrikes - User's total active strikes
   */
  async sendStrikeNotification(
    userId,
    message,
    adminUserId,
    reportId,
    totalStrikes
  ) {
    const additionalInfo =
      totalStrikes >= 3
        ? `You now have ${totalStrikes} active strikes. Further violations may result in a temporary ban.`
        : `You now have ${totalStrikes} active strike${totalStrikes > 1 ? 's' : ''}. Strikes expire after 6 months.`;

    return this.sendNotification(userId, 'strike', message, {
      priority: 'high',
      adminUserId,
      relatedReport: reportId,
      requiresResponse: true,
      additionalInfo,
    });
  }

  /**
   * Send custom announcement to user
   * @param {string} userId - Target user ID
   * @param {string} title - Announcement title
   * @param {string} message - Announcement message
   * @param {string} adminUserId - Admin user ID
   * @param {Object} options - Additional options
   */
  async sendAnnouncement(userId, title, message, adminUserId, options = {}) {
    const fullMessage = title ? `${title}\n\n${message}` : message;

    return this.sendNotification(userId, 'announcement', fullMessage, {
      priority: options.priority || 'normal',
      adminUserId,
      requiresResponse: options.requiresResponse || false,
      additionalInfo: options.additionalInfo,
      expiresAt: options.expiresAt,
    });
  }

  /**
   * Acknowledge a notification
   * @param {string} userId - User ID
   * @param {string} notificationId - Notification ID to acknowledge
   */
  async acknowledgeNotification(userId, notificationId) {
    try {
      const currentNotifications = await this.getAdminNotifications(userId);

      if (!currentNotifications) {
        throw new Error('No notifications found for user');
      }

      const updatedNotifications = currentNotifications.notifications.map(
        (notification) => {
          if (notification.id === notificationId) {
            return {
              ...notification,
              acknowledged: true,
              acknowledgedAt: Timestamp.now(),
            };
          }
          return notification;
        }
      );

      const unacknowledgedCount = updatedNotifications.filter(
        (n) => !n.acknowledged
      ).length;

      const updatedRecord = {
        ...currentNotifications,
        notifications: updatedNotifications,
        stats: {
          ...currentNotifications.stats,
          unacknowledgedCount,
        },
        updatedAt: Timestamp.now(),
      };

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        adminNotifications: updatedRecord,
      });

      console.log(
        `[adminNotificationService] Notification ${notificationId} acknowledged by user ${userId}`
      );
      return { success: true };
    } catch (error) {
      console.error(
        '[adminNotificationService] Error acknowledging notification:',
        error
      );
      throw error;
    }
  }

  /**
   * Get unacknowledged notifications for user
   * @param {string} userId - User ID
   * @returns {Array} Array of unacknowledged notifications
   */
  async getUnacknowledgedNotifications(userId) {
    try {
      const adminNotifications = await this.getAdminNotifications(userId);

      if (!adminNotifications) {
        return [];
      }

      // Filter out expired notifications and return unacknowledged ones
      const now = Date.now();
      const unacknowledged = adminNotifications.notifications.filter(
        (notification) => {
          const isNotExpired =
            !notification.expiresAt ||
            notification.expiresAt.seconds * 1000 > now;
          return !notification.acknowledged && isNotExpired;
        }
      );

      // Sort by priority (high first) and then by date (newest first)
      return unacknowledged.sort((a, b) => {
        if (a.priority === 'high' && b.priority !== 'high') return -1;
        if (b.priority === 'high' && a.priority !== 'high') return 1;
        return b.issuedAt.seconds - a.issuedAt.seconds;
      });
    } catch (error) {
      console.error(
        '[adminNotificationService] Error getting unacknowledged notifications:',
        error
      );
      return [];
    }
  }

  /**
   * Bulk send notification to multiple users
   * @param {Array} userIds - Array of user IDs
   * @param {string} type - Notification type
   * @param {string} message - Notification message
   * @param {Object} options - Additional options
   */
  async bulkSendNotification(userIds, type, message, options = {}) {
    try {
      const results = await Promise.allSettled(
        userIds.map((userId) =>
          this.sendNotification(userId, type, message, options)
        )
      );

      const successful = results.filter(
        (result) => result.status === 'fulfilled'
      ).length;
      const failed = results.filter(
        (result) => result.status === 'rejected'
      ).length;

      console.log(
        `[adminNotificationService] Bulk notification sent: ${successful} successful, ${failed} failed`
      );

      return {
        success: true,
        successful,
        failed,
        total: userIds.length,
      };
    } catch (error) {
      console.error(
        '[adminNotificationService] Error with bulk notification:',
        error
      );
      throw error;
    }
  }

  /**
   * Trigger push notification for admin message
   * @param {string} userId - Target user ID
   * @param {Object} notification - Notification data
   */
  async triggerPushNotification(userId, notification) {
    try {
      // Create an admin notification document that will trigger direct Cloud Functions
      const notificationId = `admin_${notification.type}_${userId}_${Date.now()}`;
      const adminNotificationRef = doc(db, 'adminNotifications', notificationId);

      await setDoc(adminNotificationRef, {
        targetUserId: userId,
        notificationId: notificationId,

        type: notification.type, // warning, strike, announcement, etc.
        subType: notification.type,
        priority: notification.priority || 'normal',

        title: this.getNotificationTitle(notification.type),
        message: notification.message,
        additionalInfo: notification.additionalInfo || null,

        issuedBy: notification.issuedBy || 'system_admin',
        issuedByName: 'Admin', // Will be resolved by Cloud Function
        relatedReport: notification.relatedReport || null,

        createdAt: Timestamp.now(),
        scheduledFor: Timestamp.now(),

        processed: false,
        attempts: 0,

        data: {
          type: 'admin_notification',
          notificationId: notification.id,
          priority: notification.priority || 'normal',
          screen: 'Notifications',
          channels: ['push', 'in_app'],
          requiresAck: notification.requiresResponse || false,
        },
      });

      console.log(
        `[adminNotificationService] Admin notification created: ${notificationId}`
      );
    } catch (error) {
      console.error(
        '[adminNotificationService] Error creating admin notification:',
        error
      );
      // Don't throw - admin notification should still be saved even if push fails
    }
  }

  /**
   * Get appropriate title for notification type
   * @param {string} type - Notification type
   * @returns {string} Notification title
   */
  getNotificationTitle(type) {
    switch (type) {
      case 'warning':
        return '⚠️ Community Warning';
      case 'strike':
        return '🚨 Community Strike';
      case 'announcement':
        return '📢 Important Message';
      case 'system':
        return '⚙️ System Notice';
      case 'policy':
        return '📋 Policy Update';
      case 'custom':
        return '💬 Message from Admin';
      default:
        return '📬 Admin Notification';
    }
  }
}

// Export singleton instance
export const adminNotificationService = new AdminNotificationService();
