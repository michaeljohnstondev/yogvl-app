// services/scheduledNotifications.js - Scheduled Background Notifications

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';
import { createNotification, NOTIFICATION_TYPES, NOTIFICATION_PRIORITY, DELIVERY_CHANNELS } from './notifications';

/**
 * SCHEDULED NOTIFICATION DATA MODEL:
 * 
 * Collection: /scheduledNotifications/{scheduleId}
 * {
 *   id: string,
 *   userId: string,
 *   eventId?: string,
 *   type: string, // 'event_reminder', 'event_starting_soon', etc.
 *   title: string,
 *   message: string,
 *   data: object,
 *   scheduledFor: Timestamp, // when to send
 *   createdAt: Timestamp,
 *   status: 'pending' | 'sent' | 'cancelled' | 'failed',
 *   attempts: number,
 *   lastAttemptAt?: Timestamp,
 *   sentAt?: Timestamp,
 * }
 */

// Reminder intervals (in minutes before event)
export const REMINDER_INTERVALS = {
  ONE_DAY: 24 * 60,     // 24 hours
  FOUR_HOURS: 4 * 60,   // 4 hours  
  ONE_HOUR: 60,         // 1 hour
  THIRTY_MINUTES: 30,   // 30 minutes
  TEN_MINUTES: 10,      // 10 minutes
};

export class ScheduledNotificationService {
  
  /**
   * Schedule event reminder notifications for an event
   */
  static async scheduleEventReminders(eventData) {
    try {
      const { id: eventId, title, eventTimestamp, subscribers = [], createdBy } = eventData;
      
      if (!eventTimestamp) {
        throw new Error('Event must have a timestamp to schedule reminders');
      }

      const eventTime = eventTimestamp.toDate ? eventTimestamp.toDate() : new Date(eventTimestamp);
      const notifications = [];

      // Get all users who should receive reminders (subscribers + host)
      const allUsers = Array.from(new Set([...subscribers, createdBy]));

      // Schedule reminders for different intervals
      const intervals = [
        { key: 'ONE_DAY', minutes: REMINDER_INTERVALS.ONE_DAY, title: 'Event Tomorrow!' },
        { key: 'FOUR_HOURS', minutes: REMINDER_INTERVALS.FOUR_HOURS, title: 'Event in 4 Hours' },
        { key: 'ONE_HOUR', minutes: REMINDER_INTERVALS.ONE_HOUR, title: 'Event Starting Soon!' },
        { key: 'THIRTY_MINUTES', minutes: REMINDER_INTERVALS.THIRTY_MINUTES, title: 'Event Starting in 30 Minutes!' },
        { key: 'TEN_MINUTES', minutes: REMINDER_INTERVALS.TEN_MINUTES, title: 'Event Starting Now!' },
      ];

      for (const interval of intervals) {
        const reminderTime = new Date(eventTime.getTime() - (interval.minutes * 60 * 1000));
        
        // Skip if reminder time is in the past
        if (reminderTime <= new Date()) {
          console.log(`Skipping ${interval.key} reminder for ${eventId} - time has passed`);
          continue;
        }

        // Schedule for each user
        for (const userId of allUsers) {
          const scheduleId = await this.scheduleNotification({
            userId,
            eventId,
            type: NOTIFICATION_TYPES.EVENT_REMINDER,
            title: `${interval.title} 🎉`,
            message: `"${title}" ${this.getTimeMessage(interval.minutes)}`,
            data: {
              eventId,
              eventTitle: title,
              eventTime: eventTime.toISOString(),
              reminderType: interval.key,
              isHost: userId === createdBy,
            },
            scheduledFor: reminderTime,
            priority: interval.minutes <= 60 ? NOTIFICATION_PRIORITY.HIGH : NOTIFICATION_PRIORITY.NORMAL,
          });

          notifications.push({
            scheduleId,
            userId,
            reminderType: interval.key,
            scheduledFor: reminderTime,
          });
        }
      }

      return {
        success: true,
        scheduledCount: notifications.length,
        notifications,
      };

    } catch (error) {
      console.error('Error scheduling event reminders:', error);
      throw error;
    }
  }

