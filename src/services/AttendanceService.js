import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';
import { ReliabilityService } from './ReliabilityService';

export class AttendanceService {
  
  /**
   * Mark user as attended an event
   * @param {string} studioId - Studio ID
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID
   * @param {string} markedBy - ID of user marking attendance (host)
   * @returns {Promise<boolean>} Success status
   */
  static async markAttended(studioId, eventId, userId, markedBy) {
    try {
      const attendanceRef = doc(db, 'studios', studioId, 'events', eventId, 'attendance', userId);
      
      await setDoc(attendanceRef, {
        userId: userId,
        eventId: eventId,
        attended: true,
        markedBy: markedBy,
        markedAt: serverTimestamp(),
        checkInTime: serverTimestamp(),
      });

      // Update event document with attendance count
      await this.updateEventAttendanceCount(eventId);

      // Update user's reliability score
      await ReliabilityService.updateUserReliability(userId);

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark user as not attended (no-show)
   * @param {string} eventId - Event ID  
   * @param {string} userId - User ID
   * @param {string} markedBy - ID of user marking attendance (host)
   * @returns {Promise<boolean>} Success status
   */
  static async markNoShow(studioId, eventId, userId, markedBy) {
    try {
      const attendanceRef = doc(db, 'studios', studioId, 'events', eventId, 'attendance', userId);
      
      await setDoc(attendanceRef, {
        userId: userId,
        eventId: eventId,
        attended: false,
        markedBy: markedBy,
        markedAt: serverTimestamp(),
        noShow: true,
      });

      // Update user's reliability score
      await ReliabilityService.updateUserReliability(userId);

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get attendance data for an event
   * @param {string} eventId - Event ID
   * @returns {Promise<Object>} Attendance data with stats
   */
  static async getEventAttendance(studioId, eventId) {
    try {
      const attendanceRef = collection(db, 'studios', studioId, 'events', eventId, 'attendance');
      const snapshot = await getDocs(attendanceRef);
      
      const attendanceData = [];
      let attendedCount = 0;
      let noShowCount = 0;
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        attendanceData.push(data);
        
        if (data.attended) {
          attendedCount++;
        } else if (data.noShow) {
          noShowCount++;
        }
      });

      // Get event RSVP data for comparison
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      const eventData = eventDoc.data();
      const rsvpCount = eventData?.subscribers?.length || 0;

      return {
        attendanceData,
        stats: {
          rsvpCount,
          attendedCount,
          noShowCount,
          pendingCount: rsvpCount - attendedCount - noShowCount,
          attendanceRate: rsvpCount > 0 ? (attendedCount / rsvpCount) * 100 : 0,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user's attendance record
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User's attendance stats
   */
  static async getUserAttendanceRecord(userId) {
    try {
      // Query all attendance records for this user
      // Note: This method queries across all studios - needs refactoring for studio-centric approach
      const eventsSnapshot = await getDocs(eventsRef);
      
      let totalEvents = 0;
      let attendedEvents = 0;
      let noShowEvents = 0;
      const recentActivity = [];

      // Check each event for this user's attendance
      for (const eventDoc of eventsSnapshot.docs) {
        const eventId = eventDoc.id;
        const eventData = eventDoc.data();
        
        // Skip if user wasn't subscribed to this event
        if (!eventData.subscribers?.includes(userId)) {
          continue;
        }

        const attendanceRef = doc(db, 'events', eventId, 'attendance', userId);
        const attendanceDoc = await getDoc(attendanceRef);
        
        if (attendanceDoc.exists()) {
          const attendanceData = attendanceDoc.data();
          totalEvents++;
          
          if (attendanceData.attended) {
            attendedEvents++;
          } else if (attendanceData.noShow) {
            noShowEvents++;
          }

          recentActivity.push({
            eventId,
            eventTitle: eventData.title,
            eventDate: eventData.eventTimestamp,
            attended: attendanceData.attended,
            noShow: attendanceData.noShow,
            markedAt: attendanceData.markedAt,
          });
        }
      }

      // Sort recent activity by event date
      recentActivity.sort((a, b) => {
        const dateA = a.eventDate?.toDate() || new Date(0);
        const dateB = b.eventDate?.toDate() || new Date(0);
        return dateB - dateA;
      });

      const reliabilityScore = totalEvents > 0 ? (attendedEvents / totalEvents) * 100 : 100;

      return {
        totalEvents,
        attendedEvents,
        noShowEvents,
        reliabilityScore: Math.round(reliabilityScore),
        recentActivity: recentActivity.slice(0, 10), // Last 10 events
      };
    } catch (error) {
      throw error;
    }
  }


  /**
   * Update event's attendance count
   * @param {string} eventId - Event ID
   */
  static async updateEventAttendanceCount(eventId) {
    try {
      const attendanceData = await this.getEventAttendance(eventId);
      const eventRef = doc(db, 'events', eventId);
      
      await updateDoc(eventRef, {
        attendanceCount: attendanceData.stats.attendedCount,
        attendanceRate: Math.round(attendanceData.stats.attendanceRate),
        lastAttendanceUpdate: serverTimestamp(),
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if user can mark attendance (is host of event)
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Whether user can mark attendance
   */
  static async canMarkAttendance(eventId, userId) {
    try {
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (!eventDoc.exists()) return false;
      
      const eventData = eventDoc.data();
      return eventData.hostId === userId;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get attendance status for a specific user and event
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID  
   * @returns {Promise<Object|null>} Attendance status or null if not marked
   */
  static async getUserEventAttendance(eventId, userId) {
    try {
      const attendanceRef = doc(db, 'events', eventId, 'attendance', userId);
      const attendanceDoc = await getDoc(attendanceRef);
      
      if (attendanceDoc.exists()) {
        return attendanceDoc.data();
      }
      
      return null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Bulk mark attendance for multiple users
   * @param {string} eventId - Event ID
   * @param {Array} attendanceList - Array of {userId, attended} objects
   * @param {string} markedBy - ID of user marking attendance
   * @returns {Promise<boolean>} Success status
   */
  static async bulkMarkAttendance(eventId, attendanceList, markedBy) {
    try {
      const promises = attendanceList.map(({ userId, attended }) => {
        if (attended) {
          return this.markAttended(eventId, userId, markedBy);
        } else {
          return this.markNoShow(eventId, userId, markedBy);
        }
      });

      await Promise.all(promises);
      return true;
    } catch (error) {
      throw error;
    }
  }
}