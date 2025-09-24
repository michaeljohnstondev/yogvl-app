// FILE: functions/notifications/cohostInvitationNotifications.js
// Cohost invitation notification handlers using direct Firestore triggers

const admin = require('firebase-admin');
const functions = require('firebase-functions');

/**
 * Triggered when a cohost invitation document is created
 * Trigger: users/{userId}/cohostInvitations/{invitationId} (document created)
 * Sends notifications to newly invited cohosts
 */
exports.onCohostInvitation = functions.firestore
  .document('users/{userId}/cohostInvitations/{invitationId}')
  .onCreate(async (snap, context) => {
    const { userId, invitationId } = context.params;
    const invitationData = snap.data();

    console.log(`[Cohost Invitation] New cohost invitation ${invitationId} created for user ${userId}`);

    try {
      // Extract invitation data
      const {
        inviterId,
        recipientId,
        eventId,
        studioId,
        inviterData,
        eventData
      } = invitationData;

      if (!inviterId || !recipientId || !eventId) {
        console.log(`[Cohost Invitation] Missing required data in invitation ${invitationId}`);
        return;
      }

      // Get invitee details and notification settings
      const inviteeDoc = await admin.firestore().doc(`users/${recipientId}`).get();

      if (!inviteeDoc.exists) {
        console.log(`[Cohost Invitation] Invitee ${recipientId} not found`);
        return;
      }

      const inviteeData = inviteeDoc.data();

      // Check if invitee has enabled event invitation notifications
      // Note: Using app.eventInvitations for cohost invites as well
      const eventInvitationsEnabled = inviteeData?.userdata?.settings?.notifications?.app?.eventInvitations;

      if (eventInvitationsEnabled === false) {
        console.log(`[Cohost Invitation] Invitee ${recipientId} has disabled event invitation notifications`);
        return;
      }

      // Get invitee's FCM token
      const fcmToken = inviteeData?.deviceInfo?.fcmToken;

      if (!fcmToken) {
        console.log(`[Cohost Invitation] Invitee ${recipientId} has no FCM token`);
        return;
      }

      // Extract inviter and event information
      const inviterName =
        inviterData?.firstName ||
        inviterData?.displayName ||
        'Someone';

      const eventTitle = eventData?.title || 'Untitled Event';

      // Send FCM notification with navigation stack
      const message = {
        token: fcmToken,
        notification: {
          title: 'Cohost Invitation',
          body: `${inviterName} invited you to co-host "${eventTitle}"`
        },
        data: {
          type: 'cohost_invitation',
          resetStack: 'true',
          navigationStack: 'Home,EventDetail',
          eventId: eventId,
          studioId: studioId || '',
          eventTitle: eventTitle,
          inviterId: inviterId,
          inviterName: inviterName,
          invitationId: invitationId,
          actionType: 'cohost_invitation'
        }
      };

      await admin.messaging().send(message);

      console.log(`[Cohost Invitation] Successfully sent cohost invitation notification to ${recipientId} for event ${eventId}`);

    } catch (error) {
      console.error(`[Cohost Invitation] Error processing cohost invitation:`, error);
      // Don't throw - we don't want to retry failed notifications
    }
  });