// FILE: components/ui/ModerationInfo.js - User Moderation Information Display

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../../auth/AuthContext';
import { moderationService } from '../../../services/moderationService';
import { isGlobalAdmin } from '../../../services/adminService';
import theme from '../../../theme/themes';

/**
 * Component to display user moderation information
 * Only visible to admins viewing other users' profiles
 */
export default function ModerationInfo({ targetUserId, style = {} }) {
  const { userData } = useAuth();
  const [moderationData, setModerationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  // Only show to global admins
  const isAdmin = isGlobalAdmin(userData);

  useEffect(() => {
    if (isAdmin && targetUserId) {
      loadModerationData();
    } else {
      setLoading(false);
    }
  }, [targetUserId, isAdmin]);

  const loadModerationData = async () => {
    try {
      setLoading(true);
      const data = await moderationService.getModerationRecord(targetUserId);
      setModerationData(data);
    } catch (error) {
      console.error('[ModerationInfo] Error loading moderation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBanStatus = async () => {
    try {
      const banStatus = await moderationService.getBanStatus(targetUserId);
      if (banStatus.isBanned) {
        const banType =
          banStatus.type === 'permanent'
            ? 'Permanently Banned'
            : `Temp Banned (${banStatus.daysRemaining} days left)`;
        Alert.alert(
          'Ban Status',
          `User is ${banType}\nReason: ${banStatus.reason}`
        );
      } else {
        Alert.alert('Ban Status', 'User is not currently banned');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to check ban status');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return 'Unknown';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString();
  };

  // Don't render if user is not an admin
  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.loadingText}>Loading moderation data...</Text>
      </View>
    );
  }

  if (!moderationData) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.cleanRecordText}>✅ Clean Record</Text>
        <Text style={styles.subText}>No moderation actions on file</Text>
      </View>
    );
  }

  const stats = moderationData.stats || {};
  const hasActiveStrikes = stats.activeStrikes > 0;
  const hasWarnings = stats.totalWarnings > 0;
  const hasBans =
    moderationData.bans?.tempBans?.length > 0 || moderationData.bans?.permBan;

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.title}>🛡️ Moderation Record</Text>
        <Text style={styles.expandIcon}>{expanded ? '▼' : '▶'}</Text>
      </TouchableOpacity>

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.statItem}>
          <Text
            style={[styles.statNumber, hasActiveStrikes && styles.alertNumber]}
          >
            {stats.activeStrikes || 0}
          </Text>
          <Text style={styles.statLabel}>Active Strikes</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.totalStrikes || 0}</Text>
          <Text style={styles.statLabel}>Total Strikes</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.totalWarnings || 0}</Text>
          <Text style={styles.statLabel}>Warnings</Text>
        </View>
      </View>

      {/* Ban Status Button */}
      <TouchableOpacity style={styles.banStatusButton} onPress={getBanStatus}>
        <Text style={styles.banStatusText}>Check Ban Status</Text>
      </TouchableOpacity>

      {/* Expanded Details */}
      {expanded && (
        <View style={styles.detailsContainer}>
          {/* Recent Strikes */}
          {moderationData.strikes?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Strikes</Text>
              {moderationData.strikes.slice(-3).map((strike, index) => (
                <View key={strike.id} style={styles.recordItem}>
                  <Text
                    style={[
                      styles.recordType,
                      !strike.active && styles.inactiveRecord,
                    ]}
                  >
                    {strike.active ? '⚠️ Active Strike' : '⚪ Expired Strike'}
                  </Text>
                  <Text style={styles.recordReason}>{strike.reason}</Text>
                  <Text style={styles.recordDate}>
                    {formatDate(strike.issuedAt)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Recent Warnings */}
          {moderationData.warnings?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Warnings</Text>
              {moderationData.warnings.slice(-2).map((warning, index) => (
                <View key={warning.id} style={styles.recordItem}>
                  <Text style={styles.recordType}>💬 Warning</Text>
                  <Text style={styles.recordReason}>{warning.reason}</Text>
                  <Text style={styles.recordDate}>
                    {formatDate(warning.issuedAt)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Ban History */}
          {hasBans && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ban History</Text>
              {moderationData.bans?.permBan && (
                <View style={styles.recordItem}>
                  <Text style={[styles.recordType, styles.permBanText]}>
                    🚫 Permanent Ban
                  </Text>
                  <Text style={styles.recordReason}>
                    {moderationData.bans.permBan.reason}
                  </Text>
                  <Text style={styles.recordDate}>
                    {formatDate(moderationData.bans.permBan.issuedAt)}
                  </Text>
                </View>
              )}

              {moderationData.bans?.tempBans?.slice(-2).map((ban, index) => (
                <View key={ban.id} style={styles.recordItem}>
                  <Text
                    style={[
                      styles.recordType,
                      ban.active && styles.activeBanText,
                    ]}
                  >
                    {ban.active ? '🔒 Active Temp Ban' : '🔓 Past Temp Ban'}
                  </Text>
                  <Text style={styles.recordReason}>{ban.reason}</Text>
                  <Text style={styles.recordDate}>
                    {formatDate(ban.issuedAt)} - {formatDate(ban.expiresAt)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
  },
  expandIcon: {
    color: theme.colors.vibeBlue,
    fontSize: 12,
    fontFamily: theme.fonts.main,
  },
  loadingText: {
    color: theme.colors.gray,
    fontSize: 14,
    fontFamily: theme.fonts.main,
    textAlign: 'center',
  },
  cleanRecordText: {
    color: theme.colors.vibeGreen,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
    textAlign: 'center',
  },
  subText: {
    color: theme.colors.gray,
    fontSize: 12,
    fontFamily: theme.fonts.main,
    textAlign: 'center',
    marginTop: 4,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
  },
  alertNumber: {
    color: theme.colors.vibeRed,
  },
  statLabel: {
    color: theme.colors.gray,
    fontSize: 11,
    fontFamily: theme.fonts.main,
    textAlign: 'center',
  },
  banStatusButton: {
    backgroundColor: theme.colors.vibeBlue,
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  banStatusText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
  },
  detailsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.darkGray,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: theme.colors.vibeBlue,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
    marginBottom: 6,
  },
  recordItem: {
    backgroundColor: theme.colors.inputBackground,
    padding: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  recordType: {
    color: theme.colors.vibeYellow,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
  },
  inactiveRecord: {
    color: theme.colors.gray,
  },
  activeBanText: {
    color: theme.colors.vibeRed,
  },
  permBanText: {
    color: theme.colors.vibeRed,
  },
  recordReason: {
    color: theme.colors.white,
    fontSize: 11,
    fontFamily: theme.fonts.main,
    marginTop: 2,
  },
  recordDate: {
    color: theme.colors.gray,
    fontSize: 10,
    fontFamily: theme.fonts.main,
    marginTop: 2,
  },
});
