// FILE: lib/userDisplayUtils.js - User Display Name and Data Utilities

/**
 * Utilities for consistent user display name handling across the app
 * Addresses the "Unknown Host" issues by providing consistent data path lookups
 */

/**
 * Extract display name from user data with fallback logic
 * Handles the actual database structure: userdata.contactInfo.displayName
 * @param {Object} userData - User document data
 * @param {string} [fallback='Unknown User'] - Fallback if no name found
 * @returns {string} Display name
 */
export const extractDisplayName = (userData, fallback = 'Unknown User') => {
  if (!userData || typeof userData !== 'object') {
    return fallback;
  }

  // Priority order based on actual database structure (from DATABASE.md)
  const possiblePaths = [
    userData.userdata?.contactInfo?.displayName,
    userData.displayName, // Some legacy data might have this
    userData.userdata?.profile?.displayName, // Alternative location
    userData.userdata?.contactInfo?.firstName && userData.userdata?.contactInfo?.lastName
      ? `${userData.userdata.contactInfo.firstName} ${userData.userdata.contactInfo.lastName}`.trim()
      : null,
    userData.userdata?.contactInfo?.firstName,
    userData.name, // Firebase Auth name
    userData.email?.split('@')[0], // Email prefix as last resort
  ];

  // Return first non-empty value
  for (const name of possiblePaths) {
    if (name && typeof name === 'string' && name.trim()) {
      return name.trim();
    }
  }

  return fallback;
};

/**
 * Extract first name from user data
 * @param {Object} userData - User document data
 * @param {string} [fallback=''] - Fallback if no name found
 * @returns {string} First name
 */
export const extractFirstName = (userData, fallback = '') => {
  if (!userData || typeof userData !== 'object') {
    return fallback;
  }

  return (
    userData.userdata?.contactInfo?.firstName ||
    userData.firstName ||
    userData.userdata?.profile?.firstName ||
    fallback
  );
};

/**
 * Extract last name from user data
 * @param {Object} userData - User document data
 * @param {string} [fallback=''] - Fallback if no name found
 * @returns {string} Last name
 */
export const extractLastName = (userData, fallback = '') => {
  if (!userData || typeof userData !== 'object') {
    return fallback;
  }

  return (
    userData.userdata?.contactInfo?.lastName ||
    userData.lastName ||
    userData.userdata?.profile?.lastName ||
    fallback
  );
};

/**
 * Extract email from user data
 * @param {Object} userData - User document data
 * @param {string} [fallback=''] - Fallback if no email found
 * @returns {string} Email
 */
export const extractEmail = (userData, fallback = '') => {
  if (!userData || typeof userData !== 'object') {
    return fallback;
  }

  return (
    userData.userdata?.contactInfo?.email ||
    userData.email ||
    userData.userdata?.profile?.email ||
    fallback
  );
};

/**
 * Extract phone number from user data
 * @param {Object} userData - User document data
 * @param {string} [fallback=''] - Fallback if no phone found
 * @returns {string} Phone number
 */
export const extractPhoneNumber = (userData, fallback = '') => {
  if (!userData || typeof userData !== 'object') {
    return fallback;
  }

  return (
    userData.userdata?.contactInfo?.phone ||
    userData.userdata?.contactInfo?.phoneNumber ||
    userData.phoneNumber ||
    userData.phone ||
    fallback
  );
};

/**
 * Create standardized user display object for UI components
 * @param {Object} userData - User document data
 * @param {string} userId - User ID
 * @returns {Object} Standardized user display object
 */
export const createUserDisplayObject = (userData, userId = null) => {
  return {
    id: userId || userData.uid || userData.id,
    displayName: extractDisplayName(userData),
    firstName: extractFirstName(userData),
    lastName: extractLastName(userData),
    email: extractEmail(userData),
    phoneNumber: extractPhoneNumber(userData),
    profilePicture: userData.userdata?.contactInfo?.profilePicture || null,
    initials: generateUserInitials(userData),
    fullName: generateFullName(userData),
  };
};

