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
    console.log('[useEventEndNotifications] AuthProvider not ready yet');
  }
  const cleanupRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  // Start the service when user is authenticated
  useEffect(() => {
    if (isAuthenticated && currentUserId) {
      console.log('[useEventEndNotifications] Starting event end notification service');
      
      // Start periodic checks
      cleanupRef.current = EventEndNotificationService.schedulePeriodicCheck();
      
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
      console.log('[useEventEndNotifications] App state changed:', appStateRef.current, '->', nextAppState);
      
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground
        if (isAuthenticated && currentUserId && !cleanupRef.current) {
          console.log('[useEventEndNotifications] App became active, restarting service');
          cleanupRef.current = EventEndNotificationService.schedulePeriodicCheck();
        }
      } else if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App has gone to the background
        if (cleanupRef.current) {
          console.log('[useEventEndNotifications] App went to background, stopping service');
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