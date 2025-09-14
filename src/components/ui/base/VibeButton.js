import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../../theme/themes';

/**
 * VibeButton with variants:
 * - default: transparent fill with gradient border
 * - toggle: toggle-style button with color parameter
 * Usage:
 * <VibeButton label="Click Me" onPress={...} />
 * <VibeButton label="Toggle" onPress={...} variant="toggle" color="purple" />
 */
export default function VibeButton({
  label,
  onPress,
  style,
  textStyle,
  variant = 'default',
  color = 'blue',
}) {
  // Get color values based on color parameter
  const getColorValues = (colorName) => {
    const colorMap = {
      blue: theme.colors.vibeBlue,
      green: theme.colors.vibeGreen,
      orange: theme.colors.vibeOrange,
      purple: theme.colors.vibePurple,
      yellow: theme.colors.vibeYellow,
      pink: theme.colors.vibePink,
      red: theme.colors.vibeRed,
      cyan: theme.colors.vibeCyan,
      turquoise: theme.colors.vibeTurquoise,
      aqua: theme.colors.vibeAqua,
      teal: theme.colors.vibeTeal,
      gray: theme.colors.gray,
    };
    return colorMap[colorName] || theme.colors.vibeBlue;
  };

  if (variant === 'toggle') {
    const themeColor = getColorValues(color);
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.toggleButton,
          { borderColor: themeColor },
          { opacity: pressed ? 0.8 : 1 },
          style,
        ]}
      >
        <Text style={[styles.toggleText, { color: themeColor }, textStyle]}>
          {label}
        </Text>
      </Pressable>
    );
  }

  // Default variant (existing gradient button)
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }, style]}
    >
      <LinearGradient
        colors={theme.colors.buttonGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBorder}
      >
        <View style={styles.buttonContent}>
          <Text style={[styles.text, textStyle]}>{label}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Default variant styles
  gradientBorder: {
    borderRadius: theme.sizes.buttonRadius,
    padding: 2,
    marginVertical: 10,
  },
  buttonContent: {
    backgroundColor: 'transparent',
    borderRadius: theme.sizes.buttonRadius,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  text: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
  },

  // Toggle variant styles
  toggleButton: {
    borderWidth: 2,
    borderRadius: theme.sizes.buttonRadius,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginVertical: 0,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
    textAlign: 'center',
  },
});
