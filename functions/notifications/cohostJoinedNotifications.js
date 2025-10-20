// FILE: functions/notifications/cohostJoinedNotifications.js
// Cohost joined notification handlers using direct Firestore triggers

const admin = require('firebase-admin');
const functions = require('firebase-functions');

/**
 * Triggered when a cohost invitation document is updated
 * Trigger: users/{userId}/cohostInvitations/{invitationId} (document updated)
 * Sends notifications when cohost invitations are accepted
 */
exports.onCohostJoined = functions.firestore
  .document('users/{userId}/cohostInvitations/{invitationId}')
  .onUpdate(async (change, context) => {
    const { userId, invitationId } = context.params;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    console.log(`[Cohost Joined] Cohost invitation ${invitationId} updated for user ${userId}`);

    try {
      // Check if this is a status change from 'pending' to 'accepted'
      const statusChangedToAccepted =
        beforeData.status === 'pending' && afterData.status === 'accepted';

      if (!statusChangedToAccepted) {
        console.log(`[Cohost Joined] Status change not relevant: ${beforeData.status} → ${afterData.status}`);
        return;
      }

      console.log(`[Cohost Joined] Cohost invitation accepted: ${invitationId}`);

      // Extract invitation data
      const {
        inviterId,
        recipientId,
        eventId,
        studioId,
        inviterData,
        eventData
      } = afterData;

      if (!inviterId || !recipientId || !eventId) {
        console.log(`[Cohost Joined] Missing required data in invitation ${invitationId}`);
        return;
      }

      // Get inviter (original host) details and notification settings
      const inviterDoc = await admin.firestore().doc(`users/${inviterId}`).get();

      if (!inviterDoc.exists) {
        console.log(`[Cohost Joined] Inviter ${inviterId} not found`);
        return;
      }

      const inviterUserData = inviterDoc.data();

      // Check if inviter has enabled "notify when someone joins" notifications
      const notifyOnJoinEnabled = inviterUserData?.userdata?.settings?.notifications?.hosting?.notifyOnJoin;

      if (notifyOnJoinEnabled === false) {
        console.log(`[Cohost Joined] Inviter ${inviterId} has disabled notify on join notifications`);
        return;
      }

      // Get cohost (accepter) information
      const cohostDoc = await admin.firestore().doc(`users/${recipientId}`).get();
      let cohostName = 'Someone';

      if (cohostDoc.exists) {
        const cohostData = cohostDoc.data();
        cohostName =
          cohostData?.userdata?.contactInfo?.displayName ||
          cohostData?.userdata?.contactInfo?.firstName ||
          'Someone';
      }

      // Extract event information
      const eventTitle = eventData?.title || 'Untitled Event';

      // STEP 1: ALWAYS create in-app notification (Firestore document)
      try {
        await admin.firestore()
          .collection('users')
          .doc(inviterId)
          .collection('notifications')
          .add({
            type: 'cohost_accepted',
            title: 'Cohost Accepted!',
            message: `${cohostName} accepted your cohost invitation for "${eventTitle}"`,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            data: {
              resetStack: true,
              navigationStack: 'Home,EventDetail',
              eventId: eventId,
              studioId: studioId || '',
              eventTitle: eventTitle,
              cohostId: recipientId,
              cohostName: cohostName,
              invitationId: invitationId,
              actionType: 'cohost_accepted'
            }
          });

        console.log(`[Cohost Joined] ✅ Created in-app notification for inviter ${inviterId}`);
      } catch (inAppError) {
        console.error(`[Cohost Joined] ❌ Failed to create in-app notification for ${inviterId}:`, inAppError);
        // Continue to try push notification even if in-app fails
      }

      // STEP 2: Optionally send push notification (if FCM token exists)
      const fcmToken = inviterUserData?.deviceInfo?.fcmToken;

      if (!fcmToken) {
        console.log(`[Cohost Joined] ⚠️ Inviter ${inviterId} has no FCM token - in-app notification created, push skipped`);
        return; // Exit but in-app notification was already created
      }

      // Send FCM push notification with navigation stack
      const message = {
        token: fcmToken,
        notification: {
          title: 'Cohost Accepted!',
          body: `${cohostName} accepted your cohost invitation for "${eventTitle}"`
        },
        data: {
          type: 'cohost_accepted',
          resetStack: 'true',
          navigationStack: 'Home,EventDetail',
          eventId: eventId,
          studioId: studioId || '',
          eventTitle: eventTitle,
          cohostId: recipientId,
          cohostName: cohostName,
          invitationId: invitationId,
          actionType: 'cohost_accepted'
        }
      };

      try {
        await admin.messaging().send(message);
        console.log(`[Cohost Joined] ✅ Successfully sent push notification to ${inviterId} for event ${eventId}`);
      } catch (pushError) {
        console.error(`[Cohost Joined] ❌ Failed to send push notification to ${inviterId}:`, pushError);
        console.log(`[Cohost Joined] ℹ️ In-app notification was still created successfully`);
        // Don't throw - in-app notification was already created
      }

    } catch (error) {
      console.error(`[Cohost Joined] Error processing cohost acceptance:`, error);
      // Don't throw - we don't want to retry failed notifications
    }
  });