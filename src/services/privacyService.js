// privacyService.js - Privacy checking utilities
import { checkIfMutualFollows } from './followService';
import { blockingService } from './blockingService';
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
  const targetUserId = targetUserData?.uid || targetUserData?.id;
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
  try {
    const targetUserId = targetUserData?.uid || targetUserData?.id;

    // Parameter validation
    if (
      !viewerId ||
      !targetUserId ||
      typeof viewerId !== 'string' ||
      typeof targetUserId !== 'string'
    ) {
      console.warn(
        '[privacyService] Invalid parameters for canViewUserStats:',
        { viewerId, targetUserId }
      );
      return false;
    }

    // User can always see their own stats
    if (viewerId === targetUserId) {
      return true;
    }

    // Check if users are blocked (no access if blocked)
    const blockStatus = await blockingService.isBlocked(viewerId, targetUserId);
    if (blockStatus.isBlocked) {
      console.log(
        '[privacyService] Access denied - users have blocking relationship'
      );
      return false;
    }

    // Get privacy settings (secure defaults)
    const privacySettings = targetUserData?.userdata?.settings?.privacy || {};
    const showStats = privacySettings.showStats || 'friends'; // Default to friends-only
    const showEventHistory = privacySettings.showEventHistory || 'friends'; // Default to friends-only

    // Most restrictive setting wins for stats visibility
    const mostRestrictive =
      showStats === 'never' || showEventHistory === 'never'
        ? 'never'
        : showStats === 'friends' || showEventHistory === 'friends'
          ? 'friends'
          : 'always';

    return await canViewUserInfo(viewerId, targetUserId, mostRestrictive);
  } catch (error) {
    console.error('[privacyService] Error checking stats visibility:', error);
    // Default to secure behavior on error
    return false;
  }
};

/**
 * Check if user can see event history
 * @param {string} viewerId - ID of user trying to view history
 * @param {Object} targetUserData - Target user's full data
 * @returns {Promise<boolean>} Whether event history should be visible
 */
export const canViewEventHistory = async (viewerId, targetUserData) => {
  try {
    const targetUserId = targetUserData?.uid || targetUserData?.id;

    // Parameter validation
    if (
      !viewerId ||
      !targetUserId ||
      typeof viewerId !== 'string' ||
      typeof targetUserId !== 'string'
    ) {
      console.warn(
        '[privacyService] Invalid parameters for canViewEventHistory:',
        { viewerId, targetUserId }
      );
      return false;
    }

    // User can always see their own event history
    if (viewerId === targetUserId) {
      return true;
    }

    // Check if users are blocked (no access if blocked)
    const blockStatus = await blockingService.isBlocked(viewerId, targetUserId);
    if (blockStatus.isBlocked) {
      console.log(
        '[privacyService] Access denied - users have blocking relationship'
      );
      return false;
    }

    // Get privacy settings (secure defaults)
    const privacySettings = targetUserData?.userdata?.settings?.privacy || {};
    const showMyAttendance =
      privacySettings.showMyAttendance !== undefined
        ? privacySettings.showMyAttendance
        : true;
    const canSeeMyEvents = privacySettings.canSeeMyEvents || 'friends'; // Default to friends-only

    // If attendance is completely hidden, deny access
    if (!showMyAttendance) {
      return false;
    }

    // Check event visibility based on privacy setting
    return await canViewUserInfo(viewerId, targetUserId, canSeeMyEvents);
  } catch (error) {
    console.error(
      '[privacyService] Error checking event history visibility:',
      error
    );
    // Default to secure behavior on error
    return false;
  }
};

/**
 * Check if user can see follower counts
 * @param {string} viewerId - ID of user trying to view counts
 * @param {Object} targetUserData - Target user's full data
 * @returns {Promise<boolean>} Whether follower counts should be visible
 */
