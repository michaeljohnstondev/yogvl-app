// Subscription Notification Settings Modal for Event Attendees
import React, { useState, useRef, memo, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, updateDoc } from '../../../lib/firebase/firestore';
import { db } from '../../../auth/services/firebase';
import { useAuth } from '../../../auth/AuthContext';
import { VibeButton, CloseButton } from '../../../components/ui';
import GuestNotificationSettingsForm from '../../../components/notifications/GuestNotificationSettingsForm';
import ReminderListSection from '../../../components/notifications/ReminderListSection';
import theme from '../../../theme/themes';

const SubscriptionNotificationSettings = memo(function SubscriptionNotificationSettings({
  visible,
  onClose,
  onSubscribe,
  eventData,
  userDefaults = {},
  isSubscribed = false,
}) {
  const { currentUserId } = useAuth();
  const scrollViewRef = useRef(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Get user's attending defaults from the consistent path
  const attendingDefaults = userDefaults.attending || userDefaults; // Support both old and new structure for now

  // Default subscription notification settings - simplified for better UX
  const [subscriptionSettings, setSubscriptionSettings] = useState({
    // Critical changes that affect attendance
    eventCancellation: true, // Always true - critical info
    hostChanges: attendingDefaults.hostChanges ?? true, // All host changes (time, location, details, fees, etc.)

    // Reminders for the event
    eventReminders: attendingDefaults.eventReminders ?? true,

    // Social activity
    hostComments: attendingDefaults.hostComments ?? true, // Host comments in social feed (batched after first) - default ON
    newComments: attendingDefaults.newComments ?? false, // All other comments (batched after first)

    // Custom reminder templates
    reminderTemplates: attendingDefaults.reminderTemplates || {}, // Object format, not array
  });

  const handleSubscribe = useCallback(async () => {
    setIsUpdating(true);
    await onSubscribe(subscriptionSettings);
    setIsUpdating(false);
    onClose();
  }, [onSubscribe, subscriptionSettings, onClose]);

  const saveAsDefaults = async () => {
    if (!currentUserId) return;

    try {
      const userRef = doc(db, 'users', currentUserId);
      await updateDoc(userRef, {
        'userdata.settings.notifications.attending': {
          hostChanges: subscriptionSettings.hostChanges,
          eventReminders: subscriptionSettings.eventReminders,
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
          <Text style={styles.headerTitle}>
            Event Notifications
          </Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.contentContainer}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Reminders first - most relevant when tapping date/time */}
            <ReminderListSection
              settings={subscriptionSettings}
              onUpdateSettings={setSubscriptionSettings}
              currentUserId={currentUserId}
              userContext="attending"
              eventData={eventData}
              sectionStyle={styles.section}
            />
            <GuestNotificationSettingsForm
              settings={subscriptionSettings}
              onUpdateSettings={setSubscriptionSettings}
              showCriticalUpdates={true}
              showEventUpdates={true}
              showSocialActivity={true}
              isPerEvent={true}
              sectionStyle={styles.section}
            />
          </ScrollView>

          {/* Update Settings Button - Sticky at bottom */}
          {isSubscribed && (
            <SafeAreaView style={styles.stickyButtonContainer} edges={['bottom']}>
              <VibeButton
                label={isUpdating ? "UPDATING..." : "UPDATE SETTINGS"}
                onPress={handleSubscribe}
                variant="filled"
                style={styles.stickyButton}
                disabled={isUpdating}
              />
            </SafeAreaView>
          )}
        </View>
      </View>
    </Modal>
  );
});

export default SubscriptionNotificationSettings;

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
  contentContainer: {
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
    marginBottom: 20,
    paddingHorizontal: 0, // Remove padding since it's handled by the form component
  },
  stickyButtonContainer: {
    backgroundColor: theme.colors.background,
    borderTopWidth: 3,
    borderTopColor: theme.colors.vibeBlue,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  stickyButton: {
    width: '100%',
  },
});
