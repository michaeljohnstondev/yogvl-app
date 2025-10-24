import React, { useEffect, useState, useCallback, memo, useMemo, useTransition, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  BackHandler,
  Share,
  Animated,
  TouchableOpacity,
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
import { getCohostInvitationStatus, acceptCohostInvitation } from '../../services/shared/cohostInvitationsService';
import { notificationPermissionService } from '../../services/notificationPermissionService';
import EventStatusBadges from '../components/detail/EventStatusBadges';
import EventInfoSection from '../components/detail/EventInfoSection';
import EventActionButtons from '../components/detail/EventActionButtons';
import AttendeeSection from '../components/detail/AttendeeSection';
import theme from '../../theme/themes';

const EventDetailScreen = memo(function EventDetailScreen({
  route,
  navigation,
}) {
  const { eventId, studioId: routeStudioId, openMessageBoard } = route.params;
  const { currentUserId, userData } = useAuth();
  const vibeAlert = useVibeAlert();
  const hasNavigatedToMessageBoard = React.useRef(false);

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
  const [pendingCohostInvitation, setPendingCohostInvitation] = useState(null);
  const [adminBannerDismissed, setAdminBannerDismissed] = useState(false);
  const [privateBannerDismissed, setPrivateBannerDismissed] = useState(false);

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

  // Track admin viewing events (no logging needed)

  const { eventStatus, statusColor, isEventPast, isFullEvent } =
    useEventStatus(event);

  // Filter attendees list for modal display
  // Hosts and cohosts see ALL attendees, regular guests only see friends
  const filteredAttendees = useMemo(() => {
    if (!event?.createdBy) return friendAttendees;

    const isHost = event.createdBy === currentUserId;
    const isCohost = event.cohosts?.includes(currentUserId);
    const isHostOrCohost = isHost || isCohost;

    // Hosts and cohosts see all attendees (except themselves and the host)
    // Regular guests only see their friends
    return friendAttendees.filter(
      (attendee) =>
        attendee.id !== event.createdBy && attendee.id !== currentUserId
    );
  }, [friendAttendees, event?.createdBy, event?.cohosts, currentUserId]);

  // Auto-navigate to message board when opened from notification
  useEffect(() => {
    if (openMessageBoard && event?.title && !hasNavigatedToMessageBoard.current) {
      console.log('[EventDetailScreen] 🔔 openMessageBoard param detected:', openMessageBoard);
      console.log('[EventDetailScreen] 📋 Event loaded:', event.title);
      console.log('[EventDetailScreen] 🚀 Auto-navigating to MessageBoard from notification');

      hasNavigatedToMessageBoard.current = true;

      // Small delay to ensure EventDetail is fully mounted
      setTimeout(() => {
        navigation.navigate('MessageBoard', {
          eventId,
          eventTitle: event.title,
        });
        console.log('[EventDetailScreen] ✅ Navigation to MessageBoard completed');
      }, 300);
    }
  }, [openMessageBoard, event?.title, eventId, navigation]);

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

  const handleShareEvent = useCallback(async () => {
    if (!event) return;

    try {
      // Format date and time
      const eventDate = event.eventTimestamp?.toDate
        ? event.eventTimestamp.toDate()
        : new Date(event.eventTimestamp);

      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const dateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      const timeFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        minute: '2-digit',
      });

      const formattedDate = dateFormatter.format(eventDate);
      const formattedTime = timeFormatter.format(eventDate);

      // Build share message with event details
      let shareMessage = `🎉 ${event.title}\n\n`;
      shareMessage += `📅 ${formattedDate}\n`;
      shareMessage += `🕐 ${formattedTime}\n`;
      shareMessage += `📍 ${event.location || event.address || 'Location TBA'}\n`;

      // Add description if available
      if (event.description) {
        const truncatedDesc = textUtils.truncateText(event.description, 150);
        shareMessage += `\n${truncatedDesc}\n`;
      }

      shareMessage += `\n📲 Download the BVS app to find other local events!\n`;
      shareMessage += `https://bigvibestudios.com/app`;

      const result = await Share.share({
        message: shareMessage,
      });

      if (result.action === Share.sharedAction) {
        console.log('[EventDetailScreen] Event shared successfully');
      }
    } catch (error) {
      console.error('[EventDetailScreen] Error sharing event:', error);
      vibeAlert.error('Error', 'Failed to share event');
    }
  }, [event, eventId, vibeAlert]);

  const handleNotificationSettings = useCallback(async () => {
    if (!event) return;

    const isHost = event.createdBy === currentUserId;

    if (isHost) {
      // Host: Load notification settings (from event or user defaults)
      let notificationSettings = event.notificationSettings;

      // If event doesn't have notification settings, load from user defaults
      if (!notificationSettings || !notificationSettings.reminderTemplates) {
        try {
          const CustomTemplateService = (await import('../../services/CustomTemplateService')).default;
          const reminderTemplates = await CustomTemplateService.getTemplates(currentUserId, 'hosting');

          notificationSettings = {
            enabled: true,
            notifyOnJoin: true,
            notifyOnLeave: true,
            newComments: true,
            hostChanges: true,
            eventReminders: true,
            hostComments: true,
            reminderTemplates: reminderTemplates,
          };

          console.log('[EventDetailScreen] Loaded default host templates:', Object.keys(reminderTemplates));
        } catch (error) {
          console.warn('[EventDetailScreen] Failed to load templates, using empty settings:', error);
          notificationSettings = {
            enabled: true,
            notifyOnJoin: true,
            notifyOnLeave: true,
            newComments: true,
            hostChanges: true,
            eventReminders: true,
            hostComments: true,
            reminderTemplates: {},
          };
        }
      }

      navigation.navigate('HostEventNotifications', {
        notificationSettings,
        currentUserId,
        userContext: 'hosting',
        eventId,
        studioId,
      });
    } else {
      // Guest: Open subscription modal
      startTransition(() => {
        setShowSubscriptionModal(true);
      });
    }
  }, [event, currentUserId, navigation, eventId, studioId]);

  const handleReportEvent = useCallback(() => {
    if (!event) return;

    vibeAlert.redmenu(
      'Report Event',
      'Why are you reporting this event?',
      [
        {
          text: 'Inappropriate Content',
          onPress: () => submitReport('inappropriate_content'),
        },
        {
          text: 'Spam',
          onPress: () => submitReport('spam'),
        },
        {
          text: 'Other',
          onPress: () => submitReport('other'),
        },
        {
          text: 'Cancel',
          style: 'cancel'
        },
      ]
    );
  }, [event, vibeAlert]);

  const submitReport = async (reason) => {
    try {
      await reportEvent(
        currentUserId,  // reporterId
        event.id,       // eventId
        studioId,       // eventStudioId
        reason          // reason
      );
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

        // Join with default settings directly
        await subscribeWithDefaults();
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
      hostComments: userNotificationDefaults.hostComments ?? true,
      newComments: userNotificationDefaults.newComments ?? false,
      reminderTemplates: userNotificationDefaults.reminderTemplates || {}, // Object format, not array
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

        // Request notification permission when user joins an event (contextual request)
        // This follows Facebook/Instagram pattern - ask when user takes meaningful action
        notificationPermissionService.requestPermissionIfNeeded(currentUserId, 'join_event');

        // Check if guest can invite/share based on event rules
        // Public events: guests can always invite/share
        // Private events: only if allowGuestInvites is true
        const canGuestInvite = !event.isPrivate || event.allowGuestInvites;

        vibeAlert.joinedEvent(
          'Joined Event!',
          'You have successfully joined this event!',
          () => {}, // View Event - already on event detail screen, do nothing
          () => setShowSubscriptionModal(true), // Customize Alerts
          canGuestInvite ? () => navigation.navigate('Invite', { eventId, eventTitle: event.title }) : null, // Invite Friends - only if allowed
          canGuestInvite ? handleShareEvent : null, // Share Event - only if allowed (same as invite)
          () => {
            // Go Home and trigger refresh
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home', params: { refresh: Date.now() } }]
            });
          },
          () => performUnsubscribe() // Cancel - unsubscribe from event
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

    // Show "Leaving..." banner
    vibeAlert.banner('Leaving...', '', 'info', null, false);

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

      // Hide the banner once unsubscribe is complete
      vibeAlert.hideBanner();
    } catch (error) {
      console.error(
        '[EventDetailScreen] Error unsubscribing from event:',
        error
      );
      vibeAlert.hideBanner();
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
          await eventService.deleteEvent(studioId, eventId, currentUserId, userData?.isAdmin || userData?.isGlobalAdmin);

          // Immediately navigate away to prevent refetch errors
          navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          });

          vibeAlert.success(
            'Event Deleted',
            'Event has been deleted successfully.'
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
      inviteType: 'guest_invite',
    });
  };

  const handleAcceptCohostInvitation = async () => {
    if (!pendingCohostInvitation || isLoading) return;

    setIsLoading(true);
    try {
      const result = await acceptCohostInvitation(
        pendingCohostInvitation.id,
        currentUserId,
        eventId
      );

      if (result.success) {
        // Show success message
        vibeAlert.success(
          'You\'re Now a Co-Host! ⭐',
          'You can now manage this event alongside the host.'
        );

        // Clear the pending invitation and refresh event data
        setPendingCohostInvitation(null);

        // Refresh the event data to show updated cohost status
        setTimeout(() => {
          // This will trigger the useFocusEffect to reload data
          navigation.setParams({ refresh: Date.now() });
        }, 500);
      }
    } catch (error) {
      console.error('[EventDetailScreen] Error accepting cohost invitation:', error);
      vibeAlert.error(
        'Error',
        'Failed to accept cohost invitation. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle invite completion results
  const handleInviteResult = useCallback((selectedData) => {
    vibeAlert.success(
      'Invites Sent',
      `Invited ${selectedData.users.length} people to the event!`
    );
  }, [vibeAlert]);

  // Navigation event listener for invite results
  useFocusEffect(
    useCallback(() => {
      const unsubscribe = navigation.addListener('inviteComplete', (e) => {
        const { inviteType, users, contacts, phoneContacts } = e.data || {};
        if (inviteType === 'guest_invite') {
          handleInviteResult({ users, contacts, phoneContacts });
        }
      });
      return unsubscribe;
    }, [navigation, handleInviteResult])
  );

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

          // Load user interests first
          const userInterestsData = await getUserInterests(currentUserId);

          // Extract interests from title that match user's interests
          const eventInterestsData = extractInterestsFromEventTitle(
            eventData.event.title,
            userInterestsData
          );

          setUserInterests(userInterestsData);
          setEventInterests(eventInterestsData);

          // Check for pending cohost invitation
          const cohostInvitation = await getCohostInvitationStatus(currentUserId, eventId);

          if (cohostInvitation && cohostInvitation.status === 'pending') {
            setPendingCohostInvitation(cohostInvitation);
          } else {
            setPendingCohostInvitation(null);
          }
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

  // Handle Android back button - always navigate to Home instead of closing app
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        navigation.navigate('Home');
        return true; // Prevent default back behavior
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [navigation])
  );

  if (!event) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.vibeBlue} />
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
      {/* Admin Banner - Dismissible */}
      {userData?.isAdmin && !permissions.isCreator && !permissions.isCohost && !adminBannerDismissed && (
        <View style={styles.adminBanner}>
          <Text style={styles.adminBannerText}>
            👑 ADMIN VIEW
          </Text>
          <TouchableOpacity
            onPress={() => setAdminBannerDismissed(true)}
            style={styles.dismissButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.dismissButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Private Event Banner - Dismissible */}
      {event?.privacy === 'private' && !privateBannerDismissed && (
        <View style={styles.privateBanner}>
          <Text style={styles.privateBannerText}>
            🔒 PRIVATE EVENT
          </Text>
          <TouchableOpacity
            onPress={() => setPrivateBannerDismissed(true)}
            style={styles.dismissButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.dismissButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Status Badges */}
      <EventStatusBadges
        event={event}
        isSubscribed={isSubscribed}
        onNotificationSettings={handleNotificationSettings}
        onReportEvent={handleReportEvent}
        onBack={() => navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        })}
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
        isAdmin={userData?.isAdmin}
        isSubscribed={isSubscribed}
        isEventPast={isEventPast}
        onInterestToggle={handleInterestToggleWithFeedback}
        onPrivacyIconPress={handlePrivacyIconPress}
        onShowHostProfile={handleShowHostProfile}
        onShowAttendeesModal={() => setShowFriendsModal(true)}
        onNotificationSettings={handleNotificationSettings}
        vibeAlert={vibeAlert}
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
        onManageAttendance={() => {
          navigation.navigate('EventAttendance', {
            eventId: eventId,
            studioId: studioId,
          });
        }}
        onSaveAsTemplate={() => {}}
        onEventRecap={() => {
          navigation.navigate('EventWrapUp', {
            eventId: eventId,
            studioId: studioId,
          });
        }}
        navigation={navigation}
        eventId={eventId}
        studioId={studioId}
        vibeAlert={vibeAlert}
        currentUserId={currentUserId}
        pendingCohostInvitation={pendingCohostInvitation}
        onAcceptCohostInvitation={handleAcceptCohostInvitation}
        onShareEvent={handleShareEvent}
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
    backgroundColor: 'transparent',
  },
  content: {
    paddingBottom: 100, // Fixed bottom spacing issue
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminBannerText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  dismissButton: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissButtonText: {
    color: theme.colors.background,
    fontSize: 20,
    fontWeight: 'bold',
  },
  privateBanner: {
    backgroundColor: theme.colors.vibePurple,
    borderWidth: 2,
    borderColor: theme.colors.vibePink,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: theme.sizes.buttonRadius,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privateBannerText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
});
