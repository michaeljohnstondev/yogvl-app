// services/eventNotificationScheduler.js - Event-driven notification scheduling

import { ScheduledNotificationService } from './scheduledNotifications';

/**
 * Event-driven notification scheduler using server-side FCM notifications
 * This replaces local notifications with reliable server-side push notifications
 */
class EventNotificationScheduler {
  /**
   * Schedule notifications for a specific event using server-side scheduling
   * Call this when events are created/updated
   */
  static async scheduleEventReminders(
    eventId,
    eventData,
    userId,
    customReminderTemplates = []
  ) {
    try {
      console.log(
        '[EventScheduler] Scheduling server-side FCM reminders for event:',
        eventId
      );
      console.log(
        '[EventScheduler] Custom templates count:',
        customReminderTemplates.length
      );

      // Prepare event data for server-side scheduling
      const serverEventData = {
        id: eventId,
        title: eventData.title,
        eventTimestamp: eventData.startTime || eventData.eventTimestamp,
        location: eventData.location,
        studioId: eventData.studioId,
        subscribers: eventData.subscribers || [userId], // Include at least the creator
        createdBy: userId,
      };

      // Use server-side scheduler with custom templates
      const result =
        await ScheduledNotificationService.scheduleEventRemindersWithCustomTemplates(
          serverEventData,
          customReminderTemplates
        );

      console.log(`[EventScheduler] Server-side scheduling result:`, result);

      // Return legacy format for compatibility
      return (
        result.notifications?.map((notification) => ({
          notificationId: notification.scheduleId,
          reminderType: notification.reminderType,
          scheduledFor: notification.scheduledFor,
        })) || []
      );
    } catch (error) {
      console.error(
        '[EventScheduler] Failed to schedule server-side event reminders:',
        error
      );
      return [];
    }
  }

  /**
   * Cancel all scheduled notifications for an event
   * Call this when events are cancelled/deleted
   * Note: This uses server-side Cloud Function to cancel all user notifications for the event
   */
  static async cancelEventReminders(eventId) {
    try {
      console.log(
        '[EventScheduler] Cancelling server-side reminders for event:',
        eventId
      );

      // Use Cloud Function to cancel all scheduled notifications for this event
      // This handles cancellation across all subscribers without needing to iterate client-side
      const result =
        await ScheduledNotificationService.cancelAllEventScheduledNotifications(
          eventId,
          'Event updated - rescheduling notifications'
        );

      console.log(
        `[EventScheduler] Cancelled server-side reminders for event ${eventId}`
      );
      return result;
    } catch (error) {
      console.error(
        '[EventScheduler] Failed to cancel server-side event reminders:',
        error
      );
    }
  }

  /**
   * Reschedule notifications when event time changes
   * Call this when events are updated
   *
   * NOTE: This method is deprecated and should not be called from client-side code.
   * Server-side Cloud Functions handle notification rescheduling automatically when
   * event documents are updated. Client-side rescheduling is unnecessary and creates
   * duplicate work.
   */
  static async rescheduleEventReminders(
    eventId,
    eventData,
    userId,
    customReminderTemplates = []
  ) {
    console.log(
      '[EventScheduler] ⚠️  Skipping client-side reschedule - Cloud Functions handle event notification updates automatically when event is updated'
    );

    // Return empty array to indicate no client-side notifications were scheduled
    // Server-side Cloud Functions will detect the event update and handle rescheduling
    return [];
  }

  /**
   * Get all pending scheduled notifications for debugging
   * For debugging/monitoring purposes
   */
  static async getAllScheduledNotifications() {
    try {
      // This now refers to server-side scheduled notifications
      console.log(
        '[EventScheduler] Getting server-side scheduled notifications - use ScheduledNotificationService directly'
      );
      return [];
    } catch (error) {
      console.error(
        '[EventScheduler] Failed to get scheduled notifications:',
        error
      );
      return [];
    }
  }

  /**
   * Cancel all scheduled notifications
   * For cleanup/debugging
   */
  static async cancelAllScheduledNotifications() {
    try {
      console.log(
        '[EventScheduler] Server-side notifications cannot be bulk cancelled - contact admin'
      );
    } catch (error) {
      console.error(
        '[EventScheduler] Failed to cancel all notifications:',
        error
      );
    }
  }
}

export default EventNotificationScheduler;
