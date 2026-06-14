// FILE: services/notificationPermissionService.js
// Contextual notification permission request service
// Requests notification permissions at meaningful moments (creating/joining events, showing interest)
// Strategy: Ask once per trigger type - gives user multiple chances in different contexts
// Also checks actual OS permission status and prompts users to enable in Settings

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import fcmService from './fcmServiceWrapper';

const STORAGE_KEY_PREFIX = 'notification_permission_';
const SETTINGS_PROMPT_KEY = 'notification_settings_prompt_last';
const SETTINGS_PROMPT_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

class NotificationPermissionService {
  constructor() {
    this.requestedTriggers = new Set(); // Track which triggers have been used
    this.isRequesting = false;
    this.permissionGranted = false;
    this.initialized = false;
  }

  /**
   * Initialize service - hydrate trigger history AND check actual OS permission status
   */
  async initialize() {
    try {
      // Check which triggers have been used
      const triggers = ['create_event', 'join_event', 'show_interest', 'home_visit'];

      for (const trigger of triggers) {
        const requested = await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}${trigger}`);
        if (requested === 'true') {
          this.requestedTriggers.add(trigger);
        }
      }

      // Check actual OS permission status (not just our internal flag)
      const permissionStatus = await fcmService.getPermissionStatus();
      this.permissionGranted = permissionStatus.granted;

      this.initialized = true;

      console.log('[NotificationPermission] Initialized:', {
        permissionGranted: this.permissionGranted,
        requestedTriggers: Array.from(this.requestedTriggers),
      });
    } catch (error) {
      console.error('[NotificationPermission] Failed to initialize:', error);
      this.initialized = true; // Mark initialized even on error to avoid blocking
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
      // Permission already granted — just ensure the FCM token is
      // registered for this user and skip the native call.
      if (this.permissionGranted) {
        if (userId) {
          await fcmService.registerTokenForUser(userId);
        }
        return true;
      }

      // Avoid concurrent native prompts.
      if (this.isRequesting) {
        return false;
      }

      // Always ask. This is a notifications-driven app, so we want every
      // natural trigger to attempt a request. The OS will only surface a
      // system prompt the first time (undetermined status); after grant
      // or deny it returns the cached value silently — no user-visible
      // re-prompt. Catches users who flipped notifications on in Settings
      // between launches.
      console.log(`[NotificationPermission] 🔔 Requesting permission (trigger: ${trigger})`);
      this.isRequesting = true;

      const result = await fcmService.requestPermission();

      // Track which triggers fired (for debug visibility), but don't gate
      // future calls on it — the OS handles deduplication.
      this.requestedTriggers.add(trigger);
      await AsyncStorage.setItem(`${STORAGE_KEY_PREFIX}${trigger}`, 'true');

      if (result.granted) {
        console.log('[NotificationPermission] ✅ Permission granted');
        this.permissionGranted = true;
        if (userId) {
          await fcmService.registerTokenForUser(userId);
        }
      } else {
        console.log(`[NotificationPermission] ⚠️ Permission denied (trigger: ${trigger})`);
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
   * Check if notifications are disabled and we should show a settings prompt.
   * Returns true if: notifications are off AND we haven't prompted in the last 24h.
   * Call this on HomeScreen to show a gentle banner/alert.
   *
   * @returns {Promise<boolean>} - True if we should show the settings prompt
   */
  async shouldShowSettingsPrompt() {
    try {
      // Re-check actual OS permission (user may have changed it in Settings)
      const permissionStatus = await fcmService.getPermissionStatus();
      this.permissionGranted = permissionStatus.granted;

      // If permission is granted, no prompt needed
      if (this.permissionGranted) return false;

      // Only prompt if we've already asked at least once (don't prompt brand new users)
      if (this.requestedTriggers.size === 0) return false;

      // Cooldown: don't show more than once per 24h
      const lastPrompt = await AsyncStorage.getItem(SETTINGS_PROMPT_KEY);
      if (lastPrompt) {
        const elapsed = Date.now() - parseInt(lastPrompt, 10);
        if (elapsed < SETTINGS_PROMPT_COOLDOWN_MS) return false;
      }

      return true;
    } catch (error) {
      console.error('[NotificationPermission] Failed to check settings prompt status:', error);
      return false;
    }
  }

  /**
   * Mark that we just showed the settings prompt (starts the 24h cooldown)
   */
  async markSettingsPromptShown() {
    try {
      await AsyncStorage.setItem(SETTINGS_PROMPT_KEY, Date.now().toString());
    } catch (error) {
      console.error('[NotificationPermission] Failed to mark settings prompt shown:', error);
    }
  }

  /**
   * Open the OS app settings so the user can enable notifications
   */
  openNotificationSettings() {
    Linking.openSettings();
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
    await AsyncStorage.removeItem(SETTINGS_PROMPT_KEY);
    this.requestedTriggers.clear();
    this.permissionGranted = false;
    console.log('[NotificationPermission] Reset all permission request states');
  }
}

// Export singleton
export const notificationPermissionService = new NotificationPermissionService();
export default notificationPermissionService;
