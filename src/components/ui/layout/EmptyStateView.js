import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

const EmptyStateView = () => {
  const screenHeight = Dimensions.get('window').height;
  // Use percentage-based offset for better iPad/tablet support
  const contentOffset = screenHeight * -0.15; // Shift up by 15% of screen height

  return (
    <View style={styles.container}>
      <View style={[styles.content, { marginTop: contentOffset }]}>
        <Text style={styles.emoji}>🌟</Text>
        <Text style={styles.title}>No Events Yet</Text>
        <Text style={styles.subtitle}>Your social calendar awaits</Text>
        <Text style={styles.description}>
          Discover amazing events happening around you or create your own
          unforgettable experiences.
        </Text>
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
    opacity: 0.8,
  },
});

export default EmptyStateView;
