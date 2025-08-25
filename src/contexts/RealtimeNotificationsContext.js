// FILE: contexts/RealtimeNotificationsContext.js

import React, { createContext, useContext } from 'react';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { useAuth } from '../auth/AuthContext';

const RealtimeNotificationsContext = createContext();

export const RealtimeNotificationsProvider = ({ children }) => {
  const { currentUserId } = useAuth();
  
  const notificationData = useRealtimeNotifications(currentUserId, {
    limitCount: 100,
    unreadOnly: false,
  });

  return (
    <RealtimeNotificationsContext.Provider value={notificationData}>
      {children}
    </RealtimeNotificationsContext.Provider>
  );
};

export const useRealtimeNotificationsContext = () => {
  const context = useContext(RealtimeNotificationsContext);
  if (!context) {
    throw new Error('useRealtimeNotificationsContext must be used within RealtimeNotificationsProvider');
  }
  return context;
};