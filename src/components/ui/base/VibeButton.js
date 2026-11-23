import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import theme from '../../../theme/themes';
import { useTheme } from '../../../theme/ThemeContext';

/**
 * VibeButton — one flat matte fill, no borders, in both themes.
 *
 * The variant only picks the colour (from theme.semantic.buttonPalette):
 * - default / filled / primary / etc: blue
 * - red: destructive actions (delete, block)
 * - green: positive actions (join, accept)
 * - toggle: uses the `color` prop (blue, teal, purple, green, red, ...)
 *
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
  const { theme: active } = useTheme();
  const p = active.semantic.buttonPalette;
  const fill =
    variant === 'red' ? p.red
      : variant === 'green' ? p.green
        : variant === 'toggle' ? p[color] || p.blue
          : p.blue;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: fill,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !disabled ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      <Text style={[styles.text, textStyle]}>{label || children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.sizes.buttonRadius,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginVertical: 10,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
    letterSpacing: 0.5,
  },
});
