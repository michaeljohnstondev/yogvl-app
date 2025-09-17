import React, { useEffect, useState, useCallback, memo, useMemo, useTransition } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { VibeButton } from '../../components/ui';
import { MessageBoardButton } from '../../components/ui/buttons';
import { useVibeAlert } from '../../components/ui/base/VibeAlertContext';
import { useFocusEffect } from '@react-navigation/native';
import SubscriptionNotificationSettings from '../components/subscriptionSettings/SubscriptionNotificationSettings';
import { useAuth } from '../../auth/AuthContext';
import { eventService } from '../services/eventService';
import { eventDataService } from '../services/eventDataService';
import { textUtils } from '../../lib/textUtils';
import { toggleInterestInArray } from '../../lib/interestUtils';
import { useInterestToggle } from '../hooks/useInterestToggle';
import { useEventPermissions } from '../hooks/useEventPermissions';
import { useEventStatus } from '../hooks/useEventStatus';
import { validateUserCanJoinEvent } from '../lib/eventUtils';
import {
  getUserInterests,
  addUserInterest,
  removeUserInterest,
  extractInterestsFromEventTitle,
} from '../../services/interestService';
import { reportEvent } from '../../services/reportingService';
import EventStatusBadges from '../components/detail/EventStatusBadges';
import EventInfoSection from '../components/detail/EventInfoSection';
import EventActionButtons from '../components/detail/EventActionButtons';
import AttendeeSection from '../components/detail/AttendeeSection';
import theme from '../../theme/themes';

