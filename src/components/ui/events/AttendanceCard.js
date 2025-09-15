import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ProfileAvatar from '../profile/ProfileAvatar';
import ReliabilityBadge from '../profile/ReliabilityBadge';
import ReliabilityWarning from '../profile/ReliabilityWarning';
import ReliabilityDetail from '../profile/ReliabilityDetail';
import theme from '../../../theme/themes';

export default function AttendanceCard({
  user,
  attendanceStatus,
  onMarkAttended,
  onMarkNoShow,
  disabled = false,
}) {
  const [showReliabilityDetail, setShowReliabilityDetail] = useState(false);
  const getStatusColor = () => {
    if (attendanceStatus?.attended) return theme.colors.vibeGreen;
    if (attendanceStatus?.noShow) return theme.colors.vibeRed;
    return theme.colors.textSecondary;
  };

  const getStatusText = () => {
    if (attendanceStatus?.attended) return '✅ Attended';
    if (attendanceStatus?.noShow) return '❌ No Show';
    return '⏳ Pending';
  };

  const showButtons =
    !attendanceStatus?.attended && !attendanceStatus?.noShow && !disabled;

  return (
    <View style={styles.card}>
      <View style={styles.userInfo}>
        <ProfileAvatar userData={user} size={50} showBorder={true} />

        <View style={styles.userDetails}>
          <Text style={styles.userName}>
            {user.firstName && user.lastName
              ? `${user.firstName} ${user.lastName}`
              : user.email || 'Unknown User'}
          </Text>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
          <ReliabilityBadge
            userData={user}
            size="small"
            onPress={() => setShowReliabilityDetail(true)}
          />
        </View>
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

      {/* Reliability Warning */}
      <ReliabilityWarning userData={user} />

      {attendanceStatus?.markedAt && (
        <Text style={styles.markedTime}>
          Marked:{' '}
          {new Date(attendanceStatus.markedAt.toDate()).toLocaleString()}
        </Text>
      )}

      {/* Reliability Detail Modal */}
      {showReliabilityDetail && (
        <ReliabilityDetail
          userData={user}
          onClose={() => setShowReliabilityDetail(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
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
