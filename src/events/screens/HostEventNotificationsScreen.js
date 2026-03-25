// HostEventNotificationsScreen.js

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ScreenHeader } from '../../components/ui/layout';
import ReminderListSection from '../../components/notifications/ReminderListSection';
import theme from '../../theme/themes';

export default function HostEventNotificationsScreen() {
  const route = useRoute();
  const navigation = useNavigation();

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
    reminderTemplates: {},
  }), []);

  // Memoize initial settings to ensure stable reference
  const initialSettings = useMemo(() =>
    notificationSettings || defaultSettings,
    [notificationSettings, defaultSettings]
  );
  const [localSettings, setLocalSettings] = useState(initialSettings);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const scrollViewRef = useRef(null);
  const isFirstRender = useRef(true);
  const saveTimeoutRef = useRef(null);

  // Handle close button - pass settings if in create mode, otherwise go back
  const handleClose = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (!eventId && JSON.stringify(localSettings) !== JSON.stringify(initialSettings)) {
      console.log('[HostEventNotificationsScreen] Passing settings back to CreateEvent');
      navigation.navigate('CreateEvent', {
        updatedNotificationSettings: localSettings,
        timestamp: Date.now(),
      });
    } else {
      navigation.goBack();
    }
  }, [navigation, eventId, localSettings, initialSettings]);

  // Auto-save: debounce settings changes to Firestore (edit mode only)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Only auto-save in edit mode (has eventId + studioId)
    if (!eventId || !studioId) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const { updateDoc, doc } = await import('firebase/firestore');
        const { db } = await import('../../auth/services/firebase');

        const eventRef = doc(db, 'studios', studioId, 'events', eventId);
        await updateDoc(eventRef, { notificationSettings: localSettings });

        console.log('[HostEventNotificationsScreen] Auto-saved notification settings for event:', eventId);
      } catch (error) {
        console.error('[HostEventNotificationsScreen] Auto-save failed:', error);
      }
    }, 800);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [localSettings, eventId, studioId]);

  // Initialize settings from route params
  useEffect(() => {
    if (notificationSettings) {
      console.log('[HostEventNotificationsScreen] Initializing with reminderTemplates:', Object.keys(notificationSettings.reminderTemplates || {}));
      setLocalSettings(notificationSettings);
    } else {
      setLocalSettings(defaultSettings);
    }
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
        <Text style={styles.settingTitle}>
          {title}
        </Text>
        <Text style={styles.settingDescription}>
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
    paddingBottom: 30,
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
});
