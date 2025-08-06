import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function BrainstormCard({ title, tags = [] }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {tags.length > 0 && (
        <Text style={styles.tags}>
          {tags.map((tag) => `#${tag}`).join(' ')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  tags: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
});
