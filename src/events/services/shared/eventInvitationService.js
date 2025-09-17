// FILE: eventInvitationService.js - Event Invitation Management System

import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../../../auth/services/firebase';
import { updateEventSubscription } from '../../lib/userMetrics';
import { notifyHostOfEventJoin } from '../../../services/shared/eventNotificationsService';
import { notifyEventInvitation, sendBulkInvitationNotifications } from '../../../services/shared/invitationNotificationsService';
import { fetchEventDetails } from './eventCoreService';

/**
 * Add single user to event invitations
 * @param {string} userId - User to invite
 * @param {string} eventId - Event ID
 * @param {string} studioId - Studio ID
 * @returns {Promise<Object>} Updated invitations array
 */
export const addUserToInvitations = async (userId, eventId, studioId) => {
  try {
    const eventRef = doc(db, 'studios', studioId, 'events', eventId);
    const userRef = doc(db, 'users', userId);

    // Use atomic transaction to ensure consistency
    const result = await runTransaction(db, async (transaction) => {
      const eventSnap = await transaction.get(eventRef);

      if (!eventSnap.exists()) {
        throw new Error('Event not found');
      }

      const eventData = eventSnap.data();
      const currentInvitations = eventData.invitations || [];
      const currentSubscribers = eventData.subscribers || [];

      // Check if user is already invited or subscribed
      if (currentInvitations.includes(userId)) {
        throw new Error('User already invited');
      }
      if (currentSubscribers.includes(userId)) {
        throw new Error('User already subscribed');
      }

      // Add to event's invitations array
      transaction.update(eventRef, {
        invitations: arrayUnion(userId),
      });

      // Add to user's invitedEvents array
      transaction.update(userRef, {
        'userdata.metrics.events.invitedEvents': arrayUnion(eventId),
      });

      console.log(
        `[EventInvitations] Added user ${userId} to event ${eventId} invitations`
      );

      return {
        invitations: [...currentInvitations, userId],
        eventData, // Return event data for notification
      };
    });

    // AFTER transaction completes successfully, send notification
    try {
      const hostData = await getDoc(doc(db, 'users', result.eventData.createdBy));

      if (hostData.exists()) {
        const hostUserData = hostData.data();
        const hostName = hostUserData?.userdata?.contactInfo?.displayName ||
                        hostUserData?.userdata?.contactInfo?.firstName ||
                        'Event Host';

        // Send invitation notification (fire-and-forget to not block response)
        notifyEventInvitation({
          guestId: userId,
          inviterId: result.eventData.createdBy,
          inviterName: hostName,
          eventId: eventId,
          eventTitle: result.eventData.title,
          invitationId: `inv_${eventId}_${userId}_${Date.now()}`,
        }).catch((error) => {
          console.error('[EventInvitations] Failed to send invitation notification:', error);
          // Don't throw - notification failure shouldn't affect the invitation result
        });
      }
    } catch (notificationError) {
      console.error('[EventInvitations] Error preparing invitation notification:', notificationError);
      // Don't throw - notification failure shouldn't affect the invitation result
    }

    return result;
  } catch (error) {
    console.error(
      '[EventInvitations] Error adding user to invitations:',
      error
    );
    throw error;
  }
};

/**
 * Remove user from event invitations
 * @param {string} userId - User to remove
 * @param {string} eventId - Event ID
 * @param {string} studioId - Studio ID
 * @returns {Promise<Object>} Updated invitations array
 */
export const removeUserFromInvitations = async (userId, eventId, studioId) => {
  try {
    const eventRef = doc(db, 'studios', studioId, 'events', eventId);
    const userRef = doc(db, 'users', userId);

    // Use atomic transaction
    return await runTransaction(db, async (transaction) => {
      const eventSnap = await transaction.get(eventRef);

      if (!eventSnap.exists()) {
        throw new Error('Event not found');
      }

      const eventData = eventSnap.data();
      const currentInvitations = eventData.invitations || [];

      // Check if user is actually invited
      if (!currentInvitations.includes(userId)) {
        throw new Error('User not found in invitations');
      }

      // Remove from event's invitations array
      transaction.update(eventRef, {
        invitations: arrayRemove(userId),
      });

      // Remove from user's invitedEvents array
      transaction.update(userRef, {
        'userdata.metrics.events.invitedEvents': arrayRemove(eventId),
      });

      console.log(
        `[EventInvitations] Removed user ${userId} from event ${eventId} invitations`
      );

      return {
        invitations: currentInvitations.filter((id) => id !== userId),
      };
    });
  } catch (error) {
    console.error(
      '[EventInvitations] Error removing user from invitations:',
      error
    );
    throw error;
  }
};

