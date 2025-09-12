import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { ReliabilityService } from '../../services/ReliabilityService';
import theme from '../../../theme/themes';

export default function ReliabilityWarning({ userData, style }) {
  const reliabilityData = ReliabilityService.getUserReliabilityDisplay(userData);
  const warning = reliabilityData.warning;

  if (!warning) return null;

  const getWarningStyles = (level) => {
    switch (level) {
      case 'critical':
        return {
          backgroundColor: 'rgba(244, 67, 54, 0.1)',
          borderColor: '#F44336',
          icon: '🚨',
        };
      case 'warning':
        return {
          backgroundColor: 'rgba(255, 152, 0, 0.1)',
          borderColor: '#FF9800',
          icon: '⚠️',
        };
      case 'caution':
        return {
          backgroundColor: 'rgba(255, 193, 7, 0.1)',
          borderColor: '#FFC107',
          icon: '⚡',
        };
      default:
        return {
          backgroundColor: 'rgba(255, 152, 0, 0.1)',
          borderColor: '#FF9800',
          icon: '⚠️',
        };
    }
  };

  const warningStyles = getWarningStyles(warning.level);

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: warningStyles.backgroundColor,
        borderColor: warningStyles.borderColor,
      },
      style
    ]}>
      <Text style={styles.icon}>{warningStyles.icon}</Text>
      <View style={styles.content}>
        <Text style={[styles.title, { color: warning.color }]}>
          {warning.title}
        </Text>
        <Text style={styles.message}>{warning.message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    marginVertical: 4,
  },
  icon: {
    fontSize: 18,
    marginRight: 10,
    marginTop: 1,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 16,
  },
});