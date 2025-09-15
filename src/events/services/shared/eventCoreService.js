// FILE: eventCoreService.js - Core Event Management Operations

import {
  doc,
  getDoc,
  deleteDoc,
  updateDoc,
  arrayRemove,
  increment,
  collection,
  query,
  where,
  getDocs,
  runTransaction
} from 'firebase/firestore';
import { db } from '../../../auth/services/firebase';
import {
  notifySubscribersOfCancellation,
  getEventSubscribers
} from '../../../services/shared/eventNotificationsService';

/**
 * Fetch event details by ID
 * @param {string} studioId - Studio ID
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Event data
 */
export const fetchEventDetails = async (studioId, eventId) => {
  try {
    const eventRef = doc(db, 'studios', studioId, 'events', eventId);
    const eventSnap = await getDoc(eventRef);

    if (!eventSnap.exists()) {
      throw new Error('Event not found');
    }

    return { id: eventSnap.id, ...eventSnap.data() };
  } catch (error) {
    console.error('[EventCore] Error fetching event details:', error);
    throw error;
  }
};

/**
 * Delete an event (only by creator)
 * @param {string} studioId - Studio ID
 * @param {string} eventId - Event ID
 * @param {string} currentUserId - User requesting deletion
 * @returns {Promise<Object>} Success result
 */
export const deleteEvent = async (studioId, eventId, currentUserId) => {
  try {
    return await runTransaction(db, async (transaction) => {
      const eventRef = doc(db, 'studios', studioId, 'events', eventId);
      const eventSnap = await transaction.get(eventRef);

      if (!eventSnap.exists()) {
        throw new Error('Event not found');
      }

      const eventData = eventSnap.data();

      // Only event creator can delete
      if (eventData.createdBy !== currentUserId) {
        throw new Error('Only event creator can delete event');
      }

      console.log('[EventCore] Deleting event:', eventId);
      console.log('[EventCore] Event subscribers:', eventData.subscribers);

      // Notify subscribers before deletion
      if (eventData.subscribers && eventData.subscribers.length > 0) {
        console.log('[EventCore] Sending cancellation notifications...');

        // Get host name for notification
        const hostDoc = await getDoc(doc(db, 'users', currentUserId));
        const hostName = hostDoc.exists()
          ? hostDoc.data()?.userdata?.contactInfo?.displayName || 'Event Host'
          : 'Event Host';

        // Send notifications (fire and forget to avoid transaction timeout)
        setTimeout(async () => {
          try {
            await notifySubscribersOfCancellation({
              eventId,
              eventTitle: eventData.title || 'Event',
              subscriberIds: eventData.subscribers,
              hostName,
              reason: 'Event has been deleted'
            });
          } catch (notificationError) {
            console.error('[EventCore] Failed to send cancellation notifications:', notificationError);
          }
        }, 0);
      }

      // Clean up user subscriptions and invitations
      const userCleanupPromises = [];

      // Clean up subscriber references
      if (eventData.subscribers) {
        eventData.subscribers.forEach(userId => {
          userCleanupPromises.push(
            updateDoc(doc(db, 'users', userId), {
              'userdata.subscribedEvents': arrayRemove(eventId),
              'userdata.metrics.events.subscribedEvents': arrayRemove(eventId)
            }).catch(err => console.warn(`Failed to clean up user ${userId}:`, err))
          );
        });
      }

      // Clean up invitation references
      if (eventData.invitations) {
        eventData.invitations.forEach(userId => {
          userCleanupPromises.push(
            updateDoc(doc(db, 'users', userId), {
              'userdata.invitedEvents': arrayRemove(eventId),
              'userdata.metrics.events.invitedEvents': arrayRemove(eventId)
            }).catch(err => console.warn(`Failed to clean up invited user ${userId}:`, err))
          );
        });
      }

      // Execute cleanup (fire and forget)
      setTimeout(() => {
        Promise.allSettled(userCleanupPromises).then(results => {
          const failed = results.filter(r => r.status === 'rejected').length;
          if (failed > 0) {
            console.warn(`[EventCore] ${failed} user cleanup operations failed`);
          } else {
            console.log('[EventCore] User cleanup completed successfully');
          }
        });
      }, 0);

      // Delete the event document
      transaction.delete(eventRef);

      return {
        success: true,
        notifiedUsers: eventData.subscribers?.length || 0
      };
    });
  } catch (error) {
    console.error('[EventCore] Error deleting event:', error);
    throw error;
  }
};

/**
 * Kick an attendee from event (host only)
 * @param {string} studioId - Studio ID
 * @param {string} eventId - Event ID
 * @param {string} attendeeId - User to kick
 * @param {string} hostId - Host user ID
 * @returns {Promise<Object>} Success result
 */
