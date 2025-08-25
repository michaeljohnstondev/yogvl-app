// FILE: services/invitations.js - Guest Invitation System

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
  orderBy,
  limit,
  arrayUnion,
  arrayRemove,
  increment,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../auth/services/firebase';
import { 
  createNotification, 
  NOTIFICATION_TYPES, 
  NOTIFICATION_PRIORITY,
  DELIVERY_CHANNELS 
} from '../../services/notifications';

/**
 * INVITATION DATA MODEL:
 * 
 * Collection: /invitations/{inviteId}
 * {
 *   id: string,
 *   eventId: string,
 *   hostId: string (event creator),
 *   guestId: string (invited user),
 *   guestEmail?: string (if invited by email),
 *   guestPhone?: string (if invited by phone),
 *   status: 'pending' | 'accepted' | 'declined' | 'expired',
 *   invitedAt: Timestamp,
 *   respondedAt?: Timestamp,
 *   message?: string (optional personal message),
 *   type: 'user' | 'email' | 'phone', // how they were invited
 * }
 * 
 * Event updates:
 * - invitations: [inviteId] // track all invitations
 * - pendingInvites: number // count of pending invites
 * 
 * User updates:
 * - receivedInvitations: [inviteId] // invites they received
 * - sentInvitations: [inviteId] // invites they sent
 */

// INVITATION STATUS CONSTANTS
export const INVITATION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  EXPIRED: 'expired',
};

export const INVITATION_TYPE = {
  USER: 'user',      // Invited existing app user
  EMAIL: 'email',    // Invited via email (may not have account)
  PHONE: 'phone',    // Invited via SMS (may not have account)
};

/**
 * Send invitation to a user
 */
export const sendUserInvitation = async ({
  eventId,
  hostId,
  guestId,
  message = '',
  studioId = null, // Add studioId parameter
  source = 'event_creation', // Add source parameter
}) => {
  const batch = writeBatch(db);
  
  try {
    // Validate inputs
    if (!eventId || !hostId || !guestId) {
      throw new Error('Event ID, host ID, and guest ID are required');
    }

    // Get the studioId if not provided
    if (!studioId) {
      // Try to get studioId from host user data
      const hostDoc = await getDoc(doc(db, 'users', hostId));
      if (hostDoc.exists()) {
        const hostData = hostDoc.data();
        studioId = hostData?.userdata?.studios?.default?.studioId;
      }
      if (!studioId) {
        throw new Error('Studio ID is required but could not be determined');
      }
    }

    // Check if guest is already invited or subscribed
    const existingInvite = await checkExistingInvitation(eventId, guestId);
    if (existingInvite) {
      throw new Error('User has already been invited to this event');
    }

    const isAlreadySubscribed = await checkIfUserSubscribed(eventId, guestId, studioId);
    if (isAlreadySubscribed) {
      throw new Error('User is already attending this event');
    }

    // Create invitation document
    const inviteId = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const inviteRef = doc(db, 'invitations', inviteId);
    
    const invitation = {
      id: inviteId,
      eventId,
      hostId,
      guestId,
      status: INVITATION_STATUS.PENDING,
      type: INVITATION_TYPE.USER,
      invitedAt: Timestamp.now(),
      message: message.trim(),
      studioId, // Store studio context for event lookup
    };

    batch.set(inviteRef, invitation);

    // Update event document (in studio collection)
    const eventRef = doc(db, 'studios', studioId, 'events', eventId);
    batch.update(eventRef, {
      invitations: arrayUnion(inviteId),
      pendingInvites: increment(1),
    });

    // Update host's sent invitations
    const hostRef = doc(db, 'users', hostId);
    batch.update(hostRef, {
      sentInvitations: arrayUnion(inviteId),
    });

    // Update guest's received invitations
    const guestRef = doc(db, 'users', guestId);
    batch.update(guestRef, {
      receivedInvitations: arrayUnion(inviteId),
    });

    await batch.commit();

    // Send notification to guest
    try {
      // Get event details for notification (from studio collection)
      const eventDoc = await getDoc(doc(db, 'studios', studioId, 'events', eventId));
      const eventData = eventDoc.exists() ? eventDoc.data() : null;

      // Get host details for notification
      const hostDoc = await getDoc(doc(db, 'users', hostId));
      const hostData = hostDoc.exists() ? hostDoc.data() : null;
      
      // Extract host name from nested structure
      const hostDisplayName = hostData?.userdata?.contactInfo?.displayName || 
                            hostData?.displayName || 
                            `${hostData?.userdata?.contactInfo?.firstName || ''} ${hostData?.userdata?.contactInfo?.lastName || ''}`.trim() ||
                            'Someone';

      console.log(`[sendUserInvitation] Sending notification to ${guestId} for event ${eventData?.title}`);

      const notificationResult = await createNotification({
        userId: guestId,
        type: NOTIFICATION_TYPES.GUEST_INVITATION,
        title: 'Event Invitation',
        message: `${hostDisplayName} invited you to "${eventData?.title || 'an event'}"`,
        data: {
          invitationId: inviteId,
          eventId,
          eventTitle: eventData?.title,
          hostId,
          hostName: hostDisplayName, // Use the properly extracted name
          studioId, // Include studio context for proper navigation
          source: source, // Source of the invitation
        },
        priority: NOTIFICATION_PRIORITY.HIGH,
        channels: [DELIVERY_CHANNELS.PUSH],
        actions: [
          {
            id: 'join_event',
            title: 'Join Now',
            action: 'accept_invitation',
            params: { invitationId: inviteId, eventId, studioId }
          },
          {
            id: 'view_event',
            title: 'View Details',
            action: 'view_event',
            params: { eventId, studioId }
          }
        ]
      });

      console.log(`[sendUserInvitation] Notification result:`, notificationResult);
      
      if (!notificationResult.success) {
        console.warn(`[sendUserInvitation] Notification not sent: ${notificationResult.reason}`);
      }
    } catch (notificationError) {
      console.error('Error sending invitation notification:', notificationError);
      // Don't fail the invitation if notification fails
    }

    return {
      success: true,
      invitationId: inviteId,
      invitation: {
        ...invitation,
        invitedAt: invitation.invitedAt.toDate(),
      },
    };
  } catch (error) {
    console.error('Error sending user invitation:', error);
    throw error;
  }
};

