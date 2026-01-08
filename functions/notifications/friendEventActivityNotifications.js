// FILE: functions/notifications/friendEventActivityNotifications.js
// Friend event activity notification handler - notifies friends when someone joins/creates events

const admin = require('firebase-admin');
const functions = require('firebase-functions');

/**
 * Helper function to get all friends of a user (mutual follows)
 * Queries the friends subcollection for the given user
 * @param {string} userId - User ID to get friends for
 * @returns {Promise<string[]>} Array of friend user IDs
 */
async function getFriendsOf(userId) {
  try {
    const friendsSnapshot = await admin
      .firestore()
      .collection('users')
      .doc(userId)
      .collection('friends')
      .get();

    return friendsSnapshot.docs.map((doc) => doc.id);
  } catch (error) {
    console.error(`[Friend Activity] Error getting friends of ${userId}:`, error);
    return [];
  }
}

/**
 * Triggered when an event document is updated
 * Detects new subscribers/cohosts and notifies their friends
 * Trigger: studios/{studioId}/events/{eventId} (document updated)
 */
exports.onFriendEventActivity = functions.firestore
  .document('studios/{studioId}/events/{eventId}')
  .onUpdate(async (change, context) => {
    const { studioId, eventId } = context.params;
    const before = change.before.data();
    const after = change.after.data();

    console.log(`[Friend Activity] Event ${eventId} updated in studio ${studioId}`);

    try {
      // Only process public events
      if (after.isPrivate) {
        console.log(`[Friend Activity] Skipping private event ${eventId}`);
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
        console.log(`[Friend Activity] No new participants in event ${eventId}`);
        return;
      }

      console.log(
        `[Friend Activity] Found ${newParticipants.length} new participants`
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
          `[Friend Activity] Processing ${activityType} for participant ${participantId}`
        );

        // Get participant details
        const participantDoc = await admin
          .firestore()
          .doc(`users/${participantId}`)
          .get();

        if (!participantDoc.exists) {
          console.log(
            `[Friend Activity] Participant ${participantId} not found`
          );
          continue;
        }

        const participantData = participantDoc.data();
        const participantName =
          participantData?.userdata?.contactInfo?.displayName || 'Someone';

        // Get friends of this participant
        const friendIds = await getFriendsOf(participantId);

        if (friendIds.length === 0) {
          console.log(
            `[Friend Activity] Participant ${participantId} has no friends`
          );
          continue;
        }

        console.log(
          `[Friend Activity] Found ${friendIds.length} friends of ${participantName}`
        );

        // Check notification settings and send to eligible friends
        for (const friendId of friendIds) {
          try {
            // Skip if friend is invited (they'll get invitation notification)
            if (eventInvitations.includes(friendId)) {
              console.log(
                `[Friend Activity] Skipping ${friendId} - already invited`
              );
              continue;
            }

            // Skip if friend is already attending
            if (allAttendees.has(friendId)) {
              console.log(
                `[Friend Activity] Skipping ${friendId} - already attending`
              );
              continue;
            }

            // Get friend's notification settings
            const friendDoc = await admin
              .firestore()
              .doc(`users/${friendId}`)
              .get();

            if (!friendDoc.exists) {
              console.log(`[Friend Activity] Friend ${friendId} not found`);
              continue;
            }

            const friendData = friendDoc.data();
            const settings = friendData?.userdata?.settings?.notifications;

            // Check global toggle
            const friendEventActivityEnabled =
              settings?.app?.friendEventActivity !== false; // Default to true

            if (!friendEventActivityEnabled) {
              console.log(
                `[Friend Activity] Friend ${friendId} has disabled friend event activity notifications`
              );
              continue;
            }

            // Check per-friend muting
            const mutedFriends = settings?.mutedFriendsEvents || [];
            if (mutedFriends.includes(participantId)) {
              console.log(
                `[Friend Activity] Friend ${friendId} has muted ${participantName}`
              );
              continue;
            }

            // Determine message based on activity type
            let activityText = 'joined';
            if (activityType === 'cohosting') {
              activityText = 'is co-hosting';
            } else if (activityType === 'created') {
              activityText = 'created';
            }

            const fcmToken = friendData?.deviceInfo?.fcmToken;

            // Send push notification if FCM token exists
            if (fcmToken) {
              const message = {
                token: fcmToken,
                notification: {
                  title: 'Friend Event Activity',
                  body: `${participantName} ${activityText} "${eventTitle}"`,
                },
                data: {
                  type: 'friend_event_activity',
                  resetStack: 'true',
                  navigationStack: 'Home,EventDetail',
                  eventId: eventId,
                  studioId: studioId,
                  eventTitle: eventTitle,
                  friendId: participantId,
                  friendName: participantName,
                  activityType: activityType,
                },
              };

              try {
                await admin.messaging().send(message);
                console.log(
                  `[Friend Activity] ✅ Sent notification to ${friendId} about ${participantName}`
                );
              } catch (pushError) {
                console.error(
                  `[Friend Activity] ❌ Failed to send push notification to ${friendId}:`,
                  pushError.message
                );

                // Fallback: create in-app notification directly
                await admin
                  .firestore()
                  .collection('users')
                  .doc(friendId)
                  .collection('notifications')
                  .add({
                    type: 'friend_event_activity',
                    title: 'Friend Event Activity',
                    message: `${participantName} ${activityText} "${eventTitle}"`,
                    data: {
                      eventId: eventId,
                      studioId: studioId,
                      eventTitle: eventTitle,
                      friendId: participantId,
                      friendName: participantName,
                      activityType: activityType,
                    },
                    read: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  });
                console.log(
                  `[Friend Activity] ✅ Created fallback in-app notification for ${friendId}`
                );
              }
            } else {
              // No FCM token, create in-app notification only
              await admin
                .firestore()
                .collection('users')
                .doc(friendId)
                .collection('notifications')
                .add({
                  type: 'friend_event_activity',
                  title: 'Friend Event Activity',
                  message: `${participantName} ${activityText} "${eventTitle}"`,
                  data: {
                    eventId: eventId,
                    studioId: studioId,
                    eventTitle: eventTitle,
                    friendId: participantId,
                    friendName: participantName,
                    activityType: activityType,
                  },
                  read: false,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });
              console.log(
                `[Friend Activity] ✅ Created in-app notification for ${friendId} (no FCM token)`
              );
            }
          } catch (friendError) {
            console.error(
              `[Friend Activity] Error processing friend ${friendId}:`,
              friendError
            );
            // Continue with next friend
          }
        }
      }

      console.log(
        `[Friend Activity] ✅ Completed processing friend event activity for event ${eventId}`
      );
    } catch (error) {
      console.error(
        `[Friend Activity] ❌ Error processing friend event activity:`,
        error
      );
    }
  });
