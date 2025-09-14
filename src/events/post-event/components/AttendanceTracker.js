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
    const displayName =
      item.userdata?.contactInfo?.displayName ||
      item.userdata?.contactInfo?.firstName ||
      'Unknown User';
    const initial = displayName.charAt(0).toUpperCase();

    return (
      <TouchableOpacity
        style={styles.participantItem}
        onPress={() => toggleAttendance(item.id, eventType)}
      >
        <View style={styles.participantInfo}>
          <View style={[styles.avatar, getAvatarStyle(status)]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.participantDetails}>
            <Text style={styles.participantName}>{displayName}</Text>
            <Text style={styles.participantStatus}>
              {getStatusText(status)}
            </Text>
          </View>
        </View>
        <View style={[styles.statusIndicator, getStatusStyle(status)]}>
          <Text style={styles.statusIcon}>{getStatusIcon(status)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'attended':
        return 'Attended';
      case 'no-show':
        return 'No Show';
      default:
        return 'Not marked';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'attended':
        return '✅';
      case 'no-show':
        return '❌';
      default:
        return '❓';
    }
  };

  const getAvatarStyle = (status) => {
    switch (status) {
      case 'attended':
        return { backgroundColor: theme.colors.vibeGreen };
      case 'no-show':
        return { backgroundColor: theme.colors.vibeRed };
      default:
        return { backgroundColor: theme.colors.gray };
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'attended':
        return { backgroundColor: theme.colors.vibeBackgroundGreen };
      case 'no-show':
        return { backgroundColor: theme.colors.vibeBackgroundRed };
      default:
        return { backgroundColor: theme.colors.vibeBackgroundBlue };
    }
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
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.darkGray,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  participantDetails: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
  },
  participantStatus: {
    fontSize: 12,
    color: theme.colors.gray,
    marginTop: 2,
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIcon: {
    fontSize: 16,
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
