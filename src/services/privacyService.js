// privacyService.js - Privacy checking utilities
import { checkIfFollowing, checkIfMutualFollows } from './followService';
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';

export const VISIBILITY_LEVELS = {
  NEVER: 'never',
  FRIENDS: 'friends',
  ALWAYS: 'always',
};

/**
 * Check if a user can view another user's information based on privacy settings
 * @param {string} viewerId - ID of user trying to view information
 * @param {string} targetUserId - ID of user whose information is being viewed
 * @param {string} visibilityLevel - Privacy setting value ('never', 'friends', 'always')
 * @returns {Promise<boolean>} Whether the viewer can see the information
 */
export const canViewUserInfo = async (
  viewerId,
  targetUserId,
  visibilityLevel
) => {
  // User can always see their own information
  if (viewerId === targetUserId) {
    return true;
  }

  switch (visibilityLevel) {
    case VISIBILITY_LEVELS.NEVER:
      return false;

    case VISIBILITY_LEVELS.ALWAYS:
      return true;

    case VISIBILITY_LEVELS.FRIENDS:
      return await checkIfMutualFollows(viewerId, targetUserId);

    default:
      // Default to everyone if invalid setting (open social system)
      return true;
  }
};

/**
 * Get visible contact information based on privacy settings
 * @param {string} viewerId - ID of user trying to view information
 * @param {Object} targetUserData - Target user's full data
 * @returns {Promise<Object>} Filtered contact information
 */
export const getVisibleContactInfo = async (viewerId, targetUserData) => {
  const targetUserId = targetUserData?.uid;
  const contactInfo = targetUserData?.userdata?.contactInfo || {};
  const privacySettings = targetUserData?.userdata?.settings?.privacy || {};

  // Default privacy settings if not set
  const emailVisibility =
    privacySettings.emailVisibility || VISIBILITY_LEVELS.FRIENDS;
  const phoneVisibility =
    privacySettings.phoneVisibility || VISIBILITY_LEVELS.FRIENDS;
  const locationVisibility =
    privacySettings.locationVisibility || VISIBILITY_LEVELS.ALWAYS;

  const visibleInfo = {
    firstName: contactInfo.firstName,
    lastName: contactInfo.lastName,
    // These fields will be conditionally added below
  };

  // Check email visibility
  if (await canViewUserInfo(viewerId, targetUserId, emailVisibility)) {
    visibleInfo.email = contactInfo.email;
  }

  // Check phone visibility
  if (await canViewUserInfo(viewerId, targetUserId, phoneVisibility)) {
    visibleInfo.phone = contactInfo.phone || contactInfo.phoneNumber;
  }

  // Check location visibility (studio info)
  if (await canViewUserInfo(viewerId, targetUserId, locationVisibility)) {
    visibleInfo.location =
      targetUserData?.location ||
      targetUserData?.userdata?.studios?.default?.studioName;
  }

  return visibleInfo;
};

/**
 * Check if user profile stats should be shown based on privacy settings
 * @param {string} viewerId - ID of user trying to view stats
 * @param {Object} targetUserData - Target user's full data
 * @returns {Promise<boolean>} Whether stats should be visible
 */
export const canViewUserStats = async (viewerId, targetUserData) => {
  // Everyone can see attendance stats now (no privacy controls)
  return true;
};

/**
 * Check if user can see event history
 * @param {string} viewerId - ID of user trying to view history
 * @param {Object} targetUserData - Target user's full data
 * @returns {Promise<boolean>} Whether event history should be visible
 */
export const canViewEventHistory = async (viewerId, targetUserData) => {
  // Everyone can see event history now (no activity privacy)
  return true;
};

/**
 * Check if user can see follower counts
 * @param {string} viewerId - ID of user trying to view counts
 * @param {Object} targetUserData - Target user's full data
 * @returns {boolean} Whether follower counts should be visible
 */
export const canViewFollowerCounts = (viewerId, targetUserData) => {
  // Anyone can see follower counts now (no privacy controls)
  return true;
};

/**
 * Check if a user's profile is discoverable
 * @param {Object} userData - User's data to check
 * @returns {boolean} Whether profile should appear in searches/discovery
 */
export const isProfileDiscoverable = (userData) => {
  // All profiles are discoverable now (no profile visibility setting)
  return true;
};

/**
 * Get privacy-filtered user data for display in lists
 * @param {string} viewerId - ID of user viewing the list
 * @param {Array} users - Array of user objects
 * @returns {Promise<Array>} Filtered user data
 */
export const filterUsersForDisplay = async (viewerId, users) => {
  const filteredUsers = [];

  for (const user of users) {
    // Skip users who have private profiles (unless it's the viewer)
    if (user.id !== viewerId && !isProfileDiscoverable(user)) {
      continue;
    }

    // Get visible contact info
    const visibleContactInfo = await getVisibleContactInfo(viewerId, user);

    filteredUsers.push({
      ...user,
      visibleContactInfo,
      canViewStats: await canViewUserStats(viewerId, user),
      canViewHistory: await canViewEventHistory(viewerId, user),
      canViewFollowerCounts: canViewFollowerCounts(viewerId, user),
    });
  }

  return filteredUsers;
};

/**
 * Check if user has invitation to an event
 * @param {string} userId - User ID to check
 * @param {string} eventId - Event ID to check
 * @param {string} userPhone - User's phone number (optional)
 * @returns {Promise<boolean>} Whether user has invitation
 */
