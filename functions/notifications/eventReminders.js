// Firebase Cloud Function - Event Reminder Notifications
// Handles scheduled event reminders (24h, 1h, 15m before events)

const functions = require('firebase-functions/v2');
const admin = require('firebase-admin');

/**
 * Scheduled function to send event reminders
 * Runs every 15 minutes to check for upcoming events
 */
exports.sendEventReminders = functions.scheduler.onSchedule(
  'every 15 minutes',
  async (event) => {
    const now = new Date();
    const in15Minutes = new Date(now.getTime() + 15 * 60 * 1000);
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    try {
      console.log('Starting event reminder check...');

      // Get all studios to check events
      const studiosSnapshot = await admin.firestore().collection('studios').get();

      for (const studioDoc of studiosSnapshot.docs) {
        const studioId = studioDoc.id;

        // Get events happening in the next 24 hours
        const eventsSnapshot = await admin
          .firestore()
          .collection(`studios/${studioId}/events`)
          .where('eventDateTime', '>=', admin.firestore.Timestamp.fromDate(now))
          .where('eventDateTime', '<=', admin.firestore.Timestamp.fromDate(in24Hours))
          .get();

        for (const eventDoc of eventsSnapshot.docs) {
          const eventData = eventDoc.data();
          const eventId = eventDoc.id;
          const eventDateTime = eventData.eventDateTime.toDate();
          const subscribers = eventData.subscribers || [];

          if (subscribers.length === 0) {
            continue; // No subscribers to notify
          }

          // Determine reminder type based on time difference
          const timeDiff = eventDateTime.getTime() - now.getTime();
          let reminderType = null;

          if (timeDiff <= 16 * 60 * 1000 && timeDiff > 14 * 60 * 1000) {
            reminderType = '15m';
          } else if (timeDiff <= 61 * 60 * 1000 && timeDiff > 59 * 60 * 1000) {
            reminderType = '1h';
          } else if (timeDiff <= 24.25 * 60 * 60 * 1000 && timeDiff > 23.75 * 60 * 60 * 1000) {
            reminderType = '24h';
          }

          if (!reminderType) {
            continue; // Not a reminder time
          }

          // Check if reminder already sent
          const reminderKey = `${eventId}_${reminderType}`;
          const reminderDoc = await admin
            .firestore()
            .doc(`remindersSent/${reminderKey}`)
            .get();

          if (reminderDoc.exists) {
            continue; // Already sent this reminder
          }

          // Mark reminder as sent
          await admin.firestore().doc(`remindersSent/${reminderKey}`).set({
            eventId,
            reminderType,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            subscriberCount: subscribers.length,
          });

          // Send reminders to all subscribers
          await sendRemindersToSubscribers({
            eventId,
            eventTitle: eventData.eventName || 'Event',
            eventDateTime,
            subscribers,
            reminderType,
          });

          console.log(`Sent ${reminderType} reminders for event ${eventId} to ${subscribers.length} subscribers`);
        }
      }

      console.log('Event reminder check completed');
    } catch (error) {
      console.error('Error in event reminder function:', error);
    }
  }
);

/**
 * Send reminder notifications to event subscribers
 */
async function sendRemindersToSubscribers({
  eventId,
  eventTitle,
  eventDateTime,
  subscribers,
  reminderType,
}) {
  // Get FCM tokens for all subscribers
  const userTokenPromises = subscribers.map(async (subscriberId) => {
    try {
      const userDoc = await admin.firestore().doc(`users/${subscriberId}`).get();
      if (!userDoc.exists) return null;

      const userData = userDoc.data();
      const attendingPrefs = userData?.userdata?.settings?.notifications?.attending || {};

      // Check if user wants reminder notifications
      if (attendingPrefs.reminders === false) {
        return null;
      }

      const fcmToken = userData?.deviceInfo?.fcmToken;
      return fcmToken ? { subscriberId, fcmToken } : null;
    } catch (error) {
      console.error(`Error getting user ${subscriberId}:`, error);
      return null;
    }
  });

  const userTokens = (await Promise.all(userTokenPromises)).filter(Boolean);

  if (userTokens.length === 0) {
    console.log('No valid FCM tokens found for reminder');
    return;
  }

  // Prepare notification content
  let title, body;
  switch (reminderType) {
    case '24h':
      title = 'Event Tomorrow!';
      body = `"${eventTitle}" is tomorrow at ${eventDateTime.toLocaleTimeString()}`;
      break;
    case '1h':
      title = 'Event Starting Soon';
      body = `"${eventTitle}" starts in 1 hour`;
      break;
    case '15m':
      title = 'Event Starting Now!';
      body = `"${eventTitle}" starts in 15 minutes`;
      break;
    default:
      title = 'Event Reminder';
      body = `"${eventTitle}" is coming up`;
  }

  // Send notifications in batches
  const messages = userTokens.map(({ fcmToken }) => ({
    token: fcmToken,
    notification: { title, body },
    data: {
      type: 'event_reminder',
      eventId,
      reminderType,
      screen: 'EventDetail',
    },
    android: {
      priority: reminderType === '15m' ? 'high' : 'normal',
      notification: {
        channelId: 'event-reminders',
        priority: reminderType === '15m' ? 'high' : 'default',
      },
    },
  }));

  // Send in batches of 500 (FCM limit)
  const batchSize = 500;
  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    try {
      const response = await admin.messaging().sendEach(batch);
      console.log(`Sent reminder batch ${i / batchSize + 1}: ${response.successCount}/${batch.length} successful`);
    } catch (error) {
      console.error(`Error sending reminder batch ${i / batchSize + 1}:`, error);
    }
  }
}