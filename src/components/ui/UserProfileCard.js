import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ReliabilityBadge from './ReliabilityBadge';
import ReliabilityDetail from './ReliabilityDetail';
import { useReliability } from '../../hooks/useReliability';
import theme from '../../theme/themes';

export default function UserProfileCard({ userData, style, showDetails = true }) {
  const [showReliabilityDetail, setShowReliabilityDetail] = useState(false);
  const { reliabilityData } = useReliability(userData);

  if (!userData) return null;

  const contactInfo = userData?.userdata?.contactinfo || {};
  const displayName = contactInfo.firstName && contactInfo.lastName 
    ? `${contactInfo.firstName} ${contactInfo.lastName}`
    : contactInfo.email || userData.email || 'User';

  const initials = contactInfo.firstName && contactInfo.lastName
    ? `${contactInfo.firstName.charAt(0)}${contactInfo.lastName.charAt(0)}`.toUpperCase()
    : (contactInfo.email || userData.email ? (contactInfo.email || userData.email).charAt(0).toUpperCase() : '?');

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={['rgba(0, 198, 255, 0.1)', 'rgba(0, 255, 150, 0.05)']}
        style={styles.content}
      >
        {/* User Avatar & Basic Info */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userEmail}>{contactInfo.email || userData.email}</Text>
            
            {userData?.userdata?.studios?.default && (
              <Text style={styles.userLocation}>
                🎵 {userData.userdata.studios.default.studioName}
              </Text>
            )}
          </View>
        </View>

        {/* Reliability Section */}
        <View style={styles.reliabilitySection}>
          <View style={styles.reliabilityHeader}>
            <Text style={styles.reliabilityTitle}>Reliability</Text>
            <ReliabilityBadge 
              userData={userData}
              size="medium"
              onPress={showDetails ? () => setShowReliabilityDetail(true) : null}
            />
          </View>

          {reliabilityData?.metrics && (
            <View style={styles.quickStats}>
              <View style={styles.quickStat}>
                <Text style={styles.quickStatValue}>
                  {reliabilityData.metrics.totalRSVPs || 0}
                </Text>
                <Text style={styles.quickStatLabel}>Events</Text>
              </View>
              
              <View style={styles.quickStat}>
                <Text style={[styles.quickStatValue, { color: theme.colors.vibeGreen }]}>
                  {reliabilityData.metrics.totalAttended || 0}
                </Text>
                <Text style={styles.quickStatLabel}>Attended</Text>
              </View>
              
              <View style={styles.quickStat}>
                <Text style={[styles.quickStatValue, { color: theme.colors.vibeBlue }]}>
                  {reliabilityData.streaks?.currentAttendanceStreak || 0}
                </Text>
                <Text style={styles.quickStatLabel}>Streak</Text>
              </View>
            </View>
          )}
        </View>

        {/* User Stats */}
        {userData.userdata?.metadata?.createdAt && (
          <View style={styles.memberSince}>
            <Text style={styles.memberSinceText}>
              Member since {new Date(userData.userdata.metadata.createdAt.toDate()).toLocaleDateString()}
            </Text>
          </View>
        )}
      </LinearGradient>

      {/* Reliability Detail Modal */}
      {showReliabilityDetail && (
        <ReliabilityDetail
          userData={userData}
          onClose={() => setShowReliabilityDetail(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 8,
  },
  content: {
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.vibeBlue || '#00C6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  userLocation: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  reliabilitySection: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  reliabilityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reliabilityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickStat: {
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  quickStatLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  memberSince: {
    alignItems: 'center',
  },
  memberSinceText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
});