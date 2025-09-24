// FILE: functions/notifications/eventCommentNotifications.js
// Event comment notification handlers using direct Firestore triggers

const admin = require('firebase-admin');
const functions = require('firebase-functions');

/**
 * Triggered when a host comments on their own event
 * Trigger: studios/{studioId}/events/{eventId}/comments/{commentId} (document created)
 * Condition: comment.userId === event.createdBy
 * Sends notification to all event subscribers except the host
 */
exports.onHostComment = functions.firestore
  .document('studios/{studioId}/events/{eventId}/comments/{commentId}')
  .onCreate(async (snap, context) => {
    const { studioId, eventId, commentId } = context.params;
    const commentData = snap.data();

    console.log(`[Host Comment] Comment ${commentId} created on event ${eventId} by user ${commentData.userId}`);

    try {
      // Get event details to check if commenter is the host
      const eventDoc = await admin.firestore().doc(`studios/${studioId}/events/${eventId}`).get();

      if (!eventDoc.exists) {
        console.log(`[Host Comment] Event ${eventId} not found`);
        return;
      }

      const eventData = eventDoc.data();
      const hostId = eventData.createdBy;

      // Check if the commenter is the host
      if (commentData.userId !== hostId) {
        console.log(`[Host Comment] Comment ${commentId} is not from host (${commentData.userId} !== ${hostId})`);
        return; // This is not a host comment, exit early
      }

      const eventTitle = eventData.title || 'Untitled Event';

      // Get host details for the notification
      const hostDoc = await admin.firestore().doc(`users/${hostId}`).get();

      if (!hostDoc.exists) {
        console.log(`[Host Comment] Host ${hostId} not found`);
        return;
      }

      const hostData = hostDoc.data();
      const hostName = hostData?.userdata?.contactInfo?.displayName || 'Host';

      // Create comment preview (first 50 characters)
      const commentText = commentData.text || '';
      const commentPreview = commentText.length > 50
        ? commentText.substring(0, 50) + '...'
        : commentText;

      // Get all event subscribers
      const subscribersSnapshot = await admin.firestore()
        .collection(`studios/${studioId}/events/${eventId}/subscribers`)
        .get();

      if (subscribersSnapshot.empty) {
        console.log(`[Host Comment] No subscribers found for event ${eventId}`);
        return;
      }

      // Send notifications to each subscriber (except the host)
      const notificationPromises = subscribersSnapshot.docs.map(async (subscriberDoc) => {
        const subscriberId = subscriberDoc.id;

        // Skip the host (they don't need to be notified of their own comment)
        if (subscriberId === hostId) {
          return;
        }

        try {
          // Get subscriber details and notification settings
          const subscriberUserDoc = await admin.firestore().doc(`users/${subscriberId}`).get();

          if (!subscriberUserDoc.exists) {
            console.log(`[Host Comment] Subscriber ${subscriberId} not found`);
            return;
          }

          const subscriberData = subscriberUserDoc.data();

          // Check if subscriber has enabled host comment notifications
          const hostCommentsEnabled = subscriberData?.userdata?.settings?.notifications?.attending?.hostComments;

          if (!hostCommentsEnabled) {
            console.log(`[Host Comment] Subscriber ${subscriberId} has disabled host comment notifications`);
            return;
          }

          // Get subscriber's FCM token
          const fcmToken = subscriberData?.deviceInfo?.fcmToken;

          if (!fcmToken) {
            console.log(`[Host Comment] Subscriber ${subscriberId} has no FCM token`);
            return;
          }

          // Send FCM notification with navigation stack
          const message = {
            token: fcmToken,
            notification: {
              title: 'Host Comment',
              body: `${hostName} commented on '${eventTitle}': ${commentPreview}`
            },
            data: {
              type: 'host_comment',
              resetStack: 'true',
              navigationStack: 'Home,EventDetail,MessageBoard',
              eventId: eventId,
              studioId: studioId,
              eventTitle: eventTitle,
              commentId: commentId,
              hostName: hostName
            }
          };

          await admin.messaging().send(message);

          console.log(`[Host Comment] Successfully sent notification to subscriber ${subscriberId} about host comment on event ${eventId}`);

        } catch (error) {
          console.error(`[Host Comment] Error sending notification to subscriber ${subscriberId}:`, error);
          // Don't throw - continue with other subscribers
        }
      });

      // Wait for all notifications to complete
      await Promise.all(notificationPromises);

    } catch (error) {
      console.error(`[Host Comment] Error processing host comment:`, error);
      // Don't throw - we don't want to retry failed notifications
    }
  });

/**
 * Triggered when a guest/subscriber comments on an event
 * Trigger: studios/{studioId}/events/{eventId}/comments/{commentId} (document created)
 * Condition: comment.userId !== event.createdBy
 * Sends notification to event host/cohosts and other subscribers
 */
