// FILE: hooks/useRealtimeNotifications.js

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../auth/services/firebase';

export const useRealtimeNotifications = (userId, options = {}) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const {
    limitCount = 100,
    unreadOnly = false,
    includeRead = true,
  } = options;

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build query for notifications
      let notificationQuery = query(
        collection(db, 'users', userId, 'notifications'),
        orderBy('createdAt', 'desc')
      );

      // Add filters
      if (unreadOnly) {
        notificationQuery = query(notificationQuery, where('read', '==', false));
      }

      // Add limit
      if (limitCount) {
        notificationQuery = query(notificationQuery, limit(limitCount));
      }

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        notificationQuery,
        (snapshot) => {
          const notificationsList = [];

          snapshot.docs.forEach((doc) => {
            const data = doc.data();
            const notification = {
              id: doc.id,
              ...data,
              // Convert Firebase Timestamp to JS Date
              createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
            };

            notificationsList.push(notification);
          });

          setNotifications(notificationsList);
          
          // Count total notifications since we no longer use read/unread
          setUnreadCount(notificationsList.length);
          
          setIsLoading(false);
          setError(null);

          // Debug logging
          console.log(`[useRealtimeNotifications] Real-time update: ${notificationsList.length} notifications`);
        },
        (err) => {
          console.error('Error in real-time notifications listener:', err);
          setError(err);
          setIsLoading(false);
        }
      );

      return unsubscribe;
    } catch (err) {
      console.error('Error setting up real-time notifications:', err);
      setError(err);
      setIsLoading(false);
    }
  }, [userId, limitCount, unreadOnly, includeRead]);


  const refreshNotifications = useCallback(() => {
    // With real-time listeners, manual refresh isn't needed
    // But we can keep this for compatibility
    console.log('[useRealtimeNotifications] Manual refresh requested (using real-time data)');
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refreshNotifications,
  };
};