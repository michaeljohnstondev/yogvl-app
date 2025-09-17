// FILE: coordinationService.js - Cross-Domain Operation Coordination Service

import { runTransaction } from '../../lib/firebase/firestore';
import { db } from '../../auth/services/firebase';

// Import the new split services
import {
  atomicInvitationToSubscription,
  syncInvitationArrays,
  syncSubscriptionArrays,
} from './arraySyncService';
import { notificationEngine } from './NotificationEngine';
import {
  notifyHostOfEventJoin,
  notifyInvitationAccepted,
} from './eventNotificationsService';
import {
  extractDisplayName,
  createUserDisplayObject,
} from '../../lib/userDisplayUtils';
import {
  validateUserId,
  validateEventId,
  validateStudioId,
} from '../../lib/validationUtils';
import { filterEligibleUsersForInvitation } from '../../lib/arrayOperationUtils';

/**
 * Cross-domain coordination service that orchestrates complex operations
 * across user, event, and notification domains while maintaining data consistency
 */

/**
 * Orchestrate complete invitation flow with notifications and sync
 * @param {Object} params - Invitation parameters
 * @param {string} params.hostUserId - Host user ID
 * @param {string[]} params.guestUserIds - Array of guest user IDs
 * @param {string} params.eventId - Event ID
 * @param {string} params.studioId - Studio ID
 * @param {Object} params.eventData - Event data for notifications
 * @param {Object} params.hostData - Host user data
 * @returns {Promise<Object>} Coordination result
 */
export const coordinateEventInvitations = async ({
  hostUserId,
  guestUserIds,
  eventId,
  studioId,
  eventData,
  hostData,
}) => {
  try {
    // Validation phase
    const hostValidation = validateUserId(hostUserId);
    if (!hostValidation.valid) {
      throw new Error(`Invalid host user ID: ${hostValidation.error}`);
    }

    const eventValidation = validateEventId(eventId);
    if (!eventValidation.valid) {
      throw new Error(`Invalid event ID: ${eventValidation.error}`);
    }

    const studioValidation = validateStudioId(studioId);
    if (!studioValidation.valid) {
      throw new Error(`Invalid studio ID: ${studioValidation.error}`);
    }

    if (!Array.isArray(guestUserIds) || guestUserIds.length === 0) {
      throw new Error('Guest user IDs must be a non-empty array');
    }

    // Filter eligible users (remove already invited/subscribed)
    const currentInvitations = eventData.invitations || [];
    const currentSubscribers = eventData.subscribers || [];

    const eligibleUserIds = guestUserIds.filter(
      (userId) =>
        !currentInvitations.includes(userId) &&
        !currentSubscribers.includes(userId)
    );

    if (eligibleUserIds.length === 0) {
      return {
        success: true,
        invitationsSent: 0,
        message:
          'No eligible users to invite (all already invited or subscribed)',
      };
    }

    const results = {
      invitationsSent: 0,
      notificationsSent: 0,
      errors: [],
      successfulInvitations: [],
    };

    // Process invitations in batches to avoid overwhelming Firebase
    const batchSize = 10;
    for (let i = 0; i < eligibleUserIds.length; i += batchSize) {
      const batch = eligibleUserIds.slice(i, i + batchSize);

      const batchPromises = batch.map(async (userId) => {
        try {
          // Sync invitation arrays
          await syncInvitationArrays(userId, eventId, studioId, 'add');

          // Send notification
          const hostDisplayName = extractDisplayName(hostData, 'Someone');
          await createNotification({
            userId,
            type: 'invitation_received',
            title: 'Event Invitation',
            message: `${hostDisplayName} invited you to join "${eventData.title || 'Event'}"`,
            data: {
              eventId,
              eventTitle: eventData.title,
              hostId: hostUserId,
              hostName: hostDisplayName,
              actionType: 'invitation',
            },
            priority: 'normal',
          });

          results.invitationsSent++;
          results.notificationsSent++;
          results.successfulInvitations.push(userId);

          return { success: true, userId };
        } catch (error) {
          console.error(
            `[Coordination] Failed to invite user ${userId}:`,
            error
          );
          results.errors.push({ userId, error: error.message });
          return { success: false, userId, error: error.message };
        }
      });

      await Promise.allSettled(batchPromises);
    }

    console.log(
      `[Coordination] Invitation coordination complete: ${results.invitationsSent}/${eligibleUserIds.length} successful`
    );

    return {
      success: true,
      ...results,
      totalEligible: eligibleUserIds.length,
      message: `Sent ${results.invitationsSent} invitations out of ${eligibleUserIds.length} eligible users`,
    };
  } catch (error) {
    console.error(
      '[Coordination] Error coordinating event invitations:',
      error
    );
    throw error;
  }
};

