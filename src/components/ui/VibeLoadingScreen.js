import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import theme from '../../theme/themes';

export default function VibeLoadingScreen({ 
  loadingText = 'Loading...',
  showBranding = true,
  size = 'large',
  color = theme.colors.vibeBlue || '#00C6FF'
}) {
  return (
    <View style={styles.container}>
      {showBranding && (
        <View style={styles.brandingContainer}>
          <Text style={styles.brandingText}>BIG</Text>
          <Text style={styles.brandingText}>VIBE</Text>
          <Text style={styles.brandingText}>STUDIOS</Text>
        </View>
      )}
      
      <View style={styles.loadingContainer}>
        <ActivityIndicator 
          size={size} 
          color={color}
        />
        <Text style={styles.loadingText}>{loadingText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  brandingContainer: {
    position: 'absolute',
    top: '10%',
    alignItems: 'center',
  },
  brandingText: {
    color: theme.colors.white,
    fontSize: 42,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 46,
  },
  loadingContainer: {
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