// FILE: services/shared/unifiedInvitationsService.js
// Unified invitation system for both guest and cohost invitations

import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../auth/services/firebase';

/**
 * Send invitation (guest or cohost)
 * @param {Object} params
 * @param {string} params.inviterId - User sending invitation
 * @param {string} params.recipientId - User receiving invitation
 * @param {string} params.eventId - Event ID
 * @param {string} params.studioId - Studio ID
 * @param {'guest' | 'cohost'} params.type - Type of invitation
 * @returns {Promise<Object>} Success result
 */
export const sendInvitation = async ({
  inviterId,
  recipientId,
  eventId,
  studioId,
  type, // 'guest' or 'cohost'
}) => {
  try {
    console.log('[UnifiedInvitations] Sending invitation:', {
      inviterId,
      recipientId,
      eventId,
      studioId,
      type,
    });

    // Validate inputs
    if (!inviterId || !recipientId || !eventId || !studioId || !type) {
      throw new Error('All parameters are required');
    }

    if (type !== 'guest' && type !== 'cohost') {
      throw new Error('Type must be "guest" or "cohost"');
    }

    // Check if user is already invited, subscribed, or cohost
    const eventRef = doc(db, 'studios', studioId, 'events', eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      throw new Error('Event not found');
    }

    const eventData = eventDoc.data();
    const invitations = eventData.invitations || [];
    const subscribers = eventData.subscribers || [];
    const cohosts = eventData.cohosts || [];

    // Check if already invited
    const existingInvitation = invitations.find(
      (inv) => inv.userId === recipientId
    );
    if (existingInvitation) {
      throw new Error(
        `User already has a pending ${existingInvitation.type} invitation`
      );
    }

    // Check if already subscribed or cohost
    if (subscribers.includes(recipientId)) {
      throw new Error('User is already attending this event');
    }
    if (cohosts.includes(recipientId)) {
      throw new Error('User is already a cohost of this event');
    }

    // Create invitation objects (minimal - just type and IDs)
    const eventInvitation = {
      userId: recipientId,
      type,
    };

    const userInvitation = {
      eventId,
      type,
      studioId,
    };

    // Use batch to update both event and user atomically
    const batch = writeBatch(db);

    // Add to event.invitations[]
    batch.update(eventRef, {
      invitations: arrayUnion(eventInvitation),
    });

    // Add to user.userdata.pendingInvitations[]
    const userRef = doc(db, 'users', recipientId);
    batch.update(userRef, {
      'userdata.pendingInvitations': arrayUnion(userInvitation),
    });

    await batch.commit();

    console.log('[UnifiedInvitations] ✅ Invitation sent successfully');

    return {
      success: true,
      invitation: {
        ...eventInvitation,
        eventId,
        studioId,
      },
    };
  } catch (error) {
    console.error('[UnifiedInvitations] ❌ Error sending invitation:', error);
    throw error;
  }
};

/**
 * Accept invitation (guest or cohost)
 * @param {string} userId - User accepting the invitation
 * @param {string} eventId - Event ID
 * @param {string} studioId - Studio ID
 * @returns {Promise<Object>} Success result with invitation type
 */
