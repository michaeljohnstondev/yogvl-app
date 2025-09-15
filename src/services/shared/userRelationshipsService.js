// FILE: userRelationshipsService.js - User Relationship Management System

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
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../auth/services/firebase';
import { notifyFriendRequestAccepted } from './socialNotificationsService';

/**
 * Accept a friend request
 * @param {string} requestId - Friend request ID
 * @param {string} recipientId - User accepting the request
 * @param {string} senderId - User who sent the request
 * @returns {Promise<Object>} Success result
 */
export const acceptFriendRequest = async (requestId, recipientId, senderId) => {
  try {
    const batch = writeBatch(db);

    // Get friend request
    const requestRef = doc(
      db,
      'users',
      recipientId,
      'friendRequests',
      requestId
    );
    const requestDoc = await getDoc(requestRef);

    if (!requestDoc.exists()) {
      throw new Error('Friend request not found');
    }

    const requestData = requestDoc.data();
    if (requestData.status !== 'pending') {
      throw new Error('Friend request is no longer pending');
    }

    // Get user data for notifications
    const recipientDoc = await getDoc(doc(db, 'users', recipientId));
    const senderDoc = await getDoc(doc(db, 'users', senderId));

    if (!recipientDoc.exists() || !senderDoc.exists()) {
      throw new Error('User data not found');
    }

    const recipientData = recipientDoc.data();
    const senderData = senderDoc.data();
    const accepterName =
      recipientData?.userdata?.firstName ||
      recipientData?.userdata?.contactInfo?.displayName ||
      'Someone';

    // Update friend request status
    batch.update(requestRef, {
      status: 'accepted',
      acceptedAt: Timestamp.now(),
    });

    // Add each other as friends in their friends subcollections
    const friend1Ref = doc(db, 'users', recipientId, 'friends', senderId);
    const friend2Ref = doc(db, 'users', senderId, 'friends', recipientId);

    batch.set(friend1Ref, {
      userId: senderId,
      friendSince: Timestamp.now(),
      userData: {
        firstName: senderData?.userdata?.firstName,
        displayName: senderData?.userdata?.contactInfo?.displayName,
        email: senderData?.email,
      },
    });

    batch.set(friend2Ref, {
      userId: recipientId,
      friendSince: Timestamp.now(),
      userData: {
        firstName: recipientData?.userdata?.firstName,
        displayName: recipientData?.userdata?.contactInfo?.displayName,
        email: recipientData?.email,
      },
    });

    await batch.commit();

    // Send notification to original sender
    await notifyFriendRequestAccepted({
      requesterId: senderId,
      accepterId: recipientId,
      accepterName,
    });

    return { success: true };
  } catch (error) {
    console.error('[UserRelationships] Error accepting friend request:', error);
    throw error;
  }
};

/**
 * Decline a friend request
 * @param {string} requestId - Friend request ID
 * @param {string} recipientId - User declining the request
 * @returns {Promise<Object>} Success result
 */
export const declineFriendRequest = async (requestId, recipientId) => {
  try {
    const requestRef = doc(
      db,
      'users',
      recipientId,
      'friendRequests',
      requestId
    );

    await updateDoc(requestRef, {
      status: 'declined',
      declinedAt: Timestamp.now(),
    });

    return { success: true };
  } catch (error) {
    console.error('[UserRelationships] Error declining friend request:', error);
    throw error;
  }
};

/**
 * Get friend request status between two users
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @returns {Promise<Object|null>} Friend status or null
 */
export const getFriendRequestStatus = async (userId1, userId2) => {
  try {
    // Check if there's a pending request from userId1 to userId2
    const request1Query = query(
      collection(db, 'users', userId2, 'friendRequests'),
      where('senderId', '==', userId1),
      where('status', '==', 'pending')
    );
    const request1Snapshot = await getDocs(request1Query);

    if (!request1Snapshot.empty) {
      return { type: 'sent', data: request1Snapshot.docs[0].data() };
    }

    // Check if there's a pending request from userId2 to userId1
    const request2Query = query(
      collection(db, 'users', userId1, 'friendRequests'),
      where('senderId', '==', userId2),
      where('status', '==', 'pending')
    );
    const request2Snapshot = await getDocs(request2Query);

    if (!request2Snapshot.empty) {
      return { type: 'received', data: request2Snapshot.docs[0].data() };
    }

    // Check if they're already friends
    const friendDoc = await getDoc(
      doc(db, 'users', userId1, 'friends', userId2)
    );
    if (friendDoc.exists()) {
      return { type: 'friends', data: friendDoc.data() };
    }

    return null;
  } catch (error) {
    console.error('[UserRelationships] Error checking friend request status:', error);
    return null;
  }
};

/**
 * Add user to favorites
 * @param {string} currentUserId - User adding to favorites
 * @param {string} targetUserId - User being favorited
 * @returns {Promise<Object>} Success result
 */
