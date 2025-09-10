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
  static async scheduleEventReminders(eventId, eventData, userId, customReminderTemplates = []) {
    try {
      console.log('[EventScheduler] Scheduling server-side FCM reminders for event:', eventId);
      console.log('[EventScheduler] Custom templates count:', customReminderTemplates.length);

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
      const result = await ScheduledNotificationService.scheduleEventRemindersWithCustomTemplates(
        serverEventData,
        customReminderTemplates
      );

      console.log(`[EventScheduler] Server-side scheduling result:`, result);

      // Return legacy format for compatibility
      return result.notifications?.map(notification => ({
        notificationId: notification.scheduleId,
        reminderType: notification.reminderType,
        scheduledFor: notification.scheduledFor,
      })) || [];

    } catch (error) {
      console.error('[EventScheduler] Failed to schedule server-side event reminders:', error);
      return [];
    }
  }

  /**
   * Cancel all scheduled notifications for an event
   * Call this when events are cancelled/deleted
   */
  static async cancelEventReminders(eventId) {
    try {
      console.log('[EventScheduler] Cancelling server-side reminders for event:', eventId);
      
      const result = await ScheduledNotificationService.cancelEventNotifications(
        eventId, 
        'Event cancelled or deleted'
      );

      console.log(`[EventScheduler] Cancelled ${result.cancelledCount} server-side reminders for event ${eventId}`);
      return result;

    } catch (error) {
      console.error('[EventScheduler] Failed to cancel server-side event reminders:', error);
    }
  }

  /**
   * Reschedule notifications when event time changes
   * Call this when events are updated
   */
  static async rescheduleEventReminders(eventId, eventData, userId, customReminderTemplates = []) {
    try {
      console.log('[EventScheduler] Rescheduling server-side reminders for event:', eventId);
      
      // Cancel existing notifications
      await this.cancelEventReminders(eventId);
      
      // Schedule new notifications
      return await this.scheduleEventReminders(eventId, eventData, userId, customReminderTemplates);
    } catch (error) {
      console.error('[EventScheduler] Failed to reschedule server-side event reminders:', error);
      return [];
    }
  }

  /**
   * Get all pending scheduled notifications for debugging
   * For debugging/monitoring purposes
   */
  static async getAllScheduledNotifications() {
    try {
      // This now refers to server-side scheduled notifications
      console.log('[EventScheduler] Getting server-side scheduled notifications - use ScheduledNotificationService directly');
      return [];
    } catch (error) {
      console.error('[EventScheduler] Failed to get scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Cancel all scheduled notifications
   * For cleanup/debugging
   */
  static async cancelAllScheduledNotifications() {
    try {
      console.log('[EventScheduler] Server-side notifications cannot be bulk cancelled - contact admin');
    } catch (error) {
      console.error('[EventScheduler] Failed to cancel all notifications:', error);
    }
  }
}

export default EventNotificationScheduler;