// FILE: services/friendMuteService.js - Friend Event Muting Service

import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../auth/services/firebase';

/**
 * Check if a user is friends with another user (mutual follow relationship)
 * @param {string} currentUserId - The current user's ID
 * @param {string} targetUserId - The target user's ID
 * @returns {Promise<boolean>} True if they are friends
 */
export const areFriends = async (currentUserId, targetUserId) => {
  try {
    if (!currentUserId || !targetUserId) {
      return false;
    }

    // Check if targetUserId exists in currentUser's friends subcollection
    const friendRef = doc(db, 'users', currentUserId, 'friends', targetUserId);
    const friendDoc = await getDoc(friendRef);

    return friendDoc.exists();
  } catch (error) {
    console.error('[friendMuteService] Error checking friend status:', error);
    return false;
  }
};

/**
 * Check if a friend's event notifications are muted
 * @param {string} currentUserId - The current user's ID
 * @param {string} friendUserId - The friend's user ID
 * @returns {Promise<boolean>} True if friend's events are muted
 */
export const isFriendMuted = async (currentUserId, friendUserId) => {
  try {
    if (!currentUserId || !friendUserId) {
      return false;
    }

    const userRef = doc(db, 'users', currentUserId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return false;
    }

    const mutedFriends = userDoc.data()?.userdata?.settings?.notifications?.mutedFriendsEvents || [];
    return mutedFriends.includes(friendUserId);
  } catch (error) {
    console.error('[friendMuteService] Error checking mute status:', error);
    return false;
  }
};

/**
 * Mute event notifications from a friend
 * @param {string} currentUserId - The current user's ID
 * @param {string} friendUserId - The friend's user ID to mute
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const muteFriendEvents = async (currentUserId, friendUserId) => {
  try {
    if (!currentUserId || !friendUserId) {
      return {
        success: false,
        error: 'Invalid user IDs provided',
      };
    }

    // Verify they are actually friends
    const areMutualFriends = await areFriends(currentUserId, friendUserId);
    if (!areMutualFriends) {
      return {
        success: false,
        error: 'Can only mute event notifications from friends',
      };
    }

    const userRef = doc(db, 'users', currentUserId);

    // Add friend to muted list using arrayUnion (prevents duplicates)
    await updateDoc(userRef, {
      'userdata.settings.notifications.mutedFriendsEvents': arrayUnion(friendUserId),
    });

    console.log(`[friendMuteService] ✅ Muted event notifications from ${friendUserId}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error('[friendMuteService] Error muting friend events:', error);
    return {
      success: false,
      error: error.message || 'Failed to mute friend events',
    };
  }
};

/**
 * Unmute event notifications from a friend
 * @param {string} currentUserId - The current user's ID
 * @param {string} friendUserId - The friend's user ID to unmute
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const unmuteFriendEvents = async (currentUserId, friendUserId) => {
  try {
    if (!currentUserId || !friendUserId) {
      return {
        success: false,
        error: 'Invalid user IDs provided',
      };
    }

    const userRef = doc(db, 'users', currentUserId);

    // Remove friend from muted list using arrayRemove
    await updateDoc(userRef, {
      'userdata.settings.notifications.mutedFriendsEvents': arrayRemove(friendUserId),
    });

    console.log(`[friendMuteService] ✅ Unmuted event notifications from ${friendUserId}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error('[friendMuteService] Error unmuting friend events:', error);
    return {
      success: false,
      error: error.message || 'Failed to unmute friend events',
    };
  }
};
