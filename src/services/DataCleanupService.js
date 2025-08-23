import { 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc, 
  updateDoc, 
  arrayRemove, 
  writeBatch,
  orderBy,
  limit,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';

export class DataCleanupService {
  
  /**
   * Clean up old events and attendance data
   * @param {number} retentionDays - Days to keep data (default: 365)
   * @returns {Promise<Object>} Cleanup summary
   */
  static async cleanupOldEvents(retentionDays = 365) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      if (__DEV__) {
        console.log(`[DataCleanup] Starting cleanup of events older than ${cutoffDate.toLocaleDateString()}`);
      }

      // Find old events
      const eventsRef = collection(db, 'events');
      const q = query(
        eventsRef,
        where('eventTimestamp', '<', cutoffDate),
        orderBy('eventTimestamp'),
        limit(50) // Process in batches to avoid memory issues
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        if (__DEV__) console.log('[DataCleanup] No old events to clean up');
        return { eventsDeleted: 0, attendanceDeleted: 0 };
      }

      const batch = writeBatch(db);
      let eventsDeleted = 0;
      let attendanceDeleted = 0;

      for (const eventDoc of snapshot.docs) {
        const eventId = eventDoc.id;
        const eventData = eventDoc.data();
        
        // Delete attendance subcollection
        const attendanceRef = collection(db, 'events', eventId, 'attendance');
        const attendanceSnapshot = await getDocs(attendanceRef);
        
        attendanceSnapshot.docs.forEach(attendanceDoc => {
          batch.delete(attendanceDoc.ref);
          attendanceDeleted++;
        });

        // Delete the event document
        batch.delete(eventDoc.ref);
        eventsDeleted++;

        // Clean up user subscriptions (remove references to deleted events)
        if (eventData.subscribers?.length > 0) {
          for (const userId of eventData.subscribers) {
            const userRef = doc(db, 'users', userId);
            batch.update(userRef, {
              subscribedEvents: arrayRemove(eventId)
            });
          }
        }
      }

      await batch.commit();

      if (__DEV__) {
        console.log(`[DataCleanup] Deleted ${eventsDeleted} events and ${attendanceDeleted} attendance records`);
      }

      return { eventsDeleted, attendanceDeleted };
      
    } catch (error) {
      console.error('[DataCleanup] Error cleaning up old events:', error);
      throw error;
    }
  }

  /**
   * Archive old events instead of deleting them
   * @param {number} archiveAfterDays - Days after which to archive (default: 90)
   * @returns {Promise<number>} Number of events archived
   */
  static async archiveOldEvents(archiveAfterDays = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - archiveAfterDays);
      
      const eventsRef = collection(db, 'events');
      const q = query(
        eventsRef,
        where('eventTimestamp', '<', cutoffDate),
        where('archived', '!=', true), // Only non-archived events
        limit(25) // Process in smaller batches
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return 0;

      const batch = writeBatch(db);
      let archivedCount = 0;

      snapshot.docs.forEach(eventDoc => {
        batch.update(eventDoc.ref, {
          archived: true,
          archivedAt: serverTimestamp(),
          // Remove from active queries by clearing subscribers array
          activeSubscribers: eventDoc.data().subscribers || [],
          subscribers: [] // This removes from active event queries
        });
        archivedCount++;
      });

      await batch.commit();

      if (__DEV__) {
        console.log(`[DataCleanup] Archived ${archivedCount} old events`);
      }

      return archivedCount;
      
    } catch (error) {
      console.error('[DataCleanup] Error archiving old events:', error);
      throw error;
    }
  }

  /**
   * Clean up reliability calculation cache for inactive users
   * @param {number} inactiveDays - Days of inactivity threshold (default: 180)
   * @returns {Promise<number>} Number of users cleaned
   */
  static async cleanupInactiveUserData(inactiveDays = 180) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);
      
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('lastReliabilityUpdate', '<', cutoffDate),
        limit(20) // Small batches for inactive user cleanup
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return 0;

      const batch = writeBatch(db);
      let cleanedCount = 0;

      snapshot.docs.forEach(userDoc => {
        // Reset reliability cache data but keep core user info
        batch.update(userDoc.ref, {
          reliabilityMetrics: null,
          reliabilityStreaks: null,
          lastReliabilityUpdate: null,
          // Keep basic score for display
          needsReliabilityRefresh: true
        });
        cleanedCount++;
      });

      await batch.commit();

      if (__DEV__) {
        console.log(`[DataCleanup] Cleaned reliability cache for ${cleanedCount} inactive users`);
      }

      return cleanedCount;
      
    } catch (error) {
      console.error('[DataCleanup] Error cleaning inactive user data:', error);
      throw error;
    }
  }

  /**
   * Run comprehensive data cleanup
   * @param {Object} options - Cleanup options
   * @returns {Promise<Object>} Cleanup summary
   */
  static async runFullCleanup(options = {}) {
    const {
      deleteAfterDays = 365,
      archiveAfterDays = 90,
      inactiveUserDays = 180,
      runArchival = true,
      runDeletion = false, // Default to false for safety
      runUserCleanup = true
    } = options;

    try {
      if (__DEV__) {
        console.log('[DataCleanup] Starting full cleanup process');
      }

      const results = {
        archivedEvents: 0,
        deletedEvents: 0,
        deletedAttendance: 0,
        cleanedUsers: 0,
        errors: []
      };

      // Archive old events first
      if (runArchival) {
        try {
          results.archivedEvents = await this.archiveOldEvents(archiveAfterDays);
        } catch (error) {
          results.errors.push(`Archive error: ${error.message}`);
        }
      }

      // Delete very old events (only if explicitly enabled)
      if (runDeletion) {
        try {
          const deleteResults = await this.cleanupOldEvents(deleteAfterDays);
          results.deletedEvents = deleteResults.eventsDeleted;
          results.deletedAttendance = deleteResults.attendanceDeleted;
        } catch (error) {
          results.errors.push(`Deletion error: ${error.message}`);
        }
      }

      // Clean inactive user data
      if (runUserCleanup) {
        try {
          results.cleanedUsers = await this.cleanupInactiveUserData(inactiveUserDays);
        } catch (error) {
          results.errors.push(`User cleanup error: ${error.message}`);
        }
      }

      if (__DEV__) {
        console.log('[DataCleanup] Full cleanup completed:', results);
      }

      return results;
      
    } catch (error) {
      console.error('[DataCleanup] Error in full cleanup:', error);
      throw error;
    }
  }

  /**
   * Get cleanup statistics without performing cleanup
   * @returns {Promise<Object>} Statistics about data that could be cleaned
   */
  static async getCleanupStats() {
    try {
      const now = new Date();
      const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
      const oneYearAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));

      // Count old events
      const eventsRef = collection(db, 'events');
      
      const oldEventsQuery = query(
        eventsRef,
        where('eventTimestamp', '<', ninetyDaysAgo),
        where('archived', '!=', true)
      );
      
      const veryOldEventsQuery = query(
        eventsRef,
        where('eventTimestamp', '<', oneYearAgo)
      );

      const [oldEventsSnapshot, veryOldEventsSnapshot] = await Promise.all([
        getDocs(oldEventsQuery),
        getDocs(veryOldEventsQuery)
      ]);

      return {
        eventsToArchive: oldEventsSnapshot.size,
        eventsToDelete: veryOldEventsSnapshot.size,
        totalEvents: oldEventsSnapshot.size + veryOldEventsSnapshot.size,
        recommendedAction: oldEventsSnapshot.size > 50 ? 'Run cleanup soon' : 'No immediate action needed'
      };
      
    } catch (error) {
      console.error('[DataCleanup] Error getting cleanup stats:', error);
      return {
        eventsToArchive: 0,
        eventsToDelete: 0,
        totalEvents: 0,
        recommendedAction: 'Error getting stats'
      };
    }
  }
}