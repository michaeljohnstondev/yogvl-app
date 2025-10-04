// FILE: functions/notifications/adminDirectNotifications.js
// Direct admin notification handler using modern trigger architecture

const admin = require('firebase-admin');
const functions = require('firebase-functions');

/**
 * Triggered when a new admin notification is created
 * Sends direct FCM notifications without using notificationTriggers collection
 * Trigger: adminNotifications/{notificationId} (document created)
 */
exports.onAdminNotificationCreated = functions.firestore
  .document('adminNotifications/{notificationId}')
  .onCreate(async (snap, context) => {
    const { notificationId } = context.params;
    const notificationData = snap.data();

    console.log(`[Admin Direct Notification] Processing notification ${notificationId} for user ${notificationData.targetUserId}`);

    try {
      // Validate notification data
      if (!notificationData.targetUserId || !notificationData.type || !notificationData.title) {
        console.error(`[Admin Direct Notification] Invalid notification data for ${notificationId}`);
        await snap.ref.update({
          processed: true,
          processedAt: admin.firestore.Timestamp.now(),
          attempts: (notificationData.attempts || 0) + 1,
          error: 'Invalid notification data - missing required fields'
        });
        return;
      }

      const targetUserId = notificationData.targetUserId;

      // Get target user data and preferences
      const userDoc = await admin.firestore().doc(`users/${targetUserId}`).get();

      if (!userDoc.exists) {
        console.log(`[Admin Direct Notification] Target user ${targetUserId} not found`);
        await snap.ref.update({
          processed: true,
          processedAt: admin.firestore.Timestamp.now(),
          attempts: (notificationData.attempts || 0) + 1,
          error: 'Target user not found'
        });
        return;
      }

      const userData = userDoc.data();

      // Check user notification preferences (admin notifications cannot be fully disabled)
      const notificationSettings = userData?.userdata?.settings?.notifications?.app;
      let shouldSendPush = true;

      // Only non-critical admin notifications can be disabled
      if (notificationData.type !== 'ban' && notificationData.priority !== 'urgent') {
        const adminMessagesEnabled = notificationSettings?.adminMessages !== false; // Default to true
        const moderationEnabled = notificationSettings?.moderationActions !== false; // Default to true

        if (notificationData.type === 'warning' || notificationData.type === 'strike') {
          shouldSendPush = moderationEnabled;
        } else {
          shouldSendPush = adminMessagesEnabled;
        }
      }

      // Always store in user's scheduled notifications for in-app display
      try {
        const userNotificationRef = admin.firestore()
          .collection('users')
          .doc(targetUserId)
          .collection('scheduledNotifications')
          .doc();

        const userNotification = {
          // Event relationship (null for admin notifications)
          eventId: null,
          studioId: userData?.userdata?.studios?.default?.studioId || null,
          eventTitle: null,
          eventDateTime: null,

          // Notification classification
          type: 'admin_notification',
          subType: notificationData.type,
          priority: notificationData.priority || 'normal',
          channels: ['push', 'in_app'],

          // Scheduling (immediate)
          scheduledFor: admin.firestore.Timestamp.now(),

          // Notification content
          title: notificationData.title,
          message: notificationData.message,
          data: {
            notificationId: notificationId,
            adminNotificationType: notificationData.type,
            issuedBy: notificationData.issuedBy,
            relatedReport: notificationData.relatedReport || null,
            requiresAck: notificationData.data?.requiresAck || false,
            screen: notificationData.data?.screen || 'Notifications',
            ...notificationData.data
          },

          // Status tracking
          status: shouldSendPush ? 'pending' : 'sent', // If no push, mark as sent
          attempts: 0,

          // Metadata
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now()
        };

        await userNotificationRef.set(userNotification);
        console.log(`[Admin Direct Notification] Created user notification for ${targetUserId}`);
      } catch (error) {
        console.error(`[Admin Direct Notification] Failed to create user notification:`, error);
      }

      // Send FCM push notification if enabled
      if (shouldSendPush) {
        try {
          // Get user's FCM token (you may need to adjust this based on your token storage)
          // For now, we'll send using the userId as the topic (common pattern)

          const fcmMessage = {
            notification: {
              title: notificationData.title,
              body: notificationData.message.substring(0, 200), // Truncate for FCM
            },
            data: {
              type: 'admin_notification',
              subType: notificationData.type,
              notificationId: notificationId,
              screen: notificationData.data?.screen || 'Notifications',
              priority: notificationData.priority || 'normal',
              issuedBy: notificationData.issuedBy || 'system',
            },
            // Send to user topic (assumes you subscribe users to their own userId topic)
            topic: `user_${targetUserId}`
          };

          await admin.messaging().send(fcmMessage);
          console.log(`[Admin Direct Notification] FCM sent successfully to user ${targetUserId}`);
        } catch (fcmError) {
          console.error(`[Admin Direct Notification] FCM failed for user ${targetUserId}:`, fcmError);
        }
      } else {
        console.log(`[Admin Direct Notification] Push notifications disabled for user ${targetUserId}, type: ${notificationData.type}`);
      }

      // Update the admin notification as processed
      await snap.ref.update({
        processed: true,
        processedAt: admin.firestore.Timestamp.now(),
        attempts: (notificationData.attempts || 0) + 1
      });

      console.log(`[Admin Direct Notification] Successfully processed notification ${notificationId} for user ${targetUserId}`);

    } catch (error) {
      console.error(`[Admin Direct Notification] Error processing notification ${notificationId}:`, error);

      // Update with error status
      const attempts = (notificationData.attempts || 0) + 1;
      const updateData = {
        attempts: attempts,
        error: error.message,
        lastAttemptAt: admin.firestore.Timestamp.now()
      };

      // If too many attempts, mark as failed
      if (attempts >= 3) {
        updateData.processed = true;
        updateData.processedAt = admin.firestore.Timestamp.now();
        updateData.status = 'failed';
      }

      await snap.ref.update(updateData);
    }
  });

/**
 * Helper function to get notification title based on type
 * @param {string} type - Notification type
 * @param {object} data - Additional notification data
 * @returns {string} - Formatted title
 */
function getNotificationTitle(type, data = {}) {
  switch (type) {
    case 'ban':
      return data.banType === 'permanent' ? '🚫 Account Permanently Banned' : `⏳ Account Temporarily Banned`;
    case 'warning':
      return '⚠️ Community Warning';
    case 'strike':
      return `🔴 Strike ${data.strikeCount || ''} Issued`;
    case 'announcement':
      return '📢 System Announcement';
    case 'policy':
      return '📋 Policy Update';
    case 'custom':
      return '📨 Admin Message';
    default:
      return '📬 Admin Notification';
  }
}