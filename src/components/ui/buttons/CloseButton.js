import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import theme from '../../../theme/themes';

/**
 * Reusable CloseButton component for modals and back buttons - optimized for immediate response
 * Usage: <CloseButton onPress={handleClose} /> or <CloseButton onPress={handleBack} children="←" />
 */
export default function CloseButton({
  onPress,
  style,
  textStyle,
  children = '✕',
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.closeButton,
        {
          opacity: pressed ? 0.7 : 1,
          transform: [{ scale: pressed ? 0.95 : 1 }]
        },
        style
      ]}
      onPress={onPress}
      delayPressIn={0}
      delayPressOut={0}
      hitSlop={6}
    >
      <Text style={[styles.closeText, textStyle]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  closeButton: {
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: theme.colors.vibeBlue,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 24,
  },
});
