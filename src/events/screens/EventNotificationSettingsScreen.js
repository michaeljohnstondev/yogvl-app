// EventNotificationSettingsScreen.js

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ScreenHeader } from '../../components/ui/layout';
import HostNotificationSettingsForm from '../../components/notifications/HostNotificationSettingsForm';
import theme from '../../theme/themes';

export default function EventNotificationSettingsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  
  const {
    notificationSettings,
    currentUserId,
    onUpdateSettings,
  } = route.params;
  const defaultSettings = {
    enabled: true,
    notifyOnJoin: true,
    notifyOnLeave: true,
    newComments: true,
    reminderTemplates: []
  };
  
  const initialSettings = notificationSettings || defaultSettings;
  const [localSettings, setLocalSettings] = useState(initialSettings);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const scrollViewRef = useRef(null);

  // Auto-save - update parent form immediately when local settings change
  // Using debounced pattern similar to useNotificationAutoSave hook
  const isFirstRender = useRef(true);
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    // Skip saving on first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounced save after 500ms
    saveTimeoutRef.current = setTimeout(() => {
      // Only save if settings have actually changed from initial values
      if (JSON.stringify(localSettings) !== JSON.stringify(initialSettings)) {
        onUpdateSettings('notificationSettings', localSettings);
      }
    }, 500);

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [localSettings, onUpdateSettings, initialSettings]);

  // Simple initialization - just use the notification settings passed from CreateEventScreen
  useEffect(() => {
    if (notificationSettings) {
      setLocalSettings(notificationSettings);
    } else {
      setLocalSettings(defaultSettings);
    }
    
    setIsLoadingTemplates(false);
  }, [notificationSettings]);



  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScreenHeader 
          title="Notification Settings"
          onClose={() => navigation.goBack()}
          showBorder={true}
          showCloseButton={true}
        />

        <ScrollView 
          ref={scrollViewRef} 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
        >
          <HostNotificationSettingsForm
            settings={localSettings}
            onUpdateSettings={setLocalSettings}
            showCriticalUpdates={false}
            showEventUpdates={true}
            showReminders={true}
            showSocialActivity={true}
            sectionStyle={styles.section}
            scrollViewRef={scrollViewRef}
            isLoadingTemplates={isLoadingTemplates}
            currentUserId={currentUserId}
          />
        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    paddingHorizontal: 0, // Remove padding since it's handled by the form component
  },
});