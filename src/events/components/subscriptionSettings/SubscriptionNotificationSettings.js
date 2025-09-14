// Subscription Notification Settings Modal for Event Attendees
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView } from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../auth/services/firebase';
import { useAuth } from '../../../auth/AuthContext';
import { VibeButton, CloseButton } from '../../../components/ui';
import GuestNotificationSettingsForm from '../../../components/notifications/GuestNotificationSettingsForm';
import theme from '../../../theme/themes';

export default function SubscriptionNotificationSettings({
  visible,
  onClose,
  onSubscribe,
  eventData,
  userDefaults = {},
}) {
  const { currentUserId } = useAuth();
  const scrollViewRef = useRef(null);
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

    // Custom reminder templates
    reminderTemplates: attendingDefaults.reminderTemplates || [],
  });

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
          reminderTemplates: subscriptionSettings.reminderTemplates,
        },
      });

      // Show success feedback
      console.log(
        '[SubscriptionSettings] Notification defaults saved successfully'
      );
      // Could add a brief success indicator here if desired
    } catch (error) {
      console.error(
        '[SubscriptionSettings] Failed to save notification defaults:',
        error
      );
    }
  };

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

        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Use the new reusable guest notification settings form */}
          <GuestNotificationSettingsForm
            settings={subscriptionSettings}
            onUpdateSettings={setSubscriptionSettings}
            showCriticalUpdates={true}
            showEventUpdates={true}
            showReminders={true}
            showSocialActivity={true}
            showSaveAsDefaults={true}
            onSaveAsDefaults={saveAsDefaults}
            sectionStyle={styles.section}
            scrollViewRef={scrollViewRef}
          />
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
  section: {
    marginBottom: 20,
    paddingHorizontal: 0, // Remove padding since it's handled by the form component
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
