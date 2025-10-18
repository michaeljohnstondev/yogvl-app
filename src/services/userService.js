// FILE: services/userService.js - User Data Service for Friend/User Management

import {
  getDoc,
  doc,
  updateDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
  collection,
  getDocs,
} from '../lib/firebase';
import { db } from '../auth/services/firebase';
import { blockingService } from './blockingService';

/**
 * Get all app users from the same studio as current user
 * PLUS favorites and following from ANY studio (for cross-studio invitations)
 */
export const getStudioUsers = async (currentUserId, userStudio) => {
  try {
    if (!userStudio) {
      console.warn('[userService] No user studio provided');
      return [];
    }

    // First get the studio document to get the users list
    const studioRef = doc(db, 'studios', userStudio);
    const studioSnap = await getDoc(studioRef);

    if (!studioSnap.exists()) {
      console.warn(`[userService] Studio ${userStudio} not found`);
      return [];
    }

    const studioData = studioSnap.data();
    const studioUserIds = studioData.users || [];

    if (studioUserIds.length === 0) {
      console.log(`[userService] No users registered in studio ${userStudio}`);
      return [];
    }

    // Filter out current user
    const otherUserIds = studioUserIds.filter((uid) => uid !== currentUserId);

    if (otherUserIds.length === 0) {
      console.log(`[userService] Only current user in studio ${userStudio}`);
      return [];
    }

    // Batch get user documents (Firestore allows up to 10 in a single batch)
    const users = [];
    const batchSize = 10;

    for (let i = 0; i < otherUserIds.length; i += batchSize) {
      const batch = otherUserIds.slice(i, i + batchSize);
      const userPromises = batch.map((uid) => getDoc(doc(db, 'users', uid)));
      const userSnaps = await Promise.all(userPromises);

      userSnaps.forEach((userSnap) => {
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const contactInfo = userData?.userdata?.contactInfo;

          if (contactInfo?.firstName) {
            // Only include users with names
            users.push({
              id: userSnap.id,
              name: `${contactInfo.firstName} ${contactInfo.lastName || ''}`.trim(),
              firstName: contactInfo.firstName,
              lastName: contactInfo.lastName,
              email: contactInfo.email,
              phone: contactInfo.phone,
              avatar: getAvatarForUser(contactInfo.firstName),
              // Follow status - will be populated after user collection
              isFavorite: false, // TODO: Check favorites system
              isFollowing: false, // Will be checked against follow relationships
              isMutualFollow: false, // Will be checked for mutual follows
              isFriend: false, // DEPRECATED - kept for backward compatibility
              isLocalNode: true, // Same studio = local node
              category: 'studio_members',
            });
          }
        }
      });
    }

    // Get blocked users list
    const { blockedUsers } = await blockingService.getBlockedUsers(currentUserId);
    const blockedUsersSet = new Set(blockedUsers);

    // Check follow relationships and favorites for each user
    try {
      const { checkIfFollowing } = await import('./followService');
      const { checkIfFavorite } = await import('./shared/userRelationshipsService');

      // Check follow status and favorites for each user
      for (const user of users) {
        const isUserFollowingMe = await checkIfFollowing(
          user.id,
          currentUserId
        );
        const amIFollowingUser = await checkIfFollowing(currentUserId, user.id);
        const isUserInFavorites = await checkIfFavorite(currentUserId, user.id);

        user.isFollowing = amIFollowingUser;
        user.isMutualFollow = isUserFollowingMe && amIFollowingUser;
        user.isFriend = user.isMutualFollow; // Friends = mutual followers
        user.isFavorite = isUserInFavorites; // Favorites status
      }
    } catch (error) {
      console.warn('[userService] Error checking follow relationships:', error);
      // Continue with default false values if follow check fails
    }

    // Filter out users who you blocked or who blocked you
    const filteredUsers = [];
    for (const user of users) {
      // Skip if you blocked this user
      if (blockedUsersSet.has(user.id)) {
        continue;
      }

      // Skip if this user blocked you
      const isBlockedByUser = await blockingService.isBlockedBy(currentUserId, user.id);
      if (isBlockedByUser) {
        continue;
      }

      filteredUsers.push(user);
    }

    // Now add favorites and following from OTHER studios (cross-studio users)
    try {
      // Helper: Get favorite user IDs from subcollection
      const getFavoriteIds = async (userId) => {
        const favoritesRef = collection(db, 'users', userId, 'favorites');
        const snapshot = await getDocs(favoritesRef);
        return snapshot.docs.map(doc => doc.id);
      };

      // Helper: Get following user IDs from subcollection
      const getFollowingIds = async (userId) => {
        const followingRef = collection(db, 'users', userId, 'following');
        const snapshot = await getDocs(followingRef);
        return snapshot.docs.map(doc => doc.id);
      };

      // Get user IDs of favorites and following
      const favoriteIds = await getFavoriteIds(currentUserId);
      const followingIds = await getFollowingIds(currentUserId);

      // Combine and deduplicate
      const crossStudioUserIds = [...new Set([...favoriteIds, ...followingIds])];

      // Filter out users already in studio list and current user
      const studioUserIdsSet = new Set(filteredUsers.map(u => u.id));
      const newUserIds = crossStudioUserIds.filter(
        uid => uid !== currentUserId && !studioUserIdsSet.has(uid)
      );

      if (newUserIds.length > 0) {
        console.log(`[userService] Loading ${newUserIds.length} cross-studio favorites/following`);

        // Fetch these users (in batches of 10)
        const crossStudioUsers = [];
        for (let i = 0; i < newUserIds.length; i += batchSize) {
          const batch = newUserIds.slice(i, i + batchSize);
          const userPromises = batch.map((uid) => getDoc(doc(db, 'users', uid)));
          const userSnaps = await Promise.all(userPromises);

          for (const userSnap of userSnaps) {
            if (userSnap.exists()) {
              const userData = userSnap.data();
              const contactInfo = userData?.userdata?.contactInfo;

              if (contactInfo?.firstName) {
                const userId = userSnap.id;

                // Skip blocked users
                if (blockedUsersSet.has(userId)) continue;
                const isBlockedByUser = await blockingService.isBlockedBy(currentUserId, userId);
                if (isBlockedByUser) continue;

                // Check relationships
                const { checkIfFollowing } = await import('./followService');
                const { checkIfFavorite } = await import('./shared/userRelationshipsService');

                const isUserFollowingMe = await checkIfFollowing(userId, currentUserId);
                const amIFollowingUser = await checkIfFollowing(currentUserId, userId);
                const isUserInFavorites = await checkIfFavorite(currentUserId, userId);

                crossStudioUsers.push({
                  id: userId,
                  name: `${contactInfo.firstName} ${contactInfo.lastName || ''}`.trim(),
                  firstName: contactInfo.firstName,
                  lastName: contactInfo.lastName,
                  email: contactInfo.email,
                  phone: contactInfo.phone,
                  avatar: getAvatarForUser(contactInfo.firstName),
                  isFavorite: isUserInFavorites,
                  isFollowing: amIFollowingUser,
                  isMutualFollow: isUserFollowingMe && amIFollowingUser,
                  isFriend: isUserFollowingMe && amIFollowingUser,
                  isLocalNode: false, // From different studio = NOT local node
                  category: 'cross_studio',
                });
              }
            }
          }
        }

        // Merge cross-studio users with studio users
        filteredUsers.push(...crossStudioUsers);
        console.log(`[userService] Added ${crossStudioUsers.length} cross-studio users`);
      }
    } catch (error) {
      console.warn('[userService] Error loading cross-studio favorites/following:', error);
      // Continue with just studio users if this fails
    }

    // Sort by first name
    filteredUsers.sort((a, b) => a.firstName.localeCompare(b.firstName));

    console.log(
      `[userService] Found ${filteredUsers.length} total users (studio + cross-studio)`
    );
    return filteredUsers;
  } catch (error) {
    console.error('[userService] Error fetching studio users:', error);
    return [];
  }
};

