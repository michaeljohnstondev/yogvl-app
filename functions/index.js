// Firebase Cloud Functions for Big Vibe Studios Notification System

const functions = require('firebase-functions/v2');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

/**
 * Handle comment notifications triggered from the app
 * This implements the batching logic: first comment instant, rest batched
 */
exports.onCommentNotificationTrigger = functions.firestore
  .onDocumentCreated('notificationTriggers/{triggerId}', async (event) => {
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

      const { hostId, eventId, comment, commenter, eventTitle, isFirstComment } = triggerData;

      // Get host's notification preferences
      const hostDoc = await admin.firestore().doc(`users/${hostId}`).get();
      if (!hostDoc.exists) {
        console.log('Host document not found');
        return;
      }

      const hostData = hostDoc.data();
      const hostingPrefs = hostData?.userdata?.settings?.notifications?.hosting || {};
      
      // Check if host wants comment notifications
      if (!hostingPrefs.enabled || !hostingPrefs.newComments) {
        console.log('Host has comment notifications disabled');
        return;
      }

      // Get host's FCM token
      const hostToken = hostData?.deviceInfo?.fcmToken;
      if (!hostToken) {
        console.log('Host has no FCM token');
        return;
      }

      // For first comment, send instant notification
      // For subsequent comments, we just increment the badge (handled in React Native)
      if (isFirstComment) {
        const message = {
          token: hostToken,
          notification: {
            title: `New comment on "${eventTitle}"`,
            body: `${commenter.firstName || commenter.displayName}: ${comment.text}`,
          },
          data: {
            type: 'comment',
            eventId: eventId,
            commentId: comment.id,
            screen: 'EventDetail',
          },
          apns: {
            payload: {
              aps: {
                badge: 1,
                sound: 'default',
              },
            },
          },
        };

        await admin.messaging().send(message);
        console.log(`Comment notification sent to host ${hostId} for event ${eventId}`);
      } else {
        console.log(`Batched comment notification for event ${eventId} (no push sent)`);
      }

      // Clean up processed trigger after a delay
      setTimeout(async () => {
        try {
          await admin.firestore().doc(`notificationTriggers/${triggerId}`).delete();
        } catch (error) {
          console.error('Error cleaning up trigger document:', error);
        }
      }, 60000); // Delete after 1 minute

    } catch (error) {
      console.error('Error processing comment notification trigger:', error);
    }
  });

/**
 * Send push notification when someone joins an event
 * Triggered when a user is added to an event's subscribers array
 */
exports.onEventJoin = functions.firestore
  .onDocumentWritten('studios/{studioId}/events/{eventId}', async (event) => {
    const { data, params } = event;
    const { studioId, eventId } = params;

    if (!data.after.exists) return; // Event deleted

    const beforeData = data.before.data();
    const afterData = data.after.data();

    // Check if subscribers array changed (someone joined)
    const beforeSubscribers = beforeData?.subscribers || [];
    const afterSubscribers = afterData?.subscribers || [];

    if (afterSubscribers.length <= beforeSubscribers.length) return; // No new subscribers

    // Find new subscribers
    const newSubscribers = afterSubscribers.filter(sub => !beforeSubscribers.includes(sub));
    
    if (newSubscribers.length === 0) return;

    // Get host notification preferences
    const hostId = afterData.hostId || afterData.createdBy;
    if (!hostId) return;

    const hostDoc = await admin.firestore().doc(`users/${hostId}`).get();
    if (!hostDoc.exists) return;

    const hostData = hostDoc.data();
    const hostingPrefs = hostData?.userdata?.settings?.notifications?.hosting || {};

    // Check if host wants join notifications
    if (!hostingPrefs.enabled || !hostingPrefs.notifyOnJoin) {
      console.log('Host has join notifications disabled');
      return;
    }

    // Get host's FCM token
    const hostToken = hostData?.deviceInfo?.fcmToken;
    if (!hostToken) {
      console.log('Host has no FCM token');
      return;
    }

    // Get new subscriber names
    const subscriberNames = [];
    for (const subscriberId of newSubscribers) {
      const userDoc = await admin.firestore().doc(`users/${subscriberId}`).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        const firstName = userData?.userdata?.contactInfo?.firstName || 'Someone';
        subscriberNames.push(firstName);
      }
    }

    if (subscriberNames.length === 0) return;

    // Create notification payload
    const message = {
      token: hostToken,
      notification: {
        title: `New attendee${subscriberNames.length > 1 ? 's' : ''} joined!`,
        body: `${subscriberNames.join(', ')} joined "${afterData.title}"`,
      },
      data: {
        type: 'event_join',
        eventId: eventId,
        screen: 'EventDetail',
      },
      apns: {
        payload: {
          aps: {
            badge: 1,
            sound: 'default',
          },
        },
      },
    };

    try {
      await admin.messaging().send(message);
      console.log(`Join notification sent to host ${hostId} for event ${eventId}`);
    } catch (error) {
      console.error('Error sending join notification:', error);
    }
  });

