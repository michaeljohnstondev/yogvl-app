// FILE: services/notificationDisplayService.js
// Service to display foreground FCM notifications using VibeAlert system
// Bridges Firebase Cloud Messaging with VibeAlert notification banners

class NotificationDisplayService {
  constructor() {
    this.vibeAlert = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the service with VibeAlert reference
   * Should be called in App.js after VibeAlertProvider is available
   */
  initialize(vibeAlertRef) {
    this.vibeAlert = vibeAlertRef;
    this.isInitialized = true;
    console.log('[NotificationDisplay] Service initialized with VibeAlert reference');
  }

  /**
   * Check if service is ready to display notifications
   */
  isReady() {
    return this.isInitialized && this.vibeAlert !== null;
  }

  /**
   * Display a foreground notification using VibeAlert banner
   * @param {Object} notificationData - FCM notification payload
   * @param {Function} onPress - Optional callback when banner is pressed
   */
  displayForegroundNotification(notificationData, onPress = null) {
    if (!this.isReady()) {
      console.warn('[NotificationDisplay] Service not initialized or VibeAlert not available');
      return false;
    }

    try {
      // Extract notification details from FCM payload
      const {
        notification = {},
        data = {},
      } = notificationData;

      const title = notification.title || data.title || 'New Notification';
      const message = notification.body || data.message || data.body || '';
      const notificationType = data.type || 'info';

      console.log('[NotificationDisplay] Displaying foreground notification:', {
        title,
        message,
        type: notificationType,
      });

      // Show banner using VibeAlert
      this.vibeAlert.notificationBanner(
        title,
        message,
        notificationType,
        onPress
      );

      return true;
    } catch (error) {
      console.error('[NotificationDisplay] Failed to display notification:', error);
      return false;
    }
  }

  /**
   * Display notification with custom navigation handling
   * @param {Object} notificationData - FCM notification payload
   * @param {Function} navigationHandler - Function to handle navigation
   */
  displayWithNavigation(notificationData, navigationHandler) {
    const onPress = () => {
      if (navigationHandler && notificationData.data) {
        navigationHandler(notificationData.data);
      }
    };

    return this.displayForegroundNotification(notificationData, onPress);
  }

  /**
   * Display a simple banner notification
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} type - Notification type (success, error, warning, info)
   * @param {Function} onPress - Optional callback
   */
  displaySimpleBanner(title, message, type = 'info', onPress = null) {
    if (!this.isReady()) {
      console.warn('[NotificationDisplay] Service not initialized');
      return false;
    }

    this.vibeAlert.notificationBanner(title, message, type, onPress);
    return true;
  }

  /**
   * Display success notification
   */
  displaySuccess(title, message, onPress = null) {
    return this.displaySimpleBanner(title, message, 'success', onPress);
  }

  /**
   * Display error notification
   */
  displayError(title, message, onPress = null) {
    return this.displaySimpleBanner(title, message, 'error', onPress);
  }

  /**
   * Display warning notification
   */
  displayWarning(title, message, onPress = null) {
    return this.displaySimpleBanner(title, message, 'warning', onPress);
  }

  /**
   * Display info notification
   */
  displayInfo(title, message, onPress = null) {
    return this.displaySimpleBanner(title, message, 'info', onPress);
  }

  /**
   * Hide current banner
   */
  hideBanner() {
    if (this.isReady() && this.vibeAlert.hideBanner) {
      this.vibeAlert.hideBanner();
    }
  }

  /**
   * Get notification type from FCM data
   * Maps FCM notification types to VibeAlert banner types
   */
  mapNotificationType(fcmType) {
    const typeMapping = {
      event_reminder: 'event_reminder',
      event_updated: 'event_updated',
      event_comment: 'event_comment',
      follow_notification: 'follow_notification',
      mutual_follow: 'mutual_follow',
      invitation_received: 'invitation_received',
      admin_notification: 'admin_notification',
      ban_notification: 'ban_notification',
      success: 'success',
      error: 'error',
      warning: 'warning',
      info: 'info',
    };

    return typeMapping[fcmType] || 'info';
  }

  /**
   * Clean up service
   */
  cleanup() {
    this.vibeAlert = null;
    this.isInitialized = false;
    console.log('[NotificationDisplay] Service cleaned up');
  }
}

// Export singleton instance
export const notificationDisplayService = new NotificationDisplayService();
export default notificationDisplayService;