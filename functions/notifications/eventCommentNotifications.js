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

      // Create comment preview (first 50 characters). Client writes the
      // body under `content`; fall back to `text` for any legacy docs.
      // Image-only posts use a distinct body — "shared an image for X"
      // — so subscribers see a recognizable preview instead of the
      // host's name with no text.
      const commentText = commentData.content || commentData.text || '';
      const hasImage = !!commentData.imageUrl;
      const commentPreview = commentText.length > 50
        ? commentText.substring(0, 50) + '...'
        : commentText;

      console.log(`[Host Comment] 💬 Comment preview: "${commentPreview}"${hasImage ? ' (with image)' : ''}`);

      // Get all event subscribers (both from subscribers subcollection and messageBoardSubscribers array)
      const subscribersSnapshot = await admin.firestore()
        .collection(`studios/${studioId}/events/${eventId}/subscribers`)
        .get();

      // Get message board subscribers, cohosts, and muted list from the event document
      const messageBoardSubscribers = eventData.messageBoardSubscribers || [];
      const cohosts = eventData.cohosts || [];
      const messageBoardMuted = eventData.messageBoardMuted || [];

      console.log(`[Host Comment] 📊 Found ${subscribersSnapshot.docs.length} event subscribers, ${cohosts.length} cohosts, and ${messageBoardSubscribers.length} message board subscribers`);

      // Combine all lists (subscribers + cohosts + message board) and remove duplicates
      const eventSubscriberIds = subscribersSnapshot.docs.map(doc => doc.id);
      const allRecipientIds = [...new Set([...eventSubscriberIds, ...cohosts, ...messageBoardSubscribers])];

      // Filter out muted users
      const recipientIds = allRecipientIds.filter(userId => !messageBoardMuted.includes(userId));

      console.log(`[Host Comment] 📊 Total recipients: ${recipientIds.length} (after filtering ${messageBoardMuted.length} muted users)`);

      if (recipientIds.length === 0) {
        console.log(`[Host Comment] ⚠️ No recipients found for event ${eventId}`);
        return;
      }

      // Send notifications to each recipient (except the host)
      const notificationPromises = recipientIds.map(async (subscriberId) => {

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

          // Check per-event notification settings (NEW LOCATION on event), fall back to defaults
          let masterEnabled = true;
          let hostCommentsEnabled = false;
          try {
            const eventSettingsDoc = await admin.firestore()
              .doc(`studios/${studioId}/events/${eventId}/guestNotificationSettings/${subscriberId}`)
              .get();

            if (eventSettingsDoc.exists) {
              const perEventSettings = eventSettingsDoc.data()?.notificationSettings || {};
              masterEnabled = perEventSettings.enabled ?? true;
              hostCommentsEnabled = perEventSettings.hostComments ?? true;
              console.log(`[Host Comment] 📋 Using per-event settings for subscriber ${subscriberId}: enabled = ${masterEnabled}, hostComments = ${hostCommentsEnabled}`);
            } else {
              // Fallback to default template if per-event settings don't exist
              const userDefaults = subscriberData?.userdata?.settings?.notifications?.attending || {};
              masterEnabled = userDefaults.enabled ?? true;
              hostCommentsEnabled = userDefaults.hostComments ?? true;
              console.log(`[Host Comment] ⚠️ No per-event settings found, using defaults for subscriber ${subscriberId}: enabled = ${masterEnabled}, hostComments = ${hostCommentsEnabled}`);
            }
          } catch (settingsError) {
            console.error(`[Host Comment] Error fetching per-event settings for ${subscriberId}:`, settingsError);
            // Fallback to defaults on error
            const userDefaults = subscriberData?.userdata?.settings?.notifications?.attending || {};
            masterEnabled = userDefaults.enabled ?? true;
            hostCommentsEnabled = userDefaults.hostComments ?? true;
            console.log(`[Host Comment] ⚠️ Error fetching settings, using defaults for subscriber ${subscriberId}: hostComments = ${hostCommentsEnabled}`);
          }

          if (!masterEnabled) {
            console.log(`[Host Comment] ⚠️ Subscriber ${subscriberId} has master notifications disabled`);
            return;
          }

          console.log(`[Host Comment] 📋 Final hostComments setting for subscriber ${subscriberId}: ${hostCommentsEnabled}`);

          if (!hostCommentsEnabled) {
            console.log(`[Host Comment] ⚠️ Subscriber ${subscriberId} has disabled host comment notifications`);
            return;
          }

          const fcmToken = subscriberData?.deviceInfo?.fcmToken;

          console.log(`[Host Comment] 🔑 FCM Token ${fcmToken ? 'EXISTS' : 'MISSING'} for subscriber ${subscriberId}`);

          // If user has FCM token: send ONLY push notification (FCM handler creates in-app)
          // If NO token: create in-app notification directly (they won't get push)
          if (fcmToken) {
            // Send push notification - FCM handler will create in-app notification
            const hostBody = hasImage
              ? `${hostName} shared an image for ${eventTitle}`
              : `${hostName}: ${commentPreview}`;
            const message = {
              token: fcmToken,
              notification: {
                title: eventTitle,
                body: hostBody,
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

            console.log(`[Host Comment] 📤 Sending FCM push notification to ${subscriberId} with navigation: Home,EventDetail`);

            try {
              await admin.messaging().send(message);
              console.log(`[Host Comment] ✅ Sent push notification to ${subscriberId} (FCM handler will create in-app)`);
            } catch (pushError) {
              console.error(`[Host Comment] ❌ Failed to send push to ${subscriberId}:`, pushError);
              // Fallback: create in-app notification if push fails
              await admin.firestore()
                .collection('users')
                .doc(subscriberId)
                .collection('notifications')
                .add({
                  type: 'host_comment',
                  title: eventTitle,
                  message: 'New message',
                  read: false,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  data: {
                    resetStack: true,
                    navigationStack: 'Home,EventDetail',
                    eventId: eventId,
                    studioId: studioId,
                    eventTitle: eventTitle,
                    commentId: commentId,
                    hostName: hostName
                  }
                });
              console.log(`[Host Comment] ✅ Created fallback in-app notification for ${subscriberId}`);
            }
          } else {
            // No FCM token - create in-app notification directly
            console.log(`[Host Comment] ⚠️ Subscriber ${subscriberId} has no FCM token - creating in-app notification`);
            await admin.firestore()
              .collection('users')
              .doc(subscriberId)
              .collection('notifications')
              .add({
                type: 'host_comment',
                title: eventTitle,
                message: 'New message',
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                data: {
                  resetStack: true,
                  navigationStack: 'Home,EventDetail',
                  eventId: eventId,
                  studioId: studioId,
                  eventTitle: eventTitle,
                  commentId: commentId,
                  hostName: hostName
                }
              });
            console.log(`[Host Comment] ✅ Created in-app notification for ${subscriberId} (no token)`);
          }

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

      // Create comment preview (first 50 characters). Client writes the
      // body under `content`; fall back to `text` for any legacy docs.
      // Image-only posts get a distinct "shared an image" preview body.
      const commentText = commentData.content || commentData.text || '';
      const hasImage = !!commentData.imageUrl;
      const commentPreview = commentText.length > 50
        ? commentText.substring(0, 50) + '...'
        : commentText;

      console.log(`[Guest Comment] 💬 Comment preview: "${commentPreview}"`);

      // Get all event subscribers for notifications (both from subscribers subcollection and messageBoardSubscribers array)
      const subscribersSnapshot = await admin.firestore()
        .collection(`studios/${studioId}/events/${eventId}/subscribers`)
        .get();

      // Get message board subscribers from the event document
      const messageBoardSubscribers = eventData.messageBoardSubscribers || [];
      const messageBoardMuted = eventData.messageBoardMuted || [];

      console.log(`[Guest Comment] 📊 Found ${subscribersSnapshot.docs.length} event subscribers and ${messageBoardSubscribers.length} message board subscribers`);

      // Combine both lists and remove duplicates
      const eventSubscriberIds = subscribersSnapshot.docs.map(doc => doc.id);
      const allSubscriberIds = [...new Set([...eventSubscriberIds, ...messageBoardSubscribers])];

      // Create recipient lists
      const hostAndCohosts = [hostId, ...cohosts];

      // Filter out hosts, cohosts, the commenter, and muted users
      const otherSubscribers = allSubscriberIds.filter(id =>
        !hostAndCohosts.includes(id) &&
        id !== commentData.userId &&
        !messageBoardMuted.includes(id)
      );

      console.log(`[Guest Comment] 📊 Recipients - Hosts: ${hostAndCohosts.length}, Other subscribers: ${otherSubscribers.length} (after filtering ${messageBoardMuted.length} muted users)`);

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

          // Check per-event notification settings (NEW LOCATION on event), fall back to defaults
          let masterEnabled = true;
          let newCommentsEnabled = false;
          try {
            const eventSettingsDoc = await admin.firestore()
              .doc(`studios/${studioId}/events/${eventId}/guestNotificationSettings/${recipientId}`)
              .get();

            if (eventSettingsDoc.exists) {
              const perEventSettings = eventSettingsDoc.data()?.notificationSettings || {};
              masterEnabled = perEventSettings.enabled ?? true;
              newCommentsEnabled = perEventSettings.newComments ?? false;
              console.log(`[Guest Comment] 📋 Using per-event settings for host/cohost ${recipientId}: enabled = ${masterEnabled}, newComments = ${newCommentsEnabled}`);
            } else {
              // Fallback to hosting defaults for host/cohosts
              const hostDefaults = recipientData?.userdata?.settings?.notifications?.hosting || {};
              masterEnabled = hostDefaults.enabled ?? true;
              newCommentsEnabled = hostDefaults.newComments ?? false;
              console.log(`[Guest Comment] ⚠️ No per-event settings found, using hosting defaults for ${recipientId}: enabled = ${masterEnabled}, newComments = ${newCommentsEnabled}`);
            }
          } catch (settingsError) {
            console.error(`[Guest Comment] Error fetching per-event settings for ${recipientId}:`, settingsError);
            // Fallback to hosting defaults on error
            const hostDefaults = recipientData?.userdata?.settings?.notifications?.hosting || {};
            masterEnabled = hostDefaults.enabled ?? true;
            newCommentsEnabled = hostDefaults.newComments ?? false;
            console.log(`[Guest Comment] ⚠️ Error fetching settings, using hosting defaults for ${recipientId}: newComments = ${newCommentsEnabled}`);
          }

          if (!masterEnabled) {
            console.log(`[Guest Comment] ⚠️ Host/cohost ${recipientId} has master notifications disabled`);
            return;
          }

          console.log(`[Guest Comment] 📋 Final newComments setting for host/cohost ${recipientId}: ${newCommentsEnabled}`);

          if (!newCommentsEnabled) {
            console.log(`[Guest Comment] ⚠️ Host/cohost ${recipientId} has disabled new comment notifications`);
            return;
          }

          const fcmToken = recipientData?.deviceInfo?.fcmToken;

          console.log(`[Guest Comment] 🔑 FCM Token ${fcmToken ? 'EXISTS' : 'MISSING'} for host/cohost ${recipientId}`);

          // If user has FCM token: send ONLY push notification (FCM handler creates in-app)
          // If NO token: create in-app notification directly (they won't get push)
          if (fcmToken) {
            // Send push notification - FCM handler will create in-app notification
            const guestBody = hasImage
              ? `${guestName} shared an image for ${eventTitle}`
              : `${guestName}: ${commentPreview}`;
            const message = {
              token: fcmToken,
              notification: {
                title: eventTitle,
                body: guestBody,
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

            console.log(`[Guest Comment] 📤 Sending FCM push notification to host/cohost ${recipientId} with navigation: Home,EventDetail`);

            try {
              await admin.messaging().send(message);
              console.log(`[Guest Comment] ✅ Sent push notification to ${recipientId} (FCM handler will create in-app)`);
            } catch (pushError) {
              console.error(`[Guest Comment] ❌ Failed to send push to ${recipientId}:`, pushError);
              // Fallback: create in-app notification if push fails
              await admin.firestore()
                .collection('users')
                .doc(recipientId)
                .collection('notifications')
                .add({
                  type: 'guest_comment',
                  title: eventTitle,
                  message: 'New message',
                  read: false,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  data: {
                    resetStack: true,
                    navigationStack: 'Home,EventDetail',
                    eventId: eventId,
                    studioId: studioId,
                    eventTitle: eventTitle,
                    commentId: commentId,
                    guestName: guestName
                  }
                });
              console.log(`[Guest Comment] ✅ Created fallback in-app notification for ${recipientId}`);
            }
          } else {
            // No FCM token - create in-app notification directly
            console.log(`[Guest Comment] ⚠️ Host/cohost ${recipientId} has no FCM token - creating in-app notification`);
            await admin.firestore()
              .collection('users')
              .doc(recipientId)
              .collection('notifications')
              .add({
                type: 'guest_comment',
                title: eventTitle,
                message: 'New message',
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                data: {
                  resetStack: true,
                  navigationStack: 'Home,EventDetail',
                  eventId: eventId,
                  studioId: studioId,
                  eventTitle: eventTitle,
                  commentId: commentId,
                  guestName: guestName
                }
              });
            console.log(`[Guest Comment] ✅ Created in-app notification for ${recipientId} (no token)`);
          }

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

          // Check per-event notification settings (NEW LOCATION on event), fall back to defaults
          let masterEnabled = true;
          let newCommentsEnabled = false;
          try {
            const eventSettingsDoc = await admin.firestore()
              .doc(`studios/${studioId}/events/${eventId}/guestNotificationSettings/${subscriberId}`)
              .get();

            if (eventSettingsDoc.exists) {
              const perEventSettings = eventSettingsDoc.data()?.notificationSettings || {};
              masterEnabled = perEventSettings.enabled ?? true;
              newCommentsEnabled = perEventSettings.newComments ?? false;
              console.log(`[Guest Comment] 📋 Using per-event settings for subscriber ${subscriberId}: enabled = ${masterEnabled}, newComments = ${newCommentsEnabled}`);
            } else {
              // Fallback to default template if per-event settings don't exist
              const userDefaults = subscriberData?.userdata?.settings?.notifications?.attending || {};
              masterEnabled = userDefaults.enabled ?? true;
              newCommentsEnabled = userDefaults.newComments ?? false;
              console.log(`[Guest Comment] ⚠️ No per-event settings found, using defaults for subscriber ${subscriberId}: enabled = ${masterEnabled}, newComments = ${newCommentsEnabled}`);
            }
          } catch (settingsError) {
            console.error(`[Guest Comment] Error fetching per-event settings for ${subscriberId}:`, settingsError);
            // Fallback to defaults on error
            const userDefaults = subscriberData?.userdata?.settings?.notifications?.attending || {};
            masterEnabled = userDefaults.enabled ?? true;
            newCommentsEnabled = userDefaults.newComments ?? false;
            console.log(`[Guest Comment] ⚠️ Error fetching settings, using defaults for subscriber ${subscriberId}: newComments = ${newCommentsEnabled}`);
          }

          if (!masterEnabled) {
            console.log(`[Guest Comment] ⚠️ Subscriber ${subscriberId} has master notifications disabled`);
            return;
          }

          console.log(`[Guest Comment] 📋 Final newComments setting for subscriber ${subscriberId}: ${newCommentsEnabled}`);

          if (!newCommentsEnabled) {
            console.log(`[Guest Comment] ⚠️ Subscriber ${subscriberId} has disabled new comment notifications`);
            return;
          }

          // STEP 1: ALWAYS create in-app notification (Firestore document)
          try {
            await admin.firestore()
              .collection('users')
              .doc(subscriberId)
              .collection('notifications')
              .add({
                type: 'guest_comment',
                title: eventTitle,
                message: 'New message',
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                data: {
                  resetStack: true,
                  navigationStack: 'Home,EventDetail',
                  eventId: eventId,
                  studioId: studioId,
                  eventTitle: eventTitle,
                  commentId: commentId,
                  guestName: guestName
                }
              });

            console.log(`[Guest Comment] ✅ Created in-app notification for subscriber ${subscriberId}`);
          } catch (inAppError) {
            console.error(`[Guest Comment] ❌ Failed to create in-app notification for ${subscriberId}:`, inAppError);
            // Continue to try push notification even if in-app fails
          }

          // STEP 2: Optionally send push notification (if FCM token exists)
          const fcmToken = subscriberData?.deviceInfo?.fcmToken;

          console.log(`[Guest Comment] 🔑 FCM Token ${fcmToken ? 'EXISTS' : 'MISSING'} for subscriber ${subscriberId}`);

          if (!fcmToken) {
            console.log(`[Guest Comment] ⚠️ Subscriber ${subscriberId} has no FCM token - in-app notification created, push skipped`);
            return; // Exit but in-app notification was already created
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

          console.log(`[Guest Comment] 📤 Sending FCM push notification to subscriber ${subscriberId} with navigation: Home,EventDetail`);
          console.log(`[Guest Comment] 📦 Message data:`, JSON.stringify(message.data, null, 2));

          try {
            await admin.messaging().send(message);
            console.log(`[Guest Comment] ✅ Successfully sent push notification to subscriber ${subscriberId} about guest comment on event ${eventId}`);
          } catch (pushError) {
            console.error(`[Guest Comment] ❌ Failed to send push notification to ${subscriberId}:`, pushError);
            console.log(`[Guest Comment] ℹ️ In-app notification was still created successfully`);
            // Don't throw - in-app notification was already created
          }

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