/**
 * Generate user initials for avatar display
 * @param {Object} userData - User document data
 * @returns {string} User initials (e.g., "JD")
 */
export const generateUserInitials = (userData) => {
  const firstName = extractFirstName(userData);
  const lastName = extractLastName(userData);
  const displayName = extractDisplayName(userData);

  if (firstName && lastName) {
    return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
  }

  if (displayName && displayName.includes(' ')) {
    const parts = displayName.split(' ');
    return `${parts[0].charAt(0).toUpperCase()}${parts[parts.length - 1].charAt(0).toUpperCase()}`;
  }

  if (displayName) {
    return displayName.charAt(0).toUpperCase();
  }

  return 'U'; // Unknown user
};

/**
 * Generate full name from user data parts
 * @param {Object} userData - User document data
 * @returns {string} Full name
 */
export const generateFullName = (userData) => {
  const firstName = extractFirstName(userData);
  const lastName = extractLastName(userData);

  if (firstName && lastName) {
    return `${firstName} ${lastName}`.trim();
  }

  return extractDisplayName(userData);
};

/**
 * Validate user data completeness for profile requirements
 * @param {Object} userData - User document data
 * @returns {Object} Validation result
 */
export const validateUserDataCompleteness = (userData) => {
  const issues = [];
  const warnings = [];

  if (!userData) {
    return {
      isComplete: false,
      hasWarnings: false,
      issues: ['User data is null or undefined'],
      warnings: []
    };
  }

  // Check required fields
  if (!extractDisplayName(userData, null)) {
    issues.push('Display name is missing');
  }

  if (!extractEmail(userData, null)) {
    issues.push('Email is missing');
  }

  // Check for potential improvements
  if (!extractFirstName(userData, null)) {
    warnings.push('First name is missing');
  }

  if (!extractLastName(userData, null)) {
    warnings.push('Last name is missing');
  }

  if (!extractPhoneNumber(userData, null)) {
    warnings.push('Phone number is missing');
  }

  return {
    isComplete: issues.length === 0,
    hasWarnings: warnings.length > 0,
    issues,
    warnings
  };
};

/**
 * Format user data for notifications (ensures consistent naming)
 * @param {Object} userData - User document data
 * @param {string} userId - User ID
 * @returns {Object} Formatted user data for notifications
 */
export const formatUserForNotification = (userData, userId) => {
  return {
    id: userId,
    name: extractDisplayName(userData, 'Someone'),
    firstName: extractFirstName(userData),
    email: extractEmail(userData),
  };
};

/**
 * Safe user data access with error handling
 * @param {Object} userData - User document data
 * @param {string} path - Dot notation path (e.g., 'userdata.contactInfo.displayName')
 * @param {*} fallback - Fallback value
 * @returns {*} Value at path or fallback
 */
export const safeUserDataAccess = (userData, path, fallback = null) => {
  if (!userData || typeof userData !== 'object') {
    return fallback;
  }

  try {
    const parts = path.split('.');
    let current = userData;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return fallback;
      }
    }

    return current;
  } catch (error) {
    console.error('[UserDisplayUtils] Error accessing user data path:', path, error);
    return fallback;
  }
};

/**
 * Create user data for caching in service operations
 * @param {Object} userData - Full user document data
 * @param {string} userId - User ID
 * @returns {Object} Minimal cached user data
 */
export const createCachedUserData = (userData, userId) => {
  return {
    id: userId,
    displayName: extractDisplayName(userData),
    firstName: extractFirstName(userData),
    lastName: extractLastName(userData),
    email: extractEmail(userData),
    initials: generateUserInitials(userData),
  };
};

export default {
  extractDisplayName,
  extractFirstName,
  extractLastName,
  extractEmail,
  extractPhoneNumber,
  createUserDisplayObject,
  generateUserInitials,
  generateFullName,
  validateUserDataCompleteness,
  formatUserForNotification,
  safeUserDataAccess,
  createCachedUserData,
};