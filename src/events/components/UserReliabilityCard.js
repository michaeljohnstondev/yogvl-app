import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getUserEventStats } from '../lib/userMetrics';
import theme from '../../theme/themes';

const UserReliabilityCard = ({ userData, style }) => {
  const stats = getUserEventStats(userData);

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>Event Activity</Text>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.eventsCreated}</Text>
          <Text style={styles.statLabel}>Created</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.eventsAttended}</Text>
          <Text style={styles.statLabel}>Attended</Text>
        </View>
      </View>
    </View>
  );
};

const UserReliabilityMini = ({ userData, style }) => {
  const stats = getUserEventStats(userData);

  return (
    <View style={[styles.miniContainer, style]}>
      <Text style={styles.miniBadge}>{stats.reliabilityStatus.badge}</Text>
      <Text style={styles.miniScore}>{stats.reliabilityScore}%</Text>
      {stats.noShows > 0 && (
        <Text style={styles.miniNoShows}>{stats.noShows} no-shows</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: theme.sizes.borderRadius,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 10,
    borderWidth: 2,
    borderColor: theme.colors.vibeBlue,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  reliabilityContainer: {
    marginBottom: 16,
  },
  reliabilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reliabilityBadge: {
    fontSize: 20,
  },
  reliabilityText: {
    fontSize: 16,
    fontWeight: '600',
  },
  reliabilityScore: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    backgroundColor: theme.colors.darkGray,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  warningContainer: {
    backgroundColor: '#FF9800',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  warningText: {
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  miniContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 8,
    padding: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  miniBadge: {
    fontSize: 14,
  },
  miniScore: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  miniNoShows: {
    color: '#F44336',
    fontSize: 10,
  },
});

export { UserReliabilityCard, UserReliabilityMini };
