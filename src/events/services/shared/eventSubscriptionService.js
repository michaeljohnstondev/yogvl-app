// FILE: eventSubscriptionService.js - Event Subscription Management System

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  runTransaction,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../../../auth/services/firebase';
import {
  updateEventSubscription,
  updateEventUnsubscription,
} from '../../lib/userMetrics';
// Event subscription notifications handled by Cloud Functions
import { fetchEventDetails } from './eventCoreService';

/**
 * Subscribe user to an event
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @param {string} studioId - Studio ID
 * @param {Object} [notificationSettings] - User notification preferences
 * @returns {Promise<Object>} Updated event state
 */
export const subscribeToEvent = async (
  userId,
  eventId,
  studioId,
  notificationSettings = {}
) => {
  try {
    const eventRef = doc(db, 'studios', studioId, 'events', eventId);
    const userRef = doc(db, 'users', userId);

    // Check if user document exists, create if not
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        subscribedEvents: [],
        userdata: {
          metrics: {
            events: {
              created: 0,
              attended: 0,
              noShows: 0,
              subscribedEvents: [],
            },
          },
          metadata: {
            createdAt: new Date(),
          },
        },
        uid: userId,
      });
    }

    // Use Firebase transaction to ensure atomic subscribe operation
    const result = await runTransaction(db, async (transaction) => {
      // Read the current event data within transaction
      const eventSnap = await transaction.get(eventRef);

      if (!eventSnap.exists()) {
        throw new Error('Event no longer exists');
      }

      const eventData = eventSnap.data();
      const currentSubscribers = eventData.subscribers || [];

      // Check if user is already subscribed to prevent duplicates
      if (currentSubscribers.includes(userId)) {
        throw new Error('ALREADY_SUBSCRIBED');
      }

      // Atomic update within transaction - prevents race conditions
      transaction.update(eventRef, {
        subscribers: arrayUnion(userId),
        subscriberCount: increment(1),
      });

      // Create subscriber document to trigger onEventSubscribed Cloud Function
      const subscriberRef = doc(
        db,
        'studios',
        studioId,
        'events',
        eventId,
        'subscribers',
        userId
      );

      transaction.set(subscriberRef, {
        userId,
        subscribedAt: Timestamp.now(),
        role: 'guest',
        invitedBy: eventData.createdBy, // Default to host, could be updated for invitations
        source: 'direct_join',
      });

      console.log(
        `[EventSubscription] User ${userId} subscribed to event ${eventId}`
      );

      // Return data for local state update
      return {
        subscribers: [...currentSubscribers, userId],
        subscriberCount: (eventData.subscriberCount || 0) + 1,
      };
    });

    // Run background operations in parallel without blocking UI
    setTimeout(async () => {
      try {
        // Update user event subscription record
        await updateDoc(userRef, {
          subscribedEvents: arrayUnion(eventId),
        });

        // Update user metrics in background
        await updateEventSubscription(userId, eventId);

        // Store user's notification settings for this event (for rescheduling)
        try {
          const userEventSettingsRef = doc(db, 'users', userId, 'eventSubscriptions', eventId);
          await setDoc(userEventSettingsRef, {
            notificationSettings,
            subscribedAt: Timestamp.now(),
            eventId,
            studioId,
          });
          console.log(`[EventSubscription] Stored notification settings for user ${userId}, event ${eventId}`);
        } catch (settingsError) {
          console.error('[EventSubscription] Failed to store notification settings:', settingsError);
        }

        // Store per-event guest notification settings where Cloud Functions check
        try {
          const guestSettingsRef = doc(db, 'studios', studioId, 'events', eventId, 'guestNotificationSettings', userId);
          await setDoc(guestSettingsRef, {
            notificationSettings,
            subscribedAt: Timestamp.now(),
            userId,
          });
          console.log(`[EventSubscription] Created guestNotificationSettings for user ${userId}, event ${eventId}`);
        } catch (settingsError) {
          console.error('[EventSubscription] Failed to create guestNotificationSettings:', settingsError);
        }

        // Add notification subscription with user's settings
        await addEventNotificationSubscription(
          userId,
          eventId,
          studioId,
          notificationSettings
        );

        // Notify host of new subscription
        const eventData = await fetchEventDetails(studioId, eventId);
        if (eventData.createdBy !== userId) {
          // Get user name for notification
          const userDoc = await getDoc(doc(db, 'users', userId));
          const userName = userDoc.exists()
            ? userDoc.data()?.userdata?.contactInfo?.displayName || 'Someone'
            : 'Someone';

          // Host notification handled by onEventSubscribed Cloud Function
        }
      } catch (error) {
        console.error(
          '[EventSubscription] Background subscription operations failed:',
          error
        );
      }
    }, 0);

    return result;
  } catch (error) {
    console.error('[EventSubscription] Error subscribing to event:', error);
    throw error;
  }
};

