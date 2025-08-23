// components/ReliabilityWarning.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getReliabilityWarning } from '../../lib/eventValidation';

const ReliabilityWarning = ({ userData, context = 'general', style }) => {
  const warning = getReliabilityWarning(userData);

  if (!warning.shouldWarn) return null;

  const getContextMessage = () => {
    const noShows = userData?.noShows || 0;

    switch (context) {
      case 'create':
        return `⚠️ You have ${noShows} no-shows on record. Creating quality events helps build trust with attendees.`;

      case 'join':
        return `⚠️ You have ${noShows} no-shows on record. Please make sure you can attend events you join.`;

      case 'profile':
        return `⚠️ ${warning.message}`;

      default:
        return `⚠️ ${warning.message}`;
    }
  };

  const getWarningIcon = () => {
    switch (warning.level) {
      case 'restricted':
        return '🚫';
      case 'warning':
        return '⚠️';
      case 'caution':
        return '⚡';
      default:
        return '⚠️';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: warning.color }, style]}>
      <Text style={styles.icon}>{getWarningIcon()}</Text>
      <Text style={styles.text}>{getContextMessage()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  icon: {
    fontSize: 18,
    marginRight: 8,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});

export default ReliabilityWarning;
