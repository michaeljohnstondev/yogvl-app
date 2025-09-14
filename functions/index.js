// Firebase Cloud Functions for Big Vibe Studios Notification System
/* eslint-env node */

const functions = require('firebase-functions/v2');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp();

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
      if (!hostingPrefs.enabled || !hostingPrefs.newComments) {
        console.log('Host has comment notifications disabled');
        return;
      }

      // Get host's FCM push token
      const hostToken = hostData?.deviceInfo?.fcmToken;
      if (!hostToken) {
        console.log('Host has no FCM push token');
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
        console.log(
          `Comment notification sent to host ${hostId} for event ${eventId}`
        );
      } else {
        console.log(
          `Batched comment notification for event ${eventId} (no push sent)`
        );
      }

      // Clean up processed trigger after a delay
      setTimeout(async () => {
        try {
          await admin
            .firestore()
            .doc(`notificationTriggers/${triggerId}`)
            .delete();
        } catch (error) {
          console.error('Error cleaning up trigger document:', error);
        }
      }, 60000); // Delete after 1 minute
    } catch (error) {
      console.error('Error processing comment notification trigger:', error);
    }
  }
);

/**
 * Send push notification when someone joins an event
 * Triggered when a user is added to an event's subscribers array
 */
exports.onEventJoin = functions.firestore.onDocumentWritten(
  'studios/{studioId}/events/{eventId}',
  async (event) => {
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
    const newSubscribers = afterSubscribers.filter(
      (sub) => !beforeSubscribers.includes(sub)
    );

    if (newSubscribers.length === 0) return;

    // Get host notification preferences
    const hostId = afterData.hostId || afterData.createdBy;
    if (!hostId) return;

    const hostDoc = await admin.firestore().doc(`users/${hostId}`).get();
    if (!hostDoc.exists) return;

    const hostData = hostDoc.data();
    const hostingPrefs =
      hostData?.userdata?.settings?.notifications?.hosting || {};

    // Check if host wants join notifications
    if (!hostingPrefs.enabled || !hostingPrefs.notifyOnJoin) {
      console.log('Host has join notifications disabled');
      return;
    }

    // Get host's Expo push token
    const hostToken = hostData?.deviceInfo?.fcmToken;
    if (!hostToken) {
      console.log('Host has no Expo push token');
      return;
    }

    // Get new subscriber names
    const subscriberNames = [];
    for (const subscriberId of newSubscribers) {
      const userDoc = await admin
        .firestore()
        .doc(`users/${subscriberId}`)
        .get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        const firstName =
          userData?.userdata?.contactInfo?.firstName || 'Someone';
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
      console.log(
        `Join notification sent to host ${hostId} for event ${eventId}`
      );
    } catch (error) {
      console.error('Error sending join notification:', error);
    }
  }
);

/**
 * Send push notification when someone leaves an event
 */
exports.onEventLeave = functions.firestore.onDocumentWritten(
  'studios/{studioId}/events/{eventId}',
  async (event) => {
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
    const leftSubscribers = beforeSubscribers.filter(
      (sub) => !afterSubscribers.includes(sub)
    );

    if (leftSubscribers.length === 0) return;

    // Get host notification preferences
    const hostId = afterData.hostId || afterData.createdBy;
    if (!hostId) return;

    const hostDoc = await admin.firestore().doc(`users/${hostId}`).get();
    if (!hostDoc.exists) return;

    const hostData = hostDoc.data();
    const hostingPrefs =
      hostData?.userdata?.settings?.notifications?.hosting || {};

    // Check if host wants leave notifications
    if (!hostingPrefs.enabled || !hostingPrefs.notifyOnLeave) {
      console.log('Host has leave notifications disabled');
      return;
    }

    // Get host's Expo push token
    const hostToken = hostData?.deviceInfo?.fcmToken;
    if (!hostToken) {
      console.log('Host has no Expo push token');
      return;
    }

    // Get names of people who left
    const leftNames = [];
    for (const leftUserId of leftSubscribers) {
      const userDoc = await admin.firestore().doc(`users/${leftUserId}`).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        const firstName =
          userData?.userdata?.contactInfo?.firstName || 'Someone';
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
      console.log(
        `Leave notification sent to host ${hostId} for event ${eventId}`
      );
    } catch (error) {
      console.error('Error sending leave notification:', error);
    }
  }
);

/**
 * Send notifications when event details change
 */