export const addToFavorites = async (currentUserId, targetUserId) => {
  try {
    if (currentUserId === targetUserId) {
      throw new Error('Cannot favorite yourself');
    }

    const favoriteRef = doc(db, 'users', currentUserId, 'favorites', targetUserId);

    // Get target user data for caching
    const targetUserDoc = await getDoc(doc(db, 'users', targetUserId));
    if (!targetUserDoc.exists()) {
      throw new Error('Target user not found');
    }

    const targetUserData = targetUserDoc.data();

    await setDoc(favoriteRef, {
      userId: targetUserId,
      favoritedAt: Timestamp.now(),
      userData: {
        firstName: targetUserData?.userdata?.contactInfo?.firstName || '',
        lastName: targetUserData?.userdata?.contactInfo?.lastName || '',
        displayName: targetUserData?.userdata?.contactInfo?.displayName || 'Unknown User',
        email: targetUserData?.email || null,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('[UserRelationships] Error adding to favorites:', error);
    throw error;
  }
};

/**
 * Remove user from favorites
 * @param {string} currentUserId - User removing from favorites
 * @param {string} targetUserId - User being unfavorited
 * @returns {Promise<Object>} Success result
 */
export const removeFromFavorites = async (currentUserId, targetUserId) => {
  try {
    const favoriteRef = doc(db, 'users', currentUserId, 'favorites', targetUserId);

    const favoriteDoc = await getDoc(favoriteRef);
    if (!favoriteDoc.exists()) {
      throw new Error('User is not in favorites');
    }

    await deleteDoc(favoriteRef);
    return { success: true };
  } catch (error) {
    console.error('[UserRelationships] Error removing from favorites:', error);
    throw error;
  }
};

/**
 * Check if user is in favorites
 * @param {string} currentUserId - Current user ID
 * @param {string} targetUserId - Target user ID
 * @returns {Promise<boolean>} Whether user is favorited
 */
export const checkIfFavorite = async (currentUserId, targetUserId) => {
  try {
    const favoriteRef = doc(db, 'users', currentUserId, 'favorites', targetUserId);
    const favoriteDoc = await getDoc(favoriteRef);
    return favoriteDoc.exists();
  } catch (error) {
    console.error('[UserRelationships] Error checking favorite status:', error);
    return false;
  }
};

/**
 * Remove friend relationship between two users
 * @param {string} currentUserId - User initiating removal
 * @param {string} targetUserId - User being unfriended
 * @returns {Promise<Object>} Success result
 */
export const removeFriend = async (currentUserId, targetUserId) => {
  try {
    const batch = writeBatch(db);

    // Remove friend from current user's friends
    const currentUserFriendRef = doc(db, 'users', currentUserId, 'friends', targetUserId);
    batch.delete(currentUserFriendRef);

    // Remove current user from target's friends
    const targetUserFriendRef = doc(db, 'users', targetUserId, 'friends', currentUserId);
    batch.delete(targetUserFriendRef);

    await batch.commit();

    console.log(`[UserRelationships] Removed friendship between ${currentUserId} and ${targetUserId}`);
    return { success: true };
  } catch (error) {
    console.error('[UserRelationships] Error removing friend:', error);
    throw error;
  }
};

/**
 * Clear all friendship data between two users (nuclear option)
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @returns {Promise<Object>} Success result
 */
export const clearFriendshipData = async (userId1, userId2) => {
  try {
    const batch = writeBatch(db);

    // Remove all friendship-related documents between the two users
    const friendRefs = [
      doc(db, 'users', userId1, 'friends', userId2),
      doc(db, 'users', userId2, 'friends', userId1),
      doc(db, 'users', userId1, 'favorites', userId2),
      doc(db, 'users', userId2, 'favorites', userId1),
    ];

    friendRefs.forEach(ref => batch.delete(ref));

    // Find and remove any pending friend requests
    const friendRequestQueries = [
      query(
        collection(db, 'users', userId1, 'friendRequests'),
        where('senderId', '==', userId2)
      ),
      query(
        collection(db, 'users', userId2, 'friendRequests'),
        where('senderId', '==', userId1)
      ),
    ];

    const [requests1, requests2] = await Promise.all([
      getDocs(friendRequestQueries[0]),
      getDocs(friendRequestQueries[1]),
    ]);

    requests1.forEach(doc => batch.delete(doc.ref));
    requests2.forEach(doc => batch.delete(doc.ref));

    await batch.commit();

    console.log(`[UserRelationships] Cleared all friendship data between ${userId1} and ${userId2}`);
    return { success: true };
  } catch (error) {
    console.error('[UserRelationships] Error clearing friendship data:', error);
    throw error;
  }
};

export default {
  acceptFriendRequest,
  declineFriendRequest,
  getFriendRequestStatus,
  addToFavorites,
  removeFromFavorites,
  checkIfFavorite,
  removeFriend,
  clearFriendshipData,
};