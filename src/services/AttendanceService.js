import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';
import { ReliabilityService } from './ReliabilityService';

export class AttendanceService {
  /**
   * Check if event is a solo event (host is the only subscriber)
   * Solo events don't count toward attendance metrics
   * @param {Object} eventData - Event data object
   * @returns {boolean} True if host is the only subscriber
   */
  static isSoloEvent(eventData) {
    return (
      eventData.subscribers?.length === 1 &&
      eventData.subscribers[0] === eventData.createdBy
    );
  }

  /**
   * Mark user as attended an event
   * @param {string} studioId - Studio ID
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID
   * @param {string} markedBy - ID of user marking attendance (host)
   * @returns {Promise<boolean>} Success status
   */
  static async markAttended(studioId, eventId, userId, markedBy) {
    console.log('[AttendanceService] markAttended called with:', {
      studioId,
      eventId,
      userId,
      markedBy
    });
    try {
      const eventRef = doc(db, 'studios', studioId, 'events', eventId);
      console.log('[AttendanceService] Fetching event from path:', `studios/${studioId}/events/${eventId}`);
      const eventDoc = await getDoc(eventRef);

      if (!eventDoc.exists()) {
        console.error('[AttendanceService] Event not found at path:', `studios/${studioId}/events/${eventId}`);
        throw new Error(`Event ${eventId} not found`);
      }

      console.log('[AttendanceService] Event found, processing attendance...');
      const eventData = eventDoc.data();
      const attendance = eventData.attendance || [];
      const isHost = eventData.createdBy === userId;
      const isSolo = this.isSoloEvent(eventData);

      // Find existing attendance record or create new one
      const existingIndex = attendance.findIndex((a) => a.userId === userId);

      const attendanceRecord = {
        userId: userId,
        attended: true,
        isHost: isHost,
        markedBy: markedBy,
        markedAt: new Date(),
        isSoloEvent: isSolo, // Flag for excluding from metrics
      };

      console.log('[AttendanceService] Using new Date() timestamp:', attendanceRecord.markedAt);

      if (existingIndex >= 0) {
        // Update existing record
        attendance[existingIndex] = attendanceRecord;
      } else {
        // Add new record
        attendance.push(attendanceRecord);
      }

      // Update event with new attendance array
      await updateDoc(eventRef, {
        attendance: attendance,
        attendanceCount: attendance.filter((a) => a.attended).length,
      });

      // Log the attendance marking
      if (!isSolo) {
        console.log(
          `Marked ${userId} as attended for event ${eventId} ${isHost ? '(host)' : '(guest)'} (${eventData.attendanceType || 'unknown'} event)`
        );
        // Note: Reliability updates are now handled by PostEventService during event completion
      } else {
        console.log(
          `Marked ${userId} as attended for SOLO event ${eventId} - no metrics recorded`
        );
      }
      return true;
    } catch (error) {
      console.error('[AttendanceService] markAttended error:', error);
      throw error;
    }
  }

