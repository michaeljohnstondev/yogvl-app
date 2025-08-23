import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { db } from '../../auth/services/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import VibeButton from '../../components/ui/VibeButton';
import EventCreatorInfo from '../components/hosts/EventCreatorInfo';
import HostProfileModal from '../components/hosts/HostProfileModal';
import AttendanceSummary from '../../components/ui/AttendanceSummary';
import { CommentSection } from '../../components/ui/comments';
import { useVibeAlert } from '../../components/ui/VibeAlertContext';
import { useFocusEffect } from '@react-navigation/native';
import SubscriptionNotificationSettings from '../components/subscriptionSettings/SubscriptionNotificationSettings';
import { FormatDate } from '../../lib/formatDate';
import { useAuth } from '../../auth/AuthContext';
import { updateEventSubscription, updateEventUnsubscription } from '../lib/userMetrics';
import {
  getEventStatus,
  getStatusColor,
  isPastEvent,
  isEventFull,
  validateUserCanJoinEvent,
  getUserEventPermissions,
  validateEventJoinConstraints,
} from '../lib/eventUtils';
import { notifyHostOfEventJoin, notifyHostOfEventLeave } from '../../services/notifications';
import { getUserInterests, addUserInterest, removeUserInterest, extractInterestsFromEventTitle } from '../../services/interestService';
import theme from '../../theme/themes';

