// FILE: functions/notifications/friendEventActivityNotifications.js
// Friend event activity notification handler - notifies followers when someone joins events
// NOTE: Event creation notifications are now handled in eventInterestNotifications.js

const admin = require('firebase-admin');
const functions = require('firebase-functions');

/**
 * Helper function to get all followers of a user
 * Queries the followers subcollection for the given user
 * Returns users who are following this user (who would see their event activity)
 * @param {string} userId - User ID to get followers for
 * @returns {Promise<string[]>} Array of follower user IDs
 */
async function getFollowersOf(userId) {
  try {
    const followersSnapshot = await admin
      .firestore()
      .collection('users')
      .doc(userId)
      .collection('followers')
      .get();

    return followersSnapshot.docs.map((doc) => doc.id);
  } catch (error) {
    console.error(`[Follow Activity] Error getting followers of ${userId}:`, error);
    return [];
  }
}

/**
 * Triggered when an event document is updated
 * Detects new subscribers/cohosts and notifies users who follow them
 * Trigger: studios/{studioId}/events/{eventId} (document updated)
 */
exports.onFriendEventActivity = functions.firestore
  .document('studios/{studioId}/events/{eventId}')
  .onUpdate(async (change, context) => {
    const { studioId, eventId } = context.params;
    const before = change.before.data();
    const after = change.after.data();

    console.log(`[Follow Activity] Event ${eventId} updated in studio ${studioId}`);

    try {
      // Only process public events
      if (after.isPrivate) {
        console.log(`[Follow Activity] Skipping private event ${eventId}`);
        return;
      }

      // Detect new subscribers (guests joining)
      const beforeSubscribers = before.subscribers || [];
      const afterSubscribers = after.subscribers || [];
      const newSubscribers = afterSubscribers.filter(
        (id) => !beforeSubscribers.includes(id)
      );

      // Detect new cohosts
      const beforeCohosts = before.cohosts || [];
      const afterCohosts = after.cohosts || [];
      const newCohosts = afterCohosts.filter(
        (id) => !beforeCohosts.includes(id)
      );

      // Combine all new participants
      const newParticipants = [
        ...newSubscribers.map((id) => ({ id, activityType: 'joined' })),
        ...newCohosts.map((id) => ({ id, activityType: 'cohosting' })),
      ];

      if (newParticipants.length === 0) {
        console.log(`[Follow Activity] No new participants in event ${eventId}`);
        return;
      }

      console.log(
        `[Follow Activity] Found ${newParticipants.length} new participants`
      );

      const eventTitle = after.title || 'Untitled Event';
      const eventInvitations = (after.invitations || []).map(
        (inv) => inv.userId || inv
      );
      const allAttendees = new Set([
        ...(after.subscribers || []),
        ...(after.cohosts || []),
        after.createdBy,
      ]);

      // Process each new participant
      for (const { id: participantId, activityType } of newParticipants) {
        console.log(
          `[Follow Activity] Processing ${activityType} for participant ${participantId}`
        );

        // Get participant details
        const participantDoc = await admin
          .firestore()
          .doc(`users/${participantId}`)
          .get();

        if (!participantDoc.exists) {
          console.log(
            `[Follow Activity] Participant ${participantId} not found`
          );
          continue;
        }

        const participantData = participantDoc.data();
        const participantName =
          participantData?.userdata?.contactInfo?.displayName || 'Someone';

        // Get followers of this participant (users who follow them)
        const followerIds = await getFollowersOf(participantId);

        if (followerIds.length === 0) {
          console.log(
            `[Follow Activity] Participant ${participantId} has no followers`
          );
          continue;
        }

        console.log(
          `[Follow Activity] Found ${followerIds.length} followers of ${participantName}`
        );

        // Check notification settings and send to eligible followers
        for (const followerId of followerIds) {
          try {
            // Skip if follower is invited (they'll get invitation notification)
            if (eventInvitations.includes(followerId)) {
              console.log(
                `[Follow Activity] Skipping ${followerId} - already invited`
              );
              continue;
            }

            // Track if follower is already attending (changes notification message)
            const isAlreadyAttending = allAttendees.has(followerId);

            // Get follower's notification settings
            const followerDoc = await admin
              .firestore()
              .doc(`users/${followerId}`)
              .get();

            if (!followerDoc.exists) {
              console.log(`[Follow Activity] Follower ${followerId} not found`);
              continue;
            }

            const followerData = followerDoc.data();
            const settings = followerData?.userdata?.settings?.notifications;

            // Check global toggle
            const followEventActivityEnabled =
              settings?.app?.friendEventActivity !== false; // Default to true

            if (!followEventActivityEnabled) {
              console.log(
                `[Follow Activity] Follower ${followerId} has disabled follow event activity notifications`
              );
              continue;
            }

            // Check per-user muting (support both old and new field names)
            const mutedUsers = settings?.mutedFollowingEvents || settings?.mutedFriendsEvents || [];
            if (mutedUsers.includes(participantId)) {
              console.log(
                `[Follow Activity] Follower ${followerId} has muted ${participantName}`
              );
              continue;
            }

            // Determine message based on activity type and whether follower is attending
            let activityText = 'joined';
            if (activityType === 'cohosting') {
              activityText = 'is co-hosting';
            } else if (activityType === 'created') {
              activityText = 'created';
            }

            // Different title for attendees vs non-attendees
            const notificationTitle = isAlreadyAttending ? 'Friend Joined!' : 'Event Update';
            const notificationMessage = `${participantName} ${activityText} "${eventTitle}"`;

            const fcmToken = followerData?.deviceInfo?.fcmToken;

            // Prepare notification data (used for both push and in-app)
            const notificationData = {
              type: 'follow_event_activity',
              title: notificationTitle,
              message: notificationMessage,
              data: {
                eventId: eventId,
                studioId: studioId,
                eventTitle: eventTitle,
                userId: participantId,
                userName: participantName,
                activityType: activityType,
              },
              read: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            // ALWAYS create in-app notification for history/reliability
            await admin
              .firestore()
              .collection('users')
              .doc(followerId)
              .collection('notifications')
              .add(notificationData);
            console.log(
              `[Follow Activity] ✅ Created in-app notification for ${followerId}`
            );

            // ALSO send push notification if FCM token exists
            if (fcmToken) {
              const message = {
                token: fcmToken,
                notification: {
                  title: notificationTitle,
                  body: notificationMessage,
                },
                data: {
                  type: 'follow_event_activity',
                  resetStack: 'true',
                  navigationStack: 'Home,EventDetail',
                  eventId: eventId,
                  studioId: studioId,
                  eventTitle: eventTitle,
                  userId: participantId,
                  userName: participantName,
                  activityType: activityType,
                },
              };

              try {
                await admin.messaging().send(message);
                console.log(
                  `[Follow Activity] ✅ Sent push notification to ${followerId} about ${participantName}`
                );
              } catch (pushError) {
                console.error(
                  `[Follow Activity] ⚠️ Failed to send push notification to ${followerId}:`,
                  pushError.message,
                  '(in-app notification already created)'
                );
              }
            } else {
              console.log(
                `[Follow Activity] ℹ️ No FCM token for ${followerId} (in-app notification created)`
              );
            }
          } catch (followerError) {
            console.error(
              `[Follow Activity] Error processing follower ${followerId}:`,
              followerError
            );
            // Continue with next follower
          }
        }
      }

      console.log(
        `[Follow Activity] ✅ Completed processing follow event activity for event ${eventId}`
      );
    } catch (error) {
      console.error(
        `[Follow Activity] ❌ Error processing follow event activity:`,
        error
      );
    }
  });
