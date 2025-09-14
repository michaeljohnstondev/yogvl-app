// FILE: useAttendanceTracking.js - Hook for managing attendance tracking during wrap-up

import { useState, useEffect } from 'react';
import { AttendanceService } from '../../../services/AttendanceService';
import { useVibeAlert } from '../../../components/ui/base/VibeAlertContext';

export const useAttendanceTracking = (studioId, eventId, participants = []) => {
  const [attendees, setAttendees] = useState(new Set());
  const [noShows, setNoShows] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const vibeAlert = useVibeAlert();

  // Initialize attendance state from existing event data
  useEffect(() => {
    if (participants.length > 0) {
      loadExistingAttendance();
    }
  }, [participants, studioId, eventId]);

  const loadExistingAttendance = async () => {
    try {
      setLoading(true);

      const attendanceData = await AttendanceService.getEventAttendance(
        studioId,
        eventId
      );

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
      console.error('Error loading existing attendance:', error);
      vibeAlert.error('Error', 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  // Toggle attendance status for a user
  const toggleAttendance = (userId, eventType = 'casual') => {
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
  };

  // Bulk mark all as attended
  const markAllAttended = () => {
    const allUserIds = participants.map((p) => p.id);
    setAttendees(new Set(allUserIds));
    setNoShows(new Set());
    setHasChanges(true);
  };

  // Clear all attendance
  const clearAllAttendance = () => {
    setAttendees(new Set());
    setNoShows(new Set());
    setHasChanges(true);
  };

  // Get attendance status for a user
  const getAttendanceStatus = (userId) => {
    if (attendees.has(userId)) return 'attended';
    if (noShows.has(userId)) return 'no-show';
    return 'unknown';
  };

  // Get attendance statistics
  const getAttendanceStats = () => {
    const totalParticipants = participants.length;
    const attendedCount = attendees.size;
    const noShowCount = noShows.size;
    const unknownCount = totalParticipants - attendedCount - noShowCount;

    return {
      total: totalParticipants,
      attended: attendedCount,
      noShows: noShowCount,
      unknown: unknownCount,
      attendanceRate:
        totalParticipants > 0 ? (attendedCount / totalParticipants) * 100 : 0,
    };
  };

  // Get lists for event completion
  const getAttendanceLists = () => {
    return {
      attendeeIds: Array.from(attendees),
      noShowIds: Array.from(noShows),
    };
  };

  // Reset to original state
  const resetChanges = () => {
    loadExistingAttendance();
    setHasChanges(false);
  };

  // Mark individual user attendance
  const markUserAttendance = async (userId, attended, markedBy) => {
    try {
      if (attended) {
        await AttendanceService.markAttended(
          studioId,
          eventId,
          userId,
          markedBy
        );
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

      return true;
    } catch (error) {
      console.error('Error marking user attendance:', error);
      vibeAlert.error('Error', `Failed to mark attendance for user`);
      return false;
    }
  };

  // Validate attendance data before completion
  const validateAttendance = () => {
    const stats = getAttendanceStats();

    if (stats.total === 0) {
      return {
        valid: false,
        message: 'No participants to mark attendance for',
      };
    }

    if (stats.attended === 0 && stats.noShows === 0) {
      return {
        valid: false,
        message: 'Please mark attendance for at least one participant',
      };
    }

    return { valid: true };
  };

  return {
    // State
    attendees: Array.from(attendees),
    noShows: Array.from(noShows),
    loading,
    hasChanges,

    // Actions
    toggleAttendance,
    markAllAttended,
    clearAllAttendance,
    markUserAttendance,
    resetChanges,

    // Getters
    getAttendanceStatus,
    getAttendanceStats,
    getAttendanceLists,
    validateAttendance,
  };
};