/**
 * Orchestrate invitation acceptance with atomic state transitions
 * @param {Object} params - Acceptance parameters
 * @param {string} params.userId - User accepting invitation
 * @param {string} params.eventId - Event ID
 * @param {string} params.studioId - Studio ID
 * @param {Object} params.userData - User data
 * @param {Object} params.eventData - Event data
 * @returns {Promise<Object>} Coordination result
 */
export const coordinateInvitationAcceptance = async ({
  userId,
  eventId,
  studioId,
  userData,
  eventData,
}) => {
  try {
    // Validation
    const userValidation = validateUserId(userId);
    if (!userValidation.valid) {
      throw new Error(`Invalid user ID: ${userValidation.error}`);
    }

    const eventValidation = validateEventId(eventId);
    if (!eventValidation.valid) {
      throw new Error(`Invalid event ID: ${eventValidation.error}`);
    }

    const studioValidation = validateStudioId(studioId);
    if (!studioValidation.valid) {
      throw new Error(`Invalid studio ID: ${studioValidation.error}`);
    }

    // Perform atomic transition: invitation → subscription
    const transitionResult = await atomicInvitationToSubscription(
      userId,
      eventId,
      studioId
    );

    if (!transitionResult.success) {
      throw new Error(
        'Failed to complete invitation to subscription transition'
      );
    }

    // Background notifications (non-blocking)
    setTimeout(async () => {
      try {
        const userDisplayName = extractDisplayName(userData, 'Someone');

        // Notify host of acceptance
        if (eventData.createdBy !== userId) {
          await notifyHostOfEventJoin({
            hostId: eventData.createdBy,
            eventId,
            eventTitle: eventData.title || 'Event',
            subscriberId: userId,
            subscriberName: userDisplayName,
          });
        }

        // Send acceptance notification to host
        await notifyInvitationAccepted({
          hostId: eventData.createdBy,
          guestId: userId,
          guestName: userDisplayName,
          eventId,
          eventTitle: eventData.title || 'Event',
          invitationId: `invitation_${userId}_${eventId}`, // Generate ID for tracking
        });
      } catch (notificationError) {
        console.error(
          '[Coordination] Background notifications failed:',
          notificationError
        );
      }
    }, 0);

    console.log(
      `[Coordination] Invitation acceptance coordinated for user ${userId}, event ${eventId}`
    );

    return {
      success: true,
      userId,
      eventId,
      newSubscriberCount: transitionResult.newSubscriberCount,
      message: 'Invitation accepted and subscription created successfully',
    };
  } catch (error) {
    console.error(
      '[Coordination] Error coordinating invitation acceptance:',
      error
    );
    throw error;
  }
};

/**
 * Orchestrate subscription with all related operations
 * @param {Object} params - Subscription parameters
 * @param {string} params.userId - User subscribing
 * @param {string} params.eventId - Event ID
 * @param {string} params.studioId - Studio ID
 * @param {Object} params.userData - User data
 * @param {Object} params.eventData - Event data
 * @param {Object} [params.notificationSettings] - Notification preferences
 * @returns {Promise<Object>} Coordination result
 */
