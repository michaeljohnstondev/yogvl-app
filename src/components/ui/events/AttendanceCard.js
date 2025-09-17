import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ProfileAvatar from '../profile/ProfileAvatar';
import VibeButton from '../base/VibeButton';
import theme from '../../../theme/themes';

export default function AttendanceCard({
  user,
  attendanceStatus,
  onMarkAttended,
  onMarkNoShow,
  onStatusChange, // New prop for cycling status
  disabled = false,
}) {
  const getStatusColor = () => {
    if (attendanceStatus?.attended === true) return theme.colors.vibeGreen;
    if (attendanceStatus?.attended === false) return theme.colors.vibeRed;
    return theme.colors.textSecondary;
  };

  const getStatusText = () => {
    if (attendanceStatus?.attended === true) return '✅ Attended';
    if (attendanceStatus?.attended === false) return '❌ No Show';
    return '⏳ Pending';
  };

  const getStatusColorName = () => {
    if (attendanceStatus?.attended === true) return 'green';
    if (attendanceStatus?.attended === false) return 'red';
    return 'gray';
  };

  const handleStatusCycle = () => {
    if (disabled || !onStatusChange) return;

    // Cycle through: Pending → Attended → No Show → Pending
    if (!attendanceStatus) {
      // Pending → Attended
      onStatusChange(user.id, 'attended');
    } else if (attendanceStatus.attended === true) {
      // Attended → No Show
      onStatusChange(user.id, 'noShow');
    } else if (attendanceStatus.attended === false) {
      // No Show → Pending
      onStatusChange(user.id, 'pending');
    }
  };

  const showButtons =
    (!attendanceStatus || attendanceStatus.attended === undefined) && !disabled && !onStatusChange;

  return (
    <View style={styles.card}>
      <ProfileAvatar userData={user} size={50} showBorder={true} style={styles.avatar} />

      <View style={styles.userInfo}>
        <Text style={styles.userName}>
          {user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.email || 'Unknown User'}
        </Text>

        <VibeButton
          label={getStatusText()}
          onPress={handleStatusCycle}
          variant="toggle"
          color={getStatusColorName()}
          style={styles.statusButton}
        />
      </View>

      {showButtons && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.attendedButton}
            onPress={() => onMarkAttended(user.id)}
          >
            <LinearGradient
              colors={[theme.colors.vibeGreen, '#00CC78']}
              style={styles.button}
            >
              <Text style={styles.buttonText}>✓ Attended</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.noShowButton}
            onPress={() => onMarkNoShow(user.id)}
          >
            <View style={[styles.button, styles.noShowButtonBg]}>
              <Text style={styles.noShowButtonText}>✗ No Show</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {attendanceStatus?.markedAt && (
        <Text style={styles.markedTime}>
          Marked:{' '}
          {attendanceStatus.markedAt.toDate
            ? new Date(attendanceStatus.markedAt.toDate()).toLocaleString()
            : new Date(attendanceStatus.markedAt).toLocaleString()
          }
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
  },
  avatar: {
    position: 'absolute',
    top: 40,
    left: 0,
    zIndex: 1,
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  userName: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  statusButton: {
    alignSelf: 'center',
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  attendedButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  noShowButton: {
    flex: 1,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  noShowButtonBg: {
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: theme.colors.vibeRed,
  },
  buttonText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  noShowButtonText: {
    color: theme.colors.vibeRed,
    fontSize: 14,
    fontWeight: '600',
  },
  markedTime: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },
});
