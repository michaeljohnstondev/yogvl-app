// FILE: lib/validationUtils.js - Shared Validation Utilities

/**
 * Comprehensive validation utilities for consistent data validation across services
 * Helps prevent runtime errors and ensures data integrity
 */

/**
 * Validate user ID format and existence
 * @param {string} userId - User ID to validate
 * @returns {Object} Validation result
 */
export const validateUserId = (userId) => {
  if (!userId) {
    return { valid: false, error: 'User ID is required' };
  }

  if (typeof userId !== 'string') {
    return { valid: false, error: 'User ID must be a string' };
  }

  if (userId.trim().length === 0) {
    return { valid: false, error: 'User ID cannot be empty' };
  }

  // Firebase UID validation (alphanumeric, 28 characters)
  if (!/^[a-zA-Z0-9]{20,30}$/.test(userId.trim())) {
    return { valid: false, error: 'User ID format is invalid' };
  }

  return { valid: true };
};

/**
 * Validate event ID format
 * @param {string} eventId - Event ID to validate
 * @returns {Object} Validation result
 */
export const validateEventId = (eventId) => {
  if (!eventId) {
    return { valid: false, error: 'Event ID is required' };
  }

  if (typeof eventId !== 'string') {
    return { valid: false, error: 'Event ID must be a string' };
  }

  if (eventId.trim().length === 0) {
    return { valid: false, error: 'Event ID cannot be empty' };
  }

  return { valid: true };
};

/**
 * Validate studio ID format
 * @param {string} studioId - Studio ID to validate
 * @returns {Object} Validation result
 */
export const validateStudioId = (studioId) => {
  if (!studioId) {
    return { valid: false, error: 'Studio ID is required' };
  }

  if (typeof studioId !== 'string') {
    return { valid: false, error: 'Studio ID must be a string' };
  }

  if (studioId.trim().length === 0) {
    return { valid: false, error: 'Studio ID cannot be empty' };
  }

  return { valid: true };
};

/**
 * Validate array of user IDs
 * @param {Array} userIds - Array of user IDs to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export const validateUserIdArray = (userIds, options = {}) => {
  const { minLength = 1, maxLength = 100, allowEmpty = false } = options;

  if (!allowEmpty && (!userIds || !Array.isArray(userIds))) {
    return { valid: false, error: 'User IDs must be an array' };
  }

  if (allowEmpty && (!userIds || !Array.isArray(userIds))) {
    return { valid: true, sanitized: [] };
  }

  if (userIds.length < minLength) {
    return { valid: false, error: `At least ${minLength} user ID(s) required` };
  }

  if (userIds.length > maxLength) {
    return { valid: false, error: `Maximum ${maxLength} user IDs allowed` };
  }

  const invalidIds = [];
  const validIds = [];

  for (const userId of userIds) {
    const validation = validateUserId(userId);
    if (validation.valid) {
      if (!validIds.includes(userId)) { // Deduplicate
        validIds.push(userId);
      }
    } else {
      invalidIds.push(userId);
    }
  }

  if (invalidIds.length > 0) {
    return {
      valid: false,
      error: `Invalid user IDs: ${invalidIds.join(', ')}`,
      invalidIds,
      validIds
    };
  }

  return { valid: true, sanitized: validIds };
};

/**
 * Validate notification data structure
 * @param {Object} notificationData - Notification data to validate
 * @returns {Object} Validation result
 */
export const validateNotificationData = (notificationData) => {
  if (!notificationData || typeof notificationData !== 'object') {
    return { valid: false, error: 'Notification data must be an object' };
  }

  const required = ['userId', 'type', 'title', 'message'];
  const missing = required.filter(field => !notificationData[field]);

  if (missing.length > 0) {
    return { valid: false, error: `Missing required fields: ${missing.join(', ')}` };
  }

  // Validate user ID
  const userIdValidation = validateUserId(notificationData.userId);
  if (!userIdValidation.valid) {
    return { valid: false, error: `Invalid userId: ${userIdValidation.error}` };
  }

  // Validate title and message length
  if (notificationData.title.length > 100) {
    return { valid: false, error: 'Title must be 100 characters or less' };
  }

  if (notificationData.message.length > 500) {
    return { valid: false, error: 'Message must be 500 characters or less' };
  }

  return { valid: true };
};

/**
 * Validate invitation data structure
 * @param {Object} invitationData - Invitation data to validate
 * @returns {Object} Validation result
 */
export const validateInvitationData = (invitationData) => {
  if (!invitationData || typeof invitationData !== 'object') {
    return { valid: false, error: 'Invitation data must be an object' };
  }

  const required = ['inviterId', 'recipientId', 'eventId'];
  const missing = required.filter(field => !invitationData[field]);

  if (missing.length > 0) {
    return { valid: false, error: `Missing required fields: ${missing.join(', ')}` };
  }

  // Validate IDs
  for (const field of required) {
    if (field.includes('Id')) {
      const validation = field === 'eventId'
        ? validateEventId(invitationData[field])
        : validateUserId(invitationData[field]);

      if (!validation.valid) {
        return { valid: false, error: `Invalid ${field}: ${validation.error}` };
      }
    }
  }

  // Validate optional message length
  if (invitationData.message && invitationData.message.length > 200) {
    return { valid: false, error: 'Invitation message must be 200 characters or less' };
  }

  return { valid: true };
};

