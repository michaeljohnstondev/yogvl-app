// usePrivacyValidation.js - Hook for validating profile access before navigation

import { useState, useCallback, useRef } from 'react';
import { blockingService } from '../services/blockingService';
import { getUserRelationshipStatus } from '../services/followService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../auth/services/firebase';

/**
 * Privacy validation reasons
 */
export const PRIVACY_DENIAL_REASONS = {
  BLOCKED_BY_USER: 'blocked_by_user',
  USER_BLOCKED: 'user_blocked',
  PROFILE_NOT_FOUND: 'profile_not_found',
  PRIVACY_RESTRICTED: 'privacy_restricted',
  NETWORK_ERROR: 'network_error',
  UNKNOWN_ERROR: 'unknown_error',
};

/**
 * Human-readable messages for denial reasons
 */
const DENIAL_MESSAGES = {
  [PRIVACY_DENIAL_REASONS.BLOCKED_BY_USER]: 'This user is not available.',
  [PRIVACY_DENIAL_REASONS.USER_BLOCKED]: 'You have blocked this user.',
  [PRIVACY_DENIAL_REASONS.PROFILE_NOT_FOUND]: 'User profile not found.',
  [PRIVACY_DENIAL_REASONS.PRIVACY_RESTRICTED]: 'This profile is private.',
  [PRIVACY_DENIAL_REASONS.NETWORK_ERROR]:
    'Unable to verify access. Please try again.',
  [PRIVACY_DENIAL_REASONS.UNKNOWN_ERROR]: 'Unable to access this profile.',
};

/**
 * Hook for validating profile access before navigation
 * @param {string} currentUserId - Current user's ID
 * @returns {Object} Privacy validation functions and state
 */