  /**
   * Mark user as not attended (no-show)
   * @param {string} studioId - Studio ID
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID
   * @param {string} markedBy - ID of user marking attendance (host)
   * @returns {Promise<boolean>} Success status
   */
  static async markNoShow(studioId, eventId, userId, markedBy) {
    try {
      const eventRef = doc(db, 'studios', studioId, 'events', eventId);
      const eventDoc = await getDoc(eventRef);

      if (!eventDoc.exists()) {
        throw new Error(`Event ${eventId} not found`);
      }

      const eventData = eventDoc.data();
      const attendance = eventData.attendance || [];
      const isHost = eventData.createdBy === userId;
      const isSolo = this.isSoloEvent(eventData);

      // Find existing attendance record or create new one
      const existingIndex = attendance.findIndex((a) => a.userId === userId);

      const attendanceRecord = {
        userId: userId,
        attended: false,
        isHost: isHost,
        markedBy: markedBy,
        markedAt: new Date(),
        isSoloEvent: isSolo, // Flag for excluding from metrics
      };

      if (existingIndex >= 0) {
        // Update existing record
        attendance[existingIndex] = attendanceRecord;
      } else {
        // Add new record
        attendance.push(attendanceRecord);
      }

      // Update event with new attendance array
      await updateDoc(eventRef, {
        attendance: attendance,
        attendanceCount: attendance.filter((a) => a.attended).length,
      });

      // Log the no-show marking
      if (isSolo) {
        console.log(
          `No-show recorded for SOLO event ${eventId} - no metrics recorded`
        );
      } else {
        // Track no-shows for host visibility - reliability impact handled by PostEventService
        if (eventData.attendanceType === 'strict') {
          console.log(
            `No-show recorded for strict event: ${userId} (reliability will be updated on event completion)`
          );
        } else {
          console.log(
            `No-show recorded for casual event (no reliability impact): ${userId}`
          );
        }
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get attendance data for an event
   * @param {string} studioId - Studio ID
   * @param {string} eventId - Event ID
   * @returns {Promise<Object>} Attendance data with stats
   */
  static async getEventAttendance(studioId, eventId) {
    try {
      const eventRef = doc(db, 'studios', studioId, 'events', eventId);
      const eventDoc = await getDoc(eventRef);

      if (!eventDoc.exists()) {
        throw new Error(`Event ${eventId} not found`);
      }

      const eventData = eventDoc.data();
      const attendance = eventData.attendance || [];
      const rsvpCount = eventData.subscribers?.length || 0;

      const attendedCount = attendance.filter((a) => a.attended).length;
      const noShowCount = attendance.filter((a) => !a.attended).length;

      return {
        attendanceData: attendance,
        stats: {
          rsvpCount,
          attendedCount,
          noShowCount,
          pendingCount: rsvpCount - attendance.length, // People who haven't been marked yet
          attendanceRate: rsvpCount > 0 ? (attendedCount / rsvpCount) * 100 : 0,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  // This function is no longer needed as attendance count is updated inline

  /**
   * Check if user can mark attendance (is host, cohost, or admin)
   * @param {string} studioId - Studio ID
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID
   * @param {Object} userData - User data (optional, for admin check)
   * @returns {Promise<boolean>} Whether user can mark attendance
   */
  static async canMarkAttendance(studioId, eventId, userId, userData = null) {
    try {
      const eventDoc = await getDoc(
        doc(db, 'studios', studioId, 'events', eventId)
      );
      if (!eventDoc.exists()) return false;

      const eventData = eventDoc.data();
      // Check if user is creator, cohost, or admin
      const isCreator = eventData.createdBy === userId;
      const isCohost = eventData.cohosts?.includes(userId) || false;
      const isAdmin = userData?.isAdmin || false;

      return isCreator || isCohost || isAdmin;
    } catch (error) {
      return false;
    }
  }

  // getUserEventAttendance method removed - use getAttendanceStatus from attendanceUtils.js instead

  /**
   * Bulk mark attendance for multiple users
   * @param {string} studioId - Studio ID
   * @param {string} eventId - Event ID
   * @param {Array} attendanceList - Array of {userId, attended} objects
   * @param {string} markedBy - ID of user marking attendance
   * @returns {Promise<boolean>} Success status
   */
  static async bulkMarkAttendance(studioId, eventId, attendanceList, markedBy) {
    try {
      const promises = attendanceList.map(({ userId, attended }) => {
        if (attended) {
          return this.markAttended(studioId, eventId, userId, markedBy);
        } else {
          return this.markNoShow(studioId, eventId, userId, markedBy);
        }
      });

      await Promise.all(promises);
      return true;
    } catch (error) {
      throw error;
    }
  }

  // markHostAttendance method removed - hosts are automatically included in post-event flow

  /**
   * Delete all attendance records for an event (used when deleting event)
   * @param {string} studioId - Studio ID
   * @param {string} eventId - Event ID
   * @returns {Promise<boolean>} Success status
   */
  static async deleteEventAttendance(studioId, eventId) {
    try {
      const eventRef = doc(db, 'studios', studioId, 'events', eventId);

      // Simply clear the attendance array
      await updateDoc(eventRef, {
        attendance: [],
        attendanceCount: 0,
      });

      console.log(`Cleared attendance array for event ${eventId}`);
      return true;
    } catch (error) {
      console.error('Error clearing event attendance:', error);
      throw error;
    }
  }

  /**
   * Allow users to self-report their attendance for casual events
   * @param {string} studioId - Studio ID
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID (must be same as currentUser)
   * @param {boolean} attended - Whether user attended
   * @returns {Promise<boolean>} Success status
   */
  static async selfReportAttendance(studioId, eventId, userId, attended) {
    try {
      const eventRef = doc(db, 'studios', studioId, 'events', eventId);
      const eventDoc = await getDoc(eventRef);

      if (!eventDoc.exists()) {
        throw new Error(`Event ${eventId} not found`);
      }

      const eventData = eventDoc.data();
      const isSolo = this.isSoloEvent(eventData);

      // Don't allow self-reporting for solo events
      if (isSolo) {
        throw new Error('Self-reporting is not available for solo events');
      }

      // Only allow self-reporting for casual events
      if (eventData.attendanceType !== 'casual') {
        throw new Error('Self-reporting is only allowed for casual events');
      }

      // Only allow self-reporting for past events
      const eventDate = eventData.eventTimestamp?.toDate() || new Date();
      if (eventDate > new Date()) {
        throw new Error('Self-reporting is only allowed for past events');
      }

      // Check if user was subscribed to this event
      if (!eventData.subscribers?.includes(userId)) {
        throw new Error(
          'You can only report attendance for events you were subscribed to'
        );
      }

      const attendance = eventData.attendance || [];

      // Check if there's already a host-marked record
      const existingIndex = attendance.findIndex((a) => a.userId === userId);
      if (existingIndex >= 0 && attendance[existingIndex].markedBy !== userId) {
        throw new Error('Attendance has already been marked by the event host');
      }

      // Add or update self-reported attendance
      const attendanceRecord = {
        userId: userId,
        attended: attended,
        isHost: eventData.createdBy === userId,
        markedBy: userId, // Self-reported
        selfReported: true,
        isSoloEvent: false, // Already checked - not a solo event
        markedAt: new Date(),
      };

      if (existingIndex >= 0) {
        attendance[existingIndex] = attendanceRecord;
      } else {
        attendance.push(attendanceRecord);
      }

      // Update event with new attendance array
      await updateDoc(eventRef, {
        attendance: attendance,
        attendanceCount: attendance.filter((a) => a.attended).length,
      });

      // Note: Reliability updates are handled by PostEventService during event completion
      // Self-reported positive attendance for casual events is tracked for metrics

      console.log(
        `Self-reported attendance: ${userId} - ${attended ? 'attended' : 'did not attend'} casual event ${eventId}`
      );
      return true;
    } catch (error) {
      console.error('Error with self-reported attendance:', error);
      throw error;
    }
  }

  /**
   * Clear attendance status (mark as pending)
   * @param {string} studioId - Studio ID
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  static async clearAttendance(studioId, eventId, userId) {
    try {
      const eventRef = doc(db, 'studios', studioId, 'events', eventId);
      const eventDoc = await getDoc(eventRef);

      if (!eventDoc.exists()) {
        throw new Error(`Event ${eventId} not found`);
      }

      const eventData = eventDoc.data();
      const attendance = eventData.attendance || [];

      // Remove the user's attendance record
      const updatedAttendance = attendance.filter((a) => a.userId !== userId);

      // Update event with filtered attendance array
      await updateDoc(eventRef, {
        attendance: updatedAttendance,
        attendanceCount: updatedAttendance.filter((a) => a.attended).length,
      });

      console.log(`Cleared attendance for user ${userId} in event ${eventId}`);
      return true;
    } catch (error) {
      console.error('[AttendanceService] clearAttendance error:', error);
      throw error;
    }
  }

  // Double-counting check no longer needed with array-based approach
}
