import { useEffect, useRef } from 'react';
import { doc, updateDoc } from '../lib/firebase/firestore';
import { db } from '../auth/services/firebase';

/**
 * Custom hook for auto-saving notification settings
 * Implements debouncing to prevent excessive database writes
 * Extracted from NotificationSettingsScreen to eliminate code duplication
 */
export function useNotificationAutoSave(
  settings,
  settingsPath,
  initialSettings,
  currentUserId
) {
  const isFirstRender = useRef(true);
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    // Skip saving on first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Skip if no user ID
    if (!currentUserId) return;

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounced save after 500ms
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        // Only save if settings have actually changed from initial values
        if (JSON.stringify(settings) !== JSON.stringify(initialSettings)) {
          // Enhanced logging for hosting/attending reminderTemplates changes only
          if (settingsPath === 'userdata.settings.notifications.hosting' ||
              settingsPath === 'userdata.settings.notifications.attending') {
            const settingsType = settingsPath.includes('hosting') ? 'hosting' : 'attending';
            const beforeTemplates = initialSettings?.reminderTemplates || {};
            const afterTemplates = settings?.reminderTemplates || {};

            // Log added/enabled reminderTemplates
            Object.keys(afterTemplates).forEach(templateId => {
              const wasDisabledOrMissing = !beforeTemplates[templateId];
              const isNowEnabled = afterTemplates[templateId] === true;
              if (isNowEnabled && wasDisabledOrMissing) {
                console.log(`[NotificationSettings] adding ${templateId} to users/${currentUserId}/userdata/settings/notifications/${settingsType}/reminderTemplates`);
              }
            });

            // Log removed/disabled reminderTemplates
            Object.keys(beforeTemplates).forEach(templateId => {
              const wasEnabled = beforeTemplates[templateId] === true;
              const isNowDisabledOrMissing = !afterTemplates[templateId];
              if (wasEnabled && isNowDisabledOrMissing) {
                console.log(`[NotificationSettings] removing ${templateId} from users/${currentUserId}/userdata/settings/notifications/${settingsType}/reminderTemplates`);
              }
            });
          }

          const userRef = doc(db, 'users', currentUserId);
          await updateDoc(userRef, {
            [settingsPath]: settings,
          });
          console.log(`[NotificationSettings] ${settingsPath} auto-saved`);
        }
      } catch (error) {
        console.error(
          `[NotificationSettings] Failed to auto-save ${settingsPath}:`,
          error
        );
      }
    }, 500);

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [settings, settingsPath, initialSettings, currentUserId]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);
}
