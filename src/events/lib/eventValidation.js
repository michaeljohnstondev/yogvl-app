// utils/eventValidation.js
import { Alert } from 'react-native';
import { isPastEvent } from './eventStatus';

/**
 * Validate if a user can join an event based on their reliability
 * @param {Object} userData - User data with noShows count
 * @param {Object} event - Event object (optional, for future validation rules)
 * @returns {Promise<boolean>} True if user can join, false otherwise
 */
export const validateUserCanJoinEvent = async (userData, event = null) => {
  const userNoShows = userData?.userdata?.metrics?.events?.noShows || 0;

  // Block users with 5+ no-shows
  if (userNoShows >= 5) {
    Alert.alert(
      'Subscription Restricted',
      'Due to multiple no-shows, your access to new events is temporarily limited. Please contact support if you believe this is an error.',
      [{ text: 'OK' }]
    );
    return false;
  }

  // Warn users with 3+ no-shows
  if (userNoShows >= 3) {
    return new Promise((resolve) => {
      Alert.alert(
        'Attendance Warning',
        `You have ${userNoShows} no-shows on record. Please make sure you can attend this event to maintain your reliability score.`,
        [
          { text: 'Cancel', onPress: () => resolve(false) },
          { text: 'I Understand', onPress: () => resolve(true) },
        ]
      );
    });
  }

  return true;
};

/**
 * Check if user should see a reliability warning
 * @param {Object} userData - User data with noShows count
 * @returns {Object} Warning info with shouldWarn flag and message
 */
export const getReliabilityWarning = (userData) => {
  const userNoShows = userData?.userdata?.metrics?.events?.noShows || 0;

  if (userNoShows >= 5) {
    return {
      shouldWarn: true,
      level: 'restricted',
      message: 'Account restricted due to multiple no-shows',
      color: '#F44336',
    };
  }

  if (userNoShows >= 3) {
    return {
      shouldWarn: true,
      level: 'warning',
      message: `${userNoShows} no-shows - please attend events you join`,
      color: '#FF9800',
    };
  }

  if (userNoShows >= 1) {
    return {
      shouldWarn: true,
      level: 'caution',
      message: `${userNoShows} no-show${userNoShows > 1 ? 's' : ''} - maintain good attendance`,
      color: '#FFC107',
    };
  }

  return {
    shouldWarn: false,
    level: 'good',
    message: 'Good attendance record',
    color: '#4CAF50',
  };
};

/**
 * Get user permissions for an event
 * @param {string} currentUserId - Current user ID
 * @param {Object} userData - Current user data
 * @param {Object} event - Event object
 * @returns {Object} Permissions object with various flags
 */
export const getUserEventPermissions = (currentUserId, userData, event) => {
  if (!currentUserId || !event) {
    return {
      canEdit: false,
      canManageAttendance: false,
      canDelete: false,
      canViewSubscribers: false,
      isCreator: false,
      isAdmin: false,
    };
  }

  const isCreator = event.createdBy === currentUserId;
  const isAdmin = userData?.isAdmin || false;
  const isPast = isPastEvent(event);

  return {
    canEdit: (isCreator || isAdmin) && !isPast,
    canManageAttendance: (isCreator || isAdmin) && event.trackAttendance === true,
    canDelete: isCreator || isAdmin,
    canViewSubscribers: isCreator || isAdmin,
    isCreator,
    isAdmin,
  };
};

/**
 * Validate event join constraints
 * @param {Object} event - Event object
 * @param {boolean} isSubscribed - Whether user is already subscribed
 * @returns {Object} Validation result with canJoin flag and reason
 */
export const validateEventJoinConstraints = (event, isSubscribed) => {
  // Already subscribed
  if (isSubscribed) {
    return { canJoin: true, reason: null };
  }

  // Event is in the past
  if (isPastEvent(event)) {
    return {
      canJoin: false,
      reason: 'Event has already ended',
    };
  }

  // Event is full
  if (event.maxGuests && (event.subscriberCount || 0) >= event.maxGuests) {
    return {
      canJoin: false,
      reason: 'Event is at capacity',
    };
  }

  // Event is starting very soon (within 30 minutes)
  if (event.eventTimestamp) {
    const eventDate = event.eventTimestamp.toDate();
    const now = new Date();
    const minutesDiff = (eventDate - now) / (1000 * 60);

    if (minutesDiff <= 30 && minutesDiff > 0) {
      return {
        canJoin: true,
        reason: 'Event starts soon - hurry!',
      };
    }
  }

  return { canJoin: true, reason: null };
};

/**
 * Check if user meets minimum requirements to create events
 * @param {Object} userData - User data
 * @returns {Object} Validation result
 */
export const validateUserCanCreateEvent = (userData) => {
  const userNoShows = userData?.userdata?.metrics?.events?.noShows || 0;
  const eventsCreated = userData?.userdata?.metrics?.events?.created || 0;

  // Temporarily restrict event creation for users with very poor attendance
  if (userNoShows >= 7) {
    return {
      canCreate: false,
      reason:
        'Event creation temporarily restricted due to poor attendance record',
    };
  }

  // Warn users with poor attendance
  if (userNoShows >= 4 && eventsCreated === 0) {
    return {
      canCreate: true,
      warning:
        'Consider improving your attendance record before hosting events',
    };
  }

  return { canCreate: true };
};
