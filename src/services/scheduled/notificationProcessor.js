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
        console.warn(
          '[NotificationProcessor] Processing notifications requires userId in user-scoped architecture'
        );
        return {
          success: false,
          error: 'userId required for user-scoped notifications',
        };
      }

      console.log(
        `[NotificationProcessor] Processing pending scheduled notifications for user ${userId}...`
      );

      const now = new Date();
      const cutoffTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes buffer

      // Query for user's notifications that should be sent now
      const q = query(
        collection(db, 'scheduledNotifications'),
        where('userId', '==', userId),
        where('status', '==', 'pending'),
        where('scheduledFor', '<=', Timestamp.fromDate(cutoffTime)),
        orderBy('scheduledFor'),
        limit(20) // Reduced batch size for user-specific processing
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        console.log(
          '[NotificationProcessor] No pending notifications to process'
        );
        return { success: true, processedCount: 0 };
      }

      console.log(
        `[NotificationProcessor] Found ${snapshot.size} notifications to process`
      );

      const results = [];
      const batch = writeBatch(db);

      for (const notificationDoc of snapshot.docs) {
        const notification = notificationDoc.data();

        try {
          // Check if event still exists and hasn't been cancelled
          if (notification.eventId) {
            const isEventValid =
              await NotificationValidator.validateEventForNotification(
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

          // Special validation for attendance reminders - check subscriber count and user preferences
          if (notification.type === 'attendance_reminder' && notification.eventId) {
            const { doc, getDoc } = await import('../../lib/firebase/firestore');
            const { NOTIFICATION_TYPES } = await import('../shared/NotificationEngine');

            if (notification.type === NOTIFICATION_TYPES.ATTENDANCE_REMINDER) {
              try {
                // Get current event data to check subscriber count and attendance type
                const eventRef = doc(db, 'studios', notification.data.studioId, 'events', notification.eventId);
                const eventDoc = await getDoc(eventRef);

                if (eventDoc.exists()) {
                  const eventData = eventDoc.data();
                  const subscriberCount = eventData.subscriberCount || (eventData.subscribers ? eventData.subscribers.length : 1);

                  // Skip attendance reminder if only the host attended (count = 1)
                  if (subscriberCount <= 1) {
                    batch.update(notificationDoc.ref, {
                      status: 'cancelled',
                      cancelledAt: Timestamp.now(),
                      cancelReason: 'Only host attended - no attendance reminder needed',
                    });
                    results.push({
                      id: notification.id,
                      status: 'cancelled',
                      reason: 'Solo event - no other attendees',
                    });
                    continue;
                  }

                  // Check user's attendance reminder preferences
                  const userRef = doc(db, 'users', notification.userId);
                  const userDoc = await getDoc(userRef);

                  if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const attendanceReminderPref = userData?.userdata?.settings?.notifications?.hosting?.attendanceReminders || 'none';

                    // If user disabled attendance reminders
                    if (attendanceReminderPref === 'none') {
                      batch.update(notificationDoc.ref, {
                        status: 'cancelled',
                        cancelledAt: Timestamp.now(),
                        cancelReason: 'User disabled attendance reminders',
                      });
                      results.push({
                        id: notification.id,
                        status: 'cancelled',
                        reason: 'User preference: none',
                      });
                      continue;
                    }

                    // Check event attendance type and user preferences
                    const eventAttendanceType = eventData.attendanceType || 'casual'; // Default to casual
                    const shouldSend =
                      attendanceReminderPref === 'both' ||
                      attendanceReminderPref === eventAttendanceType;

                    if (!shouldSend) {
                      batch.update(notificationDoc.ref, {
                        status: 'cancelled',
                        cancelledAt: Timestamp.now(),
                        cancelReason: `User preference (${attendanceReminderPref}) doesn't match event type (${eventAttendanceType})`,
                      });
                      results.push({
                        id: notification.id,
                        status: 'cancelled',
                        reason: `Preference mismatch: ${attendanceReminderPref} vs ${eventAttendanceType}`,
                      });
                      continue;
                    }
                  }

                  console.log(`[NotificationProcessor] Attendance reminder for event ${notification.eventId}: ${subscriberCount} subscribers, sending reminder`);
                } else {
                  // Event no longer exists
                  batch.update(notificationDoc.ref, {
                    status: 'cancelled',
                    cancelledAt: Timestamp.now(),
                    cancelReason: 'Event no longer exists',
                  });
                  results.push({
                    id: notification.id,
                    status: 'cancelled',
                    reason: 'Event not found',
                  });
                  continue;
                }
              } catch (error) {
                console.warn(`[NotificationProcessor] Error checking attendance reminder settings: ${error.message}`);
                // If we can't check, err on the side of not sending
                batch.update(notificationDoc.ref, {
                  status: 'cancelled',
                  cancelledAt: Timestamp.now(),
                  cancelReason: 'Unable to verify attendance settings',
                });
                results.push({
                  id: notification.id,
                  status: 'cancelled',
                  reason: 'Validation error',
                });
                continue;
              }
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

      console.log(
        `[NotificationProcessor] Processed ${results.length} scheduled notifications`
      );
      return {
        success: true,
        processedCount: results.length,
        results,
      };
    } catch (error) {
      console.error(
        '[NotificationProcessor] Error processing pending notifications:',
        error
      );
      throw error;
    }
  }

  /**
   * Cancel scheduled notifications for an event (DEPRECATED - use cancelUserEventNotifications)
   * TODO: Remove this global method and use Cloud Functions for cross-user operations
   */
  static async cancelEventNotifications(eventId, reason = 'Event cancelled') {
    console.warn(
      '[NotificationProcessor] cancelEventNotifications is deprecated. Use cancelUserEventNotifications for user-scoped operations.'
    );

    // For backward compatibility, this method is temporarily disabled
    // In user-scoped architecture, notifications should be cancelled per-user
    return {
      success: false,
      error:
        'Global event notification cancellation not supported in user-scoped architecture. Use cancelUserEventNotifications.',
    };
  }

  /**
   * Cancel scheduled notifications for a specific user and event
   */
  static async cancelUserEventNotifications(
    userId,
    eventId,
    reason = 'Event cancelled'
  ) {
    try {
      const q = query(
        collection(db, 'scheduledNotifications'),
        where('userId', '==', userId),
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
      console.error(
        '[NotificationProcessor] Error cancelling event notifications:',
        error
      );
      throw error;
    }
  }

  /**
   * Get scheduled notifications for a user
   */
  static async getUserScheduledNotifications(userId, includeSent = false) {
    try {
      let q = query(
        collection(db, 'scheduledNotifications'),
        where('userId', '==', userId),
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
      console.error(
        '[NotificationProcessor] Error getting user scheduled notifications:',
        error
      );
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
        console.warn(
          '[NotificationProcessor] Cleanup requires userId in user-scoped architecture'
        );
        return {
          success: false,
          error: 'userId required for user-scoped cleanup',
        };
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const q = query(
        collection(db, 'scheduledNotifications'),
        where('userId', '==', userId),
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

      console.log(
        `[NotificationProcessor] Cleaned up ${snapshot.size} old notifications`
      );

      return {
        success: true,
        deletedCount: snapshot.size,
      };
    } catch (error) {
      console.error(
        '[NotificationProcessor] Error cleaning up old notifications:',
        error
      );
      throw error;
    }
  }

  /**
   * Start the background processor (call this when app starts)
   */
  static startBackgroundProcessor() {
    console.log(
      '[NotificationProcessor] Starting scheduled notification background processor...'
    );

    // Process every 2 minutes
    const interval = 2 * 60 * 1000;

    // Initial processing
    this.processPendingNotifications().catch((error) => {
      console.error(
        '[NotificationProcessor] Initial notification processing failed:',
        error
      );
    });

    // Set up periodic processing
    const intervalId = setInterval(() => {
      this.processPendingNotifications().catch((error) => {
        console.error(
          '[NotificationProcessor] Periodic notification processing failed:',
          error
        );
      });
    }, interval);

    // Return cleanup function
    return () => {
      console.log(
        '[NotificationProcessor] Stopping scheduled notification processor...'
      );
      clearInterval(intervalId);
    };
  }
}

/**
 * GLOBAL COLLECTION METHODS - For use with /scheduledNotifications (scalable approach)
 * These work with the global scheduledNotifications collection instead of user subcollections
 */

/**
 * Cancel pending notifications for an event in global collection
 * @param {string} eventId - Event ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<Object>} Result with cancelledCount
 */
export const cancelGlobalEventNotifications = async (eventId, reason = 'Event updated') => {
  try {
    console.log(`[NotificationProcessor] Cancelling global notifications for event ${eventId}, reason: ${reason}`);

    // Query all pending notifications for this event in global collection
    const q = query(
      collection(db, 'scheduledNotifications'),
      where('eventId', '==', eventId),
      where('status', '==', 'pending')
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log(`[NotificationProcessor] No pending notifications for event ${eventId}`);
      return { cancelledCount: 0 };
    }

    // Batch update all to cancelled
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      batch.update(doc.ref, {
        status: 'cancelled',
        cancelledAt: Timestamp.now(),
        cancelReason: reason,
      });
      // Enhanced logging for each cancellation
      console.log(
        `[NotificationProcessor] ❌ CANCELLED scheduledNotification:`,
        `\n  ID: ${doc.id}`,
        `\n  Type: ${data.type}`,
        `\n  UserId: ${data.userId}`,
        `\n  EventId: ${data.eventId || 'N/A'}`,
        `\n  ScheduledFor: ${data.scheduledFor?.toDate()?.toISOString() || 'N/A'}`,
        `\n  Reason: ${reason}`
      );
    });

    await batch.commit();

    console.log(`[NotificationProcessor] Total cancelled: ${snapshot.size} notifications for event ${eventId}`);
    return { cancelledCount: snapshot.size };
  } catch (error) {
    console.error('[NotificationProcessor] Error cancelling global notifications:', error);
    throw error;
  }
};

/**
 * Cancel pending notifications for specific user and event in global collection
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<Object>} Result with cancelledCount
 */
export const cancelGlobalUserEventNotifications = async (userId, eventId, reason = 'Event updated') => {
  try {
    const q = query(
      collection(db, 'scheduledNotifications'),
      where('userId', '==', userId),
      where('eventId', '==', eventId),
      where('status', '==', 'pending')
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { cancelledCount: 0 };
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      batch.update(doc.ref, {
        status: 'cancelled',
        cancelledAt: Timestamp.now(),
        cancelReason: reason,
      });
      // Enhanced logging for each cancellation
      console.log(
        `[NotificationProcessor] ❌ CANCELLED scheduledNotification:`,
        `\n  ID: ${doc.id}`,
        `\n  Type: ${data.type}`,
        `\n  UserId: ${data.userId}`,
        `\n  EventId: ${data.eventId || 'N/A'}`,
        `\n  ScheduledFor: ${data.scheduledFor?.toDate()?.toISOString() || 'N/A'}`,
        `\n  Reason: ${reason}`
      );
    });

    await batch.commit();

    console.log(`[NotificationProcessor] Total cancelled: ${snapshot.size} global notifications for user ${userId}, event ${eventId}`);
    return { cancelledCount: snapshot.size };
  } catch (error) {
    console.error('[NotificationProcessor] Error cancelling global user notifications:', error);
    throw error;
  }
};

/**
 * Reschedule all notifications for an event after time change (global collection)
 * @param {string} eventId - Event ID
 * @param {string} studioId - Studio ID
 * @param {Object} newEventData - Updated event data with new dateTime
 * @returns {Promise<Object>} Result with rescheduledCount
 */
export const rescheduleEventNotifications = async (eventId, studioId, newEventData) => {
  try {
    console.log(`[NotificationProcessor] Rescheduling notifications for event ${eventId}`);

    // Get all subscribers for this event
    const { doc, getDoc } = await import('../../lib/firebase/firestore');

    const eventRef = doc(db, 'studios', studioId, 'events', eventId);
    const eventSnap = await getDoc(eventRef);

    if (!eventSnap.exists()) {
      throw new Error('Event not found');
    }

    const eventData = eventSnap.data();
    const subscribers = eventData.subscribers || [];

    if (subscribers.length === 0) {
      console.log(`[NotificationProcessor] No subscribers for event ${eventId}`);
      return { rescheduledCount: 0 };
    }

    console.log(`[NotificationProcessor] Found ${subscribers.length} subscribers to reschedule`);

    // Get each subscriber's notification settings from their event subscription
    const { ScheduledNotificationService } = await import('./index');

    let rescheduledCount = 0;

    for (const userId of subscribers) {
      try {
        // Cancel existing notifications for this user
        await cancelGlobalUserEventNotifications(userId, eventId, 'Event time changed');

        // Get user's notification settings for this event
        const userEventSettingsRef = doc(db, 'users', userId, 'eventSubscriptions', eventId);
        const settingsSnap = await getDoc(userEventSettingsRef);

        let notificationSettings = {};

        if (settingsSnap.exists()) {
          // User has custom settings for this event
          notificationSettings = settingsSnap.data().notificationSettings || {};
          console.log(`[NotificationProcessor] Using custom settings for user ${userId}`);
        } else {
          // Fall back to user's global defaults
          const userRef = doc(db, 'users', userId);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();
            // Check if user is host
            const isHost = eventData.createdBy === userId;
            const context = isHost ? 'hosting' : 'attending';
            notificationSettings = userData?.userdata?.settings?.notifications?.[context] || {};
            console.log(`[NotificationProcessor] Using ${context} defaults for user ${userId}`);
          }
        }

        // Only reschedule if they have event reminders enabled and templates set
        if (notificationSettings.eventReminders !== false && notificationSettings.reminderTemplates) {
          // Reschedule with new event time
          await ScheduledNotificationService.subscribeToEventNotifications(
            userId,
            eventId,
            studioId,
            notificationSettings
          );
          rescheduledCount++;
          console.log(`[NotificationProcessor] Rescheduled notifications for user ${userId}`);
        } else {
          console.log(`[NotificationProcessor] Skipping user ${userId} - no reminders enabled`);
        }

      } catch (error) {
        console.error(`[NotificationProcessor] Failed to reschedule for user ${userId}:`, error);
        // Continue with other users even if one fails
      }
    }

    console.log(`[NotificationProcessor] Rescheduled notifications for ${rescheduledCount}/${subscribers.length} subscribers`);
    return { rescheduledCount };

  } catch (error) {
    console.error('[NotificationProcessor] Error rescheduling notifications:', error);
    throw error;
  }
};

export default NotificationProcessor;
