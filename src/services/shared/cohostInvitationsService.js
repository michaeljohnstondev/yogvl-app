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

    // Check if invitation already exists
    const existingInvitation = await getCohostInvitationStatus(
      recipientId,
      eventId
    );
    if (existingInvitation) {
      console.log('[CohostInvitations] ⚠️ Invitation already exists:', existingInvitation);
      throw new Error('Cohost invitation already exists');
    }

    // Get recipient data for notification
    const recipientDoc = await getDoc(doc(db, 'users', recipientId));
    if (!recipientDoc.exists()) {
      throw new Error('Recipient user not found');
    }

    const inviterName =
      inviterData?.userdata?.contactInfo?.firstName ||
      inviterData?.userdata?.contactInfo?.displayName ||
      'Someone';
    const eventTitle = eventData?.title || 'Untitled Event';

    // Create cohost invitation document
    const invitationId = `${inviterId}_${recipientId}_${eventId}_${Date.now()}`;
    const invitationRef = doc(
      db,
      'users',
      recipientId,
      'cohostInvitations',
      invitationId
    );

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
        displayName:
          inviterData?.userdata?.contactInfo?.displayName ||
          `${inviterData?.userdata?.contactInfo?.firstName || ''} ${inviterData?.userdata?.contactInfo?.lastName || ''}`.trim() ||
          'Unknown',
        email: inviterData?.userdata?.contactInfo?.email || null,
      },
      eventData: {
        title: eventData?.title || null,
        date: eventData?.date || null,
        location: eventData?.location || null,
      },
    };

    await setDoc(invitationRef, invitation);

    console.log('[CohostInvitations] ✅ Cohost invitation created successfully:', {
      invitationId,
      path: `users/${recipientId}/cohostInvitations/${invitationId}`
    });

    return { success: true, invitationId };
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
 * @param {string} invitationId - Invitation ID
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

    const batch = writeBatch(db);

    // Get invitation
    const invitationRef = doc(
      db,
      'users',
      recipientId,
      'cohostInvitations',
      invitationId
    );
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
    const eventDoc = await getDoc(
      doc(db, 'studios', studioId, 'events', eventId)
    );

    if (!recipientDoc.exists() || !inviterDoc.exists() || !eventDoc.exists()) {
      throw new Error('Required data not found');
    }

    const recipientData = recipientDoc.data();
    const eventData = eventDoc.data();

    console.log(
      '[CohostInvitations] Recipient data structure:',
      JSON.stringify(recipientData, null, 2)
    );

    // Extract user's full name (prioritize displayName which is set in ContactInfoScreen)
    const displayName = recipientData?.userdata?.contactInfo?.displayName || '';
    const firstName = recipientData?.userdata?.contactInfo?.firstName || '';
    const lastName = recipientData?.userdata?.contactInfo?.lastName || '';

    const accepterName =
      displayName ||
      (firstName && lastName ? `${firstName} ${lastName}` : firstName) ||
      'Someone';
    const eventTitle = eventData?.title || 'Untitled Event';

    console.log('[CohostInvitations] Extracted accepter name:', accepterName);

    // Update invitation status
    batch.update(invitationRef, {
      status: 'accepted',
      acceptedAt: Timestamp.now(),
    });

    // Add user as cohost to event
    const eventRef = doc(db, 'studios', studioId, 'events', eventId);

    // Ensure cohosts and subscribers are always arrays
    const existingCohosts = Array.isArray(eventData.cohosts)
      ? eventData.cohosts
      : [];
    const existingSubscribers = Array.isArray(eventData.subscribers)
      ? eventData.subscribers
      : [];

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

    // Cancel any existing scheduled notifications for this user/event
    // (since they're now a cohost with different notification needs)
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

    // Notification will be sent automatically by Cloud Function when invitation status changes

    return {
      success: true,
      newCohost: {
        id: recipientId,
        name: accepterName,
        eventId,
        eventTitle
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
 * @param {string} invitationId - Invitation ID
 * @param {string} recipientId - User declining invitation
 * @returns {Promise<Object>} Success result
 */
export const declineCohostInvitation = async (invitationId, recipientId) => {
  try {
    const invitationRef = doc(
      db,
      'users',
      recipientId,
      'cohostInvitations',
      invitationId
    );

    await updateDoc(invitationRef, {
      status: 'declined',
      declinedAt: Timestamp.now(),
    });

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
