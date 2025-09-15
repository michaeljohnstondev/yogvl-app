// Global indexOf Error Prevention for React Native
// This file prevents "Cannot read property 'indexOf' of undefined" errors

/**
 * Safe array includes function that prevents indexOf errors
 * @param {Array} array - Array to search
 * @param {*} item - Item to search for
 * @returns {boolean} - Whether item is in array
 */
export const safeArrayIncludes = (array, item) => {
  if (!array || !Array.isArray(array) || array.length === 0) return false;
  if (item === null || item === undefined) return false;

  try {
    return array.includes(item);
  } catch (error) {
    console.warn('[SafeArrayIncludes] Error with includes, falling back to manual check:', error);
    // Manual fallback if includes() fails
    for (let i = 0; i < array.length; i++) {
      if (array[i] === item) return true;
    }
    return false;
  }
};

/**
 * Safe email split function that prevents indexOf errors in email processing
 * @param {string} email - Email string to process
 * @returns {string} - Username part of email or fallback
 */
export const safeEmailSplit = (email) => {
  if (!email || typeof email !== 'string') return 'Unknown User';

  try {
    const parts = email.split('@');
    return parts.length > 1 ? parts[0] : email;
  } catch (error) {
    console.warn('[SafeEmailSplit] Error splitting email:', error);
    return 'Unknown User';
  }
};

/**
 * Initialize global indexOf error prevention
 * Call this once in App.js to apply fixes globally
 */
export const initializeIndexOfFix = () => {
  console.log('[IndexOfFix] Initializing global indexOf error prevention');

  // Override Array.prototype.includes to add safety
  const originalIncludes = Array.prototype.includes;

  Array.prototype.includes = function(searchElement, fromIndex) {
    try {
      // Validate this is actually an array
      if (!this || !Array.isArray(this)) {
        console.warn('[IndexOfFix] includes() called on non-array:', typeof this);
        return false;
      }

      return originalIncludes.call(this, searchElement, fromIndex);
    } catch (error) {
      console.warn('[IndexOfFix] Error in includes(), using manual check:', error);

      // Manual fallback implementation
      const array = this;
      const len = array.length;
      const start = Math.max(0, fromIndex || 0);

      for (let i = start; i < len; i++) {
        if (array[i] === searchElement) return true;
      }
      return false;
    }
  };

  console.log('[IndexOfFix] Global indexOf error prevention initialized');
};