// FILE: useEventCompletion.js - OPTIMIZED VERSION
// Hook for managing event completion state with better performance and separation

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PostEventService } from '../services/PostEventService';
import { useVibeAlert } from '../../../components/ui/base/VibeAlertContext';

export const useEventCompletion = (studioId, eventId, userId, options = {}) => {
  const { enableAutoLoad = true, onStateChange = () => {} } = options;

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
  const [submitting, setSubmitting] = useState(false);

  const vibeAlert = useVibeAlert();

  // Memoize derived state for performance
  const canPerformHostActions = useMemo(
    () => userStatus.isHost && eventData && !submitting,
    [userStatus.isHost, eventData, submitting]
  );

  const canPerformGuestActions = useMemo(
    () => !userStatus.isHost && eventData && !submitting,
    [userStatus.isHost, eventData, submitting]
  );

  const eventCompletionData = useMemo(
    () => ({
      eventData,
      participants,
      attendance,
      userStatus,
      canPerformHostActions,
      canPerformGuestActions,
    }),
    [
      eventData,
      participants,
      attendance,
      userStatus,
      canPerformHostActions,
      canPerformGuestActions,
    ]
  );

  // Load event wrap-up data with useCallback for stable reference
  const loadWrapUpData = useCallback(async () => {
    if (!enableAutoLoad || !studioId || !eventId || !userId) return;

    try {
      setLoading(true);
      const wrapUpData = await PostEventService.getEventWrapUpData(
        studioId,
        eventId,
        userId
      );

      setEventData(wrapUpData.event);
      setParticipants(wrapUpData.participants);
      setAttendance(wrapUpData.attendance);
      setUserStatus(wrapUpData.userStatus);

      // Notify parent of state changes
      onStateChange(wrapUpData);
    } catch (error) {
      console.error('[useEventCompletion] Error loading wrap-up data:', error);
      vibeAlert.error('Error', 'Failed to load event data');
    } finally {
      setLoading(false);
    }
  }, [studioId, eventId, userId, enableAutoLoad, vibeAlert, onStateChange]);

  // Load data on mount or when dependencies change
  useEffect(() => {
    loadWrapUpData();
  }, [loadWrapUpData]);

  // Complete event (host only) with optimized callback
  const completeEvent = useCallback(
    async (attendeeIds, noShowIds = []) => {
      if (!canPerformHostActions) {
        vibeAlert.error('Error', 'Only the event host can complete an event');
        return false;
      }

      try {
        setSubmitting(true);

        await PostEventService.completeEvent(
          studioId,
          eventId,
          userId,
          attendeeIds,
          noShowIds
        );

        // Reload data to reflect completion
        await loadWrapUpData();

        vibeAlert.success(
          'Event Completed!',
          `Event completed with ${attendeeIds.length} attendee${attendeeIds.length === 1 ? '' : 's'}.`
        );

        return true;
      } catch (error) {
        console.error('[useEventCompletion] Error completing event:', error);
        vibeAlert.error('Error', error.message || 'Failed to complete event');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [
      canPerformHostActions,
      studioId,
      eventId,
      userId,
      loadWrapUpData,
      vibeAlert,
    ]
  );

  // Report attendance (guest only) with optimized callback
  const reportAttendance = useCallback(
    async (attended) => {
      if (!canPerformGuestActions) {
        vibeAlert.error('Error', 'Hosts cannot self-report attendance');
        return false;
      }

      try {
        setSubmitting(true);

        await PostEventService.handleGuestAttendanceReport(
          studioId,
          eventId,
          userId,
          attended
        );

        // Update local state optimistically
        setUserStatus((prev) => ({
          ...prev,
          hasReportedAttendance: attended ? 'attended' : 'missed',
        }));

        const message = attended
          ? 'Thanks for confirming you attended!'
          : 'Thanks for letting us know you missed it.';

        vibeAlert.success('Thanks!', message);

        return true;
      } catch (error) {
        console.error(
          '[useEventCompletion] Error reporting attendance:',
          error
        );
        vibeAlert.error(
          'Error',
          error.message || 'Failed to report attendance'
        );
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [canPerformGuestActions, studioId, eventId, userId, vibeAlert]
  );

  // Submit host rating (guest only) with optimized callback
  const submitHostRating = useCallback(
    async (rating) => {
      if (!canPerformGuestActions) {
        vibeAlert.error('Error', 'You cannot rate yourself');
        return false;
      }

      // Validate rating input
      if (!rating || rating < 1 || rating > 5) {
        vibeAlert.error(
          'Error',
          'Please provide a valid rating between 1 and 5 stars'
        );
        return false;
      }

      try {
        setSubmitting(true);

        await PostEventService.submitHostRating(
          studioId,
          eventId,
          eventData.createdBy,
          userId,
          rating
        );

        // Update local state optimistically
        setUserStatus((prev) => ({
          ...prev,
          hasRatedHost: true,
        }));

        vibeAlert.success(
          'Thank you!',
          `You rated the host ${rating} star${rating !== 1 ? 's' : ''}!`
        );

        return true;
      } catch (error) {
        console.error('[useEventCompletion] Error submitting rating:', error);
        vibeAlert.error('Error', error.message || 'Failed to submit rating');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [
      canPerformGuestActions,
      studioId,
      eventId,
      eventData?.createdBy,
      userId,
      vibeAlert,
    ]
  );

  // Delete event (host only) with optimized callback
  const deleteEvent = useCallback(async () => {
    if (!canPerformHostActions) {
      vibeAlert.error('Error', 'Only the event host can delete an event');
      return false;
    }

    try {
      setSubmitting(true);

      await PostEventService.deleteEvent(studioId, eventId, userId);

      vibeAlert.success(
        'Event Deleted',
        'The event has been permanently deleted.'
      );

      return true;
    } catch (error) {
      console.error('[useEventCompletion] Error deleting event:', error);
      vibeAlert.error('Error', error.message || 'Failed to delete event');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [canPerformHostActions, studioId, eventId, userId, vibeAlert]);

  // Refresh data with error handling
  const refreshData = useCallback(async () => {
    try {
      await loadWrapUpData();
      return true;
    } catch (error) {
      console.error('[useEventCompletion] Error refreshing data:', error);
      return false;
    }
  }, [loadWrapUpData]);

  return {
    // Data (memoized for performance)
    ...eventCompletionData,

    // State
    loading,
    submitting,

    // Actions (all memoized with useCallback)
    completeEvent,
    reportAttendance,
    submitHostRating,
    deleteEvent,
    refreshData,
    loadWrapUpData,
  };
};
