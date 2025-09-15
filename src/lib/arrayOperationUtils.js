// FILE: lib/arrayOperationUtils.js - Array Operation Utilities

/**
 * Safe array operations with comprehensive validation
 * Prevents common array-related bugs and provides consistent behavior
 */

/**
 * Safely check if an array includes a value
 * Handles null/undefined arrays and values gracefully
 * @param {Array|null|undefined} array - Array to check
 * @param {*} value - Value to find
 * @returns {boolean} Whether array includes the value
 */
export const safeArrayIncludes = (array, value) => {
  try {
    if (!array || !Array.isArray(array) || array.length === 0) {
      return false;
    }
    if (value === null || value === undefined) {
      return false;
    }
    return array.includes(value);
  } catch (error) {
    console.error('[ArrayUtils] Error in safeArrayIncludes:', error);
    return false;
  }
};

/**
 * Safely get array length
 * @param {Array|null|undefined} array - Array to measure
 * @returns {number} Length of array (0 if invalid)
 */
export const safeArrayLength = (array) => {
  return Array.isArray(array) ? array.length : 0;
};

/**
 * Filter arrays for unique values (deduplication)
 * @param {Array} array - Array to deduplicate
 * @returns {Array} Array with unique values
 */
export const uniqueArray = (array) => {
  if (!Array.isArray(array)) return [];
  return [...new Set(array)];
};

/**
 * Filter out users who are already invited or subscribed from invitation list
 * This is the core function for invitation filtering as requested by the user
 * @param {Array} allUsers - All potential users to invite
 * @param {Array} invitedUsers - Users already invited
 * @param {Array} subscribedUsers - Users already subscribed
 * @returns {Array} Eligible users for invitation
 */
export const filterEligibleUsersForInvitation = (allUsers, invitedUsers = [], subscribedUsers = []) => {
  if (!Array.isArray(allUsers)) {
    console.warn('[ArrayUtils] allUsers is not an array:', allUsers);
    return [];
  }

  const safeInvited = Array.isArray(invitedUsers) ? invitedUsers : [];
  const safeSubscribed = Array.isArray(subscribedUsers) ? subscribedUsers : [];

  return allUsers.filter(user => {
    if (!user || !user.id) {
      return false;
    }

    // foreach(user) if user is in the [subscribed] array or if user is in the [invited] array, return null, otherwise return the user card
    const userId = user.id;

    if (safeArrayIncludes(safeSubscribed, userId)) {
      return false; // User already subscribed
    }

    if (safeArrayIncludes(safeInvited, userId)) {
      return false; // User already invited
    }

    return true; // User is eligible for invitation
  });
};

/**
 * Create Set-based lookups for O(1) performance
 * @param {Array} array - Array to convert to Set
 * @returns {Set} Set for fast lookups
 */
export const createLookupSet = (array) => {
  if (!Array.isArray(array)) return new Set();
  return new Set(array);
};

/**
 * Optimized filtering using Set-based lookups
 * @param {Array} users - Users to filter
 * @param {Array} excludeIds - User IDs to exclude
 * @returns {Array} Filtered users
 */
export const filterUsersWithLookup = (users, excludeIds = []) => {
  if (!Array.isArray(users)) return [];
  if (!Array.isArray(excludeIds) || excludeIds.length === 0) return users;

  const excludeSet = createLookupSet(excludeIds);

  return users.filter(user => {
    return user && user.id && !excludeSet.has(user.id);
  });
};

/**
 * Merge multiple arrays while avoiding duplicates
 * @param {...Array} arrays - Arrays to merge
 * @returns {Array} Merged array with unique values
 */
export const mergeArraysUnique = (...arrays) => {
  const validArrays = arrays.filter(arr => Array.isArray(arr));
  if (validArrays.length === 0) return [];

  const merged = validArrays.flat();
  return uniqueArray(merged);
};

/**
 * Split array into chunks for batch processing
 * @param {Array} array - Array to chunk
 * @param {number} chunkSize - Size of each chunk
 * @returns {Array} Array of chunks
 */
export const chunkArray = (array, chunkSize = 10) => {
  if (!Array.isArray(array) || chunkSize <= 0) return [];

  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

/**
 * Safely get array intersection (common elements)
 * @param {Array} array1 - First array
 * @param {Array} array2 - Second array
 * @returns {Array} Common elements
 */
export const arrayIntersection = (array1, array2) => {
  if (!Array.isArray(array1) || !Array.isArray(array2)) return [];

  const set2 = createLookupSet(array2);
  return array1.filter(item => set2.has(item));
};

/**
 * Safely get array difference (elements in first array but not second)
 * @param {Array} array1 - First array
 * @param {Array} array2 - Second array (elements to exclude)
 * @returns {Array} Elements only in first array
 */
export const arrayDifference = (array1, array2) => {
  if (!Array.isArray(array1)) return [];
  if (!Array.isArray(array2)) return array1;

  const set2 = createLookupSet(array2);
  return array1.filter(item => !set2.has(item));
};

/**
 * Validate array operations before Firebase updates
 * @param {Object} params - Validation parameters
 * @param {Array} params.currentArray - Current array state
 * @param {*} params.item - Item being added/removed
 * @param {string} params.operation - 'add' or 'remove'
 * @returns {Object} Validation result
 */
export const validateArrayOperation = ({ currentArray, item, operation }) => {
  if (!Array.isArray(currentArray)) {
    return { valid: false, error: 'Current array is not valid' };
  }

  if (item === null || item === undefined) {
    return { valid: false, error: 'Item cannot be null or undefined' };
  }

  const itemExists = safeArrayIncludes(currentArray, item);

  if (operation === 'add' && itemExists) {
    return { valid: false, error: 'Item already exists in array' };
  }

  if (operation === 'remove' && !itemExists) {
    return { valid: false, error: 'Item does not exist in array' };
  }

  return { valid: true };
};

/**
 * Array-based filtering for user cards as specifically requested by user
 * "foreach(user) if user is in the [subscribed] array or if user is inthe [invited] array, return null, otherwise return the user card"
 * @param {Array} users - Array of user objects
 * @param {Array} subscribedArray - Array of subscribed user IDs
 * @param {Array} invitedArray - Array of invited user IDs
 * @returns {Array} Filtered user cards
 */
export const filterUserCards = (users, subscribedArray = [], invitedArray = []) => {
  if (!Array.isArray(users)) {
    console.warn('[ArrayUtils] Users is not an array in filterUserCards');
    return [];
  }

  const filteredUsers = [];

  // foreach(user) as requested by user
  users.forEach(user => {
    if (!user || !user.id) {
      return; // Skip invalid user objects
    }

    const userId = user.id;

    // if user is in the [subscribed] array or if user is in the [invited] array, return null
    if (safeArrayIncludes(subscribedArray, userId) || safeArrayIncludes(invitedArray, userId)) {
      return; // return null - skip this user
    }

    // otherwise return the user card
    filteredUsers.push(user);
  });

  return filteredUsers;
};

export default {
  safeArrayIncludes,
  safeArrayLength,
  uniqueArray,
  filterEligibleUsersForInvitation,
  createLookupSet,
  filterUsersWithLookup,
  mergeArraysUnique,
  chunkArray,
  arrayIntersection,
  arrayDifference,
  validateArrayOperation,
  filterUserCards,
};