/**
 * Send invitation via email
 */
export const sendEmailInvitation = async ({
  eventId,
  hostId,
  guestEmail,
  message = '',
}) => {
  const batch = writeBatch(db);
  
  try {
    // Validate inputs
    if (!eventId || !hostId || !guestEmail) {
      throw new Error('Event ID, host ID, and guest email are required');
    }

    // Check if email is already invited
    const existingInvite = await checkExistingEmailInvitation(eventId, guestEmail);
    if (existingInvite) {
      throw new Error('This email has already been invited to this event');
    }

    // Create invitation document
    const inviteId = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const inviteRef = doc(db, 'invitations', inviteId);
    
    const invitation = {
      id: inviteId,
      eventId,
      hostId,
      guestEmail: guestEmail.toLowerCase().trim(),
      status: INVITATION_STATUS.PENDING,
      type: INVITATION_TYPE.EMAIL,
      invitedAt: Timestamp.now(),
      message: message.trim(),
      studioId, // Store studio context for event lookup
    };

    batch.set(inviteRef, invitation);

    // Update event document
    const eventRef = doc(db, 'events', eventId);
    batch.update(eventRef, {
      invitations: arrayUnion(inviteId),
      pendingInvites: increment(1),
    });

    // Update host's sent invitations
    const hostRef = doc(db, 'users', hostId);
    batch.update(hostRef, {
      sentInvitations: arrayUnion(inviteId),
    });

    await batch.commit();

    // TODO: Send actual email invitation here
    // await sendInvitationEmail(invitation);

    // Note: Email invitations don't send push notifications since the recipient
    // may not have the app yet. They will get the invitation via email.

    return {
      success: true,
      invitationId: inviteId,
      invitation: {
        ...invitation,
        invitedAt: invitation.invitedAt.toDate(),
      },
    };
  } catch (error) {
    console.error('Error sending email invitation:', error);
    throw error;
  }
};

/**
 * Accept an invitation
 */