export const canViewFollowerCounts = async (viewerId, targetUserData) => {
  try {
    const targetUserId = targetUserData?.uid || targetUserData?.id;

    // Parameter validation
    if (
      !viewerId ||
      !targetUserId ||
      typeof viewerId !== 'string' ||
      typeof targetUserId !== 'string'
    ) {
      console.warn(
        '[privacyService] Invalid parameters for canViewFollowerCounts:',
        { viewerId, targetUserId }
      );
      return false;
    }

    // User can always see their own follower counts
    if (viewerId === targetUserId) {
      return true;
    }

    // Check if users are blocked (no access if blocked)
    const blockStatus = await blockingService.isBlocked(viewerId, targetUserId);
    if (blockStatus.isBlocked) {
      console.log(
        '[privacyService] Access denied - users have blocking relationship'
      );
      return false;
    }

    // Get privacy settings (secure defaults)
    const privacySettings = targetUserData?.userdata?.settings?.privacy || {};
    const showFollowerCounts = privacySettings.showFollowerCounts || 'friends'; // Default to friends-only

    return await canViewUserInfo(viewerId, targetUserId, showFollowerCounts);
  } catch (error) {
    console.error(
      '[privacyService] Error checking follower counts visibility:',
      error
    );
    // Default to secure behavior on error
    return false;
  }
};

/**
 * Check if a user's profile is discoverable
 * @param {Object} userData - User's data to check
 * @returns {boolean} Whether profile should appear in searches/discovery
 */
