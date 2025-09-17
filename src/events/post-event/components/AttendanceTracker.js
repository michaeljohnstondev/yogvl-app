// FILE: AttendanceTracker.js - Component for tracking attendance during event completion

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { VibeButton } from '../../../components/ui';
import AttendanceCard from '../../../components/ui/events/AttendanceCard';
import theme from '../../../theme/themes';

const AttendanceTracker = ({
  participants,
  attendanceTracking,
  eventType,
  onComplete,
  submitting,
}) => {
  const {
    getAttendanceStatus,
    getAttendanceStats,
    toggleAttendance,
    markAllAttended,
    clearAllAttendance,
    hasChanges,
  } = attendanceTracking;

  const stats = getAttendanceStats();

  const renderParticipant = ({ item }) => {
    const status = getAttendanceStatus(item.id);

    // Convert attendance tracking status to AttendanceCard format
    const attendanceStatus = {
      attended: status === 'attended',
      noShow: status === 'no-show',
      markedAt: null, // Could be enhanced later with timestamps
    };

    // Extract user data in format expected by AttendanceCard
    const userData = {
      id: item.id,
      firstName: item.userdata?.contactInfo?.firstName,
      lastName: item.userdata?.contactInfo?.lastName,
      email: item.email,
      ...item.userdata?.contactInfo,
    };

    return (
      <AttendanceCard
        user={userData}
        attendanceStatus={attendanceStatus}
        onMarkAttended={(userId) => toggleAttendance(userId, eventType)}
        onMarkNoShow={(userId) => toggleAttendance(userId, eventType)}
        disabled={false}
      />
    );
  };

  return (
    <View style={styles.container}>
      {/* Stats Header */}
      <View style={styles.statsHeader}>
        <Text style={styles.statsTitle}>Mark Attendance</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.attended}</Text>
            <Text style={styles.statLabel}>Attended</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.noShows}</Text>
            <Text style={styles.statLabel}>No Shows</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.unknown}</Text>
            <Text style={styles.statLabel}>Unmarked</Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={markAllAttended}
        >
          <Text style={styles.quickActionText}>Mark All Attended</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={clearAllAttendance}
        >
          <Text style={styles.quickActionText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Event Type Info */}
      {eventType && (
        <View style={styles.eventTypeInfo}>
          <Text style={styles.eventTypeText}>
            {eventType === 'casual'
              ? "🌊 Casual event - no-shows won't affect reliability scores"
              : '🎯 Strict event - no-shows will impact reliability scores'}
          </Text>
        </View>
      )}

      {/* Participants List */}
      <FlatList
        data={participants}
        renderItem={renderParticipant}
        keyExtractor={(item) => item.id}
        style={styles.participantsList}
        showsVerticalScrollIndicator={false}
      />

      {/* Complete Button */}
      <VibeButton
        label={`Complete Event (${stats.attended} attendees)`}
        onPress={onComplete}
        disabled={submitting || stats.attended === 0}
        loading={submitting}
        style={styles.completeButton}
      />

      {hasChanges && (
        <Text style={styles.changesNote}>
          Tap participants to toggle their attendance status
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },

  // Stats Header
  statsHeader: {
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: 12,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.vibeBlue,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.gray,
    marginTop: 4,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.vibeBlue,
  },

  // Event Type Info
  eventTypeInfo: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue + '50',
  },
  eventTypeText: {
    fontSize: 12,
    color: theme.colors.gray,
    textAlign: 'center',
  },

  // Participants List
  participantsList: {
    maxHeight: 300,
    marginBottom: 16,
  },

  // Complete Button
  completeButton: {
    marginVertical: 0,
  },

  // Changes Note
  changesNote: {
    fontSize: 12,
    color: theme.colors.gray,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default AttendanceTracker;
