// FILE: services/notificationPermissionService.js
// Contextual notification permission request service
// Requests notification permissions at meaningful moments (creating/joining events, showing interest)
// Strategy: Ask once per trigger type - gives user multiple chances in different contexts

import AsyncStorage from '@react-native-async-storage/async-storage';
import fcmService from './fcmServiceWrapper';

const STORAGE_KEY_PREFIX = 'notification_permission_';

class NotificationPermissionService {
  constructor() {
    this.requestedTriggers = new Set(); // Track which triggers have been used
    this.isRequesting = false;
    this.permissionGranted = false;
  }

  /**
   * Initialize service - check if we've already requested permission for each trigger type
   */
  async initialize() {
    try {
      // Check which triggers have been used
      const triggers = ['create_event', 'join_event', 'show_interest'];

      for (const trigger of triggers) {
        const requested = await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}${trigger}`);
        if (requested === 'true') {
          this.requestedTriggers.add(trigger);
        }
      }

      console.log('[NotificationPermission] Previously requested triggers:', Array.from(this.requestedTriggers));
    } catch (error) {
      console.error('[NotificationPermission] Failed to check permission status:', error);
    }
  }

  /**
   * Request notification permission if not already requested for this trigger type
   * Strategy: Ask once per trigger type (create_event, join_event, show_interest)
   * This gives users multiple chances to allow notifications in different contexts
   *
   * @param {string} userId - Current user ID
   * @param {string} trigger - What triggered the request (create_event, join_event, show_interest)
   * @returns {Promise<boolean>} - True if permission granted
   */
  async requestPermissionIfNeeded(userId, trigger = 'unknown') {
    try {
      // If permission already granted, register token and skip
      if (this.permissionGranted) {
        console.log('[NotificationPermission] Permission already granted, ensuring token is registered');
        if (userId) {
          await fcmService.registerTokenForUser(userId);
        }
        return true;
      }

      // Don't request if currently requesting
      if (this.isRequesting) {
        console.log('[NotificationPermission] Request already in progress');
        return false;
      }

      // Check if we've already asked for this specific trigger
      if (this.requestedTriggers.has(trigger)) {
        console.log(`[NotificationPermission] Already requested for trigger: ${trigger}`);
        return false;
      }

      console.log(`[NotificationPermission] 🔔 Requesting permission (trigger: ${trigger})`);
      this.isRequesting = true;

      // Request permission via FCM service
      const result = await fcmService.requestPermission();

      // Mark this trigger as used (regardless of outcome)
      this.requestedTriggers.add(trigger);
      await AsyncStorage.setItem(`${STORAGE_KEY_PREFIX}${trigger}`, 'true');

      if (result.granted) {
        console.log('[NotificationPermission] ✅ Permission granted');
        this.permissionGranted = true;

        // Register FCM token for this user
        if (userId) {
          await fcmService.registerTokenForUser(userId);
        }
      } else {
        console.log(`[NotificationPermission] ⚠️ Permission denied for trigger: ${trigger}`);
        console.log(`[NotificationPermission] Can still ask via: ${['create_event', 'join_event', 'show_interest'].filter(t => !this.requestedTriggers.has(t)).join(', ')}`);
      }

      this.isRequesting = false;
      return result.granted;
    } catch (error) {
      console.error('[NotificationPermission] Failed to request permission:', error);
      this.isRequesting = false;
      return false;
    }
  }

  /**
   * Check if permission has already been requested for a specific trigger
   * @param {string} trigger - Trigger type to check
   */
  hasRequestedForTrigger(trigger) {
    return this.requestedTriggers.has(trigger);
  }

  /**
   * Check if permission has been granted
   */
  isGranted() {
    return this.permissionGranted;
  }

  /**
   * Reset permission request state (for testing/dev only)
   */
  async reset() {
    const triggers = ['create_event', 'join_event', 'show_interest'];
    for (const trigger of triggers) {
      await AsyncStorage.removeItem(`${STORAGE_KEY_PREFIX}${trigger}`);
    }
    this.requestedTriggers.clear();
    this.permissionGranted = false;
    console.log('[NotificationPermission] Reset all permission request states');
  }
}

// Export singleton
export const notificationPermissionService = new NotificationPermissionService();
export default notificationPermissionService;
