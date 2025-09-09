// FILE: services/friendService.js

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
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';
import { 
  notifyFriendRequest, 
  notifyFriendAccepted,
  notifyCohostInvitation,
  notifyCohostAccepted,
  notifyGuestInvitation,
  notifyGuestAccepted 
} from './notifications';

// Legacy friend request function removed - using follow system now

/**
 * Accept a friend request
 */
export const acceptFriendRequest = async (requestId, recipientId, senderId) => {
  try {
    const batch = writeBatch(db);

    // Get friend request
    const requestRef = doc(db, 'users', recipientId, 'friendRequests', requestId);
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
    const accepterName = recipientData?.userdata?.firstName || recipientData?.userdata?.contactInfo?.displayName || 'Someone';

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
      }
    });

    batch.set(friend2Ref, {
      userId: recipientId,
      friendSince: Timestamp.now(),
      userData: {
        firstName: recipientData?.userdata?.firstName,
        displayName: recipientData?.userdata?.contactInfo?.displayName,
        email: recipientData?.email,
      }
    });

    await batch.commit();

    // Send notification to original sender
    await notifyFriendAccepted({
      senderId,
      accepterId: recipientId,
      accepterName,
    });

    return { success: true };
  } catch (error) {
    console.error('Error accepting friend request:', error);
    throw error;
  }
};

/**
 * Decline a friend request
 */
