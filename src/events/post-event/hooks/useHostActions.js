// FILE: useHostActions.js - Focused hook for host-specific event completion actions
// Follows single responsibility principle for host operations

import { useState, useCallback } from 'react';
import { PostEventService } from '../services/PostEventService';
import { useVibeAlert } from '../../../components/ui/base/VibeAlertContext';

/**
 * Hook for managing host-specific event completion actions
 * @param {string} studioId - Studio ID
 * @param {string} eventId - Event ID
 * @param {string} userId - Current user ID (must be host)
 * @param {Object} userStatus - User status from useEventWrapUpData
 * @param {Object} options - Hook configuration options
 * @returns {Object} Hook interface with host actions and state
 */
export const useHostActions = (
  studioId,
  eventId,
  userId,
  userStatus,
  options = {}
) => {
  const { onActionComplete = () => {} } = options;

  const [submitting, setSubmitting] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(null);

  const vibeAlert = useVibeAlert();

  // Check if user can perform host actions
  const canPerformHostActions = userStatus?.isHost && !submitting;

  // Complete event with attendance data
  const completeEvent = useCallback(
    async (attendeeIds, noShowIds = []) => {
      if (!canPerformHostActions) {
        vibeAlert.error('Error', 'Only the event host can complete an event');
        return false;
      }

      try {
        setSubmitting(true);
        setActionInProgress('completing');

        await PostEventService.completeEvent(
          studioId,
          eventId,
          userId,
          attendeeIds,
          noShowIds
        );

        vibeAlert.success(
          'Event Completed!',
          `Event completed with ${attendeeIds.length} attendee${attendeeIds.length === 1 ? '' : 's'}.`
        );

        // Notify parent component
        onActionComplete({
          action: 'complete',
          success: true,
          data: { attendeeIds, noShowIds },
        });

        return true;
      } catch (error) {
        console.error('[useHostActions] Error completing event:', error);
        vibeAlert.error('Error', error.message || 'Failed to complete event');

        onActionComplete({
          action: 'complete',
          success: false,
          error,
        });

        return false;
      } finally {
        setSubmitting(false);
        setActionInProgress(null);
      }
    },
    [
      canPerformHostActions,
      studioId,
      eventId,
      userId,
      vibeAlert,
      onActionComplete,
    ]
  );

  // Delete event
  const deleteEvent = useCallback(async () => {
    if (!canPerformHostActions) {
      vibeAlert.error('Error', 'Only the event host can delete an event');
      return false;
    }

    try {
      setSubmitting(true);
      setActionInProgress('deleting');

      await PostEventService.deleteEvent(studioId, eventId, userId);

      vibeAlert.success(
        'Event Deleted',
        'The event has been permanently deleted.'
      );

      onActionComplete({
        action: 'delete',
        success: true,
      });

      return true;
    } catch (error) {
      console.error('[useHostActions] Error deleting event:', error);
      vibeAlert.error('Error', error.message || 'Failed to delete event');

      onActionComplete({
        action: 'delete',
        success: false,
        error,
      });

      return false;
    } finally {
      setSubmitting(false);
      setActionInProgress(null);
    }
  }, [
    canPerformHostActions,
    studioId,
    eventId,
    userId,
    vibeAlert,
    onActionComplete,
  ]);

  return {
    // State
    submitting,
    actionInProgress,
    canPerformHostActions,

    // Actions (memoized with useCallback)
    completeEvent,
    deleteEvent,
  };
};
