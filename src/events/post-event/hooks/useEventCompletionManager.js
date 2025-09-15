// FILE: useEventCompletionManager.js - Composite hook demonstrating proper hook composition
// Combines focused hooks for complete event completion management

import { useCallback } from 'react';
import { useEventWrapUpData } from './useEventWrapUpData';
import { useAttendanceTracking } from './useAttendanceTracking';
import { useHostActions } from './useHostActions';
import { useGuestActions } from './useGuestActions';

/**
 * Composite hook for complete event completion management
 * Demonstrates proper hook composition and reuse following established patterns
 *
 * @param {string} studioId - Studio ID
 * @param {string} eventId - Event ID
 * @param {string} userId - Current user ID
 * @param {Object} options - Configuration options
 * @returns {Object} Complete interface for event completion management
 */
export const useEventCompletionManager = (studioId, eventId, userId, options = {}) => {
  const {
    enableAutoLoad = true,
    onCompletionStateChange = () => {},
    onAttendanceChange = () => {},
  } = options;

  // 1. Load event wrap-up data
  const {
    wrapUpData,
    eventData,
    participants,
    attendance,
    userStatus,
    isHost,
    canPerformActions,
    loading: dataLoading,
    error: dataError,
    refreshData,
    updateUserStatus,
  } = useEventWrapUpData(studioId, eventId, userId, {
    enableAutoLoad,
    onDataChange: onCompletionStateChange,
  });

  // 2. Handle attendance tracking (primarily for hosts)
  const attendanceTracking = useAttendanceTracking(studioId, eventId, participants, {
    enableAutoLoad: isHost && canPerformActions,
    onAttendanceChange,
  });

  // 3. Handle host-specific actions
  const hostActions = useHostActions(studioId, eventId, userId, userStatus, {
    onActionComplete: useCallback(async (result) => {
      if (result.success) {
        // Update user status optimistically for immediate UI feedback
        if (result.action === 'complete') {
          updateUserStatus({ hasCompletedEvent: true });
        }
        // Refresh data to get latest state
        await refreshData();
      }
      onCompletionStateChange(result);
    }, [updateUserStatus, refreshData, onCompletionStateChange]),
  });

  // 4. Handle guest-specific actions
  const guestActions = useGuestActions(studioId, eventId, userId, eventData, userStatus, {
    onActionComplete: useCallback(async (result) => {
      if (result.success) {
        // Update user status optimistically for immediate UI feedback
        if (result.action === 'reportAttendance') {
          updateUserStatus({
            hasReportedAttendance: result.data.attended ? 'attended' : 'missed'
          });
        } else if (result.action === 'submitRating') {
          updateUserStatus({ hasRatedHost: true });
        }
        // Refresh data to get latest state
        await refreshData();
      }
      onCompletionStateChange(result);
    }, [updateUserStatus, refreshData, onCompletionStateChange]),
  });

  // Combined host completion action that uses attendance tracking
  const completeEventWithAttendance = useCallback(async () => {
    if (!hostActions.canPerformHostActions) return false;

    const validation = attendanceTracking.validateAttendance();
    if (!validation.valid) {
      return false;
    }

    const { attendeeIds, noShowIds } = attendanceTracking.attendanceLists;
    return await hostActions.completeEvent(attendeeIds, noShowIds);
  }, [
    hostActions.canPerformHostActions,
    hostActions.completeEvent,
    attendanceTracking.validateAttendance,
    attendanceTracking.attendanceLists,
  ]);

  // Combined loading state
  const loading = dataLoading || hostActions.submitting || guestActions.submitting;

  return {
    // Data from wrap-up data hook
    wrapUpData,
    eventData,
    participants,
    attendance,
    userStatus,
    isHost,
    canPerformActions,

    // State
    loading,
    dataError,
    submitting: hostActions.submitting || guestActions.submitting,
    actionInProgress: hostActions.actionInProgress || guestActions.actionInProgress,

    // Attendance tracking (for hosts)
    attendanceTracking: isHost ? attendanceTracking : null,

    // Host actions
    hostActions: isHost ? {
      ...hostActions,
      completeEventWithAttendance,
    } : null,

    // Guest actions
    guestActions: !isHost ? guestActions : null,

    // Shared actions
    refreshData,
  };
};