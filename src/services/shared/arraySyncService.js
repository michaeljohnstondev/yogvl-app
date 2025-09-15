// FILE: arraySyncService.js - Array Synchronization Coordination Service

import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  runTransaction,
  collection,
  query,
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../auth/services/firebase';

/**
 * Ensures arrays stay synchronized between user and event documents
 * This prevents data inconsistencies that can cause invitation/subscription bugs
 */

/**
 * Synchronize user invitation arrays with event invitation arrays
 * @param {string} userId - User ID to sync
 * @param {string} eventId - Event ID to sync
 * @param {string} studioId - Studio ID
 * @param {string} operation - 'add' or 'remove'
 * @returns {Promise<Object>} Sync result
 */
export const syncInvitationArrays = async (userId, eventId, studioId, operation) => {
  try {
    return await runTransaction(db, async (transaction) => {
      const eventRef = doc(db, 'studios', studioId, 'events', eventId);
      const userRef = doc(db, 'users', userId);

      const [eventSnap, userSnap] = await Promise.all([
        transaction.get(eventRef),
        transaction.get(userRef)
      ]);

      if (!eventSnap.exists()) {
        throw new Error('Event not found');
      }

      if (!userSnap.exists()) {
        throw new Error('User not found');
      }

      const eventData = eventSnap.data();
      const userData = userSnap.data();

      const eventInvitations = eventData.invitations || [];
      const userInvitedEvents = userData.userdata?.invitedEvents || [];

      if (operation === 'add') {
        // Add to both arrays if not already present
        const updates = {};

        if (!eventInvitations.includes(userId)) {
          updates.invitations = arrayUnion(userId);
        }

        if (Object.keys(updates).length > 0) {
          transaction.update(eventRef, updates);
        }

        if (!userInvitedEvents.includes(eventId)) {
          transaction.update(userRef, {
            'userdata.invitedEvents': arrayUnion(eventId)
          });
        }

        console.log(`[ArraySync] Added invitation sync: user ${userId} ↔ event ${eventId}`);

      } else if (operation === 'remove') {
        // Remove from both arrays
        const updates = {};

        if (eventInvitations.includes(userId)) {
          updates.invitations = arrayRemove(userId);
        }

        if (Object.keys(updates).length > 0) {
          transaction.update(eventRef, updates);
        }

        if (userInvitedEvents.includes(eventId)) {
          transaction.update(userRef, {
            'userdata.invitedEvents': arrayRemove(eventId)
          });
        }

        console.log(`[ArraySync] Removed invitation sync: user ${userId} ↔ event ${eventId}`);
      }

      return {
        success: true,
        operation,
        userId,
        eventId,
        synchronized: true
      };
    });
  } catch (error) {
    console.error('[ArraySync] Error syncing invitation arrays:', error);
    throw error;
  }
};

/**
 * Synchronize user subscription arrays with event subscription arrays
 * @param {string} userId - User ID to sync
 * @param {string} eventId - Event ID to sync
 * @param {string} studioId - Studio ID
 * @param {string} operation - 'add' or 'remove'
 * @returns {Promise<Object>} Sync result
 */
