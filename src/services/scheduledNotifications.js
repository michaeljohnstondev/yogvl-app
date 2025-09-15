// services/scheduledNotifications.js - Scheduled Background Notifications
// REFACTORED: Now uses modular structure from src/services/scheduled/

// Re-export the new modular scheduled notification service
export {
  ScheduledNotificationService,
  ScheduledNotificationCore,
  EventReminderTemplates,
  NotificationProcessor,
  NotificationValidator,
  REMINDER_INTERVALS,
} from './scheduled';

// Default export maintains backward compatibility
export { default } from './scheduled';
