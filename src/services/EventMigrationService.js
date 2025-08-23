import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';

/**
 * Service to migrate existing events to include new fields
 */
export class EventMigrationService {
  
  /**
   * Add trackAttendance field to existing events that don't have it
   * Sets default to true for backward compatibility
   */
  static async addAttendanceTrackingToExistingEvents() {
    try {
      console.log('[EventMigrationService] Starting attendance tracking migration...');
      
      // Query all events
      const eventsQuery = query(collection(db, 'events'));
      const querySnapshot = await getDocs(eventsQuery);
      
      console.log(`[EventMigrationService] Found ${querySnapshot.size} events to check`);
      
      const batch = writeBatch(db);
      let updatedCount = 0;
      
      for (const eventDoc of querySnapshot.docs) {
        const eventData = eventDoc.data();
        
        // Check if event already has trackAttendance field
        if (eventData.trackAttendance === undefined) {
          // Add trackAttendance field with default value true
          batch.update(eventDoc.ref, {
            trackAttendance: true,
            migrated: true,
            migratedAt: new Date(),
          });
          updatedCount++;
        }
      }
      
      if (updatedCount > 0) {
        await batch.commit();
        console.log(`[EventMigrationService] Successfully updated ${updatedCount} events with attendance tracking`);
      } else {
        console.log('[EventMigrationService] No events needed migration');
      }
      
      return {
        success: true,
        totalEvents: querySnapshot.size,
        updatedEvents: updatedCount,
      };
      
    } catch (error) {
      console.error('[EventMigrationService] Error during attendance tracking migration:', error);
      throw error;
    }
  }
  
  /**
   * Run all available migrations
   * This can be called on app startup or manually
   */
  static async runAllMigrations() {
    try {
      console.log('[EventMigrationService] Running all migrations...');
      
      const results = {
        attendanceTracking: await this.addAttendanceTrackingToExistingEvents(),
      };
      
      console.log('[EventMigrationService] All migrations completed:', results);
      return results;
      
    } catch (error) {
      console.error('[EventMigrationService] Error running migrations:', error);
      throw error;
    }
  }
  
  /**
   * Check if migrations are needed
   * Returns info about what migrations would be applied
   */
  static async checkMigrationStatus() {
    try {
      const eventsQuery = query(collection(db, 'events'));
      const querySnapshot = await getDocs(eventsQuery);
      
      let needsAttendanceTracking = 0;
      
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.trackAttendance === undefined) {
          needsAttendanceTracking++;
        }
      });
      
      return {
        totalEvents: querySnapshot.size,
        migrations: {
          attendanceTracking: {
            needed: needsAttendanceTracking > 0,
            count: needsAttendanceTracking,
          },
        },
      };
      
    } catch (error) {
      console.error('[EventMigrationService] Error checking migration status:', error);
      throw error;
    }
  }
}