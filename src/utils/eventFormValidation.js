// eventFormValidation.js
import { DateTime } from 'luxon';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Validate event date and time specifically
 * @param {Object} formData - Form data containing date/time info
 * @returns {Object} Validation result with isValid flag and message
 */
export const validateEventDateTime = (formData) => {
  const {
    date,
    time,
    dateSelected,
    timeSelected,
    hasRsvpDeadline,
    rsvpDeadline,
    rsvpDeadlineSelected,
  } = formData;

  // Check date and time selection
  if (!dateSelected) {
    return {
      isValid: false,
      message: 'Please select a date for your event',
    };
  }

  if (!timeSelected) {
    return {
      isValid: false,
      message: 'Please select a time for your event',
    };
  }

  // Validate that the event is in the future
  if (date && time && dateSelected && timeSelected) {
    const eventDateTime = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      time.getHours(),
      time.getMinutes()
    );

    const now = new Date();
    const minutesDiff = (eventDateTime - now) / (1000 * 60);

    if (minutesDiff < 0) {
      return {
        isValid: false,
        message: 'Event date and time must be in the future',
      };
    }

    if (minutesDiff < 30) {
      return {
        isValid: false,
        message: 'Event must be at least 30 minutes in the future',
      };
    }
  }

  // Validate RSVP deadline if enabled
  if (hasRsvpDeadline) {
    if (!rsvpDeadlineSelected) {
      return {
        isValid: false,
        message: 'Please select an RSVP deadline date and time',
      };
    }

    const eventDateTime = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      time.getHours(),
      time.getMinutes()
    );

    const deadlineDateTime = new Date(
      rsvpDeadline.getFullYear(),
      rsvpDeadline.getMonth(),
      rsvpDeadline.getDate(),
      rsvpDeadline.getHours(),
      rsvpDeadline.getMinutes()
    );

    if (deadlineDateTime >= eventDateTime) {
      return {
        isValid: false,
        message: 'RSVP deadline must be before the event starts',
      };
    }

    const now = new Date();
    if (deadlineDateTime <= now) {
      return {
        isValid: false,
        message: 'RSVP deadline must be in the future',
      };
    }
  }

  return {
    isValid: true,
    message: 'Date and time are valid',
  };
};

/**
 * Validate event form data
 * @param {Object} formData - Form data to validate
 * @returns {Object} Validation result with isValid flag and message
 */
export const validateEventForm = (formData) => {
  const {
    title,
    location,
    date,
    time,
    dateSelected,
    timeSelected,
    maxGuests,
    hasFee,
    entryFee,
    hasRsvpDeadline,
    rsvpDeadline,
    rsvpDeadlineSelected,
    address,
  } = formData;

  // Check required fields
  if (!title || title.trim().length === 0) {
    return {
      isValid: false,
      message: 'Event name is required',
    };
  }

  if (title.trim().length > 100) {
    return {
      isValid: false,
      message: 'Event name must be 100 characters or less',
    };
  }

  if (!location || location.trim().length === 0) {
    return {
      isValid: false,
      message: 'Location is required',
    };
  }

  if (location.trim().length > 200) {
    return {
      isValid: false,
      message: 'Location must be 200 characters or less',
    };
  }

  // Validate address if provided
  if (address && address.trim().length > 300) {
    return {
      isValid: false,
      message: 'Address must be 300 characters or less',
    };
  }

  // Check date and time selection
  if (!dateSelected) {
    return {
      isValid: false,
      message: 'Please select a date for your event',
    };
  }

  if (!timeSelected) {
    return {
      isValid: false,
      message: 'Please select a time for your event',
    };
  }

  // Use dedicated date/time validation function
  const dateTimeValidation = validateEventDateTime(formData);
  if (!dateTimeValidation.isValid) {
    return dateTimeValidation;
  }

  // Validate max guests if provided
  if (maxGuests && maxGuests.trim().length > 0) {
    const maxGuestsNum = parseInt(maxGuests);
    if (isNaN(maxGuestsNum) || maxGuestsNum < 1) {
      return {
        isValid: false,
        message: 'Max guests must be a positive number',
      };
    }
    if (maxGuestsNum > 9999) {
      return {
        isValid: false,
        message: 'Max guests cannot exceed 9999',
      };
    }
  }

  // Validate entry fee if paid event
  if (hasFee) {
    if (!entryFee || entryFee.trim().length === 0) {
      return {
        isValid: false,
        message: 'Entry fee amount is required for paid events',
      };
    }

    // Basic fee validation - you might want to make this more sophisticated
    const feeValue = parseFloat(entryFee.replace(/[$,]/g, ''));
    if (isNaN(feeValue) || feeValue < 0) {
      return {
        isValid: false,
        message: 'Entry fee must be a valid amount',
      };
    }

    if (feeValue > 10000) {
      return {
        isValid: false,
        message: 'Entry fee cannot exceed $10,000',
      };
    }
  }

  // All validation passed
  return {
    isValid: true,
    message: 'Form is valid',
  };
};