export const acceptInvitation = async (invitationId, userId, studioId = null) => {
  const batch = writeBatch(db);
  
  try {
    // Get invitation
    const inviteRef = doc(db, 'invitations', invitationId);
    const inviteDoc = await getDoc(inviteRef);
    
    if (!inviteDoc.exists()) {
      throw new Error('Invitation not found');
    }

    const invitation = inviteDoc.data();
    
    // Get studioId from invitation if not provided
    const eventStudioId = studioId || invitation.studioId;
    if (!eventStudioId) {
      throw new Error('Studio information missing from invitation');
    }
    
    // Validate invitation can be accepted
    if (invitation.status !== INVITATION_STATUS.PENDING) {
      throw new Error('Invitation is no longer pending');
    }

    if (invitation.guestId && invitation.guestId !== userId) {
      throw new Error('This invitation is not for you');
    }

    // Check if user is already subscribed (use studio-specific event collection)
    const isAlreadySubscribed = await checkIfUserSubscribed(invitation.eventId, userId, eventStudioId);
    if (isAlreadySubscribed) {
      throw new Error('You are already attending this event');
    }

    // Update invitation status
    batch.update(inviteRef, {
      status: INVITATION_STATUS.ACCEPTED,
      respondedAt: Timestamp.now(),
      ...(invitation.type === INVITATION_TYPE.EMAIL && { guestId: userId }), // Link email invite to user
    });

    // Subscribe user to event (use studio-specific collection)
    const eventRef = doc(db, 'studios', eventStudioId, 'events', invitation.eventId);
    batch.update(eventRef, {
      subscribers: arrayUnion(userId),
      subscriberCount: increment(1),
      pendingInvites: increment(-1),
    });

    // Update user's subscribed events
    const userRef = doc(db, 'users', userId);
    batch.update(userRef, {
      subscribedEvents: arrayUnion(invitation.eventId),
    });

    await batch.commit();

    // Send notification to host about acceptance
    try {
      // Get event details from studio-specific collection
      const eventDoc = await getDoc(doc(db, 'studios', eventStudioId, 'events', invitation.eventId));
      const eventData = eventDoc.exists() ? eventDoc.data() : null;

      // Get guest details
      const guestDoc = await getDoc(doc(db, 'users', userId));
      const guestData = guestDoc.exists() ? guestDoc.data() : null;
      
      // Extract guest name from nested structure
      const guestDisplayName = guestData?.userdata?.contactInfo?.displayName || 
                             guestData?.displayName || 
                             `${guestData?.userdata?.contactInfo?.firstName || ''} ${guestData?.userdata?.contactInfo?.lastName || ''}`.trim() ||
                             'Someone';

      await createNotification({
        userId: invitation.hostId,
        type: NOTIFICATION_TYPES.INVITATION_ACCEPTED,
        title: 'Invitation Accepted',
        message: `${guestDisplayName} accepted your invitation to "${eventData?.title || 'your event'}"`,
        data: {
          invitationId: invitation.id,
          eventId: invitation.eventId,
          eventTitle: eventData?.title || 'Unknown Event',
          guestId: userId,
          guestName: guestDisplayName,
        },
        priority: NOTIFICATION_PRIORITY.NORMAL,
        channels: [DELIVERY_CHANNELS.PUSH],
      });
    } catch (notificationError) {
      console.error('Error sending acceptance notification:', notificationError);
      // Don't fail the acceptance if notification fails
    }

    return {
      success: true,
      eventId: invitation.eventId,
    };
  } catch (error) {
    console.error('Error accepting invitation:', error);
    throw error;
  }
};

/**
 * Decline an invitation
 */
