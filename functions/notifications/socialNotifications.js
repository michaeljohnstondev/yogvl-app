// Firebase Cloud Function - Social Notifications
// Handles follow requests, friend requests, and social interactions

const functions = require('firebase-functions/v2');
const admin = require('firebase-admin');



/**
 * Handle mutual follow notification triggers
 */
exports.onMutualFollowTrigger = functions.firestore.onDocumentCreated(
  'notificationTriggers/{triggerId}',
  async (event) => {
    const triggerData = event.data.data();
    const { triggerId } = event.params;

    if (triggerData.type !== 'mutual_follow' || triggerData.processed) {
      return;
    }

    try {
      // Mark as processed
      await admin.firestore().doc(`notificationTriggers/${triggerId}`).update({
        processed: true,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const { user1Id, user2Id, user1Name, user2Name } = triggerData;

      // Send notifications to both users
      const notifications = [
        {
          userId: user1Id,
          userName: user2Name,
          otherUserId: user2Id,
        },
        {
          userId: user2Id,
          userName: user1Name,
          otherUserId: user1Id,
        },
      ];

      for (const notification of notifications) {
        try {
          const userDoc = await admin
            .firestore()
            .doc(`users/${notification.userId}`)
            .get();
          if (!userDoc.exists) continue;

          const userData = userDoc.data();
          const socialPrefs =
            userData?.userdata?.settings?.notifications?.social || {};

          // Check if user wants mutual follow notifications
          if (socialPrefs.mutualFollows === false) continue;

          const fcmToken = userData?.deviceInfo?.fcmToken;

          // If user has FCM token: send ONLY push notification (FCM handler creates in-app)
          // If NO token: create in-app notification directly (they won't get push)
          if (fcmToken) {
            // Send push notification - FCM handler will create in-app notification
            try {
              await admin.messaging().send({
                token: fcmToken,
                notification: {
                  title: 'Mutual Follow!',
                  body: `You and ${notification.userName} are now following each other`,
                },
                data: {
                  type: 'mutual_follow',
                  userId: notification.otherUserId,
                  screen: 'UserProfile',
                },
                android: {
                  priority: 'normal',
                  notification: {
                    channelId: 'social',
                    priority: 'default',
                  },
                },
              });
              console.log(`Sent push notification to ${notification.userId} (FCM handler will create in-app)`);
            } catch (pushError) {
              console.error(`Failed to send push notification:`, pushError);
              // Fallback: create in-app notification if push fails
              await admin.firestore()
                .collection('users')
                .doc(notification.userId)
                .collection('notifications')
                .add({
                  type: 'mutual_follow',
                  title: 'Mutual Follow!',
                  message: `You and ${notification.userName} are now following each other`,
                  read: false,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  data: {
                    userId: notification.otherUserId,
                    screen: 'UserProfile',
                  }
                });
              console.log(`Created fallback in-app notification for ${notification.userId}`);
            }
          } else {
            // No FCM token - create in-app notification directly
            console.log(`User ${notification.userId} has no FCM token - creating in-app notification`);
            await admin.firestore()
              .collection('users')
              .doc(notification.userId)
              .collection('notifications')
              .add({
                type: 'mutual_follow',
                title: 'Mutual Follow!',
                message: `You and ${notification.userName} are now following each other`,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                data: {
                  userId: notification.otherUserId,
                  screen: 'UserProfile',
                }
              });
            console.log(`Created in-app notification for ${notification.userId} (no token)`);
          }

          console.log(
            `Sent notification to ${notification.userId}`
          );
        } catch (error) {
          console.error(
            `Error sending mutual follow notification to ${notification.userId}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error('Error processing mutual follow notification:', error);
    }
  }
);
