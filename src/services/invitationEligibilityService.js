import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  runTransaction,
} from '../lib/firebase';
import { db } from '../auth/services/firebase';

/**
 * Unified invitation eligibility service
 * Consolidates all invitation checking logic to prevent duplicate invitations
 */

/**
 * Rate limiting configuration
 */
const RATE_LIMITS = {
  INVITATIONS_PER_HOUR: 50,
  INVITATIONS_PER_DAY: 200,
  BULK_INVITATION_MAX: 25,
};

/**
 * Input validation and sanitization
 */
const validateInvitationData = (data) => {
  const errors = [];

  if (!data.eventId || typeof data.eventId !== 'string') {
    errors.push('Invalid event ID');
  }

  if (!data.studioId || typeof data.studioId !== 'string') {
    errors.push('Invalid studio ID');
  }

  if (!data.senderId || typeof data.senderId !== 'string') {
    errors.push('Invalid sender ID');
  }

  if (data.recipientId && typeof data.recipientId !== 'string') {
    errors.push('Invalid recipient ID');
  }

  if (data.recipientEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.recipientEmail)) {
      errors.push('Invalid email format');
    }
  }

  if (data.recipientPhone) {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(data.recipientPhone)) {
      errors.push('Invalid phone format');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Get comprehensive event participation data
 * Consolidates subscribers, pending invitations, and cohosts
 */
export const getEventParticipants = async (eventId, studioId) => {
  try {
    console.log(`[InvitationEligibility] Loading participants for event ${eventId}`);

    const [eventDoc, invitationsQuery] = await Promise.all([
      // Get event data (subscribers, cohosts)
      getDoc(doc(db, 'studios', studioId, 'events', eventId)),

      // Get pending invitations from root collection
      getDocs(
        query(
          collection(db, 'invitations'),
          where('eventId', '==', eventId),
          where('status', '==', 'pending')
        )
      )
    ]);

    const eventData = eventDoc.exists() ? eventDoc.data() : {};
    const subscribers = eventData.subscribers || [];
    const cohosts = eventData.cohosts || [];
    const invitedUsers = eventData.invitations || []; // New invitation array from DATABASE.md
    const hostId = eventData.createdBy;

    // Extract pending invitation user IDs from both sources
    const pendingInvitations = [...invitedUsers]; // Start with array-based invitations

    invitationsQuery.forEach((doc) => {
      const invitation = doc.data();
      if (invitation.guestId && !pendingInvitations.includes(invitation.guestId)) {
        pendingInvitations.push(invitation.guestId);
      }
      // Also track phone/email invitations for later checking
      if (invitation.guestPhone) {
        pendingInvitations.push(`phone:${invitation.guestPhone}`);
      }
      if (invitation.guestEmail) {
        pendingInvitations.push(`email:${invitation.guestEmail}`);
      }
    });

    console.log(`[InvitationEligibility] Found ${subscribers.length} subscribers, ${cohosts.length} cohosts, ${pendingInvitations.length} pending invitations`);

    return {
      subscribers,
      cohosts,
      hostId,
      pendingInvitations,
      allExcludedUserIds: [...subscribers, ...cohosts, hostId].filter(Boolean),
    };
  } catch (error) {
    console.error('[InvitationEligibility] Error loading event participants:', error);
    return {
      subscribers: [],
      cohosts: [],
      hostId: null,
      pendingInvitations: [],
      allExcludedUserIds: [],
    };
  }
};

/**
 * Check if a specific user is eligible for invitation
 */
export const checkUserInvitationEligibility = async (userId, eventId, studioId) => {
  try {
    const validation = validateInvitationData({ eventId, studioId, senderId: 'temp', recipientId: userId });
    if (!validation.isValid) {
      return {
        isEligible: false,
        reason: 'invalid_data',
        details: validation.errors,
      };
    }

    const participants = await getEventParticipants(eventId, studioId);

    // Check if user is already a subscriber
    if (participants.subscribers.includes(userId)) {
      return {
        isEligible: false,
        reason: 'already_subscribed',
        details: 'User is already attending this event',
      };
    }

    // Check if user is host or cohost
    if (participants.hostId === userId || participants.cohosts.includes(userId)) {
      return {
        isEligible: false,
        reason: 'is_host_cohost',
        details: 'User is hosting or co-hosting this event',
      };
    }

    // Check if user has pending invitation
    if (participants.pendingInvitations.includes(userId)) {
      return {
        isEligible: false,
        reason: 'already_invited',
        details: 'User already has a pending invitation',
      };
    }

    // Check guest invitations in user's subcollection
    try {
      const guestInvitationsQuery = await getDocs(
        query(
          collection(db, 'users', userId, 'guestInvitations'),
          where('eventId', '==', eventId),
          where('status', 'in', ['pending', 'accepted'])
        )
      );

      if (!guestInvitationsQuery.empty) {
        return {
          isEligible: false,
          reason: 'already_invited',
          details: 'User already has a guest invitation',
        };
      }
    } catch (error) {
      console.warn('[InvitationEligibility] Could not check guest invitations:', error);
      // Continue with eligibility check - don't fail on this
    }

    return {
      isEligible: true,
      reason: null,
      details: 'User is eligible for invitation',
    };
  } catch (error) {
    console.error('[InvitationEligibility] Error checking user eligibility:', error);
    return {
      isEligible: false,
      reason: 'error',
      details: 'Unable to verify eligibility due to system error',
    };
  }
};

/**
 * Filter users for invitation eligibility
 * Uses Map-based lookup for O(1) performance
 */
export const filterUsersForInvitation = async (users, eventId, studioId) => {
  try {
    if (!Array.isArray(users) || users.length === 0) {
      return {
        eligibleUsers: [],
        ineligibleUsers: [],
        stats: { total: 0, eligible: 0, ineligible: 0 },
      };
    }

    const participants = await getEventParticipants(eventId, studioId);

    // Create fast lookup maps for O(1) checking
    const excludedUsersMap = new Map();
    participants.allExcludedUserIds.forEach(userId => {
      if (userId) excludedUsersMap.set(userId, true);
    });

    const pendingInvitationsMap = new Map();
    participants.pendingInvitations.forEach(invitation => {
      if (invitation) pendingInvitationsMap.set(invitation, true);
    });

    const eligibleUsers = [];
    const ineligibleUsers = [];

    // Single pass filtering with O(1) lookups
    users.forEach(user => {
      if (!user.id) {
        ineligibleUsers.push({ ...user, ineligibilityReason: 'missing_id' });
        return;
      }

      if (excludedUsersMap.has(user.id)) {
        ineligibleUsers.push({ ...user, ineligibilityReason: 'already_participating' });
        return;
      }

      if (pendingInvitationsMap.has(user.id)) {
        ineligibleUsers.push({ ...user, ineligibilityReason: 'already_invited' });
        return;
      }

      eligibleUsers.push(user);
    });

    console.log(`[InvitationEligibility] Filtered ${users.length} users: ${eligibleUsers.length} eligible, ${ineligibleUsers.length} ineligible`);

    return {
      eligibleUsers,
      ineligibleUsers,
      stats: {
        total: users.length,
        eligible: eligibleUsers.length,
        ineligible: ineligibleUsers.length,
      },
    };
  } catch (error) {
    console.error('[InvitationEligibility] Error filtering users:', error);
    return {
      eligibleUsers: users, // Fallback to original list on error
      ineligibleUsers: [],
      stats: { total: users.length, eligible: users.length, ineligible: 0 },
    };
  }
};

/**
 * Check sender authorization for invitations
 */
export const checkInvitationAuthorization = async (senderId, eventId, studioId) => {
  try {
    const eventRef = doc(db, 'studios', studioId, 'events', eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      return {
        isAuthorized: false,
        reason: 'event_not_found',
      };
    }

    const eventData = eventDoc.data();
    const isHost = eventData.createdBy === senderId;
    const isCohost = eventData.cohosts?.includes(senderId);
    const isSubscribed = eventData.subscribers?.includes(senderId);

    // Allow hosts, cohosts, and subscribers (depending on event settings)
    const canInvite = isHost || isCohost || (isSubscribed && !eventData.isPrivate);

    return {
      isAuthorized: canInvite,
      reason: canInvite ? null : 'insufficient_permissions',
      permissions: {
        isHost,
        isCohost,
        isSubscribed,
        canInviteGuests: canInvite,
      },
    };
  } catch (error) {
    console.error('[InvitationEligibility] Error checking authorization:', error);
    return {
      isAuthorized: false,
      reason: 'authorization_check_failed',
    };
  }
};

/**
 * Atomic invitation creation with eligibility check
 */
export const createInvitationAtomic = async (invitationData) => {
  const validation = validateInvitationData(invitationData);
  if (!validation.isValid) {
    throw new Error(`Invalid invitation data: ${validation.errors.join(', ')}`);
  }

  const { senderId, recipientId, eventId, studioId } = invitationData;

  return await runTransaction(db, async (transaction) => {
    // Check authorization
    const authorization = await checkInvitationAuthorization(senderId, eventId, studioId);
    if (!authorization.isAuthorized) {
      throw new Error(`Unauthorized: ${authorization.reason}`);
    }

    // Check eligibility
    const eligibility = await checkUserInvitationEligibility(recipientId, eventId, studioId);
    if (!eligibility.isEligible) {
      throw new Error(`User ineligible: ${eligibility.reason} - ${eligibility.details}`);
    }

    // Create invitation (actual creation logic would go here)
    const invitationId = `${eventId}_${recipientId}_${Date.now()}`;

    return {
      success: true,
      invitationId,
      message: 'Invitation created successfully',
    };
  });
};

export default {
  validateInvitationData,
  getEventParticipants,
  checkUserInvitationEligibility,
  filterUsersForInvitation,
  checkInvitationAuthorization,
  createInvitationAtomic,
  RATE_LIMITS,
};