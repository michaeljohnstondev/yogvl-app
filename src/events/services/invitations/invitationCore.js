// FILE: invitations/invitationCore.js - Core constants, types, and data models

/**
 * INVITATION DATA MODEL:
 *
 * Collection: /invitations/{inviteId}
 * {
 *   id: string,
 *   eventId: string,
 *   hostId: string (event creator),
 *   guestId: string (invited user),
 *   guestEmail?: string (if invited by email),
 *   guestPhone?: string (if invited by phone),
 *   status: 'pending' | 'accepted' | 'declined' | 'expired',
 *   invitedAt: Timestamp,
 *   respondedAt?: Timestamp,
 *   message?: string (optional personal message),
 *   type: 'user' | 'email' | 'phone', // how they were invited
 * }
 *
 * Event updates:
 * - invitations: [inviteId] // track all invitations
 * - pendingInvites: number // count of pending invites
 */

// INVITATION STATUS CONSTANTS
export const INVITATION_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  EXPIRED: 'expired',
  KICKED: 'kicked',
};

export const INVITATION_TYPE = {
  USER: 'user', // Invited existing app user
  EMAIL: 'email', // Invited via email (may not have account)
  PHONE: 'phone', // Invited via SMS (may not have account)
};

// Common validation functions
export const validateInvitationData = (data) => {
  const { eventId, hostId, guestId } = data;

  if (!eventId || !hostId) {
    throw new Error(
      'Missing required invitation parameters: eventId and hostId'
    );
  }

  if (!guestId && !data.guestEmail && !data.guestPhone) {
    throw new Error('Must provide either guestId, guestEmail, or guestPhone');
  }

  return true;
};

export const generateInvitationId = () => {
  return `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export default {
  INVITATION_STATUS,
  INVITATION_TYPE,
  validateInvitationData,
  generateInvitationId,
};