  /**
   * Schedule a single notification
   */
  static async scheduleNotification({
    userId,
    eventId = null,
    type,
    title,
    message,
    data = {},
    scheduledFor,
    priority = NOTIFICATION_PRIORITY.NORMAL,
    channels = [DELIVERY_CHANNELS.PUSH],
  }) {
    try {
      const scheduleId = `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const scheduledNotificationRef = doc(db, 'scheduledNotifications', scheduleId);

      const scheduledNotification = {
        id: scheduleId,
        userId,
        eventId,
        type,
        title,
        message,
        data,
        scheduledFor: Timestamp.fromDate(scheduledFor),
        createdAt: Timestamp.now(),
        status: 'pending',
        attempts: 0,
        priority,
        channels,
      };

      await setDoc(scheduledNotificationRef, scheduledNotification);
      
      console.log(`Scheduled notification ${scheduleId} for ${scheduledFor.toISOString()}`);
      return scheduleId;

    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  /**
   * Process pending scheduled notifications (should run every few minutes)
   */
  static async processPendingNotifications() {
    try {
      console.log('Processing pending scheduled notifications...');
      
      const now = new Date();
      const cutoffTime = new Date(now.getTime() + (5 * 60 * 1000)); // 5 minutes buffer

      // Query for notifications that should be sent now
      const q = query(
        collection(db, 'scheduledNotifications'),
        where('status', '==', 'pending'),
        where('scheduledFor', '<=', Timestamp.fromDate(cutoffTime)),
        orderBy('scheduledFor'),
        limit(50) // Process in batches
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        console.log('No pending notifications to process');
        return { success: true, processedCount: 0 };
      }

      console.log(`Found ${snapshot.size} notifications to process`);
      
      const results = [];
      const batch = writeBatch(db);

      for (const notificationDoc of snapshot.docs) {
        const notification = notificationDoc.data();
        
        try {
          // Check if event still exists and hasn't been cancelled
          if (notification.eventId) {
            const isEventValid = await this.validateEventForNotification(notification.eventId);
            if (!isEventValid) {
              // Cancel notification - event no longer exists or was cancelled
              batch.update(notificationDoc.ref, {
                status: 'cancelled',
                cancelledAt: Timestamp.now(),
                cancelReason: 'Event no longer valid',
              });
              results.push({ id: notification.id, status: 'cancelled', reason: 'Event invalid' });
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
            results.push({ id: notification.id, status: 'failed', reason: result.reason });
          }

        } catch (error) {
          console.error(`Error processing notification ${notification.id}:`, error);
          batch.update(notificationDoc.ref, {
            status: 'failed',
            attempts: notification.attempts + 1,
            lastAttemptAt: Timestamp.now(),
            failureReason: error.message,
          });
          results.push({ id: notification.id, status: 'failed', reason: error.message });
        }
      }

      // Commit all updates
      await batch.commit();

      console.log(`Processed ${results.length} scheduled notifications`);
      return {
        success: true,
        processedCount: results.length,
        results,
      };

    } catch (error) {
      console.error('Error processing pending notifications:', error);
      throw error;
    }
  }

  /**
   * Cancel scheduled notifications for an event
   */
  static async cancelEventNotifications(eventId, reason = 'Event cancelled') {
    try {
      const q = query(
        collection(db, 'scheduledNotifications'),
        where('eventId', '==', eventId),
        where('status', '==', 'pending')
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return { success: true, cancelledCount: 0 };
      }

      const batch = writeBatch(db);
      
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          status: 'cancelled',
          cancelledAt: Timestamp.now(),
          cancelReason: reason,
        });
      });

      await batch.commit();

      console.log(`Cancelled ${snapshot.size} scheduled notifications for event ${eventId}`);
      return {
        success: true,
        cancelledCount: snapshot.size,
      };

    } catch (error) {
      console.error('Error cancelling event notifications:', error);
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

      snapshot.docs.forEach(doc => {
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
      console.error('Error getting user scheduled notifications:', error);
      throw error;
    }
  }

  /**
   * Clean up old scheduled notifications
   */
  static async cleanupOldNotifications(olderThanDays = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const q = query(
        collection(db, 'scheduledNotifications'),
        where('createdAt', '<', Timestamp.fromDate(cutoffDate)),
        limit(100) // Process in batches
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return { success: true, deletedCount: 0 };
      }

      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      return {
        success: true,
        deletedCount: snapshot.size,
      };

    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }

  /**
   * Start the background processor (call this when app starts)
   */
  static startBackgroundProcessor() {
    console.log('Starting scheduled notification background processor...');
    
    // Process every 2 minutes
    const interval = 2 * 60 * 1000;
    
    // Initial processing
    this.processPendingNotifications().catch(error => {
      console.error('Initial notification processing failed:', error);
    });

    // Set up periodic processing
    const intervalId = setInterval(() => {
      this.processPendingNotifications().catch(error => {
        console.error('Periodic notification processing failed:', error);
      });
    }, interval);

    // Return cleanup function
    return () => {
      console.log('Stopping scheduled notification processor...');
      clearInterval(intervalId);
    };
  }

  // Helper methods

  static getTimeMessage(minutesBefore) {
    if (minutesBefore >= 24 * 60) {
      const days = Math.floor(minutesBefore / (24 * 60));
      return `starts in ${days} day${days > 1 ? 's' : ''}`;
    } else if (minutesBefore >= 60) {
      const hours = Math.floor(minutesBefore / 60);
      return `starts in ${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `starts in ${minutesBefore} minutes`;
    }
  }

  static async validateEventForNotification(eventId) {
    try {
      // Check if event exists across all studios using collectionGroup
      const eventQuery = query(
        collection(db, 'events'),
        where('__name__', '==', eventId)
      );
      
      const snapshot = await getDocs(eventQuery);
      
      if (snapshot.empty) {
        return false;
      }
      
      const eventData = snapshot.docs[0].data();
      
      // Check if event is cancelled
      if (eventData.cancelled) {
        return false;
      }
      
      // Check if event is in the past
      const eventTime = eventData.eventTimestamp.toDate ? eventData.eventTimestamp.toDate() : new Date(eventData.eventTimestamp);
      if (eventTime < new Date()) {
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error validating event:', error);
      return false; // Assume invalid on error
    }
  }
}

export default ScheduledNotificationService;