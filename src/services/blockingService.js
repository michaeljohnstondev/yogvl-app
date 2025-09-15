// blockingService.js - User Blocking System

import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';

/**
 * Service for handling user blocking functionality
 */
class BlockingService {
  /**
   * Block a user and handle all side effects
   * @param {string} currentUserId - User doing the blocking
   * @param {string} targetUserId - User being blocked
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async blockUser(currentUserId, targetUserId) {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
      return { success: false, error: 'Invalid user IDs' };
    }

    try {
      const batch = writeBatch(db);

      // Add to current user's blocked list
      const currentUserRef = doc(db, 'users', currentUserId);
      batch.update(currentUserRef, {
        blockedUsers: arrayUnion(targetUserId),
      });

      // Add to target user's blockedBy list
      const targetUserRef = doc(db, 'users', targetUserId);
      batch.update(targetUserRef, {
        blockedBy: arrayUnion(currentUserId),
      });

      // Remove follow relationships in both directions
      // Current user unfollows target
      batch.update(currentUserRef, {
        'userdata.social.following': arrayRemove(targetUserId),
      });

      // Target user unfollows current user
      batch.update(targetUserRef, {
        'userdata.social.following': arrayRemove(currentUserId),
      });

      // Remove from followers subcollections
      const currentUserFollowingRef = doc(
        db,
        'users',
        currentUserId,
        'following',
        targetUserId
      );
      const currentUserFollowerRef = doc(
        db,
        'users',
        currentUserId,
        'followers',
        targetUserId
      );
      const targetUserFollowingRef = doc(
        db,
        'users',
        targetUserId,
        'following',
        currentUserId
      );
      const targetUserFollowerRef = doc(
        db,
        'users',
        targetUserId,
        'followers',
        currentUserId
      );

      batch.delete(currentUserFollowingRef);
      batch.delete(currentUserFollowerRef);
      batch.delete(targetUserFollowingRef);
      batch.delete(targetUserFollowerRef);

      await batch.commit();

      console.log(
        `[BlockingService] User ${currentUserId} blocked ${targetUserId}`
      );
      return { success: true };
    } catch (error) {
      console.error('[BlockingService] Error blocking user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Unblock a user
   * @param {string} currentUserId - User doing the unblocking
   * @param {string} targetUserId - User being unblocked
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async unblockUser(currentUserId, targetUserId) {
    if (!currentUserId || !targetUserId) {
      return { success: false, error: 'Invalid user IDs' };
    }

    try {
      const batch = writeBatch(db);

      // Remove from current user's blocked list
      const currentUserRef = doc(db, 'users', currentUserId);
      batch.update(currentUserRef, {
        blockedUsers: arrayRemove(targetUserId),
      });

      // Remove from target user's blockedBy list
      const targetUserRef = doc(db, 'users', targetUserId);
      batch.update(targetUserRef, {
        blockedBy: arrayRemove(currentUserId),
      });

      await batch.commit();

      console.log(
        `[BlockingService] User ${currentUserId} unblocked ${targetUserId}`
      );
      return { success: true };
    } catch (error) {
      console.error('[BlockingService] Error unblocking user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if a user is blocked (bidirectional)
   * @param {string} currentUserId - Current user
   * @param {string} targetUserId - Target user to check
   * @returns {Promise<{isBlocked: boolean, blockedBy?: string, error?: string}>}
   */
  async isBlocked(currentUserId, targetUserId) {
    if (!currentUserId || !targetUserId) {
      return { isBlocked: false, error: 'Invalid user IDs' };
    }

    try {
      const [currentUserDoc, targetUserDoc] = await Promise.all([
        getDoc(doc(db, 'users', currentUserId)),
        getDoc(doc(db, 'users', targetUserId)),
      ]);

      if (!currentUserDoc.exists() || !targetUserDoc.exists()) {
        return { isBlocked: false, error: 'User not found' };
      }

      const currentUserData = currentUserDoc.data();
      const targetUserData = targetUserDoc.data();

      // Safe array checks to prevent indexOf errors
      const currentBlockedUsers = currentUserData?.blockedUsers;
      const targetBlockedUsers = targetUserData?.blockedUsers;

      // Check if current user blocked target
      const currentBlockedTarget = Array.isArray(currentBlockedUsers) &&
        currentBlockedUsers.includes(targetUserId);

      // Check if target user blocked current user
      const targetBlockedCurrent = Array.isArray(targetBlockedUsers) &&
        targetBlockedUsers.includes(currentUserId);

      if (currentBlockedTarget) {
        return { isBlocked: true, blockedBy: 'current' };
      }

      if (targetBlockedCurrent) {
        return { isBlocked: true, blockedBy: 'target' };
      }

      return { isBlocked: false };
    } catch (error) {
      console.error('[BlockingService] Error checking block status:', error);
      return { isBlocked: false, error: error.message };
    }
  }

