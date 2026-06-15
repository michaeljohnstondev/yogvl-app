// eventFormValidation.js
import { DateTime } from 'luxon';
import { doc, getDoc, updateDoc } from '../../lib/firebase/firestore';
import { db } from '../../auth/services/firebase';

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

    if (minutesDiff < 15) {
      return {
        isValid: false,
        message: 'Event must be at least 15 minutes in the future',
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
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    console.log('🚨 Validation failed: Event name is required');
    return {
      isValid: false,
      message: 'Event name is required',
    };
  }

  if (typeof title === 'string' && title.trim().length > 30) {
    return {
      isValid: false,
      message: 'Event name must be 30 characters or less',
    };
  }

  if (
    !location ||
    typeof location !== 'string' ||
    location.trim().length === 0
  ) {
    return {
      isValid: false,
      message: 'Location is required',
    };
  }

  if (typeof location === 'string' && location.trim().length > 40) {
    return {
      isValid: false,
      message: 'Location must be 40 characters or less',
    };
  }

  // Validate address if provided
  if (address && typeof address === 'string' && address.trim().length > 300) {
    return {
      isValid: false,
      message: 'Address must be 300 characters or less',
    };
  }

  // Validate details field (consolidated from old separate fields)
  if (
    formData.details &&
    typeof formData.details === 'string' &&
    formData.details.trim().length > 1500
  ) {
    return {
      isValid: false,
      message: 'Event details must be 1500 characters or less',
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
  if (
    maxGuests &&
    typeof maxGuests === 'string' &&
    maxGuests.trim().length > 0
  ) {
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
    if (
      !entryFee ||
      typeof entryFee !== 'string' ||
      entryFee.trim().length === 0
    ) {
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
 * @param {boolean} isEditing - Whether this is for editing an existing event
 * @returns {Object} Formatted event data
 */
export const formatEventForStorage = (
  formData,
  currentUserId,
  isEditing = false,
  studioTimezone = null
) => {
  const {
    title,
    location,
    details,
    date,
    time,
    maxGuests,
    hasFee,
    entryFee,
    isPrivate,
    allowGuestInvites,
    showHostContact,
    address,
    hasRsvpDeadline,
    rsvpDeadline,
    rsvpDeadlineSelected,
    rsvpDeadlineType,
    trackAttendance,
    attendanceType,
    isOfficialEvent,
    notificationSettings,
    links,
    posterImage,
    eventDuration,
    tags,
  } = formData;

  // Format main event date/time using studio timezone
  const eventZone = studioTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const combined = DateTime.fromObject(
    {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: time.getHours(),
      minute: time.getMinutes(),
    },
    { zone: eventZone }
  );

  const eventTimestamp = new Date(combined.toUTC().toISO());

  // Format RSVP deadline based on rsvpDeadlineType
  let rsvpDeadline_timestamp = null;

  // Handle rsvpDeadlineType from form data
  if (formData.rsvpDeadlineType && formData.rsvpDeadlineType !== 'none') {
    if (formData.rsvpDeadlineType === 'custom') {
      // Use custom date/time from date picker
      if (hasRsvpDeadline && rsvpDeadlineSelected && rsvpDeadline) {
        const rsvpCombined = DateTime.fromObject(
          {
            year: rsvpDeadline.getFullYear(),
            month: rsvpDeadline.getMonth() + 1,
            day: rsvpDeadline.getDate(),
            hour: rsvpDeadline.getHours(),
            minute: rsvpDeadline.getMinutes(),
          },
          { zone: eventZone }
        );
        rsvpDeadline_timestamp = new Date(rsvpCombined.toUTC().toISO());
      }
    } else {
      // Calculate deadline based on preset option (1hour, 1day, etc.)
      const eventDateTime = DateTime.fromJSDate(eventTimestamp);
      let deadlineDateTime;

      switch (formData.rsvpDeadlineType) {
        case '1hour':
          deadlineDateTime = eventDateTime.minus({ hours: 1 });
          break;
        case '2hours':
          deadlineDateTime = eventDateTime.minus({ hours: 2 });
          break;
        case '6hours':
          deadlineDateTime = eventDateTime.minus({ hours: 6 });
          break;
        case '1day':
          deadlineDateTime = eventDateTime.minus({ days: 1 });
          break;
        case '2days':
          deadlineDateTime = eventDateTime.minus({ days: 2 });
          break;
        case '1week':
          deadlineDateTime = eventDateTime.minus({ weeks: 1 });
          break;
        case '2weeks':
          deadlineDateTime = eventDateTime.minus({ weeks: 2 });
          break;
        case '1month':
          deadlineDateTime = eventDateTime.minus({ months: 1 });
          break;
      }

      if (deadlineDateTime) {
        rsvpDeadline_timestamp = deadlineDateTime.toJSDate();
      }
    }
  }

  // Only the creator for initial event creation (cohosts are added via invitations)

  return {
    // ESSENTIALS
    title: title.trim(),
    location: location.trim(),
    eventTimestamp: new Date(combined.toUTC().toISO()),
    // IMPORTANT: Only set createdBy for new events, not when editing (preserve original creator)
    ...(isEditing ? {} : { createdBy: currentUserId }),
    createdAt: null, // Will be set in the create handler

    // DETAILS
    description: details ? details.trim() : '',
    address: address ? address.trim() : '',
    maxGuests: maxGuests ? parseInt(maxGuests) : null,
    hasFee: hasFee ?? false,
    entryFee:
      hasFee && entryFee ? parseFloat(entryFee.replace(/[$,]/g, '')) : 0,
    rsvpDeadline: rsvpDeadline_timestamp,

    // PEOPLE - Only set subscribers for new events, not when editing
    ...(isEditing ? {} : { subscribers: [currentUserId] }), // Creator is automatically subscribed to new events

    // STATS
    views: 0,
    attended: 0,
    noShows: 0,

    // FLAGS
    isPrivate: isPrivate ?? false,
    allowGuestInvites: allowGuestInvites ?? false,
    trackAttendance: trackAttendance ?? false,
    attendanceType: attendanceType ?? 'casual',
    showHostContact: showHostContact ?? true,
    active: true,

    // OFFICIAL EVENTS (admin only)
    isOfficialEvent: isOfficialEvent ?? false,

    // LINKS — array of { label?, url }, empty rows dropped, trimmed, max 5
    links: Array.isArray(links)
      ? links
          .map((l) => ({
            label: (l?.label || '').trim(),
            url: (l?.url || '').trim(),
          }))
          .filter((l) => l.url.length > 0)
          .slice(0, 5)
      : [],

    // TAGS — broaden the interest-match net for notifications. Preserve
    // the user's casing for display ("House Music" stays "House Music")
    // and let the Cloud Function lowercase at match time so they still
    // line up with the studio-level interest index keys. Dedup is
    // case-insensitive so "Concert" and "concert" can't both land.
    // Trim, drop empties, cap at 5. Missing/legacy events without this
    // field still work — readers treat absent as [].
    tags: (() => {
      if (!Array.isArray(tags)) return [];
      const seen = new Set();
      const out = [];
      for (const raw of tags) {
        if (typeof raw !== 'string') continue;
        const display = raw.trim();
        if (!display || display.length > 40) continue;
        const key = display.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(display);
        if (out.length >= 5) break;
      }
      return out;
    })(),

    // POSTER IMAGE — only persist if it's an https URL (already uploaded).
    // Local picker URIs (file://, content://, ph://) are uploaded by the
    // submit flow and the resulting URL is written via a separate updateDoc.
    posterImage:
      typeof posterImage === 'string' && /^https?:\/\//i.test(posterImage)
        ? posterImage
        : '',

    // DURATION (minutes). Capped at 10080 (7 days). null/empty means
    // legacy behavior — event treated as past at start time. Used by
    // past/upcoming logic to keep events active during their duration.
    eventDuration: (() => {
      if (eventDuration == null || eventDuration === '') return null;
      const n = Number(eventDuration);
      if (!Number.isFinite(n) || n <= 0) return null;
      return Math.min(10080, Math.round(n));
    })(),

    // HOST NOTIFICATION SETTINGS (per-event)
    ...(notificationSettings ? { notificationSettings } : {}),
  };
};

// Legacy cohost functions removed - now handled via invitation system in friendService.js

/**
 * Check if a user is a host of an event
 * @param {Object} eventData - Event data object
 * @param {string} userId - User ID to check
 * @returns {boolean} True if user is a host
 */
export const isEventHost = (eventData, userId) => {
  if (!eventData || !userId) return false;

  return (
    eventData.createdBy === userId ||
    (eventData.cohosts && eventData.cohosts.includes(userId))
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
  if (!eventData?.rsvpDeadline) {
    return false;
  }

  const now = new Date();
  const deadline = eventData.rsvpDeadline.toDate
    ? eventData.rsvpDeadline.toDate()
    : new Date(eventData.rsvpDeadline);

  return now > deadline;
};

/**
 * Get the formatted RSVP deadline string
 * @param {Object} eventData - Event data object
 * @returns {string|null} Formatted deadline string or null
 */
export const getFormattedRsvpDeadline = (eventData) => {
  if (!eventData?.rsvpDeadline) {
    return null;
  }

  const deadline = eventData.rsvpDeadline.toDate
    ? eventData.rsvpDeadline.toDate()
    : new Date(eventData.rsvpDeadline);

  return deadline.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};