/**
 * Format event data for database storage
 * @param {Object} formData - Form data
 * @param {string} currentUserId - Current user ID
 * @returns {Object} Formatted event data
 */
export const formatEventForStorage = (formData, currentUserId) => {
  const {
    title,
    location,
    details,
    date,
    time,
    maxGuests,
    hasFee,
    entryFee,
    feeDescription,
    isPrivate,
    additionalHosts,
    showHostContact,
    address,
    hasRsvpDeadline,
    rsvpDeadline,
    rsvpDeadlineSelected,
  } = formData;

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Format main event date/time
  const combined = DateTime.fromObject(
    {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: time.getHours(),
      minute: time.getMinutes(),
    },
    { zone: timeZone }
  );

  const utcDateTime = combined.toUTC().toISO();

  // Format RSVP deadline if enabled
  let rsvpDeadlineData = {};
  if (hasRsvpDeadline && rsvpDeadlineSelected) {
    const rsvpCombined = DateTime.fromObject(
      {
        year: rsvpDeadline.getFullYear(),
        month: rsvpDeadline.getMonth() + 1,
        day: rsvpDeadline.getDate(),
        hour: rsvpDeadline.getHours(),
        minute: rsvpDeadline.getMinutes(),
      },
      { zone: timeZone }
    );

    rsvpDeadlineData = {
      hasRsvpDeadline: true,
      rsvpDeadlineUTC: rsvpCombined.toUTC().toISO(),
      rsvpDeadlineTimestamp: new Date(rsvpCombined.toUTC().toISO()),
      rsvpDeadlineTimeZone: timeZone,
      rsvpOriginalDate: rsvpCombined.toFormat('yyyy-MM-dd'),
      rsvpOriginalTime: rsvpCombined.toFormat('HH:mm'),
    };
  } else {
    rsvpDeadlineData = {
      hasRsvpDeadline: false,
      rsvpDeadlineUTC: null,
      rsvpDeadlineTimestamp: null,
      rsvpDeadlineTimeZone: null,
      rsvpOriginalDate: null,
      rsvpOriginalTime: null,
    };
  }

  // Combine all hosts (primary + additional)
  const allHosts = [currentUserId, ...(additionalHosts || [])];
  const uniqueHosts = [...new Set(allHosts)]; // Remove duplicates

  return {
    // Basic event info
    title: title.trim(),
    location: location.trim(),
    address: address ? address.trim() : '',
    desc: details.trim(),

    // Date/time info
    utcDateTime: utcDateTime,
    eventTimestamp: new Date(utcDateTime),
    eventTimeZone: timeZone,
    originalDate: combined.toFormat('yyyy-MM-dd'),
    originalTime: combined.toFormat('HH:mm'),

    // Capacity and fees
    maxGuests: maxGuests ? parseInt(maxGuests) : null,
    hasFee: hasFee ?? false,
    entryFee: entryFee || '',
    feeDescription: feeDescription || '',

    // Host and privacy settings
    createdBy: currentUserId,
    hostId: currentUserId, // Primary host
    hosts: uniqueHosts, // All hosts (primary + additional)
    additionalHosts: additionalHosts || [], // Additional hosts only
    isPrivate: isPrivate ?? false,
    showHostContact: showHostContact ?? true,

    // RSVP deadline
    ...rsvpDeadlineData,

    // Event management
    subscribers: [currentUserId],
    subscriberCount: 1,
    attendeeCount: 0,
    noShowCount: 0,
    status: 'upcoming',

    // Metadata
    createdAt: null, // Will be set in the create handler
  };
};

