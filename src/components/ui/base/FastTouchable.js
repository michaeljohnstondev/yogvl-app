import React from 'react';
import { Pressable } from 'react-native';

/**
 * FastTouchable - Optimized touchable component for immediate responsiveness
 *
 * Provides immediate visual feedback with zero delay press handling
 * Use this wrapper for any touchable that needs instant response
 *
 * Usage:
 * <FastTouchable onPress={handlePress} style={styles.button}>
 *   <Text>Button Text</Text>
 * </FastTouchable>
 */
export default function FastTouchable({
  children,
  onPress,
  style,
  disabled = false,
  hitSlop = 4,
  opacity = 0.7,
  scale = 0.98,
  ...otherProps
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      delayPressIn={0}
      delayPressOut={0}
      hitSlop={hitSlop}
      style={({ pressed }) => [
        typeof style === 'function' ? style({ pressed }) : style,
        !disabled && pressed && {
          opacity: opacity,
          transform: [{ scale: scale }]
        },
        disabled && {
          opacity: 0.5
        }
      ]}
      {...otherProps}
    >
      {children}
    </Pressable>
  );
}

/**
 * FastTouchableOpacity - Drop-in replacement for TouchableOpacity with immediate response
 *
 * Usage:
 * <FastTouchableOpacity onPress={handlePress} style={styles.button}>
 *   <Text>Button Text</Text>
 * </FastTouchableOpacity>
 */
export function FastTouchableOpacity({
  children,
  onPress,
  style,
  disabled = false,
  activeOpacity = 0.7,
  hitSlop = 4,
  ...otherProps
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      delayPressIn={0}
      delayPressOut={0}
      hitSlop={hitSlop}
      style={({ pressed }) => [
        style,
        !disabled && pressed && { opacity: activeOpacity },
        disabled && { opacity: 0.5 }
      ]}
      {...otherProps}
    >
      {children}
    </Pressable>
  );
}