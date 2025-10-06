// FILE: cohostInvitationsService.js - Cohost Invitation Management System

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  writeBatch,
  arrayRemove,
  increment,
} from 'firebase/firestore';
import { db } from '../../auth/services/firebase';
import {
  sendInvitation,
  acceptInvitation,
  declineInvitation
} from './unifiedInvitationsService';
// Notification imports removed - using Cloud Function triggers instead

/**
 * Send cohost invitation
 * @param {string} inviterId - User sending invitation
 * @param {string} recipientId - User receiving invitation
 * @param {string} eventId - Event ID
 * @param {Object} inviterData - Inviter user data
 * @param {Object} eventData - Event data
 * @param {string} [studioId] - Studio ID
 * @returns {Promise<Object>} Success result with invitation ID
 */
export const sendCohostInvitation = async (
  inviterId,
  recipientId,
  eventId,
  inviterData,
  eventData,
  studioId = null
) => {
  try {
    console.log('[CohostInvitations] 🎯 sendCohostInvitation called with:', {
      inviterId,
      recipientId,
      eventId,
      studioId,
      hasInviterData: !!inviterData,
      hasEventData: !!eventData
    });

    // Use unified invitation service
    const result = await sendInvitation({
      inviterId,
      recipientId,
      eventId,
      studioId,
      type: 'cohost'
    });

    console.log('[CohostInvitations] ✅ Cohost invitation created successfully');

    return result;
  } catch (error) {
    console.error(
      '[CohostInvitations] ❌ Error sending cohost invitation:',
      error
    );
    throw error;
  }
};

/**
 * Accept cohost invitation
 * @param {string} invitationId - Invitation ID (DEPRECATED - kept for backwards compatibility)
 * @param {string} recipientId - User accepting invitation
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Success result
 */
export const acceptCohostInvitation = async (
  invitationId,
  recipientId,
  eventId
) => {
  try {
    console.log('[CohostInvitations] Starting acceptance with:', {
      invitationId,
      recipientId,
      eventId,
    });

    // Get user data to find studioId from pending invitations
    const userDoc = await getDoc(doc(db, 'users', recipientId));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const pendingInvitations = userData.userdata?.pendingInvitations || [];

    // Find the invitation for this event
    const invitation = pendingInvitations.find(inv => inv.eventId === eventId && inv.type === 'cohost');

    if (!invitation) {
      throw new Error('Cohost invitation not found');
    }

    const studioId = invitation.studioId;

    // Use unified invitation service
    const result = await acceptInvitation(recipientId, eventId, studioId);

    // Cancel any existing scheduled notifications for this user/event
    try {
      const { ScheduledNotificationService } = await import('../../scheduledNotifications');
      await ScheduledNotificationService.cancelUserEventNotifications(
        recipientId,
        eventId,
        'User became cohost - notification preferences may change'
      );
      console.log('[CohostInvitations] Cancelled existing scheduled notifications for new cohost');
    } catch (error) {
      console.warn('[CohostInvitations] Failed to cancel scheduled notifications:', error);
      // Don't fail the whole operation for this
    }

    console.log('[CohostInvitations] ✅ Cohost invitation accepted successfully');

    return {
      success: true,
      newCohost: {
        id: recipientId,
        eventId,
      }
    };
  } catch (error) {
    console.error(
      '[CohostInvitations] Error accepting cohost invitation:',
      error
    );
    throw error;
  }
};

/**
 * Decline cohost invitation
 * @param {string} invitationId - Invitation ID (DEPRECATED - kept for backwards compatibility)
 * @param {string} recipientId - User declining invitation
 * @param {string} eventId - Event ID (optional - will be looked up from invitationId)
 * @returns {Promise<Object>} Success result
 */
export const declineCohostInvitation = async (invitationId, recipientId, eventId = null) => {
  try {
    // Get user data to find the invitation
    const userDoc = await getDoc(doc(db, 'users', recipientId));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const pendingInvitations = userData.userdata?.pendingInvitations || [];

    // Find cohost invitation - use eventId if provided, otherwise find any cohost invitation
    const invitation = eventId
      ? pendingInvitations.find(inv => inv.eventId === eventId && inv.type === 'cohost')
      : pendingInvitations.find(inv => inv.type === 'cohost');

    if (!invitation) {
      throw new Error('Cohost invitation not found');
    }

    const studioId = invitation.studioId;
    const actualEventId = invitation.eventId;

    // Use unified invitation service
    await declineInvitation(recipientId, actualEventId, studioId);

    console.log('[CohostInvitations] ✅ Cohost invitation declined successfully');

    return { success: true };
  } catch (error) {
    console.error(
      '[CohostInvitations] Error declining cohost invitation:',
      error
    );
    throw error;
  }
};

/**
 * Leave cohost role (for accepted cohosts who want to step down)
 * @param {string} userId - User leaving cohost role
 * @param {string} eventId - Event ID
 * @param {string} studioId - Studio ID
 * @returns {Promise<Object>} Success result
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
        leftAt: Timestamp.now(),
      });
    }

    await batch.commit();

    console.log(
      `[CohostInvitations] User ${userId} left cohost role for event ${eventId}`
    );
    return { success: true };
  } catch (error) {
    console.error('[CohostInvitations] Error leaving cohost role:', error);
    throw error;
  }
};

/**
 * Remove cohost from event (for event creators to remove cohosts)
 * @param {string} eventCreatorId - Event creator user ID
 * @param {string} cohostUserId - Cohost user ID to remove
 * @param {string} eventId - Event ID
 * @param {string} studioId - Studio ID
 * @returns {Promise<Object>} Success result
 */
export const removeCohostFromEvent = async (
  eventCreatorId,
  cohostUserId,
  eventId,
  studioId
) => {
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

    const batch = writeBatch(db);

    // Remove user from event cohosts array
    batch.update(eventRef, {
      cohosts: arrayRemove(cohostUserId),
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
        removedBy: eventCreatorId,
      });
    }

    await batch.commit();

    console.log(
      `[CohostInvitations] Event creator ${eventCreatorId} removed cohost ${cohostUserId} from event ${eventId}`
    );
    return { success: true };
  } catch (error) {
    console.error(
      '[CohostInvitations] Error removing cohost from event:',
      error
    );
    throw error;
  }
};

/**
 * Get cohost invitation status for a user and event
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @returns {Promise<Object|null>} Invitation data or null
 */
export const getCohostInvitationStatus = async (userId, eventId) => {
  try {
    const invitationsQuery = query(
      collection(db, 'users', userId, 'cohostInvitations'),
      where('eventId', '==', eventId)
    );
    const snapshot = await getDocs(invitationsQuery);

    if (snapshot.empty) {
      return null;
    }

    // Return the most recent invitation
    const invitations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort by creation date, most recent first
    invitations.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
    return invitations[0];
  } catch (error) {
    console.error(
      '[CohostInvitations] Error getting cohost invitation status:',
      error
    );
    return null;
  }
};

export default {
  sendCohostInvitation,
  acceptCohostInvitation,
  declineCohostInvitation,
  leaveCohostRole,
  removeCohostFromEvent,
  getCohostInvitationStatus,
};
