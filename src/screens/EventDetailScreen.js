import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { db } from '../firebase';
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
import VibeButton from '../components/VibeButton';
import EventCreatorInfo from '../components/EventCreatorInfo';
import HostProfileModal from '../components/HostProfileModal';
import { useFocusEffect } from '@react-navigation/native';
import { FormatDate } from '../utils/FormatDate';
import { useAuth } from '../AuthContext';
import { updateEventSubscription } from '../utils/userMetrics';
import {
  getEventStatus,
  getStatusColor,
  isPastEvent,
  isEventFull,
  validateUserCanJoinEvent,
  getUserEventPermissions,
  validateEventJoinConstraints,
} from '../utils/eventUtils';

export default function EventDetailScreen({ route, navigation }) {
  const { eventId } = route.params;
  const [event, setEvent] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [creatorData, setCreatorData] = useState(null);
  const [showHostProfile, setShowHostProfile] = useState(false);

  // Get current user from Auth Context
  const { currentUserId, userData } = useAuth();

  useFocusEffect(
    useCallback(() => {
      const fetchEvent = async () => {
        try {
          const ref = doc(db, 'events', eventId);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const eventData = { id: snap.id, ...snap.data() };
            setEvent(eventData);

            // Check if user is subscribed
            const subscribers = eventData.subscribers || [];
            setIsSubscribed(subscribers.includes(currentUserId));

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
          } else {
            Alert.alert(
              'Event Not Found',
              'This event may have been deleted.',
              [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
          }
        } catch (err) {
          console.error('Failed to fetch event:', err);
          Alert.alert('Error', 'Failed to load event details.');
        }
      };

      fetchEvent();
    }, [currentUserId, userData, eventId, navigation])
  );

  const handleSubscribe = async () => {
    if (!event || isLoading || !currentUserId) return;

    // Validate user can join (reliability checks)
    if (!isSubscribed) {
      const canJoin = await validateUserCanJoinEvent(userData, event);
      if (!canJoin) return;
    }

    setIsLoading(true);
    try {
      const eventRef = doc(db, 'events', eventId);
      const userRef = doc(db, 'users', currentUserId);

      // Check if user document exists, create if not
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          subscribedEvents: [],
          eventsCreated: 0,
          eventsAttended: 0,
          noShows: 0,
          createdAt: new Date(),
          uid: currentUserId,
        });
      }

      if (isSubscribed) {
        // Unsubscribe - update BOTH documents
        await updateDoc(eventRef, {
          subscribers: arrayRemove(currentUserId),
          subscriberCount: increment(-1),
        });

        await updateDoc(userRef, {
          subscribedEvents: arrayRemove(eventId),
          lastActivity: new Date(),
        });

        setIsSubscribed(false);
        Alert.alert('Unsubscribed', 'You have been removed from this event.');
      } else {
        // Subscribe - update BOTH documents and metrics
        await updateDoc(eventRef, {
          subscribers: arrayUnion(currentUserId),
          subscriberCount: increment(1),
        });

        // Use the metrics utility function for subscription
        await updateEventSubscription(currentUserId, eventId);

        setIsSubscribed(true);
        Alert.alert('Subscribed!', 'You have been added to this event.');
      }

      // Update local state
      setEvent((prev) => ({
        ...prev,
        subscriberCount: (prev.subscriberCount || 0) + (isSubscribed ? -1 : 1),
        subscribers: isSubscribed
          ? (prev.subscribers || []).filter((id) => id !== currentUserId)
          : [...(prev.subscribers || []), currentUserId],
      }));
    } catch (err) {
      console.error('Failed to update subscription:', err);
      Alert.alert('Error', 'Failed to update subscription. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!event) return;

    // Replace these URLs with your actual app store links when published
    const appStoreUrl = 'https://apps.apple.com/app/your-app-name/id123456789';
    const playStoreUrl =
      'https://play.google.com/store/apps/details?id=com.yourapp.name';

    const inviteMessage = `Hey! Thought you might be interested in this event: "${event.title}"

📅 When: ${FormatDate(event.utcDateTime, event.eventTimeZone)}
📍 Where: ${event.location}

📱 Download our app to check it out:
iPhone: ${appStoreUrl}
Android: ${playStoreUrl}

Let me know if you're going! 🎉`;

    try {
      const smsUrl =
        Platform.OS === 'ios'
          ? `sms:&body=${encodeURIComponent(inviteMessage)}`
          : `sms:?body=${encodeURIComponent(inviteMessage)}`;

      await Linking.openURL(smsUrl);
    } catch (error) {
      console.error('Failed to open SMS:', error);
      Alert.alert('Error', 'Unable to open SMS app. Please try again.');
    }
  };

  const handleDelete = () => {
    if (!permissions.canDelete) {
      Alert.alert('Error', 'You do not have permission to delete this event.');
      return;
    }

    const subscriberCount = event.subscriberCount || 0;
    const warningMessage =
      subscriberCount > 1
        ? `This event has ${subscriberCount} subscribers who will lose access. This action cannot be undone.`
        : 'This action cannot be undone.';

    Alert.alert(
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
      const subscriberIds = event.subscribers || [];
      const creatorId = event.createdBy;

      // Delete the event first
      await deleteDoc(doc(db, 'events', eventId));

      // Clean up user metrics for all affected users
      const cleanupPromises = [];

      // Remove event from all subscribers' arrays
      subscriberIds.forEach((userId) => {
        const userRef = doc(db, 'users', userId);
        cleanupPromises.push(
          updateDoc(userRef, {
            subscribedEvents: arrayRemove(eventId),
            lastActivity: new Date(),
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
            eventsCreated: increment(-1),
            lastActivity: new Date(),
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

      Alert.alert('Deleted', 'Event has been deleted successfully.', [
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
      Alert.alert('Error', 'Failed to delete event. Please try again.');
    }
  };

  if (!event) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{event.title}</Text>

      {/* Event Status Badge */}
      <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
        <Text style={styles.statusText}>{eventStatus}</Text>
      </View>

      <View style={styles.metaContainer}>
        <Text style={styles.meta}>
          📅 {FormatDate(event.utcDateTime, event.eventTimeZone)}
        </Text>
        <Text style={styles.meta}>📍 {event.location}</Text>

        <View style={styles.guestInfo}>
          <Text style={styles.meta}>
            👥 {event.subscriberCount || 0} attending
            {event.maxGuests && ` (max ${event.maxGuests})`}
          </Text>
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

        {/* Creator Info with Reliability */}
        <EventCreatorInfo
          creatorData={creatorData}
          showLabel={true}
          showReliability={true}
          onPress={() => setShowHostProfile(true)}
        />
      </View>

      {/* Host Profile Modal */}
      <HostProfileModal
        visible={showHostProfile}
        onClose={() => setShowHostProfile(false)}
        hostData={creatorData}
        currentUserId={currentUserId}
        onFollow={(hostId, isFollowing) => {
          // Future: implement follow functionality
          console.log(
            `${isFollowing ? 'Following' : 'Unfollowing'} host ${hostId}`
          );
        }}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <Text style={styles.details}>
          {event.desc || 'No details provided.'}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        {!isEventPast && (
          <VibeButton
            label={isSubscribed ? 'LEAVE EVENT' : 'JOIN EVENT'}
            onPress={handleSubscribe}
            variant={isSubscribed ? 'outline' : 'filled'}
            disabled={isLoading || (!isSubscribed && !joinConstraints.canJoin)}
            style={[isSubscribed && styles.unsubscribeButton]}
          />
        )}

        <VibeButton
          label="INVITE FRIENDS"
          onPress={handleInvite}
          variant="outline"
        />

        {/* Edit button for event creators/admins */}
        {permissions.canEdit && (
          <VibeButton
            label="EDIT EVENT"
            onPress={() => {
              console.log('edit button pressed');
              navigation.navigate('EditEvent', { eventId });
            }}
            variant="outline"
          />
        )}

        {/* Delete button for event creators/admins */}
        {permissions.canDelete && (
          <VibeButton
            label="DELETE EVENT"
            onPress={handleDelete}
            variant="outline"
            style={styles.deleteButton}
          />
        )}

        {/* Attendance management for past events */}
        {permissions.canManageAttendance && (
          <VibeButton
            label="MANAGE ATTENDANCE"
            onPress={() => navigation.navigate('EventAttendance', { eventId })}
            variant="outline"
            style={styles.attendanceButton}
          />
        )}
      </View>

      {isEventPast && (
        <Text style={styles.pastEventText}>
          {event.status === 'completed'
            ? `Event completed with ${event.attendeeCount || 0} attendees`
            : 'This event has ended'}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusBadge: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  metaContainer: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  meta: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 8,
    lineHeight: 22,
  },
  guestInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  fullText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  constraintText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 12,
    fontWeight: '600',
  },
  details: {
    color: '#ddd',
    fontSize: 16,
    lineHeight: 24,
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
  },
  unsubscribeButton: {
    borderColor: '#ff6b6b',
  },
  attendanceButton: {
    borderColor: '#4CAF50',
  },
  deleteButton: {
    borderColor: '#F44336',
  },
  pastEventText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 16,
  },
});
