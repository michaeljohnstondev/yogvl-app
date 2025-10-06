// FILE: services/feedService.js - Follow-Based Event Feed Service

import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';
import { getFollowing } from './followService';
import { blockingService } from './blockingService';

/**
 * Helper function to check if an event should be hidden due to past RSVP deadline
 * Events with rsvpDeadline that has passed should not appear in discovery feeds
 */
const shouldHideEventDueToRSVPDeadline = (eventData) => {
  if (!eventData.rsvpDeadline) return false;

  const now = new Date();
  const deadline = eventData.rsvpDeadline.toDate
    ? eventData.rsvpDeadline.toDate()
    : new Date(eventData.rsvpDeadline);

  return deadline < now;
};

/**
 * Get events from users that the current user is following (optimized version with pre-fetched following)
 */
const getFollowedUsersEventsWithFollowing = async (
  currentUserId,
  userStudio,
  followedUserIds,
  limitCount = 50
) => {
  try {
    if (!currentUserId || !userStudio || followedUserIds.length === 0) {
      return [];
    }

    // Get all events from followed users in the same studio
    const eventsRef = collection(db, 'studios', userStudio, 'events');
    const now = Timestamp.now();

    // Create batch queries for all followed users (optimized parallel execution)
    const batchQueries = [];

    // Split followedUserIds into batches of 10 (Firestore 'in' limit)
    for (let i = 0; i < followedUserIds.length; i += 10) {
      const batch = followedUserIds.slice(i, i + 10);
      const batchQuery = query(
        eventsRef,
        where('createdBy', 'in', batch),
        where('eventTimestamp', '>=', now),
        where('isPrivate', '==', false), // Only public events
        orderBy('eventTimestamp', 'asc'),
        firestoreLimit(limitCount)
      );
      batchQueries.push(getDocs(batchQuery));
    }

    // Execute all batch queries in parallel for maximum performance
    const batchResults = await Promise.all(batchQueries);
    const events = [];

    // Process all results
    batchResults.forEach((snapshot) => {
      snapshot.docs.forEach((doc) => {
        const eventData = {
          id: doc.id,
          ...doc.data(),
          isFromFollowedUser: true,
          category: 'followed_events',
        };

        // Skip events with past RSVP deadlines
        if (!shouldHideEventDueToRSVPDeadline(eventData)) {
          events.push(eventData);
        }
      });
    });

    // Sort all events by date and limit to requested count
    events.sort((a, b) => {
      const aDate =
        a.datetime?.toDate() ||
        new Date(a.utcDateTime) ||
        a.eventTimestamp?.toDate();
      const bDate =
        b.datetime?.toDate() ||
        new Date(b.utcDateTime) ||
        b.eventTimestamp?.toDate();
      return aDate - bDate;
    });

    const limitedEvents = events.slice(0, limitCount);

    return limitedEvents;
  } catch (error) {
    return [];
  }
};

/**
 * Get events from users that the current user is following
 * This replaces the old invitation-based event discovery
 */
export const getFollowedUsersEvents = async (
  currentUserId,
  userStudio,
  limitCount = 50
) => {
  try {
    if (!currentUserId || !userStudio) {
      return [];
    }

    // Get list of users that current user is following
    const following = await getFollowing(currentUserId, 100);

    if (following.length === 0) {
      return [];
    }

    const followedUserIds = following.map((f) => f.targetUserId);

    return getFollowedUsersEventsWithFollowing(currentUserId, userStudio, followedUserIds, limitCount);
  } catch (error) {
    return [];
  }
};

/**
 * Get suggested events from studio members (not followed) - optimized version with pre-fetched following
 */
const getSuggestedEventsWithFollowing = async (
  currentUserId,
  userStudio,
  followedUserIds,
  limitCount = 20
) => {
  try {
    if (!currentUserId || !userStudio) {
      console.warn('[feedService] Missing currentUserId or userStudio');
      return [];
    }

    // Convert to Set for efficient lookup and add current user to exclusion list
    const followedUserIdsSet = new Set(followedUserIds);
    followedUserIdsSet.add(currentUserId);

    // Get all upcoming public events from the studio
    const eventsRef = collection(db, 'studios', userStudio, 'events');
    const now = Timestamp.now();

    const q = query(
      eventsRef,
      where('eventTimestamp', '>=', now),
      where('isPrivate', '==', false), // Only public events
      orderBy('eventTimestamp', 'asc'),
      firestoreLimit(limitCount * 2) // Get more to filter out followed users
    );

    const snapshot = await getDocs(q);
    const suggestedEvents = [];

    snapshot.docs.forEach((doc) => {
      const eventData = { id: doc.id, ...doc.data() };

      // Skip events from followed users or current user
      if (!followedUserIdsSet.has(eventData.createdBy)) {
        // Skip events with past RSVP deadlines
        if (!shouldHideEventDueToRSVPDeadline(eventData)) {
          suggestedEvents.push({
            ...eventData,
            isSuggested: true,
            category: 'suggested_events',
          });
        }
      }
    });

    const limitedSuggested = suggestedEvents.slice(0, limitCount);

    return limitedSuggested;
  } catch (error) {
    return [];
  }
};

/**
 * Get suggested events from studio members (not followed)
 * These are public events from other studio members that the user might be interested in
 */
export const getSuggestedEvents = async (
  currentUserId,
  userStudio,
  limitCount = 20
) => {
  try {
    if (!currentUserId || !userStudio) {
      console.warn('[feedService] Missing currentUserId or userStudio');
      return [];
    }

    // Get list of users that current user is following
    const following = await getFollowing(currentUserId, 100);
    const followedUserIds = following.map((f) => f.targetUserId);

    return getSuggestedEventsWithFollowing(currentUserId, userStudio, followedUserIds, limitCount);
  } catch (error) {
    return [];
  }
};

