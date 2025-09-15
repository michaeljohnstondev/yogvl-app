// FILE: services/followService.js - Follow/Follower System - FIXED VERSION

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';
import { blockingService } from './blockingService';

/**
 * DEFENSIVE PROGRAMMING UTILITY: Safe array includes check
 * Prevents indexOf errors by ensuring the array is valid before calling includes
 */
const safeArrayIncludes = (array, item) => {
  try {
    if (!array || !Array.isArray(array) || array.length === 0) {
      return false;
    }
    if (item === null || item === undefined) {
      return false;
    }
    return array.includes(item);
  } catch (error) {
    console.error('[followService] Error in safeArrayIncludes:', error);
    return false;
  }
};

/**
 * Check if one user is following another
 */
export const checkIfFollowing = async (followerId, targetUserId) => {
  try {
    // Add strict parameter validation
    if (!followerId || !targetUserId || typeof followerId !== 'string' || typeof targetUserId !== 'string') {
      console.warn('[followService] Invalid parameters for checkIfFollowing:', { followerId, targetUserId });
      return false;
    }

    const followingRef = doc(
      db,
      'users',
      followerId,
      'following',
      targetUserId
    );
    const followingDoc = await getDoc(followingRef);
    return followingDoc.exists();
  } catch (error) {
    console.error('[followService] Error checking follow status:', error);
    return false;
  }
};


/**
 * Get follow statistics for a user by counting actual subcollections
 */
export const getFollowStats = async (userId) => {
  try {
    if (!userId || typeof userId !== 'string') {
      console.warn('[followService] Invalid userId provided to getFollowStats:', userId);
      return { followingCount: 0, followerCount: 0, mutualCount: 0 };
    }

    // Get actual counts from subcollections for accuracy with additional error handling
    const [followingSnapshot, followersSnapshot] = await Promise.all([
      getDocs(collection(db, 'users', userId, 'following')).catch(err => {
        console.error('[followService] Error fetching following collection:', err);
        return { size: 0 };
      }),
      getDocs(collection(db, 'users', userId, 'followers')).catch(err => {
        console.error('[followService] Error fetching followers collection:', err);
        return { size: 0 };
      }),
    ]);

    const followingCount = followingSnapshot?.size || 0;
    const followerCount = followersSnapshot?.size || 0;

    // Calculate mutual follows count with additional error handling
    let mutualCount = 0;
    try {
      const mutualFollows = await getMutualFollows(userId);
      mutualCount = Array.isArray(mutualFollows) ? mutualFollows.length : 0;
    } catch (mutualError) {
      console.error('[followService] Error getting mutual follows in getFollowStats:', mutualError);
      mutualCount = 0;
    }

    return {
      followingCount,
      followerCount,
      mutualCount,
    };
  } catch (error) {
    console.error('[followService] Error getting follow stats:', error);
    return { followingCount: 0, followerCount: 0, mutualCount: 0 };
  }
};

/**
 * OPTIMIZED: Get complete relationship status between two users (follow + block status)
 * Combines multiple checks into single efficient operation
 */
export const getUserRelationshipStatus = async (
  currentUserId,
  targetUserId
) => {
  try {
    // Add parameter validation
    if (!currentUserId || !targetUserId || typeof currentUserId !== 'string' || typeof targetUserId !== 'string') {
      console.warn('[followService] Invalid parameters for getUserRelationshipStatus:', { currentUserId, targetUserId });
      return {
        isFollowing: false,
        isBlocked: false,
        isBlockedBy: false,
        error: 'Invalid parameters',
        success: false,
      };
    }

    // Batch the essential document reads
    const [followingDoc, currentUserDoc, targetUserDoc] = await Promise.all([
      getDoc(doc(db, 'users', currentUserId, 'following', targetUserId)),
      getDoc(doc(db, 'users', currentUserId)),
      getDoc(doc(db, 'users', targetUserId)),
    ]);

    if (!currentUserDoc.exists() || !targetUserDoc.exists()) {
      return {
        isFollowing: false,
        isBlocked: false,
        isBlockedBy: false,
        error: 'User not found',
      };
    }

    const currentUserData = currentUserDoc.data();
    const targetUserData = targetUserDoc.data();

    // Enhanced safe array checks to prevent indexOf errors
    const currentBlockedUsers = currentUserData?.blockedUsers;
    const targetBlockedUsers = targetUserData?.blockedUsers;

    // Use the safe utility function instead of direct includes calls
    const isBlocked = safeArrayIncludes(currentBlockedUsers, targetUserId);
    const isBlockedBy = safeArrayIncludes(targetBlockedUsers, currentUserId);

    return {
      isFollowing: followingDoc.exists(),
      isBlocked: isBlocked || false,
      isBlockedBy: isBlockedBy || false,
      success: true,
    };
  } catch (error) {
    console.error('[followService] Error getting relationship status:', error);
    return {
      isFollowing: false,
      isBlocked: false,
      isBlockedBy: false,
      error: error.message,
      success: false,
    };
  }
};

