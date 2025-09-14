// FILE: services/phoneAccessService.js - Phone-based Event Access Management

import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';

/**
 * Normalize phone number for consistent storage and comparison
 * @param {string} phoneNumber - Raw phone number
 * @returns {string} Normalized phone number
 */
export const normalizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    console.warn(
      '[normalizePhoneNumber] Invalid phone number provided:',
      phoneNumber
    );
    return '';
  }

  try {
    // Remove all non-digit characters except +
    let normalized = phoneNumber.replace(/[^\d+]/g, '');

    // If it doesn't start with +, assume it's US and add +1
    if (!normalized.startsWith('+')) {
      if (normalized.length === 10) {
        normalized = '+1' + normalized;
      } else if (normalized.length === 11 && normalized.startsWith('1')) {
        normalized = '+' + normalized;
      }
    }

    return normalized;
  } catch (error) {
    console.error(
      '[normalizePhoneNumber] Error normalizing phone number:',
      error,
      'Input:',
      phoneNumber
    );
    return '';
  }
};

/**
 * Add phone numbers to event's invited phones access list
 * @param {string} studioId - Studio ID
 * @param {string} eventId - Event ID
 * @param {string[]} phoneNumbers - Array of phone numbers to add
 * @returns {Promise<boolean>} Success status
 */
export const addPhonesToEventAccess = async (
  studioId,
  eventId,
  phoneNumbers
) => {
  try {
    if (!studioId || !eventId || !phoneNumbers || phoneNumbers.length === 0) {
      return false;
    }

    // Normalize all phone numbers
    const normalizedPhones = phoneNumbers
      .map((phone) => normalizePhoneNumber(phone))
      .filter((phone) => phone.length > 0);

    if (normalizedPhones.length === 0) {
      return false;
    }

    const eventRef = doc(db, 'studios', studioId, 'events', eventId);

    // Add phones to invitedPhones array (uses arrayUnion to prevent duplicates)
    await updateDoc(eventRef, {
      invitedPhones: arrayUnion(...normalizedPhones),
    });

    console.log(
      `Added ${normalizedPhones.length} phone numbers to event ${eventId} access list`
    );
    return true;
  } catch (error) {
    console.error('Error adding phones to event access:', error);
    throw error;
  }
};

/**
 * Remove phone numbers from event's invited phones access list
 * @param {string} studioId - Studio ID
 * @param {string} eventId - Event ID
 * @param {string[]} phoneNumbers - Array of phone numbers to remove
 * @returns {Promise<boolean>} Success status
 */
export const removePhoneFromEventAccess = async (
  studioId,
  eventId,
  phoneNumbers
) => {
  try {
    if (!studioId || !eventId || !phoneNumbers || phoneNumbers.length === 0) {
      return false;
    }

    // Normalize all phone numbers
    const normalizedPhones = phoneNumbers
      .map((phone) => normalizePhoneNumber(phone))
      .filter((phone) => phone.length > 0);

    if (normalizedPhones.length === 0) {
      return false;
    }

    const eventRef = doc(db, 'studios', studioId, 'events', eventId);

    await updateDoc(eventRef, {
      invitedPhones: arrayRemove(...normalizedPhones),
    });

    console.log(
      `Removed ${normalizedPhones.length} phone numbers from event ${eventId} access list`
    );
    return true;
  } catch (error) {
    console.error('Error removing phones from event access:', error);
    throw error;
  }
};

/**
 * Check if a phone number has access to an event
 * @param {string} studioId - Studio ID
 * @param {string} eventId - Event ID
 * @param {string} phoneNumber - Phone number to check
 * @returns {Promise<boolean>} Whether phone has access
 */