export function usePrivacyValidation(currentUserId) {
  const validationCacheRef = useRef(new Map());
  const [isValidating, setIsValidating] = useState(false);

  /**
   * Clear validation cache for a specific user or all users
   * @param {string} [targetUserId] - User ID to clear, if not provided clears all
   */
  const clearValidationCache = useCallback((targetUserId = null) => {
    if (targetUserId) {
      validationCacheRef.current.delete(targetUserId);
    } else {
      validationCacheRef.current.clear();
    }
  }, []);

  /**
   * Validate if current user can access target user's profile
   * @param {string} targetUserId - User ID to validate access for
   * @param {Object} options - Validation options
   * @param {boolean} options.useCache - Whether to use cached results (default: true)
   * @param {boolean} options.showGenericMessage - Whether to show generic error messages (default: true)
   * @returns {Promise<Object>} Validation result
   */
  const validateProfileAccess = useCallback(
    async (targetUserId, options = {}) => {
      const { useCache = true, showGenericMessage = true } = options;

      // Basic validation
      if (!currentUserId || !targetUserId) {
        return {
          canAccess: false,
          reason: PRIVACY_DENIAL_REASONS.UNKNOWN_ERROR,
          message: DENIAL_MESSAGES[PRIVACY_DENIAL_REASONS.UNKNOWN_ERROR],
          shouldShowFeedback: true,
        };
      }

      // Allow access to own profile
      if (currentUserId === targetUserId) {
        return {
          canAccess: true,
          reason: 'own_profile',
          message: null,
          shouldShowFeedback: false,
        };
      }

      // Check cache first
      const cacheKey = `${currentUserId}-${targetUserId}`;
      if (useCache && validationCacheRef.current.has(cacheKey)) {
        const cached = validationCacheRef.current.get(cacheKey);
        console.log(
          '[usePrivacyValidation] Using cached result for:',
          targetUserId
        );
        return cached;
      }

      setIsValidating(true);

      try {
        // First, fetch and log the target user's privacy settings
        console.log(
          `[usePrivacyValidation] 🔍 Checking privacy settings for user: ${targetUserId}`
        );

        try {
          const userRef = doc(db, 'users', targetUserId);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();
            const privacySettings = userData?.userdata?.settings?.privacy || {};

            console.log(
              `[usePrivacyValidation] 📋 Privacy Settings for ${targetUserId}:`,
              {
                emailVisibility: privacySettings.emailVisibility || 'not set',
                phoneVisibility: privacySettings.phoneVisibility || 'not set',
                locationVisibility:
                  privacySettings.locationVisibility || 'not set',
                profileVisibility:
                  privacySettings.profileVisibility || 'not set',
                bioVisibility: privacySettings.bioVisibility || 'not set',
                profilePictureVisibility:
                  privacySettings.profilePictureVisibility || 'not set',
                requireFollowForEvents:
                  privacySettings.requireFollowForEvents || 'not set',
              }
            );

            console.log(
              `[usePrivacyValidation] 👤 User Display Name: ${userData?.userdata?.contactInfo?.displayName || 'Unknown'}`
            );
          } else {
            console.log(
              `[usePrivacyValidation] ❌ User document not found for: ${targetUserId}`
            );
          }
        } catch (privacyError) {
          console.error(
            '[usePrivacyValidation] Error fetching privacy settings:',
            privacyError
          );
        }

        // Get comprehensive relationship status (includes blocking and following)
        const relationshipStatus = await getUserRelationshipStatus(
          currentUserId,
          targetUserId
        );

        if (!relationshipStatus.success) {
          console.error(
            '[usePrivacyValidation] Failed to get relationship status:',
            relationshipStatus.error
          );
          const result = {
            canAccess: false,
            reason: PRIVACY_DENIAL_REASONS.NETWORK_ERROR,
            message: showGenericMessage
              ? DENIAL_MESSAGES[PRIVACY_DENIAL_REASONS.NETWORK_ERROR]
              : relationshipStatus.error,
            shouldShowFeedback: true,
          };
          return result;
        }

        let validationResult;

        // Check if blocked by target user (highest priority)
        if (relationshipStatus.isBlockedBy) {
          console.log(
            '[usePrivacyValidation] Access denied - user is blocked by target'
          );
          validationResult = {
            canAccess: false,
            reason: PRIVACY_DENIAL_REASONS.BLOCKED_BY_USER,
            message: DENIAL_MESSAGES[PRIVACY_DENIAL_REASONS.BLOCKED_BY_USER],
            shouldShowFeedback: true,
          };
        }
        // Check if current user has blocked target user
        else if (
          relationshipStatus.isBlocked &&
          relationshipStatus.blockedBy === 'current'
        ) {
          console.log(
            '[usePrivacyValidation] Access denied - current user has blocked target'
          );
          validationResult = {
            canAccess: false,
            reason: PRIVACY_DENIAL_REASONS.USER_BLOCKED,
            message: DENIAL_MESSAGES[PRIVACY_DENIAL_REASONS.USER_BLOCKED],
            shouldShowFeedback: true,
          };
        }
        // If no blocking issues, allow access
        else {
          console.log(
            '[usePrivacyValidation] Access granted for:',
            targetUserId
          );
          validationResult = {
            canAccess: true,
            reason: 'access_granted',
            message: null,
            shouldShowFeedback: false,
            relationshipStatus, // Include relationship data for use by calling component
          };
        }

        // Cache the result (with 5 minute expiry to prevent stale blocking status)
        if (useCache) {
          validationCacheRef.current.set(cacheKey, validationResult);

          // Auto-expire cache entries after 5 minutes
          setTimeout(
            () => {
              validationCacheRef.current.delete(cacheKey);
            },
            5 * 60 * 1000
          ); // 5 minutes
        }

        return validationResult;
      } catch (error) {
        console.error(
          '[usePrivacyValidation] Error validating profile access:',
          error
        );

        const result = {
          canAccess: false,
          reason: PRIVACY_DENIAL_REASONS.NETWORK_ERROR,
          message: showGenericMessage
            ? DENIAL_MESSAGES[PRIVACY_DENIAL_REASONS.NETWORK_ERROR]
            : error.message,
          shouldShowFeedback: true,
        };

        return result;
      } finally {
        setIsValidating(false);
      }
    },
    [currentUserId]
  );

  /**
   * Validate profile access and execute navigation callback if allowed
   * @param {string} targetUserId - User ID to validate access for
   * @param {Function} onAccessGranted - Callback to execute if access is granted
   * @param {Function} [onAccessDenied] - Optional callback for when access is denied
   * @param {Object} [options] - Validation options
   * @returns {Promise<boolean>} Whether access was granted
   */
  const validateAndNavigate = useCallback(
    async (
      targetUserId,
      onAccessGranted,
      onAccessDenied = null,
      options = {}
    ) => {
      const validation = await validateProfileAccess(targetUserId, options);

      if (validation.canAccess) {
        // Execute the navigation/access callback
        if (typeof onAccessGranted === 'function') {
          onAccessGranted(validation);
        }
        return true;
      } else {
        // Handle access denial
        if (typeof onAccessDenied === 'function') {
          onAccessDenied(validation);
        }
        return false;
      }
    },
    [validateProfileAccess]
  );

  /**
   * Quick check if a user is blocked (either direction) - useful for avatar rendering
   * @param {string} targetUserId - User ID to check
   * @returns {Promise<boolean>} Whether users are blocked from each other
   */
  const isUserBlocked = useCallback(
    async (targetUserId) => {
      if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
        return false;
      }

      // Check cache first for performance
      const cacheKey = `blocked-${currentUserId}-${targetUserId}`;
      if (validationCacheRef.current.has(cacheKey)) {
        const cached = validationCacheRef.current.get(cacheKey);
        console.log(
          '[usePrivacyValidation] Using cached block status for:',
          targetUserId
        );
        return cached.isBlocked;
      }

      try {
        const blockStatus = await blockingService.isBlocked(
          currentUserId,
          targetUserId
        );
        const result = blockStatus.isBlocked || false;

        // Cache the result for 5 minutes
        validationCacheRef.current.set(cacheKey, {
          isBlocked: result,
          timestamp: Date.now(),
        });

        // Auto-expire cache entries after 5 minutes
        setTimeout(
          () => {
            validationCacheRef.current.delete(cacheKey);
          },
          5 * 60 * 1000
        ); // 5 minutes

        return result;
      } catch (error) {
        console.error(
          '[usePrivacyValidation] Error checking block status:',
          error
        );
        return false; // Fail safe - allow access if check fails
      }
    },
    [currentUserId]
  );

  /**
   * Batch validate multiple user IDs
   * @param {string[]} userIds - Array of user IDs to validate
   * @param {Object} [options] - Validation options
   * @returns {Promise<Object>} Map of userId -> validation result
   */
  const batchValidateAccess = useCallback(
    async (userIds, options = {}) => {
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return {};
      }

      const results = {};

      // Process in parallel for better performance
      const validationPromises = userIds.map(async (userId) => {
        const result = await validateProfileAccess(userId, options);
        return { userId, result };
      });

      const validationResults = await Promise.all(validationPromises);

      validationResults.forEach(({ userId, result }) => {
        results[userId] = result;
      });

      return results;
    },
    [validateProfileAccess]
  );

  return {
    // Main validation functions
    validateProfileAccess,
    validateAndNavigate,
    isUserBlocked,
    batchValidateAccess,

    // Cache management
    clearValidationCache,

    // State
    isValidating,
    validationCacheSize: validationCacheRef.current.size,

    // Constants for easy access
    PRIVACY_DENIAL_REASONS,
    DENIAL_MESSAGES,
  };
}

export default usePrivacyValidation;
