// utils/userMetrics.js
import {
  doc,
  updateDoc,
  increment,
  Timestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../../auth/services/firebase';

/**
 * Updates user metrics when they attend an event
 * Call this when an event is marked as completed and user was present
 */
export const updateEventAttendance = async (userId, eventId) => {
  try {
    console.log(`[updateEventAttendance] Updating metrics for user ${userId}, event ${eventId}`);
    const userRef = doc(db, 'users', userId);

    const updateData = {
      'userdata.metrics.events.attended': increment(1),
      'userdata.metrics.events.attendedEvents': arrayUnion(eventId),
      'userdata.metrics.events.lastEventAttended': Timestamp.now(),
      'userdata.metrics.events.lastActivity': Timestamp.now(),
    };
    
    console.log(`[updateEventAttendance] Update data:`, updateData);
    await updateDoc(userRef, updateData);

    console.log(`[updateEventAttendance] ✅ Successfully updated attendance metrics for user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error(`[updateEventAttendance] ❌ Error updating attendance metrics for user ${userId}:`, error);
    return { success: false, error };
  }
};

/**
 * Updates user metrics when they join/subscribe to an event
 */
export const updateEventSubscription = async (userId, eventId) => {
  try {
    const userRef = doc(db, 'users', userId);

    // First ensure the metrics structure exists
    await updateDoc(userRef, {
      'userdata.metrics.events.subscribedEvents': arrayUnion(eventId),
      'userdata.metrics.events.joined': increment(1),
      'userdata.metrics.events.lastActivity': Timestamp.now(),
    });

    console.log(`Updated subscription metrics for user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating subscription metrics:', error);
    
    // If the structure doesn't exist, initialize it and try again
    try {
      console.log('Initializing metrics structure for user', userId);
      await updateDoc(userRef, {
        'userdata.metrics.events.created': 0,
        'userdata.metrics.events.joined': 1,
        'userdata.metrics.events.attended': 0,
        'userdata.metrics.events.noShows': 0,
        'userdata.metrics.events.subscribedEvents': [eventId],
        'userdata.metrics.events.attendedEvents': [],
        'userdata.metrics.events.noShowEvents': [],
        'userdata.metrics.events.lastActivity': Timestamp.now(),
      });
      console.log(`Initialized and updated subscription metrics for user ${userId}`);
      return { success: true };
    } catch (retryError) {
      console.error('Error initializing metrics structure:', retryError);
      return { success: false, error: retryError };
    }
  }
};

/**
 * Updates user metrics when they leave/unsubscribe from an event
 */
export const updateEventUnsubscription = async (userId, eventId) => {
  try {
    console.log(`[updateEventUnsubscription] Starting for user ${userId}, event ${eventId}`);
    const userRef = doc(db, 'users', userId);

    await updateDoc(userRef, {
      'userdata.metrics.events.subscribedEvents': arrayRemove(eventId),
      'userdata.metrics.events.joined': increment(-1),
      'userdata.metrics.events.lastActivity': Timestamp.now(),
    });

    console.log(`[updateEventUnsubscription] Successfully updated metrics for user ${userId}`);
    return { success: true };
  } catch (error) {
    console.error(`[updateEventUnsubscription] Error updating metrics for user ${userId}:`, error);
    console.error(`[updateEventUnsubscription] Error details:`, {
      userId,
      eventId,
      errorMessage: error.message,
      errorCode: error.code
    });
    
    // If the structure doesn't exist, initialize it (but don't add this event since they're leaving)
    try {
      console.log('Initializing metrics structure for user', userId);
      await updateDoc(userRef, {
        'userdata.metrics.events.created': 0,
        'userdata.metrics.events.joined': 0,
        'userdata.metrics.events.attended': 0,
        'userdata.metrics.events.noShows': 0,
        'userdata.metrics.events.subscribedEvents': [],
        'userdata.metrics.events.attendedEvents': [],
        'userdata.metrics.events.noShowEvents': [],
        'userdata.metrics.events.lastActivity': Timestamp.now(),
      });
      console.log(`Initialized metrics structure for user ${userId} (leave event)`);
      return { success: true };
    } catch (retryError) {
      console.error('Error initializing metrics structure for unsubscription:', retryError);
      return { success: false, error: retryError };
    }
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
      'userdata.metrics.events.subscribedEvents': arrayUnion(eventId),
      'userdata.metrics.events.created': increment(1),
      'userdata.metrics.events.attended': increment(0),
      'userdata.metrics.events.noShows': increment(0),
      'userdata.metrics.events.lastEventCreated': Timestamp.now(),
      'userdata.metrics.events.lastActivity': Timestamp.now(),
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
  const eventMetrics = userData?.userdata?.metrics?.events || {};
  
  // Use attendedEvents array length as primary source of truth, fallback to counter
  const attendedEventsArray = eventMetrics?.attendedEvents || [];
  const attendedCounter = eventMetrics?.attended || 0;
  const attended = Math.max(attendedEventsArray.length, attendedCounter);
  
  const noShows = eventMetrics?.noShows || 0;
  const reliabilityScore = getUserReliabilityScore(userData);
  const reliabilityStatus = getUserReliabilityStatus(userData);

  return {
    eventsCreated: eventMetrics?.created || 0,
    eventsAttended: attended,
    eventsJoined: eventMetrics?.joined || 0,
    noShows: noShows,
    totalSubscribed: eventMetrics?.subscribedEvents?.length || 0,
    totalAttended: attendedEventsArray.length,
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
      'userdata.metrics.events.noShows': increment(1),
      'userdata.metrics.events.noShowEvents': arrayUnion(eventId),
      'userdata.metrics.events.lastNoShow': Timestamp.now(),
      'userdata.metrics.events.lastActivity': Timestamp.now(),
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
  const eventMetrics = userData?.userdata?.metrics?.events || {};
  
  // Use the same logic as getUserEventStats for consistency
  const attendedEventsArray = eventMetrics?.attendedEvents || [];
  const attendedCounter = eventMetrics?.attended || 0;
  const attended = Math.max(attendedEventsArray.length, attendedCounter);
  
  const noShows = eventMetrics?.noShows || 0;
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
  const noShows = userData?.userdata?.metrics?.events?.noShows || 0;
  const eventMetrics = userData?.userdata?.metrics?.events || {};
  
  // Use same attended calculation as getUserEventStats
  const attendedEventsArray = eventMetrics?.attendedEvents || [];
  const attendedCounter = eventMetrics?.attended || 0;
  const attended = Math.max(attendedEventsArray.length, attendedCounter);
  const created = eventMetrics?.created || 0;
  const joined = eventMetrics?.joined || 0;
  
  // Calculate total events they've been involved in (hosted + joined)
  const totalEventsInvolved = created + joined;
  
  // Calculate no-show percentage
  const noShowPercentage = totalEventsInvolved > 0 ? (noShows / totalEventsInvolved) * 100 : 0;

  // Green zone: 0-10% no-shows
  if (noShowPercentage <= 10) {
    if (created > 0 && noShows === 0) {
      return { badge: '🌟', status: 'Perfect Host', color: '#4CAF50' };
    } else if (noShows === 0 && totalEventsInvolved > 0) {
      return { badge: '🌟', status: 'Perfect', color: '#4CAF50' };
    } else if (totalEventsInvolved === 0) {
      return { badge: '✨', status: 'New', color: '#4CAF50' };
    } else {
      return { badge: '✅', status: 'Excellent', color: '#4CAF50' };
    }
  }
  
  // Light green zone: 10-20% no-shows  
  if (noShowPercentage <= 20) {
    return { badge: '👍', status: 'Good', color: '#8BC34A' };
  }
  
  // Yellow zone: 20-35% no-shows
  if (noShowPercentage <= 35) {
    return { badge: '⚠️', status: 'Fair', color: '#FFC107' };
  }
  
  // Orange zone: 35-50% no-shows
  if (noShowPercentage <= 50) {
    return { badge: '⚠️', status: 'Poor', color: '#FF9800' };
  }
  
  // Red zone: 50%+ no-shows
  return { badge: '❌', status: 'Unreliable', color: '#F44336' };
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
    console.log(`[completeEvent] Starting completion for event ${eventId}`);
    console.log(`[completeEvent] Attendees: ${attendeeUserIds.length}`, attendeeUserIds);
    console.log(`[completeEvent] No-shows: ${noShowUserIds.length}`, noShowUserIds);
    
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
    console.log(`[completeEvent] Event document updated`);

    // Update metrics for attendees
    console.log(`[completeEvent] Updating attendance metrics for ${attendeeUserIds.length} attendees`);
    const attendanceUpdates = attendeeUserIds.map(async (userId) => {
      console.log(`[completeEvent] Updating attendance for user ${userId}`);
      const result = await updateEventAttendance(userId, eventId);
      console.log(`[completeEvent] Attendance update result for ${userId}:`, result);
      return result;
    });

    // Update metrics for no-shows
    console.log(`[completeEvent] Updating no-show metrics for ${noShowUserIds.length} no-shows`);
    const noShowUpdates = noShowUserIds.map(async (userId) => {
      console.log(`[completeEvent] Updating no-show for user ${userId}`);
      const result = await updateNoShow(userId, eventId);
      console.log(`[completeEvent] No-show update result for ${userId}:`, result);
      return result;
    });

    const allResults = await Promise.all([...attendanceUpdates, ...noShowUpdates]);
    console.log(`[completeEvent] All metrics updates completed:`, allResults);

    console.log(
      `[completeEvent] Event ${eventId} completed: ${attendeeUserIds.length} attended, ${noShowUserIds.length} no-shows`
    );
    return { success: true };
  } catch (error) {
    console.error('[completeEvent] Error completing event:', error);
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
