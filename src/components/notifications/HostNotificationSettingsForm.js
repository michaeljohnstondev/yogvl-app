// Host notification settings form component with custom reminder templates
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
} from 'react-native';
import theme from '../../theme/themes';

export default function HostNotificationSettingsForm({
  settings,
  onUpdateSettings,
  showCriticalUpdates = true,
  showEventUpdates = true,
  showEventActivity = true,
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
      {/* Master Toggle for Host Notifications */}
      <View style={[styles.section, sectionStyle]}>
        <Text style={styles.sectionTitle}>HOSTING NOTIFICATIONS</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            title="Enable Notifications"
            description="Turn on notifications for events you're hosting"
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

          {/* Event Activity - Host-specific notifications */}
          {showEventActivity && (
            <View style={[styles.section, sectionStyle]}>
              <Text style={styles.sectionTitle}>EVENT ACTIVITY</Text>
              <View style={styles.settingsGroup}>
                <SettingItem
                  title="Someone Joins Event"
                  description="Notify when guests or cohosts join your event"
                  value={settings?.notifyOnJoin ?? true}
                  onToggle={() => toggleSetting('notifyOnJoin')}
                />
                <SettingItem
                  title="Someone Leaves Event"
                  description="Notify when guests or cohosts leave your event"
                  value={settings?.notifyOnLeave ?? true}
                  onToggle={() => toggleSetting('notifyOnLeave')}
                />
                <SettingItem
                  title="Someone Comments"
                  description="Notify when guests or cohosts comment on your event"
                  value={settings?.newComments ?? true}
                  onToggle={() => toggleSetting('newComments')}
                  isLast
                />
              </View>
            </View>
          )}

          {/* Post-Event Notifications */}
          <View style={[styles.section, sectionStyle, styles.lastSection]}>
            <Text style={styles.sectionTitle}>POST-EVENT</Text>
            <View style={styles.settingsGroup}>
              <SettingItem
                title="Event Recap"
                description="Send a notification to manage attendance"
                value={settings?.eventRecap ?? false}
                onToggle={() => toggleSetting('eventRecap')}
                isLast
              />
            </View>
          </View>

        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
  },
  lastSection: {
    marginBottom: 25, // Extra margin at bottom for last section
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
