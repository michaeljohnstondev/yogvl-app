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
import { VibeButton, CloseButton } from '../../../components/ui';
import ScreenHeader from '../../../components/ui/layout/ScreenHeader';
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
  navigation,
  studioId,
  eventId,
}) => {
  const vibeAlert = useVibeAlert();
  const [showAttendanceTracker, setShowAttendanceTracker] = useState(false);

  const handleManageAttendance = () => {
    navigation.navigate('EventAttendance', { eventId, studioId });
  };

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
    return eventData.status === 'completed'
      ? 'Event Completed'
      : 'Complete Event';
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Event Recap" onClose={onNavigateBack} />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>

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
          navigation={navigation}
          eventId={eventId}
          studioId={studioId}
        />

        {/* Separator */}
        <View style={styles.separator} />

        {/* Navigation Buttons */}
        <View style={styles.navigationButtons}>
          {/* Attendance Management Button - Only if tracking */}
          {eventData.trackAttendance && (
            <VibeButton
              label="MANAGE ATTENDANCE"
              onPress={handleManageAttendance}
              variant="green"
              style={styles.navButton}
            />
          )}

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollView: {
    flex: 1,
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
  manageAttendanceButton: {
    marginVertical: 0,
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

  // Separator
  separator: {
    height: 1,
    backgroundColor: theme.colors.vibeBlue,
    marginTop: 20,
    marginBottom: 30,
  },

  // Navigation
  navigationButtons: {
    gap: 0,
  },
  navButton: {
    marginVertical: 0,
  },
});

export default HostView;
