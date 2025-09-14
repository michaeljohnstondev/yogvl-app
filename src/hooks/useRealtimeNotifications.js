// FILE: hooks/useRealtimeNotifications.js

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';

export const useRealtimeNotifications = (userId, options = {}) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const { limitCount = 100, unreadOnly = false, includeRead = true } = options;

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    let unsubscribe = null;

    try {
      // Build query for notifications with optimized limits
      const effectiveLimit = Math.min(limitCount || 50, 100); // Cap at 100 for performance

      let notificationQuery = query(
        collection(db, 'users', userId, 'notifications'),
        orderBy('createdAt', 'desc'),
        limit(effectiveLimit) // Always include limit for performance
      );

      // Add filters
      if (unreadOnly) {
        notificationQuery = query(
          collection(db, 'users', userId, 'notifications'),
          where('read', '==', false),
          orderBy('createdAt', 'desc'),
          limit(effectiveLimit)
        );
      }

      // Set up real-time listener
      unsubscribe = onSnapshot(
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

          // Count actual unread notifications
          const actualUnreadCount = notificationsList.filter(
            (n) => !n.read
          ).length;
          setUnreadCount(actualUnreadCount);

          setIsLoading(false);
          setError(null);

          // Debug logging (reduced frequency)
          if (notificationsList.length > 0) {
            console.log(
              `[useRealtimeNotifications] ${notificationsList.length} notifications (${actualUnreadCount} unread)`
            );
          }
        },
        (err) => {
          console.error('Error in real-time notifications listener:', err);
          setError(err);
          setIsLoading(false);
        }
      );
    } catch (err) {
      console.error('Error setting up real-time notifications:', err);
      setError(err);
      setIsLoading(false);
    }

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
        console.log(
          '[useRealtimeNotifications] Cleaned up listener for user:',
          userId
        );
      }
    };
  }, [userId, limitCount, unreadOnly, includeRead]);

  const refreshNotifications = useCallback(() => {
    // With real-time listeners, manual refresh isn't needed
    // But we can keep this for compatibility
    console.log(
      '[useRealtimeNotifications] Manual refresh requested (using real-time data)'
    );
  }, []);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refreshNotifications,
  };
};
