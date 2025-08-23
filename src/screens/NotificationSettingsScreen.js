import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../auth/services/firebase';
import VibeButton from '../components/ui/VibeButton';
import VibeSegmentedControl from '../components/ui/VibeSegmentedControl';
import { useAuth } from '../auth/AuthContext';
import theme from '../theme/themes';

function NotificationSettings({ navigation }) {
  const { userData, currentUserId } = useAuth();
  
  // Current selected tab
  const [activeTab, setActiveTab] = useState('app');
  
  // App-level notification settings
  const [appSettings, setAppSettings] = useState({
    pushNotifications: userData?.userdata?.settings?.notifications?.app?.pushNotifications ?? true,
    emailNotifications: userData?.userdata?.settings?.notifications?.app?.emailNotifications ?? true,
    friendAdded: userData?.userdata?.settings?.notifications?.app?.friendAdded ?? true,
    friendFollowed: userData?.userdata?.settings?.notifications?.app?.friendFollowed ?? true,
    systemUpdates: userData?.userdata?.settings?.notifications?.app?.systemUpdates ?? true,
    promotionalEmails: userData?.userdata?.settings?.notifications?.app?.promotionalEmails ?? false,
    quietHours: userData?.userdata?.settings?.notifications?.app?.quietHours ?? false,
    weekendNotifications: userData?.userdata?.settings?.notifications?.app?.weekendNotifications ?? true,
  });

  // Hosting default notification settings (for events user creates)
  const [hostingSettings, setHostingSettings] = useState({
    enabled: userData?.userdata?.settings?.notifications?.hosting?.enabled ?? true,
    reminderTiming: userData?.userdata?.settings?.notifications?.hosting?.reminderTiming ?? '1hour',
    notifyOnJoin: userData?.userdata?.settings?.notifications?.hosting?.notifyOnJoin ?? true,
    notifyOnLeave: userData?.userdata?.settings?.notifications?.hosting?.notifyOnLeave ?? true,
    sendDayBefore: userData?.userdata?.settings?.notifications?.hosting?.sendDayBefore ?? true,
    newComments: userData?.userdata?.settings?.notifications?.hosting?.newComments ?? true,
  });

  // Attending default notification settings (for events user joins)
  const [attendingSettings, setAttendingSettings] = useState({
    hostChanges: userData?.userdata?.settings?.notifications?.attending?.hostChanges ?? true,
    eventReminders: userData?.userdata?.settings?.notifications?.attending?.eventReminders ?? true,
    reminderTiming: userData?.userdata?.settings?.notifications?.attending?.reminderTiming ?? '1hour',
    dayBeforeReminder: userData?.userdata?.settings?.notifications?.attending?.dayBeforeReminder ?? true,
    hostComments: userData?.userdata?.settings?.notifications?.attending?.hostComments ?? true,
    newComments: userData?.userdata?.settings?.notifications?.attending?.newComments ?? false,
  });

  const reminderOptions = [
    { label: '15 min', value: '15min' },
    { label: '1 hour', value: '1hour' },
    { label: '1 day', value: '1day' },
  ];

  // Toggle functions for each section
  const toggleAppSetting = (key) => {
    setAppSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleHostingSetting = (key) => {
    setHostingSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleAttendingSetting = (key) => {
    setAttendingSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const updateHostingReminderTiming = (value) => {
    setHostingSettings(prev => ({
      ...prev,
      reminderTiming: value
    }));
  };

  const updateAttendingReminderTiming = (value) => {
    setAttendingSettings(prev => ({
      ...prev,
      reminderTiming: value
    }));
  };

  const saveSettings = async () => {
    if (!currentUserId) return;

    try {
      const userRef = doc(db, 'users', currentUserId);
      await updateDoc(userRef, {
        'userdata.settings.notifications.app': appSettings,
        'userdata.settings.notifications.hosting': hostingSettings,
        'userdata.settings.notifications.attending': attendingSettings,
      });
      console.log('[NotificationSettings] All settings saved successfully');
      navigation.goBack();
    } catch (error) {
      console.error('[NotificationSettings] Failed to save settings:', error);
      // Could add error handling here
      navigation.goBack();
    }
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

  const tabOptions = [
    { label: 'App', value: 'app' },
    { label: 'Hosting', value: 'hosting' },
    { label: 'Attending', value: 'attending' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabSection}>
        <VibeSegmentedControl
          options={tabOptions}
          selectedValue={activeTab}
          onSelect={setActiveTab}
          style={styles.tabSelector}
        />
      </View>

      {/* App Notifications */}
      {activeTab === 'app' && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>DELIVERY METHOD</Text>
            <View style={styles.settingsGroup}>
              <SettingItem
                title="Push Notifications"
                description="Receive notifications on your device"
                value={appSettings.pushNotifications}
                onToggle={() => toggleAppSetting('pushNotifications')}
              />
              <SettingItem
                title="Email Notifications"
                description="Receive notifications via email"
                value={appSettings.emailNotifications}
                onToggle={() => toggleAppSetting('emailNotifications')}
                isLast
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SOCIAL & ACTIVITY</Text>
            <View style={styles.settingsGroup}>
              <SettingItem
                title="Friend Added"
                description="Notify when someone adds you as a friend"
                value={appSettings.friendAdded}
                onToggle={() => toggleAppSetting('friendAdded')}
              />
              <SettingItem
                title="Friend Followed"
                description="Notify when someone follows you"
                value={appSettings.friendFollowed}
                onToggle={() => toggleAppSetting('friendFollowed')}
                isLast
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SYSTEM & MARKETING</Text>
            <View style={styles.settingsGroup}>
              <SettingItem
                title="System Updates"
                description="Important app updates and maintenance notifications"
                value={appSettings.systemUpdates}
                onToggle={() => toggleAppSetting('systemUpdates')}
              />
              <SettingItem
                title="Promotional Emails"
                description="Receive updates about new features and events"
                value={appSettings.promotionalEmails}
                onToggle={() => toggleAppSetting('promotionalEmails')}
                isLast
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SCHEDULE PREFERENCES</Text>
            <View style={styles.settingsGroup}>
              <SettingItem
                title="Quiet Hours"
                description="Pause notifications 10 PM - 8 AM"
                value={appSettings.quietHours}
                onToggle={() => toggleAppSetting('quietHours')}
              />
              <SettingItem
                title="Weekend Notifications"
                description="Receive notifications on weekends"
                value={appSettings.weekendNotifications}
                onToggle={() => toggleAppSetting('weekendNotifications')}
                isLast
              />
            </View>
          </View>
        </>
      )}

      {/* Hosting Defaults */}
      {activeTab === 'hosting' && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
            <View style={styles.settingsGroup}>
              <SettingItem
                title="Enable Notifications"
                description="Turn on notifications for events you host"
                value={hostingSettings.enabled}
                onToggle={() => toggleHostingSetting('enabled')}
                isLast
              />
            </View>
          </View>

          {hostingSettings.enabled && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>EVENT ACTIVITY</Text>
                <View style={styles.settingsGroup}>
                  <SettingItem
                    title="Guest Joins Event"
                    description="Notify when someone joins your event"
                    value={hostingSettings.notifyOnJoin}
                    onToggle={() => toggleHostingSetting('notifyOnJoin')}
                  />
                  <SettingItem
                    title="Guest Leaves Event"
                    description="Notify when someone leaves your event"
                    value={hostingSettings.notifyOnLeave}
                    onToggle={() => toggleHostingSetting('notifyOnLeave')}
                  />
                  <SettingItem
                    title="New Comments"
                    description="Notifications for comments on your events"
                    value={hostingSettings.newComments}
                    onToggle={() => toggleHostingSetting('newComments')}
                    isLast
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>REMINDERS</Text>
                <View style={styles.settingsGroup}>
                  <SettingItem
                    title="Day Before Reminder"
                    description="Send yourself a reminder the day before your events"
                    value={hostingSettings.sendDayBefore}
                    onToggle={() => toggleHostingSetting('sendDayBefore')}
                    isLast
                  />
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>REMINDER TIMING</Text>
                <View style={styles.reminderSection}>
                  <Text style={styles.reminderLabel}>Send event reminders:</Text>
                  <VibeSegmentedControl
                    options={reminderOptions}
                    selectedValue={hostingSettings.reminderTiming}
                    onSelect={updateHostingReminderTiming}
                    style={styles.segmentedControl}
                  />
                </View>
              </View>
            </>
          )}
        </>
      )}

      {/* Attending Defaults */}
      {activeTab === 'attending' && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EVENT UPDATES</Text>
            <View style={styles.settingsGroup}>
              <SettingItem
                title="Host Changes"
                description="Time, location, details, fees, and other event changes"
                value={attendingSettings.hostChanges}
                onToggle={() => toggleAttendingSetting('hostChanges')}
                isLast
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>REMINDERS</Text>
            <View style={styles.settingsGroup}>
              <SettingItem
                title="Event Reminders"
                description="Remind me before the event starts"
                value={attendingSettings.eventReminders}
                onToggle={() => toggleAttendingSetting('eventReminders')}
              />
              <SettingItem
                title="Day Before Reminder"
                description="Send a reminder 24 hours before"
                value={attendingSettings.dayBeforeReminder}
                onToggle={() => toggleAttendingSetting('dayBeforeReminder')}
                isLast
              />
            </View>
          </View>

          {attendingSettings.eventReminders && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>REMINDER TIMING</Text>
              <View style={styles.reminderSection}>
                <Text style={styles.reminderLabel}>Send event reminders:</Text>
                <VibeSegmentedControl
                  options={reminderOptions}
                  selectedValue={attendingSettings.reminderTiming}
                  onSelect={updateAttendingReminderTiming}
                  style={styles.segmentedControl}
                />
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SOCIAL ACTIVITY</Text>
            <View style={styles.settingsGroup}>
              <SettingItem
                title="Host Comments"
                description="Comments from the event host (batched after first)"
                value={attendingSettings.hostComments}
                onToggle={() => toggleAttendingSetting('hostComments')}
              />
              <SettingItem
                title="Other Comments"
                description="Comments from attendees (batched after first)"
                value={attendingSettings.newComments}
                onToggle={() => toggleAttendingSetting('newComments')}
                isLast
              />
            </View>
          </View>
        </>
      )}

      <View style={styles.buttonContainer}>
        <VibeButton
          label="SAVE SETTINGS"
          onPress={saveSettings}
          style={styles.saveButton}
        />
      </View>
    </ScrollView>
  );
}

export default NotificationSettings;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.darkGray,
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    color: theme.colors.vibeGreen,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: theme.colors.textPrimary,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  tabSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  tabSelector: {
    width: '100%',
  },
  section: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: theme.colors.vibeGreen,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 15,
  },
  settingsGroup: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: theme.sizes.borderRadius,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
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
  reminderSection: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: theme.sizes.borderRadius,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    padding: 20,
  },
  reminderLabel: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  segmentedControl: {
    width: '100%',
  },
  buttonContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  saveButton: {
    width: '100%',
  },
});