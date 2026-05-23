// components/events/utils/eventStatus.js

/**
 * Resolve an event's effective end time: start + eventDuration (minutes).
 * Backwards-compat: if eventDuration is missing/0, returns the start time
 * (legacy "event ends at start" behavior).
 *
 * @param {Object} event - Event with eventTimestamp and optional eventDuration
 * @returns {Date|null}
 */
export const getEventEndTime = (event) => {
  if (!event?.eventTimestamp) return null;
  const start = event.eventTimestamp.toDate
    ? event.eventTimestamp.toDate()
    : new Date(event.eventTimestamp);
  const durationMin = Number(event.eventDuration) || 0;
  return new Date(start.getTime() + durationMin * 60 * 1000);
};

/**
 * Get the current status of an event
 * @param {Object} event - Event object with eventTimestamp and status
 * @returns {string} Event status: 'Upcoming', 'Starting Soon', 'Live', 'Completed', 'Ended', 'Unknown'
 */
export const getEventStatus = (event) => {
  if (!event?.eventTimestamp) return 'Unknown';

  const start = event.eventTimestamp.toDate();
  const end = getEventEndTime(event);
  const now = new Date();

  // Past — fully over
  if (end && now > end) {
    return event.status === 'completed' ? 'Completed' : 'Ended';
  }

  // Currently happening (has a real duration and we're between start and end)
  const durationMin = Number(event.eventDuration) || 0;
  if (durationMin > 0 && now >= start && (!end || now <= end)) {
    return 'Live';
  }

  const hoursDiff = (start - now) / (1000 * 60 * 60);

  if (hoursDiff <= 1 && hoursDiff > 0) {
    return 'Starting Soon';
  }

  return 'Upcoming';
};

/**
 * Get the color associated with an event status
 * @param {string} status - Event status
 * @returns {string} Hex color code
 */
export const getStatusColor = (status) => {
  switch (status) {
    case 'Completed':
      return '#4CAF50';
    case 'Ended':
      return '#888';
    case 'Starting Soon':
      return '#FF9800';
    case 'Upcoming':
      return '#2196F3';
    default:
      return '#9E9E9E';
  }
};

/**
 * Check if an event has fully ended (past start + duration).
 * Events with no eventDuration fall back to legacy "ends at start" behavior.
 * @param {Object} event - Event object with eventTimestamp and optional eventDuration
 * @returns {boolean} True if event is in the past
 */
export const isPastEvent = (event) => {
  if (!event?.eventTimestamp) return false;
  const end = getEventEndTime(event);
  return end != null && end < new Date();
};

/**
 * Check if an event is at capacity
 * @param {Object} event - Event object with maxGuests and subscriberCount
 * @returns {boolean} True if event is full
 */
export const isEventFull = (event) => {
  if (!event?.maxGuests) return false;
  return (event.subscriberCount || 0) >= event.maxGuests;
};

/**
 * Check if an event is happening soon (within next hour)
 * @param {Object} event - Event object with eventTimestamp
 * @returns {boolean} True if event starts within an hour
 */
export const isEventStartingSoon = (event) => {
  if (!event?.eventTimestamp || isPastEvent(event)) return false;

  const eventDate = event.eventTimestamp.toDate();
  const now = new Date();
  const hoursDiff = (eventDate - now) / (1000 * 60 * 60);

  return hoursDiff <= 1 && hoursDiff > 0;
};

/**
 * Get time until event starts
 * @param {Object} event - Event object with eventTimestamp
 * @returns {Object} Object with days, hours, minutes until event
 */
export const getTimeUntilEvent = (event) => {
  if (!event?.eventTimestamp) return null;

  const eventDate = event.eventTimestamp.toDate();
  const now = new Date();
  const diff = eventDate - now;

  if (diff <= 0) return null;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes };
};

/**
 * Format time until event in a readable string
 * @param {Object} event - Event object with eventTimestamp
 * @returns {string} Formatted time string or null if past event
 */
export const formatTimeUntilEvent = (event) => {
  const timeUntil = getTimeUntilEvent(event);
  if (!timeUntil) return null;

  const { days, hours, minutes } = timeUntil;

  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''} away`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} away`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} away`;
  } else {
    return 'Starting now';
  }
};