export const acceptInvitation = async (userId, eventId, studioId) => {
  try {
    console.log('[UnifiedInvitations] Accepting invitation:', {
      userId,
      eventId,
      studioId,
    });

    // Get event data to find the invitation
    const eventRef = doc(db, 'studios', studioId, 'events', eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      throw new Error('Event not found');
    }

    const eventData = eventDoc.data();
    const invitations = eventData.invitations || [];

    // Find user's invitation
    const invitation = invitations.find((inv) => inv.userId === userId);

    if (!invitation) {
      throw new Error('No pending invitation found for this user');
    }

    const invitationType = invitation.type; // 'guest' or 'cohost'

    // Get user data to find the invitation
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const pendingInvitations = userData.userdata?.pendingInvitations || [];

    // Find matching user invitation
    const userInvitation = pendingInvitations.find(
      (inv) => inv.eventId === eventId
    );

    if (!userInvitation) {
      throw new Error('No pending invitation found in user data');
    }

    // Use batch to update atomically
    const batch = writeBatch(db);

    // Remove from event.invitations[]
    batch.update(eventRef, {
      invitations: arrayRemove(invitation),
    });

    // Add to appropriate array based on type
    if (invitationType === 'guest') {
      batch.update(eventRef, {
        subscribers: arrayUnion(userId),
      });
    } else if (invitationType === 'cohost') {
      // Cohosts are also subscribers (attendees)
      batch.update(eventRef, {
        cohosts: arrayUnion(userId),
        subscribers: arrayUnion(userId),
      });
    }

    // Remove from user.userdata.pendingInvitations[]
    batch.update(userRef, {
      'userdata.pendingInvitations': arrayRemove(userInvitation),
    });

    // Add to appropriate user array based on type
    if (invitationType === 'guest') {
      batch.update(userRef, {
        'userdata.subscribedEvents': arrayUnion(eventId),
      });
    } else if (invitationType === 'cohost') {
      // Cohosts are also subscribers (attendees)
      batch.update(userRef, {
        'userdata.cohostEvents': arrayUnion(eventId),
        'userdata.subscribedEvents': arrayUnion(eventId),
      });
    }

    await batch.commit();

    console.log('[UnifiedInvitations] ✅ Invitation accepted successfully');

    return {
      success: true,
      type: invitationType,
    };
  } catch (error) {
    console.error('[UnifiedInvitations] ❌ Error accepting invitation:', error);
    throw error;
  }
};

/**
 * Decline invitation (guest or cohost)
 * @param {string} userId - User declining the invitation
 * @param {string} eventId - Event ID
 * @param {string} studioId - Studio ID
 * @returns {Promise<Object>} Success result
 */
export const declineInvitation = async (userId, eventId, studioId) => {
  try {
    console.log('[UnifiedInvitations] Declining invitation:', {
      userId,
      eventId,
      studioId,
    });

    // Get event data to find the invitation
    const eventRef = doc(db, 'studios', studioId, 'events', eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      throw new Error('Event not found');
    }

    const eventData = eventDoc.data();
    const invitations = eventData.invitations || [];

    // Find user's invitation
    const invitation = invitations.find((inv) => inv.userId === userId);

    if (!invitation) {
      throw new Error('No pending invitation found for this user');
    }

    // Get user data to find the invitation
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const pendingInvitations = userData.userdata?.pendingInvitations || [];

    // Find matching user invitation
    const userInvitation = pendingInvitations.find(
      (inv) => inv.eventId === eventId
    );

    if (!userInvitation) {
      throw new Error('No pending invitation found in user data');
    }

    // Use batch to update atomically
    const batch = writeBatch(db);

    // Remove from event.invitations[]
    batch.update(eventRef, {
      invitations: arrayRemove(invitation),
    });

    // Remove from user.userdata.pendingInvitations[]
    batch.update(userRef, {
      'userdata.pendingInvitations': arrayRemove(userInvitation),
    });

    await batch.commit();

    console.log('[UnifiedInvitations] ✅ Invitation declined successfully');

    return {
      success: true,
      type: invitation.type,
    };
  } catch (error) {
    console.error('[UnifiedInvitations] ❌ Error declining invitation:', error);
    throw error;
  }
};

/**
 * Get user's pending invitations
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of pending invitations with type
 */
export const getPendingInvitations = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return [];
    }

    const userData = userDoc.data();
    return userData.userdata?.pendingInvitations || [];
  } catch (error) {
    console.error('[UnifiedInvitations] Error getting pending invitations:', error);
    return [];
  }
};

/**
 * Check if user has pending invitation for event
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @returns {Promise<Object|null>} Invitation object or null
 */
export const checkPendingInvitation = async (userId, eventId) => {
  try {
    const invitations = await getPendingInvitations(userId);
    return invitations.find((inv) => inv.eventId === eventId) || null;
  } catch (error) {
    console.error('[UnifiedInvitations] Error checking pending invitation:', error);
    return null;
  }
};