exports.onEventUpdate = functions.firestore.onDocumentUpdated(
  'studios/{studioId}/events/{eventId}',
  async (event) => {
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

      const userDoc = await admin
        .firestore()
        .doc(`users/${subscriberId}`)
        .get();
      if (!userDoc.exists) continue;

      const userData = userDoc.data();
      const attendingPrefs =
        userData?.userdata?.settings?.notifications?.attending || {};

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
      console.log(
        `Event update notifications sent: ${results.successCount}/${messages.length}`
      );
    } catch (error) {
      console.error('Error sending event update notifications:', error);
    }
  }
);

/**
 * Scheduled function to send event reminder notifications
 * Runs every 5 minutes to check for reminders that need to be sent
 */
exports.sendEventReminders = functions.scheduler.onSchedule(
  '*/5 * * * *',
  async (context) => {
    console.log('Checking for reminders that need to be sent...');

    const now = admin.firestore.Timestamp.now();

    try {
      // Query reminders that are due and not yet sent
      const remindersQuery = await admin
        .firestore()
        .collection('reminders')
        .where('reminderTime', '<=', now)
        .where('sent', '==', false)
        .limit(100) // Process in batches to avoid timeouts
        .get();

      console.log(`Found ${remindersQuery.docs.length} reminders to send`);

      if (remindersQuery.docs.length === 0) {
        return;
      }

      // Group reminders by user to batch fetch user data
      const userIds = [
        ...new Set(remindersQuery.docs.map((doc) => doc.data().userId)),
      ];
      const userDataMap = new Map();

      // Batch fetch user data (max 10 at a time for whereIn)
      for (let i = 0; i < userIds.length; i += 10) {
        const batchUserIds = userIds.slice(i, i + 10);
        const userQuery = await admin
          .firestore()
          .collection('users')
          .where(admin.firestore.FieldPath.documentId(), 'in', batchUserIds)
          .get();

        userQuery.docs.forEach((userDoc) => {
          userDataMap.set(userDoc.id, userDoc.data());
        });
      }

      // Process reminders
      const notifications = [];
      const remindersToMarkSent = [];

      for (const reminderDoc of remindersQuery.docs) {
        const reminderData = reminderDoc.data();
        const {
          userId,
          eventTitle,
          eventDateTime,
          isHost,
          reminderType,
          customAmount,
          customUnit,
        } = reminderData;

        const userData = userDataMap.get(userId);
        if (!userData) {
          // Mark as sent even if user not found to avoid retry
          remindersToMarkSent.push(reminderDoc.ref);
          continue;
        }

        const fcmToken = userData?.deviceInfo?.fcmToken;
        if (!fcmToken) {
          // Mark as sent if no token available
          remindersToMarkSent.push(reminderDoc.ref);
          continue;
        }

        // Create notification message
        let timeText = '';
        if (reminderType === 'custom') {
          const unitText =
            customAmount === 1 ? customUnit.slice(0, -1) : customUnit;
          timeText = `in ${customAmount} ${unitText}`;
        } else {
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
        }

        notifications.push({
          token: fcmToken,
          notification: {
            title: isHost
              ? `Your event starts ${timeText}!`
              : `Event starting ${timeText}!`,
            body: isHost
              ? `"${eventTitle}" starts ${timeText}`
              : `"${eventTitle}" is starting ${timeText}`,
          },
          data: {
            type: 'event_reminder',
            eventId: reminderData.eventId,
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
        });

        remindersToMarkSent.push(reminderDoc.ref);
      }

      // Send all notifications
      if (notifications.length > 0) {
        try {
          const results = await admin.messaging().sendAll(notifications);
          console.log(
            `Reminder notifications sent: ${results.successCount}/${notifications.length}`
          );
        } catch (error) {
          console.error('Error sending reminder notifications:', error);
        }
      }

      // Mark all reminders as sent
      const batch = admin.firestore().batch();
      remindersToMarkSent.forEach((reminderRef) => {
        batch.update(reminderRef, {
          sent: true,
          sentAt: admin.firestore.Timestamp.now(),
        });
      });

      if (remindersToMarkSent.length > 0) {
        await batch.commit();
        console.log(`Marked ${remindersToMarkSent.length} reminders as sent`);
      }
    } catch (error) {
      console.error('Error in sendEventReminders:', error);
    }
  }
);

/**
 * Scheduled function to cleanup old reminders
 * Runs daily to remove old sent reminders and orphaned reminders
 */
exports.cleanupReminders = functions.scheduler.onSchedule(
  '0 2 * * *',
  async (context) => {
    // Runs daily at 2 AM UTC
    console.log('Starting reminder cleanup...');

    const now = admin.firestore.Timestamp.now();
    const sevenDaysAgo = admin.firestore.Timestamp.fromMillis(
      now.toMillis() - 7 * 24 * 60 * 60 * 1000
    );
    const oneDayAgo = admin.firestore.Timestamp.fromMillis(
      now.toMillis() - 24 * 60 * 60 * 1000
    );

    try {
      let totalDeleted = 0;

      // 1. Delete old sent reminders (older than 7 days)
      console.log('Cleaning up old sent reminders...');
      const oldSentQuery = await admin
        .firestore()
        .collection('reminders')
        .where('sent', '==', true)
        .where('sentAt', '<', sevenDaysAgo)
        .limit(500)
        .get();

      if (oldSentQuery.docs.length > 0) {
        const batch1 = admin.firestore().batch();
        oldSentQuery.docs.forEach((doc) => {
          batch1.delete(doc.ref);
        });
        await batch1.commit();
        totalDeleted += oldSentQuery.docs.length;
        console.log(`Deleted ${oldSentQuery.docs.length} old sent reminders`);
      }

      // 2. Delete reminders for past events (events that happened more than 1 day ago)
      console.log('Cleaning up reminders for past events...');
      const pastEventRemindersQuery = await admin
        .firestore()
        .collection('reminders')
        .where('eventDateTime', '<', oneDayAgo)
        .limit(500)
        .get();

      if (pastEventRemindersQuery.docs.length > 0) {
        const batch2 = admin.firestore().batch();
        pastEventRemindersQuery.docs.forEach((doc) => {
          batch2.delete(doc.ref);
        });
        await batch2.commit();
        totalDeleted += pastEventRemindersQuery.docs.length;
        console.log(
          `Deleted ${pastEventRemindersQuery.docs.length} reminders for past events`
        );
      }

      // 3. Delete unsent reminders that are more than 1 hour past their reminder time
      console.log('Cleaning up missed reminders...');
      const oneHourAgo = admin.firestore.Timestamp.fromMillis(
        now.toMillis() - 60 * 60 * 1000
      );
      const missedRemindersQuery = await admin
        .firestore()
        .collection('reminders')
        .where('sent', '==', false)
        .where('reminderTime', '<', oneHourAgo)
        .limit(500)
        .get();

      if (missedRemindersQuery.docs.length > 0) {
        const batch3 = admin.firestore().batch();
        missedRemindersQuery.docs.forEach((doc) => {
          batch3.delete(doc.ref);
        });
        await batch3.commit();
        totalDeleted += missedRemindersQuery.docs.length;
        console.log(
          `Deleted ${missedRemindersQuery.docs.length} missed reminders`
        );
      }

      console.log(`Reminder cleanup completed. Total deleted: ${totalDeleted}`);
    } catch (error) {
      console.error('Error in cleanupReminders:', error);
    }
  }
);

/**
 * Send notification when someone sends a friend request
 */
exports.onFriendRequest = functions.firestore.onDocumentCreated(
  'users/{userId}/friendRequests/{requestId}',
  async (event) => {
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
      const appPrefs =
        recipientData?.userdata?.settings?.notifications?.app || {};

      // Check if recipient wants friend request notifications
      if (!appPrefs.friendAdded) {
        console.log('Recipient has friend request notifications disabled');
        return;
      }

      // Get recipient's Expo push token
      const recipientToken = recipientData?.deviceInfo?.fcmToken;
      if (!recipientToken) {
        console.log('Recipient has no Expo push token');
        return;
      }

      // Get sender info
      const senderDoc = await admin
        .firestore()
        .doc(`users/${requestData.senderId}`)
        .get();
      if (!senderDoc.exists) {
        console.log('Sender document not found');
        return;
      }

      const senderData = senderDoc.data();
      const senderName =
        senderData?.userdata?.contactInfo?.firstName ||
        senderData?.userdata?.contactInfo?.displayName ||
        'Someone';

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
      console.log(
        `Friend request notification sent to ${userId} from ${requestData.senderId}`
      );
    } catch (error) {
      console.error('Error processing friend request notification:', error);
    }
  }
);