/**
 * Send push notification when someone leaves an event
 */
exports.onEventLeave = functions.firestore
  .onDocumentWritten('studios/{studioId}/events/{eventId}', async (event) => {
    const { data, params } = event;
    const { studioId, eventId } = params;

    if (!data.after.exists) return; // Event deleted

    const beforeData = data.before.data();
    const afterData = data.after.data();

    // Check if subscribers array changed (someone left)
    const beforeSubscribers = beforeData?.subscribers || [];
    const afterSubscribers = afterData?.subscribers || [];

    if (afterSubscribers.length >= beforeSubscribers.length) return; // No one left

    // Find who left
    const leftSubscribers = beforeSubscribers.filter(sub => !afterSubscribers.includes(sub));
    
    if (leftSubscribers.length === 0) return;

    // Get host notification preferences
    const hostId = afterData.hostId || afterData.createdBy;
    if (!hostId) return;

    const hostDoc = await admin.firestore().doc(`users/${hostId}`).get();
    if (!hostDoc.exists) return;

    const hostData = hostDoc.data();
    const hostingPrefs = hostData?.userdata?.settings?.notifications?.hosting || {};

    // Check if host wants leave notifications
    if (!hostingPrefs.enabled || !hostingPrefs.notifyOnLeave) {
      console.log('Host has leave notifications disabled');
      return;
    }

    // Get host's FCM token
    const hostToken = hostData?.deviceInfo?.fcmToken;
    if (!hostToken) {
      console.log('Host has no FCM token');
      return;
    }

    // Get names of people who left
    const leftNames = [];
    for (const leftUserId of leftSubscribers) {
      const userDoc = await admin.firestore().doc(`users/${leftUserId}`).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        const firstName = userData?.userdata?.contactInfo?.firstName || 'Someone';
        leftNames.push(firstName);
      }
    }

    if (leftNames.length === 0) return;

    // Create notification payload
    const message = {
      token: hostToken,
      notification: {
        title: `Attendee${leftNames.length > 1 ? 's' : ''} left event`,
        body: `${leftNames.join(', ')} left "${afterData.title}"`,
      },
      data: {
        type: 'event_leave',
        eventId: eventId,
        screen: 'EventDetail',
      },
      apns: {
        payload: {
          aps: {
            badge: 1,
            sound: 'default',
          },
        },
      },
    };

    try {
      await admin.messaging().send(message);
      console.log(`Leave notification sent to host ${hostId} for event ${eventId}`);
    } catch (error) {
      console.error('Error sending leave notification:', error);
    }
  });

/**
 * Send notifications when event details change
 */
