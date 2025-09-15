// FILE: lib/attendanceUtils.js - Attendance Calculation and Display Utilities
// Centralizes attendance-related calculations and display logic

import theme from '../theme/themes';

/**
 * Get attendance status for a user from attendance array
 * @param {string} userId - User ID to check
 * @param {Array} attendanceArray - Event attendance array
 * @returns {Object|null} Attendance record or null if not found
 */
export const getAttendanceStatus = (userId, attendanceArray = []) => {
  return attendanceArray.find(record => record.userId === userId) || null;
};

/**
 * Calculate attendance statistics for an event
 * @param {Array} attendanceArray - Event attendance array
 * @param {Array} subscribersArray - Event subscribers array
 * @returns {Object} Attendance statistics
 */
export const calculateAttendanceStats = (attendanceArray = [], subscribersArray = []) => {
  const attendedCount = attendanceArray.filter(record => record.attended).length;
  const noShowCount = attendanceArray.filter(record => !record.attended).length;
  const totalParticipants = subscribersArray.length;
  const unmarkedCount = Math.max(0, totalParticipants - attendanceArray.length);

  return {
    attended: attendedCount,
    noShows: noShowCount,
    total: totalParticipants,
    unmarked: unmarkedCount,
    attendanceRate: totalParticipants > 0 ? (attendedCount / totalParticipants) * 100 : 0
  };
};

/**
 * Get display color for attendance status
 * @param {Object} attendanceRecord - Attendance record
 * @returns {string} Color code
 */
export const getAttendanceStatusColor = (attendanceRecord) => {
  if (!attendanceRecord) return theme.colors.textSecondary;
  if (attendanceRecord.attended) return theme.colors.vibeGreen;
  if (attendanceRecord.attended === false) return theme.colors.vibeRed; // explicitly false (no-show)
  return theme.colors.textSecondary; // pending
};

/**
 * Get display text for attendance status
 * @param {Object} attendanceRecord - Attendance record
 * @returns {string} Status text
 */
export const getAttendanceStatusText = (attendanceRecord) => {
  if (!attendanceRecord) return '⏳ Pending';
  if (attendanceRecord.attended) return '✅ Attended';
  if (attendanceRecord.attended === false) return '❌ No Show';
  return '⏳ Pending';
};

/**
 * Check if user can mark attendance for an event
 * @param {string} userId - User ID
 * @param {Object} eventData - Event data
 * @returns {boolean} Can mark attendance
 */
export const canMarkAttendance = (userId, eventData) => {
  if (!eventData || !userId) return false;

  const isCreator = eventData.createdBy === userId;
  const isCohost = eventData.cohosts?.includes(userId) || false;

  return isCreator || isCohost;
};

/**
 * Check if event is a solo event (excludes from metrics)
 * @param {Object} eventData - Event data
 * @returns {boolean} Is solo event
 */
export const isSoloEvent = (eventData) => {
  if (!eventData) return false;

  const subscriberCount = eventData.subscriberCount || 0;
  const hasSubscribers = (eventData.subscribers || []).length > 1;

  // Solo if only creator or less than 2 total participants
  return subscriberCount <= 1 || !hasSubscribers;
};

/**
 * Validate attendance record structure
 * @param {Object} attendanceRecord - Attendance record to validate
 * @returns {boolean} Is valid
 */
export const validateAttendanceRecord = (attendanceRecord) => {
  if (!attendanceRecord || typeof attendanceRecord !== 'object') return false;

  const requiredFields = ['userId', 'attended', 'markedBy', 'markedAt'];
  return requiredFields.every(field => attendanceRecord.hasOwnProperty(field));
};

/**
 * Create attendance record object
 * @param {string} userId - User ID
 * @param {boolean} attended - Attended status
 * @param {string} markedBy - Marked by user ID
 * @param {Object} options - Additional options
 * @returns {Object} Attendance record
 */
export const createAttendanceRecord = (userId, attended, markedBy, options = {}) => {
  return {
    userId,
    attended,
    markedBy,
    markedAt: new Date(),
    isHost: options.isHost || false,
    selfReported: options.selfReported || false,
    isSoloEvent: options.isSoloEvent || false,
    ...options
  };
};

/**
 * Filter attendance records by criteria
 * @param {Array} attendanceArray - Attendance array
 * @param {Object} criteria - Filter criteria
 * @returns {Array} Filtered attendance records
 */
export const filterAttendanceRecords = (attendanceArray = [], criteria = {}) => {
  return attendanceArray.filter(record => {
    if (criteria.attended !== undefined && record.attended !== criteria.attended) {
      return false;
    }
    if (criteria.markedBy && record.markedBy !== criteria.markedBy) {
      return false;
    }
    if (criteria.selfReported !== undefined && record.selfReported !== criteria.selfReported) {
      return false;
    }
    return true;
  });
};

/**
 * Get attendance completion percentage for UI display
 * @param {Object} stats - Attendance statistics
 * @returns {number} Completion percentage (0-100)
 */
export const getAttendanceCompletionPercentage = (stats) => {
  if (!stats || stats.total === 0) return 0;

  const markedCount = stats.attended + stats.noShows;
  return Math.round((markedCount / stats.total) * 100);
};

/**
 * Check if attendance tracking is complete for an event
 * @param {Object} stats - Attendance statistics
 * @param {string} eventType - Event type ('casual' or 'strict')
 * @returns {boolean} Is complete
 */
export const isAttendanceTrackingComplete = (stats, eventType = 'casual') => {
  if (!stats) return false;

  // For casual events, allow completion even with no attendees
  if (eventType === 'casual') {
    return stats.unmarked === 0; // All participants marked
  }

  // For strict events, require at least one attendee
  if (eventType === 'strict') {
    return stats.unmarked === 0 && stats.attended > 0;
  }

  return false;
};