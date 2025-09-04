// FILE: services/followService.js - Follow/Follower System

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
 * DATABASE STRUCTURE:
 * 
 * /users/{userId}/following/{targetUserId}
 * {
 *   id: string,
 *   userId: string, // who is following
 *   targetUserId: string, // who is being followed
 *   createdAt: Timestamp,
 *   targetData: {
 *     firstName: string,
 *     lastName: string,
 *     displayName: string,
 *     avatar?: string
 *   }
 * }
 * 
 * /users/{userId}/followers/{followerId}
 * {
 *   id: string,
 *   followerId: string, // who is following this user
 *   userId: string, // who is being followed
 *   createdAt: Timestamp,
 *   followerData: {
 *     firstName: string,
 *     lastName: string,
 *     displayName: string,
 *     avatar?: string
 *   }
 * }
 * 
 * /users/{userId} (updated with counts)
 * {
 *   ...existing fields,
 *   followingCount: number,
 *   followerCount: number,
 *   lastUpdated: Timestamp
 * }
 */

// Track pending operations to prevent race conditions
const pendingOperations = new Map();

/**
 * Follow a user
 */
export const followUser = async (followerId, targetUserId, followerData) => {
  const operationKey = `${followerId}-${targetUserId}`;
  
  // Check if operation is already in progress
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
    const blockStatus = await blockingService.isBlocked(followerId, targetUserId);
    if (blockStatus.isBlocked) {
      console.log(`[followService] Unblocking user ${targetUserId} before following`);
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
    const followingRef = doc(db, 'users', followerId, 'following', targetUserId);
    batch.set(followingRef, {
      id: targetUserId,
      userId: followerId,
      targetUserId,
      createdAt: Timestamp.now(),
      targetData: {
        firstName: targetUserData?.userdata?.contactInfo?.firstName || 'Unknown',
        lastName: targetUserData?.userdata?.contactInfo?.lastName || '',
        displayName: `${targetUserData?.userdata?.contactInfo?.firstName || ''} ${targetUserData?.userdata?.contactInfo?.lastName || ''}`.trim() || 'Unknown User',
        avatar: null // TODO: Add avatar system later
      }
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
        displayName: `${followerData?.userdata?.contactInfo?.firstName || ''} ${followerData?.userdata?.contactInfo?.lastName || ''}`.trim() || 'Unknown User',
        avatar: null
      }
    });

    // Update follower's following count
    const followerUserRef = doc(db, 'users', followerId);
    batch.update(followerUserRef, {
      'userdata.followingCount': increment(1),
      'userdata.lastUpdated': Timestamp.now()
    });

    // Update target's follower count
    const targetUserRef = doc(db, 'users', targetUserId);
    batch.update(targetUserRef, {
      'userdata.followerCount': increment(1),
      'userdata.lastUpdated': Timestamp.now()
    });

    await batch.commit();

    // Send notification (import dynamically to avoid circular deps)
    try {
      console.log(`[followUser] Sending follow notification from ${followerId} to ${targetUserId}`);
      const { notifyNewFollower } = await import('./notifications');
      const notificationResult = await notifyNewFollower({
        targetUserId,
        followerId,
        followerName: `${followerData?.userdata?.contactInfo?.firstName || ''} ${followerData?.userdata?.contactInfo?.lastName || ''}`.trim() || followerData?.userdata?.contactInfo?.displayName || 'Someone'
      });
      console.log(`[followUser] Notification result:`, notificationResult);
    } catch (notificationError) {
      console.warn(`[followUser] Follow successful but notification failed:`, notificationError);
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
    const followingRef = doc(db, 'users', followerId, 'following', targetUserId);
    batch.delete(followingRef);

    // Remove follower relationship
    const followerRef = doc(db, 'users', targetUserId, 'followers', followerId);
    batch.delete(followerRef);

    // Update follower's following count
    const followerUserRef = doc(db, 'users', followerId);
    batch.update(followerUserRef, {
      'userdata.followingCount': increment(-1),
      'userdata.lastUpdated': Timestamp.now()
    });

    // Update target's follower count
    const targetUserRef = doc(db, 'users', targetUserId);
    batch.update(targetUserRef, {
      'userdata.followerCount': increment(-1),
      'userdata.lastUpdated': Timestamp.now()
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
 * Check if one user is following another
 */
export const checkIfFollowing = async (followerId, targetUserId) => {
  try {
    const followingRef = doc(db, 'users', followerId, 'following', targetUserId);
    const followingDoc = await getDoc(followingRef);
    return followingDoc.exists();
  } catch (error) {
    console.error('Error checking follow status:', error);
    return false;
  }
};

/**
 * Check if two users are mutual followers (friends)
 */
export const checkIfMutualFollows = async (userId1, userId2) => {
  try {
    const [following, followedBy] = await Promise.all([
      checkIfFollowing(userId1, userId2),
      checkIfFollowing(userId2, userId1)
    ]);
    return following && followedBy;
  } catch (error) {
    console.error('Error checking mutual follow status:', error);
    return false;
  }
};

/**
 * Get user's followers
 */
export const getFollowers = async (userId, limitCount = 50) => {
  try {
    const followersRef = collection(db, 'users', userId, 'followers');
    const q = query(followersRef, orderBy('createdAt', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
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
    const q = query(followingRef, orderBy('createdAt', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting following:', error);
    return [];
  }
};

/**
 * Get mutual followers (friends)
 */
export const getMutualFollows = async (userId, limitCount = 50) => {
  try {
    const following = await getFollowing(userId, limitCount);
    const mutualFollows = [];

    // Check each person we follow to see if they follow us back
    for (const followedUser of following) {
      const isFollowingBack = await checkIfFollowing(followedUser.targetUserId, userId);
      if (isFollowingBack) {
        mutualFollows.push({
          id: followedUser.targetUserId,
          ...followedUser.targetData,
          isMutual: true,
          followedAt: followedUser.createdAt
        });
      }
    }

    return mutualFollows;
  } catch (error) {
    console.error('Error getting mutual follows:', error);
    return [];
  }
};

/**
 * Get follow statistics for a user
 */
export const getFollowStats = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      return { followingCount: 0, followerCount: 0, mutualCount: 0 };
    }

    const userData = userDoc.data();
    const followingCount = userData?.userdata?.followingCount || 0;
    const followerCount = userData?.userdata?.followerCount || 0;

    // Calculate mutual follows count
    const mutualFollows = await getMutualFollows(userId);
    const mutualCount = mutualFollows.length;

    return {
      followingCount,
      followerCount,
      mutualCount
    };
  } catch (error) {
    console.error('Error getting follow stats:', error);
    return { followingCount: 0, followerCount: 0, mutualCount: 0 };
  }
};

/**
 * Get suggested users to follow (based on mutual connections, same studio, etc.)
 */
export const getSuggestedFollows = async (userId, userStudio, limitCount = 10) => {
  try {
    // Get users from same studio who we're not following
    const { getStudioUsers } = await import('./userService');
    const studioUsers = await getStudioUsers(userId, userStudio);
    
    // Get who we're already following
    const following = await getFollowing(userId, 100);
    const followingIds = new Set(following.map(f => f.targetUserId));

    // Filter out users we're already following
    const suggestions = studioUsers
      .filter(user => !followingIds.has(user.id))
      .slice(0, limitCount)
      .map(user => ({
        ...user,
        reason: 'Same studio',
        category: 'studio_members'
      }));

    return suggestions;
  } catch (error) {
    console.error('Error getting suggested follows:', error);
    return [];
  }
};

/**
 * Batch follow multiple users (useful for migration)
 */
export const batchFollowUsers = async (followerId, targetUserIds, followerData) => {
  try {
    const results = [];
    
    // Process in small batches to avoid overwhelming Firestore
    const batchSize = 5;
    for (let i = 0; i < targetUserIds.length; i += batchSize) {
      const batch = targetUserIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (targetUserId) => {
        try {
          await followUser(followerId, targetUserId, followerData);
          return { userId: targetUserId, success: true };
        } catch (error) {
          return { userId: targetUserId, success: false, error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + batchSize < targetUserIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  } catch (error) {
    console.error('Error batch following users:', error);
    throw error;
  }
};

/**
 * Migration helper: Convert existing friendships to mutual follows
 */
export const migrateFriendsToFollows = async (userId, userData) => {
  try {
    console.log(`[followService] Starting migration for user ${userId}`);
    
    // Get existing friends from old system
    const { getFriends } = await import('./friendService');
    const existingFriends = await getFriends(userId);
    
    if (existingFriends.length === 0) {
      console.log(`[followService] No existing friends to migrate for user ${userId}`);
      return { success: true, migratedCount: 0 };
    }

    console.log(`[followService] Migrating ${existingFriends.length} friends to follows`);
    
    // Convert each friend relationship to mutual follows
    const friendIds = existingFriends.map(friend => friend.id);
    const results = await batchFollowUsers(userId, friendIds, userData);
    
    // Also follow back (make them mutual)
    const followBackResults = [];
    for (const friendId of friendIds) {
      try {
        // Get friend's data
        const friendDoc = await getDoc(doc(db, 'users', friendId));
        if (friendDoc.exists()) {
          await followUser(friendId, userId, friendDoc.data());
          followBackResults.push({ userId: friendId, success: true });
        }
      } catch (error) {
        followBackResults.push({ userId: friendId, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    
    console.log(`[followService] Migration completed: ${successCount}/${existingFriends.length} successful`);
    
    return {
      success: true,
      migratedCount: successCount,
      results,
      followBackResults
    };
  } catch (error) {
    console.error('Error migrating friends to follows:', error);
    throw error;
  }
};

/**
 * Get full user data for followers list (includes follow status)
 */
export const getFollowersList = async (userId) => {
  try {
    const followers = await getFollowers(userId);
    const userIds = followers.map(f => f.followerId);
    
    // Get full user data
    const userPromises = userIds.map(async (id) => {
      try {
        const userDoc = await getDoc(doc(db, 'users', id));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const isFollowing = await checkIfFollowing(userId, id);
          return {
            id,
            ...userData,
            isFollowing,
          };
        }
      } catch (error) {
        console.error(`Error fetching user ${id}:`, error);
      }
      return null;
    });
    
    const users = await Promise.all(userPromises);
    return users.filter(Boolean);
  } catch (error) {
    console.error('Error getting followers list:', error);
    return [];
  }
};

/**
 * Get full user data for following list (includes follow status)
 */
export const getFollowingList = async (userId) => {
  try {
    const following = await getFollowing(userId);
    const userIds = following.map(f => f.targetUserId);
    
    // Get full user data
    const userPromises = userIds.map(async (id) => {
      try {
        const userDoc = await getDoc(doc(db, 'users', id));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          return {
            id,
            ...userData,
            isFollowing: true, // They're in the following list
          };
        }
      } catch (error) {
        console.error(`Error fetching user ${id}:`, error);
      }
      return null;
    });
    
    const users = await Promise.all(userPromises);
    return users.filter(Boolean);
  } catch (error) {
    console.error('Error getting following list:', error);
    return [];
  }
};

/**
 * Get full user data for mutual friends list (includes follow status)
 */
export const getMutualFriendsList = async (userId) => {
  try {
    const mutualFollows = await getMutualFollows(userId);
    const userIds = mutualFollows.map(f => f.id);
    
    // Get full user data
    const userPromises = userIds.map(async (id) => {
      try {
        const userDoc = await getDoc(doc(db, 'users', id));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          return {
            id,
            ...userData,
            isFollowing: true, // They're mutual friends
            isMutual: true,
          };
        }
      } catch (error) {
        console.error(`Error fetching user ${id}:`, error);
      }
      return null;
    });
    
    const users = await Promise.all(userPromises);
    return users.filter(Boolean);
  } catch (error) {
    console.error('Error getting mutual friends list:', error);
    return [];
  }
};

// Export for backward compatibility (temporary)
export const getFriends = getMutualFollows;
export const sendFriendRequest = followUser;
export const acceptFriendRequest = () => { throw new Error('Use followUser instead'); };
export const declineFriendRequest = () => { throw new Error('Friend requests no longer exist'); };