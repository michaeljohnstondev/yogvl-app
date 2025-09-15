// FILE: guestInvitationsService.js - Guest Invitation Management System

import {
  doc,
  getDoc,
  updateDoc,
  writeBatch,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../../auth/services/firebase';
import {
  notifyEventInvitation,
  notifyInvitationAccepted
} from './invitationNotificationsService';

/**
 * Send guest invitation - stores invitation as user ID in event.invitations array
 * @param {string} inviterId - User sending invitation
 * @param {string} recipientId - User receiving invitation
 * @param {string} eventId - Event ID
 * @param {string} studioId - Studio ID containing the event
 * @param {Object} inviterData - Inviter user data
 * @param {Object} eventData - Event data
 * @param {string} [source] - Source of invitation (for tracking)
 * @returns {Promise<Object>} Success result
 */
export const sendGuestInvitation = async (
  inviterId,
  recipientId,
  eventId,
  studioId,
  inviterData,
  eventData,
  source = 'unknown'
) => {
  try {
    // Get event document to check current state
    const eventRef = doc(db, 'studios', studioId, 'events', eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      throw new Error('Event not found');
    }

    const eventDocData = eventDoc.data();
    const currentInvitations = eventDocData.invitations || [];
    const currentSubscribers = eventDocData.subscribers || [];
    const currentCohosts = eventDocData.cohosts || [];

    // Check if user is already invited, subscribed, or is a cohost/host
    if (currentInvitations.includes(recipientId)) {
      throw new Error('Guest invitation already exists');
    }
    if (currentSubscribers.includes(recipientId)) {
      throw new Error('User is already subscribed to this event');
    }
    if (currentCohosts.includes(recipientId)) {
      throw new Error('User is already a cohost of this event');
    }
    if (eventDocData.createdBy === recipientId) {
      throw new Error('Cannot invite the event host');
    }

    // Use batch to atomically update both event and user documents
    const batch = writeBatch(db);

    // Add user ID to event's invitations array
    batch.update(eventRef, {
      invitations: arrayUnion(recipientId)
    });

    // Add event ID to user's pending invitations array
    const userRef = doc(db, 'users', recipientId);
    batch.update(userRef, {
      'userdata.pendingInvitations': arrayUnion(eventId)
    });

    await batch.commit();

    // Send in-app notification
    const inviterName =
      inviterData?.userdata?.contactInfo?.firstName ||
      inviterData?.userdata?.contactInfo?.displayName ||
      'Someone';
    const eventTitle = eventData?.title || 'Untitled Event';

    await notifyEventInvitation({
      guestId: recipientId,
      inviterId,
      inviterName,
      eventId,
      eventTitle,
      invitationId: `${inviterId}_${recipientId}_${eventId}_${Date.now()}`, // For notification tracking
    });

    return { success: true };
  } catch (error) {
    console.error('[GuestInvitations] Error sending guest invitation:', error);
    throw error;
  }
};

/**
 * Accept guest invitation (subscribe to event) - moves user from invitations to subscribers array
 * @param {string} recipientId - User accepting invitation
 * @param {string} eventId - Event ID
 * @param {string} studioId - Studio ID containing the event
 * @returns {Promise<Object>} Success result
 */
export const acceptGuestInvitation = async (
  recipientId,
  eventId,
  studioId
) => {
  try {
    // Get event document
    const eventRef = doc(db, 'studios', studioId, 'events', eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      throw new Error('Event not found');
    }

    const eventData = eventDoc.data();
    const currentInvitations = eventData.invitations || [];
    const currentSubscribers = eventData.subscribers || [];

    // Check if user was actually invited
    if (!currentInvitations.includes(recipientId)) {
      throw new Error('No pending invitation found for this user');
    }

    // Check if user is already subscribed
    if (currentSubscribers.includes(recipientId)) {
      throw new Error('User is already subscribed to this event');
    }

    // Use batch to atomically move user from invitations to subscribers (dual storage)
    const batch = writeBatch(db);

    // Update event document: move from invitations to subscribers
    batch.update(eventRef, {
      invitations: arrayRemove(recipientId),
      subscribers: arrayUnion(recipientId)
    });

    // Update user document: move from pending invitations to subscribed events
    const userRef = doc(db, 'users', recipientId);
    batch.update(userRef, {
      'userdata.pendingInvitations': arrayRemove(eventId),
      'userdata.subscribedEvents': arrayUnion(eventId)
    });

    await batch.commit();

    // Get user data for notification
    const recipientDoc = await getDoc(doc(db, 'users', recipientId));
    if (recipientDoc.exists()) {
      const recipientData = recipientDoc.data();
      const accepterName =
        recipientData?.userdata?.contactInfo?.firstName ||
        recipientData?.userdata?.contactInfo?.displayName ||
        'Someone';

      // Send notification to event host
      await notifyInvitationAccepted({
        hostId: eventData.createdBy,
        guestId: recipientId,
        guestName: accepterName,
        eventId,
        eventTitle: eventData.title || 'Untitled Event',
        invitationId: `accept_${recipientId}_${eventId}_${Date.now()}`, // For notification tracking
      });
    }

    return { success: true };
  } catch (error) {
    console.error('[GuestInvitations] Error accepting guest invitation:', error);
    throw error;
  }
};

/**
 * Decline guest invitation - removes user from event invitations array
 * @param {string} recipientId - User declining invitation
 * @param {string} eventId - Event ID
 * @param {string} studioId - Studio ID containing the event
 * @returns {Promise<Object>} Success result
 */
export const declineGuestInvitation = async (recipientId, eventId, studioId) => {
  try {
    // Get event document
    const eventRef = doc(db, 'studios', studioId, 'events', eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      throw new Error('Event not found');
    }

    const eventData = eventDoc.data();
    const currentInvitations = eventData.invitations || [];

    // Check if user was actually invited
    if (!currentInvitations.includes(recipientId)) {
      throw new Error('No pending invitation found for this user');
    }

    // Use batch to atomically remove invitation from both event and user documents
    const batch = writeBatch(db);

    // Remove user from event invitations array
    batch.update(eventRef, {
      invitations: arrayRemove(recipientId)
    });

    // Remove event from user's pending invitations array
    const userRef = doc(db, 'users', recipientId);
    batch.update(userRef, {
      'userdata.pendingInvitations': arrayRemove(eventId)
    });

    await batch.commit();

    // Optionally notify the host about declined invitation
    // This is disabled by default as it might be spam-ish
    // if (eventData.createdBy) {
    //   await notifyInvitationDeclined({
    //     hostId: eventData.createdBy,
    //     guestId: recipientId,
    //     eventId,
    //     eventTitle: eventData.title || 'Event',
    //   });
    // }

    return { success: true };
  } catch (error) {
    console.error('[GuestInvitations] Error declining guest invitation:', error);
    throw error;
  }
};

/**
 * Get guest invitation status for user and event - checks event-level invitations array
 * @param {string} recipientId - User ID
 * @param {string} eventId - Event ID
 * @param {string} studioId - Studio ID containing the event
 * @returns {Promise<boolean>} True if user has pending invitation
 */
export const getGuestInvitationStatus = async (recipientId, eventId, studioId) => {
  try {
    const eventRef = doc(db, 'studios', studioId, 'events', eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      return false;
    }

    const eventData = eventDoc.data();
    const invitations = eventData.invitations || [];

    return invitations.includes(recipientId);
  } catch (error) {
    console.error('[GuestInvitations] Error checking guest invitation status:', error);
    return false;
  }
};

/**
 * @deprecated This function is no longer supported with event-level arrays architecture.
 * Use getGuestInvitationStatus(recipientId, eventId, studioId) for specific event checks.
 *
 * Get all guest invitations for a user - DEPRECATED
 * @param {string} userId - User ID
 * @param {string} [status] - Filter by status (ignored)
 * @param {number} [limit] - Limit results (ignored)
 * @returns {Promise<Array>} Empty array (function deprecated)
 */
export const getUserGuestInvitations = async (userId, status = null, limit = 50) => {
  console.warn('[GuestInvitations] getUserGuestInvitations is deprecated - use event-level queries instead');
  return [];
};

export default {
  sendGuestInvitation,
  acceptGuestInvitation,
  declineGuestInvitation,
  getGuestInvitationStatus,
  getUserGuestInvitations,
};