export const kickAttendee = async (studioId, eventId, attendeeId, hostId) => {
  try {
    return await runTransaction(db, async (transaction) => {
      const eventRef = doc(db, 'studios', studioId, 'events', eventId);
      const eventSnap = await transaction.get(eventRef);

      if (!eventSnap.exists()) {
        throw new Error('Event not found');
      }

      const eventData = eventSnap.data();

      // Verify host permissions
      if (eventData.createdBy !== hostId && !eventData.cohosts?.includes(hostId)) {
        throw new Error('Only event host or cohosts can kick attendees');
      }

      // Cannot kick yourself
      if (attendeeId === hostId) {
        throw new Error('Cannot kick yourself from your own event');
      }

      // Check if user is actually subscribed
      const currentSubscribers = eventData.subscribers || [];
      if (!currentSubscribers.includes(attendeeId)) {
        throw new Error('User is not subscribed to this event');
      }

      // Remove from event subscribers
      transaction.update(eventRef, {
        subscribers: arrayRemove(attendeeId),
        subscriberCount: increment(-1)
      });

      // Remove from user's subscribed events
      const userRef = doc(db, 'users', attendeeId);
      transaction.update(userRef, {
        'userdata.subscribedEvents': arrayRemove(eventId),
        'userdata.metrics.events.subscribedEvents': arrayRemove(eventId)
      });

      // Send notification to kicked user (fire and forget)
      setTimeout(async () => {
        try {
          const { NOTIFICATION_TYPES, NOTIFICATION_PRIORITY, notificationEngine } = await import('../../../services/shared/NotificationEngine');

          const hostDoc = await getDoc(doc(db, 'users', hostId));
          const hostName = hostDoc.exists()
            ? hostDoc.data()?.userdata?.contactInfo?.displayName || 'Event Host'
            : 'Event Host';

          await notificationEngine.createNotification({
            userId: attendeeId,
            type: NOTIFICATION_TYPES.EVENT_CANCELLED, // Closest available type
            title: 'Removed from Event',
            message: `You have been removed from "${eventData.title}" by ${hostName}`,
            data: {
              eventId,
              eventTitle: eventData.title,
              hostId,
              hostName,
              actionType: 'kicked'
            },
            priority: NOTIFICATION_PRIORITY.HIGH
          });
        } catch (notificationError) {
          console.error('[EventCore] Failed to send kick notification:', notificationError);
        }
      }, 0);

      console.log(`[EventCore] User ${attendeeId} kicked from event ${eventId} by ${hostId}`);

      return {
        success: true,
        remainingSubscribers: currentSubscribers.length - 1
      };
    });
  } catch (error) {
    console.error('[EventCore] Error kicking attendee:', error);
    throw error;
  }
};

/**
 * Get event invitation status for filtering
 * @param {string} eventId - Event ID
 * @param {string} studioId - Studio ID
 * @returns {Promise<Object>} Invitation status data
 */
export const getEventInvitationStatus = async (eventId, studioId) => {
  try {
    const eventRef = doc(db, 'studios', studioId, 'events', eventId);
    const eventSnap = await getDoc(eventRef);

    if (!eventSnap.exists()) {
      console.warn(`[EventCore] Event ${eventId} not found for invitation status`);
      return {
        invitations: [],
        subscribers: []
      };
    }

    const eventData = eventSnap.data();

    return {
      invitations: eventData.invitations || [],
      subscribers: eventData.subscribers || [],
      cohosts: eventData.cohosts || []
    };
  } catch (error) {
    console.error('[EventCore] Error getting event invitation status:', error);
    return {
      invitations: [],
      subscribers: [],
      cohosts: []
    };
  }
};

/**
 * Update event basic information
 * @param {string} studioId - Studio ID
 * @param {string} eventId - Event ID
 * @param {Object} updates - Fields to update
 * @param {string} currentUserId - User making the update
 * @returns {Promise<Object>} Success result
 */
export const updateEventDetails = async (studioId, eventId, updates, currentUserId) => {
  try {
    return await runTransaction(db, async (transaction) => {
      const eventRef = doc(db, 'studios', studioId, 'events', eventId);
      const eventSnap = await transaction.get(eventRef);

      if (!eventSnap.exists()) {
        throw new Error('Event not found');
      }

      const eventData = eventSnap.data();

      // Only event creator or cohosts can update
      if (eventData.createdBy !== currentUserId && !eventData.cohosts?.includes(currentUserId)) {
        throw new Error('Only event creator or cohosts can update event');
      }

      // Apply updates
      const validUpdates = {};
      const allowedFields = ['title', 'description', 'location', 'dateTime', 'endDateTime', 'maxGuests', 'isPrivate'];

      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key) && updates[key] !== undefined) {
          validUpdates[key] = updates[key];
        }
      });

      if (Object.keys(validUpdates).length === 0) {
        throw new Error('No valid updates provided');
      }

      validUpdates.lastUpdated = new Date();

      transaction.update(eventRef, validUpdates);

      console.log(`[EventCore] Event ${eventId} updated by ${currentUserId}:`, Object.keys(validUpdates));

      return {
        success: true,
        updatedFields: Object.keys(validUpdates)
      };
    });
  } catch (error) {
    console.error('[EventCore] Error updating event details:', error);
    throw error;
  }
};

export default {
  fetchEventDetails,
  deleteEvent,
  kickAttendee,
  getEventInvitationStatus,
  updateEventDetails,
};