/**
 * Accept invitation and subscribe to event
 * @param {string} userId - User accepting invitation
 * @param {string} eventId - Event ID
 * @param {string} studioId - Studio ID
 * @param {Object} [notificationSettings] - User notification preferences
 * @returns {Promise<Object>} Updated event state
 */
export const acceptInvitationAndSubscribe = async (
  userId,
  eventId,
  studioId,
  notificationSettings = {}
) => {
  try {
    const eventRef = doc(db, 'studios', studioId, 'events', eventId);
    const userRef = doc(db, 'users', userId);

    // Use atomic transaction for invitation acceptance -> subscription
    const result = await runTransaction(db, async (transaction) => {
      const eventSnap = await transaction.get(eventRef);

      if (!eventSnap.exists()) {
        throw new Error('Event not found');
      }

      const eventData = eventSnap.data();
      const currentInvitations = eventData.invitations || [];
      const currentSubscribers = eventData.subscribers || [];

      // Check if user is actually invited
      if (!currentInvitations.includes(userId)) {
        throw new Error('User not found in invitations');
      }

      // Check if user is already subscribed
      if (currentSubscribers.includes(userId)) {
        throw new Error('User already subscribed');
      }

      // Atomic state transition: invitation -> subscription
      transaction.update(eventRef, {
        invitations: arrayRemove(userId),
        subscribers: arrayUnion(userId),
        subscriberCount: increment(1),
      });

      // Update user arrays atomically
      transaction.update(userRef, {
        'userdata.metrics.events.invitedEvents': arrayRemove(eventId),
        'userdata.metrics.events.subscribedEvents': arrayUnion(eventId),
        subscribedEvents: arrayUnion(eventId),
      });

      console.log(
        `[EventInvitations] User ${userId} accepted invitation and subscribed to event ${eventId}`
      );

      return {
        invitations: currentInvitations.filter((id) => id !== userId),
        subscribers: [...currentSubscribers, userId],
        subscriberCount: (eventData.subscriberCount || 0) + 1,
      };
    });

    // Run background operations in parallel (fire and forget)
    setTimeout(async () => {
      try {
        // Update user metrics
        await updateEventSubscription(userId, eventId);

        // Add notification subscription if needed
        if (
          notificationSettings &&
          Object.keys(notificationSettings).length > 0
        ) {
          await addEventNotificationSubscription(
            userId,
            eventId,
            studioId,
            notificationSettings
          );
        }

        // Notify host of acceptance
        const eventData = await fetchEventDetails(studioId, eventId);
        if (eventData.createdBy !== userId) {
          // Get user name for notification
          const userDoc = await getDoc(doc(db, 'users', userId));
          const userName = userDoc.exists()
            ? userDoc.data()?.userdata?.contactInfo?.displayName || 'Someone'
            : 'Someone';

          await notifyHostOfEventJoin({
            hostId: eventData.createdBy,
            eventId: eventId,
            eventTitle: eventData.title,
            subscriberId: userId,
            subscriberName: userName,
          });
        }
      } catch (error) {
        console.error(
          '[EventInvitations] Background acceptance operations failed:',
          error
        );
      }
    }, 0);

    return result;
  } catch (error) {
    console.error('[EventInvitations] Error accepting invitation:', error);
    throw error;
  }
};

/**
 * Decline invitation (remove from invitations)
 * @param {string} userId - User declining invitation
 * @param {string} eventId - Event ID
 * @param {string} studioId - Studio ID
 * @returns {Promise<Object>} Updated invitations array
 */
export const declineInvitation = async (userId, eventId, studioId) => {
  try {
    const eventRef = doc(db, 'studios', studioId, 'events', eventId);
    const userRef = doc(db, 'users', userId);

    // Use atomic transaction for invitation decline
    return await runTransaction(db, async (transaction) => {
      const eventSnap = await transaction.get(eventRef);

      if (!eventSnap.exists()) {
        throw new Error('Event not found');
      }

      const eventData = eventSnap.data();
      const currentInvitations = eventData.invitations || [];

      // Check if user is actually invited
      if (!currentInvitations.includes(userId)) {
        throw new Error('User not found in invitations');
      }

      // Remove from both arrays
      transaction.update(eventRef, {
        invitations: arrayRemove(userId),
      });

      transaction.update(userRef, {
        'userdata.metrics.events.invitedEvents': arrayRemove(eventId),
      });

      console.log(
        `[EventInvitations] User ${userId} declined invitation to event ${eventId}`
      );

      return {
        invitations: currentInvitations.filter((id) => id !== userId),
      };
    });
  } catch (error) {
    console.error('[EventInvitations] Error declining invitation:', error);
    throw error;
  }
};

