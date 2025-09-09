// FILE: screens/NotificationSettingsScreen.js

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import VibeButton from '../components/ui/VibeButton';
import CloseButton from '../components/ui/CloseButton';
import NotificationSettingsForm from '../components/notifications/NotificationSettingsForm';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../auth/services/firebase';
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
  } = route.params;
  const defaultSettings = {
    enabled: true,
    notifyOnJoin: true,
    notifyOnLeave: true,
    newComments: true,
    reminderTemplates: []
  };
  
  const [localSettings, setLocalSettings] = useState(notificationSettings || defaultSettings);
  const scrollViewRef = useRef(null);

  // Update local settings when prop changes
  useEffect(() => {
    if (notificationSettings) {
      setLocalSettings(notificationSettings);
    }
  }, [notificationSettings]);

  // Update parent form immediately when local settings change, but avoid infinite loop
  useEffect(() => {
    // Only update if localSettings actually differs from the prop to prevent loops
    if (JSON.stringify(localSettings) !== JSON.stringify(notificationSettings)) {
      console.log('🔧 [EventNotificationSettings] useEffect updating parent with localSettings:', localSettings);
      onUpdateSettings('notificationSettings', localSettings);
    }
  }, [localSettings, onUpdateSettings, notificationSettings]);

  const saveAsDefaults = async () => {
    try {
      if (!currentUserId) {
        console.error('No user ID available');
        return;
      }

      // Save current local settings as user defaults
      const userRef = doc(db, 'users', currentUserId);
      await updateDoc(userRef, {
        'userdata.settings.notifications.hosting': {
          enabled: localSettings?.enabled ?? true,
          notifyOnJoin: localSettings?.notifyOnJoin ?? true,
          notifyOnLeave: localSettings?.notifyOnLeave ?? true,
          newComments: localSettings?.newComments ?? true,
          reminderTemplates: localSettings?.reminderTemplates ?? [],
        }
      });

      // Also apply to current event
      onUpdateSettings('notificationSettings', localSettings);

      console.log('Successfully saved notification defaults and applied to current event');
    } catch (error) {
      console.error('Failed to save notification defaults:', error);
    }
  };

  const handleSave = () => {
    console.log('🔧 [EventNotificationSettings] handleSave - localSettings:', localSettings);
    onUpdateSettings('notificationSettings', localSettings);
  };

  return (
    <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <CloseButton onPress={() => navigation.goBack()} />
          </View>
          <Text style={styles.headerTitle}>Notification Settings</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView ref={scrollViewRef} style={styles.content} showsVerticalScrollIndicator={false}>
          <NotificationSettingsForm
            settings={localSettings}
            onUpdateSettings={setLocalSettings}
            showMasterToggle={true}
            showEventActivity={true}
            showSaveAsDefaults={true}
            onSaveAsDefaults={saveAsDefaults}
            scrollViewRef={scrollViewRef}
          />
        </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.darkGray,
  },
  headerLeft: {
    width: 50,
  },
  headerTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  headerRight: {
    width: 80,
    alignItems: 'flex-end',
  },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveButtonText: {
    color: theme.colors.vibeBlue,
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
});