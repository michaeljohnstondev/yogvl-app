import React from 'react';
import { View, Text, ActivityIndicator, ImageBackground, StyleSheet } from 'react-native';
import theme from '../../../theme/themes';

export default function VibeLoadingScreen({
  loadingText = 'Loading...',
  showBranding = true,
  size = 'large',
  color = theme.colors.vibeBlue || '#00C6FF',
}) {
  return (
    <View style={styles.container}>
      {/* Image background with absolute positioning to prevent layout shift */}
      <ImageBackground
        source={require('../../../../assets/splash.png')}
        style={styles.splashBackground}
        resizeMode="cover"
        fadeDuration={0}
      />

      {/* Loading indicator at bottom */}
      <View style={styles.loadingContainer}>
        <ActivityIndicator size={size} color={color} />
        {loadingText && <Text style={styles.loadingText}>{loadingText}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000814', // Match splash background for seamless transition
  },
  splashBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.white,
    fontSize: 16,
    marginTop: 16,
    opacity: 0.8,
    textAlign: 'center',
  },
});
