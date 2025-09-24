// services/CustomTemplateService.js - Manage persistent custom notification templates

import { doc, getDoc, updateDoc } from '../lib/firebase/firestore';
import { db } from '../auth/services/firebase';

/**
 * Service for managing custom notification templates that persist across events
 */
class CustomTemplateService {
  /**
   * Get saved custom templates for a user with context support
   * @param {string} userId - User ID
   * @param {string} context - 'hosting' or 'attending' context
   */
  static async getSavedCustomTemplates(userId, context = null) {
    try {
      if (!userId) {
        console.warn('[CustomTemplates] No user ID provided');
        return [];
      }

      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        console.log('[CustomTemplates] User document not found');
        return [];
      }

      const userData = userDoc.data();

      // If no context specified, use legacy path for backward compatibility
      if (!context) {
        const savedTemplates =
          userData?.userdata?.settings?.notifications?.customTemplates || [];
        console.log(
          `[CustomTemplates] Found ${savedTemplates.length} saved custom templates (legacy) for user`
        );
        return savedTemplates;
      }

      // Context-specific template storage
      const contextPath = context === 'hosting' ? 'hostingTemplates' : 'attendingTemplates';
      const savedTemplates =
        userData?.userdata?.settings?.notifications?.[contextPath] || [];

      console.log(
        `[CustomTemplates] Found ${savedTemplates.length} saved custom templates for ${context} context`
      );
      return savedTemplates;
    } catch (error) {
      console.error(
        '[CustomTemplates] Failed to get saved custom templates:',
        error
      );
      return [];
    }
  }

  /**
   * Save template settings - simple key-value format
   * @param {string} userId - User ID
   * @param {Object} templateSettings - Object like {'15min': true, '1hour': false, '5min': true}
   * @param {string} context - 'hosting' or 'attending' context
   */
  static async saveTemplateSettings(userId, templateSettings, context = null) {
    try {
      if (!userId) {
        console.error('[CustomTemplates] No user ID provided');
        return false;
      }

      if (!templateSettings || typeof templateSettings !== 'object') {
        console.warn('[CustomTemplates] Invalid template settings provided');
        return false;
      }

      const userRef = doc(db, 'users', userId);
      const contextPath = context === 'hosting' ? 'hosting' : 'attending';
      const storagePath = `userdata.settings.notifications.${contextPath}.reminderTemplates`;

      await updateDoc(userRef, {
        [storagePath]: templateSettings,
        'userdata.settings.lastUpdated': new Date(),
      });

      console.log(`[CustomTemplates] Saved template settings for ${context} context:`, templateSettings);
      return true;
    } catch (error) {
      console.error('[CustomTemplates] Failed to save template settings:', error);
      return false;
    }
  }

  /**
   * Remove a specific custom template from saved templates with context support
   * @param {string} userId - User ID
   * @param {string} templateId - Template ID to remove
   * @param {string} context - 'hosting' or 'attending' context
   */
  static async removeCustomTemplate(userId, templateId, context = null) {
    try {
      if (!userId || !templateId) {
        console.error('[CustomTemplates] Missing user ID or template ID');
        return false;
      }

      const savedTemplates = await this.getSavedCustomTemplates(userId, context);
      const updatedTemplates = savedTemplates.filter(
        (template) => template.id !== templateId
      );

      if (updatedTemplates.length === savedTemplates.length) {
        console.log('[CustomTemplates] Template not found in saved templates');
        return true; // Not an error
      }

      const userRef = doc(db, 'users', userId);

      // Determine the storage path based on context
      const storagePath = context
        ? `userdata.settings.notifications.${context === 'hosting' ? 'hostingTemplates' : 'attendingTemplates'}`
        : 'userdata.settings.notifications.customTemplates'; // Legacy path for backward compatibility

      await updateDoc(userRef, {
        [storagePath]: updatedTemplates,
        'userdata.settings.lastUpdated': new Date(),
      });

      console.log(`[CustomTemplates] Removed custom template ${templateId}`);
      return true;
    } catch (error) {
      console.error(
        '[CustomTemplates] Failed to remove custom template:',
        error
      );
      return false;
    }
  }

  /**
   * Get enabled template IDs for a user context (default settings)
   * @param {string} userId - User ID
   * @param {string} context - 'hosting' or 'attending' context
   */
  static async getEnabledTemplateIds(userId, context = null) {
    try {
      if (!userId) {
        console.warn('[CustomTemplates] No user ID provided for enabled templates');
        return [];
      }

      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        console.log('[CustomTemplates] User document not found for enabled templates');
        return [];
      }

      const userData = userDoc.data();

      // Context-specific enabled template storage
      const enabledPath = context === 'hosting' ? 'hostingDefaults' : 'attendingDefaults';
      const enabledTemplateIds =
        userData?.userdata?.settings?.notifications?.[enabledPath]?.enabledTemplates || [];

      console.log(
        `[CustomTemplates] Found ${enabledTemplateIds.length} enabled template IDs for ${context} context`
      );
      return enabledTemplateIds;
    } catch (error) {
      console.error(
        '[CustomTemplates] Failed to get enabled template IDs:',
        error
      );
      return [];
    }
  }

  /**
   * Save enabled template IDs for a user context (default settings)
   * @param {string} userId - User ID
   * @param {Array} enabledTemplateIds - Array of template IDs that should be enabled by default
   * @param {string} context - 'hosting' or 'attending' context
   */
  static async saveEnabledTemplateIds(userId, enabledTemplateIds, context = null) {
    try {
      if (!userId) {
        console.error('[CustomTemplates] No user ID provided for saving enabled templates');
        return false;
      }

      if (!Array.isArray(enabledTemplateIds)) {
        console.warn('[CustomTemplates] Invalid enabled template IDs provided');
        return false;
      }

      const userRef = doc(db, 'users', userId);

      // Context-specific enabled template storage
      const enabledPath = context === 'hosting' ? 'hostingDefaults' : 'attendingDefaults';
      const storagePath = `userdata.settings.notifications.${enabledPath}.enabledTemplates`;

      await updateDoc(userRef, {
        [storagePath]: enabledTemplateIds,
        'userdata.settings.lastUpdated': new Date(),
      });

      console.log(
        `[CustomTemplates] Successfully saved ${enabledTemplateIds.length} enabled template IDs for ${context} context`
      );
      return true;
    } catch (error) {
      console.error(
        '[CustomTemplates] Failed to save enabled template IDs:',
        error
      );
      return false;
    }
  }

  /**
   * Get unified template array with context support
   * @param {string} userId - User ID
   * @param {string} context - 'hosting' or 'attending' context
   */
  static async getCombinedTemplates(userId, context = null) {
    try {
      if (!userId) {
        console.warn('[CustomTemplates] No user ID provided');
        return this.getDefaultTemplates();
      }

      // Get user's saved template array for this context
      const savedTemplates = await this.getSavedCustomTemplates(userId, context);

      // If user has no saved templates yet, initialize with defaults
      if (savedTemplates.length === 0) {
        const defaultTemplates = this.getDefaultTemplates();
        await this.saveCustomTemplates(userId, defaultTemplates, context);
        return defaultTemplates;
      }

      console.log(
        `[CustomTemplates] Loaded ${savedTemplates.length} templates for ${context || 'legacy'} context`
      );
      return savedTemplates;
    } catch (error) {
      console.error(
        '[CustomTemplates] Failed to get templates:',
        error
      );
      return this.getDefaultTemplates();
    }
  }

  /**
   * Get template settings for user context
   * @param {string} userId - User ID
   * @param {string} context - 'hosting' or 'attending' context
   */
  static async getTemplates(userId, context = null) {
    try {
      if (!userId) {
        console.warn('[CustomTemplates] No user ID provided');
        return {};
      }

      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        console.log('[CustomTemplates] User document not found');
        return {};
      }

      const userData = userDoc.data();
      const contextPath = context === 'hosting' ? 'hosting' : 'attending';
      const savedSettings = userData?.userdata?.settings?.notifications?.[contextPath]?.reminderTemplates;

      console.log(`[CustomTemplates] Loaded template settings for ${context || 'legacy'} context`);
      return savedSettings || {};
    } catch (error) {
      console.error('[CustomTemplates] Failed to get template settings:', error);
      return {};
    }
  }

  /**
   * Initialize reminder settings for new users - ONLY called during user creation
   * @param {string} userId - User ID
   * @param {string} context - 'hosting' or 'attending' context
   */
  static async initializeReminderSettings(userId, context) {
    const initialSettings = {
      '15min': false,
      '30min': false,
      '1hour': true,
      '2hour': false,
      '1day': true,
      '1week': false,
    };

    await this.saveTemplateSettings(userId, initialSettings, context);
    console.log(`[CustomTemplates] Initialized reminder settings for ${context} context`);
    return initialSettings;
  }
}

export default CustomTemplateService;
