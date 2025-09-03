// FILE: screens/HostEventWrapUpScreen.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';
import { useAuth } from '../auth/AuthContext';
import { useVibeAlert } from '../components/ui/VibeAlertContext';
import VibeScreen from '../components/ui/VibeScreen';
import VibeButton from '../components/ui/VibeButton';
import VibeSegmentedControl from '../components/ui/VibeSegmentedControl';
import { completeEvent, getUserReliabilityStatus, updateHostAverageAttendees } from '../events/lib/userMetrics';
import theme from '../theme/themes';

const HostEventWrapUpScreen = ({ navigation, route }) => {
  const { eventId, studioId: routeStudioId } = route.params;
  const { currentUserId, userData } = useAuth();
  
  // Use studioId from route, or fallback to user's default studio
  const studioId = routeStudioId || userData?.userdata?.studios?.default?.studioId;
  const vibeAlert = useVibeAlert();

  const [eventData, setEventData] = useState(null);
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAttendanceMessage, setShowAttendanceMessage] = useState(true);

  // State management for tracked attendance
  const [attendees, setAttendees] = useState(new Set()); // For casual/strict events
  const [noShows, setNoShows] = useState(new Set()); // For strict events only

  useEffect(() => {
    loadEventData();
  }, [eventId]);

  const loadEventData = async () => {
    try {
      // Get event data from studio-specific path
      const eventDoc = await getDoc(doc(db, 'studios', studioId, 'events', eventId));
      if (!eventDoc.exists()) {
        vibeAlert.error('Error', 'Event not found');
        return;
      }

      const event = { id: eventDoc.id, ...eventDoc.data() };
      setEventData(event);

      // Load subscribers for attendance tracking
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

      // Check if event is already completed
      if (event.status === 'completed') {
        if (event.finalAttendees) {
          setAttendees(new Set(event.finalAttendees));
        }
        if (event.noShows) {
          setNoShows(new Set(event.noShows));
        }
      }
    } catch (error) {
      console.error('Error loading event data:', error);
      vibeAlert.error('Error', 'Failed to load event data');
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = (userId) => {
    const newAttendees = new Set(attendees);
    const newNoShows = new Set(noShows);

    if (attendees.has(userId)) {
      // Remove from attendees
      newAttendees.delete(userId);
      // For strict events, add to no-shows
      if (eventData.attendanceType === 'strict') {
        newNoShows.add(userId);
      }
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
        return theme.colors.vibeGreen;
      case 'no-show':
        return theme.colors.vibeRed;
      default:
        return theme.colors.gray;
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

  const getAttendanceTypeInfo = () => {
    switch (eventData?.attendanceType) {
      case 'casual':
        return {
          title: '🌊 Casual Event Recap',
          description: 'Mark who attended - no penalties for missing!',
          icon: '🌊',
          color: theme.colors.vibeBlue
        };
      case 'strict':
        return {
          title: '🎯 Strict Event Recap',
          description: 'Track attendance - this affects reliability scores',
          icon: '🎯',
          color: theme.colors.vibeOrange
        };
      default:
        return {
          title: '🌊 Casual Event Recap',
          description: 'Mark who attended - no penalties for missing!',
          icon: '🌊',
          color: theme.colors.vibeBlue
        };
    }
  };

  const renderRightActions = () => (
    <View style={styles.swipeArea} />
  );
  
  const renderLeftActions = () => (
    <View style={styles.swipeArea} />
  );

  const deleteEvent = async () => {
    setSubmitting(true);
    try {
      // Delete the event from Firestore
      await deleteDoc(doc(db, 'studios', studioId, 'events', eventId));
      
      vibeAlert.success('Event Deleted', 'The cancelled event has been removed.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Error deleting event:', error);
      vibeAlert.error('Error', 'Failed to delete event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteEvent = async () => {
    // Check if only the host is subscribed (event was cancelled)
    if (eventData.subscribers?.length === 1 && eventData.subscribers[0] === currentUserId) {
      vibeAlert.confirm(
        'Event Cancelled?',
        'Only you were subscribed to this event. Was this event cancelled?\n\nIf yes, the event will be deleted.',
        async () => {
          // Delete the event
          await deleteEvent();
        },
        () => {
          // Proceed with normal wrap-up
          handleCompleteTrackedEvent();
        }
      );
      return;
    }

    handleCompleteTrackedEvent();
  };


  const handleCompleteTrackedEvent = async () => {
    if (attendees.size === 0 && (eventData.attendanceType === 'casual' || noShows.size === 0)) {
      vibeAlert.warning(
        'No Attendance Marked',
        'Please mark attendance for at least one subscriber before completing the event.'
      );
      return;
    }

    const confirmMessage = eventData.attendanceType === 'strict' 
      ? `This will mark the event as completed with:\n• ${attendees.size} attendees\n• ${noShows.size} no-shows\n\nNo-shows will affect reliability scores.\n\nThis action cannot be undone.`
      : `This will mark the event as completed with:\n• ${attendees.size} attendees\n\nNo penalties for missing this casual event.\n\nThis action cannot be undone.`;

    vibeAlert.confirm(
      'Complete Event',
      confirmMessage,
      submitTrackedEvent,
      () => {}
    );
  };

  const submitTrackedEvent = async () => {
    setSubmitting(true);
    try {
      const attendeeList = Array.from(attendees);
      const noShowList = eventData.attendanceType === 'strict' ? Array.from(noShows) : [];

      // Conditionally add host to attendees if there are other attendees
      const finalAttendeeList = attendeeList.length > 0 
        ? [...attendeeList, currentUserId] // Add host if others attended
        : attendeeList; // Don't add host if no one else attended

      const result = await completeEvent(eventId, finalAttendeeList, noShowList, eventData.attendanceType);
      
      if (result.success) {
        // Update host's average attendees metric
        await updateHostAverageAttendees(currentUserId, finalAttendeeList.length);

        const successMessage = eventData.attendanceType === 'strict'
          ? `Event completed! ${finalAttendeeList.length} attended, ${noShowList.length} no-shows recorded.`
          : `Event completed! ${finalAttendeeList.length} people attended this casual event.`;

        vibeAlert.success('Success!', successMessage, [
          { text: 'Done', onPress: () => navigation.goBack() },
        ]);
      } else {
        vibeAlert.error('Error', `Failed to complete event: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error completing tracked event:', error);
      vibeAlert.error('Error', 'Failed to complete event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <VibeScreen title="Event Recap">
        <View style={styles.container}>
          <Text style={styles.loadingText}>Loading event data...</Text>
        </View>
      </VibeScreen>
    );
  }

  if (!eventData) {
    return (
      <VibeScreen title="Event Recap">
        <View style={styles.container}>
          <Text style={styles.errorText}>Event not found</Text>
        </View>
      </VibeScreen>
    );
  }

  // Handle events without attendance tracking
  if (!eventData.trackAttendance) {
    return (
      <VibeScreen title="Event Recap">
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Event Header - Green Box */}
            {showAttendanceMessage && (
              <Swipeable
                renderRightActions={renderRightActions}
                renderLeftActions={renderLeftActions}
                onSwipeableOpen={() => setShowAttendanceMessage(false)}
                friction={2}
                overshootRight={false}
                overshootLeft={false}
                rightThreshold={40}
                leftThreshold={40}
              >
                <View style={[styles.headerCard, { 
                  borderLeftColor: theme.colors.vibeGreen,
                  backgroundColor: theme.colors.vibeBackgroundGreen,
                  borderColor: theme.colors.vibeGreen
                }]}>
                  <View style={styles.headerContent}>
                    <View style={styles.checkIconContainer}>
                      <Text style={styles.checkIcon}>✓</Text>
                    </View>
                    <View style={styles.headerText}>
                      <Text style={styles.attendanceDescription}>
                        Attendance was not recorded for this event.
                      </Text>
                    </View>
                  </View>
                </View>
              </Swipeable>
            )}

            {/* Simple completion message */}
            <View style={styles.simpleWrapUpSection}>
              <Text style={styles.simpleWrapUpTitle}>Event Completed!</Text>
              <Text style={styles.simpleWrapUpDescription}>
                Thanks for hosting "{eventData.title}"! Since attendance tracking wasn't enabled, 
                there's no individual attendance to record.
              </Text>
              
              {/* Optional feedback */}
              <View style={styles.feedbackSection}>
                <Text style={styles.feedbackTitle}>How did it go?</Text>
                <Text style={styles.feedbackNote}>
                  Consider enabling attendance tracking for future events to get detailed metrics 
                  and help guests build their reliability scores.
                </Text>
              </View>
            </View>

            {/* Actions */}
            {/* Show cancellation option if only host is subscribed */}
            {eventData.subscribers?.length === 1 && eventData.subscribers[0] === currentUserId && (
              <VibeButton
                label="EVENT WAS CANCELLED - DELETE EVENT"
                onPress={() => {
                  vibeAlert.confirm(
                    'Delete Cancelled Event?',
                    'Since only you were subscribed to this event, it was effectively cancelled. Would you like to delete it?',
                    deleteEvent,
                    () => {}
                  );
                }}
                variant="outline"
                style={[styles.actionButton, { borderColor: theme.colors.vibeRed, backgroundColor: theme.colors.vibeBackgroundRed }]}
              />
            )}
            

            <VibeButton
              label="BACK TO EVENT"
              onPress={() => navigation.goBack()}
              variant="outline"
              style={styles.actionButton}
            />

            <VibeButton
              label="BACK TO HOME"
              onPress={() => navigation.navigate('Home')}
              variant="outline"
              style={styles.actionButton}
            />
          </View>
        </ScrollView>
      </VibeScreen>
    );
  }

  const attendanceInfo = getAttendanceTypeInfo();
  const isCompleted = eventData.status === 'completed';

  return (
    <VibeScreen title={attendanceInfo.title}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Event Header */}
          <View style={[styles.headerCard, { borderLeftColor: attendanceInfo.color }]}>
            <Text style={styles.eventTitle}>{eventData.title}</Text>
            <Text style={styles.attendanceDescription}>
              {attendanceInfo.icon} {attendanceInfo.description}
            </Text>
          </View>

          {isCompleted && (
            <View style={styles.completedBanner}>
              <Text style={styles.completedText}>✅ Event Completed</Text>
            </View>
          )}

          {/* Individual Attendance Tracking */}
          {eventData && (
            <View style={styles.trackedEventSection}>
              <Text style={styles.sectionTitle}>Mark Attendance</Text>
              <Text style={styles.instructions}>
                {eventData.attendanceType === 'casual' 
                  ? 'Tap to mark who attended (no penalties for missing)'
                  : 'Tap to cycle: Unknown → Attended → No Show → Unknown'
                }
              </Text>

              <View style={styles.summaryContainer}>
                <Text style={styles.summaryText}>
                  Total Subscribers: {subscribers.length}
                </Text>
                <Text style={styles.summaryText}>
                  Attendees: {attendees.size}
                  {eventData.attendanceType === 'strict' && ` • No Shows: ${noShows.size}`}
                </Text>
              </View>

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
                        {eventData.attendanceType === 'strict' && (
                          <Text style={styles.noShowCount}>
                            No-shows: {user.userdata?.metrics?.events?.noShows || 0}
                          </Text>
                        )}
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
            </View>
          )}

          {/* Complete Button */}
          {!isCompleted && (
            <VibeButton
              label={submitting ? 'COMPLETING...' : 'COMPLETE EVENT'}
              onPress={handleCompleteEvent}
              variant="filled"
              disabled={submitting}
              style={[
                styles.completeButton,
                submitting && styles.disabledButton,
              ]}
            />
          )}
        </View>
      </ScrollView>
    </VibeScreen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  headerCard: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.vibeGreen,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  checkIcon: {
    color: theme.colors.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerText: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: 8,
  },
  attendanceDescription: {
    fontSize: 16,
    color: theme.colors.gray,
    fontStyle: 'italic',
  },
  completedBanner: {
    backgroundColor: theme.colors.vibeGreen,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  completedText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: 16,
  },

  // Simple Recap Styles (no attendance tracking)
  simpleWrapUpSection: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  simpleWrapUpTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.vibeGreen,
    textAlign: 'center',
    marginBottom: 16,
  },
  simpleWrapUpDescription: {
    fontSize: 16,
    color: theme.colors.white,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  feedbackSection: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.vibeBlue,
    paddingTop: 20,
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: 12,
  },
  feedbackNote: {
    fontSize: 14,
    color: theme.colors.gray,
    lineHeight: 20,
  },
  actionButton: {
    marginBottom: 0,
  },

  // Tracked Event Styles
  trackedEventSection: {
    marginBottom: 30,
  },
  instructions: {
    color: theme.colors.gray,
    fontSize: 14,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  summaryContainer: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  summaryText: {
    color: theme.colors.white,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 4,
  },
  userCard: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.vibeBlue,
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
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  reliabilityBadge: {
    color: theme.colors.gray,
    fontSize: 12,
  },
  noShowCount: {
    color: theme.colors.gray,
    fontSize: 12,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Common Styles
  completeButton: {
    marginTop: 30,
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingText: {
    color: theme.colors.white,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },
  errorText: {
    color: theme.colors.vibeRed,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },
  
  // Invisible swipe area for visual feedback
  swipeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default HostEventWrapUpScreen;