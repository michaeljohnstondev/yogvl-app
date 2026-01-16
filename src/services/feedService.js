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
import { getFollowing, getFriends } from './followService';
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
 * Shows events where followed users are hosting, co-hosting, or attending
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

    // Get all upcoming public events from the studio
    const eventsRef = collection(db, 'studios', userStudio, 'events');
    const now = Timestamp.now();

    const q = query(
      eventsRef,
      where('eventTimestamp', '>=', now),
      where('isPrivate', '==', false), // Only public events
      orderBy('eventTimestamp', 'asc'),
      firestoreLimit(limitCount * 3) // Get more to filter in-memory
    );

    const snapshot = await getDocs(q);
    const followedEvents = [];
    const seenEventIds = new Set();

    snapshot.docs.forEach((doc) => {
      const eventData = { id: doc.id, ...doc.data() };

      // Skip events with past RSVP deadlines
      if (shouldHideEventDueToRSVPDeadline(eventData)) {
        return;
      }

      // Skip if current user is already attending
      const subscribers = eventData.subscribers || [];
      const cohosts = eventData.cohosts || [];
      const isUserAttending =
        subscribers.includes(currentUserId) ||
        cohosts.includes(currentUserId) ||
        eventData.createdBy === currentUserId;

      if (isUserAttending) {
        return;
      }

      // Check if any followed user is involved in this event
      const followedUsersInEvent = [];

      // Check if followed user is host
      if (followedUserIds.includes(eventData.createdBy)) {
        followedUsersInEvent.push(eventData.createdBy);
      }

      // Check if followed users are subscribers
      subscribers.forEach((subscriberId) => {
        if (followedUserIds.includes(subscriberId)) {
          followedUsersInEvent.push(subscriberId);
        }
      });

      // Check if followed users are cohosts
      cohosts.forEach((cohostId) => {
        if (followedUserIds.includes(cohostId)) {
          followedUsersInEvent.push(cohostId);
        }
      });

      // If at least one followed user is involved and we haven't seen this event yet
      if (followedUsersInEvent.length > 0 && !seenEventIds.has(eventData.id)) {
        seenEventIds.add(eventData.id);
        followedEvents.push({
          ...eventData,
          isFromFollowedUser: true,
          category: 'followed_events',
          followedUsersInEvent: [...new Set(followedUsersInEvent)], // Deduplicate
        });
      }
    });

    // Sort by date
    followedEvents.sort((a, b) => {
      const aDate = a.eventTimestamp?.toDate() || new Date(a.utcDateTime);
      const bDate = b.eventTimestamp?.toDate() || new Date(b.utcDateTime);
      return aDate - bDate;
    });

    return followedEvents.slice(0, limitCount);
  } catch (error) {
    console.error('[feedService] Error getting followed users events:', error);
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

      // Skip events created by current user, but INCLUDE events from followed users
      if (eventData.createdBy !== currentUserId) {
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
    const followedUserIds = following.map((f) => f.id); // Fixed: was f.targetUserId, should be f.id

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
      friendsLimit = 20,
      includeSubscribed = true,
    } = options;

    // Get following list and blocked users once for efficiency
    const [following, blockedUsersResult] = await Promise.all([
      getFollowing(currentUserId, 100),
      blockingService.getBlockedUsers(currentUserId)
    ]);

    const followedUserIds = following.map((f) => f.id); // Fixed: was f.targetUserId, should be f.id
    const blockedUserIds = blockedUsersResult.blockedUsers || [];

    // Execute feed queries in parallel for better performance
    const [followedEvents, friendsEvents, suggestedEvents] = await Promise.all([
      getFollowedUsersEventsWithFollowing(
        currentUserId,
        userStudio,
        followedUserIds,
        followedLimit
      ),
      getFriendsEvents(
        currentUserId,
        userStudio,
        friendsLimit
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
      ...friendsEvents,
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
      friendsEvents,
      suggestedEvents,
      stats: {
        totalEvents: uniqueEvents.length,
        subscribedCount: subscribedEvents.length,
        followedCount: followedEvents.length,
        friendsCount: friendsEvents.length,
        suggestedCount: suggestedEvents.length,
      },
    };
  } catch (error) {
    return {
      allEvents: [],
      subscribedEvents: [],
      followedEvents: [],
      friendsEvents: [],
      suggestedEvents: [],
      stats: {
        totalEvents: 0,
        subscribedCount: 0,
        followedCount: 0,
        friendsCount: 0,
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

/**
 * Get public events that user's friends are attending or hosting
 * Shows events where friends are in subscribers[], cohosts[], or as createdBy
 */
export const getFriendsEvents = async (
  currentUserId,
  userStudio,
  limitCount = 30
) => {
  try {
    if (!currentUserId || !userStudio) {
      console.warn('[feedService] Missing currentUserId or userStudio');
      return [];
    }

    // Get user's friends (mutual follows)
    const friends = await getFriends(currentUserId, 100);

    if (friends.length === 0) {
      return [];
    }

    const friendIds = friends.map((f) => f.id || f.targetUserId || f.userId);

    // Get all upcoming public events from the studio
    const eventsRef = collection(db, 'studios', userStudio, 'events');
    const now = Timestamp.now();

    const q = query(
      eventsRef,
      where('eventTimestamp', '>=', now),
      where('isPrivate', '==', false), // Only public events
      orderBy('eventTimestamp', 'asc'),
      firestoreLimit(limitCount * 3) // Get more to filter in-memory
    );

    const snapshot = await getDocs(q);
    const friendsEvents = [];
    const seenEventIds = new Set();

    snapshot.docs.forEach((doc) => {
      const eventData = { id: doc.id, ...doc.data() };

      // Skip events with past RSVP deadlines
      if (shouldHideEventDueToRSVPDeadline(eventData)) {
        return;
      }

      // Skip if current user is already attending
      const subscribers = eventData.subscribers || [];
      const cohosts = eventData.cohosts || [];
      const isUserAttending =
        subscribers.includes(currentUserId) ||
        cohosts.includes(currentUserId) ||
        eventData.createdBy === currentUserId;

      if (isUserAttending) {
        return;
      }

      // Check if any friend is involved in this event
      const friendsInEvent = [];

      // Check if friend is host
      if (friendIds.includes(eventData.createdBy)) {
        friendsInEvent.push(eventData.createdBy);
      }

      // Check if friends are subscribers
      subscribers.forEach((subscriberId) => {
        if (friendIds.includes(subscriberId)) {
          friendsInEvent.push(subscriberId);
        }
      });

      // Check if friends are cohosts
      cohosts.forEach((cohostId) => {
        if (friendIds.includes(cohostId)) {
          friendsInEvent.push(cohostId);
        }
      });

      // If at least one friend is involved and we haven't seen this event yet
      if (friendsInEvent.length > 0 && !seenEventIds.has(eventData.id)) {
        seenEventIds.add(eventData.id);
        friendsEvents.push({
          ...eventData,
          friendsInEvent: [...new Set(friendsInEvent)], // Deduplicate friend IDs
          category: 'friends_events',
        });
      }
    });

    // Sort by date and limit
    friendsEvents.sort((a, b) => {
      const aDate = a.eventTimestamp?.toDate() || new Date(a.utcDateTime);
      const bDate = b.eventTimestamp?.toDate() || new Date(b.utcDateTime);
      return aDate - bDate;
    });

    return friendsEvents.slice(0, limitCount);
  } catch (error) {
    console.error('[feedService] Error getting friends events:', error);
    return [];
  }
};

/**
 * Get official community events created by admin accounts
 * Shows special events created on behalf of organizations (e.g., YoGVL, YoATL)
 * These events are always public and created by admin users for community engagement
 */
export const getOfficialEvents = async (
  currentUserId,
  userStudio,
  organizationName = null,
  limitCount = 20
) => {
  try {
    if (!currentUserId || !userStudio) {
      console.warn('[feedService] Missing currentUserId or userStudio');
      return [];
    }

    const eventsRef = collection(db, 'studios', userStudio, 'events');
    const now = Timestamp.now();

    console.log('[feedService] Querying for official events in studio:', userStudio);

    // Simplified query - just filter by isOfficialEvent
    // We'll filter by timestamp in memory to avoid index dependency
    const q = query(
      eventsRef,
      where('isOfficialEvent', '==', true),
      firestoreLimit(limitCount * 2) // Get more to filter in memory
    );

    const snapshot = await getDocs(q);
    const officialEvents = [];

    console.log('[feedService] Official events query results:', {
      count: snapshot.docs.length,
      query: organizationName ? 'with org filter' : 'all official',
    });

    snapshot.docs.forEach((doc) => {
      const eventData = { id: doc.id, ...doc.data() };
      console.log('[feedService] Found official event:', {
        id: doc.id,
        title: eventData.title,
        isOfficialEvent: eventData.isOfficialEvent,
        officialOrganization: eventData.officialOrganization,
        eventTimestamp: eventData.eventTimestamp,
      });

      // Filter by timestamp in memory (skip past events)
      const eventTime = eventData.eventTimestamp?.toDate ? eventData.eventTimestamp.toDate() : new Date(eventData.eventTimestamp);
      if (eventTime < now.toDate()) {
        console.log('[feedService] Skipping past event:', eventData.title);
        return;
      }

      // Filter by organization if specified
      if (organizationName && eventData.officialOrganization !== organizationName) {
        return;
      }

      // Skip events with past RSVP deadlines
      if (shouldHideEventDueToRSVPDeadline(eventData)) {
        return;
      }

      officialEvents.push({
        ...eventData,
        isOfficialEvent: true,
        category: 'official_events',
      });
    });

    // Sort by timestamp and limit
    const sortedEvents = officialEvents.sort((a, b) => {
      const aTime = a.eventTimestamp?.toDate ? a.eventTimestamp.toDate() : new Date(a.eventTimestamp);
      const bTime = b.eventTimestamp?.toDate ? b.eventTimestamp.toDate() : new Date(b.eventTimestamp);
      return aTime - bTime;
    });

    return sortedEvents.slice(0, limitCount);
  } catch (error) {
    console.error('[feedService] Error getting official events:', error);
    console.error('[feedService] Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
    });
    return [];
  }
};
