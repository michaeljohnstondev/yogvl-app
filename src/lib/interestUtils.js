/**
 * Interest utility functions for handling user interest operations
 * Provides case-insensitive comparison and array manipulation for interests
 */

/**
 * Compares two interests ignoring case sensitivity
 * @param {string} interest1 - First interest to compare
 * @param {string} interest2 - Second interest to compare
 * @returns {boolean} - True if interests match (case-insensitive)
 */
export const compareInterestsIgnoreCase = (interest1, interest2) => {
  if (!interest1 || !interest2) return false;
  return interest1.toLowerCase() === interest2.toLowerCase();
};

/**
 * Checks if an interest exists in an array (case-insensitive)
 * @param {string[]} interests - Array of interests to search in
 * @param {string} targetInterest - Interest to find
 * @returns {boolean} - True if interest exists in array
 */
export const hasInterest = (interests, targetInterest) => {
  if (!Array.isArray(interests) || !targetInterest) return false;
  return interests.some((interest) =>
    compareInterestsIgnoreCase(interest, targetInterest)
  );
};

/**
 * Toggles an interest in an array (case-insensitive)
 * If interest exists, removes it. If not, adds it.
 * @param {string[]} interests - Current interests array
 * @param {string} targetInterest - Interest to toggle
 * @returns {string[]} - New interests array with toggled interest
 */
export const toggleInterestInArray = (interests, targetInterest) => {
  if (!Array.isArray(interests) || !targetInterest) return interests;

  const exists = hasInterest(interests, targetInterest);

  if (exists) {
    // Remove the interest (case-insensitive)
    return interests.filter(
      (interest) => !compareInterestsIgnoreCase(interest, targetInterest)
    );
  } else {
    // Add the new interest
    return [...interests, targetInterest];
  }
};

/**
 * Sanitizes an interest string for storage
 * Trims whitespace, validates length, removes harmful characters
 * @param {string} interest - Interest string to sanitize
 * @returns {string|null} - Sanitized interest or null if invalid
 */
export const sanitizeInterest = (interest) => {
  if (!interest || typeof interest !== 'string') return null;

  const trimmed = interest.trim();
  if (trimmed.length < 1 || trimmed.length > 50) return null;

  // Remove potentially harmful characters while keeping basic punctuation
  const sanitized = trimmed
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/[^\w\s\-&.']/g, '');

  return sanitized || null;
};

/**
 * Validates an interests array for storage
 * Checks array length, sanitizes each interest
 * @param {string[]} interests - Array of interests to validate
 * @returns {string[]} - Array of valid, sanitized interests
 */
export const validateInterestsArray = (interests) => {
  if (!Array.isArray(interests)) return [];

  // Limit to 50 interests max and sanitize each one
  return interests
    .slice(0, 50)
    .map(sanitizeInterest)
    .filter((interest) => interest !== null);
};
