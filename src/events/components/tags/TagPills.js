// Event-detail pill row for tags. Each pill shows the tag name; blue
// border + blue text when the viewer hasn't added it to their
// interests, green + check when they have. Tap toggles — same handler
// the title/venue stars use, so the dual-write to user prefs + studio
// interest index goes through the existing service. Renders nothing
// for legacy events without a tags field (backward compatible).

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import theme from '../../../theme/themes';

const TagPill = ({ tag, isInterested, onPress }) => {
  // Bounce the check on transition from off → on. Off → no anim.
  const scale = useRef(new Animated.Value(isInterested ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(scale, {
      toValue: isInterested ? 1 : 0,
      useNativeDriver: true,
      friction: 5,
      tension: 140,
    }).start();
  }, [isInterested, scale]);

  const color = isInterested ? theme.colors.vibeGreen : theme.colors.vibeBlue;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.pill,
        {
          borderColor: color,
          backgroundColor: isInterested
            ? 'rgba(0, 255, 136, 0.10)'
            : 'rgba(0, 212, 255, 0.08)',
        },
      ]}
      accessibilityLabel={`${tag} tag, ${
        isInterested ? 'tap to remove from interests' : 'tap to add to interests'
      }`}
    >
      <Animated.View
        style={[
          styles.check,
          {
            transform: [{ scale }],
            opacity: scale,
          },
        ]}
      >
        <Text style={[styles.checkText, { color }]}>✓</Text>
      </Animated.View>
      <Text style={[styles.pillText, { color }]}>{tag}</Text>
    </TouchableOpacity>
  );
};

const TagPills = ({ tags, userInterests, onInterestToggle }) => {
  if (!Array.isArray(tags) || tags.length === 0) return null;

  const interestSet = new Set(
    (userInterests || []).map((i) => (i || '').toLowerCase().trim())
  );

  return (
    <View style={styles.row}>
      {tags.map((tag) => {
        const key = (tag || '').toLowerCase().trim();
        if (!key) return null;
        const isInterested = interestSet.has(key);
        return (
          <TagPill
            key={key}
            tag={key}
            isInterested={isInterested}
            onPress={() => onInterestToggle && onInterestToggle(key)}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 6,
  },
  pillText: {
    fontFamily: theme.fonts.main,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'lowercase',
  },
  check: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    fontFamily: theme.fonts.main,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 14,
  },
});

export default TagPills;
