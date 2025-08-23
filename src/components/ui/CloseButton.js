import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import theme from '../../theme/themes';

/**
 * Reusable CloseButton component for modals
 * Usage: <CloseButton onPress={handleClose} />
 */
export default function CloseButton({ onPress, style, textStyle }) {
  return (
    <TouchableOpacity
      style={[styles.closeButton, style]}
      onPress={onPress}
    >
      <Text style={[styles.closeText, textStyle]}>✕</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 18,
  },
});