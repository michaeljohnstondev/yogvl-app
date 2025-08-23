// FILE: components/notifications/NotificationBadge.js

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import theme from '../../theme/themes';

export default function NotificationBadge({ count, style, textStyle, maxCount = 99 }) {
  if (!count || count <= 0) {
    return null;
  }

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  return (
    <View style={[styles.badge, style]}>
      <Text style={[styles.badgeText, textStyle]}>
        {displayCount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: theme.colors.vibeRed,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    position: 'absolute',
    top: -8,
    right: -8,
    zIndex: 10,
  },
  badgeText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});