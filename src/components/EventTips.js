// components/EventTips.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Simple progress component for showing user stats
const EventFormProgress = ({ userData, style }) => {
  const eventsCreated = userData?.eventsCreated || 0;
  const eventsAttended = userData?.eventsAttended || 0;

  const getProgressMessage = () => {
    if (eventsCreated === 0) {
      return 'This will be your first event! 🎉';
    }

    if (eventsCreated === 1) {
      return 'Creating your second event! Keep it up! 🚀';
    }

    if (eventsCreated < 5) {
      return `You've created ${eventsCreated} events. You're getting the hang of this! 🌟`;
    }

    return `Wow! ${eventsCreated} events created and ${eventsAttended} attended. You're a community builder! 🏆`;
  };

  return (
    <View style={[styles.progressContainer, style]}>
      <Text style={styles.progressText}>{getProgressMessage()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  progressContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  progressText: {
    color: '#2196F3',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export { EventFormProgress };
export default EventFormProgress;
