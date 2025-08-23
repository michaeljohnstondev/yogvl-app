import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../theme/themes';

export default function BigVibCelebration() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in when entering screen
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Start infinite pulsing and color shifting
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
        Animated.timing(colorAnim, { toValue: 1, duration: 4000, useNativeDriver: false, useNativeDriver: false })
      ])
    ).start();
  }, []);

  const interpolateColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FF00FF', '#00FFFF'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}> 
      <LinearGradient
        colors={["#080B1E", "#1A053E", "#0B1125"]}
        style={styles.background}
        pointerEvents="none"
      />

      <Animated.View style={[styles.circle, { transform: [{ scale: pulseAnim }], backgroundColor: interpolateColor }]} />

      <Text style={styles.title}>🎉 BIG VIBE CELEBRATION 🎉</Text>
      <Text style={styles.subtitle}>We crushed it today!</Text>
    </Animated.View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    fontFamily: theme.fonts.main,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 24,
    textShadowColor: theme.shadows.textGlow.textShadowColor,
    textShadowOffset: theme.shadows.textGlow.textShadowOffset,
    textShadowRadius: theme.shadows.textGlow.textShadowRadius,
  },
  subtitle: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.main,
    textAlign: 'center',
  },
  circle: {
    position: 'absolute',
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    opacity: 0.2,
  },
});
