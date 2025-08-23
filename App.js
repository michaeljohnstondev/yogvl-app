import React from 'react';
import Navigation from './src/Navigation';
import { VibeAlertProvider } from './src/components/ui/VibeAlertContext';
import { useEventEndNotifications } from './src/hooks/useEventEndNotifications';
import { SafeAreaProvider } from 'react-native-safe-area-context';

function AppWithNotifications() {
  // Initialize event end notification service
  useEventEndNotifications();
  
  return <Navigation />;
}

export default function App() {
  console.log('📱 App component rendering');
  return (
    <SafeAreaProvider>
      <VibeAlertProvider>
        <AppWithNotifications />
      </VibeAlertProvider>
    </SafeAreaProvider>
  );
}
