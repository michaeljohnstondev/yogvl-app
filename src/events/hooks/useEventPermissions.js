import { useMemo } from 'react';
import { getUserEventPermissions, validateEventJoinConstraints } from '../lib/eventUtils';

/**
 * Custom hook for calculating event permissions and join constraints
 * Memoizes expensive permission calculations to prevent unnecessary rerenders
 *
 * @param {string} currentUserId - Current user's ID
 * @param {Object} userData - Current user's data
 * @param {Object} event - Event object
 * @param {boolean} isSubscribed - Whether user is subscribed to event
 * @returns {Object} - Permissions and join constraints
 */
export const useEventPermissions = (currentUserId, userData, event, isSubscribed) => {
  // Memoize permissions calculation
  const permissions = useMemo(() => {
    if (!currentUserId || !userData || !event) {
      return {
        canEdit: false,
        canDelete: false,
        canManageAttendance: false,
        canInvite: false,
        isCreator: false,
        isCohost: false,
        isAdmin: false,
      };
    }

    return getUserEventPermissions(currentUserId, userData, event);
  }, [currentUserId, userData, event]);

  // Memoize join constraints calculation
  const joinConstraints = useMemo(() => {
    if (!event) {
      return {
        canJoin: false,
        reason: 'Event not loaded',
      };
    }

    return validateEventJoinConstraints(event, isSubscribed);
  }, [event, isSubscribed]);

  return {
    permissions,
    joinConstraints,
  };
};