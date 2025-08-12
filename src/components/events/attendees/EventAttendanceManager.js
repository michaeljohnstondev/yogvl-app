import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../../auth/firebase';
import { completeEvent, getUserReliabilityStatus } from './utils/userMetrics';
import VibeButton from '../../vibeComponents/VibeButton';

const EventAttendanceManager = ({ eventId, navigation }) => {
  const [eventData, setEventData] = useState(null);
  const [subscribers, setSubscribers] = useState([]);
  const [attendees, setAttendees] = useState(new Set());
  const [noShows, setNoShows] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadEventAndSubscribers();
  }, [eventId]);

  const loadEventAndSubscribers = async () => {
    try {
      // Get event data
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (!eventDoc.exists()) {
        Alert.alert('Error', 'Event not found');
        return;
      }

      const event = { id: eventDoc.id, ...eventDoc.data() };
      setEventData(event);

      // Get subscriber details
      if (event.subscribers && event.subscribers.length > 0) {
        const subscriberPromises = event.subscribers.map(async (userId) => {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            return { id: userId, ...userDoc.data() };
          }
          return null;
        });

        const subscriberData = await Promise.all(subscriberPromises);
        setSubscribers(subscriberData.filter((user) => user !== null));
      }

      // If event is already completed, load existing attendance data
      if (event.status === 'completed') {
        if (event.finalAttendees) {
          setAttendees(new Set(event.finalAttendees));
        }
        if (event.noShows) {
          setNoShows(new Set(event.noShows));
        }
      }
    } catch (error) {
      console.error('Error loading event and subscribers:', error);
      Alert.alert('Error', 'Failed to load event data');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAttendance = (userId) => {
    const newAttendees = new Set(attendees);
    const newNoShows = new Set(noShows);

    if (attendees.has(userId)) {
      // Remove from attendees, add to no-shows
      newAttendees.delete(userId);
      newNoShows.add(userId);
    } else if (noShows.has(userId)) {
      // Remove from no-shows, don't add anywhere (neutral)
      newNoShows.delete(userId);
    } else {
      // Add to attendees
      newAttendees.add(userId);
    }

    setAttendees(newAttendees);
    setNoShows(newNoShows);
  };

  const getAttendanceStatus = (userId) => {
    if (attendees.has(userId)) return 'attended';
    if (noShows.has(userId)) return 'no-show';
    return 'unknown';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'attended':
        return '#4CAF50';
      case 'no-show':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'attended':
        return '✅ Attended';
      case 'no-show':
        return '❌ No Show';
      default:
        return '❓ Unknown';
    }
  };

  const handleCompleteEvent = async () => {
    if (attendees.size === 0 && noShows.size === 0) {
      Alert.alert(
        'No Attendance Marked',
        'Please mark attendance for at least one subscriber before completing the event.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Complete Event',
      `This will mark the event as completed with:\n• ${attendees.size} attendees\n• ${noShows.size} no-shows\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Complete', onPress: submitAttendance },
      ]
    );
  };

  const submitAttendance = async () => {
    setIsSubmitting(true);
    try {
      await completeEvent(eventId, Array.from(attendees), Array.from(noShows));

      Alert.alert('Success!', 'Event completed and attendance recorded.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Error completing event:', error);
      Alert.alert('Error', 'Failed to complete event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading attendance...</Text>
      </View>
    );
  }

  if (!eventData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Event not found</Text>
      </View>
    );
  }

  const isCompleted = eventData.status === 'completed';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Event Attendance</Text>
        <Text style={styles.eventTitle}>{eventData.title}</Text>

        {isCompleted && (
          <View style={styles.completedBanner}>
            <Text style={styles.completedText}>✅ Event Completed</Text>
          </View>
        )}

        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>
            Total Subscribers: {subscribers.length}
          </Text>
          <Text style={styles.summaryText}>
            Attendees: {attendees.size} • No Shows: {noShows.size}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Mark Attendance</Text>
        <Text style={styles.instructions}>
          Tap to cycle: Unknown → Attended → No Show → Unknown
        </Text>

        {subscribers.map((user) => {
          const status = getAttendanceStatus(user.id);
          const reliabilityStatus = getUserReliabilityStatus(user);

          return (
            <TouchableOpacity
              key={user.id}
              style={[
                styles.userCard,
                { borderLeftColor: getStatusColor(status) },
                isCompleted && styles.disabledCard,
              ]}
              onPress={() => !isCompleted && toggleAttendance(user.id)}
              disabled={isCompleted}
            >
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {user.displayName || user.email || 'Unknown User'}
                </Text>
                <View style={styles.userMeta}>
                  <Text style={styles.reliabilityBadge}>
                    {reliabilityStatus.badge} {reliabilityStatus.status}
                  </Text>
                  <Text style={styles.noShowCount}>
                    No-shows: {user.noShows || 0}
                  </Text>
                </View>
              </View>
              <View style={styles.statusContainer}>
                <Text
                  style={[styles.statusText, { color: getStatusColor(status) }]}
                >
                  {getStatusText(status)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {!isCompleted && (
          <VibeButton
            label={isSubmitting ? 'COMPLETING...' : 'COMPLETE EVENT'}
            onPress={handleCompleteEvent}
            variant="filled"
            disabled={isSubmitting}
            style={[
              styles.completeButton,
              isSubmitting && styles.disabledButton,
            ]}
          />
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  eventTitle: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.8,
  },
  completedBanner: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  completedText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  summaryContainer: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  summaryText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  instructions: {
    color: '#888',
    fontSize: 14,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  userCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  disabledCard: {
    opacity: 0.7,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  reliabilityBadge: {
    color: '#888',
    fontSize: 12,
  },
  noShowCount: {
    color: '#888',
    fontSize: 12,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  completeButton: {
    marginTop: 30,
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },
  errorText: {
    color: '#F44336',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },
});

export default EventAttendanceManager;