/**
 * Send notification when someone accepts a friend request
 */
exports.onFriendAccepted = functions.firestore.onDocumentUpdated(
  'users/{userId}/friendRequests/{requestId}',
  async (change) => {
    const before = change.before.data();
    const after = change.after.data();
    const { userId } = change.params;

    // Only trigger on status change from pending to accepted
    if (before.status === 'pending' && after.status === 'accepted') {
      try {
        // Get sender's notification preferences (original requester)
        const senderDoc = await admin
          .firestore()
          .doc(`users/${after.senderId}`)
          .get();
        if (!senderDoc.exists) {
          console.log('Sender document not found');
          return;
        }

        const senderData = senderDoc.data();
        const appPrefs =
          senderData?.userdata?.settings?.notifications?.app || {};

        // Check if sender wants friend acceptance notifications
        if (!appPrefs.friendFollowed) {
          console.log('Sender has friend acceptance notifications disabled');
          return;
        }

        // Get sender's Expo push token
        const senderToken = senderData?.deviceInfo?.fcmToken;
        if (!senderToken) {
          console.log('Sender has no Expo push token');
          return;
        }

        // Get accepter info
        const accepterDoc = await admin
          .firestore()
          .doc(`users/${userId}`)
          .get();
        if (!accepterDoc.exists) {
          console.log('Accepter document not found');
          return;
        }

        const accepterData = accepterDoc.data();
        const accepterName =
          accepterData?.userdata?.contactInfo?.firstName ||
          accepterData?.userdata?.contactInfo?.displayName ||
          'Someone';

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
        console.log(
          `Friend acceptance notification sent to ${after.senderId} from ${userId}`
        );
      } catch (error) {
        console.error(
          'Error processing friend acceptance notification:',
          error
        );
      }
    }
  }
);

