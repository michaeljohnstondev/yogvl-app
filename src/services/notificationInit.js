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
    console.log('[NotificationInit] Notification services initialized (background polling disabled)');
    
    // Run one-time cleanup of old notifications
    ScheduledNotificationService.cleanupOldNotifications(30).then(result => {
      if (result.deletedCount > 0) {
        console.log(`[NotificationInit] 🧹 Cleaned up ${result.deletedCount} old scheduled notifications`);
      }
    }).catch(error => {
      console.warn('[NotificationInit] Failed to cleanup old notifications:', error);
    });
    
    return true;
  } catch (error) {
    console.error('[NotificationInit] Failed to initialize notification services:', error);
    return false;
  }
};

/**
 * Cleanup notification services
 * Call this when your app shuts down
 */
export const cleanupNotificationServices = () => {
  if (processorCleanup) {
    console.log('[NotificationInit] Shutting down scheduled notification processor...');
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