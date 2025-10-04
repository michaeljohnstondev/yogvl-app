import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import Navigation from './src/Navigation';
import { VibeAlertProvider, VibeAppWrapper } from './src/components/ui/base';
import { useEventEndNotifications } from './src/hooks/useEventEndNotifications';
import { useNotificationDisplayInit } from './src/hooks/useNotificationDisplayInit';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import fcmService from './src/services/fcmServiceWrapper';
import { initializeNotificationServices } from './src/services/notificationInit';
import { useFonts, ComicNeue_400Regular, ComicNeue_700Bold } from '@expo-google-fonts/comic-neue';
import * as SplashScreen from 'expo-splash-screen';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

function AppWithNotifications() {
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

  return <Navigation />;
}

export default function App() {
  globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;

  // Load Comic Neue font
  const [fontsLoaded] = useFonts({
    ComicNeue_400Regular,
    ComicNeue_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <StatusBar style="light" />;
  }

  return (
    <SafeAreaProvider>
      <VibeAppWrapper>
        <VibeAlertProvider>
          <AppWithNotifications />
        </VibeAlertProvider>
      </VibeAppWrapper>
    </SafeAreaProvider>
  );
}