/**
 * Validate service operation parameters
 * @param {Object} params - Parameters to validate
 * @param {Array} required - Required parameter names
 * @param {Object} types - Expected types for parameters
 * @returns {Object} Validation result
 */
export const validateServiceParams = (params, required = [], types = {}) => {
  if (!params || typeof params !== 'object') {
    return { valid: false, error: 'Parameters must be an object' };
  }

  // Check required parameters
  const missing = required.filter(param =>
    params[param] === undefined || params[param] === null
  );

  if (missing.length > 0) {
    return { valid: false, error: `Missing required parameters: ${missing.join(', ')}` };
  }

  // Check parameter types
  for (const [param, expectedType] of Object.entries(types)) {
    if (params[param] !== undefined) {
      const actualType = Array.isArray(params[param]) ? 'array' : typeof params[param];

      if (actualType !== expectedType) {
        return {
          valid: false,
          error: `Parameter ${param} must be of type ${expectedType}, got ${actualType}`
        };
      }
    }
  }

  return { valid: true };
};

/**
 * Validate Firebase document path format
 * @param {string} documentPath - Document path to validate
 * @returns {Object} Validation result
 */
export const validateDocumentPath = (documentPath) => {
  if (!documentPath || typeof documentPath !== 'string') {
    return { valid: false, error: 'Document path must be a string' };
  }

  const parts = documentPath.split('/');

  // Must have even number of parts (collection/doc pairs)
  if (parts.length % 2 !== 0) {
    return { valid: false, error: 'Invalid document path - must be collection/doc pairs' };
  }

  // Each part must not be empty
  if (parts.some(part => !part.trim())) {
    return { valid: false, error: 'Document path parts cannot be empty' };
  }

  return { valid: true };
};

/**
 * Validate event permission for user operations
 * @param {Object} eventData - Event data
 * @param {string} userId - User requesting operation
 * @param {string} requiredRole - Required role ('creator', 'cohost', 'attendee')
 * @returns {Object} Validation result
 */
export const validateEventPermission = (eventData, userId, requiredRole = 'creator') => {
  if (!eventData || typeof eventData !== 'object') {
    return { valid: false, error: 'Event data is required' };
  }

  const userIdValidation = validateUserId(userId);
  if (!userIdValidation.valid) {
    return { valid: false, error: `Invalid user ID: ${userIdValidation.error}` };
  }

  const isCreator = eventData.createdBy === userId;
  const isCohost = Array.isArray(eventData.cohosts) && eventData.cohosts.includes(userId);
  const isAttendee = Array.isArray(eventData.subscribers) && eventData.subscribers.includes(userId);

  switch (requiredRole) {
    case 'creator':
      if (!isCreator) {
        return { valid: false, error: 'Only event creator can perform this action' };
      }
      break;

    case 'cohost':
      if (!isCreator && !isCohost) {
        return { valid: false, error: 'Only event creator or cohosts can perform this action' };
      }
      break;

    case 'attendee':
      if (!isCreator && !isCohost && !isAttendee) {
        return { valid: false, error: 'Only event attendees can perform this action' };
      }
      break;

    default:
      return { valid: false, error: `Invalid role: ${requiredRole}` };
  }

  return { valid: true };
};

/**
 * Sanitize and validate user input strings
 * @param {string} input - Input string to sanitize
 * @param {Object} options - Sanitization options
 * @returns {Object} Sanitization result
 */
export const sanitizeUserInput = (input, options = {}) => {
  const {
    maxLength = 1000,
    allowEmpty = false,
    trim = true,
    removeHtml = true
  } = options;

  if (!input) {
    return allowEmpty
      ? { valid: true, sanitized: '' }
      : { valid: false, error: 'Input is required' };
  }

  if (typeof input !== 'string') {
    return { valid: false, error: 'Input must be a string' };
  }

  let sanitized = input;

  if (trim) {
    sanitized = sanitized.trim();
  }

  if (removeHtml) {
    // Basic HTML tag removal
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }

  if (sanitized.length > maxLength) {
    return { valid: false, error: `Input must be ${maxLength} characters or less` };
  }

  if (!allowEmpty && sanitized.length === 0) {
    return { valid: false, error: 'Input cannot be empty' };
  }

  return { valid: true, sanitized };
};

/**
 * Error handling wrapper for validation functions
 * @param {Function} validationFn - Validation function to wrap
 * @param {string} validationName - Name for error logging
 * @returns {Function} Wrapped validation function
 */
export const withValidationErrorHandling = (validationFn, validationName) => {
  return (...args) => {
    try {
      return validationFn(...args);
    } catch (error) {
      console.error(`[ValidationUtils] ${validationName} failed:`, error);
      return {
        valid: false,
        error: 'Validation failed due to internal error',
        internalError: error.message
      };
    }
  };
};

export default {
  validateUserId,
  validateEventId,
  validateStudioId,
  validateUserIdArray,
  validateNotificationData,
  validateInvitationData,
  validateServiceParams,
  validateDocumentPath,
  validateEventPermission,
  sanitizeUserInput,
  withValidationErrorHandling,
};