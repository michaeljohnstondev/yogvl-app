// FILE: hooks/useNotificationDisplayInit.js
// Hook to initialize notification display service with VibeAlert context

import { useEffect } from 'react';
import { useVibeAlert } from '../components/ui/base/VibeAlertContext';
import { notificationDisplayService } from '../services/notificationDisplayService';

/**
 * Initialize notification display service with VibeAlert context
 * This hook should be used inside VibeAlertProvider to access the alert methods
 */
export const useNotificationDisplayInit = () => {
  const vibeAlert = useVibeAlert();

  useEffect(() => {
    if (vibeAlert && !notificationDisplayService.isReady()) {
      console.log('[NotificationDisplayInit] Initializing notification display service...');

      // Initialize the service with VibeAlert reference
      notificationDisplayService.initialize(vibeAlert);

      console.log('[NotificationDisplayInit] Notification display service initialized ✅');
    }

    // Cleanup on unmount
    return () => {
      if (notificationDisplayService.isReady()) {
        console.log('[NotificationDisplayInit] Cleaning up notification display service');
        notificationDisplayService.cleanup();
      }
    };
  }, [vibeAlert]);

  return {
    isReady: notificationDisplayService.isReady(),
    service: notificationDisplayService,
  };
};

export default useNotificationDisplayInit;