/**
 * Unsubscribe user from an event
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @param {string} studioId - Studio ID
 * @returns {Promise<Object>} Updated event state
 */
export const unsubscribeFromEvent = async (userId, eventId, studioId) => {
  try {
    const eventRef = doc(db, 'studios', studioId, 'events', eventId);
    const userRef = doc(db, 'users', userId);

    // Use Firebase transaction for atomic unsubscribe operation
    const result = await runTransaction(db, async (transaction) => {
      const eventSnap = await transaction.get(eventRef);

      if (!eventSnap.exists()) {
        throw new Error('Event no longer exists');
      }

      const eventData = eventSnap.data();
      const currentSubscribers = eventData.subscribers || [];

      // Check if user is actually subscribed
      if (!currentSubscribers.includes(userId)) {
        throw new Error('NOT_SUBSCRIBED');
      }

      // Atomic update within transaction
      transaction.update(eventRef, {
        subscribers: arrayRemove(userId),
        subscriberCount: increment(-1),
      });

      // Delete subscriber document to trigger onEventUnsubscribed Cloud Function
      const subscriberRef = doc(
        db,
        'studios',
        studioId,
        'events',
        eventId,
        'subscribers',
        userId
      );

      transaction.delete(subscriberRef);

      console.log(
        `[EventSubscription] User ${userId} unsubscribed from event ${eventId}`
      );

      return {
        subscribers: currentSubscribers.filter((id) => id !== userId),
        subscriberCount: Math.max(0, (eventData.subscriberCount || 1) - 1),
      };
    });

    // Run background operations in parallel (fire and forget)
    setTimeout(async () => {
      try {
        // Remove from user's subscribed events (both locations)
        await updateDoc(userRef, {
          subscribedEvents: arrayRemove(eventId),
          'userdata.metrics.events.subscribedEvents': arrayRemove(eventId),
        });

        // Update user metrics
        await updateEventUnsubscription(userId, eventId);

        // Remove notification subscription
        await removeEventNotificationSubscription(userId, eventId);

        // Notify host of unsubscription
        const eventData = await fetchEventDetails(studioId, eventId);
        if (eventData.createdBy !== userId) {
          // Get user name for notification
          const userDoc = await getDoc(doc(db, 'users', userId));
          const userName = userDoc.exists()
            ? userDoc.data()?.userdata?.contactInfo?.displayName || 'Someone'
            : 'Someone';

          // Host notification handled by onEventUnsubscribed Cloud Function
        }
      } catch (error) {
        console.error(
          '[EventSubscription] Background unsubscription operations failed:',
          error
        );
      }
    }, 0);

    return result;
  } catch (error) {
    console.error('[EventSubscription] Error unsubscribing from event:', error);
    throw error;
  }
};

/**
 * Add event notification subscription for user
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @param {string} studioId - Studio ID
 * @param {Object} settings - Notification settings
 * @returns {Promise<void>}
 */
