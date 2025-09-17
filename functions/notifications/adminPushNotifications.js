// Firebase Cloud Function - Admin Push Notification Trigger
// Listens for documents created in 'notificationTriggers' collection
// and sends FCM push notifications to the target user.
// Handles admin_notification types only.
//
// ⚠️  WARNING: DO NOT USE expo-notifications IN THIS PROJECT
// ⚠️  Use Firebase Cloud Messaging (@react-native-firebase/messaging) ONLY
// ⚠️  All push notifications must go through FCM Cloud Functions
//

const functions = require('firebase-functions/v2');
const admin = require('firebase-admin');

exports.onAdminNotificationTrigger = functions.firestore.onDocumentCreated(
  'notificationTriggers/{triggerId}',
  async (event) => {
    const triggerData = event.data.data();
    const { triggerId } = event.params;

    // Process both admin and engine notifications
    if (triggerData.type !== 'admin_notification' && triggerData.type !== 'engine_notification') {
      console.log(`Skipping unsupported notification trigger type: ${triggerData.type} for ${triggerId}`);
      return null;
    }

    // Check if already processed (in case of retries)
    if (triggerData.processed) {
      console.log(`Notification trigger ${triggerId} already processed.`);
      return null;
    }

    const { userId, title, message, data, subType, priority } = triggerData;

    if (!userId) {
      console.error(`Notification trigger ${triggerId} is missing userId.`);
      await event.data.ref.update({ processed: true, error: 'Missing userId' });
      return null;
    }

    try {
      console.log(
        `Processing ${triggerData.type} push notification trigger: ${triggerId} for user ${userId}`
      );

      // 1. Get the user's FCM token
      const userDoc = await admin
        .firestore()
        .collection('users')
        .doc(userId)
        .get();
      if (!userDoc.exists) {
        console.log(
          `User ${userId} not found for notification trigger ${triggerId}.`
        );
        await event.data.ref.update({
          processed: true,
          error: 'User not found',
        });
        return null;
      }

      const fcmToken = userDoc.data().deviceInfo?.fcmToken;
      if (!fcmToken) {
        console.log(
          `User ${userId} has no FCM token for notification trigger ${triggerId}.`
        );
        await event.data.ref.update({ processed: true, error: 'No FCM token' });
        return null;
      }

      // 2. Construct the FCM message payload
      const notificationPayload = {
        token: fcmToken,
        notification: {
          title: title || 'Admin Notification',
          body: message,
        },
        data: {
          // FCM REQUIRES ALL DATA VALUES TO BE STRINGS - stringify everything
          ...Object.fromEntries(
            Object.entries(data || {}).map(([key, value]) => [
              key,
              typeof value === 'string' ? value : JSON.stringify(value)
            ])
          ),
          subType: subType || 'general',
          priority: priority || 'normal',
          // Add a timestamp to the data payload to help with uniqueness/ordering on the client
          timestamp: Date.now().toString(),
        },
        android: {
          priority: priority === 'high' ? 'high' : 'normal',
          notification: {
            channelId: 'admin', // Ensure you have an 'admin' notification channel set up on Android
            priority: priority === 'high' ? 'high' : 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1, // Optionally increment badge count
            },
          },
        },
      };

      // 3. Send the FCM message
      const response = await admin.messaging().send(notificationPayload);
      console.log(`Successfully sent message to user ${userId}:`, response);

      // 4. Mark the trigger as processed
      await event.data.ref.update({
        processed: true,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return null;
    } catch (error) {
      console.error(
        `Error sending admin push notification for trigger ${triggerId} to user ${userId}:`,
        error
      );
      // Mark as processed with error, but don't rethrow to avoid infinite retries
      await event.data.ref.update({
        processed: true,
        error: error.message,
        errorStack: error.stack,
      });
      return null;
    }
  }
);
