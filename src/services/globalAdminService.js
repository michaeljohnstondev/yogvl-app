// FILE: services/globalAdminService.js - Global Admin Messaging System

import {
  doc,
  getDoc,
  setDoc,
  collection,
  collectionGroup,
  query,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';

/**
 * DATABASE STRUCTURE FOR GLOBAL MESSAGES:
 *
 * /admin/{adminUserId}/messages/{messageId}
 * {
 *   id: string,
 *   type: 'announcement' | 'system' | 'policy' | 'custom',
 *   issuedAt: Timestamp,
 *   issuedBy: string, // admin userId
 *   title?: string,
 *   message: string,
 *   active: boolean,
 *   expiresAt?: Timestamp,
 *   requiresAcknowledgment: boolean
 * }
 *
 * /users/{userId}/globalMessageAcknowledgments
 * {
 *   acknowledgedMessages: [
 *     {
 *       messageId: string,
 *       acknowledgedAt: Timestamp
 *     }
 *   ], // array of message acknowledgments with timestamps
 *   lastChecked: Timestamp
 * }
 */

class GlobalAdminService {
  /**
   * Post a global message that all users will see
   * @param {string} type - Message type
   * @param {string} message - Message content
   * @param {string} adminUserId - Admin user ID
   * @param {Object} options - Additional options
   */
  async postGlobalMessage(type, message, adminUserId, options = {}) {
    try {
      const messageId = `global_${Date.now()}`;

      const globalMessage = {
        id: messageId,
        type,
        issuedAt: Timestamp.now(),
        issuedBy: adminUserId,
        title: options.title || null,
        message,
        active: true,
        expiresAt: options.expiresAt || null,
        requiresAcknowledgment: options.requiresAcknowledgment !== false, // Default to true
      };

      const messageRef = doc(db, 'admin', adminUserId, 'messages', messageId);
      await setDoc(messageRef, globalMessage);

      console.log(`[globalAdminService] Global message posted: ${messageId}`);
      return { success: true, messageId };
    } catch (error) {
      console.error(
        '[globalAdminService] Error posting global message:',
        error
      );
      throw error;
    }
  }

  /**
   * Get all active global messages for display to users
   * @param {string} userId - User ID to check acknowledgments
   * @returns {Array} Array of unacknowledged active messages
   */
  async getActiveGlobalMessages(userId) {
    try {
      const now = Date.now();

      // Get active global messages from all admin users
      const messagesQuery = query(
        collectionGroup(db, 'messages'),
        where('active', '==', true),
        orderBy('issuedAt', 'desc'), // Newest first
        limit(10)
      );

      const messagesSnapshot = await getDocs(messagesQuery);
      let activeMessages = [];

      messagesSnapshot.forEach((doc) => {
        const messageData = doc.data();

        // Check if message has expired
        const isNotExpired =
          !messageData.expiresAt || messageData.expiresAt.seconds * 1000 > now;

        if (isNotExpired) {
          activeMessages.push(messageData);
        }
      });

      // Get user's acknowledged messages and clean up old ones
      const userAcknowledgments = await this.getUserAcknowledgments(userId);
      const acknowledgedMessages = await this.cleanupOldAcknowledgments(
        userId,
        userAcknowledgments
      );

      // Extract just the message IDs for filtering
      const acknowledgedIds = acknowledgedMessages.map((ack) =>
        typeof ack === 'string' ? ack : ack.messageId
      );

      // Filter out already acknowledged messages
      const unacknowledgedMessages = activeMessages.filter(
        (msg) => !acknowledgedIds.includes(msg.id)
      );

      // Sort by date (newest first)
      return unacknowledgedMessages.sort((a, b) => {
        return b.issuedAt.seconds - a.issuedAt.seconds;
      });
    } catch (error) {
      console.error(
        '[globalAdminService] Error getting active global messages:',
        error
      );
      return [];
    }
  }

  /**
   * Get user's global message acknowledgments
   * @param {string} userId - User ID
   * @returns {Object|null} User acknowledgments
   */
  async getUserAcknowledgments(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        return null;
      }

      const userData = userDoc.data();
      return userData.globalMessageAcknowledgments || null;
    } catch (error) {
      console.error(
        '[globalAdminService] Error getting user acknowledgments:',
        error
      );
      return null;
    }
  }

  /**
   * Clean up acknowledgments older than 60 days
   * @param {string} userId - User ID
   * @param {Object} userAcknowledgments - Current acknowledgments
   * @returns {Array} Cleaned acknowledgments array
   */
  async cleanupOldAcknowledgments(userId, userAcknowledgments) {
    try {
      if (!userAcknowledgments?.acknowledgedMessages) {
        return [];
      }

      const now = Date.now();
      const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000; // 60 days in milliseconds

      let acknowledgedMessages = userAcknowledgments.acknowledgedMessages;
      let needsUpdate = false;

      // Handle backward compatibility - convert old format to new
      if (
        acknowledgedMessages.length > 0 &&
        typeof acknowledgedMessages[0] === 'string'
      ) {
        // Old format: array of strings, migrate to new format
        acknowledgedMessages = acknowledgedMessages.map((messageId) => ({
          messageId,
          acknowledgedAt: Timestamp.now(), // Use current time for old entries
        }));
        needsUpdate = true;
        console.log(
          `[globalAdminService] Migrated old acknowledgment format for user ${userId}`
        );
      }

      // Filter out acknowledgments older than 60 days
      const cleanedAcknowledgments = acknowledgedMessages.filter((ack) => {
        const ackTime = ack.acknowledgedAt.seconds * 1000;
        const isRecent = ackTime >= sixtyDaysAgo;
        if (!isRecent) {
          needsUpdate = true;
        }
        return isRecent;
      });

      // Update database if we removed any old acknowledgments or migrated format
      if (needsUpdate) {
        const updatedRecord = {
          ...userAcknowledgments,
          acknowledgedMessages: cleanedAcknowledgments,
          lastCleaned: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        const userRef = doc(db, 'users', userId);
        await setDoc(
          userRef,
          {
            globalMessageAcknowledgments: updatedRecord,
          },
          { merge: true }
        );

        const removedCount =
          acknowledgedMessages.length - cleanedAcknowledgments.length;
        if (removedCount > 0) {
          console.log(
            `[globalAdminService] Cleaned up ${removedCount} old acknowledgments for user ${userId}`
          );
        }
      }

      return cleanedAcknowledgments;
    } catch (error) {
      console.error(
        '[globalAdminService] Error cleaning up acknowledgments:',
        error
      );
      // Return original data if cleanup fails
      return userAcknowledgments?.acknowledgedMessages || [];
    }
  }

  /**
   * Mark a global message as acknowledged by a user
   * @param {string} userId - User ID
   * @param {string} messageId - Message ID to acknowledge
   */
  async acknowledgeGlobalMessage(userId, messageId) {
    try {
      const currentAcknowledgments = await this.getUserAcknowledgments(userId);
      let acknowledgedMessages =
        currentAcknowledgments?.acknowledgedMessages || [];

      // Handle backward compatibility - convert old format to new
      if (
        acknowledgedMessages.length > 0 &&
        typeof acknowledgedMessages[0] === 'string'
      ) {
        acknowledgedMessages = acknowledgedMessages.map((id) => ({
          messageId: id,
          acknowledgedAt: Timestamp.now(),
        }));
      }

      // Check if message is already acknowledged
      const alreadyAcknowledged = acknowledgedMessages.some(
        (ack) => (typeof ack === 'string' ? ack : ack.messageId) === messageId
      );

      // Add message acknowledgment if not already there
      if (!alreadyAcknowledged) {
        acknowledgedMessages.push({
          messageId,
          acknowledgedAt: Timestamp.now(),
        });
      }

      const updatedAcknowledgments = {
        acknowledgedMessages,
        lastChecked: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const userRef = doc(db, 'users', userId);
      await setDoc(
        userRef,
        {
          globalMessageAcknowledgments: updatedAcknowledgments,
        },
        { merge: true }
      );

      console.log(
        `[globalAdminService] Global message ${messageId} acknowledged by user ${userId}`
      );
      return { success: true };
    } catch (error) {
      console.error(
        '[globalAdminService] Error acknowledging global message:',
        error
      );
      throw error;
    }
  }

  /**
   * Deactivate a global message (admin only)
   * @param {string} messageId - Message ID to deactivate
   * @param {string} adminUserId - Admin user ID who posted the message
   */
  async deactivateGlobalMessage(messageId, adminUserId) {
    try {
      const messageRef = doc(db, 'admin', adminUserId, 'messages', messageId);
      await setDoc(
        messageRef,
        {
          active: false,
          deactivatedAt: Timestamp.now(),
        },
        { merge: true }
      );

      console.log(
        `[globalAdminService] Global message ${messageId} deactivated`
      );
      return { success: true };
    } catch (error) {
      console.error(
        '[globalAdminService] Error deactivating global message:',
        error
      );
      throw error;
    }
  }

  /**
   * Get all global messages for admin management
   * @param {number} limitCount - Number of messages to retrieve
   * @returns {Array} Array of all global messages
   */
  async getAllGlobalMessages(limitCount = 50) {
    try {
      const messagesQuery = query(
        collectionGroup(db, 'messages'),
        orderBy('issuedAt', 'desc'),
        limit(limitCount)
      );

      const messagesSnapshot = await getDocs(messagesQuery);
      const messages = [];

      messagesSnapshot.forEach((doc) => {
        messages.push(doc.data());
      });

      return messages;
    } catch (error) {
      console.error(
        '[globalAdminService] Error getting all global messages:',
        error
      );
      return [];
    }
  }
}

// Export singleton instance
export const globalAdminService = new GlobalAdminService();
