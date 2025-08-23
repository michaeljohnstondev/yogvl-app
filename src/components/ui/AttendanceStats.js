import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../theme/themes';

export default function AttendanceStats({ stats }) {
  const {
    rsvpCount,
    attendedCount,
    noShowCount,
    pendingCount,
    attendanceRate,
  } = stats;

  const StatCard = ({ title, value, color, icon }) => (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  return (
    <LinearGradient
      colors={['rgba(0, 198, 255, 0.1)', 'rgba(0, 255, 150, 0.1)']}
      style={styles.container}
    >
      <Text style={styles.title}>Attendance Overview</Text>
      
      <View style={styles.statsGrid}>
        <StatCard
          title="RSVPs"
          value={rsvpCount}
          color={theme.colors.vibeBlue || '#00C6FF'}
          icon="👥"
        />
        
        <StatCard
          title="Attended"
          value={attendedCount}
          color={theme.colors.vibeGreen || '#00FF96'}
          icon="✅"
        />
        
        <StatCard
          title="No Shows"
          value={noShowCount}
          color="#FF6B6B"
          icon="❌"
        />
        
        <StatCard
          title="Pending"
          value={pendingCount}
          color={theme.colors.textSecondary}
          icon="⏳"
        />
      </View>

      <View style={styles.attendanceRateContainer}>
        <Text style={styles.attendanceRateLabel}>Attendance Rate</Text>
        <View style={styles.attendanceRateBar}>
          <View 
            style={[
              styles.attendanceRateFill, 
              { width: `${Math.min(attendanceRate, 100)}%` }
            ]} 
          />
        </View>
        <Text style={styles.attendanceRateText}>
          {Math.round(attendanceRate)}%
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statTitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  attendanceRateContainer: {
    alignItems: 'center',
  },
  attendanceRateLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  attendanceRateBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  attendanceRateFill: {
    height: '100%',
    backgroundColor: theme.colors.vibeGreen || '#00FF96',
    borderRadius: 4,
  },
  attendanceRateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.vibeGreen || '#00FF96',
  },
});