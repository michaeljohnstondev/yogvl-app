// FILE: functions/notifications/eventInvitationNotifications.js
// Event invitation notification handlers using direct Firestore triggers

const admin = require('firebase-admin');
const functions = require('firebase-functions');

/**
 * Triggered when an event document is updated - detects new guest invitations
 * Trigger: studios/{studioId}/events/{eventId} (document updated)
 * Sends notifications to newly invited users
 */
exports.onEventInvitation = functions.firestore
  .document('studios/{studioId}/events/{eventId}')
  .onUpdate(async (change, context) => {
    const { studioId, eventId } = context.params;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    console.log(`[Event Invitation] Event ${eventId} updated in studio ${studioId}`);

    try {
      // Get invitation arrays from before and after
      const beforeInvitations = beforeData.invitations || [];
      const afterInvitations = afterData.invitations || [];

      // Find newly added invitations using set difference
      const newInvitations = afterInvitations.filter(
        userId => !beforeInvitations.includes(userId)
      );

      if (newInvitations.length === 0) {
        console.log(`[Event Invitation] No new invitations detected for event ${eventId}`);
        return;
      }

      console.log(`[Event Invitation] Found ${newInvitations.length} new invitations for event ${eventId}:`, newInvitations);

      const eventTitle = afterData.title || 'Untitled Event';

      // Get inviter information from lastInviter field (set by sendGuestInvitation)
      const lastInviter = afterData.lastInviter;
      let inviterId, inviterName;

      if (lastInviter && lastInviter.id && lastInviter.name) {
        // Use the actual inviter (could be host or guest)
        inviterId = lastInviter.id;
        inviterName = lastInviter.name;
        console.log(`[Event Invitation] Using inviter from lastInviter: ${inviterName} (${inviterId})`);
      } else {
        // Fallback to host if no inviter info available
        const hostId = afterData.createdBy;
        if (!hostId) {
          console.log(`[Event Invitation] No inviter info and no host found for event ${eventId}`);
          return;
        }

        // Get host information for notification
        const hostDoc = await admin.firestore().doc(`users/${hostId}`).get();
        if (!hostDoc.exists) {
          console.log(`[Event Invitation] Host ${hostId} not found`);
          return;
        }

        const hostData = hostDoc.data();
        inviterId = hostId;
        inviterName =
          hostData?.userdata?.contactInfo?.displayName ||
          hostData?.userdata?.contactInfo?.firstName ||
          'Someone';

        console.log(`[Event Invitation] Using host as inviter fallback: ${inviterName} (${inviterId})`);
      }

      // Send notifications to each newly invited user
      const notificationPromises = newInvitations.map(async (inviteeId) => {
        try {
          // Get invitee details and notification settings
          const inviteeDoc = await admin.firestore().doc(`users/${inviteeId}`).get();

          if (!inviteeDoc.exists) {
            console.log(`[Event Invitation] Invitee ${inviteeId} not found`);
            return;
          }

          const inviteeData = inviteeDoc.data();

          // Check if invitee has enabled event invitation notifications
          const eventInvitationsEnabled = inviteeData?.userdata?.settings?.notifications?.app?.eventInvitations;

          if (eventInvitationsEnabled === false) {
            console.log(`[Event Invitation] Invitee ${inviteeId} has disabled event invitation notifications`);
            return;
          }

          // Get invitee's FCM token
          const fcmToken = inviteeData?.deviceInfo?.fcmToken;

          if (!fcmToken) {
            console.log(`[Event Invitation] Invitee ${inviteeId} has no FCM token`);
            return;
          }

          // Send FCM notification with navigation stack
          const message = {
            token: fcmToken,
            notification: {
              title: 'Event Invitation',
              body: `${inviterName} invited you to "${eventTitle}"`
            },
            data: {
              type: 'event_invitation',
              resetStack: 'true',
              navigationStack: 'Home,EventDetail',
              eventId: eventId,
              studioId: studioId,
              eventTitle: eventTitle,
              inviterId: inviterId,
              inviterName: inviterName,
              actionType: 'invitation_received'
            }
          };

          await admin.messaging().send(message);

          console.log(`[Event Invitation] Successfully sent invitation notification to ${inviteeId} for event ${eventId}`);

        } catch (error) {
          console.error(`[Event Invitation] Error sending notification to invitee ${inviteeId}:`, error);
          // Don't throw - continue with other invitees
        }
      });

      // Wait for all notifications to complete
      await Promise.all(notificationPromises);

      console.log(`[Event Invitation] Completed processing ${newInvitations.length} invitation notifications for event ${eventId}`);

    } catch (error) {
      console.error(`[Event Invitation] Error processing event invitation:`, error);
      // Don't throw - we don't want to retry failed notifications
    }
  });