// interestService.js - User Interest Management Service

import {
  doc,
  updateDoc,
  getDoc,
  collection,
  query,
  getDocs,
  arrayUnion,
  arrayRemove,
  where,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';
import { sanitizeInterest, validateInterestsArray } from '../lib/interestUtils';

/**
 * Get user's interests from preferences
 * @param {string} userId - User ID
 * @returns {Promise<string[]>} Array of user interests
 */
export const getUserInterests = async (userId) => {
  try {
    if (!userId) {
      return [];
    }

    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return [];
    }

    const userData = userSnap.data();
    const interests = userData?.preferences?.interests || [];

    // If user has no preferences structure, initialize it
    if (!userData?.preferences) {
      try {
        await updateDoc(userRef, {
          'preferences.interests': [],
        });
      } catch (error) {
        console.error(
          '[InterestService] Failed to initialize user preferences:',
          {
            userId: 'present',
            error: error.message,
          }
        );
      }
    }

    // Validate and sanitize the interests array before returning
    return validateInterestsArray(interests);
  } catch (error) {
    console.error('[InterestService] Failed to get user interests:', {
      userId: 'present',
      error: error.message,
    });
    return [];
  }
};

/**
 * Add interest to user's preferences
 * @param {string} userId - User ID
 * @param {string} interest - Interest to add
 * @returns {Promise<boolean>} Success status
 */
export const addUserInterest = async (userId, interest) => {
  try {
    if (!userId || !interest) {
      console.error('[InterestService] Missing required parameters:', {
        hasUserId: !!userId,
        hasInterest: !!interest,
      });
      return false;
    }

    // Sanitize input to prevent security issues
    const sanitizedInterest = sanitizeInterest(interest);
    if (!sanitizedInterest) {
      console.error('[InterestService] Invalid interest after sanitization:', {
        original: interest.substring(0, 50) + '...',
      });
      return false;
    }

    const userRef = doc(db, 'users', userId);

    // First check if interest already exists (case insensitive comparison)
    const currentInterests = await getUserInterests(userId);
    const existingInterest = currentInterests.find(
      (existing) => existing.toLowerCase() === sanitizedInterest.toLowerCase()
    );

    if (existingInterest) {
      // If exact match (same case), no need to update
      if (existingInterest === sanitizedInterest) {
        return true;
      }

      // If case mismatch, update to new capitalization atomically
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
          throw new Error('User document not found');
        }

        const userData = userDoc.data();
        const interests = userData?.preferences?.interests || [];

        // Find and replace the interest with new capitalization
        const updatedInterests = interests.map((interest) =>
          interest.toLowerCase() === sanitizedInterest.toLowerCase()
            ? sanitizedInterest
            : interest
        );

        transaction.update(userRef, {
          'preferences.interests': updatedInterests,
        });
      });
      return true;
    }

    // Validate user doesn't exceed interest limit
    if (currentInterests.length >= 50) {
      console.error(
        '[InterestService] User has reached maximum interest limit:',
        {
          userId: 'present',
          currentCount: currentInterests.length,
        }
      );
      return false;
    }

    // Add new interest
    await updateDoc(userRef, {
      'preferences.interests': arrayUnion(sanitizedInterest),
    });

    return true;
  } catch (error) {
    console.error('[InterestService] Failed to add interest:', {
      userId: 'present',
      interest: sanitizedInterest?.substring(0, 20) + '...',
      error: error.message,
    });
    return false;
  }
};

/**
 * Remove interest from user's preferences
 * @param {string} userId - User ID (must match authenticated user)
 * @param {string} interest - Interest to remove
 * @returns {Promise<boolean>} Success status
 */
export const removeUserInterest = async (userId, interest) => {
  try {
    if (!userId || !interest) {
      console.error(
        '[InterestService] Missing required parameters for removal:',
        {
          hasUserId: !!userId,
          hasInterest: !!interest,
        }
      );
      return false;
    }

    // Validate userId format for basic security
    if (!userId.match(/^[a-zA-Z0-9]{28}$/)) {
      console.error('[InterestService] Invalid user ID format for removal:', {
        userIdLength: userId.length,
      });
      return false;
    }

    // Sanitize input for consistency
    const sanitizedInterest = sanitizeInterest(interest);
    if (!sanitizedInterest) {
      console.error(
        '[InterestService] Invalid interest for removal after sanitization:',
        {
          original: interest.substring(0, 50) + '...',
        }
      );
      return false;
    }

    const userRef = doc(db, 'users', userId);

    // Get current interests to ensure we're removing the exact stored value
    const currentInterests = await getUserInterests(userId);
    const exactMatch = currentInterests.find(
      (existing) => existing.toLowerCase() === sanitizedInterest.toLowerCase()
    );

    if (!exactMatch) {
      // Interest doesn't exist, operation successful (idempotent)
      return true;
    }

    // Remove interest using the exact stored value for consistency
    await updateDoc(userRef, {
      'preferences.interests': arrayRemove(exactMatch),
    });

    return true;
  } catch (error) {
    console.error('[InterestService] Failed to remove interest:', {
      userId: 'present',
      interest: interest?.substring(0, 20) + '...',
      error: error.message,
    });
    return false;
  }
};