/**
 * Add a co-host to an event
 * @param {string} eventId - Event ID
 * @param {string} userId - User ID to add as co-host
 */
export const addCoHost = async (eventId, userId) => {
  const eventRef = doc(db, 'events', eventId);

  try {
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) throw new Error('Event not found');

    const eventData = eventSnap.data();
    const currentHosts = eventData.hosts || [];
    const currentAdditionalHosts = eventData.additionalHosts || [];

    if (!currentHosts.includes(userId)) {
      await updateDoc(eventRef, {
        hosts: [...currentHosts, userId],
        additionalHosts: [...currentAdditionalHosts, userId],
      });
    }
  } catch (error) {
    console.error('Error adding co-host:', error);
    throw error;
  }
};

/**
 * Remove a co-host from an event (cannot remove primary host)
 * @param {string} eventId - Event ID
 * @param {string} userId - User ID to remove as co-host
 */
export const removeCoHost = async (eventId, userId) => {
  const eventRef = doc(db, 'events', eventId);

  try {
    const eventSnap = await getDoc(eventRef);
    if (!eventSnap.exists()) throw new Error('Event not found');

    const eventData = eventSnap.data();

    // Don't allow removing the primary host
    if (eventData.hostId === userId) {
      throw new Error('Cannot remove primary host');
    }

    const updatedHosts = (eventData.hosts || []).filter(
      (hostId) => hostId !== userId
    );

    const updatedAdditionalHosts = (eventData.additionalHosts || []).filter(
      (hostId) => hostId !== userId
    );

    await updateDoc(eventRef, {
      hosts: updatedHosts,
      additionalHosts: updatedAdditionalHosts,
    });
  } catch (error) {
    console.error('Error removing co-host:', error);
    throw error;
  }
};

/**
 * Check if a user is a host of an event
 * @param {Object} eventData - Event data object
 * @param {string} userId - User ID to check
 * @returns {boolean} True if user is a host
 */
export const isEventHost = (eventData, userId) => {
  if (!eventData || !userId) return false;

  return (
    eventData.hostId === userId ||
    (eventData.hosts && eventData.hosts.includes(userId))
  );
};

/**
 * Check if a user is the primary host of an event
 * @param {Object} eventData - Event data object
 * @param {string} userId - User ID to check
 * @returns {boolean} True if user is the primary host
 */
export const isPrimaryHost = (eventData, userId) => {
  if (!eventData || !userId) return false;
  return eventData.hostId === userId;
};

/**
 * Check if an event's RSVP deadline has passed
 * @param {Object} eventData - Event data object
 * @returns {boolean} True if RSVP deadline has passed
 */
export const isRsvpDeadlinePassed = (eventData) => {
  if (!eventData?.hasRsvpDeadline || !eventData?.rsvpDeadlineTimestamp) {
    return false;
  }

  const now = new Date();
  const deadline = eventData.rsvpDeadlineTimestamp.toDate
    ? eventData.rsvpDeadlineTimestamp.toDate()
    : new Date(eventData.rsvpDeadlineTimestamp);

  return now > deadline;
};

/**
 * Get the formatted RSVP deadline string
 * @param {Object} eventData - Event data object
 * @returns {string|null} Formatted deadline string or null
 */
export const getFormattedRsvpDeadline = (eventData) => {
  if (!eventData?.hasRsvpDeadline || !eventData?.rsvpDeadlineTimestamp) {
    return null;
  }

  const deadline = eventData.rsvpDeadlineTimestamp.toDate
    ? eventData.rsvpDeadlineTimestamp.toDate()
    : new Date(eventData.rsvpDeadlineTimestamp);

  return deadline.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};
