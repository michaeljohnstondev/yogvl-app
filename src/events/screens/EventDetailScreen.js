import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  TouchableOpacity,
  Linking,
  Modal,
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
import ProfileAvatar from '../../components/ui/ProfileAvatar';
import EventCreatorInfo from '../components/hosts/EventCreatorInfo';
import AttendanceSummary from '../../components/ui/AttendanceSummary';
import { CommentSection } from '../../components/ui/comments';
import { useVibeAlert } from '../../components/ui/VibeAlertContext';
import { useFocusEffect } from '@react-navigation/native';
import SubscriptionNotificationSettings from '../components/subscriptionSettings/SubscriptionNotificationSettings';
import { FormatDate } from '../../lib/formatDate';
import { useAuth } from '../../auth/AuthContext';
import { StudioStatsService } from '../../services/studioStatsService';
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
import { reportEvent } from '../../services/reportingService';
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
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Handler for showing host profile
  const handleShowHostProfile = (hostData) => {
    navigation.navigate('HostProfile', {
      hostData,
      currentUserId,
      eventId
    });
  };
  const [userInterests, setUserInterests] = useState([]);
  const [eventInterests, setEventInterests] = useState([]);
  const [friendAttendees, setFriendAttendees] = useState([]);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showPrivacyFlash, setShowPrivacyFlash] = useState(false);

  const vibeAlert = useVibeAlert();

  // Privacy flash functionality
  const handlePrivacyIconPress = () => {
    setShowPrivacyFlash(true);
    // Auto-hide after 1.5 seconds
    setTimeout(() => {
      setShowPrivacyFlash(false);
    }, 1500);
  };

  // Report event functionality
  const handleReportEvent = () => {
    if (!event || !event.id || !currentUserId || !event.title || !event.createdBy) {
      vibeAlert.error('Error', 'Event information is not available for reporting.');
      return;
    }

    // Show report categories directly
    vibeAlert.redmenu(
      'Report Event',
      'Select the reason for reporting this event:',
      [
        { 
          text: 'Inappropriate Content',
          onPress: () => submitReport('inappropriate_content')
        },
        { 
          text: 'Spam/Fake Event',
          onPress: () => submitReport('spam')
        },
        { 
          text: 'Harmful/Dangerous',
          onPress: () => submitReport('harmful')
        },
        { 
          text: 'Other Violation',
          onPress: () => submitReport('other')
        },
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => {}
        }
      ]
    );
  };


  const submitReport = async (reason) => {
    try {
      // Use the studio ID from route params or fall back to user's default studio
      const eventStudioId = studioId || userData?.userdata?.studios?.default?.studioId;
      
      if (!eventStudioId) {
        vibeAlert.error('Error', 'Unable to determine event studio for reporting');
        return;
      }
      
      // Use the proper reporting service
      const result = await reportEvent(
        currentUserId, 
        eventId, 
        eventStudioId, 
        reason
      );
      
      if (result.success) {
        vibeAlert.success('Report Submitted', result.message);
      } else {
        vibeAlert.error('Error', 'Failed to submit report. Please try again.');
      }
    } catch (error) {
      console.error('[EventDetailScreen] Error reporting event:', error);
      vibeAlert.error('Error', error.message || 'Failed to submit report. Please try again.');
    }
  };

  // Function to extract emoji from title
  const extractEmoji = (title) => {
    if (!title) return { emoji: null, cleanTitle: title };
    
    // Regex to match emojis (including compound emojis)
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]/u;
    const match = title.match(emojiRegex);
    
    if (match) {
      const emoji = match[0];
      const cleanTitle = title.replace(emojiRegex, '').trim();
      return { emoji, cleanTitle };
    }
    
    return { emoji: null, cleanTitle: title };
  };

  // Function to open maps with location
  const openMaps = () => {
    if (!event.address) return;
    
    const query = `${event.location}, ${event.address}`.trim();
    const encodedQuery = encodeURIComponent(query);
    const mapsUrl = `https://maps.google.com/maps?q=${encodedQuery}`;
    
    Linking.openURL(mapsUrl).catch(err => {
      vibeAlert.error('Error', 'Could not open maps');
    });
  };

  useFocusEffect(
    useCallback(() => {
      const fetchEvent = async () => {
        if (!studioId) {
          vibeAlert.error('Error', 'Unable to load event: studio information missing.');
          return;
        }
        
        try {
          const ref = doc(db, 'studios', studioId, 'events', eventId);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const eventData = { id: snap.id, ...snap.data() };
            setEvent(eventData);

            // Check if user is subscribed
            const subscribers = eventData.subscribers || [];
            setIsSubscribed(subscribers.includes(currentUserId));

            // Load visible attendees - depends on if user is host/cohost or not
            if (subscribers.length > 0 && currentUserId) {
              try {
                // Check if user is host or cohost
                const isHostOrCohost = eventData.createdBy === currentUserId || 
                                     (eventData.cohosts?.includes(currentUserId) || false);
                const attendeesList = [];
                
                if (isHostOrCohost) {
                  // Host/Cohost: Load ALL attendees
                  for (const subscriberId of subscribers) {
                    if (subscriberId === currentUserId) continue; // Skip self
                    
                    const userDoc = await getDoc(doc(db, 'users', subscriberId));
                    if (userDoc.exists()) {
                      const userData = userDoc.data();
                      const displayName = userData.userdata?.contactInfo?.displayName || 
                                         userData.userdata?.contactInfo?.firstName || 'Attendee';
                      attendeesList.push({
                        id: subscriberId,
                        displayName,
                        userData
                      });
                    }
                  }
                } else {
                  // Non-host/cohost: Only load friends (mutual follows)
                  for (const subscriberId of subscribers) {
                    if (subscriberId === currentUserId) continue; // Skip self
                    
                    // Check if they're a friend (mutual follow)
                    const followingDoc = await getDoc(doc(db, 'users', currentUserId, 'following', subscriberId));
                    const followerDoc = await getDoc(doc(db, 'users', currentUserId, 'followers', subscriberId));
                    
                    if (followingDoc.exists() && followerDoc.exists()) {
                      // They're a friend, get their full user data
                      const userDoc = await getDoc(doc(db, 'users', subscriberId));
                      if (userDoc.exists()) {
                        const userData = userDoc.data();
                        const displayName = userData.userdata?.contactInfo?.displayName || 
                                           userData.userdata?.contactInfo?.firstName || 'Friend';
                        attendeesList.push({
                          id: subscriberId,
                          displayName,
                          userData
                        });
                      }
                    }
                  }
                }
                
                setFriendAttendees(attendeesList);
              } catch (error) {
                setFriendAttendees([]);
              }
            } else {
              setFriendAttendees([]);
            }

            // Load user interests and extract interests from event title
            try {
              const interests = await getUserInterests(currentUserId);
              setUserInterests(interests);
              
              const titleInterests = extractInterestsFromEventTitle(eventData.title);
              setEventInterests(titleInterests);
            } catch (err) {
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
                // Creator data fetch failed
              }
            }

            // Fetch cohost data (accepted cohosts)
            const cohostIds = eventData.cohosts || [];
            if (cohostIds.length > 0) {
              try {
                const cohostPromises = cohostIds.map(async (cohostId) => {
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
                setCohostData([]);
              }
            } else {
              setCohostData([]);
            }
          } else {
            vibeAlert.error(
              'Event Not Found',
              'This event may have been deleted.',
              [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
          }
        } catch (err) {
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

      // Check if user is already subscribed to prevent duplicates
      const currentSubscribers = event.subscribers || [];
      if (currentSubscribers.includes(currentUserId)) {
        return; // Already subscribed, do nothing
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
          // Failed to notify host, but subscription was successful
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
          leftUserName: userData?.userdata?.contactInfo?.firstName || userData?.userdata?.contactInfo?.displayName || 'Someone',
        });
      } catch (error) {
        // Failed to notify host, but unsubscription was successful
      }

      // Update local state
      setEvent((prev) => ({
        ...prev,
        subscriberCount: (prev.subscriberCount || 0) - 1,
        subscribers: (prev.subscribers || []).filter((id) => id !== currentUserId),
      }));

    } catch (err) {
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
      source: 'event_detail',
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
      // Get all subscribers and creator before deleting the event
      const subscriberIds = event.subscribers || [];
      const creatorId = event.createdBy;

      // Delete the event first
      await deleteDoc(doc(db, 'studios', studioId, 'events', eventId));

      // Update studio event count
      try {
        await StudioStatsService.decrementEventCount(studioId);
      } catch (error) {
        console.warn('Failed to decrement studio event count:', error);
        // Don't fail the deletion if stats update fails
      }

      const cleanupPromises = [];

      // Remove event from all subscribers' arrays
      subscriberIds.forEach((userId) => {
        const userRef = doc(db, 'users', userId);
        cleanupPromises.push(
          updateDoc(userRef, {
            subscribedEvents: arrayRemove(eventId),
            'userdata.metrics.events.subscribedEvents': arrayRemove(eventId),
            'userdata.metrics.events.attendedEvents': arrayRemove(eventId), // Also remove from attended if they had it
            'userdata.metrics.events.lastActivity': new Date(),
          }).catch((err) => {
            console.warn(`Failed to cleanup subscriber metrics for ${userId}:`, err);
          })
        );
      });

      // Use the proper deletion metrics function for the creator/host
      if (creatorId) {
        const { updateEventDeletionMetrics } = await import('../lib/userMetrics');
        cleanupPromises.push(
          updateEventDeletionMetrics(creatorId, eventId).catch((err) => {
            console.warn(`Failed to cleanup creator metrics for ${creatorId}:`, err);
          })
        );
      }

      // Delete attendance records
      const { AttendanceService } = await import('../../services/AttendanceService');
      cleanupPromises.push(
        AttendanceService.deleteEventAttendance(studioId, eventId).catch((err) => {
          console.warn(`Failed to cleanup attendance records for event ${eventId}:`, err);
        })
      );

      await Promise.allSettled(cleanupPromises);

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
      console.error('Error deleting event:', err);
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

  // Use utility functions instead of local ones - with null checks
  const eventStatus = event ? getEventStatus(event) : 'Loading';
  const statusColor = event ? getStatusColor(eventStatus) : theme.colors.gray;
  const isEventPast = event ? isPastEvent(event) : false;
  const isFullEvent = event ? isEventFull(event) : false;
  const permissions = event ? getUserEventPermissions(currentUserId, userData, event) : { canDelete: false, canEdit: false, canManageAttendance: false };
  const joinConstraints = event ? validateEventJoinConstraints(event, isSubscribed) : { canJoin: false, reason: 'Loading' };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Status Badges Section with Report Button */}
      <View style={styles.badgesSection}>
        <View style={styles.badgeRow}>
          <View style={styles.titleBadges}>
          {/* Event Status Badge - Always show when event is loaded */}
          {event && (
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{eventStatus}</Text>
            </View>
          )}
          {/* Attendance Type Badge - Only show when tracking is enabled and type is defined */}
          {event && event.trackAttendance && event.attendanceType && (
            <View style={[
              styles.attendanceTypeBadge,
              {
                backgroundColor: event.attendanceType === 'strict' 
                  ? 'rgba(253, 126, 20, 0.1)' // vibeBackgroundOrange
                  : event.attendanceType === 'casual'
                  ? 'rgba(0, 198, 255, 0.1)' // vibeBackgroundBlue
                  : 'rgba(0, 255, 65, 0.1)', // vibeBackgroundGreen for open
                borderColor: event.attendanceType === 'strict'
                  ? '#fd7e14' // vibeOrange
                  : event.attendanceType === 'casual'
                  ? '#00C6FF' // vibeBlue
                  : '#00FF41' // vibeGreen for open
              }
            ]}>
              <Text style={styles.attendanceTypeBadgeText}>
                {event.attendanceType === 'strict' ? '🎯 Strict Event'
                  : event.attendanceType === 'casual' ? '🌊 Casual Event'
                  : '🎉 Open Event'}
              </Text>
            </View>
          )}
          </View>
          
          {/* Report Button - Only show when event is fully loaded */}
          {event && event.id && event.title && event.createdBy && (
            <TouchableOpacity 
              style={styles.reportButton}
              onPress={handleReportEvent}
              activeOpacity={0.7}
            >
              <Text style={styles.reportIcon}>⚠️</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Event Info Section - Only show when event is loaded */}
      {event && (
        <View style={styles.infoSection}>
        <View style={styles.infoCard}>
          <View style={styles.eventNameRow}>
            <TouchableOpacity onPress={handlePrivacyIconPress} style={styles.privacyIconContainer}>
              <Text style={styles.privacyIcon}>
                {event.isPrivate ? '🔒' : '🌍'}
              </Text>
            </TouchableOpacity>
            <View style={styles.eventNameContent}>
              <Text style={styles.infoLabel}>Event Name</Text>
              <Text style={styles.infoValue}>
                {showPrivacyFlash ? (
                  event.isPrivate ? 'Private Event' : 'Public Event'
                ) : (
                  (() => {
                    const { cleanTitle } = extractEmoji(event.title);
                    return cleanTitle;
                  })()
                )}
              </Text>
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

        <TouchableOpacity 
          style={styles.infoCard} 
          onPress={event.address ? openMaps : undefined}
          disabled={!event.address}
        >
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📍</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue}>{event.location}</Text>
            </View>
            {event.address && (
              <Text style={styles.tapToOpenMaps}>🗺️</Text>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>👤</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Event Host{cohostData.length > 0 ? 's' : ''}</Text>
              <EventCreatorInfo
                creatorData={creatorData}
                showLabel={false}
                showReliability={false}
                onPress={() => handleShowHostProfile(creatorData)}
              />
              {cohostData.length > 0 && (
                <View style={styles.cohostsContainer}>
                  {cohostData.map((cohost) => (
                    <EventCreatorInfo
                      key={cohost.id}
                      creatorData={cohost}
                      showLabel={false}
                      showReliability={false}
                      onPress={() => handleShowHostProfile(cohost)}
                      style={styles.cohostItem}
                    />
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <TouchableOpacity 
            style={styles.infoRow}
            onPress={() => {
              const isHostOrCohost = event?.createdBy === currentUserId || event?.cohosts?.includes(currentUserId);
              const canViewAttendees = (isHostOrCohost && event?.subscribers?.length > 0) || friendAttendees.length > 0;
              if (canViewAttendees) setShowFriendsModal(true);
            }}
            disabled={(() => {
              const isHostOrCohost = event?.createdBy === currentUserId || event?.cohosts?.includes(currentUserId);
              return !(isHostOrCohost && event?.subscribers?.length > 0) && friendAttendees.length === 0;
            })()}
            activeOpacity={(() => {
              const isHostOrCohost = event?.createdBy === currentUserId || event?.cohosts?.includes(currentUserId);
              return ((isHostOrCohost && event?.subscribers?.length > 0) || friendAttendees.length > 0) ? 0.7 : 1;
            })()}
          >
            <Text style={styles.infoIcon}>👥</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Attendees</Text>
              <Text style={styles.infoValue}>
                {event.subscribers?.length || 0} attendees
                {event.maxGuests && ` / ${event.maxGuests} max`}
                {(() => {
                  const isHostOrCohost = event?.createdBy === currentUserId || event?.cohosts?.includes(currentUserId);
                  return isHostOrCohost && event.subscribers?.length > 0 ? ' (tap to view all)' : '';
                })()}
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
          </TouchableOpacity>
        </View>
      </View>
      )}

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
            {creatorData.userdata?.contactInfo?.email && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={styles.detailValue}>{creatorData.userdata.contactInfo.email}</Text>
              </View>
            )}
            {creatorData.userdata?.contactInfo?.phoneNumber && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={styles.detailValue}>{creatorData.userdata.contactInfo.phoneNumber}</Text>
              </View>
            )}
            {(!creatorData.userdata?.contactInfo?.email && !creatorData.userdata?.contactInfo?.phoneNumber) && (
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
        {/* For non-hosts: show INVITE GUESTS first, then JOIN/LEAVE EVENT */}
        {!isEventPast && !permissions.canEdit && (
          <VibeButton label="INVITE GUESTS" onPress={handleInvite} />
        )}

        {!isEventPast && !permissions.canEdit && (
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
            studioId={studioId}
            isHost={true}
            onPress={() => navigation.navigate('EventAttendance', { eventId, studioId })}
          />
        )}

        {/* Hide invite/edit/delete buttons for past events */}
        {!isEventPast && (
          <>
            {/* Invite button for hosts */}
            {permissions.canEdit && (
              <VibeButton 
                label="INVITE GUESTS" 
                onPress={() => navigation.navigate('Invite', { 
                  type: 'guests',
                  selectedUsers: [],
                  selectedContacts: [],
                  selectedPhoneContacts: [],
                  eventTitle: event.title,
                  eventId: event.id, // Add eventId to indicate this is from an existing event
                  source: 'host_invite',
                  onSave: (selectedData) => {
                    vibeAlert.success('Success', `Connected with ${selectedData.users.length} people! They can now see your events.`);
                    navigation.goBack();
                  }
                })}
                style={styles.tightButton}
              />
            )}

            {permissions.canEdit && (
              <VibeButton
                label="EDIT EVENT"
                onPress={() => {
                  navigation.navigate('EditEvent', { eventId, eventData: event, studioId });
                }}
                style={styles.tightButton}
              />
            )}

            {permissions.canDelete && (
              <VibeButton label="DELETE EVENT" onPress={handleDelete} style={styles.tightButton} />
            )}
          </>
        )}

        {/* Save as Template button for past events (hosts only) */}
        {isEventPast && permissions.canEdit && (
          <VibeButton
            label="SAVE AS TEMPLATE"
            onPress={() => {
              vibeAlert.confirm(
                'Save as Template',
                `Save "${event.title}" as a reusable template for future events?`,
                () => {
                  // Navigate to CreateEvent with this event as template
                  navigation.navigate('CreateEvent', {
                    templateFromEvent: {
                      title: `${event.title} (Copy)`,
                      location: event.location,
                      address: event.address,
                      details: event.description,
                      maxGuests: event.maxGuests?.toString() || '',
                      hasFee: event.hasFee || false,
                      entryFee: event.entryFee?.toString() || '',
                      isPrivate: event.isPrivate || false,
                      showHostContact: event.showHostContact,
                      trackAttendance: event.trackAttendance || false,
                      attendanceType: event.attendanceType || 'casual',
                      whatsProvided: event.whatsProvided || '',
                      whatToBring: event.whatToBring || '',
                      parkingInstructions: event.parkingInstructions || '',
                      dressCode: event.dressCode || '',
                      ageRestrictions: event.ageRestrictions || '',
                    }
                  });
                  vibeAlert.turquoise('Template Created', 'Event loaded as template in Create Event!');
                },
                () => {}
              );
            }}
            variant="outline"
          />
        )}

        {/* Only show attendance management for upcoming events */}
        {permissions.canManageAttendance && !isEventPast && (
          <VibeButton
            label="MANAGE ATTENDANCE"
            onPress={() => navigation.navigate('EventAttendance', { eventId })}
          />
        )}
      </View>

      {isEventPast && (
        <View style={styles.pastEventContainer}>
          {/* Wrap-up buttons for past events */}
            {/* Always show wrap-up buttons for past events */}
            {permissions.canEdit ? (
              // Host wrap-up button
              <VibeButton
                label={event.status === 'completed' ? 'VIEW WRAP-UP' : 'EVENT WRAP-UP'}
                onPress={() => navigation.navigate('HostEventWrapUp', { eventId, studioId })}
                variant="outline"
              />
            ) : (
              // Guest wrap-up button
              <VibeButton
                label="EVENT WRAP-UP"
                onPress={() => navigation.navigate('GuestEventWrapUp', { eventId, studioId })}
                variant="outline"
              />
            )}
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

      {/* Friends Modal */}
      <Modal
        visible={showFriendsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFriendsModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFriendsModal(false)}
        >
          <View style={styles.friendsModal}>
            <Text style={styles.friendsModalTitle}>
              {(event?.createdBy === currentUserId || event?.cohosts?.includes(currentUserId)) 
                ? 'All Attendees' 
                : 'Friends Attending'}
            </Text>
            {friendAttendees.map((friend, index) => (
              <View key={friend.id || index} style={styles.friendsModalItem}>
                <ProfileAvatar 
                  userData={friend.userData} 
                  size={32}
                  showBorder={true}
                />
                <Text style={styles.friendName}>
                  {friend.displayName}
                </Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
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
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    width: '100%',
    position: 'relative',
  },
  reportButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportIcon: {
    fontSize: 18,
  },
  eventNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  privacyIconContainer: {
    position: 'relative',
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40,
  },
  privacyIcon: {
    fontSize: 24,
    textAlign: 'center',
  },
  eventNameContent: {
    flex: 1,
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
  publicTitleBadge: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  publicBadgeText: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },
  attendanceTypeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 8,
  },
  attendanceTypeBadgeText: {
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
    width: 40,
    textAlign: 'center',
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
  friendsList: {
    marginTop: 4,
    marginBottom: 4,
  },
  friendsHint: {
    fontSize: 12,
    color: theme.colors.vibeBlue,
    fontFamily: theme.fonts.main,
    fontWeight: '400',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendsModal: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: 20,
    margin: 20,
    minWidth: 250,
    maxWidth: 300,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  friendsModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: 16,
    textAlign: 'center',
  },
  friendsModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  friendName: {
    fontSize: 16,
    color: theme.colors.white,
    flex: 1,
    fontFamily: theme.fonts.main,
  },
  tapToOpenMaps: {
    fontSize: 20,
    marginLeft: 8,
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
    fontSize: 20,
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
  tightButton: {
    marginVertical: 2,
  },

  // Past Event
  pastEventContainer: {
    marginTop: 24,
    marginBottom: 40,
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
