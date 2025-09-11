import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import theme from '../../../theme/themes';

export default function ManageNotificationsButton({ onPress, style }) {
  return (
    <Pressable
      style={[styles.button, style]}
      onPress={onPress}
    >
      <Text style={styles.buttonText}>🔔 Manage Notifications</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    backgroundColor: 'rgba(0, 198, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue || '#00C6FF',
    alignItems: 'center',
  },
  buttonText: {
    color: theme.colors.vibeBlue || '#00C6FF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },
});