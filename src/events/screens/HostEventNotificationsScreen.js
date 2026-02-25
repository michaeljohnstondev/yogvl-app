// HostEventNotificationsScreen.js

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ScreenHeader } from '../../components/ui/layout';
import { useVibeAlert } from '../../components/ui/base/VibeAlertContext';
import { VibeButton } from '../../components/ui';
import ReminderListSection from '../../components/notifications/ReminderListSection';
import theme from '../../theme/themes';

export default function HostEventNotificationsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const vibeAlert = useVibeAlert();

  const {
    notificationSettings,
    currentUserId,
    userContext = 'hosting',
    eventId = null,
    studioId = null,
    eventData = null,
  } = route.params;

  // Memoize default settings to ensure stable reference
  const defaultSettings = useMemo(() => ({
    enabled: true,
    notifyOnJoin: true,
    notifyOnLeave: true,
    newComments: true,
    eventRecap: false,
    attendanceReminders: 'none',
    reminderTemplates: {}, // Use object instead of array to match expected structure
  }), []);

  // Memoize initial settings to ensure stable reference
  const initialSettings = useMemo(() =>
    notificationSettings || defaultSettings,
    [notificationSettings, defaultSettings]
  );
  const [localSettings, setLocalSettings] = useState(initialSettings);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const scrollViewRef = useRef(null);
  const previousSettingsRef = useRef(null);

  // Auto-save - update parent form immediately when local settings change
  const isFirstRender = useRef(true);
  const saveTimeoutRef = useRef(null);

  // Pass settings back to CreateEvent (only when in create mode)
  const passSettingsToCreateEvent = useCallback(() => {
    if (!eventId && JSON.stringify(localSettings) !== JSON.stringify(initialSettings)) {
      console.log('[HostEventNotificationsScreen] Passing settings back to CreateEvent. Reminder templates:', Object.keys(localSettings.reminderTemplates || {}));
      navigation.navigate('CreateEvent', {
        updatedNotificationSettings: localSettings,
        timestamp: Date.now() // Force re-render on CreateEventForm
      });
    }
  }, [localSettings, initialSettings, navigation, eventId]);

  // Handle close button - pass settings if needed, then go back
  const handleClose = useCallback(() => {
    // Clear any pending debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // If we're in create mode, pass settings back to CreateEvent before going back
    if (!eventId && JSON.stringify(localSettings) !== JSON.stringify(initialSettings)) {
      passSettingsToCreateEvent();
    } else {
      // Otherwise just go back
      navigation.goBack();
    }
  }, [passSettingsToCreateEvent, navigation, eventId, localSettings, initialSettings]);

  // Handle Update Settings button - save and show confirmation
  const handleUpdateSettings = useCallback(async () => {
    setIsUpdating(true);

    // Clear any pending debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // If we have eventId and studioId, save to Firebase (editing existing event)
    if (eventId && studioId) {
      try {
        const { updateDoc, doc } = await import('firebase/firestore');
        const { db } = await import('../../auth/services/firebase');

        const eventRef = doc(db, 'studios', studioId, 'events', eventId);

        // Log when templates are added/enabled or removed
        const previousTemplates = previousSettingsRef.current?.reminderTemplates || {};
        const currentTemplates = localSettings?.reminderTemplates || {};

        // Log additions/enables
        Object.keys(currentTemplates).forEach(templateId => {
          const wasDisabledOrMissing = !previousTemplates[templateId];
          const isNowEnabled = currentTemplates[templateId] === true;

          if (isNowEnabled && wasDisabledOrMissing) {
            console.log(`[HostEventNotificationsScreen] adding ${templateId} to studios/${studioId}/events/${eventId}/notificationSettings`);
          }
        });

        // Log removals (templates that existed before but are now gone)
        Object.keys(previousTemplates).forEach(templateId => {
          const existedBefore = previousTemplates.hasOwnProperty(templateId);
          const existsNow = currentTemplates.hasOwnProperty(templateId);

          if (existedBefore && !existsNow) {
            console.log(`[HostEventNotificationsScreen] removing ${templateId} from studios/${studioId}/events/${eventId}/notificationSettings`);
          }
        });

        await updateDoc(eventRef, {
          notificationSettings: localSettings
        });

        // Store current settings for next comparison
        previousSettingsRef.current = { ...localSettings };

        console.log('[HostEventNotificationsScreen] Saved notification settings to Firebase for event:', eventId);

        setIsUpdating(false);
        navigation.goBack();
      } catch (error) {
        console.error('[HostEventNotificationsScreen] Failed to save settings to Firebase:', error);
        vibeAlert.error(
          'Save Failed',
          'Failed to save notification settings. Please try again.'
        );
        setIsUpdating(false);
      }
    } else {
      // No eventId - we're in create mode, pass settings back to CreateEvent
      passSettingsToCreateEvent();
      setIsUpdating(false);
    }
  }, [passSettingsToCreateEvent, navigation, vibeAlert, eventId, studioId, localSettings]);

  // Initialize settings from route params
  useEffect(() => {
    if (notificationSettings) {
      console.log('[HostEventNotificationsScreen] Initializing with reminderTemplates:', Object.keys(notificationSettings.reminderTemplates || {}));
      setLocalSettings(notificationSettings);
      previousSettingsRef.current = { ...notificationSettings };
    } else {
      setLocalSettings(defaultSettings);
      previousSettingsRef.current = { ...defaultSettings };
    }

    // Set loading to false after initialization
    setIsLoadingTemplates(false);
  }, [notificationSettings, defaultSettings]);

  // Toggle functions
  const toggleSetting = (key) => {
    setLocalSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
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
    <View style={styles.outerContainer}>
      <ScreenHeader
        title="Event Notifications"
        onClose={handleClose}
        showBorder={true}
        showCloseButton={true}
        style={styles.screenHeader}
        titleStyle={styles.screenHeaderTitle}
      />

      <View style={styles.container}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        {/* Main Enable/Disable Toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>EVENT NOTIFICATIONS</Text>
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

        {/* Only show other settings if notifications are enabled */}
        {(localSettings?.enabled ?? true) && (
          <>
            {/* Reminders */}
            <ReminderListSection
              settings={localSettings}
              onUpdateSettings={setLocalSettings}
              isLoadingTemplates={isLoadingTemplates}
              currentUserId={currentUserId}
              userContext={userContext}
              eventData={eventData}
              sectionStyle={styles.section}
            />

            {/* Event Activity Settings - Only show if notifications are enabled */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>EVENT ACTIVITY</Text>
              <View style={styles.settingsGroup}>
                <SettingItem
                  title="Someone Joins"
                  description="Notify when guests or cohosts join this event"
                  value={localSettings?.notifyOnJoin ?? true}
                  onToggle={() => toggleSetting('notifyOnJoin')}
                />
                <SettingItem
                  title="Someone Leaves"
                  description="Notify when guests or cohosts leave this event"
                  value={localSettings?.notifyOnLeave ?? true}
                  onToggle={() => toggleSetting('notifyOnLeave')}
                />
                <SettingItem
                  title="Someone Comments"
                  description="Notify when guests or cohosts comment on this event"
                  value={localSettings?.newComments ?? true}
                  onToggle={() => toggleSetting('newComments')}
                  isLast
                />
              </View>
            </View>

            {/* Post-event Settings - Only show if notifications are enabled */}
            <View style={[styles.section, styles.lastSection]}>
              <Text style={styles.sectionTitle}>POST-EVENT</Text>
              <View style={styles.settingsGroup}>
                <SettingItem
                  title="Event Recap"
                  description="Send a summary notification after this event ends"
                  value={localSettings?.eventRecap ?? false}
                  onToggle={() => toggleSetting('eventRecap')}
                  isLast
                />
              </View>
            </View>
          </>
        )}
      </ScrollView>
      </View>

      {/* Sticky Update Settings Button */}
      <SafeAreaView style={styles.stickyButtonContainer} edges={['bottom']}>
        <VibeButton
          label={isUpdating ? "UPDATING..." : "UPDATE SETTINGS"}
          onPress={handleUpdateSettings}
          variant="filled"
          style={styles.stickyButton}
          disabled={isUpdating}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  screenHeader: {
    paddingVertical: 0,
  },
  screenHeaderTitle: {
    fontSize: 22,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingBottom: 100, // Space for sticky button
  },
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
    marginBottom: 6,
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
  stickyButtonContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: theme.colors.background,
    borderTopWidth: 2,
    borderTopColor: theme.colors.vibeBlue,
  },
  stickyButton: {
    width: '100%',
  },
});
