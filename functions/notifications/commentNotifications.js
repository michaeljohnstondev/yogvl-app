// Firebase Cloud Function - Comment Notifications
// Handles comment-based notification triggers with batching logic

const functions = require('firebase-functions/v2');
const admin = require('firebase-admin');

/**
 * Handle comment notifications triggered from the app
 * This implements the batching logic: first comment instant, rest batched
 */
exports.onCommentNotificationTrigger = functions.firestore.onDocumentCreated(
  'notificationTriggers/{triggerId}',
  async (event) => {
    const triggerData = event.data.data();
    const { triggerId } = event.params;

    if (triggerData.type !== 'comment' || triggerData.processed) {
      return;
    }

    try {
      // Mark as processed immediately to prevent duplicate processing
      await admin.firestore().doc(`notificationTriggers/${triggerId}`).update({
        processed: true,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const {
        hostId,
        eventId,
        comment,
        commenter,
        eventTitle,
        isFirstComment,
      } = triggerData;

      // Get host's notification preferences
      const hostDoc = await admin.firestore().doc(`users/${hostId}`).get();
      if (!hostDoc.exists) {
        console.log('Host document not found');
        return;
      }

      const hostData = hostDoc.data();
      const hostingPrefs =
        hostData?.userdata?.settings?.notifications?.hosting || {};

      // Check if host wants comment notifications
      if (hostingPrefs.comments === false) {
        console.log('Host has disabled comment notifications');
        return;
      }

      // Get host's FCM token
      const fcmToken = hostData?.deviceInfo?.fcmToken;
      if (!fcmToken) {
        console.log('Host has no FCM token');
        return;
      }

      let title, body;

      if (isFirstComment) {
        // Send immediate notification for first comment
        title = 'New Comment!';
        body = `${commenter.displayName} commented on "${eventTitle}": ${comment.text}`;

        await admin.messaging().send({
          token: fcmToken,
          notification: { title, body },
          data: {
            type: 'event_comment',
            eventId,
            commentId: comment.id,
            screen: 'EventDetail',
          },
          android: {
            priority: 'high',
            notification: {
              channelId: 'event-comments',
              priority: 'high',
            },
          },
        });

        console.log('Sent immediate comment notification to host');
      } else {
        // For subsequent comments, check if we should batch or send immediately
        const batchDelay = hostingPrefs.commentBatchDelay || 300; // 5 minutes default

        // Check for recent comment notifications
        const recentComments = await admin
          .firestore()
          .collection('notificationTriggers')
          .where('hostId', '==', hostId)
          .where('eventId', '==', eventId)
          .where('type', '==', 'comment')
          .where(
            'createdAt',
            '>',
            admin.firestore.Timestamp.fromMillis(Date.now() - batchDelay * 1000)
          )
          .get();

        if (recentComments.size > 1) {
          // Multiple recent comments - batch them
          title = 'Multiple New Comments';
          body = `${recentComments.size} new comments on "${eventTitle}"`;

          await admin.messaging().send({
            token: fcmToken,
            notification: { title, body },
            data: {
              type: 'event_comments_batch',
              eventId,
              commentCount: recentComments.size.toString(),
              screen: 'EventDetail',
            },
            android: {
              priority: 'normal',
              notification: {
                channelId: 'event-comments',
                priority: 'default',
              },
            },
          });

          console.log(
            `Sent batched comment notification (${recentComments.size} comments)`
          );
        } else {
          // Single comment after delay - send individual notification
          title = 'New Comment';
          body = `${commenter.displayName} commented on "${eventTitle}"`;

          await admin.messaging().send({
            token: fcmToken,
            notification: { title, body },
            data: {
              type: 'event_comment',
              eventId,
              commentId: comment.id,
              screen: 'EventDetail',
            },
            android: {
              priority: 'normal',
              notification: {
                channelId: 'event-comments',
                priority: 'default',
              },
            },
          });

          console.log('Sent individual comment notification to host');
        }
      }
    } catch (error) {
      console.error('Error processing comment notification:', error);
    }
  }
);