/**
 * Get all interests used by users in a studio (for suggestions)
 * @param {string} studioId - Studio ID
 * @returns {Promise<Array<{interest: string, count: number}>>} Popular interests with counts
 */
export const getStudioInterests = async (studioId) => {
  try {
    if (!studioId) {
      return [];
    }

    // Get all users in the studio
    const studioRef = doc(db, 'studios', studioId);
    const studioSnap = await getDoc(studioRef);

    if (!studioSnap.exists()) {
      return [];
    }

    const studioData = studioSnap.data();
    const userIds = studioData.users || [];

    if (userIds.length === 0) {
      return [];
    }

    // Get all user documents with interests
    const interestCounts = {};
    const interestOriginalCase = {}; // Track original case for display
    const batchSize = 10;

    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const userPromises = batch.map((uid) => getDoc(doc(db, 'users', uid)));
      const userSnaps = await Promise.all(userPromises);

      userSnaps.forEach((userSnap) => {
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const interests = userData?.preferences?.interests || [];

          interests.forEach((interest) => {
            const normalizedInterest = interest.toLowerCase().trim();
            interestCounts[normalizedInterest] =
              (interestCounts[normalizedInterest] || 0) + 1;

            // Keep track of the most common case (first one seen or most frequent)
            if (
              !interestOriginalCase[normalizedInterest] ||
              interest.trim().length > 0
            ) {
              interestOriginalCase[normalizedInterest] = interest.trim();
            }
          });
        }
      });
    }

    // Convert to array and sort by popularity, using original case for display
    const popularInterests = Object.entries(interestCounts)
      .map(([normalizedInterest, count]) => ({
        interest: interestOriginalCase[normalizedInterest],
        count,
      }))
      .sort((a, b) => b.count - a.count);

    return popularInterests;
  } catch (error) {
    return [];
  }
};

/**
 * Find users in studio who share specific interests
 * @param {string} studioId - Studio ID
 * @param {string[]} interests - Interests to match
 * @param {string} excludeUserId - User ID to exclude from results
 * @returns {Promise<string[]>} Array of user IDs who have matching interests
 */
export const findUsersWithInterests = async (
  studioId,
  interests,
  excludeUserId = null
) => {
  try {
    if (!studioId || !interests || interests.length === 0) {
      return [];
    }

    const normalizedInterests = interests.map((interest) =>
      interest.toLowerCase().trim()
    );

    // Get all users in the studio
    const studioRef = doc(db, 'studios', studioId);
    const studioSnap = await getDoc(studioRef);

    if (!studioSnap.exists()) {
      return [];
    }

    const studioData = studioSnap.data();
    const userIds = studioData.users || [];

    if (userIds.length === 0) {
      return [];
    }

    // Filter out excluded user
    const targetUserIds = excludeUserId
      ? userIds.filter((uid) => uid !== excludeUserId)
      : userIds;

    // Check each user's interests
    const matchingUserIds = [];
    const batchSize = 10;

    for (let i = 0; i < targetUserIds.length; i += batchSize) {
      const batch = targetUserIds.slice(i, i + batchSize);
      const userPromises = batch.map((uid) => getDoc(doc(db, 'users', uid)));
      const userSnaps = await Promise.all(userPromises);

      userSnaps.forEach((userSnap, index) => {
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const userInterests = userData?.preferences?.interests || [];
          const normalizedUserInterests = userInterests.map((interest) =>
            interest.toLowerCase().trim()
          );

          // Check if user has any matching interests
          const hasMatchingInterest = normalizedInterests.some((interest) =>
            normalizedUserInterests.includes(interest)
          );

          if (hasMatchingInterest) {
            matchingUserIds.push(batch[index]);
          }
        }
      });
    }

    return matchingUserIds;
  } catch (error) {
    return [];
  }
};

/**
 * Extract potential interests from event title
 * @param {string} eventTitle - Event title to analyze
 * @returns {string[]} Array of potential interests
 */
export const extractInterestsFromEventTitle = (eventTitle) => {
  if (!eventTitle) return [];

  const title = eventTitle.toLowerCase().trim();
  const commonInterests = [
    'Basketball',
    'Football',
    'Soccer',
    'Tennis',
    'Pickleball',
    'Baseball',
    'Volleyball',
    'Golf',
    'Swimming',
    'Running',
    'Yoga',
    'Fitness',
    'Music',
    'Dance',
    'Art',
    'Painting',
    'Photography',
    'Cooking',
    'Gaming',
    'Chess',
    'Poker',
    'Trivia',
    'Karaoke',
    'Comedy',
    'Hiking',
    'Biking',
    'Climbing',
    'Skating',
    'Surfing',
  ];

  return commonInterests.filter((interest) =>
    title.includes(interest.toLowerCase())
  );
};
