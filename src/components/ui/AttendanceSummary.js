import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { AttendanceService } from '../../services/AttendanceService';
import theme from '../../theme/themes';

export default function AttendanceSummary({ eventId, studioId, onPress, isHost = false }) {
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isHost) {
      loadAttendanceStats();
    } else {
      setLoading(false);
    }
  }, [eventId, studioId, isHost]);

  const loadAttendanceStats = async () => {
    try {
      const attendance = await AttendanceService.getEventAttendance(studioId, eventId);
      setAttendanceStats(attendance.stats);
    } catch (error) {
      // Silently fail - attendance might not be marked yet
    } finally {
      setLoading(false);
    }
  };

  if (!isHost || loading || !attendanceStats) {
    return null;
  }

  const { attendedCount, noShowCount, pendingCount, attendanceRate } = attendanceStats;
  const hasAttendanceData = attendedCount > 0 || noShowCount > 0;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.title}>📊 Attendance Summary</Text>
        <Text style={styles.tapText}>Tap to manage →</Text>
      </View>

      {hasAttendanceData ? (
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.colors.vibeGreen }]}>
                {attendedCount}
              </Text>
              <Text style={styles.statLabel}>Attended</Text>
            </View>
            
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: '#FF6B6B' }]}>
                {noShowCount}
              </Text>
              <Text style={styles.statLabel}>No Shows</Text>
            </View>
            
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: theme.colors.textSecondary }]}>
                {pendingCount}
              </Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
          
          <View style={styles.attendanceRateContainer}>
            <Text style={styles.attendanceRateLabel}>
              Attendance Rate: {Math.round(attendanceRate)}%
            </Text>
            <View style={styles.attendanceRateBar}>
              <View 
                style={[
                  styles.attendanceRateFill, 
                  { width: `${Math.min(attendanceRate, 100)}%` }
                ]} 
              />
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>
            No attendance marked yet
          </Text>
          <Text style={styles.noDataSubtext}>
            Tap to start marking attendance
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 198, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 198, 255, 0.3)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  tapText: {
    fontSize: 12,
    color: theme.colors.vibeBlue,
    fontWeight: '500',
  },
  statsContainer: {
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  attendanceRateContainer: {
    alignItems: 'center',
  },
  attendanceRateLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  attendanceRateBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  attendanceRateFill: {
    height: '100%',
    backgroundColor: theme.colors.vibeGreen || '#00FF96',
    borderRadius: 3,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  noDataText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  noDataSubtext: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    opacity: 0.7,
  },
});