exports.onEventUpdate = functions.firestore
  .onDocumentUpdated('studios/{studioId}/events/{eventId}', async (event) => {
    const { data, params } = event;
    const { studioId, eventId } = params;

    const beforeData = data.before.data();
    const afterData = data.after.data();

    // Check what changed
    const importantChanges = [];
    
    if (beforeData.title !== afterData.title) {
      importantChanges.push('title');
    }
    if (beforeData.utcDateTime !== afterData.utcDateTime) {
      importantChanges.push('time');
    }
    if (beforeData.location !== afterData.location) {
      importantChanges.push('location');
    }
    if (beforeData.description !== afterData.description) {
      importantChanges.push('details');
    }

    if (importantChanges.length === 0) {
      console.log('No important changes detected');
      return;
    }

    // Get all subscribers
    const subscribers = afterData.subscribers || [];
    if (subscribers.length === 0) return;

    // Get subscriber notification preferences and tokens
    const notifications = [];
    for (const subscriberId of subscribers) {
      // Skip the host (they made the change)
      if (subscriberId === (afterData.hostId || afterData.createdBy)) continue;

      const userDoc = await admin.firestore().doc(`users/${subscriberId}`).get();
      if (!userDoc.exists) continue;

      const userData = userDoc.data();
      const attendingPrefs = userData?.userdata?.settings?.notifications?.attending || {};
      
      // Check if user wants host change notifications
      if (!attendingPrefs.hostChanges) continue;

      const fcmToken = userData?.deviceInfo?.fcmToken;
      if (!fcmToken) continue;

      notifications.push({
        token: fcmToken,
        userId: subscriberId,
      });
    }

    if (notifications.length === 0) {
      console.log('No users to notify about event changes');
      return;
    }

    // Create change description
    let changeText = '';
    if (importantChanges.includes('time')) {
      changeText = 'Event time changed';
    } else if (importantChanges.includes('location')) {
      changeText = 'Event location changed';
    } else if (importantChanges.includes('title')) {
      changeText = 'Event details updated';
    } else {
      changeText = 'Event details updated';
    }

    // Send notifications
    const messages = notifications.map(({ token, userId }) => ({
      token,
      notification: {
        title: changeText,
        body: `"${afterData.title}" has been updated by the host`,
      },
      data: {
        type: 'host_change',
        eventId: eventId,
        screen: 'EventDetail',
        changes: importantChanges.join(','),
      },
      apns: {
        payload: {
          aps: {
            badge: 1,
            sound: 'default',
          },
        },
      },
    }));

    try {
      const results = await admin.messaging().sendAll(messages);
      console.log(`Event update notifications sent: ${results.successCount}/${messages.length}`);
    } catch (error) {
      console.error('Error sending event update notifications:', error);
    }
  });

/**
 * Scheduled function to send event reminders
 * Runs every 15 minutes to check for upcoming events
 */
exports.sendEventReminders = functions.scheduler
  .onSchedule('*/15 * * * *', async (context) => {
    const now = admin.firestore.Timestamp.now();
    const fifteenMinutes = 15 * 60 * 1000;
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * 60 * 60 * 1000;

    // Query all events starting in the next day (to catch all reminder times)
    const oneDayFromNow = admin.firestore.Timestamp.fromMillis(now.toMillis() + oneDay);
    
    const eventsQuery = await admin.firestore()
      .collectionGroup('events')
      .where('eventTimestamp', '>', now)
      .where('eventTimestamp', '<=', oneDayFromNow)
      .get();

    const remindersToSend = [];

    eventsQuery.docs.forEach((eventDoc) => {
      const eventData = eventDoc.data();
      const eventTime = eventData.eventTimestamp;
      const timeDiff = eventTime.toMillis() - now.toMillis();
      
      const subscribers = eventData.subscribers || [];
      if (subscribers.length === 0) return;

      // Check if this is a reminder time
      let isReminderTime = false;
      let reminderType = '';

      if (Math.abs(timeDiff - fifteenMinutes) < 2 * 60 * 1000) { // Within 2 minutes of 15min mark
        isReminderTime = true;
        reminderType = '15min';
      } else if (Math.abs(timeDiff - oneHour) < 2 * 60 * 1000) { // Within 2 minutes of 1 hour mark
        isReminderTime = true;
        reminderType = '1hour';
      } else if (Math.abs(timeDiff - oneDay) < 2 * 60 * 1000) { // Within 2 minutes of 1 day mark
        isReminderTime = true;
        reminderType = '1day';
      }

      if (!isReminderTime) return;

      // Add to reminders to send
      remindersToSend.push({
        eventId: eventDoc.id,
        eventData,
        reminderType,
        subscribers,
      });
    });

    console.log(`Found ${remindersToSend.length} events needing reminders`);

    // Send reminders
    for (const reminder of remindersToSend) {
      await sendReminderNotifications(reminder);
    }
  });

