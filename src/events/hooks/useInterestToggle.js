import { useCallback, useState } from 'react';
import { toggleInterestInArray, hasInterest } from '../../lib/interestUtils';
import {
  addUserInterest,
  removeUserInterest,
} from '../../services/interestService';

/**
 * Custom hook for managing interest toggle functionality
 * Provides optimized interest toggling with optimistic updates and error recovery
 *
 * @param {string} currentUserId - Current user's ID
 * @param {string[]} userInterests - Current user interests array
 * @param {function} setUserInterests - State setter for user interests
 * @returns {Object} - Hook interface with toggle handler and loading state
 */
export const useInterestToggle = (
  currentUserId,
  userInterests,
  setUserInterests
) => {
  const [isTogglingInterest, setIsTogglingInterest] = useState(false);

  /**
   * Handles interest toggle with optimistic updates and error recovery
   * @param {string} interest - Interest to toggle
   * @returns {Promise<void>}
   */
  const handleInterestToggle = useCallback(
    async (interest) => {
      // Prevent concurrent operations
      if (isTogglingInterest || !currentUserId || !interest) return;

      setIsTogglingInterest(true);

      const wasInterested = hasInterest(userInterests, interest);

      // Optimistic update - immediately reflect change in UI
      setUserInterests((prev) => toggleInterestInArray(prev, interest));

      try {
        // Perform Firebase operation
        if (wasInterested) {
          await removeUserInterest(currentUserId, interest);
        } else {
          await addUserInterest(currentUserId, interest);
        }
      } catch (error) {
        console.error('[useInterestToggle] Interest update failed:', {
          userId: 'present',
          interest: interest.substring(0, 20) + '...',
          action: wasInterested ? 'remove' : 'add',
          error: error.message,
        });

        // Revert optimistic update on error
        setUserInterests((prev) => toggleInterestInArray(prev, interest));

        // Re-throw error so component can handle UI feedback
        throw error;
      } finally {
        setIsTogglingInterest(false);
      }
    },
    [currentUserId, userInterests, setUserInterests, isTogglingInterest]
  );

  /**
   * Checks if a specific interest is currently selected
   * @param {string} interest - Interest to check
   * @returns {boolean} - True if interest is selected
   */
  const isInterestSelected = useCallback(
    (interest) => {
      return hasInterest(userInterests, interest);
    },
    [userInterests]
  );

  return {
    handleInterestToggle,
    isInterestSelected,
    isTogglingInterest,
  };
};
