import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';

// Plain themed loader. The Big Vibe Studios splash art was retired —
// `showBranding` is kept in the signature so existing callers don't break.
// eslint-disable-next-line no-unused-vars
export default function VibeLoadingScreen({ loadingText = 'Loading...', showBranding, size = 'large', color }) {
  const { theme } = useTheme();
  const t = theme.semantic;

  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>
      <ActivityIndicator size={size} color={color || t.accent} />
      {loadingText ? (
        <Text style={[styles.loadingText, { color: t.textMuted }]}>{loadingText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
});
