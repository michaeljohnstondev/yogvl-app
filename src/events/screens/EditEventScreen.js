import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import VibeButton from '../../components/ui/VibeButton';
import theme from '../../theme/themes';

export default function EditEventScreen({ navigation }) {
  return (
    <LinearGradient
      colors={theme.colors.backgroundGradient}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Neon glow icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>⚡</Text>
        </View>

        {/* Title with neon glow */}
        <Text style={[styles.title, theme.shadows.textGlow]}>
          Edit Mode Coming Soon
        </Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          We're rebuilding the edit experience with our new punk aesthetic.
        </Text>

        {/* Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.message}>
            🚀 Create events are being perfected first{'\n'}
            💎 Edit functionality will be back soon{'\n'}
            🌊 Stay tuned for the upgrade!
          </Text>
        </View>

        {/* Back button */}
        <VibeButton
          label="← Back to Events"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
      </View>

      {/* Decorative neon elements */}
      <View style={styles.decorativeElements}>
        <View style={[styles.neonLine, { borderColor: theme.colors.vibeCyan }]} />
        <View style={[styles.neonLine, { borderColor: theme.colors.vibeTurquoise, top: 120 }]} />
        <View style={[styles.neonLine, { borderColor: theme.colors.vibeAqua, top: 240 }]} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  iconContainer: {
    marginBottom: 20,
    padding: 20,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: theme.colors.vibeCyan,
    shadowColor: theme.colors.vibeCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  icon: {
    fontSize: 48,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.vibeCyan,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  messageContainer: {
    backgroundColor: 'rgba(0, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: theme.colors.vibeCyan,
    borderRadius: theme.sizes.borderRadius,
    padding: 20,
    marginBottom: 40,
    shadowColor: theme.colors.vibeCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  message: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
  },
  backButton: {
    minWidth: 200,
  },
  decorativeElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  neonLine: {
    position: 'absolute',
    left: -100,
    right: -100,
    height: 1,
    borderTopWidth: 1,
    opacity: 0.3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
});