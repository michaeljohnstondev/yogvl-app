// FILE: functions/notifications/eventInvitationNotifications.js
// Event invitation notification handlers using direct Firestore triggers
// Handles invitations triggered by event document updates (both guest and cohost)

const admin = require('firebase-admin');
const functions = require('firebase-functions');

/**
 * Triggered when an event document is updated - detects new invitations
 * Trigger: studios/{studioId}/events/{eventId} (document updated)
 * Sends notifications to newly invited users
 *
 * NOTE: This works alongside invitationNotifications.js:
 * - eventInvitationNotifications (this file): Triggered by EVENT document updates
 * - invitationNotifications.js: Triggered by USER document updates
 * Both are needed because unified invitation system updates both documents atomically
 */
exports.onEventInvitation = functions.firestore
  .document('studios/{studioId}/events/{eventId}')
  .onUpdate(async (change, context) => {
    const { studioId, eventId } = context.params;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    console.log(`[Event Invitation] Event ${eventId} updated in studio ${studioId}`);

    try {
      // Get invitation arrays from before and after (objects with userId and type)
      const beforeInvitations = beforeData.invitations || [];
      const afterInvitations = afterData.invitations || [];

      console.log(`[Event Invitation] Before invitations count: ${beforeInvitations.length}`);
      console.log(`[Event Invitation] After invitations count: ${afterInvitations.length}`);

      // Find newly added invitations by comparing userId fields
      // Support both old format (string userId) and new format (object with userId and type)
      const beforeUserIds = new Set(
        beforeInvitations.map(inv => inv.userId || inv)
      );
      const newInvitations = afterInvitations.filter(inv => {
        const userId = inv.userId || inv;
        return !beforeUserIds.has(userId);
      });

      if (newInvitations.length === 0) {
        console.log(`[Event Invitation] No new invitations detected for event ${eventId}`);
        return null;
      }

      console.log(`[Event Invitation] Found ${newInvitations.length} new invitations for event ${eventId}`);
      console.log(`[Event Invitation] New invitations:`, JSON.stringify(newInvitations, null, 2));

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
          return null;
        }

        // Get host information for notification
        console.log(`[Event Invitation] Fetching host data for user ${hostId}`);
        const hostDoc = await admin.firestore().doc(`users/${hostId}`).get();
        if (!hostDoc.exists) {
          console.log(`[Event Invitation] Host ${hostId} not found`);
          return null;
        }

        const hostData = hostDoc.data();
        inviterId = hostId;
        inviterName =
          hostData?.userdata?.contactInfo?.displayName ||
          hostData?.userdata?.contactInfo?.firstName ||
          hostData?.userdata?.firstName ||
          hostData?.userdata?.displayName ||
          'Someone';

        console.log(`[Event Invitation] Using host as inviter fallback: ${inviterName} (${inviterId})`);
      }

      // Send notifications to each newly invited user
      const notificationPromises = newInvitations.map(async (invitation) => {
        // Extract userId and type (support both old and new format)
        console.log('[Event Invitation] Raw invitation object:', JSON.stringify(invitation, null, 2));

        const inviteeId = invitation.userId || invitation;
        const invitationType = invitation.type || 'guest'; // Default to guest for old format

        console.log('[Event Invitation] Extracted inviteeId:', inviteeId, 'type:', typeof inviteeId);
        console.log('[Event Invitation] Extracted invitationType:', invitationType);
        console.log(`[Event Invitation] Processing ${invitationType} invitation for user ${inviteeId}`);

        // Skip if invitee is the event creator (can't invite yourself)
        if (inviteeId === afterData.createdBy) {
          console.log(`[Event Invitation] Skipping invitation - user ${inviteeId} is the event creator`);
          return;
        }

        try {
          // Get invitee details and notification settings
          console.log(`[Event Invitation] Fetching invitee data for user ${inviteeId}`);
          const inviteeDoc = await admin.firestore().doc(`users/${inviteeId}`).get();

          if (!inviteeDoc.exists) {
            console.log(`[Event Invitation] Invitee ${inviteeId} not found`);
            return;
          }

          const inviteeData = inviteeDoc.data();

          // Check if invitee has enabled event invitation notifications
          console.log(`[Event Invitation] Checking notification settings for user ${inviteeId}`);
          const eventInvitationsEnabled = inviteeData?.userdata?.settings?.notifications?.app?.eventInvitations;

          console.log(`[Event Invitation] Event invitations enabled: ${eventInvitationsEnabled}`);

          if (eventInvitationsEnabled === false) {
            console.log(`[Event Invitation] Invitee ${inviteeId} has disabled event invitation notifications`);
            return;
          }

          // Prepare notification content based on invitation type
          const notificationTitle = invitationType === 'cohost' ? 'Cohost Invitation' : 'Event Invitation';
          const notificationBody = invitationType === 'cohost'
            ? `${inviterName} invited you to co-host "${eventTitle}"`
            : `${inviterName} invited you to "${eventTitle}"`;

          console.log(`[Event Invitation] Preparing notification:`, {
            type: invitationType,
            inviterName,
            eventTitle,
            recipientId: inviteeId
          });

          // STEP 1: ALWAYS create in-app notification (Firestore document)
          try {
            await admin.firestore()
              .collection('users')
              .doc(inviteeId)
              .collection('notifications')
              .add({
                type: invitationType === 'cohost' ? 'cohost_invitation' : 'event_invitation',
                title: notificationTitle,
                message: notificationBody,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                data: {
                  resetStack: true,
                  navigationStack: 'Home,EventDetail',
                  eventId: eventId,
                  studioId: studioId,
                  eventTitle: eventTitle,
                  inviterId: inviterId,
                  inviterName: inviterName,
                  actionType: invitationType === 'cohost' ? 'cohost_invitation' : 'invitation_received',
                  invitationType: invitationType
                }
              });

            console.log(`[Event Invitation] ✅ Created in-app notification for ${inviteeId}`);
          } catch (inAppError) {
            console.error(`[Event Invitation] ❌ Failed to create in-app notification for ${inviteeId}:`, inAppError);
            // Continue to try push notification even if in-app fails
          }

          // STEP 2: Optionally send push notification (if FCM token exists)
          const fcmToken = inviteeData?.deviceInfo?.fcmToken;

          console.log(`[Event Invitation] FCM token exists: ${!!fcmToken}`);

          if (!fcmToken) {
            console.log(`[Event Invitation] ⚠️ Invitee ${inviteeId} has no FCM token - in-app notification created, push skipped`);
            return; // Exit but in-app notification was already created
          }

          // Send FCM push notification with navigation stack
          // IMPORTANT: All FCM data fields MUST be strings
          const message = {
            token: fcmToken,
            notification: {
              title: notificationTitle,
              body: notificationBody
            },
            data: {
              type: invitationType === 'cohost' ? 'cohost_invitation' : 'event_invitation',
              resetStack: 'true',
              navigationStack: 'Home,EventDetail',
              eventId: String(eventId || ''),
              studioId: String(studioId || ''),
              eventTitle: String(eventTitle || 'Untitled Event'),
              inviterId: String(inviterId || ''),
              inviterName: String(inviterName || 'Someone'),
              actionType: invitationType === 'cohost' ? 'cohost_invitation' : 'invitation_received',
              invitationType: String(invitationType)
            }
          };

          console.log(`[Event Invitation] Sending FCM push notification to ${inviteeId}`);
          console.log(`[Event Invitation] Message data:`, JSON.stringify(message.data, null, 2));

          try {
            await admin.messaging().send(message);
            console.log(`[Event Invitation] ✅ Successfully sent push notification to ${inviteeId} for event ${eventId}`);
          } catch (pushError) {
            console.error(`[Event Invitation] ❌ Failed to send push notification to ${inviteeId}:`, pushError);
            console.log(`[Event Invitation] ℹ️ In-app notification was still created successfully`);
            // Don't throw - in-app notification was already created
          }

        } catch (error) {
          console.error(`[Event Invitation] ❌ Error sending notification to invitee ${inviteeId}:`, error);
          console.error(`[Event Invitation] Error stack:`, error.stack);
          // Don't throw - continue with other invitees
        }
      });

      // Wait for all notifications to complete
      await Promise.all(notificationPromises);

      console.log(`[Event Invitation] ✅ Completed processing ${newInvitations.length} invitation notifications for event ${eventId}`);
      return null;

    } catch (error) {
      console.error(`[Event Invitation] ❌ Fatal error in onEventInvitation handler:`, error);
      console.error(`[Event Invitation] Error stack:`, error.stack);
      console.error(`[Event Invitation] Context:`, {
        eventId,
        studioId,
        beforeInvitationsCount: beforeData?.invitations?.length || 0,
        afterInvitationsCount: afterData?.invitations?.length || 0
      });
      // Don't throw - we don't want to retry failed notifications
      return null;
    }
  });
