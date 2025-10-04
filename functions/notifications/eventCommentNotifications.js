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

    console.log(`[Host Comment] 🔔 TRIGGERED: Comment ${commentId} created on event ${eventId} by user ${commentData.userId}`);

    try {
      // Get event details to check if commenter is the host
      const eventDoc = await admin.firestore().doc(`studios/${studioId}/events/${eventId}`).get();

      if (!eventDoc.exists) {
        console.log(`[Host Comment] ❌ Event ${eventId} not found`);
        return;
      }

      const eventData = eventDoc.data();
      const hostId = eventData.createdBy;

      console.log(`[Host Comment] ✅ Event document found, hostId: ${hostId}`);

      // Check if the commenter is the host
      if (commentData.userId !== hostId) {
        console.log(`[Host Comment] ⚠️ Comment ${commentId} is not from host (${commentData.userId} !== ${hostId})`);
        return; // This is not a host comment, exit early
      }

      console.log(`[Host Comment] ✅ Confirmed host comment from ${hostId}`);

      const eventTitle = eventData.title || 'Untitled Event';

      console.log(`[Host Comment] 📋 Event title: "${eventTitle}"`);

      // Get host details for the notification
      const hostDoc = await admin.firestore().doc(`users/${hostId}`).get();

      if (!hostDoc.exists) {
        console.log(`[Host Comment] ❌ Host ${hostId} not found`);
        return;
      }

      const hostData = hostDoc.data();
      const hostName = hostData?.userdata?.contactInfo?.displayName || 'Host';

      console.log(`[Host Comment] 👤 Host name: ${hostName}`);

      // Create comment preview (first 50 characters)
      const commentText = commentData.text || '';
      const commentPreview = commentText.length > 50
        ? commentText.substring(0, 50) + '...'
        : commentText;

      console.log(`[Host Comment] 💬 Comment preview: "${commentPreview}"`);

      // Get all event subscribers
      const subscribersSnapshot = await admin.firestore()
        .collection(`studios/${studioId}/events/${eventId}/subscribers`)
        .get();

      if (subscribersSnapshot.empty) {
        console.log(`[Host Comment] ⚠️ No subscribers found for event ${eventId}`);
        return;
      }

      console.log(`[Host Comment] 📊 Found ${subscribersSnapshot.docs.length} subscribers`);

      // Send notifications to each subscriber (except the host)
      const notificationPromises = subscribersSnapshot.docs.map(async (subscriberDoc) => {
        const subscriberId = subscriberDoc.id;

        // Skip the host (they don't need to be notified of their own comment)
        if (subscriberId === hostId) {
          console.log(`[Host Comment] ⏭️ Skipping host ${subscriberId} (won't notify of their own comment)`);
          return;
        }

        try {
          console.log(`[Host Comment] 🔍 Processing subscriber ${subscriberId}...`);

          // Get subscriber details and notification settings
          const subscriberUserDoc = await admin.firestore().doc(`users/${subscriberId}`).get();

          if (!subscriberUserDoc.exists) {
            console.log(`[Host Comment] ❌ Subscriber ${subscriberId} not found`);
            return;
          }

          const subscriberData = subscriberUserDoc.data();

          console.log(`[Host Comment] ✅ Subscriber ${subscriberId} document found`);

          // Check if subscriber has enabled host comment notifications
          const hostCommentsEnabled = subscriberData?.userdata?.settings?.notifications?.attending?.hostComments;

          console.log(`[Host Comment] 📋 Subscriber ${subscriberId} hostComments setting: ${hostCommentsEnabled}`);

          if (!hostCommentsEnabled) {
            console.log(`[Host Comment] ⚠️ Subscriber ${subscriberId} has disabled host comment notifications`);
            return;
          }

          // Get subscriber's FCM token
          const fcmToken = subscriberData?.deviceInfo?.fcmToken;

          console.log(`[Host Comment] 🔑 FCM Token ${fcmToken ? 'EXISTS' : 'MISSING'} for subscriber ${subscriberId}`);

          if (!fcmToken) {
            console.log(`[Host Comment] ❌ Subscriber ${subscriberId} has no FCM token`);
            return;
          }

          // Send FCM notification with navigation stack
          const message = {
            token: fcmToken,
            notification: {
              title: eventTitle,
              body: `New message`
            },
            data: {
              type: 'host_comment',
              resetStack: 'true',
              navigationStack: 'Home,EventDetail',
              eventId: eventId,
              studioId: studioId,
              eventTitle: eventTitle,
              commentId: commentId,
              hostName: hostName
            },
            android: {
              priority: 'high'
            }
          };

          console.log(`[Host Comment] 📤 Sending FCM message to ${subscriberId} with navigation: Home,EventDetail`);
          console.log(`[Host Comment] 📦 Message data:`, JSON.stringify(message.data, null, 2));

          await admin.messaging().send(message);

          console.log(`[Host Comment] ✅ Successfully sent notification to subscriber ${subscriberId} about host comment on event ${eventId}`);

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

    console.log(`[Guest Comment] 🔔 TRIGGERED: Comment ${commentId} created on event ${eventId} by user ${commentData.userId}`);

    try {
      // Get event details to check if commenter is NOT the host
      const eventDoc = await admin.firestore().doc(`studios/${studioId}/events/${eventId}`).get();

      if (!eventDoc.exists) {
        console.log(`[Guest Comment] ❌ Event ${eventId} not found`);
        return;
      }

      const eventData = eventDoc.data();
      const hostId = eventData.createdBy;
      const cohosts = eventData.cohosts || [];

      console.log(`[Guest Comment] ✅ Event document found, hostId: ${hostId}, cohosts: ${cohosts.length}`);

      // Check if the commenter is NOT the host (this is a guest comment)
      if (commentData.userId === hostId) {
        console.log(`[Guest Comment] ⚠️ Comment ${commentId} is from host, skipping guest comment logic`);
        return; // This is a host comment, let onHostComment handle it
      }

      console.log(`[Guest Comment] ✅ Confirmed guest comment from ${commentData.userId}`);

      const eventTitle = eventData.title || 'Untitled Event';

      console.log(`[Guest Comment] 📋 Event title: "${eventTitle}"`);

      // Get guest/commenter details for the notification
      const guestDoc = await admin.firestore().doc(`users/${commentData.userId}`).get();

      if (!guestDoc.exists) {
        console.log(`[Guest Comment] ❌ Guest ${commentData.userId} not found`);
        return;
      }

      const guestData = guestDoc.data();
      const guestName = guestData?.userdata?.contactInfo?.displayName || 'Someone';

      console.log(`[Guest Comment] 👤 Guest name: ${guestName}`);

      // Create comment preview (first 50 characters)
      const commentText = commentData.text || '';
      const commentPreview = commentText.length > 50
        ? commentText.substring(0, 50) + '...'
        : commentText;

      console.log(`[Guest Comment] 💬 Comment preview: "${commentPreview}"`);

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

      console.log(`[Guest Comment] 📊 Recipients - Hosts: ${hostAndCohosts.length}, Other subscribers: ${otherSubscribers.length}`);

      // Send notifications to host/cohosts (check hosting.newComments setting)
      const hostNotificationPromises = hostAndCohosts.map(async (recipientId) => {
        try {
          console.log(`[Guest Comment] 🔍 Processing host/cohost ${recipientId}...`);

          const recipientDoc = await admin.firestore().doc(`users/${recipientId}`).get();

          if (!recipientDoc.exists) {
            console.log(`[Guest Comment] ❌ Host/cohost ${recipientId} not found`);
            return;
          }

          const recipientData = recipientDoc.data();

          console.log(`[Guest Comment] ✅ Host/cohost ${recipientId} document found`);

          // Check hosting notification settings for host/cohosts
          const newCommentsEnabled = recipientData?.userdata?.settings?.notifications?.hosting?.newComments;

          console.log(`[Guest Comment] 📋 Host/cohost ${recipientId} newComments setting: ${newCommentsEnabled}`);

          if (!newCommentsEnabled) {
            console.log(`[Guest Comment] ⚠️ Host/cohost ${recipientId} has disabled new comment notifications`);
            return;
          }

          const fcmToken = recipientData?.deviceInfo?.fcmToken;

          console.log(`[Guest Comment] 🔑 FCM Token ${fcmToken ? 'EXISTS' : 'MISSING'} for host/cohost ${recipientId}`);

          if (!fcmToken) {
            console.log(`[Guest Comment] ❌ Host/cohost ${recipientId} has no FCM token`);
            return;
          }

          const message = {
            token: fcmToken,
            notification: {
              title: eventTitle,
              body: `New message`
            },
            data: {
              type: 'guest_comment',
              resetStack: 'true',
              navigationStack: 'Home,EventDetail',
              eventId: eventId,
              studioId: studioId,
              eventTitle: eventTitle,
              commentId: commentId,
              guestName: guestName
            },
            android: {
              priority: 'high'
            }
          };

          console.log(`[Guest Comment] 📤 Sending FCM message to host/cohost ${recipientId} with navigation: Home,EventDetail`);
          console.log(`[Guest Comment] 📦 Message data:`, JSON.stringify(message.data, null, 2));

          await admin.messaging().send(message);

          console.log(`[Guest Comment] ✅ Successfully sent notification to host/cohost ${recipientId} about guest comment on event ${eventId}`);

        } catch (error) {
          console.error(`[Guest Comment] Error sending notification to host/cohost ${recipientId}:`, error);
        }
      });

      // Send notifications to other subscribers (check attending.newComments setting)
      const subscriberNotificationPromises = otherSubscribers.map(async (subscriberId) => {
        try {
          console.log(`[Guest Comment] 🔍 Processing subscriber ${subscriberId}...`);

          const subscriberDoc = await admin.firestore().doc(`users/${subscriberId}`).get();

          if (!subscriberDoc.exists) {
            console.log(`[Guest Comment] ❌ Subscriber ${subscriberId} not found`);
            return;
          }

          const subscriberData = subscriberDoc.data();

          console.log(`[Guest Comment] ✅ Subscriber ${subscriberId} document found`);

          // Check attending notification settings for other subscribers
          const newCommentsEnabled = subscriberData?.userdata?.settings?.notifications?.attending?.newComments;

          console.log(`[Guest Comment] 📋 Subscriber ${subscriberId} newComments setting: ${newCommentsEnabled}`);

          if (!newCommentsEnabled) {
            console.log(`[Guest Comment] ⚠️ Subscriber ${subscriberId} has disabled new comment notifications`);
            return;
          }

          const fcmToken = subscriberData?.deviceInfo?.fcmToken;

          console.log(`[Guest Comment] 🔑 FCM Token ${fcmToken ? 'EXISTS' : 'MISSING'} for subscriber ${subscriberId}`);

          if (!fcmToken) {
            console.log(`[Guest Comment] ❌ Subscriber ${subscriberId} has no FCM token`);
            return;
          }

          const message = {
            token: fcmToken,
            notification: {
              title: eventTitle,
              body: `New message`
            },
            data: {
              type: 'guest_comment',
              resetStack: 'true',
              navigationStack: 'Home,EventDetail',
              eventId: eventId,
              studioId: studioId,
              eventTitle: eventTitle,
              commentId: commentId,
              guestName: guestName
            },
            android: {
              priority: 'high'
            }
          };

          console.log(`[Guest Comment] 📤 Sending FCM message to subscriber ${subscriberId} with navigation: Home,EventDetail`);
          console.log(`[Guest Comment] 📦 Message data:`, JSON.stringify(message.data, null, 2));

          await admin.messaging().send(message);

          console.log(`[Guest Comment] ✅ Successfully sent notification to subscriber ${subscriberId} about guest comment on event ${eventId}`);

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