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
 * Module-level pending operations tracker to prevent duplicate requests
 */
const pendingOperations = new Map();

/**
 * Module-level cooldown tracker to prevent rapid toggling
 * Stores timestamp of last operation completion
 */
const operationCooldowns = new Map();

/**
 * Cooldown period in milliseconds (prevent rapid toggling)
 */
const COOLDOWN_MS = 2000; // 2 seconds

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
    if (
      !followerId ||
      !targetUserId ||
      typeof followerId !== 'string' ||
      typeof targetUserId !== 'string'
    ) {
      console.warn('[followService] Invalid parameters for checkIfFollowing:', {
        followerId,
        targetUserId,
      });
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
 * @param {string} userId - User ID to get stats for
 * @param {boolean} includeMutual - Whether to calculate mutual follows (expensive operation, defaults to false)
 */
export const getFollowStats = async (userId, includeMutual = false) => {
  try {
    if (!userId || typeof userId !== 'string') {
      console.warn(
        '[followService] Invalid userId provided to getFollowStats:',
        userId
      );
      return { followingCount: 0, followerCount: 0, mutualCount: 0 };
    }

    // Read counts from user document (updated by increment() in follow/unfollow/block operations)
    // This is much faster than counting entire collections
    const userDoc = await getDoc(doc(db, 'users', userId));

    if (!userDoc.exists()) {
      console.warn('[followService] User document not found:', userId);
      return { followingCount: 0, followerCount: 0, mutualCount: 0 };
    }

    const userData = userDoc.data();
    const followingCount = userData?.userdata?.metrics?.social?.followingCount || 0;
    const followerCount = userData?.userdata?.metrics?.social?.followersCount || 0;

    // Only calculate mutual follows if explicitly requested (expensive operation)
    let mutualCount = 0;
    if (includeMutual) {
      try {
        const mutualFollows = await getMutualFollows(userId);
        mutualCount = Array.isArray(mutualFollows) ? mutualFollows.length : 0;
      } catch (mutualError) {
        console.error(
          '[followService] Error getting mutual follows in getFollowStats:',
          mutualError
        );
        mutualCount = 0;
      }
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
    if (
      !currentUserId ||
      !targetUserId ||
      typeof currentUserId !== 'string' ||
      typeof targetUserId !== 'string'
    ) {
      console.warn(
        '[followService] Invalid parameters for getUserRelationshipStatus:',
        { currentUserId, targetUserId }
      );
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
    if (
      !userId1 ||
      !userId2 ||
      typeof userId1 !== 'string' ||
      typeof userId2 !== 'string'
    ) {
      console.warn(
        '[followService] Invalid parameters for checkIfMutualFollows:',
        { userId1, userId2 }
      );
      return false;
    }

    // Users cannot be mutual followers of themselves
    if (userId1 === userId2) {
      return false;
    }

    // Check both directions in parallel for efficiency
    const [user1FollowsUser2, user2FollowsUser1] = await Promise.all([
      checkIfFollowing(userId1, userId2),
      checkIfFollowing(userId2, userId1),
    ]);

    return user1FollowsUser2 && user2FollowsUser1;
  } catch (error) {
    console.error('[followService] Error checking mutual follows:', error);
    return false;
  }
};

/**
 * Get mutual followers (friends) - Uses intersection logic for mathematically correct results
 */
export const getMutualFollows = async (userId, limitCount = 50) => {
  try {
    if (!userId || typeof userId !== 'string') {
      console.warn(
        '[followService] Invalid userId provided to getMutualFollows:',
        userId
      );
      return [];
    }

    // Get both followers and following lists in parallel
    const [followers, following] = await Promise.all([
      getFollowers(userId, limitCount),
      getFollowing(userId, limitCount)
    ]);

    // Validate both arrays exist
    if (!Array.isArray(followers) || !Array.isArray(following)) {
      console.warn('[followService] Invalid followers or following data');
      return [];
    }

    // If either list is empty, no mutual follows possible
    if (followers.length === 0 || following.length === 0) {
      return [];
    }

    // Find intersection: users who appear in BOTH followers AND following lists
    const mutualFollows = followers.filter(follower => {
      // Check if this follower is also in the following list
      return following.some(followed => followed.id === follower.id);
    }).map(user => ({
      ...user,
      isMutual: true, // Mark as mutual follow relationship
    }));

    // Mathematical validation: friends should never exceed min(followers, following)
    const maxPossibleFriends = Math.min(followers.length, following.length);
    if (mutualFollows.length > maxPossibleFriends) {
      console.error(
        `[followService] Mathematical error: ${mutualFollows.length} friends found but max possible is ${maxPossibleFriends}`
      );
    }

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
export const followUser = async (followerId, targetUserId, followerData, targetUserData = null) => {
  const operationKey = `${followerId}-${targetUserId}`;

  // Throttle: Check if operation is already in progress
  if (pendingOperations.has(operationKey)) {
    return { success: false, throttled: true };
  }

  // Cooldown: Check if user is toggling too rapidly
  const lastOperationTime = operationCooldowns.get(operationKey);
  if (lastOperationTime) {
    const timeSinceLastOp = Date.now() - lastOperationTime;
    if (timeSinceLastOp < COOLDOWN_MS) {
      return { success: false, cooldown: true };
    }
  }

  try {
    pendingOperations.set(operationKey, 'following');

    if (followerId === targetUserId) {
      throw new Error('Cannot follow yourself');
    }

    // Skip "already following" check - UI manages this state
    // Skip block status check - only handle if specifically needed

    // Use provided target user data or fetch if not provided
    let finalTargetUserData = targetUserData;
    if (!finalTargetUserData) {
      const targetUserDoc = await getDoc(doc(db, 'users', targetUserId));
      if (!targetUserDoc.exists()) {
        throw new Error('User not found');
      }
      finalTargetUserData = targetUserDoc.data();
    }
    const timestamp = Timestamp.now();
    const batch = writeBatch(db);

    // Create following relationship (optimized data storage)
    const followingRef = doc(db, 'users', followerId, 'following', targetUserId);
    batch.set(followingRef, {
      id: targetUserId,
      createdAt: timestamp,
      firstName: finalTargetUserData?.userdata?.contactInfo?.firstName || 'Unknown',
      lastName: finalTargetUserData?.userdata?.contactInfo?.lastName || '',
      profilePicture: finalTargetUserData?.userdata?.contactInfo?.profilePicture || null,
    });

    // Create follower relationship (optimized data storage)
    const followerRef = doc(db, 'users', targetUserId, 'followers', followerId);
    batch.set(followerRef, {
      id: followerId,
      createdAt: timestamp,
      firstName: followerData?.userdata?.contactInfo?.firstName || 'Unknown',
      lastName: followerData?.userdata?.contactInfo?.lastName || '',
      profilePicture: followerData?.userdata?.contactInfo?.profilePicture || null,
    });

    // Update follower's following count
    const followerUserRef = doc(db, 'users', followerId);
    batch.update(followerUserRef, {
      'userdata.metrics.social.followingCount': increment(1),
      'userdata.lastUpdated': timestamp,
    });

    // Update target's follower count
    const targetUserRef = doc(db, 'users', targetUserId);
    batch.update(targetUserRef, {
      'userdata.metrics.social.followersCount': increment(1),
      'userdata.lastUpdated': timestamp,
    });

    // Execute all writes as single atomic operation
    await batch.commit();

    // Set cooldown timestamp
    operationCooldowns.set(operationKey, Date.now());

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

  // Throttle: Check if operation is already in progress
  if (pendingOperations.has(operationKey)) {
    console.warn('[unfollowUser] Operation already in progress, ignoring duplicate request');
    return { success: false, throttled: true };
  }

  // Cooldown: Check if user is toggling too rapidly
  const lastOperationTime = operationCooldowns.get(operationKey);
  if (lastOperationTime) {
    const timeSinceLastOp = Date.now() - lastOperationTime;
    if (timeSinceLastOp < COOLDOWN_MS) {
      return { success: false, cooldown: true };
    }
  }

  try {
    pendingOperations.set(operationKey, 'unfollowing');

    // Skip "not following" check - UI manages this state

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
      'userdata.metrics.social.followingCount': increment(-1),
      'userdata.lastUpdated': Timestamp.now(),
    });

    // Update target's follower count
    const targetUserRef = doc(db, 'users', targetUserId);
    batch.update(targetUserRef, {
      'userdata.metrics.social.followersCount': increment(-1),
      'userdata.lastUpdated': Timestamp.now(),
    });

    await batch.commit();

    // Set cooldown timestamp
    operationCooldowns.set(operationKey, Date.now());

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

    // Get full user profiles for each follower relationship
    const followerIds = snapshot.docs.map(doc => doc.id);
    if (followerIds.length === 0) return [];

    const userProfiles = await Promise.all(
      followerIds.map(async (followerId) => {
        try {
          const userRef = doc(db, 'users', followerId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            // Check if current user follows back this follower
            const followsBack = await checkIfFollowing(userId, followerId);
            return {
              id: followerId,
              ...userSnap.data(),
              isFollowing: followsBack, // Whether the current user follows this follower back
            };
          }
          return null;
        } catch (err) {
          console.error(`[followService] Error fetching follower profile ${followerId}:`, err);
          return null;
        }
      })
    );

    // Filter out null results (deleted/missing users)
    return userProfiles.filter(user => user !== null);
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

    // Get full user profiles for each follow relationship
    const followingIds = snapshot.docs.map(doc => doc.id);
    if (followingIds.length === 0) return [];

    const userProfiles = await Promise.all(
      followingIds.map(async (targetUserId) => {
        try {
          const userRef = doc(db, 'users', targetUserId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            return {
              id: targetUserId,
              ...userSnap.data(),
              isFollowing: true, // All users in following list are being followed
            };
          }
          return null;
        } catch (err) {
          console.error(`[followService] Error fetching user profile ${targetUserId}:`, err);
          return null;
        }
      })
    );

    // Filter out null results (deleted/missing users)
    return userProfiles.filter(user => user !== null);
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
