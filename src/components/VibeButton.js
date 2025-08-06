import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../themes/themes';

/**
 * VibeButton (outline variant): transparent fill with gradient border
 * Usage: <VibeButton label="Click Me" onPress={...} />
 */
export default function VibeButton({ label, onPress, style, textStyle }) {
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
});