exports.onGuestComment = functions.firestore
  .document('studios/{studioId}/events/{eventId}/comments/{commentId}')
  .onCreate(async (snap, context) => {
    const { studioId, eventId, commentId } = context.params;
    const commentData = snap.data();

    console.log(`[Guest Comment] Comment ${commentId} created on event ${eventId} by user ${commentData.userId}`);

    try {
      // Get event details to check if commenter is NOT the host
      const eventDoc = await admin.firestore().doc(`studios/${studioId}/events/${eventId}`).get();

      if (!eventDoc.exists) {
        console.log(`[Guest Comment] Event ${eventId} not found`);
        return;
      }

      const eventData = eventDoc.data();
      const hostId = eventData.createdBy;
      const cohosts = eventData.cohosts || [];

      // Check if the commenter is NOT the host (this is a guest comment)
      if (commentData.userId === hostId) {
        console.log(`[Guest Comment] Comment ${commentId} is from host, skipping guest comment logic`);
        return; // This is a host comment, let onHostComment handle it
      }

      const eventTitle = eventData.title || 'Untitled Event';

      // Get guest/commenter details for the notification
      const guestDoc = await admin.firestore().doc(`users/${commentData.userId}`).get();

      if (!guestDoc.exists) {
        console.log(`[Guest Comment] Guest ${commentData.userId} not found`);
        return;
      }

      const guestData = guestDoc.data();
      const guestName = guestData?.userdata?.contactInfo?.displayName || 'Someone';

      // Create comment preview (first 50 characters)
      const commentText = commentData.text || '';
      const commentPreview = commentText.length > 50
        ? commentText.substring(0, 50) + '...'
        : commentText;

      // Get all event subscribers for notifications
      const subscribersSnapshot = await admin.firestore()
        .collection(`studios/${studioId}/events/${eventId}/subscribers`)
        .get();

      // Create recipient lists
      const hostAndCohosts = [hostId, ...cohosts];
      const allSubscriberIds = subscribersSnapshot.docs.map(doc => doc.id);
      const otherSubscribers = allSubscriberIds.filter(id =>
        !hostAndCohosts.includes(id) && id !== commentData.userId
      );

      // Send notifications to host/cohosts (check hosting.newComments setting)
      const hostNotificationPromises = hostAndCohosts.map(async (recipientId) => {
        try {
          const recipientDoc = await admin.firestore().doc(`users/${recipientId}`).get();

          if (!recipientDoc.exists) {
            console.log(`[Guest Comment] Host/cohost ${recipientId} not found`);
            return;
          }

          const recipientData = recipientDoc.data();

          // Check hosting notification settings for host/cohosts
          const newCommentsEnabled = recipientData?.userdata?.settings?.notifications?.hosting?.newComments;

          if (!newCommentsEnabled) {
            console.log(`[Guest Comment] Host/cohost ${recipientId} has disabled new comment notifications`);
            return;
          }

          const fcmToken = recipientData?.deviceInfo?.fcmToken;

          if (!fcmToken) {
            console.log(`[Guest Comment] Host/cohost ${recipientId} has no FCM token`);
            return;
          }

          const message = {
            token: fcmToken,
            notification: {
              title: 'New Comment',
              body: `${guestName} commented on '${eventTitle}': ${commentPreview}`
            },
            data: {
              type: 'guest_comment',
              resetStack: 'true',
              navigationStack: 'Home,EventDetail,MessageBoard',
              eventId: eventId,
              studioId: studioId,
              eventTitle: eventTitle,
              commentId: commentId,
              guestName: guestName
            }
          };

          await admin.messaging().send(message);

          console.log(`[Guest Comment] Successfully sent notification to host/cohost ${recipientId} about guest comment on event ${eventId}`);

        } catch (error) {
          console.error(`[Guest Comment] Error sending notification to host/cohost ${recipientId}:`, error);
        }
      });

      // Send notifications to other subscribers (check attending.newComments setting)
      const subscriberNotificationPromises = otherSubscribers.map(async (subscriberId) => {
        try {
          const subscriberDoc = await admin.firestore().doc(`users/${subscriberId}`).get();

          if (!subscriberDoc.exists) {
            console.log(`[Guest Comment] Subscriber ${subscriberId} not found`);
            return;
          }

          const subscriberData = subscriberDoc.data();

          // Check attending notification settings for other subscribers
          const newCommentsEnabled = subscriberData?.userdata?.settings?.notifications?.attending?.newComments;

          if (!newCommentsEnabled) {
            console.log(`[Guest Comment] Subscriber ${subscriberId} has disabled new comment notifications`);
            return;
          }

          const fcmToken = subscriberData?.deviceInfo?.fcmToken;

          if (!fcmToken) {
            console.log(`[Guest Comment] Subscriber ${subscriberId} has no FCM token`);
            return;
          }

          const message = {
            token: fcmToken,
            notification: {
              title: 'New Comment',
              body: `${guestName} commented on '${eventTitle}': ${commentPreview}`
            },
            data: {
              type: 'guest_comment',
              resetStack: 'true',
              navigationStack: 'Home,EventDetail,MessageBoard',
              eventId: eventId,
              studioId: studioId,
              eventTitle: eventTitle,
              commentId: commentId,
              guestName: guestName
            }
          };

          await admin.messaging().send(message);

          console.log(`[Guest Comment] Successfully sent notification to subscriber ${subscriberId} about guest comment on event ${eventId}`);

        } catch (error) {
          console.error(`[Guest Comment] Error sending notification to subscriber ${subscriberId}:`, error);
        }
      });

      // Wait for all notifications to complete
      await Promise.all([...hostNotificationPromises, ...subscriberNotificationPromises]);

    } catch (error) {
      console.error(`[Guest Comment] Error processing guest comment:`, error);
      // Don't throw - we don't want to retry failed notifications
    }
  });