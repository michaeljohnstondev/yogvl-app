import React, { useEffect } from 'react';
import Navigation from './src/Navigation';
import { VibeAlertProvider, VibeScreen } from './src/components/ui/base';
import { useEventEndNotifications } from './src/hooks/useEventEndNotifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import fcmService from './src/services/fcmServiceWrapper';
import { initializeNotificationServices } from './src/services/notificationInit';

function AppWithNotifications() {
  // Initialize event end notification service
  useEventEndNotifications();

  // Initialize push notifications
  useEffect(() => {
    const initializePushNotifications = async () => {
      const success = await fcmService.initialize();
      if (success) {
      } else {
        console.warn('[App] ❌ Push notifications initialization failed');
      }
    };

    initializePushNotifications();

    // Initialize scheduled notification services
    const scheduledServicesStarted = initializeNotificationServices();
    if (!scheduledServicesStarted) {
      console.warn('[App] ❌ Scheduled notification services failed to start');
    }

    // Cleanup on unmount
    return () => {
      fcmService.cleanup();
    };
  }, []);

  return <Navigation />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <VibeScreen>
        <VibeAlertProvider>
          <AppWithNotifications />
        </VibeAlertProvider>
      </VibeScreen>
    </SafeAreaProvider>
  );
}
