// FILE: hooks/useRealtimeNotifications.js

import { useState, useEffect, useCallback, useRef } from 'react';
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

  // Debouncing refs
  const debounceTimeoutRef = useRef(null);
  const lastUpdateRef = useRef(null);
  const cacheRef = useRef(new Map());

  const { limitCount = 100, unreadOnly = false, includeRead = true } = options;

  // Debounced update function to prevent excessive re-renders
  const debouncedUpdate = useCallback((notificationsList, actualUnreadCount) => {
    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Check cache to avoid unnecessary updates
    const cacheKey = `${userId}_${notificationsList.length}_${actualUnreadCount}`;
    const cachedData = cacheRef.current.get(cacheKey);

    if (cachedData && Date.now() - cachedData.timestamp < 5000) {
      // Use cached data if it's less than 5 seconds old
      return;
    }

    // Debounce updates to prevent rapid-fire state changes
    debounceTimeoutRef.current = setTimeout(() => {
      setNotifications(notificationsList);
      setUnreadCount(actualUnreadCount);
      setIsLoading(false);
      setError(null);

      // Cache this result
      cacheRef.current.set(cacheKey, {
        notifications: notificationsList,
        unreadCount: actualUnreadCount,
        timestamp: Date.now()
      });

      // Clean old cache entries
      if (cacheRef.current.size > 10) {
        const entries = Array.from(cacheRef.current.entries());
        entries.slice(0, 5).forEach(([key]) => cacheRef.current.delete(key));
      }

      // Debug logging removed for production
    }, 300); // 300ms debounce
  }, [userId]);

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

      // Set up real-time listener with debounced updates
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

          // Count actual unread notifications
          const actualUnreadCount = notificationsList.filter(
            (n) => !n.read
          ).length;

          // Use debounced update instead of direct state setting
          debouncedUpdate(notificationsList, actualUnreadCount);
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

      // Clear debounce timeout to prevent memory leaks
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }

      // Clear cache for this user
      const keysToDelete = Array.from(cacheRef.current.keys())
        .filter(key => key.startsWith(`${userId}_`));
      keysToDelete.forEach(key => cacheRef.current.delete(key));
    };
  }, [userId, limitCount, unreadOnly, includeRead, debouncedUpdate]);

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
