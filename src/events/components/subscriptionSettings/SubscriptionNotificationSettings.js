// Subscription Notification Settings Modal for Event Attendees
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Switch,
  ScrollView,
} from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../auth/services/firebase';
import { useAuth } from '../../../auth/AuthContext';
import VibeButton from '../../../components/ui/VibeButton';
import VibeSegmentedControl from '../../../components/ui/VibeSegmentedControl';
import CloseButton from '../../../components/ui/CloseButton';
import theme from '../../../theme/themes';

export default function SubscriptionNotificationSettings({
  visible,
  onClose,
  onSubscribe,
  eventData,
  userDefaults = {},
}) {
  const { currentUserId } = useAuth();
  // Get user's attending defaults from the consistent path
  const attendingDefaults = userDefaults.attending || userDefaults; // Support both old and new structure for now
  
  // Default subscription notification settings - simplified for better UX
  const [subscriptionSettings, setSubscriptionSettings] = useState({
    // Critical changes that affect attendance
    eventCancellation: true, // Always true - critical info
    hostChanges: attendingDefaults.hostChanges ?? true, // All host changes (time, location, details, fees, etc.)
    
    // Reminders for the event
    eventReminders: attendingDefaults.eventReminders ?? true,
    reminderTiming: attendingDefaults.reminderTiming ?? '1hour',
    dayBeforeReminder: attendingDefaults.dayBeforeReminder ?? true,
    
    // Social activity 
    hostComments: attendingDefaults.hostComments ?? true, // Host comments in social feed (batched after first) - default ON
    newComments: attendingDefaults.newComments ?? false, // All other comments (batched after first)
  });

  const reminderOptions = [
    { label: '15 min', value: '15min' },
    { label: '1 hour', value: '1hour' },
    { label: '1 day', value: '1day' },
  ];

  const toggleSetting = (key) => {
    setSubscriptionSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const updateReminderTiming = (value) => {
    setSubscriptionSettings(prev => ({
      ...prev,
      reminderTiming: value
    }));
  };

  const handleSubscribe = () => {
    onSubscribe(subscriptionSettings);
    onClose();
  };

  const saveAsDefaults = async () => {
    if (!currentUserId) return;

    try {
      const userRef = doc(db, 'users', currentUserId);
      await updateDoc(userRef, {
        'userdata.settings.notifications.attending': {
          hostChanges: subscriptionSettings.hostChanges,
          eventReminders: subscriptionSettings.eventReminders,
          reminderTiming: subscriptionSettings.reminderTiming,
          dayBeforeReminder: subscriptionSettings.dayBeforeReminder,
          hostComments: subscriptionSettings.hostComments,
          newComments: subscriptionSettings.newComments,
        }
      });
      
      // Show success feedback
      console.log('[SubscriptionSettings] Notification defaults saved successfully');
      // Could add a brief success indicator here if desired
    } catch (error) {
      console.error('[SubscriptionSettings] Failed to save notification defaults:', error);
    }
  };

  const SettingItem = ({ title, description, value, onToggle, disabled = false, isLast = false }) => (
    <View style={[styles.settingItem, !isLast && styles.settingBorder]}>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, disabled && styles.disabledText]}>{title}</Text>
        <Text style={[styles.settingDescription, disabled && styles.disabledText]}>
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
          <Text style={styles.headerTitle}>Notification Preferences</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Event Info */}
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>{eventData?.title}</Text>
            <Text style={styles.eventSubtitle}>Choose your notification preferences for this event</Text>
          </View>

          {/* Critical Updates - Always On */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CRITICAL UPDATES</Text>
            <View style={styles.settingsGroup}>
              <SettingItem
                title="Event Cancellation"
                description="Important: Always receive cancellation notices"
                value={subscriptionSettings.eventCancellation}
                onToggle={() => {}} // No-op
                disabled={true}
                isLast
              />
            </View>
          </View>

          {/* Event Updates */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EVENT UPDATES</Text>
            <View style={styles.settingsGroup}>
              <SettingItem
                title="Host Changes"
                description="Time, location, details, fees, and other event changes"
                value={subscriptionSettings.hostChanges}
                onToggle={() => toggleSetting('hostChanges')}
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
                description="Remind me before the event starts"
                value={subscriptionSettings.eventReminders}
                onToggle={() => toggleSetting('eventReminders')}
              />
              <SettingItem
                title="Day Before Reminder"
                description="Send a reminder 24 hours before"
                value={subscriptionSettings.dayBeforeReminder}
                onToggle={() => toggleSetting('dayBeforeReminder')}
                isLast
              />
            </View>
          </View>

          {/* Reminder Timing */}
          {subscriptionSettings.eventReminders && (
            <View style={styles.section}>
              <Text style={styles.reminderLabel}>Send event reminders:</Text>
              <VibeSegmentedControl
                options={reminderOptions}
                selectedValue={subscriptionSettings.reminderTiming}
                onSelect={updateReminderTiming}
                style={styles.segmentedControl}
              />
            </View>
          )}

          {/* Social Activity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SOCIAL ACTIVITY</Text>
            <View style={styles.settingsGroup}>
              <SettingItem
                title="Host Comments"
                description="Comments from the event host (batched after first)"
                value={subscriptionSettings.hostComments}
                onToggle={() => toggleSetting('hostComments')}
              />
              <SettingItem
                title="Other Comments"
                description="Comments from attendees (batched after first)"
                value={subscriptionSettings.newComments}
                onToggle={() => toggleSetting('newComments')}
                isLast
              />
            </View>
          </View>

          {/* Use Defaults Button */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.defaultsButton}
              onPress={saveAsDefaults}
            >
              <Text style={styles.defaultsButtonText}>Save as Default Settings</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Subscribe Button */}
        <View style={styles.footer}>
          <VibeButton
            label="SUBSCRIBE TO EVENT"
            onPress={handleSubscribe}
            style={styles.subscribeButton}
          />
        </View>
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
    width: 50,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  eventInfo: {
    paddingVertical: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
  },
  eventTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  eventSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  section: {
    marginBottom: 20,
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
  disabledText: {
    opacity: 0.6,
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
  defaultsButton: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: theme.sizes.borderRadius,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    padding: 20,
    alignItems: 'center',
  },
  defaultsButtonText: {
    color: theme.colors.vibeGreen,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.darkGray,
  },
  subscribeButton: {
    width: '100%',
  },
});