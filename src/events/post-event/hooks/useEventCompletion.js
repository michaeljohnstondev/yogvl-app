// FILE: useEventCompletion.js - Hook for managing event completion state

import { useState, useEffect } from 'react';
import { PostEventService } from '../services/PostEventService';
import { useVibeAlert } from '../../../components/ui/base/VibeAlertContext';

export const useEventCompletion = (studioId, eventId, userId) => {
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

  // Load event wrap-up data
  useEffect(() => {
    if (studioId && eventId && userId) {
      loadWrapUpData();
    }
  }, [studioId, eventId, userId]);

  const loadWrapUpData = async () => {
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
    } catch (error) {
      console.error('Error loading wrap-up data:', error);
      vibeAlert.error('Error', 'Failed to load event data');
    } finally {
      setLoading(false);
    }
  };

  // Complete event (host only)
  const completeEvent = async (attendeeIds, noShowIds = []) => {
    if (!userStatus.isHost) {
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
      console.error('Error completing event:', error);
      vibeAlert.error('Error', error.message || 'Failed to complete event');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Report attendance (guest only)
  const reportAttendance = async (attended) => {
    if (userStatus.isHost) {
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

      // Update local state
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
      console.error('Error reporting attendance:', error);
      vibeAlert.error('Error', error.message || 'Failed to report attendance');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Submit host rating (guest only)
  const submitHostRating = async (rating) => {
    if (userStatus.isHost) {
      vibeAlert.error('Error', 'You cannot rate yourself');
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

      // Update local state
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
      console.error('Error submitting rating:', error);
      vibeAlert.error('Error', error.message || 'Failed to submit rating');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // Delete event (host only)
  const deleteEvent = async () => {
    if (!userStatus.isHost) {
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
      console.error('Error deleting event:', error);
      vibeAlert.error('Error', error.message || 'Failed to delete event');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    // Data
    eventData,
    participants,
    attendance,
    userStatus,

    // State
    loading,
    submitting,

    // Actions
    completeEvent,
    reportAttendance,
    submitHostRating,
    deleteEvent,
    refreshData: loadWrapUpData,
  };
};
