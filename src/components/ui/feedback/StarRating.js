// FILE: StarRating.js - Reusable 5-star rating component

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import theme from '../../../theme/themes';

const StarRating = ({
  title = 'Rate',
  description,
  onRating,
  disabled = false,
  showLabels = true,
  leftLabel = 'Poor',
  rightLabel = 'Excellent',
  style,
  starSize = 32,
}) => {
  return (
    <View style={[styles.container, style]}>
      {title && <Text style={styles.title}>{title}</Text>}
      {description && <Text style={styles.description}>{description}</Text>}

      <View style={styles.starRating}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            style={styles.starButton}
            onPress={() => !disabled && onRating?.(star)}
            disabled={disabled}
          >
            <Text style={[styles.starText, { fontSize: starSize }]}>⭐</Text>
          </TouchableOpacity>
        ))}
      </View>

      {showLabels && (
        <View style={styles.ratingLabels}>
          <Text style={styles.ratingLabel}>{leftLabel}</Text>
          <Text style={styles.ratingLabel}>{rightLabel}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: theme.colors.gray,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  starRating: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  starButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  starText: {
    fontSize: 32,
    opacity: 0.3,
  },
  ratingLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  ratingLabel: {
    fontSize: 12,
    color: theme.colors.gray,
    fontStyle: 'italic',
  },
});

export default StarRating;
