import { useMemo } from 'react';
import { getEventStatus, getStatusColor, isPastEvent, isEventFull } from '../lib/eventUtils';

/**
 * Custom hook for calculating event status information
 * Memoizes expensive status calculations to prevent unnecessary rerenders
 *
 * @param {Object} event - Event object
 * @returns {Object} - Event status information
 */
export const useEventStatus = (event) => {
  // Memoize event status calculation
  const eventStatus = useMemo(() => {
    if (!event) return null;
    return getEventStatus(event);
  }, [event]);

  // Memoize status color calculation
  const statusColor = useMemo(() => {
    if (!eventStatus) return null;
    return getStatusColor(eventStatus);
  }, [eventStatus]);

  // Memoize past event check
  const isEventPast = useMemo(() => {
    if (!event) return false;
    return isPastEvent(event);
  }, [event]);

  // Memoize full event check
  const isFullEvent = useMemo(() => {
    if (!event) return false;
    return isEventFull(event);
  }, [event]);

  return {
    eventStatus,
    statusColor,
    isEventPast,
    isFullEvent,
  };
};