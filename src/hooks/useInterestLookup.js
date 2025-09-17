import { useMemo, useCallback } from 'react';

/**
 * Optimized interest lookup hook for performance-critical components
 * Creates a fast Map-based lookup to prevent expensive array searches
 *
 * @param {string[]} userInterests - Array of user's current interests
 * @returns {Object} - Optimized lookup utilities
 */
export const useInterestLookup = (userInterests) => {
  // Create optimized interest lookup map to prevent O(n) array searches
  const interestLookup = useMemo(() => {
    const lookup = new Map();
    if (Array.isArray(userInterests)) {
      userInterests.forEach((interest) => {
        if (typeof interest === 'string') {
          lookup.set(interest.toLowerCase(), interest); // Store original case
        }
      });
    }
    return lookup;
  }, [userInterests]);

  // Fast O(1) interest check function
  const isUserInterested = useCallback(
    (interest) => {
      if (!interest || typeof interest !== 'string') return false;
      return interestLookup.has(interest.toLowerCase());
    },
    [interestLookup]
  );

  // Get the original case version of an interest
  const getOriginalCase = useCallback(
    (interest) => {
      if (!interest || typeof interest !== 'string') return null;
      return interestLookup.get(interest.toLowerCase()) || null;
    },
    [interestLookup]
  );

  // Get interest statistics for debugging/metrics
  const stats = useMemo(
    () => ({
      totalInterests: interestLookup.size,
      isEmpty: interestLookup.size === 0,
    }),
    [interestLookup.size]
  );

  return {
    isUserInterested,
    getOriginalCase,
    stats,
    // Legacy support - direct access to lookup if needed
    interestLookup,
  };
};
