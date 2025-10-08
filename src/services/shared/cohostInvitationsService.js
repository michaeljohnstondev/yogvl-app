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

    // Validate critical parameters
    if (!studioId) {
      console.error('[CohostInvitations] ❌ CRITICAL: studioId is missing!', {
        inviterId,
        recipientId,
        eventId,
        studioId,
      });
      throw new Error('studioId is required for cohost invitations');
    }

    if (!inviterId || !recipientId || !eventId) {
      console.error('[CohostInvitations] ❌ CRITICAL: Missing required parameters!', {
        hasInviterId: !!inviterId,
        hasRecipientId: !!recipientId,
        hasEventId: !!eventId,
        hasStudioId: !!studioId,
      });
      throw new Error('inviterId, recipientId, eventId, and studioId are all required');
    }

    console.log('[CohostInvitations] 📞 Calling unifiedInvitationsService.sendInvitation with:', {
      inviterId,
      recipientId,
      eventId,
      studioId,
      type: 'cohost',
    });

    // Use unified invitation service
    const result = await sendInvitation({
      inviterId,
      recipientId,
      eventId,
      studioId,
      type: 'cohost'
    });

    console.log('[CohostInvitations] ✅ Cohost invitation created successfully:', {
      result,
      recipientId,
      eventId,
    });

    return result;
  } catch (error) {
    console.error(
      '[CohostInvitations] ❌ Error sending cohost invitation:',
      {
        error: error.message,
        stack: error.stack,
        inviterId,
        recipientId,
        eventId,
        studioId,
      }
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
      const { ScheduledNotificationService } = await import('../scheduledNotifications');
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
 * Uses the unified invitation system (userdata.pendingInvitations)
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @returns {Promise<Object|null>} Invitation data or null
 */
export const getCohostInvitationStatus = async (userId, eventId) => {
  try {
    console.log('[CohostInvitations] 🔍 Checking cohost invitation status:', { userId, eventId });

    // Get user document to check pendingInvitations
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      console.log('[CohostInvitations] ❌ User document not found:', userId);
      return null;
    }

    const userData = userDoc.data();
    const pendingInvitations = userData?.userdata?.pendingInvitations || [];

    console.log('[CohostInvitations] 📋 User has pending invitations:', pendingInvitations.length);

    // Find cohost invitation for this event
    const cohostInvitation = pendingInvitations.find(
      inv => inv.eventId === eventId && inv.type === 'cohost'
    );

    if (cohostInvitation) {
      console.log('[CohostInvitations] ✅ Found cohost invitation:', cohostInvitation);
      return {
        id: `${userId}_${eventId}_cohost`, // Generate consistent ID
        eventId: cohostInvitation.eventId,
        studioId: cohostInvitation.studioId,
        type: 'cohost',
        status: 'pending'
      };
    }

    console.log('[CohostInvitations] ❌ No cohost invitation found for event:', eventId);
    return null;
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
