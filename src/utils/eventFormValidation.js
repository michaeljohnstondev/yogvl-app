// utils/eventFormValidation.js
import { DateTime } from 'luxon';

/**
 * Validate event date and time
 * @param {Date} date - Selected date
 * @param {Date} time - Selected time
 * @returns {Object} Validation result with isValid flag and message
 */
export const validateEventDateTime = (date, time) => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const eventDateTime = DateTime.fromObject(
    {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: time.getHours(),
      minute: time.getMinutes(),
    },
    { zone: timeZone }
  );

  const now = DateTime.now().setZone(timeZone);

  // Check if event is in the past (with 5 minute buffer for current time)
  if (eventDateTime <= now.minus({ minutes: 5 })) {
    return {
      isValid: false,
      message:
        'Events cannot be scheduled for the past. Please select a future date and time.',
    };
  }

  // Check if event is too far in the future (optional - 1 year limit)
  if (eventDateTime > now.plus({ years: 1 })) {
    return {
      isValid: false,
      message: 'Events cannot be scheduled more than 1 year in advance.',
    };
  }

  return { isValid: true };
};

/**
 * Validate event form fields
 * @param {Object} formData - Form data object
 * @returns {Object} Validation result
 */
export const validateEventForm = (formData) => {
  const { title, location, dateSelected, timeSelected, maxGuests, date, time } =
    formData;

  // Validate required fields
  if (!title?.trim()) {
    return { isValid: false, message: 'Please enter an event title.' };
  }

  if (!location?.trim()) {
    return { isValid: false, message: 'Please enter a location.' };
  }

  if (!dateSelected) {
    return { isValid: false, message: 'Please select a date for the event.' };
  }

  if (!timeSelected) {
    return { isValid: false, message: 'Please select a time for the event.' };
  }

  // Validate max guests if provided
  if (maxGuests && (isNaN(maxGuests) || parseInt(maxGuests) < 1)) {
    return { isValid: false, message: 'Max guests must be a positive number.' };
  }

  // Validate event time
  const timeValidation = validateEventDateTime(date, time);
  if (!timeValidation.isValid) {
    return timeValidation;
  }

  return { isValid: true };
};

/**
 * Format event data for database storage
 * @param {Object} formData - Form data
 * @param {string} currentUserId - Current user ID
 * @returns {Object} Formatted event data
 */
export const formatEventForStorage = (formData, currentUserId) => {
  const { title, location, details, date, time, maxGuests } = formData;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

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

  return {
    title: title.trim(),
    location: location.trim(),
    desc: details.trim(),
    utcDateTime: utcDateTime,
    eventTimestamp: new Date(utcDateTime),
    eventTimeZone: timeZone,
    originalDate: combined.toFormat('yyyy-MM-dd'),
    originalTime: combined.toFormat('HH:mm'),
    maxGuests: maxGuests ? parseInt(maxGuests) : null,
    createdBy: currentUserId,
    subscribers: [currentUserId],
    subscriberCount: 1,
    attendeeCount: 0,
    noShowCount: 0,
    status: 'upcoming',
  };
};
