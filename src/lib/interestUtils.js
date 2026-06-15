/**
 * Interest utility functions for handling user interest operations
 * Provides case-insensitive comparison and array manipulation for interests
 */

/**
 * Title-cases an interest string for display only. Interests are stored
 * lowercase as canonical keys; this is what UI chips, pills, and
 * banners should call at render time so the display is always nice
 * regardless of what casing was originally stored. Handles plain
 * lowercase ("magnolia park"), already-cased values ("House Music"),
 * and multi-word strings consistently.
 *
 * @param {string} interest - Interest string (any casing)
 * @returns {string} Title-cased interest, or '' if invalid
 * @example
 *   titleCaseInterest('magnolia park') // 'Magnolia Park'
 *   titleCaseInterest('HOUSE MUSIC')   // 'House Music'
 *   titleCaseInterest('concert')       // 'Concert'
 */
export const titleCaseInterest = (interest) => {
  if (!interest || typeof interest !== 'string') return '';
  return interest
    .trim()
    .toLowerCase()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase());
};

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
    .replace(/[^\w\s\-&.']/g, '')
    .trim(); // Trim again after removing special characters like emojis

  return sanitized || null;
};

/**
 * Validates an interests array for storage
 * Checks array length, sanitizes each interest, removes duplicates
 * @param {string[]} interests - Array of interests to validate
 * @returns {string[]} - Array of valid, sanitized, unique interests
 */
export const validateInterestsArray = (interests) => {
  if (!Array.isArray(interests)) return [];

  // Limit to 50 interests max, sanitize each one, and deduplicate (case-insensitive)
  const seen = new Set();
  return interests
    .slice(0, 50)
    .map(sanitizeInterest)
    .filter((interest) => {
      if (interest === null) return false;
      const normalized = interest.toLowerCase();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
};

/**
 * Normalizes an event title to an interest string
 * Removes emojis, trims whitespace, converts to lowercase
 * This ensures consistent interest matching across the app
 * @param {string} eventTitle - Event title to normalize
 * @returns {string} - Normalized interest string (lowercase, no emoji, trimmed)
 */
export const normalizeEventTitleToInterest = (eventTitle) => {
  if (!eventTitle || typeof eventTitle !== 'string') return '';

  // Remove emojis using regex pattern
  const emojiRegex =
    /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]/gu;

  const withoutEmoji = eventTitle.replace(emojiRegex, '');

  // Trim and lowercase for consistent storage/lookup
  return withoutEmoji.trim().toLowerCase();
};
