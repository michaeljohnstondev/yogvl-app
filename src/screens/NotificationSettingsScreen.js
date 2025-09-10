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
import VibeButton from '../components/ui/VibeButton';
import VibeSegmentedControl from '../components/ui/VibeSegmentedControl';
import CloseButton from '../components/ui/CloseButton';
import NotificationSettingsForm from '../components/notifications/NotificationSettingsForm';
import GuestNotificationSettingsForm from '../components/notifications/GuestNotificationSettingsForm';
import HostNotificationSettingsForm from '../components/notifications/HostNotificationSettingsForm';
import { useAuth } from '../auth/AuthContext';
import theme from '../theme/themes';

function NotificationSettings({ navigation }) {
  const { userData, currentUserId } = useAuth();
  
  // Current selected tab
  const [activeTab, setActiveTab] = useState('app');
  const scrollViewRef = useRef(null);
  
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
    reminderTemplates: userData?.userdata?.settings?.notifications?.hosting?.reminderTemplates ?? [],
  });

  // Attending default notification settings (for events user joins)
  const [attendingSettings, setAttendingSettings] = useState({
    hostChanges: userData?.userdata?.settings?.notifications?.attending?.hostChanges ?? true,
    eventReminders: userData?.userdata?.settings?.notifications?.attending?.eventReminders ?? true,
    reminderTiming: userData?.userdata?.settings?.notifications?.attending?.reminderTiming ?? '1hour',
    dayBeforeReminder: userData?.userdata?.settings?.notifications?.attending?.dayBeforeReminder ?? true,
    hostComments: userData?.userdata?.settings?.notifications?.attending?.hostComments ?? true,
    newComments: userData?.userdata?.settings?.notifications?.attending?.newComments ?? false,
    reminderTemplates: userData?.userdata?.settings?.notifications?.attending?.reminderTemplates || [],
  });

  const reminderOptions = [
    { label: '15 min', value: '15min' },
    { label: '1 hour', value: '1hour' },
    { label: '1 day', value: '1day' },
  ];

  // Auto-save when app settings change
  useEffect(() => {
    const saveAppSettings = async () => {
      if (!currentUserId) return;
      
      try {
        const userRef = doc(db, 'users', currentUserId);
        await updateDoc(userRef, {
          'userdata.settings.notifications.app': appSettings,
        });
        console.log('[NotificationSettings] App settings auto-saved');
      } catch (error) {
        console.error('[NotificationSettings] Failed to auto-save app settings:', error);
      }
    };

    // Skip initial save on mount (when settings match userData)
    const initialAppSettings = {
      pushNotifications: userData?.userdata?.settings?.notifications?.app?.pushNotifications ?? true,
      emailNotifications: userData?.userdata?.settings?.notifications?.app?.emailNotifications ?? false,
      smsNotifications: userData?.userdata?.settings?.notifications?.app?.smsNotifications ?? false,
      friendAdded: userData?.userdata?.settings?.notifications?.app?.friendAdded ?? true,
      eventInvitations: userData?.userdata?.settings?.notifications?.app?.eventInvitations ?? true,
      promotionalEmails: userData?.userdata?.settings?.notifications?.app?.promotionalEmails ?? false,
      quietHours: userData?.userdata?.settings?.notifications?.app?.quietHours ?? false,
      weekendNotifications: userData?.userdata?.settings?.notifications?.app?.weekendNotifications ?? true,
    };

    if (JSON.stringify(appSettings) !== JSON.stringify(initialAppSettings)) {
      saveAppSettings();
    }
  }, [appSettings, currentUserId, userData]);

  // Auto-save when hosting settings change
  useEffect(() => {
    const saveHostingSettings = async () => {
      if (!currentUserId) return;
      
      try {
        const userRef = doc(db, 'users', currentUserId);
        await updateDoc(userRef, {
          'userdata.settings.notifications.hosting': hostingSettings,
        });
        console.log('[NotificationSettings] Hosting settings auto-saved');
      } catch (error) {
        console.error('[NotificationSettings] Failed to auto-save hosting settings:', error);
      }
    };

    // Skip initial save on mount
    const initialHostingSettings = {
      enabled: userData?.userdata?.settings?.notifications?.hosting?.enabled ?? true,
      reminderTiming: userData?.userdata?.settings?.notifications?.hosting?.reminderTiming ?? '1hour',
      notifyOnJoin: userData?.userdata?.settings?.notifications?.hosting?.notifyOnJoin ?? true,
      notifyOnLeave: userData?.userdata?.settings?.notifications?.hosting?.notifyOnLeave ?? true,
      sendDayBefore: userData?.userdata?.settings?.notifications?.hosting?.sendDayBefore ?? true,
      newComments: userData?.userdata?.settings?.notifications?.hosting?.newComments ?? true,
      reminderTemplates: userData?.userdata?.settings?.notifications?.hosting?.reminderTemplates ?? [],
    };

    if (JSON.stringify(hostingSettings) !== JSON.stringify(initialHostingSettings)) {
      saveHostingSettings();
    }
  }, [hostingSettings, currentUserId, userData]);

  // Auto-save when attending settings change
  useEffect(() => {
    const saveAttendingSettings = async () => {
      if (!currentUserId) return;
      
      try {
        const userRef = doc(db, 'users', currentUserId);
        await updateDoc(userRef, {
          'userdata.settings.notifications.attending': attendingSettings,
        });
        console.log('[NotificationSettings] Attending settings auto-saved');
      } catch (error) {
        console.error('[NotificationSettings] Failed to auto-save attending settings:', error);
      }
    };

    // Skip initial save on mount
    const initialAttendingSettings = {
      hostChanges: userData?.userdata?.settings?.notifications?.attending?.hostChanges ?? true,
      eventReminders: userData?.userdata?.settings?.notifications?.attending?.eventReminders ?? true,
      reminderTiming: userData?.userdata?.settings?.notifications?.attending?.reminderTiming ?? '1hour',
      dayBeforeReminder: userData?.userdata?.settings?.notifications?.attending?.dayBeforeReminder ?? true,
      hostComments: userData?.userdata?.settings?.notifications?.attending?.hostComments ?? true,
      newComments: userData?.userdata?.settings?.notifications?.attending?.newComments ?? false,
      reminderTemplates: userData?.userdata?.settings?.notifications?.attending?.reminderTemplates || [],
    };

    if (JSON.stringify(attendingSettings) !== JSON.stringify(initialAttendingSettings)) {
      saveAttendingSettings();
    }
  }, [attendingSettings, currentUserId, userData]);

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

  const updateHostingReminderTiming = (value) => {
    setHostingSettings(prev => ({
      ...prev,
      reminderTiming: value
    }));
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
    <ScrollView ref={scrollViewRef} style={styles.container}>
      <View style={styles.header}>
        <CloseButton 
          onPress={() => navigation.goBack()}
        />
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
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
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