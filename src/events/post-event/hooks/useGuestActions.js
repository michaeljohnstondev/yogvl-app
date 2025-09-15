// FILE: useGuestActions.js - Focused hook for guest-specific event completion actions
// Follows single responsibility principle for guest operations

import { useState, useCallback } from 'react';
import { PostEventService } from '../services/PostEventService';
import { useVibeAlert } from '../../../components/ui/base/VibeAlertContext';

/**
 * Hook for managing guest-specific event completion actions
 * @param {string} studioId - Studio ID
 * @param {string} eventId - Event ID
 * @param {string} userId - Current user ID (must be guest)
 * @param {Object} eventData - Event data from useEventWrapUpData
 * @param {Object} userStatus - User status from useEventWrapUpData
 * @param {Object} options - Hook configuration options
 * @returns {Object} Hook interface with guest actions and state
 */
export const useGuestActions = (studioId, eventId, userId, eventData, userStatus, options = {}) => {
  const { onActionComplete = () => {} } = options;

  const [submitting, setSubmitting] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(null);

  const vibeAlert = useVibeAlert();

  // Check if user can perform guest actions
  const canPerformGuestActions = !userStatus?.isHost && eventData && !submitting;

  // Report attendance (guest only)
  const reportAttendance = useCallback(async (attended) => {
    if (!canPerformGuestActions) {
      vibeAlert.error('Error', 'Hosts cannot self-report attendance');
      return false;
    }

    try {
      setSubmitting(true);
      setActionInProgress('reporting');

      await PostEventService.handleGuestAttendanceReport(studioId, eventId, userId, attended);

      const message = attended
        ? 'Thanks for confirming you attended!'
        : 'Thanks for letting us know you missed it.';

      vibeAlert.success('Thanks!', message);

      onActionComplete({
        action: 'reportAttendance',
        success: true,
        data: { attended },
      });

      return true;
    } catch (error) {
      console.error('[useGuestActions] Error reporting attendance:', error);
      vibeAlert.error('Error', error.message || 'Failed to report attendance');

      onActionComplete({
        action: 'reportAttendance',
        success: false,
        error,
      });

      return false;
    } finally {
      setSubmitting(false);
      setActionInProgress(null);
    }
  }, [canPerformGuestActions, studioId, eventId, userId, vibeAlert, onActionComplete]);

  // Submit host rating (guest only)
  const submitHostRating = useCallback(async (rating) => {
    if (!canPerformGuestActions) {
      vibeAlert.error('Error', 'You cannot rate yourself');
      return false;
    }

    // Validate rating input
    if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      vibeAlert.error('Error', 'Please provide a valid rating between 1 and 5 stars');
      return false;
    }

    try {
      setSubmitting(true);
      setActionInProgress('rating');

      await PostEventService.submitHostRating(
        studioId,
        eventId,
        eventData.createdBy,
        userId,
        rating
      );

      vibeAlert.success(
        'Thank you!',
        `You rated the host ${rating} star${rating !== 1 ? 's' : ''}!`
      );

      onActionComplete({
        action: 'submitRating',
        success: true,
        data: { rating },
      });

      return true;
    } catch (error) {
      console.error('[useGuestActions] Error submitting rating:', error);
      vibeAlert.error('Error', error.message || 'Failed to submit rating');

      onActionComplete({
        action: 'submitRating',
        success: false,
        error,
      });

      return false;
    } finally {
      setSubmitting(false);
      setActionInProgress(null);
    }
  }, [canPerformGuestActions, studioId, eventId, eventData?.createdBy, userId, vibeAlert, onActionComplete]);

  return {
    // State
    submitting,
    actionInProgress,
    canPerformGuestActions,

    // Actions (memoized with useCallback)
    reportAttendance,
    submitHostRating,
  };
};