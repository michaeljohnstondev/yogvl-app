// FILE: components/notifications/NotificationButton.js

import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { getUserNotifications } from '../../services/notifications';
import { useAuth } from '../../auth/AuthContext';
import NotificationBadge from './NotificationBadge';
import theme from '../../theme/themes';

export default function NotificationButton({ onPress, style, iconComponent }) {
  const { currentUserId } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!currentUserId) return;

    const loadUnreadCount = async () => {
      try {
        const notifications = await getUserNotifications(currentUserId, {
          unreadOnly: true,
          limitCount: 100, // Reasonable limit for counting
        });
        setUnreadCount(notifications.length);
      } catch (error) {
        console.error('Error loading unread notifications:', error);
      }
    };

    loadUnreadCount();

    // Set up interval to refresh count periodically
    const interval = setInterval(loadUnreadCount, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [currentUserId]);

  const handlePress = () => {
    onPress && onPress();
  };

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
}

const styles = StyleSheet.create({
  button: {
    position: 'relative',
    padding: 8,
  },
});