import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Image, ActivityIndicator, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import Navigation from './src/Navigation';
import { VibeAlertProvider, VibeAppWrapper } from './src/components/ui/base';
import { useEventEndNotifications } from './src/hooks/useEventEndNotifications';
import { useNotificationDisplayInit } from './src/hooks/useNotificationDisplayInit';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import fcmService from './src/services/fcmServiceWrapper';
import { initializeNotificationServices } from './src/services/notificationInit';
import { useFonts, ComicNeue_400Regular, ComicNeue_700Bold } from '@expo-google-fonts/comic-neue';
import theme from './src/theme/themes';

// Keep the native splash screen visible until we tell it to hide
SplashScreen.preventAutoHideAsync().catch(() => {
  // In case splash screen is already hidden, ignore the error
});

function AppWithNotifications({ onReady }) {
  // Initialize event end notification service
  useEventEndNotifications();
  // Initialize notification display service with VibeAlert
  useNotificationDisplayInit();

  // Initialize push notifications
  useEffect(() => {
    const initializePushNotifications = async () => {
      const success = await fcmService.initialize();
      if (success) {
        console.log('[App] ✅ Push notifications initialized successfully');
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

  return <Navigation onReady={onReady} />;
}

export default function App() {
  globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

  // Load Comic Neue font
  const [fontsLoaded] = useFonts({
    ComicNeue_400Regular,
    ComicNeue_700Bold,
  });

  // Track if app is ready (fonts loaded)
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    if (fontsLoaded) {
      setAppReady(true);
    }
  }, [fontsLoaded]);

  // Callback to hide splash screen when Navigation is ready
  const onNavigationReady = useCallback(() => {
    if (appReady) {
      SplashScreen.hideAsync().catch(() => {
        // Ignore if already hidden
      });
    }
  }, [appReady]);

  // Don't render anything until fonts are loaded
  // This keeps the native splash visible
  if (!appReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <VibeAppWrapper>
        <VibeAlertProvider>
          <AppWithNotifications onReady={onNavigationReady} />
        </VibeAlertProvider>
      </VibeAppWrapper>
    </SafeAreaProvider>
  );
}
