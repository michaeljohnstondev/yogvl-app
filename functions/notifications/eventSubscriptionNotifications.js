// FILE: functions/notifications/eventSubscriptionNotifications.js
// Event subscription notification handlers using direct Firestore triggers

const admin = require('firebase-admin');
const functions = require('firebase-functions');

/**
 * Triggered when a user subscribes to (joins) an event
 * Trigger: studios/{studioId}/events/{eventId}/subscribers/{userId} (document created)
 * Sends notification to event host and cohosts with event detail navigation
 */
exports.onEventSubscribed = functions.firestore
  .document('studios/{studioId}/events/{eventId}/subscribers/{userId}')
  .onCreate(async (snap, context) => {
    const { studioId, eventId, userId } = context.params;

    console.log(`[Event Subscription] User ${userId} joined event ${eventId} in studio ${studioId}`);

    try {
      // Get event details
      const eventDoc = await admin.firestore().doc(`studios/${studioId}/events/${eventId}`).get();

      if (!eventDoc.exists) {
        console.log(`[Event Subscription] Event ${eventId} not found`);
        return;
      }

      const eventData = eventDoc.data();
      const eventTitle = eventData.title || 'Untitled Event';
      const hostId = eventData.createdBy;
      const cohosts = eventData.cohosts || [];

      // Get subscriber details
      const subscriberDoc = await admin.firestore().doc(`users/${userId}`).get();

      if (!subscriberDoc.exists) {
        console.log(`[Event Subscription] Subscriber ${userId} not found`);
        return;
      }

      const subscriberData = subscriberDoc.data();
      const subscriberName = subscriberData?.userdata?.contactInfo?.displayName || 'Someone';

      // Create list of recipients (host + cohosts, excluding the subscriber)
      const recipients = [hostId, ...cohosts].filter(id => id !== userId);

      if (recipients.length === 0) {
        console.log(`[Event Subscription] No recipients to notify for event ${eventId}`);
        return;
      }

      // Send notifications to each recipient
      const notificationPromises = recipients.map(async (recipientId) => {
        try {
          // Get recipient details and notification settings
          const recipientDoc = await admin.firestore().doc(`users/${recipientId}`).get();

          if (!recipientDoc.exists) {
            console.log(`[Event Subscription] Recipient ${recipientId} not found`);
            return;
          }

          const recipientData = recipientDoc.data();

          // Check per-event host settings first, fall back to user defaults
          const perEventSettings = eventData.notificationSettings || {};
          const userHostingSettings = recipientData?.userdata?.settings?.notifications?.hosting || {};

          // Master enabled: per-event if set, else user default
          const masterEnabled = perEventSettings.enabled ?? userHostingSettings.enabled ?? true;
          if (!masterEnabled) {
            console.log(`[Event Subscription] Recipient ${recipientId} has master hosting notifications disabled`);
            return;
          }

          // notifyOnJoin: per-event if set, else user default
          const notifyOnJoin = perEventSettings.notifyOnJoin ?? userHostingSettings.notifyOnJoin ?? true;

          if (!notifyOnJoin) {
            console.log(`[Event Subscription] Recipient ${recipientId} has disabled join notifications`);
            return;
          }

          const fcmToken = recipientData?.deviceInfo?.fcmToken;

          // If user has FCM token: send ONLY push notification (FCM handler creates in-app)
          // If NO token: create in-app notification directly (they won't get push)
          if (fcmToken) {
            // Send push notification - FCM handler will create in-app notification
            const message = {
              token: fcmToken,
              notification: {
                title: 'Someone Joined Your Event!',
                body: `${subscriberName} joined your event '${eventTitle}'`
              },
              data: {
                type: 'event_subscription',
                resetStack: 'true',
                navigationStack: 'Home,EventDetail',
                eventId: eventId,
                studioId: studioId,
                eventTitle: eventTitle,
                subscriberId: userId,
                subscriberName: subscriberName
              },
              android: {
                priority: 'high'
              }
            };

            try {
              await admin.messaging().send(message);
              console.log(`[Event Subscription] ✅ Sent push notification to ${recipientId} (FCM handler will create in-app)`);
            } catch (pushError) {
              console.error(`[Event Subscription] ❌ Failed to send push to ${recipientId}:`, pushError);
              // Fallback: create in-app notification if push fails
              await admin.firestore()
                .collection('users')
                .doc(recipientId)
                .collection('notifications')
                .add({
                  type: 'event_subscription',
                  title: 'Someone Joined Your Event!',
                  message: `${subscriberName} joined your event '${eventTitle}'`,
                  read: false,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  data: {
                    resetStack: true,
                    navigationStack: 'Home,EventDetail',
                    eventId: eventId,
                    studioId: studioId,
                    eventTitle: eventTitle,
                    subscriberId: userId,
                    subscriberName: subscriberName
                  }
                });
              console.log(`[Event Subscription] ✅ Created fallback in-app notification for ${recipientId}`);
            }
          } else {
            // No FCM token - create in-app notification directly
            console.log(`[Event Subscription] ⚠️ Recipient ${recipientId} has no FCM token - creating in-app notification`);
            await admin.firestore()
              .collection('users')
              .doc(recipientId)
              .collection('notifications')
              .add({
                type: 'event_subscription',
                title: 'Someone Joined Your Event!',
                message: `${subscriberName} joined your event '${eventTitle}'`,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                data: {
                  resetStack: true,
                  navigationStack: 'Home,EventDetail',
                  eventId: eventId,
                  studioId: studioId,
                  eventTitle: eventTitle,
                  subscriberId: userId,
                  subscriberName: subscriberName
                }
              });
            console.log(`[Event Subscription] ✅ Created in-app notification for ${recipientId} (no token)`);
          }

        } catch (error) {
          console.error(`[Event Subscription] Error sending notification to recipient ${recipientId}:`, error);
          // Don't throw - continue with other recipients
        }
      });

      // Wait for all notifications to complete
      await Promise.all(notificationPromises);

    } catch (error) {
      console.error(`[Event Subscription] Error processing event subscription:`, error);
      // Don't throw - we don't want to retry failed notifications
    }
  });

