// FILE: contexts/RealtimeNotificationsContext.js

import React, { createContext, useContext, useMemo } from 'react';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { useAuth } from '../auth/AuthContext';

const RealtimeNotificationsContext = createContext();

export const RealtimeNotificationsProvider = ({ children }) => {
  const { currentUserId } = useAuth();

  const notificationData = useRealtimeNotifications(currentUserId, {
    limitCount: 100,
    unreadOnly: false,
  });

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      notifications: notificationData.notifications,
      unreadCount: notificationData.unreadCount,
      isLoading: notificationData.isLoading,
      error: notificationData.error,
      refreshNotifications: notificationData.refreshNotifications,
    }),
    [
      notificationData.notifications,
      notificationData.unreadCount,
      notificationData.isLoading,
      notificationData.error,
      notificationData.refreshNotifications,
    ]
  );

  return (
    <RealtimeNotificationsContext.Provider value={contextValue}>
      {children}
    </RealtimeNotificationsContext.Provider>
  );
};

export const useRealtimeNotificationsContext = () => {
  const context = useContext(RealtimeNotificationsContext);
  if (!context) {
    throw new Error(
      'useRealtimeNotificationsContext must be used within RealtimeNotificationsProvider'
    );
  }
  return context;
};
