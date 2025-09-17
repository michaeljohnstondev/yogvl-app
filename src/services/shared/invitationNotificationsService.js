// FILE: invitationNotificationsService.js - Invitation-Specific Notification System

import {
  notificationEngine,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITY,
} from './NotificationEngine';

/**
 * Notifies user when they receive an event invitation
 * @param {Object} params - Notification parameters
 * @param {string} params.guestId - User being invited
 * @param {string} params.inviterId - User sending invitation
 * @param {string} params.inviterName - Inviter's display name
 * @param {string} params.eventId - Event ID
 * @param {string} params.eventTitle - Event title
 * @param {string} params.invitationId - Invitation ID
 * @param {string} [params.message] - Custom invitation message
 * @returns {Promise<Object>} Notification result
 */
export const notifyEventInvitation = async ({
  guestId,
  inviterId,
  inviterName,
  eventId,
  eventTitle,
  invitationId,
  message = null,
}) => {
  try {
    if (
      !guestId ||
      !inviterId ||
      !inviterName ||
      !eventId ||
      !eventTitle ||
      !invitationId
    ) {
      throw new Error(
        'Missing required parameters for event invitation notification'
      );
    }

    console.log(
      `[InvitationNotifications] Sending event invitation notification to ${guestId}`
    );

    const notificationMessage = message
      ? `${inviterName} invited you to "${eventTitle}": ${message}`
      : `${inviterName} invited you to join "${eventTitle}"`;

    const notificationId = await notificationEngine.createNotification({
      userId: guestId,
      type: NOTIFICATION_TYPES.INVITATION_RECEIVED,
      title: 'Event Invitation',
      message: notificationMessage,
      data: {
        eventId,
        eventTitle,
        inviterId,
        inviterName,
        invitationId,
        customMessage: message,
        actionType: 'invitation_received',
      },
      priority: NOTIFICATION_PRIORITY.NORMAL,
    });

    return {
      success: true,
      notificationId,
      message: 'Event invitation notification sent successfully',
    };
  } catch (error) {
    console.error(
      '[InvitationNotifications] Error sending event invitation notification:',
      error
    );
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Notifies host when someone accepts their event invitation
 * @param {Object} params - Notification parameters
 * @param {string} params.hostId - Event host user ID
 * @param {string} params.guestId - User who accepted invitation
 * @param {string} params.guestName - Guest's display name
 * @param {string} params.eventId - Event ID
 * @param {string} params.eventTitle - Event title
 * @param {string} params.invitationId - Invitation ID
 * @returns {Promise<Object>} Notification result
 */
export const notifyInvitationAccepted = async ({
  hostId,
  guestId,
  guestName,
  eventId,
  eventTitle,
  invitationId,
}) => {
  try {
    if (
      !hostId ||
      !guestId ||
      !guestName ||
      !eventId ||
      !eventTitle ||
      !invitationId
    ) {
      throw new Error(
        'Missing required parameters for invitation accepted notification'
      );
    }

    console.log(
      `[InvitationNotifications] Sending invitation accepted notification to ${hostId}`
    );

    const notificationId = await notificationEngine.createNotification({
      userId: hostId,
      type: NOTIFICATION_TYPES.INVITATION_ACCEPTED,
      title: 'Invitation Accepted!',
      message: `${guestName} accepted your invitation to "${eventTitle}"`,
      data: {
        eventId,
        eventTitle,
        guestId,
        guestName,
        invitationId,
        actionType: 'invitation_accepted',
      },
      priority: NOTIFICATION_PRIORITY.NORMAL,
    });

    return {
      success: true,
      notificationId,
      message: 'Invitation accepted notification sent successfully',
    };
  } catch (error) {
    console.error(
      '[InvitationNotifications] Error sending invitation accepted notification:',
      error
    );
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Notifies host when someone declines their event invitation
 * @param {Object} params - Notification parameters
 * @param {string} params.hostId - Event host user ID
 * @param {string} params.guestId - User who declined invitation
 * @param {string} params.guestName - Guest's display name
 * @param {string} params.eventId - Event ID
 * @param {string} params.eventTitle - Event title
 * @param {string} params.invitationId - Invitation ID
 * @returns {Promise<Object>} Notification result
 */
export const notifyInvitationDeclined = async ({
  hostId,
  guestId,
  guestName,
  eventId,
  eventTitle,
  invitationId,
}) => {
  try {
    if (
      !hostId ||
      !guestId ||
      !guestName ||
      !eventId ||
      !eventTitle ||
      !invitationId
    ) {
      throw new Error(
        'Missing required parameters for invitation declined notification'
      );
    }

    console.log(
      `[InvitationNotifications] Sending invitation declined notification to ${hostId}`
    );

    const notificationId = await notificationEngine.createNotification({
      userId: hostId,
      type: NOTIFICATION_TYPES.INVITATION_DECLINED,
      title: 'Invitation Declined',
      message: `${guestName} declined your invitation to "${eventTitle}"`,
      data: {
        eventId,
        eventTitle,
        guestId,
        guestName,
        invitationId,
        actionType: 'invitation_declined',
      },
      priority: NOTIFICATION_PRIORITY.LOW,
    });

    return {
      success: true,
      notificationId,
      message: 'Invitation declined notification sent successfully',
    };
  } catch (error) {
    console.error(
      '[InvitationNotifications] Error sending invitation declined notification:',
      error
    );
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Notifies user when they receive a cohost invitation
 * @param {Object} params - Notification parameters
 * @param {string} params.inviteeId - User being invited to cohost
 * @param {string} params.hostId - Event host user ID
 * @param {string} params.hostName - Host's display name
 * @param {string} params.eventId - Event ID
 * @param {string} params.eventTitle - Event title
 * @param {string} params.invitationId - Invitation ID
 * @returns {Promise<Object>} Notification result
 */
export const notifyCohostInvitation = async ({
  inviteeId,
  hostId,
  hostName,
  eventId,
  eventTitle,
  invitationId,
}) => {
  try {
    if (
      !inviteeId ||
      !hostId ||
      !hostName ||
      !eventId ||
      !eventTitle ||
      !invitationId
    ) {
      throw new Error(
        'Missing required parameters for cohost invitation notification'
      );
    }

    console.log(
      `[InvitationNotifications] Sending cohost invitation notification to ${inviteeId}`
    );

    const notificationId = await notificationEngine.createNotification({
      userId: inviteeId,
      type: NOTIFICATION_TYPES.COHOST_INVITATION,
      title: 'Cohost Invitation',
      message: `${hostName} invited you to co-host "${eventTitle}"`,
      data: {
        eventId,
        eventTitle,
        hostId,
        hostName,
        invitationId,
        actionType: 'cohost_invitation',
      },
      priority: NOTIFICATION_PRIORITY.HIGH,
    });

    return {
      success: true,
      notificationId,
      message: 'Cohost invitation notification sent successfully',
    };
  } catch (error) {
    console.error(
      '[InvitationNotifications] Error sending cohost invitation notification:',
      error
    );
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Notifies host when someone accepts cohost invitation
 * @param {Object} params - Notification parameters
 * @param {string} params.hostId - Event host user ID
 * @param {string} params.cohostId - User who accepted cohost invitation
 * @param {string} params.cohostName - Cohost's display name
 * @param {string} params.eventId - Event ID
 * @param {string} params.eventTitle - Event title
 * @param {string} params.invitationId - Invitation ID
 * @returns {Promise<Object>} Notification result
 */
export const notifyCohostAccepted = async ({
  hostId,
  cohostId,
  cohostName,
  eventId,
  eventTitle,
  invitationId,
}) => {
  try {
    if (
      !hostId ||
      !cohostId ||
      !cohostName ||
      !eventId ||
      !eventTitle ||
      !invitationId
    ) {
      throw new Error(
        'Missing required parameters for cohost accepted notification'
      );
    }

    console.log(
      `[InvitationNotifications] Sending cohost accepted notification to ${hostId}`
    );

    const notificationId = await notificationEngine.createNotification({
      userId: hostId,
      type: NOTIFICATION_TYPES.COHOST_ACCEPTED,
      title: 'Cohost Accepted!',
      message: `${cohostName} accepted your cohost invitation for "${eventTitle}"`,
      data: {
        eventId,
        eventTitle,
        cohostId,
        cohostName,
        invitationId,
        actionType: 'cohost_accepted',
      },
      priority: NOTIFICATION_PRIORITY.NORMAL,
    });

    return {
      success: true,
      notificationId,
      message: 'Cohost accepted notification sent successfully',
    };
  } catch (error) {
    console.error(
      '[InvitationNotifications] Error sending cohost accepted notification:',
      error
    );
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Sends bulk invitation notifications for multiple recipients
 * @param {Object} params - Notification parameters
 * @param {string[]} params.recipientIds - Array of recipient user IDs
 * @param {string} params.inviterId - User sending invitations
 * @param {string} params.inviterName - Inviter's display name
 * @param {string} params.eventId - Event ID
 * @param {string} params.eventTitle - Event title
 * @param {Object} params.invitationIds - Map of userId -> invitationId
 * @param {string} [params.message] - Custom invitation message
 * @returns {Promise<Object>} Notification results
 */
export const sendBulkInvitationNotifications = async ({
  recipientIds,
  inviterId,
  inviterName,
  eventId,
  eventTitle,
  invitationIds,
  message = null,
}) => {
  try {
    if (
      !recipientIds ||
      !Array.isArray(recipientIds) ||
      !inviterId ||
      !inviterName ||
      !eventId ||
      !eventTitle ||
      !invitationIds
    ) {
      throw new Error(
        'Missing required parameters for bulk invitation notifications'
      );
    }

    if (recipientIds.length === 0) {
      console.log(
        '[InvitationNotifications] No recipients to send invitations to'
      );
      return { success: true, notificationsSent: 0 };
    }

    console.log(
      `[InvitationNotifications] Sending bulk invitation notifications to ${recipientIds.length} recipients`
    );

    // Send notifications to all recipients in parallel
    const notificationPromises = recipientIds.map((recipientId) =>
      notifyEventInvitation({
        guestId: recipientId,
        inviterId,
        inviterName,
        eventId,
        eventTitle,
        invitationId: invitationIds[recipientId],
        message,
      }).catch((error) => {
        console.error(
          `[InvitationNotifications] Failed to notify recipient ${recipientId}:`,
          error
        );
        return { success: false };
      })
    );

    const results = await Promise.allSettled(notificationPromises);
    const successCount = results.filter(
      (result) =>
        result.status === 'fulfilled' && result.value?.success === true
    ).length;

    return {
      success: successCount > 0,
      notificationsSent: successCount,
      totalRecipients: recipientIds.length,
      message: `Bulk invitation notifications sent to ${successCount}/${recipientIds.length} recipients`,
    };
  } catch (error) {
    console.error(
      '[InvitationNotifications] Error sending bulk invitation notifications:',
      error
    );
    return {
      success: false,
      error: error.message,
    };
  }
};

export default {
  notifyEventInvitation,
  notifyInvitationAccepted,
  notifyInvitationDeclined,
  notifyCohostInvitation,
  notifyCohostAccepted,
  sendBulkInvitationNotifications,
};
