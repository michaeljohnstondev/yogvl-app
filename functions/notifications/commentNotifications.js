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
        studioId,
      } = triggerData;

      // Get event document to find all subscribers
      const eventDoc = await admin
        .firestore()
        .doc(`studios/${studioId}/events/${eventId}`)
        .get();

      if (!eventDoc.exists) {
        console.log('Event document not found');
        return;
      }

      const eventData = eventDoc.data();
      const subscribers = eventData.subscribers || [];
      const commenterId = commenter.userId || commenter.id;

      // Build list of recipients: host + all subscribers (excluding commenter)
      const recipientIds = new Set();
      recipientIds.add(hostId);
      subscribers.forEach((userId) => {
        if (userId !== commenterId && userId !== hostId) {
          recipientIds.add(userId);
        }
      });

      console.log(
        `Found ${recipientIds.size} potential recipients (host + ${subscribers.length} subscribers)`
      );

      // Fetch all recipient documents in parallel
      const recipientPromises = Array.from(recipientIds).map((userId) =>
        admin
          .firestore()
          .doc(`users/${userId}`)
          .get()
          .then((doc) => ({ userId, doc }))
      );
      const recipientResults = await Promise.all(recipientPromises);

      // Filter recipients based on notification preferences
      const recipientsToNotify = [];
      for (const { userId, doc } of recipientResults) {
        if (!doc.exists) {
          console.log(`User ${userId} document not found`);
          continue;
        }

        const userData = doc.data();
        const isHost = userId === hostId;

        // Check notification preferences
        let shouldNotify = false;
        if (isHost) {
          // Check host's hosting preferences
          const hostingPrefs =
            userData?.userdata?.settings?.notifications?.hosting || {};
          shouldNotify = hostingPrefs.comments !== false;
        } else {
          // Check attendee's attending preferences
          const attendingPrefs =
            userData?.userdata?.settings?.notifications?.attending || {};
          shouldNotify = attendingPrefs.newComments === true;
        }

        if (!shouldNotify) {
          console.log(
            `User ${userId} (${isHost ? 'host' : 'attendee'}) has disabled comment notifications`
          );
          continue;
        }

        // Get FCM token
        const fcmToken = userData?.deviceInfo?.fcmToken;
        if (!fcmToken) {
          console.log(`User ${userId} has no FCM token`);
          continue;
        }

        recipientsToNotify.push({
          userId,
          fcmToken,
          isHost,
        });
      }

      if (recipientsToNotify.length === 0) {
        console.log('No recipients to notify');
        return;
      }

      console.log(`Sending notifications to ${recipientsToNotify.length} users`);

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