/**
 * Helper function to send reminder notifications
 */
async function sendReminderNotifications({ eventId, eventData, reminderType, subscribers }) {
  const notifications = [];

  for (const subscriberId of subscribers) {
    const userDoc = await admin.firestore().doc(`users/${subscriberId}`).get();
    if (!userDoc.exists) continue;

    const userData = userDoc.data();
    const attendingPrefs = userData?.userdata?.settings?.notifications?.attending || {};
    
    // Check if user wants event reminders and if this matches their timing preference
    if (!attendingPrefs.eventReminders || attendingPrefs.reminderTiming !== reminderType) {
      continue;
    }

    const fcmToken = userData?.deviceInfo?.fcmToken;
    if (!fcmToken) continue;

    notifications.push({
      token: fcmToken,
      userId: subscriberId,
    });
  }

  if (notifications.length === 0) return;

  // Create reminder message
  let timeText = '';
  switch (reminderType) {
    case '15min':
      timeText = 'in 15 minutes';
      break;
    case '1hour':
      timeText = 'in 1 hour';
      break;
    case '1day':
      timeText = 'tomorrow';
      break;
    default:
      timeText = 'soon';
  }

  const messages = notifications.map(({ token, userId }) => ({
    token,
    notification: {
      title: `Event starting ${timeText}!`,
      body: `"${eventData.title}" is starting ${timeText}`,
    },
    data: {
      type: 'event_reminder',
      eventId: eventId,
      screen: 'EventDetail',
      reminderType,
    },
    apns: {
      payload: {
        aps: {
          badge: 1,
          sound: 'default',
        },
      },
    },
  }));

  try {
    const results = await admin.messaging().sendAll(messages);
    console.log(`Event reminder notifications sent for ${eventId}: ${results.successCount}/${messages.length}`);
  } catch (error) {
    console.error(`Error sending reminder notifications for ${eventId}:`, error);
  }
}

/**
 * Send notification when someone sends a friend request
 */
exports.onFriendRequest = functions.firestore
  .onDocumentCreated('users/{userId}/friendRequests/{requestId}', async (event) => {
    const requestData = event.data.data();
    const { userId } = event.params;

    try {
      // Get recipient's notification preferences
      const recipientDoc = await admin.firestore().doc(`users/${userId}`).get();
      if (!recipientDoc.exists) {
        console.log('Recipient document not found');
        return;
      }

      const recipientData = recipientDoc.data();
      const appPrefs = recipientData?.userdata?.settings?.notifications?.app || {};
      
      // Check if recipient wants friend request notifications
      if (!appPrefs.friendAdded) {
        console.log('Recipient has friend request notifications disabled');
        return;
      }

      // Get recipient's FCM token
      const recipientToken = recipientData?.deviceInfo?.fcmToken;
      if (!recipientToken) {
        console.log('Recipient has no FCM token');
        return;
      }

      // Get sender info
      const senderDoc = await admin.firestore().doc(`users/${requestData.senderId}`).get();
      if (!senderDoc.exists) {
        console.log('Sender document not found');
        return;
      }

      const senderData = senderDoc.data();
      const senderName = senderData?.userdata?.contactInfo?.firstName || senderData?.userdata?.contactInfo?.displayName || 'Someone';

      const message = {
        token: recipientToken,
        notification: {
          title: 'New Friend Request',
          body: `${senderName} sent you a friend request`,
        },
        data: {
          type: 'friend_request',
          senderId: requestData.senderId,
          screen: 'UserProfile',
          userId: requestData.senderId,
        },
        apns: {
          payload: {
            aps: {
              badge: 1,
              sound: 'default',
            },
          },
        },
      };

      await admin.messaging().send(message);
      console.log(`Friend request notification sent to ${userId} from ${requestData.senderId}`);

    } catch (error) {
      console.error('Error processing friend request notification:', error);
    }
  });

/**
 * Send notification when someone accepts a friend request
 */
