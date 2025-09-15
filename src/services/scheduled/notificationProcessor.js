// services/scheduled/notificationProcessor.js - Background Processing & Cleanup

import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../auth/services/firebase';
import { createNotification } from '../notifications';
import { NotificationValidator } from './notificationValidator';

export class NotificationProcessor {
  /**
   * Process pending scheduled notifications for a specific user
   * TODO: Move to Cloud Functions with scheduled triggers for better efficiency
   */
  static async processPendingNotifications(userId = null) {
    try {
      if (!userId) {
        console.warn('[NotificationProcessor] Processing notifications requires userId in user-scoped architecture');
        return { success: false, error: 'userId required for user-scoped notifications' };
      }

      console.log(`[NotificationProcessor] Processing pending scheduled notifications for user ${userId}...`);

      const now = new Date();
      const cutoffTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes buffer

      // Query for user's notifications that should be sent now
      const q = query(
        collection(db, 'users', userId, 'scheduledNotifications'),
        where('status', '==', 'pending'),
        where('scheduledFor', '<=', Timestamp.fromDate(cutoffTime)),
        orderBy('scheduledFor'),
        limit(20) // Reduced batch size for user-specific processing
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.log('[NotificationProcessor] No pending notifications to process');
        return { success: true, processedCount: 0 };
      }

      console.log(`[NotificationProcessor] Found ${snapshot.size} notifications to process`);

      const results = [];
      const batch = writeBatch(db);

      for (const notificationDoc of snapshot.docs) {
        const notification = notificationDoc.data();

        try {
          // Check if event still exists and hasn't been cancelled
          if (notification.eventId) {
            const isEventValid = await NotificationValidator.validateEventForNotification(
              notification.eventId
            );
            if (!isEventValid) {
              // Cancel notification - event no longer exists or was cancelled
              batch.update(notificationDoc.ref, {
                status: 'cancelled',
                cancelledAt: Timestamp.now(),
                cancelReason: 'Event no longer valid',
              });
              results.push({
                id: notification.id,
                status: 'cancelled',
                reason: 'Event invalid',
              });
              continue;
            }
          }

          // Send the notification
          const result = await createNotification({
            userId: notification.userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            priority: notification.priority,
            channels: notification.channels,
          });

          // Update scheduled notification status
          if (result.success) {
            batch.update(notificationDoc.ref, {
              status: 'sent',
              sentAt: Timestamp.now(),
              actualNotificationId: result.notificationId,
            });
            results.push({ id: notification.id, status: 'sent' });
          } else {
            batch.update(notificationDoc.ref, {
              status: 'failed',
              attempts: notification.attempts + 1,
              lastAttemptAt: Timestamp.now(),
              failureReason: result.reason || 'Unknown error',
            });
            results.push({
              id: notification.id,
              status: 'failed',
              reason: result.reason,
            });
          }
        } catch (error) {
          console.error(
            `[NotificationProcessor] Error processing notification ${notification.id}:`,
            error
          );
          batch.update(notificationDoc.ref, {
            status: 'failed',
            attempts: notification.attempts + 1,
            lastAttemptAt: Timestamp.now(),
            failureReason: error.message,
          });
          results.push({
            id: notification.id,
            status: 'failed',
            reason: error.message,
          });
        }
      }

      // Commit all updates
      await batch.commit();

      console.log(`[NotificationProcessor] Processed ${results.length} scheduled notifications`);
      return {
        success: true,
        processedCount: results.length,
        results,
      };
    } catch (error) {
      console.error('[NotificationProcessor] Error processing pending notifications:', error);
      throw error;
    }
  }