/**
 * Get comprehensive event feed combining followed users events and suggestions
 */
export const getEventFeed = async (currentUserId, userStudio, options = {}) => {
  try {
    const {
      followedLimit = 30,
      suggestedLimit = 20,
      includeSubscribed = true,
    } = options;

    // Get following list and blocked users once for efficiency
    const [following, blockedUsersResult] = await Promise.all([
      getFollowing(currentUserId, 100),
      blockingService.getBlockedUsers(currentUserId)
    ]);

    const followedUserIds = following.map((f) => f.targetUserId);
    const blockedUserIds = blockedUsersResult.blockedUsers || [];

    // Execute feed queries in parallel for better performance
    const [followedEvents, suggestedEvents] = await Promise.all([
      getFollowedUsersEventsWithFollowing(
        currentUserId,
        userStudio,
        followedUserIds,
        followedLimit
      ),
      getSuggestedEventsWithFollowing(
        currentUserId,
        userStudio,
        followedUserIds,
        suggestedLimit
      )
    ]);

    // Get user's subscribed events if requested
    let subscribedEvents = [];
    if (includeSubscribed) {
      try {
        const eventsRef = collection(db, 'studios', userStudio, 'events');
        const now = Timestamp.now();

        // Get upcoming events
        const upcomingQuery = query(
          eventsRef,
          where('subscribers', 'array-contains', currentUserId),
          where('eventTimestamp', '>=', now),
          orderBy('eventTimestamp', 'asc'),
          firestoreLimit(20)
        );

        // Get past events (last 30 days)
        const thirtyDaysAgo = Timestamp.fromDate(
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        );
        const pastQuery = query(
          eventsRef,
          where('subscribers', 'array-contains', currentUserId),
          where('eventTimestamp', '>=', thirtyDaysAgo),
          where('eventTimestamp', '<', now),
          orderBy('eventTimestamp', 'desc'),
          firestoreLimit(10)
        );

        const [upcomingSnapshot, pastSnapshot] = await Promise.all([
          getDocs(upcomingQuery),
          getDocs(pastQuery),
        ]);

        const upcomingEvents = upcomingSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          isSubscribed: true,
          category: 'my_events',
        }));

        const pastEvents = pastSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          isSubscribed: true,
          category: 'my_events',
        }));

        subscribedEvents = [...upcomingEvents, ...pastEvents];
      } catch (error) {
        console.error('[feedService] Failed to get subscribed events:', error);
      }
    }

    // Combine and deduplicate events
    const allEvents = [
      ...subscribedEvents,
      ...followedEvents,
      ...suggestedEvents,
    ];
    const seenEventIds = new Set();
    const blockedUserIdsSet = new Set(blockedUserIds);

    const uniqueEvents = allEvents.filter((event) => {
      // Filter out duplicate events
      if (seenEventIds.has(event.id)) {
        return false;
      }

      // Filter out events from blocked users
      if (blockedUserIdsSet.has(event.createdBy)) {
        return false;
      }

      seenEventIds.add(event.id);
      return true;
    });

    // Sort by date
    uniqueEvents.sort((a, b) => {
      const aDate = a.eventTimestamp?.toDate() || new Date(a.utcDateTime);
      const bDate = b.eventTimestamp?.toDate() || new Date(b.utcDateTime);
      return aDate - bDate;
    });

    return {
      allEvents: uniqueEvents,
      subscribedEvents,
      followedEvents,
      suggestedEvents,
      stats: {
        totalEvents: uniqueEvents.length,
        subscribedCount: subscribedEvents.length,
        followedCount: followedEvents.length,
        suggestedCount: suggestedEvents.length,
      },
    };
  } catch (error) {
    return {
      allEvents: [],
      subscribedEvents: [],
      followedEvents: [],
      suggestedEvents: [],
      stats: {
        totalEvents: 0,
        subscribedCount: 0,
        followedCount: 0,
        suggestedCount: 0,
      },
    };
  }
};

/**
 * Get events created by a specific user (for their profile)
 */
export const getUserEvents = async (
  userId,
  userStudio,
  includePrivate = false,
  limitCount = 50,
  currentUserId = null
) => {
  try {
    if (!userId || !userStudio) {
      return [];
    }

    const eventsRef = collection(db, 'studios', userStudio, 'events');
    const now = Timestamp.now();

    let q;
    if (includePrivate) {
      // Include all events (for user's own profile or hosts)
      q = query(
        eventsRef,
        where('createdBy', '==', userId),
        orderBy('eventTimestamp', 'desc'),
        firestoreLimit(limitCount)
      );
    } else {
      // Only public events (for other users viewing profile)
      q = query(
        eventsRef,
        where('createdBy', '==', userId),
        where('isPrivate', '==', false),
        orderBy('eventTimestamp', 'desc'),
        firestoreLimit(limitCount)
      );
    }

    const snapshot = await getDocs(q);
    const events = [];

    snapshot.docs.forEach((doc) => {
      const eventData = {
        id: doc.id,
        ...doc.data(),
        category: 'user_events',
      };

      // If viewing someone else's profile (not your own), hide events with past RSVP deadlines
      const isOwnProfile = currentUserId && currentUserId === userId;
      if (!isOwnProfile && shouldHideEventDueToRSVPDeadline(eventData)) {
        return; // Skip this event
      }

      events.push(eventData);
    });

    return events;
  } catch (error) {
    return [];
  }
};