exports.onFriendAccepted = functions.firestore
  .onDocumentUpdated('users/{userId}/friendRequests/{requestId}', async (change) => {
    const before = change.before.data();
    const after = change.after.data();
    const { userId } = change.params;

    // Only trigger on status change from pending to accepted
    if (before.status === 'pending' && after.status === 'accepted') {
      try {
        // Get sender's notification preferences (original requester)
        const senderDoc = await admin.firestore().doc(`users/${after.senderId}`).get();
        if (!senderDoc.exists) {
          console.log('Sender document not found');
          return;
        }

        const senderData = senderDoc.data();
        const appPrefs = senderData?.userdata?.settings?.notifications?.app || {};
        
        // Check if sender wants friend acceptance notifications
        if (!appPrefs.friendFollowed) {
          console.log('Sender has friend acceptance notifications disabled');
          return;
        }

        // Get sender's FCM token
        const senderToken = senderData?.deviceInfo?.fcmToken;
        if (!senderToken) {
          console.log('Sender has no FCM token');
          return;
        }

        // Get accepter info
        const accepterDoc = await admin.firestore().doc(`users/${userId}`).get();
        if (!accepterDoc.exists) {
          console.log('Accepter document not found');
          return;
        }

        const accepterData = accepterDoc.data();
        const accepterName = accepterData?.userdata?.contactInfo?.firstName || accepterData?.userdata?.contactInfo?.displayName || 'Someone';

        const message = {
          token: senderToken,
          notification: {
            title: 'Friend Request Accepted',
            body: `${accepterName} accepted your friend request`,
          },
          data: {
            type: 'friend_accepted',
            accepterId: userId,
            screen: 'UserProfile',
            userId: userId,
          },
          apns: {
            payload: {
              aps: {
                badge: 1,
                sound: 'default',
              },
            },
          },
        };

        await admin.messaging().send(message);
        console.log(`Friend acceptance notification sent to ${after.senderId} from ${userId}`);

      } catch (error) {
        console.error('Error processing friend acceptance notification:', error);
      }
    }
  });

/**
 * Send notification when someone is invited as a cohost
 */
exports.onCohostInvitation = functions.firestore
  .onDocumentCreated('users/{userId}/cohostInvitations/{invitationId}', async (event) => {
    const invitationData = event.data.data();
    const { userId } = event.params;

    try {
      // Get recipient's notification preferences
      const recipientDoc = await admin.firestore().doc(`users/${userId}`).get();
      if (!recipientDoc.exists) {
        console.log('Recipient document not found');
        return;
      }

      const recipientData = recipientDoc.data();
      const appPrefs = recipientData?.userdata?.settings?.notifications?.app || {};
      
      // Check if recipient wants cohost invitation notifications
      if (!appPrefs.pushNotifications) {
        console.log('Recipient has push notifications disabled');
        return;
      }

      // Get recipient's FCM token
      const recipientToken = recipientData?.deviceInfo?.fcmToken;
      if (!recipientToken) {
        console.log('Recipient has no FCM token');
        return;
      }

      // Get event info
      const eventDoc = await admin.firestore().doc(`events/${invitationData.eventId}`).get();
      if (!eventDoc.exists) {
        console.log('Event document not found');
        return;
      }

      const eventData = eventDoc.data();
      
      // Get inviter info
      const inviterDoc = await admin.firestore().doc(`users/${invitationData.inviterId}`).get();
      if (!inviterDoc.exists) {
        console.log('Inviter document not found');
        return;
      }

      const inviterData = inviterDoc.data();
      const inviterName = inviterData?.userdata?.contactInfo?.firstName || inviterData?.userdata?.contactInfo?.displayName || 'Someone';

      const message = {
        token: recipientToken,
        notification: {
          title: 'Cohost Invitation',
          body: `${inviterName} invited you to co-host "${eventData.title}"`,
        },
        data: {
          type: 'cohost_invitation',
          eventId: invitationData.eventId,
          inviterId: invitationData.inviterId,
          screen: 'EventDetail',
        },
        apns: {
          payload: {
            aps: {
              badge: 1,
              sound: 'default',
            },
          },
        },
      };

      await admin.messaging().send(message);
      console.log(`Cohost invitation notification sent to ${userId} for event ${invitationData.eventId}`);

    } catch (error) {
      console.error('Error processing cohost invitation notification:', error);
    }
  });