/**
 * Check if two users follow each other mutually (are friends)
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @returns {Promise<boolean>} Whether the users follow each other mutually
 */
export const checkIfMutualFollows = async (userId1, userId2) => {
  try {
    // Add strict parameter validation
    if (!userId1 || !userId2 || typeof userId1 !== 'string' || typeof userId2 !== 'string') {
      console.warn('[followService] Invalid parameters for checkIfMutualFollows:', { userId1, userId2 });
      return false;
    }

    // Users cannot be mutual followers of themselves
    if (userId1 === userId2) {
      return false;
    }

    // Check both directions in parallel for efficiency
    const [user1FollowsUser2, user2FollowsUser1] = await Promise.all([
      checkIfFollowing(userId1, userId2),
      checkIfFollowing(userId2, userId1)
    ]);

    return user1FollowsUser2 && user2FollowsUser1;
  } catch (error) {
    console.error('[followService] Error checking mutual follows:', error);
    return false;
  }
};

/**
 * Get mutual followers (friends) - ENHANCED with safe array operations
 */
export const getMutualFollows = async (userId, limitCount = 50) => {
  try {
    if (!userId || typeof userId !== 'string') {
      console.warn('[followService] Invalid userId provided to getMutualFollows:', userId);
      return [];
    }

    const following = await getFollowing(userId, limitCount);
    if (!Array.isArray(following) || following.length === 0) {
      return [];
    }

    const targetUserIds = following
      .filter(f => f && f.targetUserId) // Filter out any invalid entries
      .map((f) => f.targetUserId);

    if (targetUserIds.length === 0) {
      return [];
    }

    // Batch check all follow relationships in parallel instead of sequential for loop
    const followBackPromises = targetUserIds.map((targetId) =>
      getDoc(doc(db, 'users', targetId, 'followers', userId)).catch(err => {
        console.error('[followService] Error checking follow back status for', targetId, ':', err);
        return { exists: () => false };
      })
    );

    const followBackResults = await Promise.all(followBackPromises);

    const mutualFollows = [];
    following.forEach((followedUser, index) => {
      if (followedUser && followBackResults[index] && followBackResults[index].exists()) {
        mutualFollows.push({
          id: followedUser.targetUserId,
          ...followedUser.targetData,
          isMutual: true,
          followedAt: followedUser.createdAt,
        });
      }
    });

    return mutualFollows;
  } catch (error) {
    console.error('[followService] Error getting mutual follows:', error);
    return [];
  }
};

// Keep all the existing exports and functions from the original file but with enhanced error handling
// This is a focused fix for the indexOf issue

// For the remainder of this file, I'll include the original functions with their existing implementation
// but add the safeArrayIncludes utility where needed

/**
 * Follow a user
 */
