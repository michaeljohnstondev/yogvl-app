// FILE: functions/notifications/followNotifications.js
// Follow-related notification handlers using direct Firestore triggers

const admin = require('firebase-admin');
const functions = require('firebase-functions');

/**
 * Triggered when a user follows another user
 * Trigger: users/{userId}/followers/{followerId} (document created)
 * Sends notification to the followed user with profile navigation
 */
exports.onUserFollowed = functions.firestore
  .document('users/{userId}/followers/{followerId}')
  .onCreate(async (snap, context) => {
    const { userId, followerId } = context.params;

    console.log(`[Follow Notification] User ${followerId} followed user ${userId}`);

    try {
      // Get the followed user's document and notification settings
      const userDoc = await admin.firestore().doc(`users/${userId}`).get();

      if (!userDoc.exists) {
        console.log(`[Follow Notification] User ${userId} not found`);
        return;
      }

      const userData = userDoc.data();

      // Check if user has enabled new follower notifications
      const newFollowersEnabled = userData?.userdata?.settings?.notifications?.app?.newFollowers;

      if (!newFollowersEnabled) {
        console.log(`[Follow Notification] User ${userId} has disabled new follower notifications`);
        return;
      }

      // Get user's FCM token
      const fcmToken = userData?.deviceInfo?.fcmToken;

      if (!fcmToken) {
        console.log(`[Follow Notification] User ${userId} has no FCM token`);
        return;
      }

      // Get follower details for the notification
      const followerDoc = await admin.firestore().doc(`users/${followerId}`).get();

      if (!followerDoc.exists) {
        console.log(`[Follow Notification] Follower ${followerId} not found`);
        return;
      }

      const followerData = followerDoc.data();
      const followerName = followerData?.userdata?.contactInfo?.displayName || 'Someone';

      // Send FCM notification with profile navigation data
      const message = {
        token: fcmToken,
        notification: {
          title: 'New Follower!',
          body: `${followerName} started following you`
        },
        data: {
          type: 'follow_notification',
          resetStack: 'true',
          navigationStack: 'Home,UserProfile',
          followerId: followerId,
          followerName: followerName,
          profileUserId: followerId
        }
      };

      await admin.messaging().send(message);

      console.log(`[Follow Notification] Successfully sent notification to user ${userId} about follower ${followerId}`);

    } catch (error) {
      console.error(`[Follow Notification] Error sending notification:`, error);
      // Don't throw - we don't want to retry failed notifications
    }
  });