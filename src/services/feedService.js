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

/**
 * Get events from users that the current user is following
 * This replaces the old invitation-based event discovery
 */
export const getFollowedUsersEvents = async (currentUserId, userStudio, limitCount = 50) => {
  try {
    if (!currentUserId || !userStudio) {
      console.warn('[feedService] Missing currentUserId or userStudio');
      return [];
    }

    // Get list of users that current user is following
    const following = await getFollowing(currentUserId, 100);
    
    if (following.length === 0) {
      console.log('[feedService] User is not following anyone yet');
      return [];
    }

    const followedUserIds = following.map(f => f.targetUserId);
    console.log(`[feedService] Getting events from ${followedUserIds.length} followed users`);

    // Get all events from followed users in the same studio
    const eventsRef = collection(db, 'studios', userStudio, 'events');
    const now = Timestamp.now();
    
    // Query for upcoming events created by followed users
    const q = query(
      eventsRef,
      where('createdBy', 'in', followedUserIds.slice(0, 10)), // Firestore 'in' limit is 10
      where('eventTimestamp', '>=', now),
      orderBy('eventTimestamp', 'asc'),
      firestoreLimit(limitCount)
    );

    const snapshot = await getDocs(q);
    const events = [];

    snapshot.docs.forEach(doc => {
      const eventData = {
        id: doc.id,
        ...doc.data(),
        isFromFollowedUser: true,
        category: 'followed_events'
      };
      events.push(eventData);
    });

    // If we have more than 10 followed users, need to make additional queries
    if (followedUserIds.length > 10) {
      const additionalBatches = [];
      for (let i = 10; i < followedUserIds.length; i += 10) {
        const batch = followedUserIds.slice(i, i + 10);
        const batchQuery = query(
          eventsRef,
          where('createdBy', 'in', batch),
          where('eventTimestamp', '>=', now),
          orderBy('eventTimestamp', 'asc'),
          firestoreLimit(limitCount)
        );
        additionalBatches.push(getDocs(batchQuery));
      }

      const additionalResults = await Promise.all(additionalBatches);
      additionalResults.forEach(snapshot => {
        snapshot.docs.forEach(doc => {
          const eventData = {
            id: doc.id,
            ...doc.data(),
            isFromFollowedUser: true,
            category: 'followed_events'
          };
          events.push(eventData);
        });
      });
    }

    // Sort all events by date and limit to requested count
    events.sort((a, b) => {
      const aDate = a.datetime?.toDate() || new Date(a.utcDateTime) || a.eventTimestamp?.toDate();
      const bDate = b.datetime?.toDate() || new Date(b.utcDateTime) || b.eventTimestamp?.toDate();
      return aDate - bDate;
    });

    const limitedEvents = events.slice(0, limitCount);
    console.log(`[feedService] Found ${limitedEvents.length} events from followed users`);
    
    return limitedEvents;
  } catch (error) {
    console.error('[feedService] Error getting followed users events:', error);
    return [];
  }
};

/**
 * Get suggested events from studio members (not followed)
 * These are public events from other studio members that the user might be interested in
 */
export const getSuggestedEvents = async (currentUserId, userStudio, limitCount = 20) => {
  try {
    if (!currentUserId || !userStudio) {
      console.warn('[feedService] Missing currentUserId or userStudio');
      return [];
    }

    // Get list of users that current user is following
    const following = await getFollowing(currentUserId, 100);
    const followedUserIds = new Set(following.map(f => f.targetUserId));
    
    // Add current user to exclusion list
    followedUserIds.add(currentUserId);

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

    snapshot.docs.forEach(doc => {
      const eventData = { id: doc.id, ...doc.data() };
      
      // Skip events from followed users or current user
      if (!followedUserIds.has(eventData.createdBy)) {
        suggestedEvents.push({
          ...eventData,
          isSuggested: true,
          category: 'suggested_events'
        });
      }
    });

    const limitedSuggested = suggestedEvents.slice(0, limitCount);
    console.log(`[feedService] Found ${limitedSuggested.length} suggested events`);
    
    return limitedSuggested;
  } catch (error) {
    console.error('[feedService] Error getting suggested events:', error);
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
      includeSubscribed = true
    } = options;

    console.log(`[feedService] Building event feed for user ${currentUserId}`);

    // Get events from followed users
    const followedEvents = await getFollowedUsersEvents(currentUserId, userStudio, followedLimit);
    
    // Get suggested events from non-followed users
    const suggestedEvents = await getSuggestedEvents(currentUserId, userStudio, suggestedLimit);
    
    // Get user's subscribed events if requested
    let subscribedEvents = [];
    if (includeSubscribed) {
      try {
        const eventsRef = collection(db, 'studios', userStudio, 'events');
        const now = Timestamp.now();
        
        const subscribedQuery = query(
          eventsRef,
          where('subscribers', 'array-contains', currentUserId),
          where('eventTimestamp', '>=', now),
          orderBy('eventTimestamp', 'asc'),
          firestoreLimit(20)
        );

        const subscribedSnapshot = await getDocs(subscribedQuery);
        subscribedEvents = subscribedSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          isSubscribed: true,
          category: 'my_events'
        }));
      } catch (error) {
        console.warn('[feedService] Failed to get subscribed events:', error);
      }
    }

    // Combine and deduplicate events
    const allEvents = [...subscribedEvents, ...followedEvents, ...suggestedEvents];
    const seenEventIds = new Set();
    const uniqueEvents = allEvents.filter(event => {
      if (seenEventIds.has(event.id)) {
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

    console.log(`[feedService] Event feed compiled: ${subscribedEvents.length} subscribed, ${followedEvents.length} followed, ${suggestedEvents.length} suggested, ${uniqueEvents.length} total unique`);

    return {
      allEvents: uniqueEvents,
      subscribedEvents,
      followedEvents,
      suggestedEvents,
      stats: {
        totalEvents: uniqueEvents.length,
        subscribedCount: subscribedEvents.length,
        followedCount: followedEvents.length,
        suggestedCount: suggestedEvents.length
      }
    };
  } catch (error) {
    console.error('[feedService] Error building event feed:', error);
    return {
      allEvents: [],
      subscribedEvents: [],
      followedEvents: [],
      suggestedEvents: [],
      stats: {
        totalEvents: 0,
        subscribedCount: 0,
        followedCount: 0,
        suggestedCount: 0
      }
    };
  }
};

/**
 * Get events created by a specific user (for their profile)
 */
export const getUserEvents = async (userId, userStudio, includePrivate = false, limitCount = 50) => {
  try {
    if (!userId || !userStudio) {
      console.warn('[feedService] Missing userId or userStudio');
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
    const events = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      category: 'user_events'
    }));

    console.log(`[feedService] Found ${events.length} events for user ${userId}`);
    return events;
  } catch (error) {
    console.error('[feedService] Error getting user events:', error);
    return [];
  }
};