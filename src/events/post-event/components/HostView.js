// FILE: HostView.js - Host-specific Event Completion View

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useVibeAlert } from '../../../components/ui/base/VibeAlertContext';
import { VibeButton } from '../../../components/ui';
import AttendanceTracker from './AttendanceTracker';
import PostEventActions from './PostEventActions';
import theme from '../../../theme/themes';

const HostView = ({
  eventData,
  participants,
  attendance,
  userStatus,
  submitting,
  attendanceTracking,
  completeEvent,
  deleteEvent,
  onNavigateBack,
  onNavigateHome,
}) => {
  const vibeAlert = useVibeAlert();
  const [showAttendanceTracker, setShowAttendanceTracker] = useState(false);

  const handleCompleteEvent = async () => {
    const validation = attendanceTracking.validateAttendance();

    if (!validation.valid) {
      vibeAlert.error('Cannot Complete Event', validation.message);
      return;
    }

    const { attendeeIds, noShowIds } = attendanceTracking.getAttendanceLists();
    const stats = attendanceTracking.getAttendanceStats();

    const confirmMessage = `Complete event with ${stats.attended} attendee${
      stats.attended === 1 ? '' : 's'
    }${
      stats.noShows > 0
        ? ` and ${stats.noShows} no-show${stats.noShows === 1 ? '' : 's'}`
        : ''
    }?`;

    vibeAlert.confirm('Complete Event', confirmMessage, async () => {
      const success = await completeEvent(attendeeIds, noShowIds);
      if (success) {
        setShowAttendanceTracker(false);
      }
    });
  };

  const getScreenTitle = () => {
    return eventData.status === 'completed' ? 'Event Completed' : 'Complete Event';
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* Event Header */}
        <View style={styles.headerCard}>
          <Text style={styles.eventTitle}>{eventData.title}</Text>
          <Text style={styles.eventSubtitle}>
            {participants.length} participant
            {participants.length === 1 ? '' : 's'}
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
                : '🎯 Strict event - attendance affects reliability scores'}
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
                <Text style={styles.statValue}>
                  {attendance.stats.attendedCount}
                </Text>
                <Text style={styles.statLabel}>Attended</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {attendance.stats.noShowCount}
                </Text>
                <Text style={styles.statLabel}>No Shows</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {Math.round(attendance.stats.attendanceRate)}%
                </Text>
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
            onPress={onNavigateBack}
            variant="outline"
            style={styles.navButton}
          />

          <VibeButton
            label="BACK TO HOME"
            onPress={onNavigateHome}
            variant="outline"
            style={styles.navButton}
          />
        </View>
      </View>
    </ScrollView>
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

  // Attendance Management
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

  // Navigation
  navigationButtons: {
    gap: 12,
    marginTop: 20,
  },
  navButton: {
    marginVertical: 0,
  },
});

export default HostView;