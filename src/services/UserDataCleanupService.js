import { 
  doc, 
  updateDoc, 
  collection, 
  getDocs, 
  writeBatch,
  getDoc 
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';
import { Logger } from '../lib/logger';

export class UserDataCleanupService {
  
  // Fields that should be removed from user documents
  static DEPRECATED_FIELDS = [
    'dismissedTips',
    'hasCompletedContactInfo', 
    'hasSelectedLocation',
    'isManualLocation',
    'lastLocationUpdate',
    'signupMethod',
    'skippedLocation', // Also remove this obsolete flag
    'studioId', // Moved to userdata.studios.default
    'studioName', // Moved to userdata.studios.default
    'studioCity', // Moved to userdata.studios.default
    'studioState', // Moved to userdata.studios.default
    'currentZone', // Legacy location field
    'locationDisplayName', // Legacy location field
    'reliabilityScore', // Moved to userdata.metrics.reliability
    'reliabilityTier', // Moved to userdata.metrics.reliability
    'reliabilityMetrics', // Moved to userdata.metrics.reliability
    'reliabilityStreaks', // Moved to userdata.metrics.reliability
    'lastReliabilityUpdate', // Moved to userdata.metrics.reliability
    'eventsCreated', // Moved to userdata.metrics.events
    'eventsAttended', // Moved to userdata.metrics.events
    'eventsJoined', // Moved to userdata.metrics.events
    'noShows', // Moved to userdata.metrics.events
    'subscribedEvents', // Moved to userdata.metrics.events
    'attendedEvents', // Moved to userdata.metrics.events
    'noShowEvents', // Moved to userdata.metrics.events
    'lastEventCreated', // Moved to userdata.metrics.events
    'lastEventAttended', // Moved to userdata.metrics.events
    'lastNoShow', // Moved to userdata.metrics.events
    'lastActivity', // Moved to userdata.metrics.events
    'createdAt', // Moved to userdata.metadata.createdAt
  ];

  /**
   * Check if user has required contact info (instead of using flag)
   * @param {Object} userData - User document data
   * @returns {boolean} Whether user has completed contact info
   */
  static hasRequiredContactInfo(userData) {
    const contactInfo = userData?.userdata?.contactInfo || {};
    return !!(
      contactInfo.firstName && 
      contactInfo.lastName && 
      contactInfo.email
    );
  }

  /**
   * Check if user has location/studio set (instead of using flag)
   * @param {Object} userData - User document data
   * @returns {boolean} Whether user has location configured
   */
  static hasLocationConfigured(userData) {
    const defaultStudio = userData?.userdata?.studios?.default;
    return !!(
      defaultStudio?.studioId && 
      defaultStudio?.studioName &&
      defaultStudio?.studioCity &&
      defaultStudio?.studioState
    );
  }

  /**
   * Get user's completion status based on actual data
   * @param {Object} userData - User document data
   * @returns {Object} Completion status object
   */
  static getUserCompletionStatus(userData) {
    if (!userData) {
      return {
        hasContactInfo: false,
        hasLocation: false,
        isComplete: false,
      };
    }

    const hasContactInfo = this.hasRequiredContactInfo(userData);
    const hasLocation = this.hasLocationConfigured(userData);

    return {
      hasContactInfo,
      hasLocation,
      isComplete: hasContactInfo && hasLocation,
    };
  }

  /**
   * Clean up deprecated fields from a single user document
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Cleanup result
   */
  static async cleanupUserDocument(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return { success: false, reason: 'User document not found' };
      }

      const userData = userDoc.data();
      const fieldsToRemove = {};
      const cleanedFields = [];

      // Check which deprecated fields exist
      this.DEPRECATED_FIELDS.forEach(field => {
        if (userData.hasOwnProperty(field)) {
          fieldsToRemove[field] = null; // Firestore deletes fields set to null
          cleanedFields.push(field);
        }
      });

      if (cleanedFields.length === 0) {
        return { success: true, cleanedFields: [], alreadyClean: true };
      }

      // Remove the deprecated fields
      await updateDoc(userRef, fieldsToRemove);

      Logger.debug('UserDataCleanup', 'Cleaned user document', { 
        userId: userId.substring(0, 8), 
        fieldsRemoved: cleanedFields.length 
      });

      return { 
        success: true, 
        cleanedFields, 
        alreadyClean: false 
      };

    } catch (error) {
      Logger.error('UserDataCleanup', 'Failed to clean user document', error);
      return { success: false, reason: error.message };
    }
  }

  /**
   * Clean up deprecated fields from all user documents
   * @param {number} batchSize - Number of users to process at once
   * @returns {Promise<Object>} Cleanup summary
   */
  static async cleanupAllUserDocuments(batchSize = 20) {
    try {
      Logger.info('UserDataCleanup', 'Starting batch cleanup of user documents');

      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      if (snapshot.empty) {
        return { totalUsers: 0, cleanedUsers: 0, errors: [] };
      }

      const totalUsers = snapshot.size;
      let cleanedUsers = 0;
      let processedUsers = 0;
      const errors = [];

      // Process users in batches
      const batches = [];
      const users = snapshot.docs;
      
      for (let i = 0; i < users.length; i += batchSize) {
        batches.push(users.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const batchPromises = batch.map(async (userDoc) => {
          try {
            const result = await this.cleanupUserDocument(userDoc.id);
            processedUsers++;
            
            if (result.success && !result.alreadyClean) {
              cleanedUsers++;
            }
            
            return result;
          } catch (error) {
            errors.push(`${userDoc.id}: ${error.message}`);
            return { success: false, reason: error.message };
          }
        });

        await Promise.all(batchPromises);
        
        // Log progress
        Logger.info('UserDataCleanup', 'Batch processed', { 
          processed: processedUsers, 
          total: totalUsers 
        });
      }

      const summary = {
        totalUsers,
        processedUsers,
        cleanedUsers,
        alreadyCleanUsers: processedUsers - cleanedUsers,
        errors,
        success: errors.length === 0,
      };

      Logger.info('UserDataCleanup', 'Cleanup completed', summary);
      return summary;

    } catch (error) {
      Logger.error('UserDataCleanup', 'Batch cleanup failed', error);
      throw error;
    }
  }

  /**
   * Migrate user from old flag-based system to data-based system
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Migration result
   */
  static async migrateUserDocument(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        return { success: false, reason: 'User not found' };
      }

      const userData = userDoc.data();
      const updates = {};
      const migrations = [];

      // If user had hasCompletedContactInfo but missing actual data, prompt them again
      if (userData.hasCompletedContactInfo && !this.hasRequiredContactInfo(userData)) {
        // Don't set any flag - let the nav logic handle it
        migrations.push('Will re-prompt for contact info');
      }

      // If user had hasSelectedLocation but missing actual location data, prompt them again  
      if (userData.hasSelectedLocation && !this.hasLocationConfigured(userData)) {
        // Don't set any flag - let the nav logic handle it
        migrations.push('Will re-prompt for location');
      }

      // Clean up deprecated fields
      this.DEPRECATED_FIELDS.forEach(field => {
        if (userData.hasOwnProperty(field)) {
          updates[field] = null;
          migrations.push(`Removed ${field}`);
        }
      });

      if (Object.keys(updates).length > 0) {
        await updateDoc(userRef, updates);
      }

      return {
        success: true,
        migrations,
        hadDeprecatedData: migrations.length > 0,
      };

    } catch (error) {
      Logger.error('UserDataCleanup', 'Migration failed', error);
      return { success: false, reason: error.message };
    }
  }

  /**
   * Get statistics about deprecated data in user documents
   * @returns {Promise<Object>} Statistics object
   */
  static async getDeprecatedDataStats() {
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      const stats = {
        totalUsers: snapshot.size,
        usersWithDeprecatedFields: 0,
        fieldCounts: {},
        usersNeedingMigration: 0,
      };

      this.DEPRECATED_FIELDS.forEach(field => {
        stats.fieldCounts[field] = 0;
      });

      snapshot.docs.forEach(doc => {
        const userData = doc.data();
        let hasDeprecatedFields = false;
        
        this.DEPRECATED_FIELDS.forEach(field => {
          if (userData.hasOwnProperty(field)) {
            stats.fieldCounts[field]++;
            hasDeprecatedFields = true;
          }
        });

        if (hasDeprecatedFields) {
          stats.usersWithDeprecatedFields++;
        }

        // Check if user needs migration (has flags but missing data)
        const needsMigration = (
          (userData.hasCompletedContactInfo && !this.hasRequiredContactInfo(userData)) ||
          (userData.hasSelectedLocation && !this.hasLocationConfigured(userData))
        );

        if (needsMigration) {
          stats.usersNeedingMigration++;
        }
      });

      return stats;

    } catch (error) {
      Logger.error('UserDataCleanup', 'Failed to get stats', error);
      throw error;
    }
  }
}