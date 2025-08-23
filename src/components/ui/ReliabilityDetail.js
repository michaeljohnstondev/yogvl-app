import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ReliabilityService } from '../../services/ReliabilityService';
import ReliabilityBadge from './ReliabilityBadge';
import theme from '../../theme/themes';

export default function ReliabilityDetail({ userData, onClose }) {
  const reliabilityData = ReliabilityService.getUserReliabilityDisplay(userData);
  const { score, tier, metrics, streaks } = reliabilityData;

  const StatRow = ({ label, value, color = theme.colors.textSecondary }) => (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );

  return (
    <View style={styles.overlay}>
      <TouchableOpacity 
        style={styles.backdrop} 
        onPress={onClose}
        activeOpacity={1}
      />
      
      <View style={styles.modal}>
        <LinearGradient
          colors={theme.colors.backgroundGradient}
          style={styles.content}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Reliability Details</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* User Info */}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>
              {userData?.userdata?.contactinfo?.firstName && userData?.userdata?.contactinfo?.lastName 
                ? `${userData.userdata.contactinfo.firstName} ${userData.userdata.contactinfo.lastName}`
                : userData?.userdata?.contactinfo?.email || userData.email || 'User'}
            </Text>
            <ReliabilityBadge userData={userData} size="large" />
          </View>

          {/* Overall Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Overall Statistics</Text>
            <View style={styles.statsGrid}>
              <StatRow 
                label="Total Events" 
                value={metrics.totalRSVPs || 0} 
              />
              <StatRow 
                label="Attended" 
                value={metrics.totalAttended || 0}
                color={theme.colors.vibeGreen}
              />
              <StatRow 
                label="No Shows" 
                value={metrics.totalNoShows || 0}
                color="#FF6B6B"
              />
              <StatRow 
                label="Attendance Rate" 
                value={`${metrics.attendanceRate || 100}%`}
                color={metrics.attendanceRate >= 80 ? theme.colors.vibeGreen : '#FF9800'}
              />
            </View>
          </View>

          {/* Recent Performance */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Recent Performance (30 days)</Text>
            <View style={styles.statsGrid}>
              <StatRow 
                label="Recent Events" 
                value={metrics.recentEvents || 0} 
              />
              <StatRow 
                label="Recent Attended" 
                value={metrics.recentAttended || 0}
                color={theme.colors.vibeGreen}
              />
              <StatRow 
                label="Recent Rate" 
                value={`${metrics.recentAttendanceRate || 100}%`}
                color={metrics.recentAttendanceRate >= 80 ? theme.colors.vibeGreen : '#FF9800'}
              />
            </View>
          </View>

          {/* Streaks */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔥 Streaks & Patterns</Text>
            <View style={styles.statsGrid}>
              <StatRow 
                label="Current Attendance Streak" 
                value={streaks.currentAttendanceStreak || 0}
                color={theme.colors.vibeGreen}
              />
              <StatRow 
                label="Longest Attendance Streak" 
                value={streaks.longestAttendanceStreak || 0}
                color={theme.colors.vibeBlue}
              />
              {streaks.currentNoShowStreak > 0 && (
                <StatRow 
                  label="Current No-Show Streak" 
                  value={streaks.currentNoShowStreak}
                  color="#FF6B6B"
                />
              )}
            </View>
          </View>

          {/* Reliability Explanation */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ℹ️ How Reliability Works</Text>
            <Text style={styles.explanationText}>
              Reliability scores are calculated based on attendance rate, recent performance, 
              and consistency. Factors include:
            </Text>
            <Text style={styles.bulletPoint}>• Attendance vs no-shows</Text>
            <Text style={styles.bulletPoint}>• Recent activity (weighted more heavily)</Text>
            <Text style={styles.bulletPoint}>• Consistency and streaks</Text>
            <Text style={styles.bulletPoint}>• Last-minute cancellations</Text>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modal: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  closeButton: {
    padding: 5,
  },
  closeText: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    fontWeight: 'bold',
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 10,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  statsGrid: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  explanationText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
    marginLeft: 8,
  },
});