export const declineInvitation = async (invitationId, userId) => {
  try {
    // Get invitation
    const inviteRef = doc(db, 'invitations', invitationId);
    const inviteDoc = await getDoc(inviteRef);
    
    if (!inviteDoc.exists()) {
      throw new Error('Invitation not found');
    }

    const invitation = inviteDoc.data();
    
    // Validate invitation can be declined
    if (invitation.status !== INVITATION_STATUS.PENDING) {
      throw new Error('Invitation is no longer pending');
    }

    if (invitation.guestId && invitation.guestId !== userId) {
      throw new Error('This invitation is not for you');
    }

    // Update invitation status
    await updateDoc(inviteRef, {
      status: INVITATION_STATUS.DECLINED,
      respondedAt: Timestamp.now(),
      ...(invitation.type === INVITATION_TYPE.EMAIL && { guestId: userId }), // Link email invite to user
    });

    // Update event pending invites count
    const eventRef = doc(db, 'events', invitation.eventId);
    await updateDoc(eventRef, {
      pendingInvites: increment(-1),
    });

    // Send notification to host about decline
    try {
      // Get event details
      const eventDoc = await getDoc(eventRef);
      const eventData = eventDoc.exists() ? eventDoc.data() : null;

      // Get guest details (if it's a user invitation)
      let guestData = null;
      if (invitation.guestId) {
        const guestDoc = await getDoc(doc(db, 'users', invitation.guestId));
        guestData = guestDoc.exists() ? guestDoc.data() : null;
      }

      const guestName = guestData?.displayName || invitation.guestEmail || 'Someone';

      await createNotification({
        userId: invitation.hostId,
        type: NOTIFICATION_TYPES.INVITATION_DECLINED,
        title: 'Invitation Declined',
        message: `${guestName} declined your invitation to "${eventData?.title || 'your event'}"`,
        data: {
          invitationId: invitation.id,
          eventId: invitation.eventId,
          eventTitle: eventData?.title,
          guestId: invitation.guestId,
          guestEmail: invitation.guestEmail,
          guestName,
        },
        priority: NOTIFICATION_PRIORITY.LOW,
        channels: [DELIVERY_CHANNELS.PUSH],
      });
    } catch (notificationError) {
      console.error('Error sending decline notification:', notificationError);
      // Don't fail the decline if notification fails
    }

    return {
      success: true,
      eventId: invitation.eventId,
    };
  } catch (error) {
    console.error('Error declining invitation:', error);
    throw error;
  }
};

/**
 * Cancel/revoke an invitation (host only)
 */
export const cancelInvitation = async (invitationId, hostId) => {
  const batch = writeBatch(db);
  
  try {
    // Get invitation
    const inviteRef = doc(db, 'invitations', invitationId);
    const inviteDoc = await getDoc(inviteRef);
    
    if (!inviteDoc.exists()) {
      throw new Error('Invitation not found');
    }

    const invitation = inviteDoc.data();
    
    // Validate host can cancel
    if (invitation.hostId !== hostId) {
      throw new Error('Only the host can cancel this invitation');
    }

    if (invitation.status === INVITATION_STATUS.ACCEPTED) {
      throw new Error('Cannot cancel an accepted invitation');
    }

    // Delete invitation document
    batch.delete(inviteRef);

    // Update event document
    const eventRef = doc(db, 'events', invitation.eventId);
    batch.update(eventRef, {
      invitations: arrayRemove(invitationId),
      ...(invitation.status === INVITATION_STATUS.PENDING && {
        pendingInvites: increment(-1),
      }),
    });

    // Update host's sent invitations
    const hostRef = doc(db, 'users', hostId);
    batch.update(hostRef, {
      sentInvitations: arrayRemove(invitationId),
    });

    // Update guest's received invitations (if user invite)
    if (invitation.guestId) {
      const guestRef = doc(db, 'users', invitation.guestId);
      batch.update(guestRef, {
        receivedInvitations: arrayRemove(invitationId),
      });
    }

    await batch.commit();

    return { success: true };
  } catch (error) {
    console.error('Error canceling invitation:', error);
    throw error;
  }
};

/**
 * Get invitations for an event
 */
export const getEventInvitations = async (eventId) => {
  try {
    const q = query(
      collection(db, 'invitations'),
      where('eventId', '==', eventId)
    );

    const snapshot = await getDocs(q);
    const invitations = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Get guest user data if it's a user invitation
      let guestData = null;
      if (data.guestId) {
        const userDoc = await getDoc(doc(db, 'users', data.guestId));
        if (userDoc.exists()) {
          guestData = userDoc.data();
        }
      }

      invitations.push({
        ...data,
        invitedAt: data.invitedAt.toDate(),
        respondedAt: data.respondedAt?.toDate(),
        guestData,
      });
    }

    // Sort by invitedAt descending (most recent first) since we removed orderBy from query
    invitations.sort((a, b) => b.invitedAt - a.invitedAt);

    return invitations;
  } catch (error) {
    console.error('Error getting event invitations:', error);
    throw error;
  }
};

/**
 * Get invitations for a user
 */