/**
 * Bulk add multiple users to event invitations
 * @param {string[]} userIds - Array of user IDs to invite
 * @param {string} eventId - Event ID
 * @param {string} studioId - Studio ID
 * @returns {Promise<Object>} Results of bulk operation
 */
export const bulkAddUsersToInvitations = async (userIds, eventId, studioId) => {
  try {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new Error('No users to invite');
    }

    const eventRef = doc(db, 'studios', studioId, 'events', eventId);

    // Use atomic transaction for bulk invitation
    const result = await runTransaction(db, async (transaction) => {
      const eventSnap = await transaction.get(eventRef);

      if (!eventSnap.exists()) {
        throw new Error('Event not found');
      }

      const eventData = eventSnap.data();
      const currentInvitations = eventData.invitations || [];
      const currentSubscribers = eventData.subscribers || [];

      // Filter out users that are already invited or subscribed
      const eligibleUserIds = userIds.filter(
        (userId) =>
          !currentInvitations.includes(userId) &&
          !currentSubscribers.includes(userId)
      );

      if (eligibleUserIds.length === 0) {
        throw new Error('No eligible users to invite');
      }

      // Update event's invitations array
      transaction.update(eventRef, {
        invitations: arrayUnion(...eligibleUserIds),
      });

      // Update each user's invitedEvents array
      for (const userId of eligibleUserIds) {
        const userRef = doc(db, 'users', userId);
        transaction.update(userRef, {
          'userdata.metrics.events.invitedEvents': arrayUnion(eventId),
        });
      }

      console.log(
        `[EventInvitations] Bulk invited ${eligibleUserIds.length} users to event ${eventId}`
      );

      return {
        invitations: [...currentInvitations, ...eligibleUserIds],
        addedCount: eligibleUserIds.length,
        eligibleUserIds,
        skippedCount: userIds.length - eligibleUserIds.length,
        eventData, // Return event data for notification
      };
    });

    // AFTER transaction completes successfully, send bulk notifications
    if (result.eligibleUserIds.length > 0) {
      try {
        const hostData = await getDoc(doc(db, 'users', result.eventData.createdBy));

        if (hostData.exists()) {
          const hostUserData = hostData.data();
          const hostName = hostUserData?.userdata?.contactInfo?.displayName ||
                          hostUserData?.userdata?.contactInfo?.firstName ||
                          'Event Host';

          // Create invitation IDs map for bulk notifications
          const invitationIds = {};
          result.eligibleUserIds.forEach(userId => {
            invitationIds[userId] = `inv_${eventId}_${userId}_${Date.now()}`;
          });

          // Send bulk invitation notifications (fire-and-forget)
          sendBulkInvitationNotifications({
            recipientIds: result.eligibleUserIds,
            inviterId: result.eventData.createdBy,
            inviterName: hostName,
            eventId: eventId,
            eventTitle: result.eventData.title,
            invitationIds,
          }).catch((error) => {
            console.error('[EventInvitations] Failed to send bulk invitation notifications:', error);
            // Don't throw - notification failure shouldn't affect the invitation result
          });
        }
      } catch (notificationError) {
        console.error('[EventInvitations] Error preparing bulk invitation notifications:', notificationError);
        // Don't throw - notification failure shouldn't affect the invitation result
      }
    }

    return result;
  } catch (error) {
    console.error(
      '[EventInvitations] Error bulk adding users to invitations:',
      error
    );
    throw error;
  }
};

/**
 * Add event notification subscription for user
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @param {string} studioId - Studio ID
 * @param {Object} settings - Notification settings
 * @returns {Promise<boolean>} Success status
 */
const addEventNotificationSubscription = async (
  userId,
  eventId,
  studioId,
  settings
) => {
  try {
    // This would integrate with the notification system
    // For now, just log the subscription
    console.log(
      `[EventInvitations] Added notification subscription for user ${userId}, event ${eventId}:`,
      settings
    );
    return true;
  } catch (error) {
    console.error(
      '[EventInvitations] Error adding notification subscription:',
      error
    );
    return false;
  }
};

export default {
  addUserToInvitations,
  removeUserFromInvitations,
  acceptInvitationAndSubscribe,
  declineInvitation,
  bulkAddUsersToInvitations,
};
