import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../auth/services/firebase';
import { VibeButton, VibeSegmentedControl } from '../components/ui/base';
import { CloseButton } from '../components/ui/buttons';
import { NotificationSettingItem } from '../components/ui';
import NotificationSettingsForm from '../components/notifications/NotificationSettingsForm';
import GuestNotificationSettingsForm from '../components/notifications/GuestNotificationSettingsForm';
import HostNotificationSettingsForm from '../components/notifications/HostNotificationSettingsForm';
import { useAuth } from '../auth/AuthContext';
import { useNotificationAutoSave } from '../hooks/useNotificationAutoSave';
import theme from '../theme/themes';

function NotificationSettings({ navigation }) {
  const { userData, currentUserId } = useAuth();

  // Current selected tab
  const [activeTab, setActiveTab] = useState('app');
  const scrollViewRef = useRef(null);

  // App-level notification settings (aligned with DATABASE.md schema)
  const [appSettings, setAppSettings] = useState({
    pushNotifications:
      userData?.userdata?.settings?.notifications?.app?.pushNotifications ??
      true,
    emailNotifications:
      userData?.userdata?.settings?.notifications?.app?.emailNotifications ??
      true,
    smsNotifications:
      userData?.userdata?.settings?.notifications?.app?.smsNotifications ??
      false,
    friendAdded:
      userData?.userdata?.settings?.notifications?.app?.friendAdded ?? true,
    eventInvitations:
      userData?.userdata?.settings?.notifications?.app?.eventInvitations ??
      true,
    systemUpdates:
      userData?.userdata?.settings?.notifications?.app?.systemUpdates ?? true,
    quietHours:
      userData?.userdata?.settings?.notifications?.app?.quietHours ?? false,
  });

  // Hosting default notification settings (for events user creates)
  const [hostingSettings, setHostingSettings] = useState({
    enabled:
      userData?.userdata?.settings?.notifications?.hosting?.enabled ?? true,
    reminderTiming:
      userData?.userdata?.settings?.notifications?.hosting?.reminderTiming ??
      '1hour',
    notifyOnJoin:
      userData?.userdata?.settings?.notifications?.hosting?.notifyOnJoin ??
      true,
    notifyOnLeave:
      userData?.userdata?.settings?.notifications?.hosting?.notifyOnLeave ??
      true,
    sendDayBefore:
      userData?.userdata?.settings?.notifications?.hosting?.sendDayBefore ??
      true,
    newComments:
      userData?.userdata?.settings?.notifications?.hosting?.newComments ?? true,
    reminderTemplates:
      userData?.userdata?.settings?.notifications?.hosting?.reminderTemplates ??
      [],
  });

  // Attending default notification settings (for events user joins)
  const [attendingSettings, setAttendingSettings] = useState({
    hostChanges:
      userData?.userdata?.settings?.notifications?.attending?.hostChanges ??
      true,
    eventReminders:
      userData?.userdata?.settings?.notifications?.attending?.eventReminders ??
      true,
    reminderTiming:
      userData?.userdata?.settings?.notifications?.attending?.reminderTiming ??
      '1hour',
    dayBeforeReminder:
      userData?.userdata?.settings?.notifications?.attending
        ?.dayBeforeReminder ?? true,
    hostComments:
      userData?.userdata?.settings?.notifications?.attending?.hostComments ??
      true,
    newComments:
      userData?.userdata?.settings?.notifications?.attending?.newComments ??
      false,
    reminderTemplates:
      userData?.userdata?.settings?.notifications?.attending
        ?.reminderTemplates || [],
  });

  const reminderOptions = [
    { label: '15 min', value: '15min' },
    { label: '1 hour', value: '1hour' },
    { label: '1 day', value: '1day' },
  ];

  // Initial settings for comparison (prevent unnecessary saves)
  const initialAppSettings = {
    pushNotifications:
      userData?.userdata?.settings?.notifications?.app?.pushNotifications ??
      true,
    emailNotifications:
      userData?.userdata?.settings?.notifications?.app?.emailNotifications ??
      true,
    smsNotifications:
      userData?.userdata?.settings?.notifications?.app?.smsNotifications ??
      false,
    friendAdded:
      userData?.userdata?.settings?.notifications?.app?.friendAdded ?? true,
    eventInvitations:
      userData?.userdata?.settings?.notifications?.app?.eventInvitations ??
      true,
    systemUpdates:
      userData?.userdata?.settings?.notifications?.app?.systemUpdates ?? true,
    quietHours:
      userData?.userdata?.settings?.notifications?.app?.quietHours ?? false,
  };

  const initialHostingSettings = {
    enabled:
      userData?.userdata?.settings?.notifications?.hosting?.enabled ?? true,
    reminderTiming:
      userData?.userdata?.settings?.notifications?.hosting?.reminderTiming ??
      '1hour',
    notifyOnJoin:
      userData?.userdata?.settings?.notifications?.hosting?.notifyOnJoin ??
      true,
    notifyOnLeave:
      userData?.userdata?.settings?.notifications?.hosting?.notifyOnLeave ??
      true,
    sendDayBefore:
      userData?.userdata?.settings?.notifications?.hosting?.sendDayBefore ??
      true,
    newComments:
      userData?.userdata?.settings?.notifications?.hosting?.newComments ?? true,
    reminderTemplates:
      userData?.userdata?.settings?.notifications?.hosting?.reminderTemplates ??
      [],
  };

  const initialAttendingSettings = {
    hostChanges:
      userData?.userdata?.settings?.notifications?.attending?.hostChanges ??
      true,
    eventReminders:
      userData?.userdata?.settings?.notifications?.attending?.eventReminders ??
      true,
    reminderTiming:
      userData?.userdata?.settings?.notifications?.attending?.reminderTiming ??
      '1hour',
    dayBeforeReminder:
      userData?.userdata?.settings?.notifications?.attending
        ?.dayBeforeReminder ?? true,
    hostComments:
      userData?.userdata?.settings?.notifications?.attending?.hostComments ??
      true,
    newComments:
      userData?.userdata?.settings?.notifications?.attending?.newComments ??
      false,
    reminderTemplates:
      userData?.userdata?.settings?.notifications?.attending
        ?.reminderTemplates || [],
  };

  // Auto-save hooks with debouncing
  useNotificationAutoSave(
    appSettings,
    'userdata.settings.notifications.app',
    initialAppSettings,
    currentUserId
  );

  useNotificationAutoSave(
    hostingSettings,
    'userdata.settings.notifications.hosting',
    initialHostingSettings,
    currentUserId
  );

  useNotificationAutoSave(
    attendingSettings,
    'userdata.settings.notifications.attending',
    initialAttendingSettings,
    currentUserId
  );

  // Toggle functions for each section
  const toggleAppSetting = (key) => {
    setAppSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleHostingSetting = (key) => {
    setHostingSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const updateHostingReminderTiming = (value) => {
    setHostingSettings((prev) => ({
      ...prev,
      reminderTiming: value,
    }));
  };

  const tabOptions = [
    { label: 'App', value: 'app' },
    { label: 'Hosting', value: 'hosting' },
    { label: 'Attending', value: 'attending' },
  ];

  return (
    <ScrollView ref={scrollViewRef} style={styles.container}>
      <View style={styles.header}>
        <CloseButton onPress={() => navigation.goBack()} />
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
              <NotificationSettingItem
                title="Push Notifications"
                description="Receive notifications on your device"
                value={appSettings.pushNotifications}
                onToggle={() => toggleAppSetting('pushNotifications')}
              />
              <NotificationSettingItem
                title="Email Notifications"
                description="Receive notifications via email"
                value={appSettings.emailNotifications}
                onToggle={() => toggleAppSetting('emailNotifications')}
              />
              <NotificationSettingItem
                title="SMS Notifications"
                description="Receive notifications via text message"
                value={appSettings.smsNotifications}
                onToggle={() => toggleAppSetting('smsNotifications')}
                isLast
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SOCIAL & ACTIVITY</Text>
            <View style={styles.settingsGroup}>
              <NotificationSettingItem
                title="Friend Added"
                description="Notify when someone adds you as a friend"
                value={appSettings.friendAdded}
                onToggle={() => toggleAppSetting('friendAdded')}
              />
              <NotificationSettingItem
                title="Event Invitations"
                description="Notify when you're invited to events"
                value={appSettings.eventInvitations}
                onToggle={() => toggleAppSetting('eventInvitations')}
                isLast
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SYSTEM & PREFERENCES</Text>
            <View style={styles.settingsGroup}>
              <NotificationSettingItem
                title="System Updates"
                description="Important app updates and maintenance notifications"
                value={appSettings.systemUpdates}
                onToggle={() => toggleAppSetting('systemUpdates')}
              />
              <NotificationSettingItem
                title="Quiet Hours"
                description="Pause notifications during quiet hours (10 PM - 8 AM)"
                value={appSettings.quietHours}
                onToggle={() => toggleAppSetting('quietHours')}
                isLast
              />
            </View>
          </View>
        </>
      )}

      {/* Hosting Defaults */}
      {activeTab === 'hosting' && (
        <HostNotificationSettingsForm
          settings={hostingSettings}
          onUpdateSettings={setHostingSettings}
          showCriticalUpdates={false}
          showEventUpdates={true}
          showReminders={true}
          showSocialActivity={true}
          showSaveAsDefaults={false}
          sectionStyle={styles.section}
          scrollViewRef={scrollViewRef}
          currentUserId={currentUserId}
        />
      )}

      {/* Attending Defaults - Use GuestNotificationSettingsForm */}
      {activeTab === 'attending' && (
        <GuestNotificationSettingsForm
          settings={attendingSettings}
          onUpdateSettings={setAttendingSettings}
          showCriticalUpdates={false} // Don't show cancellation toggle in defaults
          showEventUpdates={true}
          showReminders={true}
          showSocialActivity={true}
          showSaveAsDefaults={false}
          sectionStyle={styles.section}
          scrollViewRef={scrollViewRef}
        />
      )}
    </ScrollView>
  );
}

export default NotificationSettings;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.darkGray,
  },
  headerTitle: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 16,
    flex: 1,
  },
  tabSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  tabSelector: {
    width: '100%',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: theme.colors.vibeGreen,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 10,
  },
  settingsGroup: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: theme.sizes.borderRadius,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
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
