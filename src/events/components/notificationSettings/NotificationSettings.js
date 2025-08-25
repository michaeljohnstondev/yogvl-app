// FILE: events/components/notificationSettings/NotificationSettings.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Switch,
  ScrollView,
} from 'react-native';
import VibeButton from '../../../components/ui/VibeButton';
import VibeInput from '../../../components/ui/VibeInput';
import VibeSegmentedControl from '../../../components/ui/VibeSegmentedControl';
import CloseButton from '../../../components/ui/CloseButton';
import theme from '../../../theme/themes';

export default function NotificationSettings({
  visible,
  onClose,
  notificationSettings,
  onUpdateSettings,
  userDefaults = {},
  currentUserId,
}) {
  const defaultSettings = {
    enabled: true,
    reminderTiming: '1hour',
    notifyOnJoin: true,
    notifyOnLeave: true,
    sendReminders: true,
    sendDayBefore: true,
    newComments: true,
    customMessage: ''
  };
  
  const [localSettings, setLocalSettings] = useState(notificationSettings || defaultSettings);

  // Update local settings when prop changes
  useEffect(() => {
    if (notificationSettings) {
      setLocalSettings(notificationSettings);
    }
  }, [notificationSettings]);

  const reminderOptions = [
    { label: '15 min', value: '15min' },
    { label: '1 hour', value: '1hour' },
    { label: '1 day', value: '1day' },
  ];

  const toggleSetting = (key) => {
    setLocalSettings(prev => ({
      ...defaultSettings,
      ...prev,
      [key]: !prev?.[key]
    }));
  };

  const updateReminderTiming = (value) => {
    setLocalSettings(prev => ({
      ...defaultSettings,
      ...prev,
      reminderTiming: value
    }));
  };

  const updateCustomMessage = (text) => {
    setLocalSettings(prev => ({
      ...defaultSettings,
      ...prev,
      customMessage: text
    }));
  };

  const saveAsDefaults = async () => {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../../../auth/services/firebase');
      
      if (!currentUserId) {
        console.error('No user ID available');
        return;
      }

      // Save current local settings as user defaults
      const userRef = doc(db, 'users', currentUserId);
      await updateDoc(userRef, {
        'userdata.settings.notifications.hosting': {
          enabled: localSettings?.enabled ?? true,
          reminderTiming: localSettings?.reminderTiming ?? '1hour',
          notifyOnJoin: localSettings?.notifyOnJoin ?? true,
          notifyOnLeave: localSettings?.notifyOnLeave ?? true,
          sendDayBefore: localSettings?.sendDayBefore ?? true,
          newComments: localSettings?.newComments ?? true,
        }
      });

      console.log('Successfully saved notification defaults');
      // Could add a success message here if needed
    } catch (error) {
      console.error('Failed to save notification defaults:', error);
      // Could add an error message here if needed
    }
  };

  const handleSave = () => {
    onUpdateSettings(localSettings);
    onClose();
  };

  const SettingItem = ({ title, description, value, onToggle, isLast = false }) => (
    <View style={[styles.settingItem, !isLast && styles.settingBorder]}>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{
          false: theme.colors.darkGray,
          true: theme.colors.vibeGreen,
        }}
        thumbColor={value ? theme.colors.white : theme.colors.gray}
      />
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <CloseButton onPress={onClose} />
          </View>
          <Text style={styles.headerTitle}>Notification Settings</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Master Toggle */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
            <View style={styles.settingsGroup}>
              <SettingItem
                title="Enable Notifications"
                description="Turn on notifications for this event"
                value={localSettings?.enabled ?? true}
                onToggle={() => toggleSetting('enabled')}
                isLast
              />
            </View>
          </View>

          {localSettings?.enabled && (
            <>
              {/* Event Activity */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>EVENT ACTIVITY</Text>
                <View style={styles.settingsGroup}>
                  <SettingItem
                    title="Guest Joins Event"
                    description="Notify when someone joins your event"
                    value={localSettings.notifyOnJoin}
                    onToggle={() => toggleSetting('notifyOnJoin')}
                  />
                  <SettingItem
                    title="Guest Leaves Event"
                    description="Notify when someone leaves your event"
                    value={localSettings.notifyOnLeave}
                    onToggle={() => toggleSetting('notifyOnLeave')}
                  />
                  <SettingItem
                    title="New Comments"
                    description="Notify when someone comments on your event"
                    value={localSettings.newComments}
                    onToggle={() => toggleSetting('newComments')}
                    isLast
                  />
                </View>
              </View>

              {/* Reminders */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>REMINDERS</Text>
                <View style={styles.settingsGroup}>
                  <SettingItem
                    title="Event Reminders"
                    description="Send reminders to attendees before the event"
                    value={localSettings.sendReminders}
                    onToggle={() => toggleSetting('sendReminders')}
                  />
                  <SettingItem
                    title="Day Before Reminder"
                    description="Send a reminder 24 hours before the event"
                    value={localSettings.sendDayBefore}
                    onToggle={() => toggleSetting('sendDayBefore')}
                    isLast
                  />
                </View>
              </View>

              {/* Reminder Timing */}
              {localSettings.sendReminders && (
                <View style={styles.section}>
                  <Text style={styles.reminderLabel}>Send event reminders:</Text>
                  <VibeSegmentedControl
                    options={reminderOptions}
                    selectedValue={localSettings.reminderTiming}
                    onValueChange={updateReminderTiming}
                    style={styles.segmentedControl}
                  />
                </View>
              )}

              {/* Custom Message */}
              <View style={styles.section}>
                <Text style={styles.label}>Custom Reminder Message (Optional)</Text>
                <VibeInput
                  value={localSettings.customMessage}
                  onChangeText={updateCustomMessage}
                  placeholder="Add a personal message to reminders..."
                  multiline
                  numberOfLines={3}
                  style={styles.messageInput}
                />
              </View>

              {/* Save as Defaults Button */}
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.defaultsButton}
                  onPress={saveAsDefaults}
                >
                  <Text style={styles.defaultsButtonText}>Save as Default Settings</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
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
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    color: theme.colors.vibeGreen,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 1,
  },
  settingsGroup: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: theme.sizes.borderRadius,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  settingBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.inputBorder,
  },
  settingContent: {
    flex: 1,
    marginRight: 15,
  },
  settingTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  settingDescription: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  reminderLabel: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  segmentedControl: {
    marginBottom: 8,
  },
  label: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  messageInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  defaultsButton: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: theme.sizes.borderRadius,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  defaultsButtonText: {
    color: theme.colors.vibeGreen,
    fontSize: 16,
    fontWeight: '600',
  },
});