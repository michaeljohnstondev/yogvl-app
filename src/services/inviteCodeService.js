// FILE: services/inviteCodeService.js - Invite Code Generation and Validation

import {
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  collection,
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';

/**
 * Generate a unique invite code for an event
 * Format: BVS-XXXX (4 characters: letters + numbers, excluding confusing ones)
 */
export const generateInviteCode = () => {
  // Use characters that are easy to distinguish (no 0, O, I, 1, etc.)
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = 'BVS-';

  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
};

/**
 * Check if invite code is unique across all studios/events
 */
export const isInviteCodeUnique = async (code) => {
  try {
    // Search across all studios for events with this invite code
    const studiosRef = collection(db, 'studios');
    const studiosSnapshot = await getDocs(studiosRef);

    for (const studioDoc of studiosSnapshot.docs) {
      const eventsRef = collection(db, 'studios', studioDoc.id, 'events');
      const eventsQuery = query(eventsRef, where('inviteCode', '==', code));
      const eventsSnapshot = await getDocs(eventsQuery);

      if (!eventsSnapshot.empty) {
        return false; // Code already exists
      }
    }

    return true; // Code is unique
  } catch (error) {
    console.error('Error checking invite code uniqueness:', error);
    return false;
  }
};

/**
 * Generate a unique invite code (tries multiple times if needed)
 */
export const generateUniqueInviteCode = async () => {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const code = generateInviteCode();
    const isUnique = await isInviteCodeUnique(code);

    if (isUnique) {
      return code;
    }

    attempts++;
  }

  throw new Error(
    'Unable to generate unique invite code after multiple attempts'
  );
};

/**
 * Add invite code to an event
 */
export const enableInviteCodeForEvent = async (studioId, eventId) => {
  try {
    const eventRef = doc(db, 'studios', studioId, 'events', eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      throw new Error('Event not found');
    }

    const eventData = eventDoc.data();

    // If event already has invite code, just enable it
    if (eventData.inviteCode) {
      await updateDoc(eventRef, {
        inviteCodeEnabled: true,
      });
      return eventData.inviteCode;
    }

    // Generate new unique invite code
    const inviteCode = await generateUniqueInviteCode();

    await updateDoc(eventRef, {
      inviteCode,
      inviteCodeEnabled: true,
    });

    return inviteCode;
  } catch (error) {
    console.error('Error enabling invite code for event:', error);
    throw error;
  }
};

/**
 * Disable invite code access for an event
 */
export const disableInviteCodeForEvent = async (studioId, eventId) => {
  try {
    const eventRef = doc(db, 'studios', studioId, 'events', eventId);
    await updateDoc(eventRef, {
      inviteCodeEnabled: false,
    });
  } catch (error) {
    console.error('Error disabling invite code for event:', error);
    throw error;
  }
};

/**
 * Find event by invite code
 */
export const findEventByInviteCode = async (inviteCode) => {
  try {
    // Search across all studios for event with this invite code
    const studiosRef = collection(db, 'studios');
    const studiosSnapshot = await getDocs(studiosRef);

    for (const studioDoc of studiosSnapshot.docs) {
      const eventsRef = collection(db, 'studios', studioDoc.id, 'events');
      const eventsQuery = query(
        eventsRef,
        where('inviteCode', '==', inviteCode),
        where('inviteCodeEnabled', '==', true)
      );
      const eventsSnapshot = await getDocs(eventsQuery);

      if (!eventsSnapshot.empty) {
        const eventDoc = eventsSnapshot.docs[0];
        return {
          eventId: eventDoc.id,
          studioId: studioDoc.id,
          eventData: eventDoc.data(),
        };
      }
    }

    return null; // No event found with this code
  } catch (error) {
    console.error('Error finding event by invite code:', error);
    return null;
  }
};

/**
 * Validate if user can access event via invite code
 */
export const canAccessEventWithInviteCode = async (inviteCode, userId) => {
  try {
    const result = await findEventByInviteCode(inviteCode);

    if (!result) {
      return { canAccess: false, reason: 'Invalid invite code' };
    }

    const { eventData, eventId, studioId } = result;

    // Check if event is still active
    if (!eventData.active) {
      return { canAccess: false, reason: 'Event is no longer active' };
    }

    // Check if event has already occurred (optional)
    const now = new Date();
    const eventTime = eventData.eventTimestamp?.toDate();
    if (eventTime && eventTime < now) {
      return { canAccess: false, reason: 'Event has already occurred' };
    }

    return {
      canAccess: true,
      eventId,
      studioId,
      eventData,
    };
  } catch (error) {
    console.error('Error validating invite code access:', error);
    return { canAccess: false, reason: 'Error validating code' };
  }
};