const EventDetailScreen = memo(function EventDetailScreen({
  route,
  navigation,
}) {
  const { eventId, studioId: routeStudioId } = route.params;
  const { currentUserId, userData } = useAuth();
  const vibeAlert = useVibeAlert();

  // Use studioId from route, or fallback to user's default studio
  const studioId =
    routeStudioId || userData?.userdata?.studios?.default?.studioId;

  // State
  const [event, setEvent] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [creatorData, setCreatorData] = useState(null);
  const [cohostData, setCohostData] = useState([]);
  const [friendAttendees, setFriendAttendees] = useState([]);
  const [userInterests, setUserInterests] = useState([]);
  const [eventInterests, setEventInterests] = useState([]);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showPrivacyFlash, setShowPrivacyFlash] = useState(false);
  const [userNotificationSettings, setUserNotificationSettings] =
    useState(null);

  // Use transition for non-urgent state updates
  const [isPending, startTransition] = useTransition();

  // Custom hooks for performance optimization
  const { handleInterestToggle, isTogglingInterest } = useInterestToggle(
    currentUserId,
    userInterests,
    setUserInterests
  );

  const { permissions, joinConstraints } = useEventPermissions(
    currentUserId,
    userData,
    event,
    isSubscribed
  );

  // Simple admin logging for clarity
  useEffect(() => {
    if (event && currentUserId && userData?.isAdmin && event.createdBy !== currentUserId) {
      console.log('[EventDetailScreen] Admin viewing event:', event.title);
    }
  }, [event, currentUserId, userData?.isAdmin]);

  const { eventStatus, statusColor, isEventPast, isFullEvent } =
    useEventStatus(event);

  // Filter out host and current user from attendees list for modal display
  const filteredAttendees = useMemo(() => {
    if (!event?.createdBy) return friendAttendees;
    return friendAttendees.filter(
      (attendee) =>
        attendee.id !== event.createdBy && attendee.id !== currentUserId
    );
  }, [friendAttendees, event?.createdBy, currentUserId]);

  // Privacy flash timeout cleanup
  useEffect(() => {
    let timeoutId;
    if (showPrivacyFlash) {
      timeoutId = setTimeout(() => {
        setShowPrivacyFlash(false);
      }, 1500);
    }
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [showPrivacyFlash]);

  // Handler functions
  const handleShowHostProfile = (hostData) => {
    console.log(
      '[EventDetailScreen] Navigating to HostProfile with hostData:',
      hostData
    );

    // Ensure hostData has the expected structure
    if (!hostData || !hostData.id) {
      console.error('[EventDetailScreen] Invalid hostData:', hostData);
      vibeAlert.error('Error', 'Unable to load host profile.');
      return;
    }

    navigation.navigate('HostProfile', {
      hostData,
      currentUserId,
      eventId,
    });
  };

  const handlePrivacyIconPress = useCallback(() => {
    setShowPrivacyFlash(true);
  }, []);

  const handleNotificationSettings = useCallback(() => {
    startTransition(() => {
      setShowSubscriptionModal(true);
    });
  }, []);

  const handleReportEvent = useCallback(() => {
    if (!event) return;

    Alert.alert('Report Event', 'Why are you reporting this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Inappropriate Content',
        onPress: () => submitReport('inappropriate_content'),
      },
      { text: 'Spam', onPress: () => submitReport('spam') },
      { text: 'Other', onPress: () => submitReport('other') },
    ]);
  }, [event]);

  const submitReport = async (reason) => {
    try {
      await reportEvent({
        eventId: event.id,
        eventTitle: event.title,
        hostId: event.createdBy,
        reporterId: currentUserId,
        reason,
        studioId,
      });
      vibeAlert.success('Report Submitted', 'Thank you for your report.');
    } catch (error) {
      console.error('[EventDetailScreen] Error submitting report:', error);
      vibeAlert.error('Error', 'Failed to submit report.');
    }
  };

  // Interest toggle handler with error feedback
  const handleInterestToggleWithFeedback = useCallback(
    async (interest) => {
      try {
        await handleInterestToggle(interest);
      } catch (error) {
        // Show user-friendly error feedback
        vibeAlert.error(
          'Error',
          'Failed to update interest. Please try again.'
        );
      }
    },
    [handleInterestToggle, vibeAlert]
  );

  const handleSubscribe = async () => {
    if (!event || !currentUserId || isLoading) return;

    setIsLoading(true);

    try {
      if (!isSubscribed) {
        const canJoin = await validateUserCanJoinEvent(userData, event);
        if (!canJoin) {
          setIsLoading(false);
          return;
        }

        vibeAlert.subscribe(
          'Join Event',
          'Choose your notification preferences for this event:',
          () => subscribeWithDefaults(),
          () => setShowSubscriptionModal(true),
          () => setIsLoading(false)
        );
        return;
      }

      await performUnsubscribe();
    } finally {
      if (isSubscribed) {
        // Unsubscribe handles loading state
      }
    }
  };

  const subscribeWithDefaults = async () => {
    if (!event || !currentUserId) return;

    const userNotificationDefaults =
      userData?.userdata?.settings?.notifications?.attending || {};
    const defaultSettings = {
      eventCancellation: true,
      hostChanges: userNotificationDefaults.hostChanges ?? true,
      eventReminders: userNotificationDefaults.eventReminders ?? true,
      reminderTiming: userNotificationDefaults.reminderTiming ?? '1hour',
      dayBeforeReminder: userNotificationDefaults.dayBeforeReminder ?? true,
      hostComments: userNotificationDefaults.hostComments ?? true,
      newComments: userNotificationDefaults.newComments ?? false,
      reminderTemplates: userNotificationDefaults.reminderTemplates || [],
    };

    await handleSubscribeWithSettings(defaultSettings);
  };

  const handleSubscribeWithSettings = useCallback(async (notificationSettings) => {
    if (!event || !currentUserId || isLoading) return;

    setIsLoading(true);

    try {
      if (isSubscribed) {
        // User is already subscribed, just update their notification settings
        await eventService.addEventNotificationSubscription(
          currentUserId,
          eventId,
          studioId,
          notificationSettings
        );

        // Batch state updates to prevent multiple re-renders
        startTransition(() => {
          setShowSubscriptionModal(false);
        });

        vibeAlert.success(
          'Settings Updated',
          'Your notification settings have been updated!'
        );
      } else {
        // User is not subscribed, subscribe them with settings
        const result = await eventService.subscribeToEvent(
          currentUserId,
          eventId,
          studioId,
          notificationSettings
        );

        // Batch all state updates together
        startTransition(() => {
          setEvent((prev) => ({
            ...prev,
            subscribers: result.subscribers,
            subscriberCount: result.subscriberCount,
          }));
          setIsSubscribed(true);
          setShowSubscriptionModal(false);
        });

        vibeAlert.success(
          'Joined Event',
          'You have successfully joined this event!'
        );
      }
    } catch (error) {
      console.error('[EventDetailScreen] Error with subscription/settings:', error);
      console.error('[EventDetailScreen] Error stack:', error.stack);
      console.error('[EventDetailScreen] Error details:', {
        message: error.message,
        name: error.name,
        isSubscribed,
        currentUserId,
        eventId,
        studioId,
        notificationSettings
      });

      if (error.message === 'ALREADY_SUBSCRIBED') {
        vibeAlert.error(
          'Already Subscribed',
          'You are already subscribed to this event.'
        );
        setIsSubscribed(true);
      } else {
        const errorTitle = isSubscribed ? 'Settings Update Failed' : 'Join Event Failed';
        let errorMessage = isSubscribed
          ? 'Failed to update notification settings. Please try again.'
          : 'Failed to join event. Please try again.';

        // Add more specific error information for debugging
        if (error.message && error.message.includes('import')) {
          errorMessage += ' (Service import error)';
        } else if (error.message && error.message.includes('not found')) {
          errorMessage += ' (Event not found)';
        }

        vibeAlert.error(errorTitle, errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [event, currentUserId, isLoading, isSubscribed, eventId, studioId, vibeAlert]);

  const performUnsubscribe = useCallback(async () => {
    if (!event || !currentUserId) return;

    try {
      const result = await eventService.unsubscribeFromEvent(
        currentUserId,
        eventId,
        studioId
      );

      // Batch state updates to prevent multiple re-renders
      startTransition(() => {
        setEvent((prev) => ({
          ...prev,
          subscribers: result.subscribers,
          subscriberCount: result.subscriberCount,
        }));
        setIsSubscribed(false);
      });

      vibeAlert.success('Left Event', 'You have left this event.');
    } catch (error) {
      console.error(
        '[EventDetailScreen] Error unsubscribing from event:',
        error
      );
      vibeAlert.error('Error', 'Failed to leave event. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [event, currentUserId, eventId, studioId, vibeAlert]);

  const handleDelete = () => {
    if (!event) return;

    vibeAlert.confirm(
      'Delete Event',
      `Are you sure you want to delete "${event.title}"? This cannot be undone.`,
      async () => {
        try {
          await eventService.deleteEvent(studioId, eventId, currentUserId);
          vibeAlert.success(
            'Event Deleted',
            'Event has been deleted successfully.',
            [
              {
                text: 'OK',
                onPress: () => navigation.goBack(),
              },
            ]
          );
        } catch (error) {
          console.error('[EventDetailScreen] Error deleting event:', error);
          vibeAlert.error('Error', 'Failed to delete event. Please try again.');
        }
      }
    );
  };

  const handleKickAttendee = (attendeeId, attendeeName) => {
    vibeAlert.confirm(
      'Remove Attendee',
      `Remove ${attendeeName} from this event?`,
      async () => {
        try {
          const result = await eventService.kickAttendee(
            studioId,
            eventId,
            attendeeId,
            currentUserId
          );

          setEvent((prev) => ({
            ...prev,
            subscribers: result.subscribers,
            subscriberCount: result.subscriberCount,
          }));

          setFriendAttendees((prev) =>
            prev.filter((attendee) => attendee.id !== attendeeId)
          );

          vibeAlert.success(
            'Attendee Removed',
            `${attendeeName} has been removed from the event.`
          );
        } catch (error) {
          console.error('[EventDetailScreen] Error kicking attendee:', error);
          vibeAlert.error('Error', 'Failed to remove attendee.');
        }
      }
    );
  };

  const handleInvite = () => {
    navigation.navigate('Invite', {
      type: 'guests',
      selectedUsers: [],
      selectedContacts: [],
      selectedPhoneContacts: [],
      eventTitle: event?.title,
      eventId: eventId, // Pass eventId for proper filtering
      studioId: studioId, // Pass studioId for proper filtering
      source: 'guest_invite',
      onSave: (selectedData) => {
        vibeAlert.success(
          'Invites Sent',
          `Invited ${selectedData.users.length} people to the event!`
        );
        navigation.goBack();
      },
    });
  };

  // Load event data on focus
  useFocusEffect(
    useCallback(() => {
      const fetchEventData = async () => {
        if (!studioId || !eventId || !currentUserId) return;

        try {
          const eventData = await eventDataService.fetchEventData(
            studioId,
            eventId,
            currentUserId
          );

          // Data loaded successfully

          setEvent(eventData.event);
          setIsSubscribed(eventData.isSubscribed);
          setCreatorData(eventData.creatorData);
          setCohostData(eventData.cohostData);
          // Filter out current user from attendees list
          const filteredAttendees = eventData.attendeesList.filter(
            (attendee) => attendee.id !== currentUserId
          );
          setFriendAttendees(filteredAttendees);

          // Load interests
          const [userInterestsData, eventInterestsData] = await Promise.all([
            getUserInterests(currentUserId),
            extractInterestsFromEventTitle(eventData.event.title),
          ]);

          setUserInterests(userInterestsData);
          setEventInterests(eventInterestsData);
        } catch (error) {
          console.error(
            '[EventDetailScreen] Error fetching event data:',
            error
          );
          vibeAlert.error(
            'Error',
            'Failed to load event details. Please try again.',
            [
              {
                text: 'Retry',
                onPress: () => fetchEventData(),
              },
              {
                text: 'Go Back',
                onPress: () => navigation.goBack(),
              },
            ]
          );
        }
      };

      fetchEventData();
    }, [studioId, eventId, currentUserId, navigation, vibeAlert])
  );

  if (!event) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.alertButton} />
        <Text style={styles.loadingText}>Loading event...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Admin Banner */}
      {userData?.isAdmin && !permissions.isCreator && !permissions.isCohost && (
        <View style={styles.adminBanner}>
          <Text style={styles.adminBannerText}>
            👑 ADMIN VIEW - You're viewing this event with admin privileges
          </Text>
        </View>
      )}

      {/* Status Badges */}
      <EventStatusBadges
        event={event}
        isSubscribed={isSubscribed}
        onNotificationSettings={handleNotificationSettings}
        onReportEvent={handleReportEvent}
      />

      {/* Event Info Section */}
      <EventInfoSection
        event={event}
        currentUserId={currentUserId}
        creatorData={creatorData}
        cohostData={cohostData}
        friendAttendees={friendAttendees}
        userInterests={userInterests}
        eventInterests={eventInterests}
        showPrivacyFlash={showPrivacyFlash}
        onInterestToggle={handleInterestToggleWithFeedback}
        onPrivacyIconPress={handlePrivacyIconPress}
        onShowHostProfile={handleShowHostProfile}
        onShowAttendeesModal={() => setShowFriendsModal(true)}
      />

      {/* Message Board Button */}
      <MessageBoardButton
        eventId={eventId}
        eventTitle={event?.title}
        navigation={navigation}
      />

      {/* Action Buttons */}
      <EventActionButtons
        event={event}
        isEventPast={isEventPast}
        isSubscribed={isSubscribed}
        isLoading={isLoading || isTogglingInterest || isPending}
        permissions={permissions}
        joinConstraints={joinConstraints}
        onSubscribe={handleSubscribe}
        onInvite={handleInvite}
        onEdit={() => {}}
        onDelete={handleDelete}
        onManageAttendance={() => {}}
        onSaveAsTemplate={() => {}}
        onEventRecap={() => {}}
        navigation={navigation}
        eventId={eventId}
        studioId={studioId}
        vibeAlert={vibeAlert}
        currentUserId={currentUserId}
      />

      {/* Subscription Modal */}
      <SubscriptionNotificationSettings
        visible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        onSubscribe={handleSubscribeWithSettings}
        eventData={event}
        userDefaults={userData?.userdata?.settings?.notifications}
        currentUserId={currentUserId}
        isSubscribed={isSubscribed}
      />

      {/* Attendees Modal */}
      <AttendeeSection
        visible={showFriendsModal}
        onClose={() => setShowFriendsModal(false)}
        attendees={filteredAttendees}
        eventData={event}
        currentUserId={currentUserId}
        isHost={permissions.canEdit}
        onKickAttendee={handleKickAttendee}
        navigation={navigation}
      />
    </ScrollView>
  );
});

export default EventDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingBottom: 100, // Fixed bottom spacing issue
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    marginTop: 12,
  },
  adminBanner: {
    backgroundColor: theme.colors.vibeYellow,
    borderWidth: 2,
    borderColor: theme.colors.vibeOrange,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: theme.sizes.buttonRadius,
    alignItems: 'center',
  },
  adminBannerText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
