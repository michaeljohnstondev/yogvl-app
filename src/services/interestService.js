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
  where 
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';

/**
 * Get user's interests from preferences
 * @param {string} userId - User ID
 * @returns {Promise<string[]>} Array of user interests
 */
export const getUserInterests = async (userId) => {
  try {
    if (!userId) {
      console.warn('[interestService] No userId provided');
      return [];
    }

    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.warn(`[interestService] User ${userId} not found`);
      return [];
    }

    const userData = userSnap.data();
    const interests = userData?.preferences?.interests || [];
    
    // If user has no preferences structure, initialize it
    if (!userData?.preferences) {
      console.log(`[interestService] User ${userId} has no preferences structure, initializing empty interests`);
      try {
        await updateDoc(userRef, {
          'preferences.interests': []
        });
      } catch (error) {
        console.warn(`[interestService] Could not initialize preferences for user ${userId}:`, error);
      }
    }
    
    console.log(`[interestService] Found ${interests.length} interests for user ${userId}`);
    return interests;
    
  } catch (error) {
    console.error('[interestService] Error getting user interests:', error);
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
      console.warn('[interestService] Missing userId or interest');
      return false;
    }

    const trimmedInterest = interest.trim();
    if (!trimmedInterest) {
      console.warn('[interestService] Empty interest after trimming');
      return false;
    }

    const userRef = doc(db, 'users', userId);
    
    // First check if interest already exists (case insensitive comparison)
    const currentInterests = await getUserInterests(userId);
    const existingInterest = currentInterests.find(existing => existing.toLowerCase() === trimmedInterest.toLowerCase());
    
    if (existingInterest) {
      // If exact match (same case), no need to update
      if (existingInterest === trimmedInterest) {
        console.log(`[interestService] Interest "${trimmedInterest}" already exists for user ${userId}`);
        return true;
      }
      
      // If case mismatch, update to new capitalization
      console.log(`[interestService] Updating interest case from "${existingInterest}" to "${trimmedInterest}" for user ${userId}`);
      await updateDoc(userRef, {
        'preferences.interests': arrayRemove(existingInterest)
      });
      await updateDoc(userRef, {
        'preferences.interests': arrayUnion(trimmedInterest)
      });
      return true;
    }

    // Add new interest
    await updateDoc(userRef, {
      'preferences.interests': arrayUnion(trimmedInterest) // Keep original case
    });

    console.log(`[interestService] Added interest "${trimmedInterest}" for user ${userId}`);
    return true;
    
  } catch (error) {
    console.error('[interestService] Error adding user interest:', error);
    return false;
  }
};

/**
 * Remove interest from user's preferences
 * @param {string} userId - User ID
 * @param {string} interest - Interest to remove
 * @returns {Promise<boolean>} Success status
 */
export const removeUserInterest = async (userId, interest) => {
  try {
    if (!userId || !interest) {
      console.warn('[interestService] Missing userId or interest');
      return false;
    }

    const userRef = doc(db, 'users', userId);
    
    await updateDoc(userRef, {
      'preferences.interests': arrayRemove(interest)
    });

    console.log(`[interestService] Removed interest "${interest}" for user ${userId}`);
    return true;
    
  } catch (error) {
    console.error('[interestService] Error removing user interest:', error);
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
      console.warn('[interestService] No studioId provided');
      return [];
    }

    // Get all users in the studio
    const studioRef = doc(db, 'studios', studioId);
    const studioSnap = await getDoc(studioRef);
    
    if (!studioSnap.exists()) {
      console.warn(`[interestService] Studio ${studioId} not found`);
      return [];
    }

    const studioData = studioSnap.data();
    const userIds = studioData.users || [];
    
    if (userIds.length === 0) {
      console.log(`[interestService] No users in studio ${studioId}`);
      return [];
    }

    // Get all user documents with interests
    const interestCounts = {};
    const interestOriginalCase = {}; // Track original case for display
    const batchSize = 10;
    
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const userPromises = batch.map(uid => getDoc(doc(db, 'users', uid)));
      const userSnaps = await Promise.all(userPromises);
      
      userSnaps.forEach(userSnap => {
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const interests = userData?.preferences?.interests || [];
          
          interests.forEach(interest => {
            const normalizedInterest = interest.toLowerCase().trim();
            interestCounts[normalizedInterest] = (interestCounts[normalizedInterest] || 0) + 1;
            
            // Keep track of the most common case (first one seen or most frequent)
            if (!interestOriginalCase[normalizedInterest] || interest.trim().length > 0) {
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
        count 
      }))
      .sort((a, b) => b.count - a.count);

    console.log(`[interestService] Found ${popularInterests.length} unique interests in studio ${studioId}`);
    return popularInterests;
    
  } catch (error) {
    console.error('[interestService] Error getting studio interests:', error);
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
export const findUsersWithInterests = async (studioId, interests, excludeUserId = null) => {
  try {
    if (!studioId || !interests || interests.length === 0) {
      console.warn('[interestService] Missing studioId or interests');
      return [];
    }

    const normalizedInterests = interests.map(interest => interest.toLowerCase().trim());
    
    // Get all users in the studio
    const studioRef = doc(db, 'studios', studioId);
    const studioSnap = await getDoc(studioRef);
    
    if (!studioSnap.exists()) {
      console.warn(`[interestService] Studio ${studioId} not found`);
      return [];
    }

    const studioData = studioSnap.data();
    const userIds = studioData.users || [];
    
    if (userIds.length === 0) {
      console.log(`[interestService] No users in studio ${studioId}`);
      return [];
    }

    // Filter out excluded user
    const targetUserIds = excludeUserId 
      ? userIds.filter(uid => uid !== excludeUserId)
      : userIds;

    // Check each user's interests
    const matchingUserIds = [];
    const batchSize = 10;
    
    for (let i = 0; i < targetUserIds.length; i += batchSize) {
      const batch = targetUserIds.slice(i, i + batchSize);
      const userPromises = batch.map(uid => getDoc(doc(db, 'users', uid)));
      const userSnaps = await Promise.all(userPromises);
      
      userSnaps.forEach((userSnap, index) => {
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const userInterests = userData?.preferences?.interests || [];
          const normalizedUserInterests = userInterests.map(interest => interest.toLowerCase().trim());
          
          // Check if user has any matching interests
          const hasMatchingInterest = normalizedInterests.some(interest => 
            normalizedUserInterests.includes(interest)
          );
          
          if (hasMatchingInterest) {
            matchingUserIds.push(batch[index]);
          }
        }
      });
    }

    console.log(`[interestService] Found ${matchingUserIds.length} users with matching interests in studio ${studioId}`);
    return matchingUserIds;
    
  } catch (error) {
    console.error('[interestService] Error finding users with interests:', error);
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
    'Basketball', 'Football', 'Soccer', 'Tennis', 'Pickleball', 'Baseball',
    'Volleyball', 'Golf', 'Swimming', 'Running', 'Yoga', 'Fitness',
    'Music', 'Dance', 'Art', 'Painting', 'Photography', 'Cooking',
    'Gaming', 'Chess', 'Poker', 'Trivia', 'Karaoke', 'Comedy',
    'Hiking', 'Biking', 'Climbing', 'Skating', 'Surfing'
  ];
  
  return commonInterests.filter(interest => title.includes(interest.toLowerCase()));
};