export const syncSubscriptionArrays = async (userId, eventId, studioId, operation) => {
  try {
    return await runTransaction(db, async (transaction) => {
      const eventRef = doc(db, 'studios', studioId, 'events', eventId);
      const userRef = doc(db, 'users', userId);

      const [eventSnap, userSnap] = await Promise.all([
        transaction.get(eventRef),
        transaction.get(userRef)
      ]);

      if (!eventSnap.exists()) {
        throw new Error('Event not found');
      }

      if (!userSnap.exists()) {
        throw new Error('User not found');
      }

      const eventData = eventSnap.data();
      const userData = userSnap.data();

      const eventSubscribers = eventData.subscribers || [];
      const userSubscribedEvents = userData.userdata?.subscribedEvents || [];
      const userTopLevelSubscribed = userData.subscribedEvents || [];

      if (operation === 'add') {
        // Add to event subscribers if not present
        const eventUpdates = {};
        if (!eventSubscribers.includes(userId)) {
          eventUpdates.subscribers = arrayUnion(userId);
          eventUpdates.subscriberCount = (eventData.subscriberCount || 0) + 1;
        }

        if (Object.keys(eventUpdates).length > 0) {
          transaction.update(eventRef, eventUpdates);
        }

        // Add to both user arrays
        const userUpdates = {};
        if (!userSubscribedEvents.includes(eventId)) {
          userUpdates['userdata.subscribedEvents'] = arrayUnion(eventId);
        }
        if (!userTopLevelSubscribed.includes(eventId)) {
          userUpdates.subscribedEvents = arrayUnion(eventId);
        }

        if (Object.keys(userUpdates).length > 0) {
          transaction.update(userRef, userUpdates);
        }

        console.log(`[ArraySync] Added subscription sync: user ${userId} ↔ event ${eventId}`);

      } else if (operation === 'remove') {
        // Remove from event subscribers
        const eventUpdates = {};
        if (eventSubscribers.includes(userId)) {
          eventUpdates.subscribers = arrayRemove(userId);
          eventUpdates.subscriberCount = Math.max(0, (eventData.subscriberCount || 1) - 1);
        }

        if (Object.keys(eventUpdates).length > 0) {
          transaction.update(eventRef, eventUpdates);
        }

        // Remove from both user arrays
        const userUpdates = {};
        if (userSubscribedEvents.includes(eventId)) {
          userUpdates['userdata.subscribedEvents'] = arrayRemove(eventId);
        }
        if (userTopLevelSubscribed.includes(eventId)) {
          userUpdates.subscribedEvents = arrayRemove(eventId);
        }

        if (Object.keys(userUpdates).length > 0) {
          transaction.update(userRef, userUpdates);
        }

        console.log(`[ArraySync] Removed subscription sync: user ${userId} ↔ event ${eventId}`);
      }

      return {
        success: true,
        operation,
        userId,
        eventId,
        synchronized: true
      };
    });
  } catch (error) {
    console.error('[ArraySync] Error syncing subscription arrays:', error);
    throw error;
  }
};

/**
 * Atomic invitation-to-subscription transition with perfect synchronization
 * @param {string} userId - User accepting invitation
 * @param {string} eventId - Event ID
 * @param {string} studioId - Studio ID
 * @returns {Promise<Object>} Transition result
 */
export const atomicInvitationToSubscription = async (userId, eventId, studioId) => {
  try {
    return await runTransaction(db, async (transaction) => {
      const eventRef = doc(db, 'studios', studioId, 'events', eventId);
      const userRef = doc(db, 'users', userId);

      const [eventSnap, userSnap] = await Promise.all([
        transaction.get(eventRef),
        transaction.get(userRef)
      ]);

      if (!eventSnap.exists()) {
        throw new Error('Event not found');
      }

      if (!userSnap.exists()) {
        throw new Error('User not found');
      }

      const eventData = eventSnap.data();
      const userData = userSnap.data();

      const eventInvitations = eventData.invitations || [];
      const eventSubscribers = eventData.subscribers || [];
      const userInvitedEvents = userData.userdata?.invitedEvents || [];
      const userSubscribedEvents = userData.userdata?.subscribedEvents || [];
      const userTopLevelSubscribed = userData.subscribedEvents || [];

      // Validation
      if (!eventInvitations.includes(userId)) {
        throw new Error('User not found in event invitations');
      }

      if (eventSubscribers.includes(userId)) {
        throw new Error('User already subscribed to event');
      }

      // Atomic transition: invitation → subscription
      // Event updates
      transaction.update(eventRef, {
        invitations: arrayRemove(userId),
        subscribers: arrayUnion(userId),
        subscriberCount: (eventData.subscriberCount || 0) + 1
      });

      // User updates - sync all arrays
      transaction.update(userRef, {
        'userdata.invitedEvents': arrayRemove(eventId),
        'userdata.subscribedEvents': arrayUnion(eventId),
        subscribedEvents: arrayUnion(eventId)
      });

      console.log(`[ArraySync] Atomic transition: user ${userId} invitation → subscription for event ${eventId}`);

      return {
        success: true,
        userId,
        eventId,
        transitioned: true,
        newSubscriberCount: (eventData.subscriberCount || 0) + 1
      };
    });
  } catch (error) {
    console.error('[ArraySync] Error in atomic invitation to subscription:', error);
    throw error;
  }
};