export const getUserInvitations = async (userId) => {
  try {
    // Get invitations where user is the guest
    const userInvites = query(
      collection(db, 'invitations'),
      where('guestId', '==', userId)
    );

    const snapshot = await getDocs(userInvites);
    const invitations = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      // Get event data
      const eventDoc = await getDoc(doc(db, 'events', data.eventId));
      const eventData = eventDoc.exists() ? eventDoc.data() : null;

      // Get host data
      const hostDoc = await getDoc(doc(db, 'users', data.hostId));
      const hostData = hostDoc.exists() ? hostDoc.data() : null;

      invitations.push({
        ...data,
        invitedAt: data.invitedAt.toDate(),
        respondedAt: data.respondedAt?.toDate(),
        eventData,
        hostData,
      });
    }

    // Sort by invitedAt descending (most recent first) since we removed orderBy from query
    invitations.sort((a, b) => b.invitedAt - a.invitedAt);

    return invitations;
  } catch (error) {
    console.error('Error getting user invitations:', error);
    throw error;
  }
};

// HELPER FUNCTIONS

/**
 * Check if user already has an invitation to this event
 */
const checkExistingInvitation = async (eventId, guestId) => {
  const q = query(
    collection(db, 'invitations'),
    where('eventId', '==', eventId),
    where('guestId', '==', guestId),
    limit(1)
  );

  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

/**
 * Check if email already has an invitation to this event
 */
const checkExistingEmailInvitation = async (eventId, guestEmail) => {
  const q = query(
    collection(db, 'invitations'),
    where('eventId', '==', eventId),
    where('guestEmail', '==', guestEmail.toLowerCase().trim()),
    limit(1)
  );

  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

/**
 * Check if user is already subscribed to event
 */
const checkIfUserSubscribed = async (eventId, userId, studioId = null) => {
  // If no studioId provided, try to find the event in global collection (fallback)
  let eventDoc;
  if (studioId) {
    eventDoc = await getDoc(doc(db, 'studios', studioId, 'events', eventId));
  } else {
    // Fallback to old structure
    eventDoc = await getDoc(doc(db, 'events', eventId));
  }
  
  if (!eventDoc.exists()) {
    throw new Error('Event not found');
  }

  const event = eventDoc.data();
  const subscribers = event.subscribers || [];
  return subscribers.includes(userId);
};

/**
 * Send multiple invitations in batch
 */
export const sendBulkInvitations = async ({
  eventId,
  hostId,
  invitations = [], // Array of { type: 'user'|'email', guestId?, guestEmail?, message? }
  defaultMessage = '',
  studioId = null, // Add studioId parameter
  source = 'event_creation', // Add source parameter
}) => {
  try {
    if (!eventId || !hostId) {
      throw new Error('Event ID and host ID are required');
    }

    if (!invitations.length) {
      throw new Error('No invitations to send');
    }

    const results = {
      successful: [],
      failed: [],
      totalCount: invitations.length,
    };

    // Process invitations in batches to avoid overwhelming Firestore
    const batchSize = 10;
    for (let i = 0; i < invitations.length; i += batchSize) {
      const batch = invitations.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (invite) => {
        try {
          let result;
          
          console.log(`[sendBulkInvitations] Processing invite:`, invite);
          
          if (invite.type === 'user' && invite.guestId) {
            console.log(`[sendBulkInvitations] Sending user invitation to ${invite.guestId}`);
            result = await sendUserInvitation({
              eventId,
              hostId,
              guestId: invite.guestId,
              message: invite.message || defaultMessage,
              studioId, // Pass studioId to user invitation
              source, // Pass source to user invitation
            });
            console.log(`[sendBulkInvitations] User invitation result:`, result);
          } else if (invite.type === 'email' && invite.guestEmail) {
            console.log(`[sendBulkInvitations] Sending email invitation to ${invite.guestEmail}`);
            result = await sendEmailInvitation({
              eventId,
              hostId,
              guestEmail: invite.guestEmail,
              message: invite.message || defaultMessage,
              studioId, // Pass studioId to email invitation
            });
            console.log(`[sendBulkInvitations] Email invitation result:`, result);
          } else {
            throw new Error('Invalid invitation data');
          }

          results.successful.push({
            ...invite,
            invitationId: result.invitationId,
          });
          
          return result;
        } catch (error) {
          console.error(`[sendBulkInvitations] Failed to send invitation:`, error);
          results.failed.push({
            ...invite,
            error: error.message,
          });
          return null;
        }
      });

      await Promise.all(batchPromises);
      
      // Small delay between batches
      if (i + batchSize < invitations.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`[invitations] Bulk send complete: ${results.successful.length} successful, ${results.failed.length} failed`);
    
    return {
      success: true,
      results,
    };
  } catch (error) {
    console.error('Error sending bulk invitations:', error);
    throw error;
  }
};

/**
 * Send bulk co-host invitations
 */
export const sendBulkCohostInvitations = async ({
  eventId,
  hostId,
  cohostInvitations = [], // Array of { type: 'user'|'email', guestId?, guestEmail?, message? }
  defaultMessage = '',
  studioId = null,
  eventData = null,
  hostData = null
}) => {
  try {
    if (!eventId || !hostId) {
      throw new Error('Event ID and host ID are required');
    }

    if (!cohostInvitations.length) {
      return { success: true, results: { successful: [], failed: [], totalCount: 0 } };
    }

    const results = {
      successful: [],
      failed: [],
      totalCount: cohostInvitations.length,
    };

    // Process invitations sequentially for co-hosts to avoid conflicts
    for (const invite of cohostInvitations) {
      try {
        if (invite.type === 'user' && invite.guestId) {
          // Use existing sendCohostInvitation from friendService
          const { sendCohostInvitation } = await import('../../services/friendService');
          
          const result = await sendCohostInvitation(
            hostId,
            invite.guestId,
            eventId,
            hostData,
            eventData,
            studioId
          );

          results.successful.push({
            ...invite,
            invitationId: result.invitationId || `cohost_${invite.guestId}_${eventId}`,
          });
        } else {
          throw new Error('Co-host invitations currently only support app users');
        }
      } catch (error) {
        results.failed.push({
          ...invite,
          error: error.message,
        });
      }
    }

    console.log(`[invitations] Bulk cohost send complete: ${results.successful.length} successful, ${results.failed.length} failed`);
    
    return {
      success: true,
      results,
    };
  } catch (error) {
    console.error('Error sending bulk cohost invitations:', error);
    throw error;
  }
};

/**
 * Combined function to send both guest and cohost invitations in batch
 */
export const sendEventInvitations = async ({
  eventId,
  hostId,
  guestInvitations = [],
  cohostInvitations = [],
  defaultMessage = '',
  studioId = null,
  eventData = null,
  hostData = null,
  source = 'event_creation' // Add source parameter
}) => {
  try {
    const results = {
      guests: { successful: [], failed: [], totalCount: guestInvitations.length },
      cohosts: { successful: [], failed: [], totalCount: cohostInvitations.length },
    };

    // Send guest invitations
    if (guestInvitations.length > 0) {
      const guestResults = await sendBulkInvitations({
        eventId,
        hostId,
        invitations: guestInvitations,
        defaultMessage,
        studioId,
        source
      });
      results.guests = guestResults.results;
    }

    // Send cohost invitations
    if (cohostInvitations.length > 0) {
      const cohostResults = await sendBulkCohostInvitations({
        eventId,
        hostId,
        cohostInvitations,
        defaultMessage,
        studioId,
        eventData,
        hostData
      });
      results.cohosts = cohostResults.results;
    }

    const totalSuccessful = results.guests.successful.length + results.cohosts.successful.length;
    const totalFailed = results.guests.failed.length + results.cohosts.failed.length;

    console.log(`[invitations] Combined send complete: ${totalSuccessful} successful, ${totalFailed} failed`);

    return {
      success: true,
      results,
      summary: {
        totalSuccessful,
        totalFailed,
        guestCount: results.guests.successful.length,
        cohostCount: results.cohosts.successful.length,
      }
    };
  } catch (error) {
    console.error('Error sending event invitations:', error);
    throw error;
  }
};

/**
 * Expire old pending invitations (to be called periodically)
 */
export const expireOldInvitations = async (daysOld = 7) => {
  try {
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() - daysOld);

    const q = query(
      collection(db, 'invitations'),
      where('status', '==', INVITATION_STATUS.PENDING),
      where('invitedAt', '<', Timestamp.fromDate(expireDate))
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);

    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: INVITATION_STATUS.EXPIRED,
      });
    });

    if (!snapshot.empty) {
      await batch.commit();
      console.log(`Expired ${snapshot.size} old invitations`);
    }

    return snapshot.size;
  } catch (error) {
    console.error('Error expiring old invitations:', error);
    throw error;
  }
};