export default function EventDetailScreen({ route, navigation }) {
  const { eventId, studioId: routeStudioId } = route.params;
  
  // Get current user from Auth Context
  const { currentUserId, userData } = useAuth();
  
  // Use studioId from route, or fallback to user's default studio
  const studioId = routeStudioId || userData?.userdata?.studios?.default?.studioId;
  const [event, setEvent] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [creatorData, setCreatorData] = useState(null);
  const [cohostData, setCohostData] = useState([]);
  const [showHostProfile, setShowHostProfile] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [userInterests, setUserInterests] = useState([]);
  const [eventInterests, setEventInterests] = useState([]);

  const vibeAlert = useVibeAlert();

  useFocusEffect(
    useCallback(() => {
      const fetchEvent = async () => {
        if (!studioId) {
          console.error('[EventDetailScreen] No studioId available');
          vibeAlert.error('Error', 'Unable to load event: studio information missing.');
          return;
        }
        
        try {
          console.log('[EventDetailScreen] Fetching event with ID:', eventId, 'from studio:', studioId);
          const ref = doc(db, 'studios', studioId, 'events', eventId);
          const snap = await getDoc(ref);
          console.log('[EventDetailScreen] Event snap exists:', snap.exists());
          if (snap.exists()) {
            const eventData = { id: snap.id, ...snap.data() };
            setEvent(eventData);

            // Check if user is subscribed
            const subscribers = eventData.subscribers || [];
            setIsSubscribed(subscribers.includes(currentUserId));

            // Load user interests and extract interests from event title
            try {
              const interests = await getUserInterests(currentUserId);
              setUserInterests(interests);
              
              const titleInterests = extractInterestsFromEventTitle(eventData.title);
              setEventInterests(titleInterests);
            } catch (err) {
              console.error('Failed to load user interests:', err);
              setUserInterests([]);
              setEventInterests([]);
            }

            // Fetch creator data for reliability display
            if (eventData.createdBy) {
              try {
                const creatorRef = doc(db, 'users', eventData.createdBy);
                const creatorSnap = await getDoc(creatorRef);
                if (creatorSnap.exists()) {
                  setCreatorData({ id: creatorSnap.id, ...creatorSnap.data() });
                }
              } catch (err) {
                console.error('Failed to fetch creator data:', err);
              }
            }

            // Fetch cohost data (additional hosts beyond primary)
            const additionalHosts = eventData.hosts ? eventData.hosts.slice(1) : [];
            if (additionalHosts.length > 0) {
              try {
                const cohostPromises = additionalHosts.map(async (cohostId) => {
                  const cohostRef = doc(db, 'users', cohostId);
                  const cohostSnap = await getDoc(cohostRef);
                  if (cohostSnap.exists()) {
                    return { id: cohostSnap.id, ...cohostSnap.data() };
                  }
                  return null;
                });
                
                const cohostResults = await Promise.all(cohostPromises);
                const validCohosts = cohostResults.filter(cohost => cohost !== null);
                setCohostData(validCohosts);
              } catch (err) {
                console.error('Failed to fetch cohost data:', err);
                setCohostData([]);
              }
            } else {
              setCohostData([]);
            }
          } else {
            console.log('[EventDetailScreen] Event not found with ID:', eventId);
            vibeAlert.error(
              'Event Not Found',
              'This event may have been deleted.',
              [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
          }
        } catch (err) {
          console.error('Failed to fetch event:', err);
          vibeAlert.error('Error', 'Failed to load event details.');
        }
      };

      fetchEvent();
    }, [currentUserId, userData, eventId, studioId, navigation])
  );

  // Interest toggle functionality
  const handleInterestToggle = async (interest) => {
    if (!currentUserId) return;
    

    try {
      const isCurrentlyInterested = userInterests.some(
        userInterest => userInterest.toLowerCase() === interest.toLowerCase()
      );

      if (isCurrentlyInterested) {
        // Remove interest
        const success = await removeUserInterest(currentUserId, interest);
        if (success) {
          setUserInterests(prev => prev.filter(
            userInterest => userInterest.toLowerCase() !== interest.toLowerCase()
          ));
          vibeAlert.success('Interest Removed', `Removed "${interest}" from your interests`);
        } else {
          vibeAlert.error('Error', 'Failed to remove interest. Please try again.');
        }
      } else {
        // Add interest
        const success = await addUserInterest(currentUserId, interest);
        if (success) {
          setUserInterests(prev => [...prev, interest]);
          vibeAlert.success('Interest Added', `Added "${interest}" to your interests! You'll see more events like this.`);
        } else {
          vibeAlert.error('Error', 'Failed to add interest. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error toggling interest:', error);
      vibeAlert.error('Error', 'Failed to update interest. Please try again.');
    }
  };

  const handleSubscribe = async () => {
    if (!event || isLoading || !currentUserId) return;

    // If user is not subscribed, show notification options alert
    if (!isSubscribed) {
      // Validate user can join (reliability checks)
      const canJoin = await validateUserCanJoinEvent(userData, event);
      if (!canJoin) return;
      
      // Show custom VibeAlert with notification options
      vibeAlert.subscribe(
        'Join Event',
        'Choose your notification preferences for this event:',
        () => subscribeWithDefaults(), // onUseDefaults
        () => setShowSubscriptionModal(true), // onCustomize
        () => {} // onCancel (no action needed)
      );
      return;
    }

    // If already subscribed, handle unsubscribe directly
    await performUnsubscribe();
  };

  const subscribeWithDefaults = async () => {
    if (!event || !currentUserId) return;

    // Get user's default notification preferences or use app defaults
    const userNotificationDefaults = userData?.userdata?.settings?.notifications?.attending || {};
    
    const defaultSettings = {
      eventCancellation: true, // Always true - critical info
      hostChanges: userNotificationDefaults.hostChanges ?? true,
      eventReminders: userNotificationDefaults.eventReminders ?? true,
      reminderTiming: userNotificationDefaults.reminderTiming ?? '1hour',
      dayBeforeReminder: userNotificationDefaults.dayBeforeReminder ?? true,
      hostComments: userNotificationDefaults.hostComments ?? true, // Default ON - batched after first
      newComments: userNotificationDefaults.newComments ?? false,
    };

    await handleSubscribeWithSettings(defaultSettings);
  };

  // Separate function to handle the actual subscription with notification settings
  const handleSubscribeWithSettings = async (notificationSettings) => {
    if (!event || !currentUserId) return;

    setIsLoading(true);
    try {
      const eventRef = doc(db, 'studios', studioId, 'events', eventId);
      const userRef = doc(db, 'users', currentUserId);

      // Check if user document exists, create if not
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          subscribedEvents: [],
          userdata: {
            metrics: {
              events: {
                created: 0,
                attended: 0,
                noShows: 0,
                subscribedEvents: [],
              }
            },
            metadata: {
              createdAt: new Date(),
            }
          },
          uid: currentUserId,
        });
      }

      // Subscribe - update event document
      await updateDoc(eventRef, {
        subscribers: arrayUnion(currentUserId),
        subscriberCount: increment(1),
      });

      // Update user metrics
      const updateResult = await updateEventSubscription(currentUserId, eventId);
      if (!updateResult.success) {
        console.warn('[EventDetailScreen] Failed to update user metrics:', updateResult.error);
      }

      // Store user's notification settings for this event
      const userEventRef = doc(db, 'users', currentUserId, 'eventSubscriptions', eventId);
      await setDoc(userEventRef, {
        eventId,
        notificationSettings,
        subscribedAt: new Date(),
        studioId,
      });

      // Notify host that user joined
      const hostId = event.createdBy;
      if (hostId && hostId !== currentUserId) {
        try {
          await notifyHostOfEventJoin(hostId, currentUserId, event);
        } catch (notifyError) {
          console.error('Failed to notify host of event join:', notifyError);
          console.error('Event details:', { eventId: event.id, hostId: event.createdBy });
        }
      }

      // Update local state
      setEvent((prev) => ({
        ...prev,
        subscriberCount: (prev.subscriberCount || 0) + 1,
        subscribers: [...(prev.subscribers || []), currentUserId],
      }));

      setIsSubscribed(true);
      vibeAlert.success('Subscribed!', `You're now registered for "${event.title}"`);

    } catch (err) {
      console.error('Failed to subscribe to event:', err);
      vibeAlert.error('Error', `Failed to subscribe: ${err.message}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Separate function to handle unsubscribe
  const performUnsubscribe = async () => {
    setIsLoading(true);
    try {
      const eventRef = doc(db, 'studios', studioId, 'events', eventId);
      const userRef = doc(db, 'users', currentUserId);

      // Unsubscribe - update event document
      await updateDoc(eventRef, {
        subscribers: arrayRemove(currentUserId),
        subscriberCount: increment(-1),
      });

      // Use the metrics utility function for unsubscription
      await updateEventUnsubscription(currentUserId, eventId);

      // Remove user's notification settings for this event
      const userEventRef = doc(db, 'users', currentUserId, 'eventSubscriptions', eventId);
      await deleteDoc(userEventRef);

      setIsSubscribed(false);
      vibeAlert.warning('Event Left', 'You have been removed from this event. 👋');

      // Notify host that user left the event
      try {
        await notifyHostOfEventLeave({
          eventId: event.id,
          eventTitle: event.title,
          hostId: event.createdBy,
          leftUserId: currentUserId,
          leftUserName: userData?.userdata?.contactinfo?.firstName || userData?.displayName || 'Someone',
        });
      } catch (error) {
        console.error('Failed to notify host of event leave:', error);
      }

      // Update local state
      setEvent((prev) => ({
        ...prev,
        subscriberCount: (prev.subscriberCount || 0) - 1,
        subscribers: (prev.subscribers || []).filter((id) => id !== currentUserId),
      }));

    } catch (err) {
      console.error('Failed to unsubscribe from event:', err);
      vibeAlert.error('Error', `Failed to leave event: ${err.message}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = () => {
    if (!event) return;

    navigation.navigate('Invite', {
      type: 'guests',
      eventId: eventId,
      isEventCreator: permissions.canDelete, // User can delete = user is creator
      selectedUsers: [],
      selectedContacts: [],
      selectedPhoneContacts: [],
      maxLimit: null, // No limit for finding friends
      eventTitle: event.title,
      onSave: async (inviteData) => {
        try {
          // Use the follow system instead of invitations
          const { followUser, batchFollowUsers } = await import('../../services/followService');
          
          // Only process app users - we can't "follow" email/phone contacts
          const usersToFollow = inviteData.users || [];

          if (usersToFollow.length === 0) {
            vibeAlert.info('Info', 'Select app users to connect with them.');
            return;
          }

          // Follow all selected users
          const userIds = usersToFollow.map(user => user.id);
          const result = await batchFollowUsers(currentUserId, userIds, userData);
          
          const successful = result.filter(r => r.success).length;
          const failed = result.filter(r => !r.success).length;
          
          if (successful > 0 && failed === 0) {
            vibeAlert.success('Success', `Now following ${successful} user${successful > 1 ? 's' : ''}! You'll see their events in your feed.`);
          } else if (successful > 0 && failed > 0) {
            vibeAlert.warning('Partial Success', `Following ${successful} users, but ${failed} failed (may already be following them).`);
          } else {
            vibeAlert.error('Error', 'Failed to follow users. You may already be following them.');
          }
          
        } catch (error) {
          console.error('[EventDetail] Error following users:', error);
          vibeAlert.error('Error', 'Failed to connect with users. Please try again.');
        }
      }
    });
  };

  const handleDelete = () => {
    if (!permissions.canDelete) {
      vibeAlert.error('Error', 'You do not have permission to delete this event.');
      return;
    }

    const subscriberCount = event.subscriberCount || 0;
    const warningMessage =
      subscriberCount > 1
        ? `This event has ${subscriberCount} subscribers who will lose access. This action cannot be undone.`
        : 'This action cannot be undone.';

    vibeAlert.error(
      'Delete Event',
      `Are you sure you want to delete "${event.title}"? ${warningMessage}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: performDelete,
        },
      ]
    );
  };

  const performDelete = async () => {
    try {
      // Get all subscribers before deleting the event
      const subscriberIds = event.attendees || [];
      const creatorId = event.createdBy;

      // Delete the event first
      await deleteDoc(doc(db, 'studios', studioId, 'events', eventId));

      // Clean up user metrics for all affected users
      const cleanupPromises = [];

      // Remove event from all subscribers' arrays
      subscriberIds.forEach((userId) => {
        const userRef = doc(db, 'users', userId);
        cleanupPromises.push(
          updateDoc(userRef, {
            subscribedEvents: arrayRemove(eventId),
            'userdata.metrics.events.lastActivity': new Date(),
          }).catch((err) => {
            console.error(`Failed to cleanup subscriber ${userId}:`, err);
          })
        );
      });

      // Decrement eventsCreated for the creator (if they exist in subscribers)
      if (creatorId && subscriberIds.includes(creatorId)) {
        const creatorRef = doc(db, 'users', creatorId);
        cleanupPromises.push(
          updateDoc(creatorRef, {
            'userdata.metrics.events.created': increment(-1),
            'userdata.metrics.events.lastActivity': new Date(),
          }).catch((err) => {
            console.error(`Failed to cleanup creator metrics:`, err);
          })
        );
      }

      // Wait for all cleanup operations to complete
      await Promise.allSettled(cleanupPromises);

      console.log(
        `Event ${eventId} deleted and cleaned up metrics for ${subscriberIds.length} users`
      );

      vibeAlert.success('Event Deleted', 'Event has been deleted successfully.', [
        {
          text: 'OK',
          onPress: () => {
            // Navigate back to the previous screen
            navigation.goBack();
          },
        },
      ]);
    } catch (err) {
      console.error('Failed to delete event:', err);
      vibeAlert.error('Error', 'Failed to delete event. Please try again.');
    }
  };

  if (!event) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.alertButton} />
        <Text style={styles.loadingText}>Loading event...</Text>
      </View>
    );
  }

  // Use utility functions instead of local ones
  const eventStatus = getEventStatus(event);
  const statusColor = getStatusColor(eventStatus);
  const isEventPast = isPastEvent(event);
  const isFullEvent = isEventFull(event);
  const permissions = getUserEventPermissions(currentUserId, userData, event);
  const joinConstraints = validateEventJoinConstraints(event, isSubscribed);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Status Badges Section */}
      <View style={styles.badgesSection}>
        <View style={styles.titleBadges}>
          {/* Event Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{eventStatus}</Text>
          </View>
          {/* Private Badge */}
          {event.isPrivate && (
            <View style={styles.privateTitleBadge}>
              <Text style={styles.privateBadgeText}>🔒 Private Event</Text>
            </View>
          )}
        </View>
      </View>

      {/* Event Info Section */}
      <View style={styles.infoSection}>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📝</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Event Name</Text>
              <Text style={styles.infoValue}>{event.title}</Text>
            </View>
            <View style={styles.interestStars}>
              {eventInterests.length > 0 ? (
                // Show stars for detected interests
                eventInterests.map((interest, index) => {
                  const isInterested = userInterests.some(
                    userInterest => userInterest.toLowerCase() === interest.toLowerCase()
                  );
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleInterestToggle(interest)}
                      style={styles.starButton}
                    >
                      <Text style={styles.starIcon}>
                        {isInterested ? '⭐' : '☆'}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                // Show generic star for custom interest creation
                <TouchableOpacity
                  onPress={() => {
                    // Clean event title for consistent interest matching
                    const cleanTitle = event.title
                      .replace(/[^\w\s]/g, '') // Remove all non-word characters
                      .replace(/\s+/g, ' ')
                      .trim()
                      .split(' ')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                      .join(' ');
                    handleInterestToggle(cleanTitle);
                  }}
                  style={styles.starButton}
                >
                  <Text style={styles.starIcon}>
                    {userInterests.some(
                      userInterest => userInterest.toLowerCase() === event.title.toLowerCase().trim()
                    ) ? '⭐' : '☆'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📅</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Date & Time</Text>
              <Text style={styles.infoValue}>
                {FormatDate(event.eventTimestamp?.toDate() || event.utcDateTime, event.eventTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📍</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{event.location}</Text>
              {event.address && (
                <Text style={styles.infoSubValue}>{event.address}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>👤</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Event Host{cohostData.length > 0 ? 's' : ''}</Text>
              <EventCreatorInfo
                creatorData={creatorData}
                showLabel={false}
                showReliability={false}
                onPress={() => setShowHostProfile(true)}
              />
              {cohostData.length > 0 && (
                <View style={styles.cohostsContainer}>
                  {cohostData.map((cohost) => (
                    <EventCreatorInfo
                      key={cohost.id}
                      creatorData={cohost}
                      showLabel={false}
                      showReliability={false}
                      onPress={() => setShowHostProfile(true)}
                      style={styles.cohostItem}
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>👥</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Attendees</Text>
              <Text style={styles.infoValue}>
                {event.subscribers?.length || 0} attending
                {event.maxGuests && ` / ${event.maxGuests} max`}
              </Text>
              <View style={styles.eventBadges}>
                {event.hasFee && event.entryFee && (
                  <View style={styles.feeBadge}>
                    <Text style={styles.badgeText}>💰 ${event.entryFee || 'Paid'}</Text>
                  </View>
                )}
              </View>
              {isFullEvent && !isSubscribed && (
                <Text style={styles.fullText}>Event is full</Text>
              )}
              {joinConstraints.reason && (
                <Text
                  style={[
                    styles.constraintText,
                    { color: joinConstraints.canJoin ? '#FF9800' : '#F44336' },
                  ]}
                >
                  {joinConstraints.reason}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Host Profile Modal */}
      <HostProfileModal
        visible={showHostProfile}
        onClose={() => setShowHostProfile(false)}
        hostData={creatorData}
        currentUserId={currentUserId}
        eventId={eventId}
        onFollow={(hostId, isFollowing) => {
          console.log(
            `${isFollowing ? 'Following' : 'Unfollowing'} host ${hostId}`
          );
        }}
      />

      {/* Event Details */}
      {event.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Event Details</Text>
          <View style={styles.sectionContent}>
            <Text style={styles.details}>
              {event.description || 'No additional details provided for this event.'}
            </Text>
          </View>
        </View>
      )}

      {/* Additional Information */}
      {(event.whatsProvided || event.whatToBring || event.parkingInstructions || event.dressCode || event.ageRestrictions) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Additional Information</Text>
          <View style={styles.sectionContent}>
            {event.whatsProvided && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>🎁 What's Provided</Text>
                <Text style={styles.detailValue}>{event.whatsProvided}</Text>
              </View>
            )}
            
            {event.whatToBring && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>🎒 What to Bring</Text>
                <Text style={styles.detailValue}>{event.whatToBring}</Text>
              </View>
            )}
            
            {event.parkingInstructions && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>🚗 Parking</Text>
                <Text style={styles.detailValue}>{event.parkingInstructions}</Text>
              </View>
            )}
            
            {event.dressCode && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>👔 Dress Code</Text>
                <Text style={styles.detailValue}>{event.dressCode}</Text>
              </View>
            )}
            
            {event.ageRestrictions && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>🔞 Age Requirements</Text>
                <Text style={styles.detailValue}>{event.ageRestrictions}</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* RSVP Information */}
      {event.rsvpDeadline && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏰ RSVP Information</Text>
          <View style={styles.sectionContent}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>RSVP Deadline</Text>
              <Text style={styles.detailValue}>
                {FormatDate(event.rsvpDeadline, event.eventTimeZone)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Host Contact Information */}
      {event.showHost && creatorData && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📞 Contact Host</Text>
          <View style={styles.sectionContent}>
            {creatorData.userdata?.contactinfo?.email && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={styles.detailValue}>{creatorData.userdata.contactinfo.email}</Text>
              </View>
            )}
            {creatorData.userdata?.contactinfo?.phoneNumber && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={styles.detailValue}>{creatorData.userdata.contactinfo.phoneNumber}</Text>
              </View>
            )}
            {(!creatorData.userdata?.contactinfo?.email && !creatorData.userdata?.contactinfo?.phoneNumber) && (
              <Text style={styles.detailValue}>Contact information not available</Text>
            )}
          </View>
        </View>
      )}

      {/* Comments Section */}
      <View style={styles.section}>
        <View style={styles.sectionContent}>
          <CommentSection eventId={eventId} />
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {!isEventPast && (
          <VibeButton
            label={isSubscribed ? 'LEAVE EVENT' : 'JOIN EVENT'}
            onPress={handleSubscribe}
            style={[
              isLoading && styles.disabledButton,
              !isSubscribed &&
                !joinConstraints.canJoin &&
                styles.disabledButton,
            ]}
          />
        )}

        {/* Attendance Summary for Hosts */}
        {permissions.canManageAttendance && (
          <AttendanceSummary
            eventId={eventId}
            isHost={true}
            onPress={() => navigation.navigate('EventAttendance', { eventId })}
          />
        )}

        {/* Invite button - different functionality for hosts vs attendees */}
        {permissions.canEdit ? (
          <VibeButton 
            label="INVITE GUESTS" 
            onPress={() => navigation.navigate('Invite', { 
              type: 'guests',
              selectedUsers: [],
              selectedContacts: [],
              selectedPhoneContacts: [],
              eventTitle: event.title,
              eventId: event.id, // Add eventId to indicate this is from an existing event
              onSave: (selectedData) => {
                console.log('EventDetail: Users to connect with:', selectedData);
                vibeAlert.success('Success', `Connected with ${selectedData.users.length} people! They can now see your events.`);
                navigation.goBack();
              }
            })}
          />
        ) : (
          <VibeButton label="FIND FRIENDS" onPress={handleInvite} />
        )}

        {permissions.canEdit && (
          <VibeButton
            label="EDIT EVENT"
            onPress={() => {
              navigation.navigate('EditEvent', { eventId });
            }}
          />
        )}

        {permissions.canDelete && (
          <VibeButton label="DELETE EVENT" onPress={handleDelete} />
        )}

        {permissions.canManageAttendance && (
          <VibeButton
            label="MANAGE ATTENDANCE"
            onPress={() => navigation.navigate('EventAttendance', { eventId })}
          />
        )}
      </View>

      {isEventPast && (
        <View style={styles.pastEventContainer}>
          <Text style={styles.pastEventText}>
            {event.status === 'completed'
              ? `Event completed with ${event.attendeeCount || 0} attendees`
              : 'This event has ended'}
          </Text>
        </View>
      )}

      {/* Subscription Notification Settings Modal */}
      <SubscriptionNotificationSettings
        visible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        onSubscribe={handleSubscribeWithSettings}
        eventData={event}
        userDefaults={userData?.userdata?.settings?.notifications}
        currentUserId={currentUserId}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    marginTop: 12,
    fontFamily: theme.fonts.main,
  },

  // Badges Section
  badgesSection: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  titleBadges: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: theme.fonts.main,
  },
  privateTitleBadge: {
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  privateBadgeText: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },

  // Info Section
  infoSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  infoCard: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: theme.sizes.borderRadius,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 16,
    width: 32,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: theme.fonts.main,
  },
  infoValue: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    lineHeight: 22,
    fontFamily: theme.fonts.main,
  },
  
  // Interest Star Styles
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 22, // Match line height of title text
  },
  titleText: {
    flex: 1,
    marginRight: 8,
  },
  interestStars: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  starButton: {
    padding: 4,
  },
  starIcon: {
    fontSize: 28,
    color: '#888888', // Light grey for better visibility
  },
  fullText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
    fontFamily: theme.fonts.main,
  },
  constraintText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    fontFamily: theme.fonts.main,
  },

  // Sections
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    fontFamily: theme.fonts.main,
  },
  sectionContent: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: theme.sizes.borderRadius,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
  },
  details: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: theme.fonts.main,
  },

  // Buttons
  buttonContainer: {
    paddingHorizontal: 20,
  },
  disabledButton: {
    opacity: 0.5,
  },

  // Past Event
  pastEventContainer: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  pastEventText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: theme.fonts.main,
  },

  // New styles for enhanced event details
  infoSubValue: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.main,
    marginTop: 4,
  },
  eventBadges: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  privateBadge: {
    backgroundColor: 'rgba(255, 152, 0, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  feeBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.main,
  },
  detailItem: {
    marginBottom: 16,
  },
  lastDetailItem: {
    marginBottom: 0,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.vibeBlue || '#00C6FF',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: theme.fonts.main,
  },
  detailValue: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    lineHeight: 22,
    fontFamily: theme.fonts.main,
  },
  cohostsContainer: {
    marginTop: 8,
  },
  cohostItem: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border || 'rgba(255, 255, 255, 0.1)',
  },
});