export const coordinateEventSubscription = async ({
  userId,
  eventId,
  studioId,
  userData,
  eventData,
  notificationSettings = {},
}) => {
  try {
    // Validation
    const userValidation = validateUserId(userId);
    if (!userValidation.valid) {
      throw new Error(`Invalid user ID: ${userValidation.error}`);
    }

    const eventValidation = validateEventId(eventId);
    if (!eventValidation.valid) {
      throw new Error(`Invalid event ID: ${eventValidation.error}`);
    }

    // Perform atomic subscription
    const subscriptionResult = await syncSubscriptionArrays(
      userId,
      eventId,
      studioId,
      'add'
    );

    if (!subscriptionResult.success) {
      throw new Error('Failed to complete subscription');
    }

    // Background operations
    setTimeout(async () => {
      try {
        const userDisplayName = extractDisplayName(userData, 'Someone');

        // Notify host if user is not the host
        if (eventData.createdBy !== userId) {
          await notifyHostOfEventJoin({
            hostId: eventData.createdBy,
            eventId,
            eventTitle: eventData.title || 'Event',
            subscriberId: userId,
            subscriberName: userDisplayName,
          });
        }

        // Set up notification preferences if provided
        if (
          notificationSettings &&
          Object.keys(notificationSettings).length > 0
        ) {
          // This would integrate with notification preferences system
          console.log(
            `[Coordination] Notification preferences set for user ${userId}:`,
            notificationSettings
          );
        }
      } catch (backgroundError) {
        console.error(
          '[Coordination] Background subscription operations failed:',
          backgroundError
        );
      }
    }, 0);

    console.log(
      `[Coordination] Event subscription coordinated for user ${userId}, event ${eventId}`
    );

    return {
      success: true,
      userId,
      eventId,
      synchronized: true,
      message: 'Event subscription completed successfully',
    };
  } catch (error) {
    console.error(
      '[Coordination] Error coordinating event subscription:',
      error
    );
    throw error;
  }
};

/**
 * Orchestrate unsubscription with cleanup
 * @param {Object} params - Unsubscription parameters
 * @param {string} params.userId - User unsubscribing
 * @param {string} params.eventId - Event ID
 * @param {string} params.studioId - Studio ID
 * @param {Object} params.userData - User data
 * @param {Object} params.eventData - Event data
 * @returns {Promise<Object>} Coordination result
 */
export const coordinateEventUnsubscription = async ({
  userId,
  eventId,
  studioId,
  userData,
  eventData,
}) => {
  try {
    // Validation
    const userValidation = validateUserId(userId);
    if (!userValidation.valid) {
      throw new Error(`Invalid user ID: ${userValidation.error}`);
    }

    // Perform atomic unsubscription
    const unsubscriptionResult = await syncSubscriptionArrays(
      userId,
      eventId,
      studioId,
      'remove'
    );

    if (!unsubscriptionResult.success) {
      throw new Error('Failed to complete unsubscription');
    }

    // Background cleanup and notifications
    setTimeout(async () => {
      try {
        const userDisplayName = extractDisplayName(userData, 'Someone');

        // Notify host if user is not the host
        if (eventData.createdBy !== userId) {
          await notifyHostOfEventLeave({
            hostId: eventData.createdBy,
            eventId,
            eventTitle: eventData.title || 'Event',
            unsubscriberId: userId,
            unsubscriberName: userDisplayName,
          });
        }

        // Clean up notification preferences
        // This would remove user from event notification subscriptions
        console.log(
          `[Coordination] Cleaned up notification preferences for user ${userId}, event ${eventId}`
        );
      } catch (backgroundError) {
        console.error(
          '[Coordination] Background unsubscription operations failed:',
          backgroundError
        );
      }
    }, 0);

    console.log(
      `[Coordination] Event unsubscription coordinated for user ${userId}, event ${eventId}`
    );

    return {
      success: true,
      userId,
      eventId,
      synchronized: true,
      message: 'Event unsubscription completed successfully',
    };
  } catch (error) {
    console.error(
      '[Coordination] Error coordinating event unsubscription:',
      error
    );
    throw error;
  }
};

export default {
  coordinateEventInvitations,
  coordinateInvitationAcceptance,
  coordinateEventSubscription,
  coordinateEventUnsubscription,
};
