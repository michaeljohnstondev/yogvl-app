import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { ReliabilityService } from '../../services/ReliabilityService';
import theme from '../../../theme/themes';

export default function ReliabilityBadge({ 
  userData, 
  onPress, 
  size = 'medium', // 'small', 'medium', 'large'
  showLabel = true,
  style 
}) {
  const reliabilityData = ReliabilityService.getUserReliabilityDisplay(userData);
  const { score, tier, displayText, shortDisplayText, isNewUser } = reliabilityData;

  const sizes = {
    small: {
      container: { paddingHorizontal: 8, paddingVertical: 4 },
      text: { fontSize: 12 },
      emoji: { fontSize: 12 },
    },
    medium: {
      container: { paddingHorizontal: 12, paddingVertical: 6 },
      text: { fontSize: 14 },
      emoji: { fontSize: 14 },
    },
    large: {
      container: { paddingHorizontal: 16, paddingVertical: 8 },
      text: { fontSize: 16 },
      emoji: { fontSize: 16 },
    },
  };

  const sizeStyle = sizes[size] || sizes.medium;

  const BadgeContent = () => (
    <View style={[
      styles.container, 
      sizeStyle.container,
      { backgroundColor: `${tier.color}20`, borderColor: tier.color },
      style
    ]}>
      <Text style={[styles.score, sizeStyle.text, { color: tier.color }]}>
        {showLabel ? displayText : shortDisplayText}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress}>
        <BadgeContent />
      </TouchableOpacity>
    );
  }

  return <BadgeContent />;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  emoji: {
    fontWeight: 'bold',
  },
  score: {
    fontWeight: '600',
  },
});