  /**
   * Get list of users blocked by current user
   * @param {string} currentUserId - Current user ID
   * @returns {Promise<{blockedUsers: string[], error?: string}>}
   */
  async getBlockedUsers(currentUserId) {
    if (!currentUserId) {
      return { blockedUsers: [], error: 'Invalid user ID' };
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', currentUserId));

      if (!userDoc.exists()) {
        return { blockedUsers: [], error: 'User not found' };
      }

      const userData = userDoc.data();
      const blockedUsers = userData.blockedUsers || [];

      return { blockedUsers };
    } catch (error) {
      console.error('[BlockingService] Error getting blocked users:', error);
      return { blockedUsers: [], error: error.message };
    }
  }

  /**
   * Check if current user is blocked by target user
   * @param {string} currentUserId - Current user
   * @param {string} targetUserId - Target user
   * @returns {Promise<boolean>}
   */
  async isBlockedBy(currentUserId, targetUserId) {
    try {
      const result = await this.isBlocked(currentUserId, targetUserId);
      return result.isBlocked && result.blockedBy === 'target';
    } catch (error) {
      console.error(
        '[BlockingService] Error checking if blocked by user:',
        error
      );
      return false;
    }
  }

  /**
   * Check if current user has blocked target user
   * @param {string} currentUserId - Current user
   * @param {string} targetUserId - Target user
   * @returns {Promise<boolean>}
   */
  async hasBlocked(currentUserId, targetUserId) {
    try {
      const result = await this.isBlocked(currentUserId, targetUserId);
      return result.isBlocked && result.blockedBy === 'current';
    } catch (error) {
      console.error(
        '[BlockingService] Error checking if user is blocked:',
        error
      );
      return false;
    }
  }

  /**
   * Filter out blocked users from a list of user IDs
   * @param {string} currentUserId - Current user
   * @param {string[]} userIds - Array of user IDs to filter
   * @returns {Promise<string[]>} Filtered array without blocked users
   */
  async filterBlockedUsers(currentUserId, userIds) {
    if (!currentUserId || !userIds || userIds.length === 0) {
      return userIds || [];
    }

    try {
      // Get current user's blocked list
      const currentUserDoc = await getDoc(doc(db, 'users', currentUserId));
      if (!currentUserDoc.exists()) {
        return userIds;
      }

      const currentUserData = currentUserDoc.data();
      const blockedUsers = Array.isArray(currentUserData?.blockedUsers) ? currentUserData.blockedUsers : [];
      const blockedBy = Array.isArray(currentUserData?.blockedBy) ? currentUserData.blockedBy : [];

      // Filter out users that are blocked or have blocked current user
      return userIds.filter(
        (userId) =>
          !blockedUsers.includes(userId) && !blockedBy.includes(userId)
      );
    } catch (error) {
      console.error('[BlockingService] Error filtering blocked users:', error);
      return userIds; // Return original list on error
    }
  }

  /**
   * Middleware to check if users are blocked before allowing interaction
   * @param {string} currentUserId - Current user
   * @param {string} targetUserId - Target user
   * @param {Function} callback - Function to execute if not blocked
   * @returns {Promise<any>} Result of callback or block error
   */
  async withBlockCheck(currentUserId, targetUserId, callback) {
    const blockStatus = await this.isBlocked(currentUserId, targetUserId);

    if (blockStatus.isBlocked) {
      throw new Error(
        'This action cannot be completed due to user restrictions.'
      );
    }

    return await callback();
  }
}

// Export singleton instance
export const blockingService = new BlockingService();
