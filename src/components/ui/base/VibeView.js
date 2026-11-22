/**
 * VibeView - Simple view wrapper with background gradient
 *
 * Use this component when you need a basic container with:
 * - flex: 1 layout
 * - BVS background gradient
 * - No additional UI elements (headers, titles, etc.)
 *
 * For screens that need headers/navigation, build them separately.
 * For the main App wrapper, use VibeAppWrapper instead.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../theme/ThemeContext';

export default function VibeView({ children, style, ...otherProps }) {
  const { theme } = useTheme();
  return (
    <LinearGradient
      colors={theme.semantic.backgroundGradient}
      style={[styles.container, style]}
      {...otherProps}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});