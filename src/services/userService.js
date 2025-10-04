// FILE: services/userService.js - User Data Service for Friend/User Management

import {
  getDoc,
  doc,
  updateDoc,
  setDoc,
  arrayUnion,
  arrayRemove,
} from '../lib/firebase';
import { db } from '../auth/services/firebase';

/**
 * Get all app users from the same studio as current user
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

    // Check follow relationships and favorites for each user
    try {
      const { checkIfFollowing } = await import('./followService');
      const { checkIfFavorite } = await import('./friendService');

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

    // Sort by first name
    users.sort((a, b) => a.firstName.localeCompare(b.firstName));

    console.log(
      `[userService] Found ${users.length} studio users with follow status`
    );
    return users;
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