export const declineFriendRequest = async (requestId, recipientId) => {
  try {
    const requestRef = doc(db, 'users', recipientId, 'friendRequests', requestId);
    
    await updateDoc(requestRef, {
      status: 'declined',
      declinedAt: Timestamp.now(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error declining friend request:', error);
    throw error;
  }
};

/**
 * Get friend request status between two users
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
    const friendDoc = await getDoc(doc(db, 'users', userId1, 'friends', userId2));
    if (friendDoc.exists()) {
      return { type: 'friends', data: friendDoc.data() };
    }

    return null;
  } catch (error) {
    console.error('Error checking friend request status:', error);
    return null;
  }
};

/**
 * Send cohost invitation
 */
export const sendCohostInvitation = async (inviterId, recipientId, eventId, inviterData, eventData, studioId = null) => {
  try {
    // Check if invitation already exists
    const existingInvitation = await getCohostInvitationStatus(recipientId, eventId);
    if (existingInvitation) {
      throw new Error('Cohost invitation already exists');
    }

    // Get recipient data for notification
    const recipientDoc = await getDoc(doc(db, 'users', recipientId));
    if (!recipientDoc.exists()) {
      throw new Error('Recipient user not found');
    }

    const inviterName = inviterData?.userdata?.contactInfo?.firstName || inviterData?.userdata?.contactInfo?.displayName || 'Someone';
    const eventTitle = eventData?.title || 'Untitled Event';

    // Create cohost invitation document
    const invitationId = `${inviterId}_${recipientId}_${eventId}_${Date.now()}`;
    const invitationRef = doc(db, 'users', recipientId, 'cohostInvitations', invitationId);
    
    const invitation = {
      id: invitationId,
      inviterId,
      recipientId,
      eventId,
      studioId: studioId || null,
      status: 'pending',
      createdAt: Timestamp.now(),
      inviterData: {
        firstName: inviterData?.userdata?.contactInfo?.firstName || 'Unknown',
        displayName: inviterData?.userdata?.contactInfo?.displayName || 
          `${inviterData?.userdata?.contactInfo?.firstName || ''} ${inviterData?.userdata?.contactInfo?.lastName || ''}`.trim() || 'Unknown',
        email: inviterData?.userdata?.contactInfo?.email || null,
      },
      eventData: {
        title: eventData?.title || null,
        date: eventData?.date || null,
        location: eventData?.location || null,
      }
    };

    await setDoc(invitationRef, invitation);

    // Send in-app notification
    await notifyCohostInvitation({
      recipientId,
      inviterId,
      inviterName,
      eventId,
      eventTitle,
      invitationId,
    });

    return { success: true, invitationId };
  } catch (error) {
    console.error('Error sending cohost invitation:', error);
    throw error;
  }
};

/**
 * Accept cohost invitation
 */
export const acceptCohostInvitation = async (invitationId, recipientId, eventId) => {
  try {
    console.log('[acceptCohostInvitation] Starting with:', { invitationId, recipientId, eventId });
    const batch = writeBatch(db);

    // Get invitation
    const invitationRef = doc(db, 'users', recipientId, 'cohostInvitations', invitationId);
    const invitationDoc = await getDoc(invitationRef);
    
    if (!invitationDoc.exists()) {
      throw new Error('Cohost invitation not found');
    }

    const invitationData = invitationDoc.data();
    if (invitationData.status !== 'pending') {
      throw new Error('Cohost invitation is no longer pending');
    }

    // Get studioId from invitation
    const studioId = invitationData.studioId;
    if (!studioId) {
      throw new Error('Studio information missing from invitation');
    }

    // Get user data for notifications
    const recipientDoc = await getDoc(doc(db, 'users', recipientId));
    const inviterDoc = await getDoc(doc(db, 'users', invitationData.inviterId));
    const eventDoc = await getDoc(doc(db, 'studios', studioId, 'events', eventId));
    
    if (!recipientDoc.exists() || !inviterDoc.exists() || !eventDoc.exists()) {
      throw new Error('Required data not found');
    }

    const recipientData = recipientDoc.data();
    const eventData = eventDoc.data();
    
    console.log('[acceptCohostInvitation] Recipient data structure:', JSON.stringify(recipientData, null, 2));
    
    // Extract user's full name (prioritize displayName which is set in ContactInfoScreen)
    const displayName = recipientData?.userdata?.contactInfo?.displayName || '';
    const firstName = recipientData?.userdata?.contactInfo?.firstName || '';
    const lastName = recipientData?.userdata?.contactInfo?.lastName || '';
    
    const accepterName = displayName || 
                        (firstName && lastName ? `${firstName} ${lastName}` : firstName) || 
                        'Someone';
    const eventTitle = eventData?.title || 'Untitled Event';
    
    console.log('[acceptCohostInvitation] Extracted accepter name:', accepterName);

    // Update invitation status
    batch.update(invitationRef, {
      status: 'accepted',
      acceptedAt: Timestamp.now(),
    });

    // Add user as cohost to event
    const eventRef = doc(db, 'studios', studioId, 'events', eventId);
    
    // Ensure cohosts and subscribers are always arrays
    const existingCohosts = Array.isArray(eventData.cohosts) ? eventData.cohosts : [];
    const existingSubscribers = Array.isArray(eventData.subscribers) ? eventData.subscribers : [];
    
    // Check if user is already a cohost
    if (existingCohosts.includes(recipientId)) {
      throw new Error('User is already a co-host for this event');
    }
    
    // Add to both cohosts and subscribers arrays (cohosts are also attendees)
    const updatedSubscribers = existingSubscribers.includes(recipientId) 
      ? existingSubscribers 
      : [...existingSubscribers, recipientId];
    
    batch.update(eventRef, {
      cohosts: [...existingCohosts, recipientId],
      subscribers: updatedSubscribers,
      subscriberCount: updatedSubscribers.length,
    });

    await batch.commit();

    // Send notification to original inviter
    await notifyCohostAccepted({
      inviterId: invitationData.inviterId,
      accepterId: recipientId,
      accepterName: accepterName || 'Someone',
      eventId,
      eventTitle: eventTitle || 'Unknown Event',
    });

    return { success: true };
  } catch (error) {
    console.error('Error accepting cohost invitation:', error);
    throw error;
  }
};

/**
 * Decline cohost invitation
 */
export const declineCohostInvitation = async (invitationId, recipientId) => {
  try {
    const invitationRef = doc(db, 'users', recipientId, 'cohostInvitations', invitationId);
    
    await updateDoc(invitationRef, {
      status: 'declined',
      declinedAt: Timestamp.now(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error declining cohost invitation:', error);
    throw error;
  }
};

/**
 * Leave cohost role (for accepted cohosts who want to step down)
 */
export const leaveCohostRole = async (userId, eventId, studioId) => {
  try {
    const batch = writeBatch(db);
    
    // Remove user from event cohosts array and subscribers array
    const eventRef = doc(db, 'studios', studioId, 'events', eventId);
    batch.update(eventRef, {
      cohosts: arrayRemove(userId),
      subscribers: arrayRemove(userId),
      subscriberCount: increment(-1),
    });
    
    // Update invitation status to 'left' for audit trail
    const invitationsQuery = query(
      collection(db, 'users', userId, 'cohostInvitations'),
      where('eventId', '==', eventId),
      where('status', '==', 'accepted')
    );
    const invitationsSnap = await getDocs(invitationsQuery);
    
    if (!invitationsSnap.empty) {
      const invitationDoc = invitationsSnap.docs[0];
      batch.update(invitationDoc.ref, {
        status: 'left',
        leftAt: Timestamp.now()
      });
    }
    
    await batch.commit();
    
    console.log(`[leaveCohostRole] User ${userId} left cohost role for event ${eventId}`);
    return { success: true };
    
  } catch (error) {
    console.error('Error leaving cohost role:', error);
    throw error;
  }
};

/**
 * Remove cohost from event (for event creators to remove cohosts)
 */
export const removeCohostFromEvent = async (eventCreatorId, cohostUserId, eventId, studioId) => {
  try {
    // Verify the person removing is the event creator
    const eventRef = doc(db, 'studios', studioId, 'events', eventId);
    const eventSnap = await getDoc(eventRef);
    
    if (!eventSnap.exists()) {
      throw new Error('Event not found');
    }
    
    const eventData = eventSnap.data();
    if (eventData.createdBy !== eventCreatorId) {
      throw new Error('Only event creator can remove cohosts');
    }
    
    if (!eventData.cohosts?.includes(cohostUserId)) {
      throw new Error('User is not a cohost of this event');
    }
    
    const batch = writeBatch(db);
    
    // Remove user from event cohosts array
    batch.update(eventRef, {
      cohosts: arrayRemove(cohostUserId)
    });
    
    // Update invitation status to 'removed' for audit trail
    const invitationsQuery = query(
      collection(db, 'users', cohostUserId, 'cohostInvitations'),
      where('eventId', '==', eventId),
      where('status', '==', 'accepted')
    );
    const invitationsSnap = await getDocs(invitationsQuery);
    
    if (!invitationsSnap.empty) {
      const invitationDoc = invitationsSnap.docs[0];
      batch.update(invitationDoc.ref, {
        status: 'removed',
        removedAt: Timestamp.now(),
        removedBy: eventCreatorId
      });
    }
    
    await batch.commit();
    
    console.log(`[removeCohostFromEvent] Creator ${eventCreatorId} removed cohost ${cohostUserId} from event ${eventId}`);
    return { success: true };
    
  } catch (error) {
    console.error('Error removing cohost from event:', error);
    throw error;
  }
};

/**
 * Send guest invitation
 */
export const sendGuestInvitation = async (inviterId, recipientId, eventId, inviterData, eventData, source = 'unknown') => {
  try {
    // Check if invitation already exists
    const existingInvitation = await getGuestInvitationStatus(recipientId, eventId);
    if (existingInvitation) {
      throw new Error('Guest invitation already exists');
    }

    // Get recipient data for notification
    const recipientDoc = await getDoc(doc(db, 'users', recipientId));
    if (!recipientDoc.exists()) {
      throw new Error('Recipient user not found');
    }

    const inviterName = inviterData?.userdata?.contactInfo?.firstName || inviterData?.userdata?.contactInfo?.displayName || 'Someone';
    const eventTitle = eventData?.title || 'Untitled Event';

    // Create guest invitation document
    const invitationId = `${inviterId}_${recipientId}_${eventId}_${Date.now()}`;
    const invitationRef = doc(db, 'users', recipientId, 'guestInvitations', invitationId);
    
    const invitation = {
      id: invitationId,
      inviterId,
      recipientId,
      eventId,
      status: 'pending',
      createdAt: Timestamp.now(),
      inviterData: {
        firstName: inviterData?.userdata?.contactInfo?.firstName || 'Unknown',
        displayName: inviterData?.userdata?.contactInfo?.displayName || 
          `${inviterData?.userdata?.contactInfo?.firstName || ''} ${inviterData?.userdata?.contactInfo?.lastName || ''}`.trim() || 'Unknown',
        email: inviterData?.userdata?.contactInfo?.email || null,
      },
      eventData: {
        title: eventData?.title || null,
        date: eventData?.date || null,
        location: eventData?.location || null,
      }
    };

    await setDoc(invitationRef, invitation);

    // Send in-app notification
    await notifyGuestInvitation({
      recipientId,
      inviterId,
      inviterName,
      eventId,
      eventTitle,
      invitationId,
      source,
    });

    return { success: true, invitationId };
  } catch (error) {
    console.error('Error sending guest invitation:', error);
    throw error;
  }
};

/**
 * Accept guest invitation (subscribe to event)
 */
export const acceptGuestInvitation = async (invitationId, recipientId, eventId) => {
  try {
    const batch = writeBatch(db);

    // Get invitation
    const invitationRef = doc(db, 'users', recipientId, 'guestInvitations', invitationId);
    const invitationDoc = await getDoc(invitationRef);
    
    if (!invitationDoc.exists()) {
      throw new Error('Guest invitation not found');
    }

    const invitationData = invitationDoc.data();
    if (invitationData.status !== 'pending') {
      throw new Error('Guest invitation is no longer pending');
    }

    // Get user data for notifications
    const recipientDoc = await getDoc(doc(db, 'users', recipientId));
    const inviterDoc = await getDoc(doc(db, 'users', invitationData.inviterId));
    
    if (!recipientDoc.exists() || !inviterDoc.exists()) {
      throw new Error('Required data not found');
    }

    const recipientData = recipientDoc.data();
    const accepterName = recipientData?.userdata?.contactInfo?.firstName || recipientData?.userdata?.contactInfo?.displayName || 'Someone';

    // Update invitation status
    batch.update(invitationRef, {
      status: 'accepted',
      acceptedAt: Timestamp.now(),
    });

    // Subscribe user to event
    const subscriptionRef = doc(db, 'users', recipientId, 'subscriptions', eventId);
    batch.set(subscriptionRef, {
      eventId,
      subscribedAt: Timestamp.now(),
      invitedBy: invitationData.inviterId,
    });

    await batch.commit();

    // Send notification to original inviter
    await notifyGuestAccepted({
      inviterId: invitationData.inviterId,
      accepterId: recipientId,
      accepterName,
      eventId,
      eventTitle: invitationData.eventData.title || 'Untitled Event',
    });

    return { success: true };
  } catch (error) {
    console.error('Error accepting guest invitation:', error);
    throw error;
  }
};

/**
 * Decline guest invitation
 */
export const declineGuestInvitation = async (invitationId, recipientId) => {
  try {
    const invitationRef = doc(db, 'users', recipientId, 'guestInvitations', invitationId);
    
    await updateDoc(invitationRef, {
      status: 'declined',
      declinedAt: Timestamp.now(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error declining guest invitation:', error);
    throw error;
  }
};

/**
 * Get guest invitation status for user and event
 */
export const getGuestInvitationStatus = async (recipientId, eventId) => {
  try {
    const invitationQuery = query(
      collection(db, 'users', recipientId, 'guestInvitations'),
      where('eventId', '==', eventId),
      where('status', '==', 'pending')
    );
    
    const invitationSnapshot = await getDocs(invitationQuery);
    
    if (!invitationSnapshot.empty) {
      return invitationSnapshot.docs[0].data();
    }
    
    return null;
  } catch (error) {
    console.error('Error checking guest invitation status:', error);
    return null;
  }
};

/**
 * Get cohost invitation status for user and event
 */
export const getCohostInvitationStatus = async (userId, eventId) => {
  try {
    const invitationQuery = query(
      collection(db, 'users', userId, 'cohostInvitations'),
      where('eventId', '==', eventId),
      where('status', '==', 'pending')
    );
    const invitationSnapshot = await getDocs(invitationQuery);

    if (!invitationSnapshot.empty) {
      return invitationSnapshot.docs[0].data();
    }

    return null;
  } catch (error) {
    console.error('Error checking cohost invitation status:', error);
    return null;
  }
};

/**
 * Add user to favorites
 */
export const addToFavorites = async (currentUserId, targetUserId) => {
  try {
    const favoriteRef = doc(db, 'users', currentUserId, 'favorites', targetUserId);
    await setDoc(favoriteRef, {
      userId: targetUserId,
      addedAt: Timestamp.now(),
    });
    
    console.log(`Added user ${targetUserId} to favorites for ${currentUserId}`);
    return { success: true };
  } catch (error) {
    console.error('Error adding to favorites:', error);
    throw error;
  }
};

/**
 * Remove user from favorites
 */
export const removeFromFavorites = async (currentUserId, targetUserId) => {
  try {
    const favoriteRef = doc(db, 'users', currentUserId, 'favorites', targetUserId);
    await deleteDoc(favoriteRef);
    
    console.log(`Removed user ${targetUserId} from favorites for ${currentUserId}`);
    return { success: true };
  } catch (error) {
    console.error('Error removing from favorites:', error);
    throw error;
  }
};

/**
 * Check if user is in favorites
 */
export const checkIfFavorite = async (currentUserId, targetUserId) => {
  try {
    const favoriteRef = doc(db, 'users', currentUserId, 'favorites', targetUserId);
    const favoriteDoc = await getDoc(favoriteRef);
    return favoriteDoc.exists();
  } catch (error) {
    console.error('Error checking favorite status:', error);
    return false;
  }
};

/**
 * Remove friend relationship (both directions)
 */
export const removeFriend = async (currentUserId, targetUserId) => {
  try {
    const batch = writeBatch(db);
    
    // Remove from current user's friends
    const friendRef1 = doc(db, 'users', currentUserId, 'friends', targetUserId);
    batch.delete(friendRef1);
    
    // Remove from target user's friends
    const friendRef2 = doc(db, 'users', targetUserId, 'friends', currentUserId);
    batch.delete(friendRef2);
    
    // Also remove from favorites if they exist
    const favoriteRef1 = doc(db, 'users', currentUserId, 'favorites', targetUserId);
    const favoriteRef2 = doc(db, 'users', targetUserId, 'favorites', currentUserId);
    batch.delete(favoriteRef1);
    batch.delete(favoriteRef2);
    
    await batch.commit();
    
    console.log(`Removed friendship between ${currentUserId} and ${targetUserId}`);
    return { success: true };
  } catch (error) {
    console.error('Error removing friend:', error);
    throw error;
  }
};

/**
 * Clear all friend-related data between two users (debug/cleanup function)
 */
export const clearFriendshipData = async (userId1, userId2) => {
  try {
    const batch = writeBatch(db);
    
    // Remove any pending friend requests in both directions
    const request1Query = query(
      collection(db, 'users', userId2, 'friendRequests'),
      where('senderId', '==', userId1)
    );
    const request1Snapshot = await getDocs(request1Query);
    request1Snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    const request2Query = query(
      collection(db, 'users', userId1, 'friendRequests'),
      where('senderId', '==', userId2)
    );
    const request2Snapshot = await getDocs(request2Query);
    request2Snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Remove friendship documents
    const friendRef1 = doc(db, 'users', userId1, 'friends', userId2);
    const friendRef2 = doc(db, 'users', userId2, 'friends', userId1);
    batch.delete(friendRef1);
    batch.delete(friendRef2);
    
    // Remove favorites
    const favoriteRef1 = doc(db, 'users', userId1, 'favorites', userId2);
    const favoriteRef2 = doc(db, 'users', userId2, 'favorites', userId1);
    batch.delete(favoriteRef1);
    batch.delete(favoriteRef2);
    
    await batch.commit();
    
    console.log(`Cleared all friendship data between ${userId1} and ${userId2}`);
    return { success: true };
  } catch (error) {
    console.error('Error clearing friendship data:', error);
    throw error;
  }
};