export const followUser = async (followerId, targetUserId, followerData) => {
  const operationKey = `${followerId}-${targetUserId}`;

  // Check if operation is already in progress
  const pendingOperations = new Map(); // Move this to module scope if needed
  if (pendingOperations.has(operationKey)) {
    throw new Error('Follow operation already in progress');
  }

  try {
    pendingOperations.set(operationKey, 'following');

    if (followerId === targetUserId) {
      throw new Error('Cannot follow yourself');
    }

    // Check if already following (within the pending operation)
    const isFollowing = await checkIfFollowing(followerId, targetUserId);
    if (isFollowing) {
      throw new Error('Already following this user');
    }

    // Check if users are blocked and unblock if necessary
    const blockStatus = await blockingService.isBlocked(
      followerId,
      targetUserId
    );
    if (blockStatus.isBlocked) {
      console.log(
        `[followService] Unblocking user ${targetUserId} before following`
      );
      await blockingService.unblockUser(followerId, targetUserId);
    }

    // Get target user data
    const targetUserDoc = await getDoc(doc(db, 'users', targetUserId));
    if (!targetUserDoc.exists()) {
      throw new Error('User not found');
    }

    const targetUserData = targetUserDoc.data();
    const batch = writeBatch(db);

    // Create following relationship
    const followingRef = doc(
      db,
      'users',
      followerId,
      'following',
      targetUserId
    );
    batch.set(followingRef, {
      id: targetUserId,
      userId: followerId,
      targetUserId,
      createdAt: Timestamp.now(),
      targetData: {
        firstName:
          targetUserData?.userdata?.contactInfo?.firstName || 'Unknown',
        lastName: targetUserData?.userdata?.contactInfo?.lastName || '',
        displayName:
          `${targetUserData?.userdata?.contactInfo?.firstName || ''} ${targetUserData?.userdata?.contactInfo?.lastName || ''}`.trim() ||
          'Unknown User',
        avatar: null, // TODO: Add avatar system later
      },
    });

    // Create follower relationship
    const followerRef = doc(db, 'users', targetUserId, 'followers', followerId);
    batch.set(followerRef, {
      id: followerId,
      followerId,
      userId: targetUserId,
      createdAt: Timestamp.now(),
      followerData: {
        firstName: followerData?.userdata?.contactInfo?.firstName || 'Unknown',
        lastName: followerData?.userdata?.contactInfo?.lastName || '',
        displayName:
          `${followerData?.userdata?.contactInfo?.firstName || ''} ${followerData?.userdata?.contactInfo?.lastName || ''}`.trim() ||
          'Unknown User',
        avatar: null,
      },
    });

    // Update follower's following count
    const followerUserRef = doc(db, 'users', followerId);
    batch.update(followerUserRef, {
      'userdata.followingCount': increment(1),
      'userdata.lastUpdated': Timestamp.now(),
    });

    // Update target's follower count
    const targetUserRef = doc(db, 'users', targetUserId);
    batch.update(targetUserRef, {
      'userdata.followerCount': increment(1),
      'userdata.lastUpdated': Timestamp.now(),
    });

    await batch.commit();

    // Send notification (import dynamically to avoid circular deps)
    try {
      console.log(
        `[followUser] Sending follow notification from ${followerId} to ${targetUserId}`
      );
      const { notifyNewFollower } = await import('./notifications');
      const notificationResult = await notifyNewFollower({
        targetUserId,
        followerId,
        followerName:
          `${followerData?.userdata?.contactInfo?.firstName || ''} ${followerData?.userdata?.contactInfo?.lastName || ''}`.trim() ||
          followerData?.userdata?.contactInfo?.displayName ||
          'Someone',
      });
      console.log(`[followUser] Notification result:`, notificationResult);
    } catch (notificationError) {
      console.warn(
        `[followUser] Follow successful but notification failed:`,
        notificationError
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error following user:', error);
    throw error;
  } finally {
    // Always clear the pending operation
    pendingOperations.delete(operationKey);
  }
};

/**
 * Unfollow a user
 */
export const unfollowUser = async (followerId, targetUserId) => {
  const operationKey = `${followerId}-${targetUserId}`;
  const pendingOperations = new Map(); // Move this to module scope if needed

  // Check if operation is already in progress
  if (pendingOperations.has(operationKey)) {
    throw new Error('Unfollow operation already in progress');
  }

  try {
    pendingOperations.set(operationKey, 'unfollowing');

    // Check if following (within the pending operation)
    const isFollowing = await checkIfFollowing(followerId, targetUserId);
    if (!isFollowing) {
      throw new Error('Not following this user');
    }

    const batch = writeBatch(db);

    // Remove following relationship
    const followingRef = doc(
      db,
      'users',
      followerId,
      'following',
      targetUserId
    );
    batch.delete(followingRef);

    // Remove follower relationship
    const followerRef = doc(db, 'users', targetUserId, 'followers', followerId);
    batch.delete(followerRef);

    // Update follower's following count
    const followerUserRef = doc(db, 'users', followerId);
    batch.update(followerUserRef, {
      'userdata.followingCount': increment(-1),
      'userdata.lastUpdated': Timestamp.now(),
    });

    // Update target's follower count
    const targetUserRef = doc(db, 'users', targetUserId);
    batch.update(targetUserRef, {
      'userdata.followerCount': increment(-1),
      'userdata.lastUpdated': Timestamp.now(),
    });

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error unfollowing user:', error);
    throw error;
  } finally {
    // Always clear the pending operation
    pendingOperations.delete(operationKey);
  }
};

/**
 * Get user's followers
 */
export const getFollowers = async (userId, limitCount = 50) => {
  try {
    const followersRef = collection(db, 'users', userId, 'followers');
    const q = query(
      followersRef,
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error getting followers:', error);
    return [];
  }
};

/**
 * Get users that a user is following
 */
export const getFollowing = async (userId, limitCount = 50) => {
  try {
    const followingRef = collection(db, 'users', userId, 'following');
    const q = query(
      followingRef,
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error getting following:', error);
    return [];
  }
};

// Additional exports for compatibility
export const getFriends = getMutualFollows;
export const getFollowStatus = async (followerId, targetUserId) => {
  try {
    const isFollowing = await checkIfFollowing(followerId, targetUserId);
    return {
      isFollowing,
      success: true,
    };
  } catch (error) {
    console.error('Error getting follow status:', error);
    return {
      isFollowing: false,
      success: false,
      error: error.message,
    };
  }
};

// Alias functions for useSocialList.js compatibility
export const getFollowingList = getFollowing;
export const getFollowersList = getFollowers;
export const getMutualFriendsList = getMutualFollows;