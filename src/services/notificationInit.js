// services/notificationInit.js - Initialize notification services

import ScheduledNotificationService from './scheduledNotifications';

let processorCleanup = null;

/**
 * Initialize scheduled notification services
 * Call this when your app starts (e.g., in App.js)
 */
export const initializeNotificationServices = () => {
  try {
    // DISABLED: Removed inefficient 2-minute polling background processor
    // TODO: Replace with proper event-driven notification scheduling
    console.log(
      '[NotificationInit] Notification services initialized (background polling disabled)'
    );

    // NOTE: Old notification cleanup is now user-scoped and should be called
    // when a user logs in, not during app initialization
    console.log(
      '[NotificationInit] Global cleanup disabled - use user-scoped cleanup after login'
    );

    return true;
  } catch (error) {
    console.error(
      '[NotificationInit] Failed to initialize notification services:',
      error
    );
    return false;
  }
};

/**
 * Cleanup notification services
 * Call this when your app shuts down
 */
export const cleanupNotificationServices = () => {
  if (processorCleanup) {
    console.log(
      '[NotificationInit] Shutting down scheduled notification processor...'
    );
    processorCleanup();
    processorCleanup = null;
  }
};

/**
 * Get the status of notification services
 */
export const getNotificationServiceStatus = () => {
  return {
    processorRunning: processorCleanup !== null,
  };
};

export default {
  initializeNotificationServices,
  cleanupNotificationServices,
  getNotificationServiceStatus,
};
