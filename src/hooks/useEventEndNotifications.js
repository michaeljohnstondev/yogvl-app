import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { EventEndNotificationService } from '../services/EventEndNotificationService';
import { useAuth } from '../auth/AuthContext';

/**
 * Hook to manage event end notifications
 * Starts/stops the periodic checking based on auth state and app state
 */
export const useEventEndNotifications = () => {
  // Use try-catch to handle case where AuthProvider isn't available yet
  let isAuthenticated = false;
  let currentUserId = null;
  
  try {
    const authData = useAuth();
    isAuthenticated = authData.isAuthenticated;
    currentUserId = authData.currentUserId;
  } catch (error) {
    // AuthProvider not available yet, which is fine during app initialization
  }
  const cleanupRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  // DISABLED: Start the service when user is authenticated
  // Event end notifications moved to Cloud Functions for better performance
  useEffect(() => {
    if (isAuthenticated && currentUserId) {
      
      // DISABLED - causes battery drain: Start periodic checks
      // cleanupRef.current = EventEndNotificationService.schedulePeriodicCheck();
      console.log('Event end notifications handled by Cloud Functions');
      
      return () => {
        if (cleanupRef.current) {
          cleanupRef.current();
          cleanupRef.current = null;
        }
      };
    } else {
      // Clean up if user logs out
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    }
  }, [isAuthenticated, currentUserId]);

  // Handle app state changes (pause when app is backgrounded)
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        // DISABLED - event end notifications handled by Cloud Functions
        // if (isAuthenticated && currentUserId && !cleanupRef.current) {
        //   cleanupRef.current = EventEndNotificationService.schedulePeriodicCheck();
        // }
      } else if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App has gone to the background
        if (cleanupRef.current) {
          cleanupRef.current();
          cleanupRef.current = null;
        }
      }
      
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [isAuthenticated, currentUserId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, []);

  // Return utility functions for manual control
  return {
    triggerCheck: () => {
      if (isAuthenticated) {
        return EventEndNotificationService.checkAndNotifyEventEnds();
      }
      return Promise.resolve({ success: false, error: 'Not authenticated' });
    },
    
    triggerForEvent: (eventId) => {
      if (isAuthenticated) {
        return EventEndNotificationService.triggerAttendanceNotification(eventId);
      }
      return Promise.resolve({ success: false, error: 'Not authenticated' });
    },
    
    isRunning: () => !!cleanupRef.current,
  };
};