/**
 * Search users by name or email
 */
export const searchUsers = async (
  searchQuery,
  currentUserId,
  userStudio,
  limit = 20
) => {
  try {
    if (!searchQuery?.trim() || searchQuery.length < 2) {
      return [];
    }

    const query_lower = searchQuery.toLowerCase().trim();

    // Get all studio users first (could be optimized with better Firestore queries)
    const allUsers = await getStudioUsers(currentUserId, userStudio);

    // Filter by search query
    const filteredUsers = allUsers.filter((user) => {
      const nameMatch = user.name.toLowerCase().includes(query_lower);
      const emailMatch = user.email?.toLowerCase().includes(query_lower);
      return nameMatch || emailMatch;
    });

    return filteredUsers.slice(0, limit);
  } catch (error) {
    console.error('[userService] Error searching users:', error);
    return [];
  }
};

/**
 * Get user's favorites (placeholder - would integrate with favorites system)
 */
export const getUserFavorites = async (currentUserId) => {
  try {
    // TODO: Implement favorites collection/subcollection
    // For now, return empty array
    return [];
  } catch (error) {
    console.error('[userService] Error fetching user favorites:', error);
    return [];
  }
};

/**
 * Get simple avatar emoji based on user's first name
 */
const getAvatarForUser = (firstName) => {
  if (!firstName) return '👤';

  const firstLetter = firstName.charAt(0).toLowerCase();
  const avatars = ['🙂', '😊', '🌟', '⭐', '💫', '🎯', '🎨', '🎭', '🎪', '🎨'];
  const index = firstLetter.charCodeAt(0) % avatars.length;
  return avatars[index];
};

/**
 * Check if user is in favorites (placeholder)
 */
