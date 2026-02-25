import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { VibeSegmentedControl } from '../components/ui';
import { NotificationSettingItem } from '../components/ui';
import ScreenHeader from '../components/ui/layout/ScreenHeader';
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
    newFollowers:
      userData?.userdata?.settings?.notifications?.app?.newFollowers ?? true,
    eventInvitations:
      userData?.userdata?.settings?.notifications?.app?.eventInvitations ??
      true,
    suggestedEvents:
      userData?.userdata?.settings?.notifications?.app?.suggestedEvents ??
      true,
    friendEventActivity:
      userData?.userdata?.settings?.notifications?.app?.friendEventActivity ??
      true,
    officialEvents:
      userData?.userdata?.settings?.notifications?.app?.officialEvents ?? true,
  });

  // Hosting default notification settings (for events user creates)
  const [hostingSettings, setHostingSettings] = useState({
    enabled:
      userData?.userdata?.settings?.notifications?.hosting?.enabled ?? true,
    notifyOnJoin:
      userData?.userdata?.settings?.notifications?.hosting?.notifyOnJoin ??
      true,
    notifyOnLeave:
      userData?.userdata?.settings?.notifications?.hosting?.notifyOnLeave ??
      true,
    newComments:
      userData?.userdata?.settings?.notifications?.hosting?.newComments ?? true,
    eventRecap:
      userData?.userdata?.settings?.notifications?.hosting?.eventRecap ?? false,
    reminderTemplates:
      userData?.userdata?.settings?.notifications?.hosting?.reminderTemplates ??
      {}, // Object format, not array
  });

  // Attending default notification settings (for events user joins)
  const [attendingSettings, setAttendingSettings] = useState({
    enabled:
      userData?.userdata?.settings?.notifications?.attending?.enabled ?? true,
    hostChanges:
      userData?.userdata?.settings?.notifications?.attending?.hostChanges ??
      true,
    eventReminders:
      userData?.userdata?.settings?.notifications?.attending?.eventReminders ??
      true,
    hostComments:
      userData?.userdata?.settings?.notifications?.attending?.hostComments ??
      true,
    newComments:
      userData?.userdata?.settings?.notifications?.attending?.newComments ??
      false,
    reminderTemplates:
      userData?.userdata?.settings?.notifications?.attending
        ?.reminderTemplates || {}, // Object format, not array
  });

  // Initial settings for comparison (prevent unnecessary saves)
  const initialAppSettings = {
    pushNotifications:
      userData?.userdata?.settings?.notifications?.app?.pushNotifications ??
      true,
    newFollowers:
      userData?.userdata?.settings?.notifications?.app?.newFollowers ?? true,
    eventInvitations:
      userData?.userdata?.settings?.notifications?.app?.eventInvitations ??
      true,
    suggestedEvents:
      userData?.userdata?.settings?.notifications?.app?.suggestedEvents ??
      true,
    friendEventActivity:
      userData?.userdata?.settings?.notifications?.app?.friendEventActivity ??
      true,
    officialEvents:
      userData?.userdata?.settings?.notifications?.app?.officialEvents ?? true,
  };

  const initialHostingSettings = {
    enabled:
      userData?.userdata?.settings?.notifications?.hosting?.enabled ?? true,
    notifyOnJoin:
      userData?.userdata?.settings?.notifications?.hosting?.notifyOnJoin ??
      true,
    notifyOnLeave:
      userData?.userdata?.settings?.notifications?.hosting?.notifyOnLeave ??
      true,
    newComments:
      userData?.userdata?.settings?.notifications?.hosting?.newComments ?? true,
    eventRecap:
      userData?.userdata?.settings?.notifications?.hosting?.eventRecap ?? false,
    reminderTemplates:
      userData?.userdata?.settings?.notifications?.hosting?.reminderTemplates ??
      {}, // Object format, not array
  };

  const initialAttendingSettings = {
    enabled:
      userData?.userdata?.settings?.notifications?.attending?.enabled ?? true,
    hostChanges:
      userData?.userdata?.settings?.notifications?.attending?.hostChanges ??
      true,
    eventReminders:
      userData?.userdata?.settings?.notifications?.attending?.eventReminders ??
      true,
    hostComments:
      userData?.userdata?.settings?.notifications?.attending?.hostComments ??
      true,
    newComments:
      userData?.userdata?.settings?.notifications?.attending?.newComments ??
      false,
    reminderTemplates:
      userData?.userdata?.settings?.notifications?.attending
        ?.reminderTemplates || {}, // Object format, not array
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

  const tabOptions = [
    { label: 'App', value: 'app' },
    { label: 'Hosting', value: 'hosting' },
    { label: 'Attending', value: 'attending' },
  ];

  return (
    <View style={styles.outerContainer}>
      {/* Header */}
      <ScreenHeader
        title="Notifications"
        onClose={() => navigation.goBack()}
      />

      <ScrollView ref={scrollViewRef} style={styles.container} contentContainerStyle={styles.scrollContent}>
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
                isLast
              />
            </View>
          </View>

          <View style={[styles.section, styles.lastSection]}>
            <Text style={styles.sectionTitle}>SOCIAL & ACTIVITY</Text>
            <View style={styles.settingsGroup}>
              <NotificationSettingItem
                title="New Followers"
                description="Notify when someone follows you"
                value={appSettings.newFollowers}
                onToggle={() => toggleAppSetting('newFollowers')}
              />
              <NotificationSettingItem
                title="Event Invitations"
                description="Notify when you're invited to events"
                value={appSettings.eventInvitations}
                onToggle={() => toggleAppSetting('eventInvitations')}
              />
              <NotificationSettingItem
                title="Friend Event Activity"
                description="Notify when friends join or create public events"
                value={appSettings.friendEventActivity}
                onToggle={() => toggleAppSetting('friendEventActivity')}
              />
              <NotificationSettingItem
                title="Suggested Events"
                description="Notify when new events match your interests"
                value={appSettings.suggestedEvents}
                onToggle={() => toggleAppSetting('suggestedEvents')}
              />
              <NotificationSettingItem
                title="Official Studio Events"
                description="Notify when your studio posts official events"
                value={appSettings.officialEvents}
                onToggle={() => toggleAppSetting('officialEvents')}
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
          showSocialActivity={true}
          sectionStyle={styles.section}
        />
      )}

      {/* Attending Defaults - Use GuestNotificationSettingsForm */}
      {activeTab === 'attending' && (
        <GuestNotificationSettingsForm
          settings={attendingSettings}
          onUpdateSettings={setAttendingSettings}
          showCriticalUpdates={false}
          showEventUpdates={true}
          showSocialActivity={true}
          sectionStyle={styles.section}
        />
      )}
      </ScrollView>
    </View>
  );
}

export default NotificationSettings;

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 50, // Extra bottom spacing for safe scrolling
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
  lastSection: {
    marginBottom: 20, // Bottom margin for last section
  },
  sectionTitle: {
    color: theme.colors.vibeCyan,
    fontSize: 12,
    fontFamily: theme.fonts.comicBold,
    letterSpacing: 1,
    marginBottom: 10,
  },
  settingsGroup: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: theme.sizes.borderRadius,
    borderWidth: 3,
    borderColor: theme.colors.vibeBlue,
  },
});
