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
  writeBatch,
  setDoc,
  deleteDoc,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';
import { sanitizeInterest, validateInterestsArray } from '../lib/interestUtils';

/**
 * Get user's default studio ID from their profile
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} Studio ID or null if not found
 */
const getUserStudioId = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    const userData = userSnap.data();
    return userData?.userdata?.studios?.default?.studioId || null;
  } catch (error) {
    console.error('[InterestService] Failed to get user studio ID:', {
      userId: 'present',
      error: error.message,
    });
    return null;
  }
};

/**
 * Update the aggregated interest counts doc for a studio
 * @param {string} studioId - Studio ID
 * @param {string} interest - Interest name
 * @param {1 | -1} delta - Increment or decrement
 */
const updateInterestCounts = async (studioId, interest, delta) => {
  try {
    const normalized = interest.toLowerCase().trim();
    const countsRef = doc(db, 'studios', studioId, 'meta', 'interestCounts');
    await setDoc(
      countsRef,
      {
        [`counts.${normalized}`]: increment(delta),
        [`display.${normalized}`]: interest,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('[InterestService] Failed to update interest counts:', {
      studioId,
      interest: interest?.substring(0, 20),
      delta,
      error: error.message,
    });
  }
};

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
 * Add interest to user's preferences with dual storage (user preferences + interest index)
 * @param {string} userId - User ID
 * @param {string} interest - Interest to add
 * @param {string} source - Source of interest addition ('event_detail' | 'interests_screen')
 * @returns {Promise<boolean>} Success status
 */
export const addUserInterest = async (userId, interest, source = 'unknown') => {
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

    // Get user's studio ID for interest index
    const studioId = await getUserStudioId(userId);
    if (!studioId) {
      console.error('[InterestService] User has no default studio ID:', {
        userId: 'present',
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

      // If case mismatch, update to new capitalization atomically using batch
      const batch = writeBatch(db);
      const normalizedInterest = sanitizedInterest.toLowerCase();

      // Update user preferences
      const userData = (await getDoc(userRef)).data();
      const interests = userData?.preferences?.interests || [];
      const updatedInterests = interests.map((interest) =>
        interest.toLowerCase() === normalizedInterest ? sanitizedInterest : interest
      );

      batch.update(userRef, { 'preferences.interests': updatedInterests });

      // Update interest index (remove from old, add to new)
      const oldInterestIndexRef = doc(db, 'studios', studioId, 'interests', existingInterest.toLowerCase());
      const newInterestIndexRef = doc(db, 'studios', studioId, 'interests', normalizedInterest);

      if (existingInterest.toLowerCase() !== normalizedInterest) {
        // Remove from old interest
        batch.update(oldInterestIndexRef, {
          userIds: arrayRemove(userId),
          updatedAt: serverTimestamp(),
        });
      }

      // Add to new interest
      batch.set(newInterestIndexRef, {
        userIds: arrayUnion(userId),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      await batch.commit();
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

    // Add new interest using atomic batch operation (dual storage)
    const batch = writeBatch(db);
    const normalizedInterest = sanitizedInterest.toLowerCase();

    // Update user preferences (use set with merge to handle missing field)
    batch.set(userRef, {
      preferences: {
        interests: arrayUnion(sanitizedInterest),
      }
    }, { merge: true });

    // Add to interest index (array-based)
    const interestIndexRef = doc(db, 'studios', studioId, 'interests', normalizedInterest);
    batch.set(interestIndexRef, {
      userIds: arrayUnion(userId),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    await batch.commit();

    // Update aggregated interest counts
    await updateInterestCounts(studioId, sanitizedInterest, 1);

    return true;
  } catch (error) {
    console.error('[InterestService] Failed to add interest:', {
      userId: 'present',
      interest: interest?.substring(0, 20) + '...',
      error: error.message,
    });
    return false;
  }
};

/**
 * Remove interest from user's preferences with dual storage (user preferences + interest index)
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

    // Get user's studio ID for interest index
    const studioId = await getUserStudioId(userId);
    if (!studioId) {
      console.error('[InterestService] User has no default studio ID for removal:', {
        userId: 'present',
      });
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

    // Remove interest using atomic batch operation (dual storage)
    const batch = writeBatch(db);
    const normalizedInterest = exactMatch.toLowerCase();

    console.log('[InterestService] 🗑️ Removing interest:', {
      exactMatch,
      normalizedInterest,
      studioId,
      userId: 'present',
    });

    // Remove from user preferences using the exact stored value
    batch.update(userRef, {
      'preferences.interests': arrayRemove(exactMatch),
    });
    console.log('[InterestService] ✅ Queued removal from user preferences');

    // Remove from interest index (array-based) - use set with merge to avoid errors if doc doesn't exist
    const interestIndexRef = doc(db, 'studios', studioId, 'interests', normalizedInterest);
    const interestIndexSnap = await getDoc(interestIndexRef);

    console.log('[InterestService] 🔍 Interest index exists:', interestIndexSnap.exists());

    if (interestIndexSnap.exists()) {
      const currentData = interestIndexSnap.data();
      console.log('[InterestService] 📊 Current interest index data:', {
        userIdsCount: currentData?.userIds?.length || 0,
        hasUserId: currentData?.userIds?.includes(userId),
      });

      batch.update(interestIndexRef, {
        userIds: arrayRemove(userId),
        updatedAt: serverTimestamp(),
      });
      console.log('[InterestService] ✅ Queued removal from interest index');
    } else {
      console.log('[InterestService] ⚠️ Interest index doc does not exist, skipping removal');
    }

    console.log('[InterestService] 💾 Committing batch...');
    await batch.commit();
    console.log('[InterestService] ✅ Batch committed successfully');

    // Decrement aggregated interest counts
    await updateInterestCounts(studioId, exactMatch, -1);

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

    // Read aggregated interest counts (single doc read instead of N user reads)
    const countsRef = doc(db, 'studios', studioId, 'meta', 'interestCounts');
    const countsSnap = await getDoc(countsRef);

    if (!countsSnap.exists()) {
      return [];
    }

    const data = countsSnap.data();
    const counts = data?.counts || {};
    const display = data?.display || {};

    return Object.entries(counts)
      .filter(([, count]) => count > 0)
      .map(([key, count]) => ({
        interest: display[key] || key,
        count,
      }))
      .sort((a, b) => b.count - a.count);
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
 * Extract interests from event title and location that match a user's interests
 * Checks both title and venue name (not address), deduplicates results
 * @param {string} eventTitle - Event title to analyze
 * @param {string} eventLocation - Event venue/location name (NOT address)
 * @param {string[]} userInterests - User's current interests
 * @returns {string[]} Array of user's interests that match the title or location
 */
export const extractInterestsFromEvent = (eventTitle, eventLocation, userInterests = []) => {
  if ((!eventTitle && !eventLocation) || !Array.isArray(userInterests) || userInterests.length === 0) {
    return [];
  }

  const title = (eventTitle || '').toLowerCase().trim();
  const location = (eventLocation || '').toLowerCase().trim();

  // Return user interests that appear in the event title or location
  return userInterests.filter((interest) => {
    const interestLower = interest.toLowerCase().trim();
    return (title && title.includes(interestLower)) || (location && location.includes(interestLower));
  });
};

/**
 * Get users with specific interest using optimized interest index
 * @param {string} studioId - Studio ID
 * @param {string} interest - Interest to search for
 * @returns {Promise<string[]>} Array of user IDs who have this interest
 */
export const getUsersWithInterest = async (studioId, interest) => {
  try {
    if (!studioId || !interest) {
      return [];
    }

    // Normalize interest for consistent lookup
    const normalizedInterest = interest.toLowerCase().trim();

    // Query the optimized interest index (array-based)
    const interestDoc = await getDoc(doc(db, 'studios', studioId, 'interests', normalizedInterest));

    if (!interestDoc.exists()) {
      return [];
    }

    // Extract user IDs from the userIds array
    return interestDoc.data()?.userIds || [];
  } catch (error) {
    console.error('[InterestService] Failed to get users with interest:', {
      studioId: 'present',
      interest: interest?.substring(0, 20) + '...',
      error: error.message,
    });
    return [];
  }
};

/**
 * Get users with multiple interests using optimized interest index
 * @param {string} studioId - Studio ID
 * @param {string[]} interests - Array of interests to search for
 * @param {string} excludeUserId - User ID to exclude from results
 * @returns {Promise<string[]>} Array of user IDs who have any of these interests
 */
export const getUsersWithAnyInterests = async (studioId, interests, excludeUserId = null) => {
  try {
    if (!studioId || !interests || interests.length === 0) {
      return [];
    }

    // Get users for each interest using the optimized index
    const userSets = await Promise.all(
      interests.map(interest => getUsersWithInterest(studioId, interest))
    );

    // Combine all user IDs and remove duplicates
    const allUserIds = [...new Set(userSets.flat())];

    // Filter out excluded user if specified
    return excludeUserId
      ? allUserIds.filter(userId => userId !== excludeUserId)
      : allUserIds;
  } catch (error) {
    console.error('[InterestService] Failed to get users with any interests:', {
      studioId: 'present',
      interestCount: interests?.length || 0,
      error: error.message,
    });
    return [];
  }
};
