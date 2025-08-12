// utils/userMetrics.js
import {
  doc,
  updateDoc,
  increment,
  Timestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../../../../auth/firebase';

/**
 * Updates user metrics when they attend an event
 * Call this when an event is marked as completed and user was present
 */
export const updateEventAttendance = async (userId, eventId) => {
  try {
    const userRef = doc(db, 'users', userId);

    await updateDoc(userRef, {
      eventsAttended: increment(1),
      attendedEvents: arrayUnion(eventId), // Keep track of which events they attended
      lastEventAttended: Timestamp.now(),
      lastActivity: Timestamp.now(),
    });

    console.log(`Updated attendance metrics for user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating attendance metrics:', error);
    return { success: false, error };
  }
};

/**
 * Updates user metrics when they join/subscribe to an event
 */
export const updateEventSubscription = async (userId, eventId) => {
  try {
    const userRef = doc(db, 'users', userId);

    await updateDoc(userRef, {
      subscribedEvents: arrayUnion(eventId),
      eventsJoined: increment(1), // Optional: track how many events they've joined
      lastActivity: Timestamp.now(),
    });

    console.log(`Updated subscription metrics for user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating subscription metrics:', error);
    return { success: false, error };
  }
};

/**
 * Updates user metrics when they create an event
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Success/error result
 */
export const updateEventCreationMetrics = async (userId, eventId) => {
  try {
    const userRef = doc(db, 'users', userId);

    await updateDoc(userRef, {
      // Add to subscribed events array
      subscribedEvents: arrayUnion(eventId),

      // Increment events created counter
      eventsCreated: increment(1),

      // Initialize other metrics if they don't exist
      eventsAttended: increment(0),
      noShows: increment(0),

      // Update timestamps
      lastEventCreated: Timestamp.now(),
      lastActivity: Timestamp.now(),
    });

    console.log(`Updated creation metrics for user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating creation metrics:', error);
    return { success: false, error };
  }
};

/**
 * Get user's event statistics
 */
export const getUserEventStats = (userData) => {
  const attended = userData?.eventsAttended || 0;
  const noShows = userData?.noShows || 0;
  const reliabilityScore = getUserReliabilityScore(userData);
  const reliabilityStatus = getUserReliabilityStatus(userData);

  return {
    eventsCreated: userData?.eventsCreated || 0,
    eventsAttended: attended,
    eventsJoined: userData?.eventsJoined || 0,
    noShows: noShows,
    totalSubscribed: userData?.subscribedEvents?.length || 0,
    totalAttended: userData?.attendedEvents?.length || 0,
    reliabilityScore,
    reliabilityStatus,
    showWarning: noShows >= 2, // Show warning after 2 no-shows
    isRestricted: noShows >= 5, // Potentially restrict after 5 no-shows
  };
};

/**
 * Updates user metrics when they don't show up to an event
 */
export const updateNoShow = async (userId, eventId) => {
  try {
    const userRef = doc(db, 'users', userId);

    await updateDoc(userRef, {
      noShows: increment(1),
      noShowEvents: arrayUnion(eventId),
      lastNoShow: Timestamp.now(),
      lastActivity: Timestamp.now(),
    });

    console.log(`Updated no-show metrics for user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating no-show metrics:', error);
    return { success: false, error };
  }
};

/**
 * Calculate user's reliability score (0-100)
 */
export const getUserReliabilityScore = (userData) => {
  const attended = userData?.eventsAttended || 0;
  const noShows = userData?.noShows || 0;
  const totalEvents = attended + noShows;

  if (totalEvents === 0) return 100; // New users start with perfect score

  const reliabilityScore = Math.round((attended / totalEvents) * 100);
  return Math.max(0, Math.min(100, reliabilityScore)); // Clamp between 0-100
};

/**
 * Get user's reliability status and badge
 */
export const getUserReliabilityStatus = (userData) => {
  const score = getUserReliabilityScore(userData);
  const noShows = userData?.noShows || 0;

  if (score >= 95)
    return { badge: '🌟', status: 'Excellent', color: '#4CAF50' };
  if (score >= 85) return { badge: '✅', status: 'Reliable', color: '#8BC34A' };
  if (score >= 70) return { badge: '👍', status: 'Good', color: '#FFC107' };
  if (score >= 50) return { badge: '⚠️', status: 'Fair', color: '#FF9800' };
  if (noShows >= 3)
    return { badge: '❌', status: 'Unreliable', color: '#F44336' };
  return { badge: '📊', status: 'New', color: '#9E9E9E' };
};

/**
 * Mark an event as completed and update attendance for all subscribers
 * Call this when an event finishes
 */
export const completeEvent = async (
  eventId,
  attendeeUserIds = [],
  noShowUserIds = []
) => {
  try {
    // Get all subscribers to determine who didn't show up
    const eventRef = doc(db, 'events', eventId);

    // Update the event status
    await updateDoc(eventRef, {
      status: 'completed',
      completedAt: Timestamp.now(),
      attendeeCount: attendeeUserIds.length,
      noShowCount: noShowUserIds.length,
      finalAttendees: attendeeUserIds,
      noShows: noShowUserIds,
    });

    // Update metrics for attendees
    const attendanceUpdates = attendeeUserIds.map((userId) =>
      updateEventAttendance(userId, eventId)
    );

    // Update metrics for no-shows
    const noShowUpdates = noShowUserIds.map((userId) =>
      updateNoShow(userId, eventId)
    );

    await Promise.all([...attendanceUpdates, ...noShowUpdates]);

    console.log(
      `Event ${eventId} completed: ${attendeeUserIds.length} attended, ${noShowUserIds.length} no-shows`
    );
    return { success: true };
  } catch (error) {
    console.error('Error completing event:', error);
    return { success: false, error };
  }
};

/**
 * Auto-detect potential no-shows for events that have passed
 * Call this periodically (e.g., daily) to mark no-shows for events that ended
 */
export const autoDetectNoShows = async (
  eventId,
  subscribedUserIds,
  attendedUserIds
) => {
  try {
    // Find users who subscribed but didn't attend
    const noShowUserIds = subscribedUserIds.filter(
      (userId) => !attendedUserIds.includes(userId)
    );

    if (noShowUserIds.length > 0) {
      await completeEvent(eventId, attendedUserIds, noShowUserIds);
      return {
        success: true,
        attended: attendedUserIds.length,
        noShows: noShowUserIds.length,
      };
    }

    return { success: true, attended: attendedUserIds.length, noShows: 0 };
  } catch (error) {
    console.error('Error auto-detecting no-shows:', error);
    return { success: false, error };
  }
};
