// FILE: screens/NotificationSettingsScreen.js

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import CloseButton from '../components/ui/CloseButton';
import HostNotificationSettingsForm from '../components/notifications/HostNotificationSettingsForm';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../auth/services/firebase';
import CustomTemplateService from '../services/CustomTemplateService';
import theme from '../theme/themes';

export default function NotificationSettingsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  
  const {
    notificationSettings,
    userDefaults = {},
    currentUserId,
    eventDateTime,
    onUpdateSettings,
    userContext = 'attending', // Default to attending if not specified
  } = route.params;
  const defaultSettings = {
    enabled: true,
    notifyOnJoin: true,
    notifyOnLeave: true,
    newComments: true,
    reminderTemplates: []
  };
  
  const [localSettings, setLocalSettings] = useState(notificationSettings || defaultSettings);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const scrollViewRef = useRef(null);

  // Simple initialization - just use the notification settings passed from CreateEventScreen
  useEffect(() => {
    console.log('[EventNotificationSettings] Initializing with notification settings from CreateEventScreen');
    
    if (notificationSettings) {
      console.log('[EventNotificationSettings] Using notification settings directly:', notificationSettings);
      setLocalSettings(notificationSettings);
    } else {
      console.log('[EventNotificationSettings] No notification settings provided, using defaults');
      setLocalSettings(defaultSettings);
    }
    
    setTemplatesLoaded(true);
    setIsLoadingTemplates(false);
  }, [notificationSettings]);


  // Auto-save - update parent form immediately when local settings change
  useEffect(() => {
    // Only update if localSettings actually differs from the prop to prevent loops
    if (JSON.stringify(localSettings) !== JSON.stringify(notificationSettings)) {
      console.log('🔧 [EventNotificationSettings] Auto-saving changes to parent form:', localSettings);
      onUpdateSettings('notificationSettings', localSettings);
    }
  }, [localSettings, onUpdateSettings, notificationSettings]);

  const saveAsDefaults = async () => {
    try {
      if (!currentUserId) {
        console.error('No user ID available');
        return;
      }

      // Save current local settings as user context defaults (hosting or attending)
      const contextPath = `userdata.settings.notifications.${userContext}`;
      const userRef = doc(db, 'users', currentUserId);
      await updateDoc(userRef, {
        [contextPath]: {
          hostChanges: localSettings?.hostChanges ?? true,
          eventReminders: localSettings?.eventReminders ?? true,
          reminderTiming: localSettings?.reminderTiming ?? '1hour',
          dayBeforeReminder: localSettings?.dayBeforeReminder ?? true,
          hostComments: localSettings?.hostComments ?? true,
          newComments: localSettings?.newComments ?? false,
          reminderTemplates: localSettings?.reminderTemplates ?? [],
        }
      });
      
      console.log(`Successfully saved ${userContext} notification defaults`);

      // Save custom templates for future use
      if (localSettings?.reminderTemplates) {
        await CustomTemplateService.saveCustomTemplates(currentUserId, localSettings.reminderTemplates);
      }

      // Also apply to current event
      onUpdateSettings('notificationSettings', localSettings);

      console.log(`Successfully saved ${userContext} notification defaults and custom templates`);
    } catch (error) {
      console.error('Failed to save notification defaults:', error);
    }
  };


  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <CloseButton onPress={() => navigation.goBack()} />
          <Text style={styles.headerTitle}>Notification Settings</Text>
        </View>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.darkGray,
  },
  headerTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    paddingHorizontal: 0, // Remove padding since it's handled by the form component
  },
});