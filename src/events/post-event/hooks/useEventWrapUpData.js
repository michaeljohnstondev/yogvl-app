// FILE: useEventWrapUpData.js - Focused hook for event wrap-up data loading
// Follows single responsibility principle and established patterns

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PostEventService } from '../services/PostEventService';
import { useVibeAlert } from '../../../components/ui/base/VibeAlertContext';

/**
 * Hook for managing event wrap-up data loading and user status
 * @param {string} studioId - Studio ID
 * @param {string} eventId - Event ID
 * @param {string} userId - Current user ID
 * @param {Object} options - Hook configuration options
 * @returns {Object} Hook interface with data, loading state, and refresh function
 */
export const useEventWrapUpData = (studioId, eventId, userId, options = {}) => {
  const { enableAutoLoad = true, onDataChange = () => {} } = options;

  const [eventData, setEventData] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [userStatus, setUserStatus] = useState({
    isHost: false,
    hasRatedHost: false,
    hasReportedAttendance: null,
    canRateHost: false,
    canReportAttendance: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const vibeAlert = useVibeAlert();

  // Memoize derived state for performance
  const wrapUpData = useMemo(
    () => ({
      event: eventData,
      participants,
      attendance,
      userStatus,
    }),
    [eventData, participants, attendance, userStatus]
  );

  const isHost = useMemo(() => userStatus.isHost, [userStatus.isHost]);
  const canPerformActions = useMemo(
    () => eventData && !loading,
    [eventData, loading]
  );

  // Load event wrap-up data with useCallback for stable reference
  const loadWrapUpData = useCallback(async () => {
    if (!enableAutoLoad || !studioId || !eventId || !userId) return;

    try {
      setLoading(true);
      setError(null);

      const data = await PostEventService.getEventWrapUpData(
        studioId,
        eventId,
        userId
      );

      setEventData(data.event);
      setParticipants(data.participants);
      setAttendance(data.attendance);
      setUserStatus(data.userStatus);

      // Notify parent of data changes
      onDataChange(data);
    } catch (err) {
      console.error('[useEventWrapUpData] Error loading wrap-up data:', err);
      setError(err);
      vibeAlert.error('Error', 'Failed to load event data');
    } finally {
      setLoading(false);
    }
  }, [studioId, eventId, userId, enableAutoLoad, vibeAlert, onDataChange]);

  // Load data on mount or when dependencies change
  useEffect(() => {
    loadWrapUpData();
  }, [loadWrapUpData]);

  // Update user status (for optimistic updates from other hooks)
  const updateUserStatus = useCallback((updates) => {
    setUserStatus((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  // Refresh data with error handling
  const refreshData = useCallback(async () => {
    try {
      await loadWrapUpData();
      return true;
    } catch (err) {
      console.error('[useEventWrapUpData] Error refreshing data:', err);
      return false;
    }
  }, [loadWrapUpData]);

  return {
    // Data (memoized for performance)
    wrapUpData,
    eventData,
    participants,
    attendance,
    userStatus,

    // Derived state
    isHost,
    canPerformActions,

    // State
    loading,
    error,

    // Actions (memoized with useCallback)
    refreshData,
    updateUserStatus,
    loadWrapUpData,
  };
};
