// Subscription Notification Settings Modal for Event Attendees
import React, { useState, useRef, useEffect, memo } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView } from 'react-native';
import { useAuth } from '../../../auth/AuthContext';
import { CloseButton } from '../../../components/ui';
import { addEventNotificationSubscription } from '../../services/shared/eventSubscriptionService';
import GuestNotificationSettingsForm from '../../../components/notifications/GuestNotificationSettingsForm';
import ReminderListSection from '../../../components/notifications/ReminderListSection';
import theme from '../../../theme/themes';

const SubscriptionNotificationSettings = memo(function SubscriptionNotificationSettings({
  visible,
  onClose,
  eventData,
  eventId,
  studioId,
  userDefaults = {},
  isSubscribed = false,
}) {
  const { currentUserId } = useAuth();
  const scrollViewRef = useRef(null);
  const isFirstRender = useRef(true);
  const saveTimeoutRef = useRef(null);

  // Get user's attending defaults from the consistent path
  const attendingDefaults = userDefaults.attending || userDefaults;

  // Default subscription notification settings
  const [subscriptionSettings, setSubscriptionSettings] = useState({
    eventCancellation: true,
    hostChanges: attendingDefaults.hostChanges ?? true,
    eventReminders: attendingDefaults.eventReminders ?? true,
    hostComments: attendingDefaults.hostComments ?? true,
    newComments: attendingDefaults.newComments ?? false,
    reminderTemplates: attendingDefaults.reminderTemplates || {},
  });

  // Auto-save: debounce settings changes to Firestore
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!isSubscribed || !currentUserId || !eventId || !studioId) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('[SubscriptionSettings] Auto-saving notification settings');
        await addEventNotificationSubscription(
          currentUserId,
          eventId,
          studioId,
          subscriptionSettings
        );
        console.log('[SubscriptionSettings] Auto-save complete');
      } catch (error) {
        console.error('[SubscriptionSettings] Auto-save failed:', error);
      }
    }, 800);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [subscriptionSettings, isSubscribed, currentUserId, eventId, studioId]);

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
            <GuestNotificationSettingsForm
              settings={subscriptionSettings}
              onUpdateSettings={setSubscriptionSettings}
              showCriticalUpdates={true}
              showEventUpdates={true}
              showSocialActivity={true}
              isPerEvent={true}
              sectionStyle={styles.section}
              renderAfterToggle={() => (
                <ReminderListSection
                  settings={subscriptionSettings}
                  onUpdateSettings={setSubscriptionSettings}
                  currentUserId={currentUserId}
                  userContext="attending"
                  eventData={eventData}
                  sectionStyle={styles.section}
                />
              )}
            />
          </ScrollView>
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
    paddingBottom: 30,
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 0,
  },
});