export const checkPhoneEventAccess = async (studioId, eventId, phoneNumber) => {
  try {
    if (!studioId || !eventId || !phoneNumber) {
      return false;
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      return false;
    }

    const eventRef = doc(db, 'studios', studioId, 'events', eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      return false;
    }

    const eventData = eventDoc.data();
    const invitedPhones = eventData.invitedPhones || [];

    return invitedPhones.includes(normalizedPhone);
  } catch (error) {
    console.error('Error checking phone event access:', error);
    return false;
  }
};

/**
 * Get all events that a phone number has been invited to
 * @param {string} phoneNumber - Phone number to search for
 * @returns {Promise<Array>} Array of events with access
 */
export const getEventsForPhone = async (phoneNumber) => {
  try {
    if (!phoneNumber) {
      return [];
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      return [];
    }

    const events = [];

    // Search across all studios (this could be optimized with a phone->events index)
    const studiosRef = collection(db, 'studios');
    const studiosSnapshot = await getDocs(studiosRef);

    for (const studioDoc of studiosSnapshot.docs) {
      const studioId = studioDoc.id;
      const eventsRef = collection(db, 'studios', studioId, 'events');
      const eventsQuery = query(
        eventsRef,
        where('invitedPhones', 'array-contains', normalizedPhone)
      );
      const eventsSnapshot = await getDocs(eventsQuery);

      eventsSnapshot.docs.forEach((eventDoc) => {
        events.push({
          id: eventDoc.id,
          studioId: studioId,
          ...eventDoc.data(),
        });
      });
    }

    // Sort by event date descending
    events.sort((a, b) => {
      const dateA = a.eventTimestamp?.toDate() || new Date(0);
      const dateB = b.eventTimestamp?.toDate() || new Date(0);
      return dateB - dateA;
    });

    return events;
  } catch (error) {
    console.error('Error getting events for phone:', error);
    return [];
  }
};

/**
 * Auto-subscribe user to events they were invited to by phone
 * Called when user signs up or verifies phone number
 * @param {string} userId - User ID
 * @param {string} phoneNumber - User's verified phone number
 * @returns {Promise<Object>} Result with subscribed events
 */
export const autoSubscribeToInvitedEvents = async (userId, phoneNumber) => {
  try {
    if (!userId || !phoneNumber) {
      return { success: false, subscribedEvents: [] };
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    if (!normalizedPhone) {
      return { success: false, subscribedEvents: [] };
    }

    // Find all events this phone was invited to
    const invitedEvents = await getEventsForPhone(normalizedPhone);

    if (invitedEvents.length === 0) {
      return { success: true, subscribedEvents: [] };
    }

    const subscribedEvents = [];

    // Subscribe user to each event
    for (const event of invitedEvents) {
      try {
        // Check if user is already subscribed
        const isSubscribed = event.subscribers?.includes(userId) || false;

        if (!isSubscribed) {
          const eventRef = doc(
            db,
            'studios',
            event.studioId,
            'events',
            event.id
          );

          await updateDoc(eventRef, {
            subscribers: arrayUnion(userId),
            subscriberCount: (event.subscriberCount || 0) + 1,
          });

          subscribedEvents.push({
            eventId: event.id,
            studioId: event.studioId,
            title: event.title,
            eventTimestamp: event.eventTimestamp,
          });
        }
      } catch (error) {
        console.warn(`Failed to subscribe to event ${event.id}:`, error);
        // Continue with other events
      }
    }

    // Update user's subscribed events list if any were added
    if (subscribedEvents.length > 0) {
      const userRef = doc(db, 'users', userId);
      const eventIds = subscribedEvents.map((e) => e.eventId);

      await updateDoc(userRef, {
        subscribedEvents: arrayUnion(...eventIds),
      });
    }

    console.log(
      `Auto-subscribed user ${userId} to ${subscribedEvents.length} events based on phone ${normalizedPhone}`
    );

    return {
      success: true,
      subscribedEvents,
      totalFound: invitedEvents.length,
    };
  } catch (error) {
    console.error('Error auto-subscribing to invited events:', error);
    throw error;
  }
};
