// services/scheduled/index.js - Main Entry Point for Scheduled Notifications

// Import all modules
import { ScheduledNotificationCore } from './scheduledNotificationCore';
import {
  EventReminderTemplates,
  REMINDER_INTERVALS,
} from './eventReminderTemplates';
import { NotificationProcessor } from './notificationProcessor';
import { NotificationValidator } from './notificationValidator';

/**
 * Unified ScheduledNotificationService maintaining backward compatibility
 * while providing modular internal structure
 */
export class ScheduledNotificationService {
  // ========== CORE SCHEDULING ==========

  /**
   * Schedule a single notification
   */
  static async scheduleNotification(params) {
    return ScheduledNotificationCore.scheduleNotification(params);
  }

  // ========== EVENT REMINDERS ==========

  /**
   * Subscribe user to event notifications with specific settings
   */
  static async subscribeToEventNotifications(
    userId,
    eventId,
    studioId,
    notificationSettings
  ) {
    try {
      console.log(
        `[ScheduledNotificationService] Subscribing user ${userId} to event ${eventId} notifications:`,
        notificationSettings
      );

      // Schedule reminders based on user's settings
      if (notificationSettings.eventReminders) {
        // Fetch the full event data needed for scheduling
        const { doc, getDoc } = await import('../../lib/firebase/firestore');
        const { db } = await import('../../auth/services/firebase');

        const eventRef = doc(db, 'studios', studioId, 'events', eventId);
        const eventDoc = await getDoc(eventRef);

        if (!eventDoc.exists()) {
          throw new Error(`Event ${eventId} not found`);
        }

        const eventData = {
          id: eventId,
          studioId,
          ...eventDoc.data(),
        };

        // Schedule standard reminders if enabled
        await EventReminderTemplates.scheduleEventRemindersForUser(
          eventData,
          userId,
          notificationSettings
        );
      }

      return {
        success: true,
        userId,
        eventId,
        settingsApplied: notificationSettings,
      };
    } catch (error) {
      console.error(
        '[ScheduledNotificationService] Error subscribing to event notifications:',
        error
      );
      throw error;
    }
  }

  /**
   * Unsubscribe user from event notifications
   */
  static async unsubscribeFromEventNotifications(userId, eventId) {
    try {
      console.log(
        `[ScheduledNotificationService] Unsubscribing user ${userId} from event ${eventId} notifications`
      );

      // Cancel any scheduled notifications for this user and event
      await NotificationProcessor.cancelUserEventNotifications(
        userId,
        eventId,
        'User unsubscribed from event'
      );

      return {
        success: true,
        userId,
        eventId,
        message: 'Successfully unsubscribed from event notifications',
      };
    } catch (error) {
      console.error(
        '[ScheduledNotificationService] Error unsubscribing from event notifications:',
        error
      );
      throw error;
    }
  }

  /**
   * Schedule event reminder notifications with custom templates
   */
  static async scheduleEventRemindersWithCustomTemplates(
    eventData,
    customReminderTemplates = []
  ) {
    return EventReminderTemplates.scheduleEventRemindersWithCustomTemplates(
      eventData,
      customReminderTemplates
    );
  }

  /**
   * Schedule event reminder notifications for an event (legacy method)
   */
  static async scheduleEventReminders(eventData) {
    return EventReminderTemplates.scheduleEventReminders(eventData);
  }

  /**
   * Schedule attendance reminder for event host 1 hour after event starts
   */
  static async scheduleAttendanceReminder(eventData) {
    try {
      console.log(
        `[ScheduledNotificationService] Scheduling attendance reminder for event ${eventData.id}`
      );

      // Calculate 1 hour after event start time
      const eventDate = new Date(eventData.date.seconds * 1000); // Convert Firestore timestamp
      const attendanceReminderTime = new Date(eventDate.getTime() + 60 * 60 * 1000); // Add 1 hour

      // Only schedule if the reminder time is in the future
      if (attendanceReminderTime <= new Date()) {
        console.log(
          `[ScheduledNotificationService] Attendance reminder time ${attendanceReminderTime} is in the past, skipping`
        );
        return { success: true, skipped: true, reason: 'Event already past' };
      }

      // Import notification types
      const { NOTIFICATION_TYPES, NOTIFICATION_PRIORITY, DELIVERY_CHANNELS } =
        await import('../shared/NotificationEngine');

      // Schedule attendance reminder for the event host only
      const scheduleId = await ScheduledNotificationCore.scheduleNotification({
        userId: eventData.createdBy, // Event host
        eventId: eventData.id,
        type: NOTIFICATION_TYPES.ATTENDANCE_REMINDER,
        title: 'Mark Attendance',
        message: `Mark your attendance for "${eventData.title}"`,
        data: {
          eventId: eventData.id,
          eventTitle: eventData.title,
          studioId: eventData.studioId,
          reminderType: 'post_event_1h',
        },
        scheduledFor: attendanceReminderTime,
        priority: NOTIFICATION_PRIORITY.NORMAL,
        channels: [DELIVERY_CHANNELS.PUSH],
      });

      console.log(
        `[ScheduledNotificationService] Attendance reminder scheduled with ID: ${scheduleId} for ${attendanceReminderTime.toISOString()}`
      );

      return {
        success: true,
        scheduleId,
        reminderTime: attendanceReminderTime,
        eventId: eventData.id,
        hostId: eventData.createdBy,
      };
    } catch (error) {
      console.error(
        '[ScheduledNotificationService] Error scheduling attendance reminder:',
        error
      );
      throw error;
    }
  }

