// studioStatsService.js - Studio Statistics Management
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  serverTimestamp,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';
import { Logger } from '../lib/logger';

export class StudioStatsService {
  /**
   * Calculate and update member count for a studio
   * @param {string} studioId - Studio ID (e.g., "greenville_sc")
   * @returns {Promise<number>} Updated member count
   */
  static async updateStudioMemberCount(studioId) {
    try {
      Logger.service(
        'StudioStats',
        `Updating member count for studio: ${studioId}`
      );

      // Query all users who belong to this studio
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('userdata.studios.default.studioId', '==', studioId)
      );

      const snapshot = await getDocs(q);
      const memberCount = snapshot.size;

      // Update studio document
      const studioRef = doc(db, 'studios', studioId);
      await updateDoc(studioRef, {
        memberCount,
        lastStatsUpdate: serverTimestamp(),
      });

      Logger.service(
        'StudioStats',
        `Updated studio ${studioId} member count: ${memberCount}`
      );
      return memberCount;
    } catch (error) {
      Logger.error('StudioStats', 'Failed to update member count', error);
      throw error;
    }
  }

  /**
   * Calculate and update event count for a studio
   * @param {string} studioId - Studio ID
   * @returns {Promise<number>} Updated event count
   */
  static async updateStudioEventCount(studioId) {
    try {
      Logger.service(
        'StudioStats',
        `Updating event count for studio: ${studioId}`
      );

      // Query all events in this studio
      const eventsRef = collection(db, 'events');
      const q = query(eventsRef, where('studioId', '==', studioId));

      const snapshot = await getDocs(q);
      const eventCount = snapshot.size;

      // Update studio document
      const studioRef = doc(db, 'studios', studioId);
      await updateDoc(studioRef, {
        eventCount,
        lastStatsUpdate: serverTimestamp(),
      });

      Logger.service(
        'StudioStats',
        `Updated studio ${studioId} event count: ${eventCount}`
      );
      return eventCount;
    } catch (error) {
      Logger.error('StudioStats', 'Failed to update event count', error);
      throw error;
    }
  }

  /**
   * Update both member and event counts for a studio
   * @param {string} studioId - Studio ID
   * @returns {Promise<{memberCount: number, eventCount: number}>} Updated counts
   */
  static async updateStudioStats(studioId) {
    try {
      Logger.service(
        'StudioStats',
        `Updating all stats for studio: ${studioId}`
      );

      const [memberCount, eventCount] = await Promise.all([
        this.updateStudioMemberCount(studioId),
        this.updateStudioEventCount(studioId),
      ]);

      return { memberCount, eventCount };
    } catch (error) {
      Logger.error('StudioStats', 'Failed to update studio stats', error);
      throw error;
    }
  }

  /**
   * Update stats for all studios (background task)
   * @returns {Promise<Array>} Array of results for each studio
   */
  static async updateAllStudioStats() {
    try {
      Logger.service('StudioStats', 'Starting stats update for all studios');

      // Get all studios
      const studiosRef = collection(db, 'studios');
      const snapshot = await getDocs(studiosRef);

      const results = [];

      // Process studios in batches to avoid overwhelming Firestore
      const studios = snapshot.docs;
      const batchSize = 5;

      for (let i = 0; i < studios.length; i += batchSize) {
        const batch = studios.slice(i, i + batchSize);

        const batchPromises = batch.map(async (studioDoc) => {
          try {
            const studioId = studioDoc.id;
            const stats = await this.updateStudioStats(studioId);
            return { studioId, success: true, ...stats };
          } catch (error) {
            Logger.error(
              'StudioStats',
              `Failed to update stats for studio ${studioDoc.id}`,
              error
            );
            return {
              studioId: studioDoc.id,
              success: false,
              error: error.message,
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Small delay between batches
        if (i + batchSize < studios.length) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      const successCount = results.filter((r) => r.success).length;
      Logger.service(
        'StudioStats',
        `Updated stats for ${successCount}/${studios.length} studios`
      );

      return results;
    } catch (error) {
      Logger.error('StudioStats', 'Failed to update all studio stats', error);
      throw error;
    }
  }

  /**
   * Increment member count when a user joins a studio
   * @param {string} studioId - Studio ID
   * @returns {Promise<void>}
   */
  static async incrementMemberCount(studioId) {
    try {
      const studioRef = doc(db, 'studios', studioId);
      await updateDoc(studioRef, {
        memberCount: increment(1),
        lastStatsUpdate: serverTimestamp(),
      });

      Logger.service(
        'StudioStats',
        `Incremented member count for studio: ${studioId}`
      );
    } catch (error) {
      Logger.error('StudioStats', 'Failed to increment member count', error);
      // Fall back to recalculating
      await this.updateStudioMemberCount(studioId);
    }
  }

  /**
   * Decrement member count when a user leaves a studio
   * @param {string} studioId - Studio ID
   * @returns {Promise<void>}
   */
  static async decrementMemberCount(studioId) {
    try {
      const studioRef = doc(db, 'studios', studioId);
      await updateDoc(studioRef, {
        memberCount: increment(-1),
        lastStatsUpdate: serverTimestamp(),
      });

      Logger.service(
        'StudioStats',
        `Decremented member count for studio: ${studioId}`
      );
    } catch (error) {
      Logger.error('StudioStats', 'Failed to decrement member count', error);
      // Fall back to recalculating
      await this.updateStudioMemberCount(studioId);
    }
  }

  /**
   * Increment event count when an event is created
   * @param {string} studioId - Studio ID
   * @returns {Promise<void>}
   */
  static async incrementEventCount(studioId) {
    try {
      const studioRef = doc(db, 'studios', studioId);
      await updateDoc(studioRef, {
        eventCount: increment(1),
        lastStatsUpdate: serverTimestamp(),
      });

      Logger.service(
        'StudioStats',
        `Incremented event count for studio: ${studioId}`
      );
    } catch (error) {
      Logger.error('StudioStats', 'Failed to increment event count', error);
      // Fall back to recalculating
      await this.updateStudioEventCount(studioId);
    }
  }

  /**
   * Decrement event count when an event is deleted
   * @param {string} studioId - Studio ID
   * @returns {Promise<void>}
   */
  static async decrementEventCount(studioId) {
    try {
      const studioRef = doc(db, 'studios', studioId);
      await updateDoc(studioRef, {
        eventCount: increment(-1),
        lastStatsUpdate: serverTimestamp(),
      });

      Logger.service(
        'StudioStats',
        `Decremented event count for studio: ${studioId}`
      );
    } catch (error) {
      Logger.error('StudioStats', 'Failed to decrement event count', error);
      // Fall back to recalculating
      await this.updateStudioEventCount(studioId);
    }
  }

  /**
   * Get studio statistics
   * @param {string} studioId - Studio ID
   * @returns {Promise<{memberCount: number, eventCount: number, lastUpdated: Date}>}
   */
  static async getStudioStats(studioId) {
    try {
      const studioRef = doc(db, 'studios', studioId);
      const studioDoc = await getDoc(studioRef);

      if (!studioDoc.exists()) {
        throw new Error('Studio not found');
      }

      const data = studioDoc.data();
      return {
        memberCount: data.memberCount || 0,
        eventCount: data.eventCount || 0,
        lastUpdated: data.lastStatsUpdate?.toDate() || null,
      };
    } catch (error) {
      Logger.error('StudioStats', 'Failed to get studio stats', error);
      throw error;
    }
  }
}