/**
 * Send notification when someone is invited as a cohost
 */
exports.onCohostInvitation = functions.firestore.onDocumentCreated(
  'users/{userId}/cohostInvitations/{invitationId}',
  async (event) => {
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
      const appPrefs =
        recipientData?.userdata?.settings?.notifications?.app || {};

      // Check if recipient wants cohost invitation notifications
      if (!appPrefs.pushNotifications) {
        console.log('Recipient has push notifications disabled');
        return;
      }

      // Get recipient's Expo push token
      const recipientToken = recipientData?.deviceInfo?.fcmToken;
      if (!recipientToken) {
        console.log('Recipient has no Expo push token');
        return;
      }

      // Get event info
      const eventDoc = await admin
        .firestore()
        .doc(`events/${invitationData.eventId}`)
        .get();
      if (!eventDoc.exists) {
        console.log('Event document not found');
        return;
      }

      const eventData = eventDoc.data();

      // Get inviter info
      const inviterDoc = await admin
        .firestore()
        .doc(`users/${invitationData.inviterId}`)
        .get();
      if (!inviterDoc.exists) {
        console.log('Inviter document not found');
        return;
      }

      const inviterData = inviterDoc.data();
      const inviterName =
        inviterData?.userdata?.contactInfo?.firstName ||
        inviterData?.userdata?.contactInfo?.displayName ||
        'Someone';

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
      console.log(
        `Cohost invitation notification sent to ${userId} for event ${invitationData.eventId}`
      );
    } catch (error) {
      console.error('Error processing cohost invitation notification:', error);
    }
  }
);

/**
 * Handle admin notification triggers
 * This sends push notifications for admin messages, warnings, strikes, etc.
 */
