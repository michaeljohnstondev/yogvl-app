// utils/userMetrics.js
import {
  doc,
  getDoc,
  updateDoc,
  increment,
  Timestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../../auth/services/firebase';
import { AttendanceService } from '../../services/AttendanceService';
import { ReliabilityService } from '../../services/ReliabilityService';

/**
 * Updates user metrics when they attend an event
 * Call this when an event is marked as completed and user was present
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @param {string} attendanceType - Event attendance type ('strict', 'casual', 'open')
 */
export const updateEventAttendance = async (
  userId,
  eventId,
  attendanceType = 'casual'
) => {
  try {
    console.log(
      `[updateEventAttendance] Updating metrics for user ${userId}, event ${eventId}`
    );
    const userRef = doc(db, 'users', userId);

    const updateData = {
      'userdata.metrics.events.attended': increment(1),
      'userdata.metrics.events.attendedEvents': arrayUnion(eventId),
      'userdata.metrics.events.lastEventAttended': Timestamp.now(),
      'userdata.metrics.events.lastActivity': Timestamp.now(),
    };

    console.log(`[updateEventAttendance] Update data:`, updateData);
    await updateDoc(userRef, updateData);

    console.log(
      `[updateEventAttendance] ✅ Successfully updated attendance metrics for user ${userId}`
    );
    return { success: true };
  } catch (error) {
    console.error(
      `[updateEventAttendance] ❌ Error updating attendance metrics for user ${userId}:`,
      error
    );
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
      console.log(
        `Initialized and updated subscription metrics for user ${userId}`
      );
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
    console.log(
      `[updateEventUnsubscription] Starting for user ${userId}, event ${eventId}`
    );
    const userRef = doc(db, 'users', userId);

    await updateDoc(userRef, {
      'userdata.metrics.events.subscribedEvents': arrayRemove(eventId),
      'userdata.metrics.events.joined': increment(-1),
      'userdata.metrics.events.lastActivity': Timestamp.now(),
    });

    console.log(
      `[updateEventUnsubscription] Successfully updated metrics for user ${userId}`
    );
    return { success: true };
  } catch (error) {
    console.error(
      `[updateEventUnsubscription] Error updating metrics for user ${userId}:`,
      error
    );
    console.error(`[updateEventUnsubscription] Error details:`, {
      userId,
      eventId,
      errorMessage: error.message,
      errorCode: error.code,
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
      console.log(
        `Initialized metrics structure for user ${userId} (leave event)`
      );
      return { success: true };
    } catch (retryError) {
      console.error(
        'Error initializing metrics structure for unsubscription:',
        retryError
      );
      return { success: false, error: retryError };
    }
  }
};

/**
 * Updates user metrics when they create an event
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @param {string} studioId - Studio ID where the event is located
 * @returns {Promise<Object>} Success/error result
 */
export const updateEventCreationMetrics = async (userId, eventId, studioId) => {
  try {
    const userRef = doc(db, 'users', userId);

    await updateDoc(userRef, {
      'userdata.metrics.events.subscribedEvents': arrayUnion(eventId),
      'userdata.metrics.events.created': increment(1),
      'userdata.metrics.events.noShows': increment(0),
      'userdata.metrics.events.lastEventCreated': Timestamp.now(),
      'userdata.metrics.events.lastActivity': Timestamp.now(),
    });

    // Host attendance will be added when event is completed (if other attendees exist)
    console.log(`Updated creation metrics for host ${userId}`);

    return { success: true };
  } catch (error) {
    console.error('Error updating creation metrics:', error);
    return { success: false, error };
  }
};

/**
 * Updates user metrics when they delete an event (removes host metrics)
 * @param {string} userId - Host's user ID
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Success/error result
 */
export const updateEventDeletionMetrics = async (userId, eventId) => {
  try {
    const userRef = doc(db, 'users', userId);

    await updateDoc(userRef, {
      'userdata.metrics.events.subscribedEvents': arrayRemove(eventId),
      'userdata.metrics.events.created': increment(-1),
      'userdata.metrics.events.lastActivity': Timestamp.now(),
    });

    console.log(
      `Updated deletion metrics for host ${userId} - removed event ${eventId}`
    );
    return { success: true };
  } catch (error) {
    console.error('Error updating deletion metrics:', error);
    return { success: false, error };
  }
};

/**
 * Calculate average rating from stars array
 */
const calculateAverageRating = (starsArray) => {
  if (!starsArray || !Array.isArray(starsArray) || starsArray.length === 0) {
    return 0;
  }

  const sum = starsArray.reduce((acc, rating) => acc + rating, 0);
  return Math.round((sum / starsArray.length) * 10) / 10; // Round to 1 decimal place
};

/**
 * Get user's event statistics
 */
export const getUserEventStats = (userData) => {
  const eventMetrics = userData?.userdata?.metrics?.events || {};
  const socialMetrics = userData?.userdata?.metrics?.social || {};
  const engagementMetrics = userData?.userdata?.metrics?.engagement || {};

  // Use attendedEvents array length as primary source of truth, fallback to counter
  const attendedEventsArray = eventMetrics?.attendedEvents || [];
  const attendedCounter = eventMetrics?.attended || 0;
  const attended = Math.max(attendedEventsArray.length, attendedCounter);

  const noShows = eventMetrics?.noShows || 0;
  const reliabilityScore = getUserReliabilityScore(userData);
  const reliabilityStatus = getUserReliabilityStatus(userData);

  // Calculate additional stats for highlights
  const eventsCreated = eventMetrics?.created || 0;
  const eventsJoined = eventMetrics?.joined || 0;
  const totalEvents = eventsCreated + eventsJoined;

  // Calculate months since account creation (default to current date if not available)
  const accountCreated = userData?.userdata?.createdAt || new Date();
  const monthsSinceCreation = Math.max(
    1,
    Math.round(
      (new Date() - new Date(accountCreated)) / (1000 * 60 * 60 * 24 * 30)
    )
  );

  // Calculate average events per month
  const averageEventsPerMonth = totalEvents / monthsSinceCreation;

  return {
    eventsCreated,
    eventsAttended: attended,
    eventsJoined,
    noShows,
    totalSubscribed: eventMetrics?.subscribedEvents?.length || 0,
    totalAttended: attendedEventsArray.length,
    reliabilityScore,
    reliabilityStatus,
    showWarning: noShows >= 2, // Show warning after 2 no-shows
    isRestricted: noShows >= 5, // Potentially restrict after 5 no-shows

    // Additional stats for highlights
    totalEvents,
    followersCount: socialMetrics?.followersCount || 0,
    commentsPosted: engagementMetrics?.commentsPosted || 0,
    averageEventRating: calculateAverageRating(userData?.ratings?.stars),
    totalRatings:
      userData?.ratings?.stars?.length || engagementMetrics?.totalRatings || 0,
    monthsSinceCreation,
    averageEventsPerMonth,
    profileViews: socialMetrics?.profileViews || 0,
    averageAttendees: eventMetrics?.averageAttendees || 0,

    // Calculated highlight-specific stats
    averageCommentsPerEvent:
      totalEvents > 0
        ? (engagementMetrics?.commentsPosted || 0) / totalEvents
        : 0,
    eventCompletionRate:
      eventsJoined > 0 ? (attended / eventsJoined) * 100 : 100,
  };
};

/**
 * Updates user metrics when they don't show up to an event
 * Only applies to strict events - casual/open events don't penalize no-shows
 * @param {string} userId - User ID
 * @param {string} eventId - Event ID
 * @param {string} attendanceType - Event attendance type ('strict', 'casual', 'open')
 */
export const updateNoShow = async (
  userId,
  eventId,
  attendanceType = 'strict'
) => {
  try {
    // Only update no-show metrics for strict events
    if (attendanceType !== 'strict') {
      console.log(
        `[updateNoShow] Skipping no-show update for ${attendanceType} event ${eventId}`
      );
      return { success: true, message: 'No penalties for non-strict events' };
    }

    const userRef = doc(db, 'users', userId);

    await updateDoc(userRef, {
      'userdata.metrics.events.noShows': increment(1),
      'userdata.metrics.events.noShowEvents': arrayUnion(eventId),
      'userdata.metrics.events.lastNoShow': Timestamp.now(),
      'userdata.metrics.events.lastActivity': Timestamp.now(),
    });

    console.log(`Updated no-show metrics for user ${userId} (strict event)`);
    return { success: true };
  } catch (error) {
    console.error('Error updating no-show metrics:', error);
    return { success: false, error };
  }
};

/**
 * Updates host's average attendees metric
 * @param {string} hostId - Host's user ID
 * @param {number} attendeeCount - Number of attendees at this event
 * @returns {Promise<Object>} Success/error result
 */
export const updateHostAverageAttendees = async (hostId, attendeeCount) => {
  try {
    const userRef = doc(db, 'users', hostId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const eventMetrics = userData?.userdata?.metrics?.events || {};

    const eventsCreated = eventMetrics.created || 0;
    const currentAverage = eventMetrics.averageAttendees || 0;

    // Calculate new average using incremental formula: new_avg = (old_avg * old_count + new_value) / new_count
    const newAverage =
      eventsCreated > 0
        ? (currentAverage * (eventsCreated - 1) + attendeeCount) / eventsCreated
        : attendeeCount;

    await updateDoc(userRef, {
      'userdata.metrics.events.averageAttendees':
        Math.round(newAverage * 100) / 100, // Round to 2 decimal places
    });

    console.log(
      `Updated average attendees for host ${hostId}: ${newAverage.toFixed(2)}`
    );
    return { success: true, newAverage };
  } catch (error) {
    console.error('Error updating average attendees:', error);
    return { success: false, error };
  }
};

/**
 * Mark an event as completed and update attendance for all subscribers
 * Call this when an event finishes
 * @param {string} eventId - Event ID
 * @param {Array} attendeeUserIds - Array of user IDs who attended
 * @param {Array} noShowUserIds - Array of user IDs who didn't show
 * @param {string} attendanceType - Event attendance type ('strict', 'casual', 'open')
 */
export const completeEvent = async (
  eventId,
  attendeeUserIds = [],
  noShowUserIds = [],
  attendanceType = 'casual'
) => {
  try {
    console.log(`[completeEvent] Starting completion for event ${eventId}`);
    console.log(
      `[completeEvent] Attendees: ${attendeeUserIds.length}`,
      attendeeUserIds
    );
    console.log(
      `[completeEvent] No-shows: ${noShowUserIds.length}`,
      noShowUserIds
    );

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
    console.log(
      `[completeEvent] Updating attendance metrics for ${attendeeUserIds.length} attendees`
    );
    const attendanceUpdates = attendeeUserIds.map(async (userId) => {
      console.log(`[completeEvent] Updating attendance for user ${userId}`);
      const result = await updateEventAttendance(
        userId,
        eventId,
        attendanceType
      );
      console.log(
        `[completeEvent] Attendance update result for ${userId}:`,
        result
      );
      return result;
    });

    // Update metrics for no-shows (only for strict events)
    console.log(
      `[completeEvent] Updating no-show metrics for ${noShowUserIds.length} no-shows`
    );
    const noShowUpdates = noShowUserIds.map(async (userId) => {
      console.log(`[completeEvent] Updating no-show for user ${userId}`);
      const result = await updateNoShow(userId, eventId, attendanceType);
      console.log(
        `[completeEvent] No-show update result for ${userId}:`,
        result
      );
      return result;
    });

    const allResults = await Promise.all([
      ...attendanceUpdates,
      ...noShowUpdates,
    ]);
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

/**
 * Get user reliability score from userData
 * @param {Object} userData - User data object
 * @returns {number} Reliability score (0-100)
 */
export const getUserReliabilityScore = (userData) => {
  const reliabilityDisplay =
    ReliabilityService.getUserReliabilityDisplay(userData);
  return reliabilityDisplay?.score || 0;
};

/**
 * Get user reliability status from userData
 * @param {Object} userData - User data object
 * @returns {Object} Reliability status object with tier info
 */
export const getUserReliabilityStatus = (userData) => {
  const reliabilityDisplay =
    ReliabilityService.getUserReliabilityDisplay(userData);
  if (!reliabilityDisplay) {
    return {
      tier: 'UNRELIABLE',
      label: 'Unreliable',
      color: '#F44336',
      emoji: '🚫',
    };
  }

  return ReliabilityService.getReliabilityTier(reliabilityDisplay.score);
};
