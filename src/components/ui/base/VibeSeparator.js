import React from 'react';
import { View, StyleSheet } from 'react-native';
import theme from '../../../theme/themes';

export default function VibeSeparator({ style }) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 50,
    marginBottom: 20,
    paddingHorizontal: 10, // Inset from edges
  },
  line: {
    height: 1,
    backgroundColor: theme.colors.vibeBlue || '#00C6FF',
    opacity: 0.3,
  },
});
