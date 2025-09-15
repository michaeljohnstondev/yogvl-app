// services/scheduled/index.js - Main Entry Point for Scheduled Notifications

// Import all modules
import { ScheduledNotificationCore } from './scheduledNotificationCore';
import { EventReminderTemplates, REMINDER_INTERVALS } from './eventReminderTemplates';
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
   * Schedule event reminder notifications with custom templates
   */
  static async scheduleEventRemindersWithCustomTemplates(eventData, customReminderTemplates = []) {
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
  static async cancelUserEventNotifications(userId, eventId, reason = 'Event cancelled') {
    return NotificationProcessor.cancelUserEventNotifications(userId, eventId, reason);
  }

  /**
   * Get scheduled notifications for a user
   */
  static async getUserScheduledNotifications(userId, includeSent = false) {
    return NotificationProcessor.getUserScheduledNotifications(userId, includeSent);
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