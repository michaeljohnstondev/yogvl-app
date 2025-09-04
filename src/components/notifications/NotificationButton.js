// FILE: components/notifications/NotificationButton.js

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useRealtimeNotificationsContext } from '../../contexts/RealtimeNotificationsContext';
import NotificationBadge from './NotificationBadge';
import theme from '../../theme/themes';

const NotificationButton = React.memo(function NotificationButton({ onPress, style, iconComponent }) {
  // Use shared real-time notifications context
  const { unreadCount } = useRealtimeNotificationsContext();

  const handlePress = React.useCallback(() => {
    onPress && onPress();
  }, [onPress]);

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {iconComponent}
      <NotificationBadge count={unreadCount} />
    </TouchableOpacity>
  );
});

export default NotificationButton;

const styles = StyleSheet.create({
  button: {
    position: 'relative',
    padding: 8,
  },
});