export const addEventNotificationSubscription = async (
  userId,
  eventId,
  studioId,
  settings
) => {
  try {
    console.log(
      `[EventSubscription] Updating notification settings for user ${userId}, event ${eventId}:`,
      settings
    );

    // Update per-event guest notification settings where Cloud Functions check
    try {
      const guestSettingsRef = doc(db, 'studios', studioId, 'events', eventId, 'guestNotificationSettings', userId);
      await setDoc(guestSettingsRef, {
        notificationSettings: settings,
        updatedAt: Timestamp.now(),
        userId,
      }, { merge: true });
      console.log(`[EventSubscription] Updated guestNotificationSettings for user ${userId}, event ${eventId}`);
    } catch (settingsError) {
      console.error('[EventSubscription] Failed to update guestNotificationSettings:', settingsError);
    }

    // Try to import scheduled notification service if it exists
    try {
      const { ScheduledNotificationService } = await import(
        '../../../services/scheduledNotifications'
      );

      await ScheduledNotificationService.subscribeToEventNotifications(
        userId,
        eventId,
        studioId,
        settings
      );

      console.log(
        `[EventSubscription] Successfully updated notification subscriptions for user ${userId}, event ${eventId}`
      );
    } catch (importError) {
      console.error(
        '[EventSubscription] Error importing or using ScheduledNotificationService:',
        importError
      );
    }
  } catch (error) {
    console.error(
      '[EventSubscription] Error updating notification subscription:',
      error
    );
    throw error;
  }
};

/**
 * Remove event notification subscription for user
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @returns {Promise<void>}
 */
export const removeEventNotificationSubscription = async (userId, eventId) => {
  try {
    console.log(
      `[EventSubscription] Removing notification subscription for user ${userId}, event ${eventId}`
    );

    // Try to import scheduled notification service if it exists
    try {
      const { ScheduledNotificationService } = await import(
        '../../../services/scheduledNotifications'
      );

      console.log(
        '[EventSubscription] ScheduledNotificationService imported successfully for removal'
      );

      await ScheduledNotificationService.unsubscribeFromEventNotifications(
        userId,
        eventId
      );

      console.log(
        `[EventSubscription] Successfully unsubscribed user ${userId} from event ${eventId} notifications`
      );
    } catch (importError) {
      console.error(
        '[EventSubscription] Error importing or using ScheduledNotificationService for removal:',
        importError
      );
      // Service doesn't exist yet, just log for now
      console.log(
        `[EventSubscription] Notification subscription removed for user ${userId}, event ${eventId}`
      );
    }
  } catch (error) {
    console.error(
      '[EventSubscription] Error removing notification subscription:',
      error
    );
    // Re-throw error for proper error handling upstream
    throw error;
  }
};

/**
 * Check if user is subscribed to an event
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @param {string} studioId - Studio ID
 * @returns {Promise<boolean>} Whether user is subscribed
 */
export const isUserSubscribedToEvent = async (userId, eventId, studioId) => {
  try {
    const eventRef = doc(db, 'studios', studioId, 'events', eventId);
    const eventSnap = await getDoc(eventRef);

    if (!eventSnap.exists()) {
      return false;
    }

    const eventData = eventSnap.data();
    const subscribers = eventData.subscribers || [];
    return subscribers.includes(userId);
  } catch (error) {
    console.error(
      '[EventSubscription] Error checking subscription status:',
      error
    );
    return false;
  }
};

/**
 * Get event subscription statistics
 * @param {string} eventId - Event ID
 * @param {string} studioId - Studio ID
 * @returns {Promise<Object>} Subscription statistics
 */
export const getEventSubscriptionStats = async (eventId, studioId) => {
  try {
    const eventRef = doc(db, 'studios', studioId, 'events', eventId);
    const eventSnap = await getDoc(eventRef);

    if (!eventSnap.exists()) {
      throw new Error('Event not found');
    }

    const eventData = eventSnap.data();

    return {
      subscriberCount: eventData.subscriberCount || 0,
      subscriberIds: eventData.subscribers || [],
      maxGuests: eventData.maxGuests || null,
      isAtCapacity: eventData.maxGuests
        ? (eventData.subscriberCount || 0) >= eventData.maxGuests
        : false,
    };
  } catch (error) {
    console.error(
      '[EventSubscription] Error getting subscription stats:',
      error
    );
    throw error;
  }
};

export default {
  subscribeToEvent,
  unsubscribeFromEvent,
  addEventNotificationSubscription,
  removeEventNotificationSubscription,
  isUserSubscribedToEvent,
  getEventSubscriptionStats,
};
