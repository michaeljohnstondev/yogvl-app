// Guest/attendee notification settings form component
import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
} from 'react-native';
import theme from '../../theme/themes';

const GuestNotificationSettingsForm = memo(function GuestNotificationSettingsForm({
  settings,
  onUpdateSettings,
  showCriticalUpdates = true,
  showEventUpdates = true,
  showSocialActivity = true,
  sectionStyle,
}) {
  const toggleSetting = (key) => {
    onUpdateSettings({
      ...settings,
      [key]: !settings?.[key],
    });
  };

  const SettingItem = ({
    title,
    description,
    value,
    onToggle,
    disabled = false,
    isLast = false,
  }) => (
    <View style={[styles.settingItem, !isLast && styles.settingBorder]}>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, disabled && styles.disabledText]}>
          {title}
        </Text>
        <Text
          style={[styles.settingDescription, disabled && styles.disabledText]}
        >
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{
          false: theme.colors.darkGray,
          true: theme.colors.vibeGreen,
        }}
        thumbColor={value ? theme.colors.white : theme.colors.gray}
      />
    </View>
  );

  return (
    <>
      {/* Master Toggle for Attendee Notifications */}
      <View style={[styles.section, sectionStyle]}>
        <Text style={styles.sectionTitle}>GUEST NOTIFICATIONS</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            title="Enable Notifications"
            description="Turn on notifications for events you're attending"
            value={settings?.enabled ?? true}
            onToggle={() => toggleSetting('enabled')}
            isLast
          />
        </View>
      </View>

      {/* Only show other settings if notifications are enabled */}
      {(settings?.enabled ?? true) && (
        <>
          {/* Critical Updates - Always On */}
          {showCriticalUpdates && (
        <View style={[styles.section, sectionStyle]}>
          <Text style={styles.sectionTitle}>CRITICAL UPDATES</Text>
          <View style={styles.settingsGroup}>
            <SettingItem
              title="Event Cancellation"
              description="Important: Always receive cancellation notices"
              value={true}
              onToggle={() => {}} // No-op
              disabled={true}
              isLast
            />
          </View>
        </View>
      )}


      {/* Event Activity */}
      {showSocialActivity && (
        <View style={[styles.section, sectionStyle]}>
          <Text style={styles.sectionTitle}>EVENT ACTIVITY</Text>
          <View style={styles.settingsGroup}>
            <SettingItem
              title="Host Changes"
              description="Time, location, details, fees, and other event changes"
              value={settings?.hostChanges ?? true}
              onToggle={() => toggleSetting('hostChanges')}
            />
            <SettingItem
              title="Host Comments"
              description="Comments from the event host"
              // TODO: Implement batching after first comment
              value={settings?.hostComments ?? true}
              onToggle={() => toggleSetting('hostComments')}
            />
            <SettingItem
              title="Other Comments"
              description="Comments from attendees"
              // TODO: Implement batching after first comment
              value={settings?.newComments ?? false}
              onToggle={() => toggleSetting('newComments')}
              isLast
            />
          </View>
        </View>
      )}
        </>
      )}
    </>
  );
});

export default GuestNotificationSettingsForm;

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
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
    overflow: 'visible',
    zIndex: 1,
    elevation: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    zIndex: 1,
    elevation: 1,
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
  disabledText: {
    opacity: 0.6,
  },
});
