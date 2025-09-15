// services/CustomTemplateService.js - Manage persistent custom notification templates

import { doc, getDoc, updateDoc } from '../lib/firebase/firestore';
import { db } from '../auth/services/firebase';

/**
 * Service for managing custom notification templates that persist across events
 */
class CustomTemplateService {
  /**
   * Get saved custom templates for a user
   */
  static async getSavedCustomTemplates(userId) {
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
      const savedTemplates =
        userData?.userdata?.settings?.notifications?.customTemplates || [];

      console.log(
        `[CustomTemplates] Found ${savedTemplates.length} saved custom templates for user`
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
   * Save custom templates to user preferences
   * This merges new custom templates with existing ones, avoiding duplicates
   */
  static async saveCustomTemplates(userId, reminderTemplates) {
    try {
      if (!userId) {
        console.error('[CustomTemplates] No user ID provided');
        return false;
      }

      if (!reminderTemplates || !Array.isArray(reminderTemplates)) {
        console.warn('[CustomTemplates] Invalid reminder templates provided');
        return false;
      }

      // Filter to only custom templates (not default ones)
      const customTemplates = reminderTemplates.filter(
        (template) => template.id && template.id.startsWith('custom_')
      );

      if (customTemplates.length === 0) {
        console.log('[CustomTemplates] No custom templates to save');
        return true; // Not an error, just nothing to save
      }

      // Get existing saved templates
      const existingSavedTemplates = await this.getSavedCustomTemplates(userId);

      // Merge templates, avoiding duplicates based on amount and unit
      const mergedTemplates = [...existingSavedTemplates];

      for (const newTemplate of customTemplates) {
        const isDuplicate = mergedTemplates.some(
          (existing) =>
            existing.amount === newTemplate.amount &&
            existing.unit === newTemplate.unit
        );

        if (!isDuplicate) {
          // Create a clean template object for persistence
          const templateToSave = {
            id: newTemplate.id,
            amount: newTemplate.amount,
            unit: newTemplate.unit,
            label: newTemplate.label,
            enabled: true, // Always save as enabled for reuse
            savedAt: new Date(),
          };

          mergedTemplates.push(templateToSave);
          console.log(
            `[CustomTemplates] Adding new custom template: ${templateToSave.label}`
          );
        }
      }

      // Save to user settings
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'userdata.settings.notifications.customTemplates': mergedTemplates,
        'userdata.settings.lastUpdated': new Date(),
      });

      console.log(
        `[CustomTemplates] Successfully saved ${customTemplates.length} custom templates (${mergedTemplates.length} total saved)`
      );
      return true;
    } catch (error) {
      console.error(
        '[CustomTemplates] Failed to save custom templates:',
        error
      );
      return false;
    }
  }

  /**
   * Remove a specific custom template from saved templates
   */
  static async removeCustomTemplate(userId, templateId) {
    try {
      if (!userId || !templateId) {
        console.error('[CustomTemplates] Missing user ID or template ID');
        return false;
      }

      const savedTemplates = await this.getSavedCustomTemplates(userId);
      const updatedTemplates = savedTemplates.filter(
        (template) => template.id !== templateId
      );

      if (updatedTemplates.length === savedTemplates.length) {
        console.log('[CustomTemplates] Template not found in saved templates');
        return true; // Not an error
      }

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'userdata.settings.notifications.customTemplates': updatedTemplates,
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
   * Get combined templates (defaults + saved custom templates)
   * This is what should be used to initialize the template list
   */
  static async getCombinedTemplates(userId) {
    try {
      // Default templates
      const defaultTemplates = [
        {
          id: '15min',
          amount: 15,
          unit: 'minutes',
          enabled: true,
          label: '15 min',
        },
        {
          id: '1hour',
          amount: 1,
          unit: 'hours',
          enabled: true,
          label: '1 hour',
        },
        { id: '1day', amount: 1, unit: 'days', enabled: false, label: '1 day' },
      ];

      // Get saved custom templates
      const savedCustomTemplates = await this.getSavedCustomTemplates(userId);

      // Combine them
      const combinedTemplates = [...defaultTemplates, ...savedCustomTemplates];

      console.log(
        `[CustomTemplates] Combined ${defaultTemplates.length} default + ${savedCustomTemplates.length} custom templates`
      );
      return combinedTemplates;
    } catch (error) {
      console.error(
        '[CustomTemplates] Failed to get combined templates:',
        error
      );
      // Return defaults on error
      return [
        {
          id: '15min',
          amount: 15,
          unit: 'minutes',
          enabled: true,
          label: '15 min',
        },
        {
          id: '1hour',
          amount: 1,
          unit: 'hours',
          enabled: true,
          label: '1 hour',
        },
        { id: '1day', amount: 1, unit: 'days', enabled: false, label: '1 day' },
      ];
    }
  }
}

export default CustomTemplateService;
