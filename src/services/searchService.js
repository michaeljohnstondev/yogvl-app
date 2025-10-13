import { db } from '../auth/services/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAt,
  endAt,
} from 'firebase/firestore';

/**
 * Search Service
 * Handles search queries for events and users
 */

/**
 * Search events by title in a specific studio
 * @param {string} searchTerm - Search query
 * @param {string} studioId - Studio ID to search within
 * @param {number} maxResults - Maximum results to return (default 20)
 * @returns {Promise<Array>} Array of matching events
 */
export async function searchEvents(searchTerm, studioId, maxResults = 20) {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return [];
  }

  if (!studioId) {
    console.error('[searchService] No studioId provided for event search');
    return [];
  }

  try {
    const searchLower = searchTerm.toLowerCase().trim();
    const eventsRef = collection(db, `studios/${studioId}/events`);

    // Firestore doesn't support full-text search, so we'll use prefix matching
    // For better search, we'd need Algolia or similar, but this works for MVP
    const searchQuery = query(
      eventsRef,
      orderBy('title'),
      startAt(searchLower),
      endAt(searchLower + '\uf8ff'), // Unicode trick for "starts with" search
      limit(maxResults)
    );

    const snapshot = await getDocs(searchQuery);
    const events = [];
    const now = new Date();

    snapshot.forEach((doc) => {
      const data = doc.data();
      const eventDate = data.eventTimestamp?.toDate() || new Date(data.utcDateTime);

      // Only return upcoming events
      if (eventDate >= now) {
        events.push({
          id: doc.id,
          ...data,
        });
      }
    });

    // Also do client-side filtering for substring matches in title and description
    // This catches events where the search term appears in the middle
    const allEventsQuery = query(eventsRef, limit(100)); // Get more for client filtering
    const allSnapshot = await getDocs(allEventsQuery);
    const clientFilteredEvents = [];

    allSnapshot.forEach((doc) => {
      const data = doc.data();
      const eventDate = data.eventTimestamp?.toDate() || new Date(data.utcDateTime);

      if (eventDate >= now) {
        const titleMatch = data.title?.toLowerCase().includes(searchLower);
        const descMatch = data.description?.toLowerCase().includes(searchLower);
        const locationMatch = data.location?.address?.toLowerCase().includes(searchLower);

        if (titleMatch || descMatch || locationMatch) {
          const eventId = doc.id;
          // Avoid duplicates from the prefix query
          if (!events.find((e) => e.id === eventId)) {
            clientFilteredEvents.push({
              id: eventId,
              ...data,
            });
          }
        }
      }
    });

    // Combine results and sort by date
    const allResults = [...events, ...clientFilteredEvents]
      .slice(0, maxResults)
      .sort((a, b) => {
        const dateA = a.eventTimestamp?.toDate() || new Date(a.utcDateTime);
        const dateB = b.eventTimestamp?.toDate() || new Date(b.utcDateTime);
        return dateA - dateB;
      });

    return allResults;
  } catch (error) {
    console.error('[searchService] Error searching events:', error);
    return [];
  }
}

/**
 * Search users by display name
 * @param {string} searchTerm - Search query
 * @param {number} maxResults - Maximum results to return (default 20)
 * @returns {Promise<Array>} Array of matching users
 */
export async function searchUsers(searchTerm, maxResults = 20) {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return [];
  }

  try {
    const searchLower = searchTerm.toLowerCase().trim();
    const usersRef = collection(db, 'users');

    // Get all users (we'll filter client-side since Firestore doesn't support
    // substring search on nested fields like userdata.contactInfo.displayName)
    const usersQuery = query(usersRef, limit(200)); // Reasonable limit for client filtering
    const snapshot = await getDocs(usersQuery);
    const users = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const displayName = data.userdata?.contactInfo?.displayName?.toLowerCase() || '';
      const firstName = data.userdata?.contactInfo?.firstName?.toLowerCase() || '';
      const lastName = data.userdata?.contactInfo?.lastName?.toLowerCase() || '';

      // Check if search term matches any part of the name
      if (
        displayName.includes(searchLower) ||
        firstName.includes(searchLower) ||
        lastName.includes(searchLower)
      ) {
        users.push({
          id: doc.id,
          displayName: data.userdata?.contactInfo?.displayName || 'Unknown User',
          firstName: data.userdata?.contactInfo?.firstName,
          lastName: data.userdata?.contactInfo?.lastName,
          profilePicture: data.userdata?.contactInfo?.profilePicture,
          followerCount: data.userdata?.followerCount || 0,
        });
      }
    });

    // Sort by follower count (more popular users first)
    users.sort((a, b) => b.followerCount - a.followerCount);

    return users.slice(0, maxResults);
  } catch (error) {
    console.error('[searchService] Error searching users:', error);
    return [];
  }
}

/**
 * Combined search for both events and users
 * @param {string} searchTerm - Search query
 * @param {string} studioId - Studio ID for event search
 * @param {object} options - Search options
 * @returns {Promise<object>} Object with events and users arrays
 */
export async function searchAll(searchTerm, studioId, options = {}) {
  const { maxEventsResults = 20, maxUsersResults = 20 } = options;

  try {
    const [events, users] = await Promise.all([
      searchEvents(searchTerm, studioId, maxEventsResults),
      searchUsers(searchTerm, maxUsersResults),
    ]);

    return {
      events,
      users,
      query: searchTerm,
    };
  } catch (error) {
    console.error('[searchService] Error in combined search:', error);
    return {
      events: [],
      users: [],
      query: searchTerm,
    };
  }
}
