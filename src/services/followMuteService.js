// FILE: services/followMuteService.js - Follow-Based Event Muting Service

import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../auth/services/firebase';

/**
 * Check if current user is following another user
 * @param {string} currentUserId - The current user's ID
 * @param {string} targetUserId - The target user's ID
 * @returns {Promise<boolean>} True if currentUser is following targetUser
 */
export const isFollowing = async (currentUserId, targetUserId) => {
  try {
    if (!currentUserId || !targetUserId) {
      return false;
    }

    // Check if targetUserId exists in currentUser's following subcollection
    const followingRef = doc(db, 'users', currentUserId, 'following', targetUserId);
    const followingDoc = await getDoc(followingRef);

    return followingDoc.exists();
  } catch (error) {
    console.error('[followMuteService] Error checking following status:', error);
    return false;
  }
};

/**
 * Check if a followed user's event notifications are muted
 * @param {string} currentUserId - The current user's ID
 * @param {string} followedUserId - The followed user's ID
 * @returns {Promise<boolean>} True if followed user's events are muted
 */
export const isFollowedUserMuted = async (currentUserId, followedUserId) => {
  try {
    if (!currentUserId || !followedUserId) {
      return false;
    }

    const userRef = doc(db, 'users', currentUserId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return false;
    }

    // Support both old field name (mutedFriendsEvents) and new (mutedFollowingEvents) for backward compatibility
    const mutedFollowing =
      userDoc.data()?.userdata?.settings?.notifications?.mutedFollowingEvents ||
      userDoc.data()?.userdata?.settings?.notifications?.mutedFriendsEvents ||
      [];

    return mutedFollowing.includes(followedUserId);
  } catch (error) {
    console.error('[followMuteService] Error checking mute status:', error);
    return false;
  }
};

/**
 * Mute event notifications from a followed user
 * @param {string} currentUserId - The current user's ID
 * @param {string} followedUserId - The followed user's ID to mute
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const muteFollowedUser = async (currentUserId, followedUserId) => {
  try {
    if (!currentUserId || !followedUserId) {
      return {
        success: false,
        error: 'Invalid user IDs provided',
      };
    }

    // Verify current user is following target user
    const following = await isFollowing(currentUserId, followedUserId);
    if (!following) {
      return {
        success: false,
        error: 'You can only mute event notifications from users you follow',
      };
    }

    const userRef = doc(db, 'users', currentUserId);

    // Add to muted list using new field name (arrayUnion prevents duplicates)
    await updateDoc(userRef, {
      'userdata.settings.notifications.mutedFollowingEvents': arrayUnion(followedUserId),
    });

    console.log(`[followMuteService] ✅ Muted event notifications from ${followedUserId}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error('[followMuteService] Error muting followed user events:', error);
    return {
      success: false,
      error: error.message || 'Failed to mute event notifications',
    };
  }
};

/**
 * Unmute event notifications from a followed user
 * @param {string} currentUserId - The current user's ID
 * @param {string} followedUserId - The followed user's ID to unmute
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const unmuteFollowedUser = async (currentUserId, followedUserId) => {
  try {
    if (!currentUserId || !followedUserId) {
      return {
        success: false,
        error: 'Invalid user IDs provided',
      };
    }

    const userRef = doc(db, 'users', currentUserId);

    // Remove from muted list using new field name (also try old field for backward compatibility)
    await updateDoc(userRef, {
      'userdata.settings.notifications.mutedFollowingEvents': arrayRemove(followedUserId),
    });

    console.log(`[followMuteService] ✅ Unmuted event notifications from ${followedUserId}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error('[followMuteService] Error unmuting followed user events:', error);
    return {
      success: false,
      error: error.message || 'Failed to unmute event notifications',
    };
  }
};

// Legacy exports for backward compatibility (will be removed in future)
export const areFriends = isFollowing;
export const isFriendMuted = isFollowedUserMuted;
export const muteFriendEvents = muteFollowedUser;
export const unmuteFriendEvents = unmuteFollowedUser;