exports.onAdminNotificationTrigger = functions.firestore.onDocumentCreated(
  'notificationTriggers/{triggerId}',
  async (event) => {
    const triggerData = event.data.data();
    const { triggerId } = event.params;

    if (triggerData.type !== 'admin_notification' || triggerData.processed) {
      return;
    }

    try {
      // Mark as processed immediately to prevent duplicate processing
      await admin.firestore().doc(`notificationTriggers/${triggerId}`).update({
        processed: true,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const { userId, title, message, priority, subType, data } = triggerData;

      // Get user's Expo push token
      const userDoc = await admin.firestore().doc(`users/${userId}`).get();
      if (!userDoc.exists) {
        console.log('User document not found');
        return;
      }

      const userData = userDoc.data();
      const userToken = userData?.deviceInfo?.fcmToken;
      if (!userToken) {
        console.log('User has no push token');
        return;
      }

      // Determine notification sound and behavior based on type and priority
      const isHighPriority =
        priority === 'high' || ['warning', 'strike'].includes(subType);
      const sound = isHighPriority ? 'default' : false;

      const fcmMessage = {
        token: userToken,
        notification: {
          title: title,
          body: message,
        },
        data: {
          ...data,
          adminNotificationType: subType,
          priority: priority,
          type: 'admin_notification',
          screen: 'Notifications',
        },
        android: {
          priority: isHighPriority ? 'high' : 'normal',
          notification: {
            channelId: isHighPriority ? 'admin-urgent' : 'admin-general',
            sound: sound ? 'default' : undefined,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: sound ? 'default' : undefined,
            },
          },
        },
      };

      // Send via Firebase Admin SDK
      try {
        await admin.messaging().send(fcmMessage);
        console.log(`Admin notification sent to user ${userId}: ${subType}`);
      } catch (error) {
        console.error('Failed to send admin notification:', error);
      }

      // Clean up processed trigger after a delay
      setTimeout(async () => {
        try {
          await admin
            .firestore()
            .doc(`notificationTriggers/${triggerId}`)
            .delete();
        } catch (error) {
          console.error('Error cleaning up admin trigger document:', error);
        }
      }, 60000); // Delete after 1 minute
    } catch (error) {
      console.error('Error processing admin notification trigger:', error);
    }
  }
);

/**
 * Scheduled function to process pending scheduled notifications
 * Runs every 2 minutes to check for scheduled notifications that need to be sent
 * This replaces the client-side background processor to improve battery life
 */
exports.processScheduledNotifications = functions.scheduler.onSchedule(
  '*/2 * * * *',
  async (context) => {
    console.log('Processing pending scheduled notifications...');

    const now = admin.firestore.Timestamp.now();
    const cutoffTime = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 5 * 60 * 1000
    ); // 5 minutes buffer

    try {
      // Query for notifications that should be sent now
      const q = admin
        .firestore()
        .collection('scheduledNotifications')
        .where('status', '==', 'pending')
        .where('scheduledFor', '<=', cutoffTime)
        .orderBy('scheduledFor')
        .limit(50); // Process in batches

      const snapshot = await q.get();

      if (snapshot.empty) {
        console.log('No pending scheduled notifications to process');
        return;
      }

      console.log(`Found ${snapshot.size} scheduled notifications to process`);

      const results = [];
      const batch = admin.firestore().batch();

      for (const notificationDoc of snapshot.docs) {
        const notification = notificationDoc.data();

        try {
          // Check if event still exists and hasn't been cancelled
          if (notification.eventId) {
            const isEventValid = await validateEventForNotification(
              notification.eventId
            );
            if (!isEventValid) {
              // Cancel notification - event no longer exists or was cancelled
              batch.update(notificationDoc.ref, {
                status: 'cancelled',
                cancelledAt: admin.firestore.Timestamp.now(),
                cancelReason: 'Event no longer valid',
              });
              results.push({
                id: notification.id,
                status: 'cancelled',
                reason: 'Event invalid',
              });
              continue;
            }
          }

          // Get user data and FCM token
          const userDoc = await admin
            .firestore()
            .doc(`users/${notification.userId}`)
            .get();
          if (!userDoc.exists) {
            batch.update(notificationDoc.ref, {
              status: 'failed',
              attempts: notification.attempts + 1,
              lastAttemptAt: admin.firestore.Timestamp.now(),
              failureReason: 'User not found',
            });
            results.push({
              id: notification.id,
              status: 'failed',
              reason: 'User not found',
            });
            continue;
          }

          const userData = userDoc.data();
          const fcmToken = userData?.deviceInfo?.fcmToken;
          if (!fcmToken) {
            batch.update(notificationDoc.ref, {
              status: 'failed',
              attempts: notification.attempts + 1,
              lastAttemptAt: admin.firestore.Timestamp.now(),
              failureReason: 'No FCM token',
            });
            results.push({
              id: notification.id,
              status: 'failed',
              reason: 'No FCM token',
            });
            continue;
          }

          // Send the notification via FCM
          const message = {
            token: fcmToken,
            notification: {
              title: notification.title,
              body: notification.message,
            },
            data: {
              ...notification.data,
              type: notification.type,
              notificationId: notification.id,
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

          // Update scheduled notification status
          batch.update(notificationDoc.ref, {
            status: 'sent',
            sentAt: admin.firestore.Timestamp.now(),
          });
          results.push({ id: notification.id, status: 'sent' });
        } catch (error) {
          console.error(
            `Error processing scheduled notification ${notification.id}:`,
            error
          );
          batch.update(notificationDoc.ref, {
            status: 'failed',
            attempts: notification.attempts + 1,
            lastAttemptAt: admin.firestore.Timestamp.now(),
            failureReason: error.message,
          });
          results.push({
            id: notification.id,
            status: 'failed',
            reason: error.message,
          });
        }
      }

      // Commit all updates
      await batch.commit();

      console.log(`Processed ${results.length} scheduled notifications`);
      return {
        success: true,
        processedCount: results.length,
        results,
      };
    } catch (error) {
      console.error('Error processing scheduled notifications:', error);
    }
  }
);

/**
 * Helper function to validate if an event is still valid for notifications
 */
async function validateEventForNotification(eventId) {
  try {
    // Check if event exists in the events collection
    const eventDoc = await admin.firestore().doc(`events/${eventId}`).get();

    if (!eventDoc.exists) {
      return false;
    }

    const eventData = eventDoc.data();

    // Check if event is cancelled
    if (eventData.cancelled) {
      return false;
    }

    // Check if event is in the past
    const eventTime = eventData.eventTimestamp.toDate
      ? eventData.eventTimestamp.toDate()
      : new Date(eventData.eventTimestamp);
    if (eventTime < new Date()) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating event:', error);
    return false; // Assume invalid on error
  }
}

/**
 * Handle client push notification triggers
 * This handles push notifications triggered from the client-side notification service
 */
exports.onClientPushNotificationTrigger = functions.firestore.onDocumentCreated(
  'notificationTriggers/{triggerId}',
  async (event) => {
    const triggerData = event.data.data();
    const { triggerId } = event.params;

    if (
      triggerData.type !== 'client_push_notification' ||
      triggerData.processed
    ) {
      return;
    }

    try {
      // Mark as processed immediately to prevent duplicate processing
      await admin.firestore().doc(`notificationTriggers/${triggerId}`).update({
        processed: true,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const { userId, fcmToken, title, message, data } = triggerData;

      if (!fcmToken) {
        console.log('No FCM token provided in trigger');
        return;
      }

      // Send notification via Firebase Admin SDK
      const fcmMessage = {
        token: fcmToken,
        notification: {
          title: title,
          body: message,
        },
        data: {
          ...data,
          type: 'client_notification',
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

      await admin.messaging().send(fcmMessage);
      console.log(`Client push notification sent to user ${userId}: ${title}`);

      // Clean up processed trigger after a delay
      setTimeout(async () => {
        try {
          await admin
            .firestore()
            .doc(`notificationTriggers/${triggerId}`)
            .delete();
        } catch (error) {
          console.error('Error cleaning up client trigger document:', error);
        }
      }, 60000); // Delete after 1 minute
    } catch (error) {
      console.error(
        'Error processing client push notification trigger:',
        error
      );
    }
  }
);

/**
 * Handle ban notification triggers
 * This sends push notifications when users are banned
 */
exports.onBanNotificationTrigger = functions.firestore.onDocumentCreated(
  'notificationTriggers/{triggerId}',
  async (event) => {
    const triggerData = event.data.data();
    const { triggerId } = event.params;

    if (triggerData.type !== 'ban_notification' || triggerData.processed) {
      return;
    }

    try {
      // Mark as processed immediately to prevent duplicate processing
      await admin.firestore().doc(`notificationTriggers/${triggerId}`).update({
        processed: true,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const { userId, title, message, banType, reason, data } = triggerData;

      // Get user's Expo push token
      const userDoc = await admin.firestore().doc(`users/${userId}`).get();
      if (!userDoc.exists) {
        console.log('User document not found');
        return;
      }

      const userData = userDoc.data();
      const userToken = userData?.deviceInfo?.fcmToken;
      if (!userToken) {
        console.log('User has no push token');
        return;
      }

      const fcmMessage = {
        token: userToken,
        notification: {
          title: title,
          body: message,
        },
        data: {
          ...data,
          banType: banType,
          reason: reason,
          type: 'ban_notification',
          screen: 'Home',
        },
        android: {
          priority: 'high', // Ban notifications are always high priority
          notification: {
            channelId: 'admin-urgent',
            sound: 'default',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
            },
          },
        },
      };

      // Send via Firebase Admin SDK
      try {
        await admin.messaging().send(fcmMessage);
        console.log(`Ban notification sent to user ${userId}: ${banType} ban`);
      } catch (error) {
        console.error('Failed to send ban notification:', error);
      }

      // Clean up processed trigger after a delay
      setTimeout(async () => {
        try {
          await admin
            .firestore()
            .doc(`notificationTriggers/${triggerId}`)
            .delete();
        } catch (error) {
          console.error('Error cleaning up ban trigger document:', error);
        }
      }, 60000); // Delete after 1 minute
    } catch (error) {
      console.error('Error processing ban notification trigger:', error);
    }
  }
);