  /**
   * Cancel scheduled notifications for an event (DEPRECATED - use cancelUserEventNotifications)
   * TODO: Remove this global method and use Cloud Functions for cross-user operations
   */
  static async cancelEventNotifications(eventId, reason = 'Event cancelled') {
    console.warn('[NotificationProcessor] cancelEventNotifications is deprecated. Use cancelUserEventNotifications for user-scoped operations.');

    // For backward compatibility, this method is temporarily disabled
    // In user-scoped architecture, notifications should be cancelled per-user
    return { success: false, error: 'Global event notification cancellation not supported in user-scoped architecture. Use cancelUserEventNotifications.' };
  }

  /**
   * Cancel scheduled notifications for a specific user and event
   */
  static async cancelUserEventNotifications(userId, eventId, reason = 'Event cancelled') {
    try {
      const q = query(
        collection(db, 'users', userId, 'scheduledNotifications'),
        where('eventId', '==', eventId),
        where('status', '==', 'pending')
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return { success: true, cancelledCount: 0 };
      }

      const batch = writeBatch(db);

      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          status: 'cancelled',
          cancelledAt: Timestamp.now(),
          cancelReason: reason,
        });
      });

      await batch.commit();

      console.log(
        `[NotificationProcessor] Cancelled ${snapshot.size} scheduled notifications for event ${eventId}`
      );
      return {
        success: true,
        cancelledCount: snapshot.size,
      };
    } catch (error) {
      console.error('[NotificationProcessor] Error cancelling event notifications:', error);
      throw error;
    }
  }

  /**
   * Get scheduled notifications for a user
   */
  static async getUserScheduledNotifications(userId, includeSent = false) {
    try {
      let q = query(
        collection(db, 'users', userId, 'scheduledNotifications'),
        orderBy('scheduledFor', 'desc')
      );

      if (!includeSent) {
        q = query(q, where('status', '==', 'pending'));
      }

      const snapshot = await getDocs(q);
      const notifications = [];

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        notifications.push({
          ...data,
          scheduledFor: data.scheduledFor.toDate(),
          createdAt: data.createdAt.toDate(),
          sentAt: data.sentAt?.toDate(),
          lastAttemptAt: data.lastAttemptAt?.toDate(),
          cancelledAt: data.cancelledAt?.toDate(),
        });
      });

      return notifications;
    } catch (error) {
      console.error('[NotificationProcessor] Error getting user scheduled notifications:', error);
      throw error;
    }
  }

  /**
   * Clean up old scheduled notifications for a specific user
   * TODO: Move to Cloud Functions for automated cleanup
   */
  static async cleanupOldNotifications(userId, olderThanDays = 30) {
    try {
      if (!userId) {
        console.warn('[NotificationProcessor] Cleanup requires userId in user-scoped architecture');
        return { success: false, error: 'userId required for user-scoped cleanup' };
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const q = query(
        collection(db, 'users', userId, 'scheduledNotifications'),
        where('createdAt', '<', Timestamp.fromDate(cutoffDate)),
        limit(50) // Reduced batch size for user-specific processing
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return { success: true, deletedCount: 0 };
      }

      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      console.log(`[NotificationProcessor] Cleaned up ${snapshot.size} old notifications`);

      return {
        success: true,
        deletedCount: snapshot.size,
      };
    } catch (error) {
      console.error('[NotificationProcessor] Error cleaning up old notifications:', error);
      throw error;
    }
  }

  /**
   * Start the background processor (call this when app starts)
   */
  static startBackgroundProcessor() {
    console.log('[NotificationProcessor] Starting scheduled notification background processor...');

    // Process every 2 minutes
    const interval = 2 * 60 * 1000;

    // Initial processing
    this.processPendingNotifications().catch((error) => {
      console.error('[NotificationProcessor] Initial notification processing failed:', error);
    });

    // Set up periodic processing
    const intervalId = setInterval(() => {
      this.processPendingNotifications().catch((error) => {
        console.error('[NotificationProcessor] Periodic notification processing failed:', error);
      });
    }, interval);

    // Return cleanup function
    return () => {
      console.log('[NotificationProcessor] Stopping scheduled notification processor...');
      clearInterval(intervalId);
    };
  }
}

export default NotificationProcessor;