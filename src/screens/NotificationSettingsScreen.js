import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { doc, updateDoc } from '../lib/firebase';
import { db } from '../auth/services/firebase';
import { VibeButton, VibeSegmentedControl } from '../components/ui';
import { NotificationSettingItem } from '../components/ui';
import ScreenHeader from '../components/ui/layout/ScreenHeader';
import NotificationSettingsForm from '../components/notifications/NotificationSettingsForm';
import GuestNotificationSettingsForm from '../components/notifications/GuestNotificationSettingsForm';
import HostNotificationSettingsForm from '../components/notifications/HostNotificationSettingsForm';
import CustomTemplateService from '../services/CustomTemplateService';
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
    newFollowers:
      userData?.userdata?.settings?.notifications?.app?.newFollowers ?? true,
    eventInvitations:
      userData?.userdata?.settings?.notifications?.app?.eventInvitations ??
      true,
    suggestedEvents:
      userData?.userdata?.settings?.notifications?.app?.suggestedEvents ??
      true,
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

  const toggleHostingSetting = (key) => {
    setHostingSettings((prev) => ({
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
                title="Suggested Events"
                description="Notify when new events match your interests"
                value={appSettings.suggestedEvents}
                onToggle={() => toggleAppSetting('suggestedEvents')}
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
          userContext="hosting"
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
          userContext="attending"
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.headerBackground,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.vibeBlue,
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
  lastSection: {
    marginBottom: 20, // Bottom margin for last section
  },
  sectionTitle: {
    color: theme.colors.vibeBlue,
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
  reminderSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: theme.sizes.borderRadius,
    borderWidth: 3,
    borderColor: theme.colors.vibeBlue,
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
