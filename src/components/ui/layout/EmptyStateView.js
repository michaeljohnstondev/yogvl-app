import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import VibeButton from '../base/VibeButton';

const EmptyStateView = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🌟</Text>
        <Text style={styles.title}>No Events Yet</Text>
        <Text style={styles.subtitle}>Your social calendar awaits</Text>
        <Text style={styles.description}>
          Discover amazing events happening around you or create your own
          unforgettable experiences.
        </Text>

        <View style={styles.buttonContainer}>
          <VibeButton
            label="CREATE EVENT"
            onPress={() => navigation.navigate('CreateEvent')}
            variant="filled"
            style={styles.primaryButton}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.9,
  },
  description: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
    opacity: 0.8,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    width: '100%',
  },
});

export default EmptyStateView;
