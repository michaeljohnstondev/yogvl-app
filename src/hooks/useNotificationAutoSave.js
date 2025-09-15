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
