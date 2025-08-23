import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { UserDataCleanupService } from '../../services/UserDataCleanupService';
import { DataCleanupService } from '../../services/DataCleanupService';
import VibeButton from '../ui/VibeButton';
import theme from '../../theme/themes';

export default function DataCleanupPanel() {
  const [userStats, setUserStats] = useState(null);
  const [cleanupResults, setCleanupResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadUserStats = async () => {
    try {
      setLoading(true);
      const stats = await UserDataCleanupService.getDeprecatedDataStats();
      setUserStats(stats);
    } catch (error) {
      Alert.alert('Error', 'Failed to load user data stats');
    } finally {
      setLoading(false);
    }
  };

  const runUserDataCleanup = () => {
    Alert.alert(
      'Clean User Data',
      'This will remove deprecated fields from all user documents. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clean Up',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const results = await UserDataCleanupService.cleanupAllUserDocuments();
              setCleanupResults(results);
              Alert.alert(
                'Cleanup Complete',
                `Cleaned ${results.cleanedUsers} of ${results.totalUsers} users`
              );
              // Refresh stats
              await loadUserStats();
            } catch (error) {
              Alert.alert('Error', 'Cleanup failed: ' + error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const runEventCleanup = () => {
    Alert.alert(
      'Archive Old Events',
      'This will archive events older than 90 days. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const archived = await DataCleanupService.archiveOldEvents();
              Alert.alert(
                'Archival Complete',
                `Archived ${archived} old events`
              );
            } catch (error) {
              Alert.alert('Error', 'Archival failed: ' + error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const StatCard = ({ title, value, description }) => (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {description && <Text style={styles.statDescription}>{description}</Text>}
    </View>
  );

  return (
    <LinearGradient
      colors={theme.colors.backgroundGradient}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>🧹 Data Cleanup Panel</Text>
        <Text style={styles.subtitle}>
          Remove deprecated fields and archive old data
        </Text>

        {/* Load Stats Button */}
        <VibeButton
          label={loading ? 'Loading...' : 'Load Current Stats'}
          onPress={loadUserStats}
          disabled={loading}
          style={styles.button}
        />

        {/* User Data Stats */}
        {userStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 User Data Statistics</Text>
            
            <View style={styles.statsGrid}>
              <StatCard
                title="Total Users"
                value={userStats.totalUsers}
              />
              
              <StatCard
                title="Need Cleanup"
                value={userStats.usersWithDeprecatedFields}
                description="Users with old flags"
              />
              
              <StatCard
                title="Need Migration"
                value={userStats.usersNeedingMigration}
                description="Flags but missing data"
              />
            </View>

            {/* Deprecated Fields Breakdown */}
            <View style={styles.fieldBreakdown}>
              <Text style={styles.subsectionTitle}>Deprecated Fields Found:</Text>
              {Object.entries(userStats.fieldCounts).map(([field, count]) => (
                count > 0 && (
                  <View key={field} style={styles.fieldRow}>
                    <Text style={styles.fieldName}>{field}</Text>
                    <Text style={styles.fieldCount}>{count} users</Text>
                  </View>
                )
              ))}
            </View>
          </View>
        )}

        {/* Cleanup Actions */}
        {userStats && userStats.usersWithDeprecatedFields > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🗑️ Cleanup Actions</Text>
            
            <VibeButton
              label={`Clean Up ${userStats.usersWithDeprecatedFields} Users`}
              onPress={runUserDataCleanup}
              disabled={loading}
              variant="outline"
              style={styles.button}
            />
            
            <Text style={styles.warningText}>
              ⚠️ This will remove deprecated fields like hasCompletedContactInfo,
              hasSelectedLocation, dismissedTips, etc.
            </Text>
          </View>
        )}

        {/* Event Cleanup */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Event Management</Text>
          
          <VibeButton
            label="Archive Old Events (90+ days)"
            onPress={runEventCleanup}
            disabled={loading}
            variant="outline"
            style={styles.button}
          />
          
          <Text style={styles.infoText}>
            💡 This archives old events to keep the database efficient
          </Text>
        </View>

        {/* Results */}
        {cleanupResults && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✅ Last Cleanup Results</Text>
            
            <View style={styles.resultsContainer}>
              <Text style={styles.resultText}>
                Total Users: {cleanupResults.totalUsers}
              </Text>
              <Text style={styles.resultText}>
                Cleaned: {cleanupResults.cleanedUsers}
              </Text>
              <Text style={styles.resultText}>
                Already Clean: {cleanupResults.alreadyCleanUsers}
              </Text>
              {cleanupResults.errors.length > 0 && (
                <Text style={styles.errorText}>
                  Errors: {cleanupResults.errors.length}
                </Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
  },
  section: {
    marginVertical: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  button: {
    marginVertical: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.vibeBlue,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  statDescription: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  fieldBreakdown: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  fieldName: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  fieldCount: {
    fontSize: 12,
    color: theme.colors.vibeBlue,
    fontWeight: '500',
  },
  warningText: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 8,
    lineHeight: 16,
  },
  infoText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 8,
    lineHeight: 16,
  },
  resultsContainer: {
    backgroundColor: 'rgba(0, 255, 150, 0.1)',
    borderRadius: 8,
    padding: 12,
  },
  resultText: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#FF6B6B',
    marginBottom: 4,
  },
});