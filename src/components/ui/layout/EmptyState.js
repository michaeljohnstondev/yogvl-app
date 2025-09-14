import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const EmptyState = ({ message, style }) => {
  return (
    <View style={[styles.emptyContainer, style]}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default EmptyState;