export const hasInvitationToEvent = async (
  userId,
  eventId,
  userPhone = null
) => {
  try {
    // Check for user invitation
    const userInviteQuery = query(
      collection(db, 'invitations'),
      where('eventId', '==', eventId),
      where('guestId', '==', userId),
      where('status', '==', 'pending'),
      limit(1)
    );

    const userInviteSnapshot = await getDocs(userInviteQuery);
    if (!userInviteSnapshot.empty) {
      return true;
    }

    // Check for phone invitation if phone number provided
    if (userPhone) {
      const normalizedPhone = userPhone.replace(/[^\d+]/g, '');
      const phoneInviteQuery = query(
        collection(db, 'invitations'),
        where('eventId', '==', eventId),
        where('guestPhone', '==', normalizedPhone),
        where('status', '==', 'pending'),
        limit(1)
      );

      const phoneInviteSnapshot = await getDocs(phoneInviteQuery);
      if (!phoneInviteSnapshot.empty) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking event invitation:', error);
    return false;
  }
};

/**
 * Check if user is subscribed to an event
 * @param {string} userId - User ID to check
 * @param {string} eventId - Event ID to check
 * @param {string} studioId - Studio ID where event is located
 * @returns {Promise<boolean>} Whether user is subscribed
 */
export const isUserSubscribedToEvent = async (userId, eventId, studioId) => {
  try {
    const eventRef = doc(db, 'studios', studioId, 'events', eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      return false;
    }

    const eventData = eventDoc.data();
    const subscribers = eventData.subscribers || [];
    return subscribers.includes(userId);
  } catch (error) {
    console.error('Error checking event subscription:', error);
    return false;
  }
};

/**
 * Check if user can access/view an event based on all privacy rules
 * @param {string} userId - User trying to view the event
 * @param {string} eventId - Event ID
 * @param {string} studioId - Studio ID
 * @param {Object} eventData - Event data (optional, to avoid re-fetching)
 * @param {Object} hostData - Host user data (optional, to avoid re-fetching)
 * @param {string} userPhone - User's phone number (optional)
 * @param {string} inviteCode - Invite code being used (optional)
 * @returns {Promise<Object>} { canAccess: boolean, reason: string }
 */
export const canUserAccessEvent = async (
  userId,
  eventId,
  studioId,
  eventData = null,
  hostData = null,
  userPhone = null,
  inviteCode = null
) => {
  try {
    // Get event data if not provided
    if (!eventData) {
      const eventRef = doc(db, 'studios', studioId, 'events', eventId);
      const eventDoc = await getDoc(eventRef);

      if (!eventDoc.exists()) {
        return { canAccess: false, reason: 'Event not found' };
      }

      eventData = eventDoc.data();
    }

    // Check if event is active
    if (!eventData.active) {
      return { canAccess: false, reason: 'Event is cancelled' };
    }

    // 1. User is the host - always allow
    if (userId === eventData.createdBy) {
      return { canAccess: true, reason: 'Event host' };
    }

    // 2. User is already subscribed - always allow
    const isSubscribed = await isUserSubscribedToEvent(
      userId,
      eventId,
      studioId
    );
    if (isSubscribed) {
      return { canAccess: true, reason: 'Already subscribed' };
    }

    // 3. User has an invitation - allows access regardless of other settings
    const hasInvitation = await hasInvitationToEvent(
      userId,
      eventId,
      userPhone
    );
    if (hasInvitation) {
      return { canAccess: true, reason: 'Has invitation' };
    }

    // 3a. Check if user's phone is in event's invited phones list (fast check)
    if (eventData.invitedPhones && eventData.invitedPhones.length > 0) {
      const { normalizePhoneNumber } = await import('./phoneAccessService');

      // Check user's display phone number
      if (userPhone) {
        const normalizedPhone = normalizePhoneNumber(userPhone);
        if (
          normalizedPhone &&
          eventData.invitedPhones.includes(normalizedPhone)
        ) {
          return { canAccess: true, reason: 'Phone invited to event' };
        }
      }

      // Also check user's verified phone number if different
      // Get user data to check verified phone
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.exists() ? userDoc.data() : null;
      const verifiedPhone = userData?.userdata?.contactInfo?.verifiedPhone;

      if (verifiedPhone && verifiedPhone !== userPhone) {
        const normalizedVerified = normalizePhoneNumber(verifiedPhone);
        if (
          normalizedVerified &&
          eventData.invitedPhones.includes(normalizedVerified)
        ) {
          return { canAccess: true, reason: 'Verified phone invited to event' };
        }
      }
    }

    // 4. Valid invite code provided - allows access regardless of other settings
    if (
      inviteCode &&
      eventData.inviteCode === inviteCode &&
      eventData.inviteCodeEnabled
    ) {
      return { canAccess: true, reason: 'Valid invite code' };
    }

    // 5. Public event - check host's friend requirements
    if (!eventData.isPrivate) {
      // Get host data if not provided
      if (!hostData) {
        const hostRef = doc(db, 'users', eventData.createdBy);
        const hostDoc = await getDoc(hostRef);
        hostData = hostDoc.exists() ? hostDoc.data() : null;
      }

      // Check if host requires friends for events
      const requiresFriends =
        hostData?.userdata?.settings?.privacy?.requireFollowForEvents || false;

      if (!requiresFriends) {
        return { canAccess: true, reason: 'Public event' };
      }

      // Check if user is friends with host (mutual follows)
      const areFriends = await checkIfMutualFollows(
        userId,
        eventData.createdBy
      );
      if (areFriends) {
        return { canAccess: true, reason: 'Friends with host' };
      }

      return {
        canAccess: false,
        reason: 'Host requires friendship to see events',
      };
    }

    // 6. Private event - only invited users or friends can access
    return { canAccess: false, reason: 'Private event - invitation required' };
  } catch (error) {
    console.error('Error checking event access:', error);
    return { canAccess: false, reason: 'Error checking access' };
  }
};
