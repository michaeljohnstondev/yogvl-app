// FILE: useAttendanceTracking.js - OPTIMIZED VERSION
// Hook for managing attendance tracking during wrap-up with performance optimizations

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AttendanceService } from '../../../services/AttendanceService';
import { useVibeAlert } from '../../../components/ui/base/VibeAlertContext';

export const useAttendanceTracking = (studioId, eventId, participants = [], options = {}) => {
  const { enableAutoLoad = true, onAttendanceChange = () => {} } = options;

  const [attendees, setAttendees] = useState(new Set());
  const [noShows, setNoShows] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const vibeAlert = useVibeAlert();

  // Memoize participant IDs to prevent unnecessary effect triggers
  const participantIds = useMemo(
    () => participants.map((p) => p.id),
    [participants]
  );

  // Memoize attendance statistics for performance
  const attendanceStats = useMemo(() => {
    const totalParticipants = participants.length;
    const attendedCount = attendees.size;
    const noShowCount = noShows.size;
    const unknownCount = totalParticipants - attendedCount - noShowCount;

    return {
      total: totalParticipants,
      attended: attendedCount,
      noShows: noShowCount,
      unknown: unknownCount,
      attendanceRate: totalParticipants > 0 ? (attendedCount / totalParticipants) * 100 : 0,
    };
  }, [participants.length, attendees.size, noShows.size]);

  // Memoize attendance lists for performance
  const attendanceLists = useMemo(() => ({
    attendeeIds: Array.from(attendees),
    noShowIds: Array.from(noShows),
  }), [attendees, noShows]);

  // Use useCallback for stable function reference
  const loadExistingAttendance = useCallback(async () => {
    if (!enableAutoLoad || !studioId || !eventId) return;

    try {
      setLoading(true);

      const attendanceData = await AttendanceService.getEventAttendance(studioId, eventId);

      if (attendanceData?.attendanceData) {
        const attendedUsers = new Set();
        const noShowUsers = new Set();

        attendanceData.attendanceData.forEach((record) => {
          if (record.attended) {
            attendedUsers.add(record.userId);
          } else {
            noShowUsers.add(record.userId);
          }
        });

        setAttendees(attendedUsers);
        setNoShows(noShowUsers);
      }
    } catch (error) {
      console.error('[useAttendanceTracking] Error loading existing attendance:', error);
      vibeAlert.error('Error', 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, [studioId, eventId, enableAutoLoad, vibeAlert]);

  // Initialize attendance state from existing event data
  useEffect(() => {
    if (participants.length > 0) {
      loadExistingAttendance();
    }
  }, [participantIds.length, loadExistingAttendance]);

  // Optimized toggle function with useCallback
  const toggleAttendance = useCallback((userId, eventType = 'casual') => {
    const newAttendees = new Set(attendees);
    const newNoShows = new Set(noShows);

    if (attendees.has(userId)) {
      // Currently marked as attended - remove from attendees
      newAttendees.delete(userId);

      // For strict events, add to no-shows; for casual, leave neutral
      if (eventType === 'strict') {
        newNoShows.add(userId);
      }
    } else if (noShows.has(userId)) {
      // Currently marked as no-show - remove from no-shows, leave neutral
      newNoShows.delete(userId);
    } else {
      // Currently neutral - mark as attended
      newAttendees.add(userId);
    }

    setAttendees(newAttendees);
    setNoShows(newNoShows);
    setHasChanges(true);

    // Notify parent component of changes
    onAttendanceChange({
      attendeeIds: Array.from(newAttendees),
      noShowIds: Array.from(newNoShows),
    });
  }, [attendees, noShows, onAttendanceChange]);

  // Bulk operations with useCallback
  const markAllAttended = useCallback(() => {
    const allUserIds = participantIds;
    const newAttendees = new Set(allUserIds);
    const newNoShows = new Set();

    setAttendees(newAttendees);
    setNoShows(newNoShows);
    setHasChanges(true);

    onAttendanceChange({
      attendeeIds: Array.from(newAttendees),
      noShowIds: Array.from(newNoShows),
    });
  }, [participantIds, onAttendanceChange]);

  const clearAllAttendance = useCallback(() => {
    const newAttendees = new Set();
    const newNoShows = new Set();

    setAttendees(newAttendees);
    setNoShows(newNoShows);
    setHasChanges(true);

    onAttendanceChange({
      attendeeIds: [],
      noShowIds: [],
    });
  }, [onAttendanceChange]);

  // Memoized status checker
  const getAttendanceStatus = useCallback((userId) => {
    if (attendees.has(userId)) return 'attended';
    if (noShows.has(userId)) return 'no-show';
    return 'unknown';
  }, [attendees, noShows]);

  // Mark individual user attendance with proper error handling
  const markAttendance = useCallback(async (userId, attended, markedBy) => {
    try {
      if (attended) {
        await AttendanceService.markAttended(studioId, eventId, userId, markedBy);
      } else {
        await AttendanceService.markNoShow(studioId, eventId, userId, markedBy);
      }

      // Update local state
      const newAttendees = new Set(attendees);
      const newNoShows = new Set(noShows);

      if (attended) {
        newAttendees.add(userId);
        newNoShows.delete(userId);
      } else {
        newAttendees.delete(userId);
        newNoShows.add(userId);
      }

      setAttendees(newAttendees);
      setNoShows(newNoShows);

      onAttendanceChange({
        attendeeIds: Array.from(newAttendees),
        noShowIds: Array.from(newNoShows),
      });

      return true;
    } catch (error) {
      console.error('[useAttendanceTracking] Error marking user attendance:', error);
      vibeAlert.error('Error', 'Failed to mark attendance for user');
      return false;
    }
  }, [studioId, eventId, attendees, noShows, vibeAlert, onAttendanceChange]);

  // Reset to original state
  const resetChanges = useCallback(() => {
    loadExistingAttendance();
    setHasChanges(false);
  }, [loadExistingAttendance]);

  // Validate attendance data before completion
  const validateAttendance = useCallback(() => {
    if (attendanceStats.total === 0) {
      return {
        valid: false,
        message: 'No participants to mark attendance for',
      };
    }

    if (attendanceStats.attended === 0 && attendanceStats.noShows === 0) {
      return {
        valid: false,
        message: 'Please mark attendance for at least one participant',
      };
    }

    return { valid: true };
  }, [attendanceStats]);

  return {
    // State
    attendees: attendanceLists.attendeeIds,
    noShows: attendanceLists.noShowIds,
    loading,
    hasChanges,

    // Computed properties (memoized)
    attendanceStats,
    attendanceLists,

    // Actions (memoized with useCallback)
    toggleAttendance,
    markAllAttended,
    clearAllAttendance,
    markAttendance,
    resetChanges,
    loadExistingAttendance,

    // Utilities (memoized)
    getAttendanceStatus,
    validateAttendance,
  };
};