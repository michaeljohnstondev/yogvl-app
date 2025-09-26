// Firebase Cloud Functions - Reminder Format Utilities
// Handles parsing and validation of reminder template formats

/**
 * Parse reminder template ID to time components
 * Supports format: "15m", "2h", "1d", "1w", "6x", "2y" (amount + unit first letter)
 * @param {string} templateId - Reminder template ID (e.g., "15m", "2h", "6x", "2y")
 * @returns {Object} Parsed reminder data or null if invalid
 */
function parseReminderTemplate(templateId) {
  if (!templateId || typeof templateId !== 'string') {
    return null;
  }

  // Match new format: number + single letter unit
  const match = templateId.match(/^(\d+)([mhdwxy])$/);
  if (!match) {
    return null;
  }

  const [, amountStr, unitChar] = match;
  const amount = parseInt(amountStr);

  if (amount <= 0 || amount > 999) {
    return null; // Invalid amount
  }

  // Map unit characters to full names
  const unitMap = {
    m: 'minutes',
    h: 'hours',
    d: 'days',
    w: 'weeks',
    x: 'months', // x for months
    y: 'years'   // y for years (reserved for future use)
  };

  const unit = unitMap[unitChar];
  if (!unit) {
    return null;
  }

  return {
    id: templateId,
    amount: amount,
    unit: unit,
    unitChar: unitChar
  };
}

/**
 * Convert reminder template to milliseconds before event
 * @param {string} templateId - Reminder template ID (e.g., "15m", "2h")
 * @returns {number|null} Milliseconds before event, or null if invalid
 */
function reminderToMilliseconds(templateId) {
  const parsed = parseReminderTemplate(templateId);
  if (!parsed) {
    return null;
  }

  const { amount, unit } = parsed;

  switch (unit) {
    case 'minutes':
      return amount * 60 * 1000;
    case 'hours':
      return amount * 60 * 60 * 1000;
    case 'days':
      return amount * 24 * 60 * 60 * 1000;
    case 'weeks':
      return amount * 7 * 24 * 60 * 60 * 1000;
    case 'months':
      return amount * 30 * 24 * 60 * 60 * 1000; // Approximate 30 days
    case 'years':
      return amount * 365 * 24 * 60 * 60 * 1000; // Approximate 365 days
    default:
      return null;
  }
}

/**
 * Generate human-readable label for reminder template
 * @param {string} templateId - Reminder template ID (e.g., "15m", "2h")
 * @returns {string|null} Human readable label or null if invalid
 */
function reminderToLabel(templateId) {
  const parsed = parseReminderTemplate(templateId);
  if (!parsed) {
    return null;
  }

  const { amount, unit } = parsed;

  // Generate appropriate labels with pluralization
  const unitLabels = {
    minutes: amount === 1 ? 'minute' : 'minutes',
    hours: amount === 1 ? 'hour' : 'hours',
    days: amount === 1 ? 'day' : 'days',
    weeks: amount === 1 ? 'week' : 'weeks',
    months: amount === 1 ? 'month' : 'months',
    years: amount === 1 ? 'year' : 'years',
  };

  const unitLabel = unitLabels[unit] || unit;
  return `${amount} ${unitLabel}`;
}

/**
 * Calculate when a reminder should be sent based on event time and reminder template
 * @param {Date} eventDateTime - When the event starts
 * @param {string} templateId - Reminder template ID (e.g., "15m", "2h")
 * @returns {Date|null} When to send the reminder, or null if invalid
 */
function calculateReminderTime(eventDateTime, templateId) {
  if (!eventDateTime || !(eventDateTime instanceof Date)) {
    return null;
  }

  const reminderMs = reminderToMilliseconds(templateId);
  if (reminderMs === null) {
    return null;
  }

  const reminderTime = new Date(eventDateTime.getTime() - reminderMs);

  // Don't schedule reminders in the past
  if (reminderTime < new Date()) {
    return null;
  }

  return reminderTime;
}

/**
 * Validate if reminder template format is valid
 * @param {string} templateId - Reminder template ID to validate
 * @returns {boolean} True if valid format
 */
function isValidReminderTemplate(templateId) {
  return parseReminderTemplate(templateId) !== null;
}

module.exports = {
  parseReminderTemplate,
  reminderToMilliseconds,
  reminderToLabel,
  calculateReminderTime,
  isValidReminderTemplate
};