/**
 * Audit and repair array synchronization issues
 * @param {string} userId - User to audit (optional)
 * @param {string} eventId - Event to audit (optional)
 * @param {string} studioId - Studio to audit (required if eventId provided)
 * @returns {Promise<Object>} Audit results and repairs
 */
export const auditAndRepairArraySync = async (userId = null, eventId = null, studioId = null) => {
  try {
    const issues = [];
    const repairs = [];

    if (userId && eventId && studioId) {
      // Audit specific user-event relationship
      const eventRef = doc(db, 'studios', studioId, 'events', eventId);
      const userRef = doc(db, 'users', userId);

      const [eventSnap, userSnap] = await Promise.all([
        getDoc(eventRef),
        getDoc(userRef)
      ]);

      if (eventSnap.exists() && userSnap.exists()) {
        const eventData = eventSnap.data();
        const userData = userSnap.data();

        const eventInvitations = eventData.invitations || [];
        const eventSubscribers = eventData.subscribers || [];
        const userInvitedEvents = userData.userdata?.invitedEvents || [];
        const userSubscribedEvents = userData.userdata?.subscribedEvents || [];

        // Check invitation sync
        const userInEventInvitations = eventInvitations.includes(userId);
        const eventInUserInvitations = userInvitedEvents.includes(eventId);

        if (userInEventInvitations !== eventInUserInvitations) {
          issues.push({
            type: 'invitation_mismatch',
            userId,
            eventId,
            eventHasUser: userInEventInvitations,
            userHasEvent: eventInUserInvitations
          });

          // Repair by removing from both (safer than adding)
          if (userInEventInvitations) {
            await updateDoc(eventRef, { invitations: arrayRemove(userId) });
            repairs.push(`Removed user ${userId} from event ${eventId} invitations`);
          }
          if (eventInUserInvitations) {
            await updateDoc(userRef, { 'userdata.invitedEvents': arrayRemove(eventId) });
            repairs.push(`Removed event ${eventId} from user ${userId} invited events`);
          }
        }

        // Check subscription sync
        const userInEventSubscribers = eventSubscribers.includes(userId);
        const eventInUserSubscriptions = userSubscribedEvents.includes(eventId);

        if (userInEventSubscribers !== eventInUserSubscriptions) {
          issues.push({
            type: 'subscription_mismatch',
            userId,
            eventId,
            eventHasUser: userInEventSubscribers,
            userHasEvent: eventInUserSubscriptions
          });

          // Repair by syncing both directions
          if (userInEventSubscribers && !eventInUserSubscriptions) {
            await updateDoc(userRef, {
              'userdata.subscribedEvents': arrayUnion(eventId),
              subscribedEvents: arrayUnion(eventId)
            });
            repairs.push(`Added event ${eventId} to user ${userId} subscriptions`);
          } else if (!userInEventSubscribers && eventInUserSubscriptions) {
            await updateDoc(eventRef, {
              subscribers: arrayUnion(userId),
              subscriberCount: (eventData.subscriberCount || 0) + 1
            });
            repairs.push(`Added user ${userId} to event ${eventId} subscribers`);
          }
        }
      }
    }

    return {
      success: true,
      issuesFound: issues.length,
      issues,
      repairsApplied: repairs.length,
      repairs
    };
  } catch (error) {
    console.error('[ArraySync] Error in audit and repair:', error);
    throw error;
  }
};

export default {
  syncInvitationArrays,
  syncSubscriptionArrays,
  atomicInvitationToSubscription,
  auditAndRepairArraySync,
};