/**
 * Triggered when a user unsubscribes from (leaves) an event
 * Trigger: studios/{studioId}/events/{eventId}/subscribers/{userId} (document deleted)
 * Sends notification to event host and cohosts with event detail navigation
 */
exports.onEventUnsubscribed = functions.firestore
  .document('studios/{studioId}/events/{eventId}/subscribers/{userId}')
  .onDelete(async (snap, context) => {
    const { studioId, eventId, userId } = context.params;

    console.log(`[Event Unsubscription] User ${userId} left event ${eventId} in studio ${studioId}`);

    try {
      // Get event details
      const eventDoc = await admin.firestore().doc(`studios/${studioId}/events/${eventId}`).get();

      if (!eventDoc.exists) {
        console.log(`[Event Unsubscription] Event ${eventId} not found`);
        return;
      }

      const eventData = eventDoc.data();
      const eventTitle = eventData.title || 'Untitled Event';
      const hostId = eventData.createdBy;
      const cohosts = eventData.cohosts || [];

      // Get unsubscriber details
      const unsubscriberDoc = await admin.firestore().doc(`users/${userId}`).get();

      if (!unsubscriberDoc.exists) {
        console.log(`[Event Unsubscription] Unsubscriber ${userId} not found`);
        return;
      }

      const unsubscriberData = unsubscriberDoc.data();
      const unsubscriberName = unsubscriberData?.userdata?.contactInfo?.displayName || 'Someone';

      // Create list of recipients (host + cohosts, excluding the unsubscriber)
      const recipients = [hostId, ...cohosts].filter(id => id !== userId);

      if (recipients.length === 0) {
        console.log(`[Event Unsubscription] No recipients to notify for event ${eventId}`);
        return;
      }

      // Send notifications to each recipient
      const notificationPromises = recipients.map(async (recipientId) => {
        try {
          // Get recipient details and notification settings
          const recipientDoc = await admin.firestore().doc(`users/${recipientId}`).get();

          if (!recipientDoc.exists) {
            console.log(`[Event Unsubscription] Recipient ${recipientId} not found`);
            return;
          }

          const recipientData = recipientDoc.data();

          // Check per-event host settings first, fall back to user defaults
          const perEventSettings = eventData.notificationSettings || {};
          const userHostingSettings = recipientData?.userdata?.settings?.notifications?.hosting || {};

          // Master enabled: per-event if set, else user default
          const masterEnabled = perEventSettings.enabled ?? userHostingSettings.enabled ?? true;
          if (!masterEnabled) {
            console.log(`[Event Unsubscription] Recipient ${recipientId} has master hosting notifications disabled`);
            return;
          }

          // notifyOnLeave: per-event if set, else user default
          const notifyOnLeave = perEventSettings.notifyOnLeave ?? userHostingSettings.notifyOnLeave ?? true;

          if (!notifyOnLeave) {
            console.log(`[Event Unsubscription] Recipient ${recipientId} has disabled leave notifications`);
            return;
          }

          const fcmToken = recipientData?.deviceInfo?.fcmToken;

          // If user has FCM token: send ONLY push notification (FCM handler creates in-app)
          // If NO token: create in-app notification directly (they won't get push)
          if (fcmToken) {
            // Send push notification - FCM handler will create in-app notification
            const message = {
              token: fcmToken,
              notification: {
                title: 'Someone Left Your Event',
                body: `${unsubscriberName} left your event '${eventTitle}'`
              },
              data: {
                type: 'event_unsubscription',
                resetStack: 'true',
                navigationStack: 'Home,EventDetail',
                eventId: eventId,
                studioId: studioId,
                eventTitle: eventTitle,
                unsubscriberId: userId,
                unsubscriberName: unsubscriberName
              },
              android: {
                priority: 'high'
              }
            };

            try {
              await admin.messaging().send(message);
              console.log(`[Event Unsubscription] ✅ Sent push notification to ${recipientId} (FCM handler will create in-app)`);
            } catch (pushError) {
              console.error(`[Event Unsubscription] ❌ Failed to send push to ${recipientId}:`, pushError);
              // Fallback: create in-app notification if push fails
              await admin.firestore()
                .collection('users')
                .doc(recipientId)
                .collection('notifications')
                .add({
                  type: 'event_unsubscription',
                  title: 'Someone Left Your Event',
                  message: `${unsubscriberName} left your event '${eventTitle}'`,
                  read: false,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  data: {
                    resetStack: true,
                    navigationStack: 'Home,EventDetail',
                    eventId: eventId,
                    studioId: studioId,
                    eventTitle: eventTitle,
                    unsubscriberId: userId,
                    unsubscriberName: unsubscriberName
                  }
                });
              console.log(`[Event Unsubscription] ✅ Created fallback in-app notification for ${recipientId}`);
            }
          } else {
            // No FCM token - create in-app notification directly
            console.log(`[Event Unsubscription] ⚠️ Recipient ${recipientId} has no FCM token - creating in-app notification`);
            await admin.firestore()
              .collection('users')
              .doc(recipientId)
              .collection('notifications')
              .add({
                type: 'event_unsubscription',
                title: 'Someone Left Your Event',
                message: `${unsubscriberName} left your event '${eventTitle}'`,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                data: {
                  resetStack: true,
                  navigationStack: 'Home,EventDetail',
                  eventId: eventId,
                  studioId: studioId,
                  eventTitle: eventTitle,
                  unsubscriberId: userId,
                  unsubscriberName: unsubscriberName
                }
              });
            console.log(`[Event Unsubscription] ✅ Created in-app notification for ${recipientId} (no token)`);
          }

          console.log(`[Event Unsubscription] Successfully sent notification to ${recipientId} about ${unsubscriberName} leaving event ${eventId}`);

        } catch (error) {
          console.error(`[Event Unsubscription] Error sending notification to recipient ${recipientId}:`, error);
          // Don't throw - continue with other recipients
        }
      });

      // Wait for all notifications to complete
      await Promise.all(notificationPromises);

    } catch (error) {
      console.error(`[Event Unsubscription] Error processing event unsubscription:`, error);
      // Don't throw - we don't want to retry failed notifications
    }
  });