export const isUserFavorite = async (currentUserId, targetUserId) => {
  // TODO: Check favorites collection
  return false;
};

/**
 * Add/remove user from favorites (placeholder)
 */
export const toggleUserFavorite = async (currentUserId, targetUserId) => {
  // TODO: Update favorites collection
  console.log(`[userService] Toggle favorite for user ${targetUserId}`);
  return false;
};

/**
 * Register user with their studio (add to studio.users array)
 */
export const registerUserWithStudio = async (userId, studioId) => {
  try {
    if (!userId || !studioId) {
      console.warn(
        '[userService] Missing userId or studioId for studio registration'
      );
      return { success: false, error: 'Missing parameters' };
    }

    const studioRef = doc(db, 'studios', studioId);

    // Try to update first
    try {
      await updateDoc(studioRef, {
        users: arrayUnion(userId),
        lastUpdated: new Date(),
      });
    } catch (updateError) {
      // If studio doesn't exist, create it
      if (updateError.code === 'not-found') {
        console.log(
          `[userService] Studio ${studioId} doesn't exist, creating it...`
        );
        await setDoc(studioRef, {
          id: studioId,
          name: studioId
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase()), // Format ID as name
          users: [userId],
          createdAt: new Date(),
          lastUpdated: new Date(),
        });
      } else {
        throw updateError; // Re-throw other errors
      }
    }

    console.log(
      `[userService] Successfully registered user ${userId} with studio ${studioId}`
    );

    return { success: true };
  } catch (error) {
    console.error(
      `[userService] Error registering user ${userId} with studio ${studioId}:`,
      error
    );
    return { success: false, error: error.message };
  }
};

/**
 * Remove user from studio (remove from studio.users array)
 */
export const removeUserFromStudio = async (userId, studioId) => {
  try {
    if (!userId || !studioId) {
      console.warn(
        '[userService] Missing userId or studioId for studio removal'
      );
      return { success: false, error: 'Missing parameters' };
    }

    const studioRef = doc(db, 'studios', studioId);

    await updateDoc(studioRef, {
      users: arrayRemove(userId),
      lastUpdated: new Date(),
    });

    console.log(
      `[userService] Successfully removed user ${userId} from studio ${studioId}`
    );

    return { success: true };
  } catch (error) {
    console.error(
      `[userService] Error removing user ${userId} from studio ${studioId}:`,
      error
    );
    return { success: false, error: error.message };
  }
};

/**
 * Switch user from one studio to another (handles both removal and addition)
 */
export const switchUserStudio = async (userId, oldStudioId, newStudioId) => {
  try {
    if (!userId || !newStudioId) {
      console.warn(
        '[userService] Missing userId or newStudioId for studio switch'
      );
      return { success: false, error: 'Missing parameters' };
    }

    console.log(
      `[userService] Switching user ${userId} from studio ${oldStudioId} to ${newStudioId}`
    );

    // Remove from old studio (if exists)
    if (oldStudioId && oldStudioId !== newStudioId) {
      const removeResult = await removeUserFromStudio(userId, oldStudioId);
      if (!removeResult.success) {
        console.warn(
          `[userService] Failed to remove user from old studio ${oldStudioId}:`,
          removeResult.error
        );
        // Continue anyway - adding to new studio is more important
      }
    }

    // Add to new studio
    const addResult = await registerUserWithStudio(userId, newStudioId);
    if (!addResult.success) {
      return {
        success: false,
        error: `Failed to register with new studio: ${addResult.error}`,
      };
    }

    // CRITICAL: Update user's default studio in their profile
    // This ensures events are created in the correct studio
    try {
      // Fetch the new studio's data to get name, city, and state
      const newStudioRef = doc(db, 'studios', newStudioId);
      const newStudioSnap = await getDoc(newStudioRef);

      if (!newStudioSnap.exists()) {
        console.error(`[userService] Studio ${newStudioId} not found`);
        return {
          success: false,
          error: 'New studio not found',
        };
      }

      const studioData = newStudioSnap.data();
      const userRef = doc(db, 'users', userId);

      await updateDoc(userRef, {
        'userdata.studios.default.studioId': newStudioId,
        'userdata.studios.default.studioName': studioData.name,
        'userdata.studios.default.studioCity': studioData.city,
        'userdata.studios.default.studioState': studioData.state,
        'userdata.lastUpdated': new Date(),
      });
      console.log(`[userService] Updated user ${userId} default studio to ${newStudioId} (${studioData.city}, ${studioData.state})`);
    } catch (updateError) {
      console.error('[userService] Failed to update user default studio:', updateError);
      return {
        success: false,
        error: 'Failed to update user default studio',
      };
    }

    console.log(
      `[userService] Successfully switched user ${userId} to studio ${newStudioId}`
    );
    return { success: true };
  } catch (error) {
    console.error(
      `[userService] Error switching user ${userId} studios:`,
      error
    );
    return { success: false, error: error.message };
  }
};
