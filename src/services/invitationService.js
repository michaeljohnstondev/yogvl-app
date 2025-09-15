// FILE: services/invitationService.js - Invitation Management Service
// Extracted from InviteScreen to follow proper service separation

import { sendGuestInvitation } from './friendService';

/**
 * Send invitations for existing events
 * @param {Object} params - Invitation parameters
 * @param {string} params.currentUserId - ID of user sending invitations
 * @param {string} params.eventId - ID of event to invite to
 * @param {string} params.studioId - ID of studio containing the event
 * @param {Object} params.userData - Current user data
 * @param {string} params.eventTitle - Title of event
 * @param {string} params.source - Source of invitation
 * @param {Array} params.users - App users to invite
 * @param {Array} params.contacts - Email contacts to invite
 * @param {Array} params.phoneContacts - Phone contacts to invite
 * @returns {Object} Result with success counts and error details
 */
export const sendEventInvitations = async ({
  currentUserId,
  eventId,
  studioId,
  userData,
  eventTitle,
  source,
  users = [],
  contacts = [],
  phoneContacts = [],
}) => {
  const totalInvitations =
    users.length + contacts.length + phoneContacts.length;

  if (totalInvitations === 0) {
    throw new Error('NO_INVITATIONS_SELECTED');
  }

  let successfulInvitations = 0;
  let alreadyInvitedCount = 0;
  const errors = [];

  // Send guest invitations for app users
  if (users.length > 0) {
    const invitationPromises = users.map(async (user) => {
      try {
        await sendGuestInvitation(
          currentUserId,
          user.id,
          eventId,
          studioId,
          userData,
          { title: eventTitle }, // Simplified event data
          source
        );
        successfulInvitations++;
      } catch (error) {
        console.error(`Failed to send invitation to ${user.name}:`, error);
        if (
          error.message?.includes('already been invited') ||
          error.message?.includes('already attending')
        ) {
          alreadyInvitedCount++;
        } else {
          errors.push({
            userId: user.id,
            userName: user.name,
            error: error.message,
          });
        }
      }
    });

    await Promise.all(invitationPromises);
  }

  // Add phone contacts to successful count (they don't have the same validation)
  successfulInvitations += phoneContacts.length;

  return {
    success: true,
    totalAttempted: totalInvitations,
    successfulInvitations,
    alreadyInvitedCount,
    errors,
    summary: {
      sent: successfulInvitations,
      alreadyInvited: alreadyInvitedCount,
      failed: errors.length,
    },
  };
};

/**
 * Validate invitation data before sending
 * @param {Object} selectedData - Selected users/contacts to invite
 * @param {number} maxLimit - Maximum allowed selections
 * @returns {Object} Validation result
 */
export const validateInvitationSelection = (selectedData, maxLimit = null) => {
  const { users = [], contacts = [], phoneContacts = [] } = selectedData;
  const totalSelected = users.length + contacts.length + phoneContacts.length;

  if (totalSelected === 0) {
    return {
      isValid: false,
      error: 'NO_SELECTIONS',
      message: 'Please select people to invite.',
    };
  }

  if (maxLimit && totalSelected > maxLimit) {
    return {
      isValid: false,
      error: 'LIMIT_EXCEEDED',
      message: `You can only invite ${maxLimit} people. Currently selected: ${totalSelected}`,
    };
  }

  return {
    isValid: true,
    totalSelected,
    breakdown: {
      appUsers: users.length,
      emailContacts: contacts.length,
      phoneContacts: phoneContacts.length,
    },
  };
};

/**
 * Format invitation result messages for UI display
 * @param {Object} result - Result from sendEventInvitations
 * @returns {Object} Formatted messages for display
 */
export const formatInvitationMessages = (result) => {
  const messages = [];

  if (result.successfulInvitations > 0) {
    messages.push({
      type: 'success',
      title: 'Invitations Sent!',
      message: `Sent ${result.successfulInvitations} invitation${result.successfulInvitations === 1 ? '' : 's'}! 📬`,
    });
  }

  if (result.alreadyInvitedCount > 0) {
    messages.push({
      type: 'info',
      title: 'Some Already Invited',
      message: `${result.alreadyInvitedCount} user${result.alreadyInvitedCount === 1 ? ' was' : 's were'} already invited or attending this event.`,
    });
  }

  if (result.errors.length > 0) {
    messages.push({
      type: 'warning',
      title: 'Some Invitations Failed',
      message: `${result.errors.length} invitation${result.errors.length === 1 ? '' : 's'} could not be sent. Please try again.`,
    });
  }

  return messages;
};
