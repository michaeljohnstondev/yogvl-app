// FILE: EventWrapUpScreen.js - Unified Event Wrap-Up Screen (Host + Guest)

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useAuth } from '../../../auth/AuthContext';
import { useVibeAlert } from '../../../components/ui/VibeAlertContext';
import VibeScreen from '../../../components/ui/VibeScreen';
import VibeButton from '../../../components/ui/VibeButton';
import { useEventCompletion } from '../hooks/useEventCompletion';
import { useAttendanceTracking } from '../hooks/useAttendanceTracking';
import AttendanceTracker from '../components/AttendanceTracker';
import PostEventActions from '../components/PostEventActions';
import theme from '../../../theme/themes';

const EventWrapUpScreen = ({ navigation, route }) => {
  const { eventId, studioId: routeStudioId } = route.params;
  const { currentUserId, userData } = useAuth();
  const vibeAlert = useVibeAlert();
  
  // Use studioId from route, or fallback to user's default studio
  const studioId = routeStudioId || userData?.userdata?.studios?.default?.studioId;
  
  const [showAttendanceTracker, setShowAttendanceTracker] = useState(false);
  
  // Main event completion hook
  const {
    eventData,
    participants,
    attendance,
    userStatus,
    loading,
    submitting,
    completeEvent,
    reportAttendance,
    submitHostRating,
    deleteEvent,
    refreshData,
  } = useEventCompletion(studioId, eventId, currentUserId);

  // Attendance tracking hook (for hosts)
  const attendanceTracking = useAttendanceTracking(
    studioId, 
    eventId, 
    participants
  );

  if (loading) {
    return (
      <VibeScreen title="Event Wrap-Up">
        <View style={styles.container}>
          <Text style={styles.loadingText}>Loading event data...</Text>
        </View>
      </VibeScreen>
    );
  }

  if (!eventData) {
    return (
      <VibeScreen title="Event Wrap-Up">
        <View style={styles.container}>
          <Text style={styles.errorText}>Event not found</Text>
        </View>
      </VibeScreen>
    );
  }

  const handleCompleteEvent = async () => {
    const validation = attendanceTracking.validateAttendance();
    
    if (!validation.valid) {
      vibeAlert.error('Cannot Complete Event', validation.message);
      return;
    }

    const { attendeeIds, noShowIds } = attendanceTracking.getAttendanceLists();
    const stats = attendanceTracking.getAttendanceStats();
    
    const confirmMessage = `Complete event with ${stats.attended} attendee${stats.attended === 1 ? '' : 's'}${
      stats.noShows > 0 ? ` and ${stats.noShows} no-show${stats.noShows === 1 ? '' : 's'}` : ''
    }?`;

    vibeAlert.confirm(
      'Complete Event',
      confirmMessage,
      async () => {
        const success = await completeEvent(attendeeIds, noShowIds);
        if (success) {
          setShowAttendanceTracker(false);
        }
      }
    );
  };

  const getScreenTitle = () => {
    if (userStatus.isHost) {
      return eventData.status === 'completed' ? 'Event Completed' : 'Complete Event';
    }
    return 'Event Recap';
  };

  const getAttendanceTypeInfo = () => {
    switch (eventData.attendanceType) {
      case 'casual':
        return {
          title: '🌊 How was the event?',
          description: 'Let us know if you made it - no worries if you missed it!',
          icon: '🌊',
          color: theme.colors.vibeBlue,
          impactNote: 'This is a casual event - no impact on your reliability score.'
        };
      case 'strict':
        return {
          title: '🎯 Confirm your attendance',
          description: 'Please confirm if you attended - this affects reliability scores.',
          icon: '🎯',
          color: theme.colors.vibeOrange,
          impactNote: 'This is a strict event - attendance affects your reliability score.'
        };
      default:
        return {
          title: 'Event Feedback',
          description: 'How was the event?',
          icon: '📋',
          color: theme.colors.vibeBlue,
          impactNote: ''
        };
    }
  };

  // HOST VIEW - Event completion and attendance management
  if (userStatus.isHost) {
    return (
      <VibeScreen title={getScreenTitle()}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Event Header */}
            <View style={styles.headerCard}>
              <Text style={styles.eventTitle}>{eventData.title}</Text>
              <Text style={styles.eventSubtitle}>
                {participants.length} participant{participants.length === 1 ? '' : 's'}
              </Text>
              
              {eventData.status === 'completed' ? (
                <View style={styles.completedBadge}>
                  <Text style={styles.completedIcon}>✅</Text>
                  <Text style={styles.completedText}>Event Completed</Text>
                </View>
              ) : eventData.trackAttendance ? (
                <Text style={styles.attendanceNote}>
                  {eventData.attendanceType === 'casual' 
                    ? '🌊 Casual event - optional attendance tracking'
                    : '🎯 Strict event - attendance affects reliability scores'
                  }
                </Text>
              ) : (
                <Text style={styles.noTrackingNote}>
                  📋 No attendance tracking for this event
                </Text>
              )}
            </View>

            {/* Attendance Management */}
            {eventData.trackAttendance && eventData.status !== 'completed' && (
              <View style={styles.attendanceSection}>
                <TouchableOpacity
                  style={styles.trackAttendanceButton}
                  onPress={() => setShowAttendanceTracker(!showAttendanceTracker)}
                >
                  <Text style={styles.trackAttendanceText}>
                    {showAttendanceTracker ? 'Hide' : 'Track'} Attendance
                  </Text>
                  <Text style={styles.trackAttendanceIcon}>
                    {showAttendanceTracker ? '⬆️' : '⬇️'}
                  </Text>
                </TouchableOpacity>

                {showAttendanceTracker && (
                  <AttendanceTracker
                    participants={participants}
                    attendanceTracking={attendanceTracking}
                    eventType={eventData.attendanceType}
                    onComplete={handleCompleteEvent}
                    submitting={submitting}
                  />
                )}
              </View>
            )}

            {/* Completed Event Stats */}
            {eventData.status === 'completed' && attendance && (
              <View style={styles.statsSection}>
                <Text style={styles.statsTitle}>Final Attendance</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{attendance.stats.attendedCount}</Text>
                    <Text style={styles.statLabel}>Attended</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{attendance.stats.noShowCount}</Text>
                    <Text style={styles.statLabel}>No Shows</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{Math.round(attendance.stats.attendanceRate)}%</Text>
                    <Text style={styles.statLabel}>Rate</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Post-Event Actions */}
            <PostEventActions
              participants={participants}
              userStatus={userStatus}
              eventData={eventData}
              onDeleteEvent={deleteEvent}
              submitting={submitting}
            />

            {/* Navigation Buttons */}
            <View style={styles.navigationButtons}>
              <VibeButton
                label="BACK TO EVENT"
                onPress={() => navigation.goBack()}
                variant="outline"
                style={styles.navButton}
              />
              
              <VibeButton
                label="BACK TO HOME"
                onPress={() => navigation.navigate('Home')}
                variant="outline"
                style={styles.navButton}
              />
            </View>
          </View>
        </ScrollView>
      </VibeScreen>
    );
  }

  // GUEST VIEW - Attendance reporting and host rating
  const attendanceInfo = getAttendanceTypeInfo();
  
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
            {attendanceInfo.impactNote && (
              <Text style={styles.impactNote}>
                {attendanceInfo.impactNote}
              </Text>
            )}
          </View>

          {/* Attendance Reporting */}
          {eventData.trackAttendance && !userStatus.hasReportedAttendance && (
            <View style={styles.attendanceReporting}>
              <Text style={styles.reportingTitle}>Did you attend this event?</Text>
              
              <View style={styles.reportingButtons}>
                <TouchableOpacity
                  style={[styles.reportingButton, styles.attendedButton]}
                  onPress={() => reportAttendance(true)}
                  disabled={submitting}
                >
                  <Text style={styles.reportingIcon}>🎉</Text>
                  <Text style={styles.reportingButtonText}>I was there!</Text>
                  <Text style={styles.reportingSubtext}>Yes, I attended</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.reportingButton, styles.missedButton]}
                  onPress={() => reportAttendance(false)}
                  disabled={submitting}
                >
                  <Text style={styles.reportingIcon}>😔</Text>
                  <Text style={styles.reportingButtonText}>Couldn't make it</Text>
                  <Text style={styles.reportingSubtext}>I had to miss it</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Attendance Reported Status */}
          {userStatus.hasReportedAttendance && (
            <View style={styles.reportedStatus}>
              <View style={[
                styles.reportedBadge,
                userStatus.hasReportedAttendance === 'attended' 
                  ? styles.reportedAttended 
                  : styles.reportedMissed
              ]}>
                <Text style={styles.reportedIcon}>
                  {userStatus.hasReportedAttendance === 'attended' ? '✅' : '❌'}
                </Text>
                <Text style={styles.reportedText}>
                  {userStatus.hasReportedAttendance === 'attended'
                    ? 'You marked that you attended'
                    : 'You marked that you missed it'
                  }
                </Text>
              </View>
            </View>
          )}

          {/* Host Rating */}
          {userStatus.canRateHost && userStatus.hasReportedAttendance === 'attended' && !userStatus.hasRatedHost && (
            <View style={styles.ratingSection}>
              <Text style={styles.ratingSectionTitle}>Rate the host</Text>
              <Text style={styles.ratingDescription}>
                How was your experience with the host?
              </Text>
              
              <View style={styles.starRating}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    style={styles.starButton}
                    onPress={() => submitHostRating(star)}
                    disabled={submitting}
                  >
                    <Text style={styles.starText}>⭐</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <View style={styles.ratingLabels}>
                <Text style={styles.ratingLabel}>Poor</Text>
                <Text style={styles.ratingLabel}>Excellent</Text>
              </View>
            </View>
          )}

          {/* Participants List */}
          <PostEventActions
            participants={participants}
            userStatus={userStatus}
            eventData={eventData}
            submitting={submitting}
          />

          {/* Navigation Buttons */}
          <View style={styles.navigationButtons}>
            <VibeButton
              label="BACK TO EVENT"
              onPress={() => navigation.goBack()}
              variant="outline"
              style={styles.navButton}
            />
            
            <VibeButton
              label="BACK TO HOME"
              onPress={() => navigation.navigate('Home')}
              variant="outline"
              style={styles.navButton}
            />
          </View>
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
  
  // Header Styles
  headerCard: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: 8,
  },
  eventSubtitle: {
    fontSize: 16,
    color: theme.colors.gray,
    marginBottom: 12,
  },
  attendanceDescription: {
    fontSize: 16,
    color: theme.colors.white,
    fontWeight: '500',
  },
  impactNote: {
    fontSize: 12,
    color: theme.colors.vibeOrange,
    fontStyle: 'italic',
    marginTop: 8,
  },
  attendanceNote: {
    fontSize: 14,
    color: theme.colors.vibeBlue,
    marginTop: 8,
  },
  noTrackingNote: {
    fontSize: 14,
    color: theme.colors.gray,
    marginTop: 8,
  },
  
  // Completed Badge
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.vibeBackgroundGreen,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  completedIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  completedText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.vibeGreen,
  },

  // Attendance Management (Host)
  attendanceSection: {
    marginBottom: 24,
  },
  trackAttendanceButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  trackAttendanceText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
  },
  trackAttendanceIcon: {
    fontSize: 16,
  },

  // Stats (Completed Events)
  statsSection: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.vibeBlue,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.gray,
    marginTop: 4,
  },

  // Attendance Reporting (Guest)
  attendanceReporting: {
    marginBottom: 24,
  },
  reportingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.white,
    textAlign: 'center',
    marginBottom: 20,
  },
  reportingButtons: {
    gap: 16,
  },
  reportingButton: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
  },
  attendedButton: {
    borderColor: theme.colors.vibeGreen,
    backgroundColor: theme.colors.vibeBackgroundGreen,
  },
  missedButton: {
    borderColor: theme.colors.vibeOrange,
    backgroundColor: theme.colors.vibeBackgroundOrange,
  },
  reportingIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  reportingButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: 4,
  },
  reportingSubtext: {
    fontSize: 14,
    color: theme.colors.gray,
  },

  // Reported Status
  reportedStatus: {
    alignItems: 'center',
    marginBottom: 24,
  },
  reportedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    minWidth: '80%',
    justifyContent: 'center',
  },
  reportedAttended: {
    backgroundColor: theme.colors.vibeBackgroundGreen,
  },
  reportedMissed: {
    backgroundColor: theme.colors.vibeBackgroundOrange,
  },
  reportedIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  reportedText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
  },

  // Host Rating
  ratingSection: {
    marginBottom: 24,
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  ratingSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  ratingDescription: {
    fontSize: 14,
    color: theme.colors.gray,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  starRating: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  starButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  starText: {
    fontSize: 32,
    opacity: 0.3,
  },
  ratingLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  ratingLabel: {
    fontSize: 12,
    color: theme.colors.gray,
    fontStyle: 'italic',
  },

  // Navigation
  navigationButtons: {
    gap: 12,
    marginTop: 20,
  },
  navButton: {
    marginVertical: 0,
  },
});

export default EventWrapUpScreen;