export const isProfileDiscoverable = (userData) => {
  try {
    // Get privacy settings (secure defaults)
    const privacySettings = userData?.userdata?.settings?.privacy || {};

    // Check basic profile visibility
    const profileVisibility =
      privacySettings.profileVisibility !== undefined
        ? privacySettings.profileVisibility
        : true;
    const showInSearch =
      privacySettings.showInSearch !== undefined
        ? privacySettings.showInSearch
        : true;

    // Profile must be visible and searchable to be discoverable
    return profileVisibility && showInSearch;
  } catch (error) {
    console.error(
      '[privacyService] Error checking profile discoverability:',
      error
    );
    // Default to secure behavior on error
    return false;
  }
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
      canViewFollowerCounts: await canViewFollowerCounts(viewerId, user),
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

/**
 * Check if user can view another user's bio/about section
 * @param {string} viewerId - ID of user trying to view bio
 * @param {Object} targetUserData - Target user's full data
 * @returns {Promise<boolean>} Whether bio should be visible
 */
export const canViewUserBio = async (viewerId, targetUserData) => {
  try {
    const targetUserId = targetUserData?.uid || targetUserData?.id;

    // Parameter validation
    if (
      !viewerId ||
      !targetUserId ||
      typeof viewerId !== 'string' ||
      typeof targetUserId !== 'string'
    ) {
      console.warn('[privacyService] Invalid parameters for canViewUserBio:', {
        viewerId,
        targetUserId,
      });
      return false;
    }

    // User can always see their own bio
    if (viewerId === targetUserId) {
      return true;
    }

    // Check if users are blocked (no access if blocked)
    const blockStatus = await blockingService.isBlocked(viewerId, targetUserId);
    if (blockStatus.isBlocked) {
      console.log(
        '[privacyService] Access denied - users have blocking relationship'
      );
      return false;
    }

    // Get privacy settings (secure defaults)
    const privacySettings = targetUserData?.userdata?.settings?.privacy || {};
    const bioVisibility = privacySettings.bioVisibility || 'always'; // Bio is typically more open by default

    return await canViewUserInfo(viewerId, targetUserId, bioVisibility);
  } catch (error) {
    console.error('[privacyService] Error checking bio visibility:', error);
    // Default to secure behavior on error
    return false;
  }
};

/**
 * Check if user can view another user's profile picture
 * @param {string} viewerId - ID of user trying to view profile picture
 * @param {Object} targetUserData - Target user's full data
 * @returns {Promise<boolean>} Whether profile picture should be visible
 */
export const canViewProfilePicture = async (viewerId, targetUserData) => {
  try {
    const targetUserId = targetUserData?.uid || targetUserData?.id;

    // Parameter validation
    if (
      !viewerId ||
      !targetUserId ||
      typeof viewerId !== 'string' ||
      typeof targetUserId !== 'string'
    ) {
      console.warn(
        '[privacyService] Invalid parameters for canViewProfilePicture:',
        { viewerId, targetUserId }
      );
      return false;
    }

    // User can always see their own profile picture
    if (viewerId === targetUserId) {
      return true;
    }

    // Check if users are blocked (no access if blocked)
    const blockStatus = await blockingService.isBlocked(viewerId, targetUserId);
    if (blockStatus.isBlocked) {
      console.log(
        '[privacyService] Access denied - users have blocking relationship'
      );
      return false;
    }

    // Get privacy settings (secure defaults)
    const privacySettings = targetUserData?.userdata?.settings?.privacy || {};
    const profilePictureVisibility =
      privacySettings.profilePictureVisibility || 'always'; // Profile pictures typically public

    // Also check display settings
    const displaySettings = targetUserData?.userdata?.settings?.display || {};
    const showProfilePicture =
      displaySettings.showProfilePicture !== undefined
        ? displaySettings.showProfilePicture
        : true;

    // If user has disabled showing profile picture, respect that setting
    if (!showProfilePicture) {
      return false;
    }

    return await canViewUserInfo(
      viewerId,
      targetUserId,
      profilePictureVisibility
    );
  } catch (error) {
    console.error(
      '[privacyService] Error checking profile picture visibility:',
      error
    );
    // Default to secure behavior on error
    return false;
  }
};

/**
 * Check if user can access another user's profile at all (main gate-keeper function)
 * @param {string} viewerId - ID of user trying to access profile
 * @param {Object} targetUserData - Target user's full data
 * @returns {Promise<{canAccess: boolean, reason: string}>} Access result with reason
 */
export const canAccessUserProfile = async (viewerId, targetUserData) => {
  try {
    const targetUserId = targetUserData?.uid || targetUserData?.id;

    // Parameter validation
    if (
      !viewerId ||
      !targetUserId ||
      typeof viewerId !== 'string' ||
      typeof targetUserId !== 'string'
    ) {
      console.warn(
        '[privacyService] Invalid parameters for canAccessUserProfile:',
        { viewerId, targetUserId }
      );
      return { canAccess: false, reason: 'Invalid parameters' };
    }

    // User can always access their own profile
    if (viewerId === targetUserId) {
      return { canAccess: true, reason: 'Own profile' };
    }

    // Check if users are blocked (critical security check)
    const blockStatus = await blockingService.isBlocked(viewerId, targetUserId);
    if (blockStatus.isBlocked) {
      if (blockStatus.blockedBy === 'current') {
        return { canAccess: false, reason: 'You have blocked this user' };
      } else {
        return { canAccess: false, reason: 'This user has blocked you' };
      }
    }

    // Check if profile is discoverable
    if (!isProfileDiscoverable(targetUserData)) {
      return { canAccess: false, reason: 'Profile is private' };
    }

    // Get privacy settings (secure defaults)
    const privacySettings = targetUserData?.userdata?.settings?.privacy || {};
    const profileVisibility =
      privacySettings.profileVisibility !== undefined
        ? privacySettings.profileVisibility
        : true;

    // If profile visibility is completely disabled
    if (!profileVisibility) {
      return { canAccess: false, reason: 'Profile is private' };
    }

    // Additional privacy check for search visibility
    const showInSearch =
      privacySettings.showInSearch !== undefined
        ? privacySettings.showInSearch
        : true;

    // For discovery contexts, check search visibility
    // (This could be enhanced to pass context about how profile was accessed)
    if (!showInSearch) {
      // Still allow access if users are friends
      const areFriends = await checkIfMutualFollows(viewerId, targetUserId);
      if (!areFriends) {
        return { canAccess: false, reason: 'Profile not discoverable' };
      }
    }

    return { canAccess: true, reason: 'Access granted' };
  } catch (error) {
    console.error('[privacyService] Error checking profile access:', error);
    // Default to secure behavior on error
    return { canAccess: false, reason: 'Error checking access' };
  }
};

/**
 * Enhanced isProfileDiscoverable with better privacy controls
 * @param {Object} userData - User's data to check
 * @returns {boolean} Whether profile should appear in searches/discovery
 */
export const isProfileDiscoverableEnhanced = (userData) => {
  try {
    // Get privacy settings (secure defaults)
    const privacySettings = userData?.userdata?.settings?.privacy || {};

    // Check multiple privacy settings
    const profileVisibility =
      privacySettings.profileVisibility !== undefined
        ? privacySettings.profileVisibility
        : true;
    const showInSearch =
      privacySettings.showInSearch !== undefined
        ? privacySettings.showInSearch
        : true;
    const allowSuggestions =
      privacySettings.allowSuggestions !== undefined
        ? privacySettings.allowSuggestions
        : true;

    // Profile must pass all discoverability checks
    return profileVisibility && showInSearch && allowSuggestions;
  } catch (error) {
    console.error(
      '[privacyService] Error checking enhanced profile discoverability:',
      error
    );
    // Default to secure behavior on error
    return false;
  }
};
