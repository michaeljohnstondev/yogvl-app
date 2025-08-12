import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import VibeButton from '../components/vibeComponents/VibeButton';
import { useNavigation } from '@react-navigation/native';
import theme from '../themes/themes';
export default function LandingScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <LinearGradient
        colors={theme.colors.backgroundGradient}
        style={styles.background}
        pointerEvents="none"
      />

      <Text style={styles.title}>Big Vibe Studios</Text>

      <View style={styles.buttonGroup}>
        <VibeButton
          label="Log In"
          onPress={() => navigation.navigate('Login')}
        />
        <VibeButton
          label="Sign Up"
          onPress={() => navigation.navigate('SignUp')}
        />
        <Pressable style={styles.browse}>
          <Text style={styles.browseText}>Just Browse</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

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
    fontSize: 64,
    fontWeight: '900',
    fontFamily: theme.fonts.main,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 55,
    textShadowColor: theme.shadows.textGlow.textShadowColor,
    textShadowOffset: theme.shadows.textGlow.textShadowOffset,
    textShadowRadius: theme.shadows.textGlow.textShadowRadius,
  },
  buttonGroup: {
    width: '100%',
    gap: 20,
  },
  browse: {
    marginTop: 28,
    alignItems: 'center',
  },
  browseText: {
    fontFamily: theme.fonts.main,
    color: theme.colors.textSecondary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
