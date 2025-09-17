// Firebase Cloud Function - Social Notifications
// Handles follow requests, friend requests, and social interactions

const functions = require('firebase-functions/v2');
const admin = require('firebase-admin');

/**
 * Handle follow notification triggers
 */
exports.onFollowNotificationTrigger = functions.firestore.onDocumentCreated(
  'notificationTriggers/{triggerId}',
  async (event) => {
    const triggerData = event.data.data();
    const { triggerId } = event.params;

    if (triggerData.type !== 'follow' || triggerData.processed) {
      return;
    }

    try {
      // Mark as processed
      await admin.firestore().doc(`notificationTriggers/${triggerId}`).update({
        processed: true,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const { targetUserId, followerId, followerName } = triggerData;

      // Get target user's notification preferences
      const targetUserDoc = await admin
        .firestore()
        .doc(`users/${targetUserId}`)
        .get();
      if (!targetUserDoc.exists) {
        console.log('Target user document not found');
        return;
      }

      const targetUserData = targetUserDoc.data();
      const socialPrefs =
        targetUserData?.userdata?.settings?.notifications?.social || {};

      // Check if user wants follow notifications
      if (socialPrefs.follows === false) {
        console.log('User has disabled follow notifications');
        return;
      }

      // Get user's FCM token
      const fcmToken = targetUserData?.deviceInfo?.fcmToken;
      if (!fcmToken) {
        console.log('User has no FCM token');
        return;
      }

      // Send follow notification
      await admin.messaging().send({
        token: fcmToken,
        notification: {
          title: 'New Follower!',
          body: `${followerName} started following you`,
        },
        data: {
          type: 'follow_notification',
          userId: followerId,
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

      console.log(`Sent follow notification to ${targetUserId}`);
    } catch (error) {
      console.error('Error processing follow notification:', error);
    }
  }
);

/**
 * Handle friend request notification triggers
 */
exports.onFriendRequestTrigger = functions.firestore.onDocumentCreated(
  'notificationTriggers/{triggerId}',
  async (event) => {
    const triggerData = event.data.data();
    const { triggerId } = event.params;

    if (triggerData.type !== 'friend_request' || triggerData.processed) {
      return;
    }

    try {
      // Mark as processed
      await admin.firestore().doc(`notificationTriggers/${triggerId}`).update({
        processed: true,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const { targetUserId, requesterId, requesterName } = triggerData;

      // Get target user's notification preferences
      const targetUserDoc = await admin
        .firestore()
        .doc(`users/${targetUserId}`)
        .get();
      if (!targetUserDoc.exists) {
        console.log('Target user document not found');
        return;
      }

      const targetUserData = targetUserDoc.data();
      const socialPrefs =
        targetUserData?.userdata?.settings?.notifications?.social || {};

      // Check if user wants friend request notifications
      if (socialPrefs.friendRequests === false) {
        console.log('User has disabled friend request notifications');
        return;
      }

      // Get user's FCM token
      const fcmToken = targetUserData?.deviceInfo?.fcmToken;
      if (!fcmToken) {
        console.log('User has no FCM token');
        return;
      }

      // Send friend request notification
      await admin.messaging().send({
        token: fcmToken,
        notification: {
          title: 'Friend Request',
          body: `${requesterName} sent you a friend request`,
        },
        data: {
          type: 'friend_request',
          userId: requesterId,
          screen: 'FriendRequests',
        },
        android: {
          priority: 'normal',
          notification: {
            channelId: 'social',
            priority: 'default',
          },
        },
      });

      console.log(`Sent friend request notification to ${targetUserId}`);
    } catch (error) {
      console.error('Error processing friend request notification:', error);
    }
  }
);

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
          if (!fcmToken) continue;

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

          console.log(
            `Sent mutual follow notification to ${notification.userId}`
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