  /**
   * Schedule event recap notification for event host 1 hour after event starts
   */
  static async scheduleEventRecap(eventData) {
    try {
      console.log(
        `[ScheduledNotificationService] Scheduling event recap for event ${eventData.id}`
      );

      // Check if event recap is enabled in event notification settings
      const notificationSettings = eventData.notificationSettings || {};
      if (notificationSettings.eventRecap === false) {
        console.log(
          `[ScheduledNotificationService] Event recap disabled for event ${eventData.id}, skipping`
        );
        return { success: true, skipped: true, reason: 'Event recap disabled' };
      }

      // Calculate 1 hour after event start time
      const eventDate = new Date(eventData.date.seconds * 1000); // Convert Firestore timestamp
      const eventRecapTime = new Date(eventDate.getTime() + 60 * 60 * 1000); // Add 1 hour

      // Only schedule if the recap time is in the future
      if (eventRecapTime <= new Date()) {
        console.log(
          `[ScheduledNotificationService] Event recap time ${eventRecapTime} is in the past, skipping`
        );
        return { success: true, skipped: true, reason: 'Event already past' };
      }

      // Import notification types
      const { NOTIFICATION_TYPES, NOTIFICATION_PRIORITY, DELIVERY_CHANNELS } =
        await import('../shared/NotificationEngine');

      // Schedule event recap for the event host only
      const scheduleId = await ScheduledNotificationCore.scheduleNotification({
        userId: eventData.createdBy, // Event host
        eventId: eventData.id,
        type: NOTIFICATION_TYPES.EVENT_RECAP,
        title: 'Event Recap Available',
        message: `Recap for "${eventData.title}" is ready!`,
        data: {
          eventId: eventData.id,
          eventTitle: eventData.title,
          studioId: eventData.studioId,
          reminderType: 'post_event_recap_1h',
        },
        scheduledFor: eventRecapTime,
        priority: NOTIFICATION_PRIORITY.NORMAL,
        channels: [DELIVERY_CHANNELS.PUSH],
      });

      console.log(
        `[ScheduledNotificationService] Event recap scheduled with ID: ${scheduleId} for ${eventRecapTime.toISOString()}`
      );

      return {
        success: true,
        scheduleId,
        reminderTime: eventRecapTime,
        eventId: eventData.id,
        hostId: eventData.createdBy,
      };
    } catch (error) {
      console.error(
        '[ScheduledNotificationService] Error scheduling event recap:',
        error
      );
      throw error;
    }
  }

  // ========== BACKGROUND PROCESSING ==========

  /**
   * Process pending scheduled notifications for a specific user
   */
  static async processPendingNotifications(userId) {
    return NotificationProcessor.processPendingNotifications(userId);
  }

  /**
   * Cancel scheduled notifications for an event (DEPRECATED)
   */
  static async cancelEventNotifications(eventId, reason = 'Event cancelled') {
    return NotificationProcessor.cancelEventNotifications(eventId, reason);
  }

  /**
   * Cancel scheduled notifications for a specific user and event
   */
  static async cancelUserEventNotifications(
    userId,
    eventId,
    reason = 'Event cancelled'
  ) {
    return NotificationProcessor.cancelUserEventNotifications(
      userId,
      eventId,
      reason
    );
  }

  /**
   * Get scheduled notifications for a user
   */
  static async getUserScheduledNotifications(userId, includeSent = false) {
    return NotificationProcessor.getUserScheduledNotifications(
      userId,
      includeSent
    );
  }

  /**
   * Clean up old scheduled notifications for a specific user
   */
  static async cleanupOldNotifications(userId, olderThanDays = 30) {
    return NotificationProcessor.cleanupOldNotifications(userId, olderThanDays);
  }

  /**
   * Start the background processor (call this when app starts)
   */
  static startBackgroundProcessor() {
    return NotificationProcessor.startBackgroundProcessor();
  }

  // ========== VALIDATION & HELPERS ==========

  /**
   * Validate event for notification
   */
  static async validateEventForNotification(eventId) {
    return NotificationValidator.validateEventForNotification(eventId);
  }

  /**
   * Get time message helper
   */
  static getTimeMessage(minutesBefore) {
    return EventReminderTemplates.getTimeMessage(minutesBefore);
  }
}

// Export everything for flexibility
export {
  ScheduledNotificationCore,
  EventReminderTemplates,
  NotificationProcessor,
  NotificationValidator,
  REMINDER_INTERVALS,
};

// Default export for backward compatibility
export default ScheduledNotificationService;
