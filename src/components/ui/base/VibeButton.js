import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../../theme/themes';

/**
 * VibeButton with variants:
 * - default: transparent fill with gradient border (cyan/blue)
 * - toggle: toggle-style button with color parameter
 * - red: red button with orange border for destructive actions
 * - green: green button with cyan border for positive actions (forest green gradient)
 * Usage:
 * <VibeButton label="Click Me" onPress={...} />
 * <VibeButton onPress={...}>Click Me</VibeButton>
 * <VibeButton label="Toggle" onPress={...} variant="toggle" color="purple" />
 * <VibeButton label="Delete" onPress={...} variant="red" />
 * <VibeButton label="Join Event" onPress={...} variant="green" />
 */
export default function VibeButton({
  label,
  children,
  onPress,
  style,
  textStyle,
  variant = 'default',
  color = 'blue',
  disabled = false,
}) {
  // Support both label prop and children
  const buttonText = label || children;
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
        disabled={disabled}
        delayPressIn={0}
        delayPressOut={0}
        hitSlop={4}
        style={({ pressed }) => [
          styles.toggleButton,
          { borderColor: themeColor },
          { opacity: pressed ? 0.7 : disabled ? 0.5 : 1 },
          { transform: [{ scale: pressed ? 0.98 : 1 }] },
          style,
        ]}
      >
        <Text style={[styles.toggleText, { color: themeColor }, textStyle]}>
          {buttonText}
        </Text>
      </Pressable>
    );
  }

  if (variant === 'red') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        delayPressIn={0}
        delayPressOut={0}
        hitSlop={4}
        style={({ pressed }) => [
          {
            opacity: pressed ? 0.7 : disabled ? 0.5 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }]
          },
          style
        ]}
      >
        <View style={styles.redOuterBorder}>
          <View style={styles.redSolidFill}>
            <View style={styles.buttonContent}>
              <Text style={[styles.text, textStyle]}>{buttonText}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  if (variant === 'green') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        delayPressIn={0}
        delayPressOut={0}
        hitSlop={4}
        style={({ pressed }) => [
          {
            opacity: pressed ? 0.7 : disabled ? 0.5 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }]
          },
          style
        ]}
      >
        <View style={styles.greenOuterBorder}>
          <View style={styles.greenSolidFill}>
            <View style={styles.buttonContent}>
              <Text style={[styles.text, textStyle]}>{buttonText}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  // Default variant (existing gradient button) - optimized for immediate response
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      delayPressIn={0}
      delayPressOut={0}
      hitSlop={4}
      style={({ pressed }) => [
        {
          opacity: (pressed && !disabled) ? 0.7 : 1,
          transform: [{ scale: (pressed && !disabled) ? 0.98 : 1 }]
        },
        style
      ]}
    >
      <View style={styles.outerBorder}>
        <View style={styles.gradientBorder}>
          <View style={styles.buttonContent}>
            <Text style={[styles.text, textStyle]}>{buttonText}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Default variant styles
  outerBorder: {
    borderBottomWidth: 4,
    borderLeftWidth: 3,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#00FFFF',
    borderRadius: theme.sizes.buttonRadius,
    marginVertical: 10,
  },
  gradientBorder: {
    borderRadius: theme.sizes.buttonRadius - 4,
    padding: 3,
    marginBottom: -0.5,
    marginLeft: -0.5,
    backgroundColor: '#0072ff',
    overflow: 'hidden',
  },
  buttonContent: {
    backgroundColor: 'transparent',
    borderRadius: theme.sizes.buttonRadius - 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    overflow: 'hidden',
  },
  text: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
  },

  // Toggle variant styles
  toggleButton: {
    borderWidth: 3,
    borderRadius: theme.sizes.buttonRadius,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Dark transparent blacklight
    marginVertical: 0,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
    textAlign: 'center',
  },

  // Red variant styles (for destructive actions like delete/block)
  redOuterBorder: {
    borderBottomWidth: 4,
    borderLeftWidth: 3,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#FFCC66', // Orange/yellow border
    borderRadius: theme.sizes.buttonRadius,
    marginVertical: 10,
  },
  redGradientBorder: {
    borderRadius: theme.sizes.buttonRadius - 4,
    padding: 2,
    marginBottom: -0.5,
    marginLeft: -0.5,
    overflow: 'hidden',
  },
  redSolidFill: {
    backgroundColor: '#CC0033', // Solid red (lightest from gradient)
    borderRadius: theme.sizes.buttonRadius - 4,
    padding: 2,
    marginBottom: -0.5,
    marginLeft: -0.5,
    overflow: 'hidden',
  },

  // Green variant styles (for positive actions like join/accept with forest green gradient)
  greenOuterBorder: {
    borderBottomWidth: 4,
    borderLeftWidth: 3,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#00FF41', // Vibe green border
    borderRadius: theme.sizes.buttonRadius,
    marginVertical: 10,
  },
  greenGradientBorder: {
    borderRadius: theme.sizes.buttonRadius - 4,
    padding: 2,
    marginBottom: -0.5,
    marginLeft: -0.5,
    overflow: 'hidden',
  },
  greenSolidFill: {
    backgroundColor: '#228B22', // Forest green - deeper, more saturated
    borderRadius: theme.sizes.buttonRadius - 4,
    padding: 2,
    marginBottom: -0.5,
    marginLeft: -0.5,
    overflow: 'hidden',
  },
});
