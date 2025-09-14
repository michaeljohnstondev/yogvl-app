import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import theme from '../../../theme/themes';

/**
 * Reusable CloseButton component for modals and back buttons
 * Usage: <CloseButton onPress={handleClose} /> or <CloseButton onPress={handleBack} children="←" />
 */
export default function CloseButton({
  onPress,
  style,
  textStyle,
  children = '✕',
}) {
  return (
    <TouchableOpacity style={[styles.closeButton, style]} onPress={onPress}>
      <Text style={[styles.closeText, textStyle]}>{children}</Text>
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
