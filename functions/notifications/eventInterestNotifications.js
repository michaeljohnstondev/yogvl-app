// FILE: functions/notifications/eventInterestNotifications.js
// Event interest-based notification handlers for new event creation

const admin = require('firebase-admin');
const functions = require('firebase-functions');

/**
 * Triggered when a new event is created
 * Sends notifications to users with matching interests
 * Trigger: studios/{studioId}/events/{eventId} (document created)
 */
exports.onEventCreated = functions.firestore
  .document('studios/{studioId}/events/{eventId}')
  .onCreate(async (snap, context) => {
    const { studioId, eventId } = context.params;
    const eventData = snap.data();

    console.log(`[Event Interest Notification] New event created: ${eventId} in studio ${studioId}`);

    try {
      // Validate event data
      if (!eventData || !eventData.title || !eventData.createdBy) {
        console.log(`[Event Interest Notification] Invalid event data for ${eventId}`);
        return;
      }

      const eventTitle = eventData.title;
      const hostId = eventData.createdBy;
      const cohosts = eventData.cohosts || [];
      const invitations = eventData.invitations || [];

      // Extract potential interests from event title using actual studio interests
      const eventInterests = await extractInterestsFromEventTitle(eventTitle, studioId);

      if (eventInterests.length === 0) {
        console.log(`[Event Interest Notification] No matching interests found in title: "${eventTitle}"`);
        return;
      }

      console.log(`[Event Interest Notification] Found interests: ${eventInterests.join(', ')} for event "${eventTitle}"`);

      // Get users with matching interests using the simplified array approach
      const interestedUserIds = [];
      for (const interest of eventInterests) {
        try {
          const normalizedInterest = interest.toLowerCase().trim();
          const interestDoc = await admin.firestore()
            .collection('studios')
            .doc(studioId)
            .collection('interests')
            .doc(normalizedInterest)
            .get();

          if (interestDoc.exists) {
            const userIds = interestDoc.data().userIds || [];
            interestedUserIds.push(...userIds);
          }
        } catch (error) {
          console.error(`[Event Interest Notification] Error querying interest "${interest}":`, error);
        }
      }

      // Remove duplicates and filter out excluded users
      const excludeUserIds = new Set([hostId, ...cohosts, ...invitations]);
      const uniqueInterestedUsers = [...new Set(interestedUserIds)]
        .filter(userId => !excludeUserIds.has(userId));

      if (uniqueInterestedUsers.length === 0) {
        console.log(`[Event Interest Notification] No eligible users to notify for event ${eventId}`);
        return;
      }

      console.log(`[Event Interest Notification] Found ${uniqueInterestedUsers.length} interested users for event ${eventId}`);

      // Send immediate FCM notifications
      let notificationsSent = 0;
      const batchSize = 10;

      for (let i = 0; i < uniqueInterestedUsers.length; i += batchSize) {
        const batch = uniqueInterestedUsers.slice(i, i + batchSize);
        const userPromises = batch.map(userId =>
          admin.firestore().doc(`users/${userId}`).get()
        );

        try {
          const userSnaps = await Promise.all(userPromises);

          for (let j = 0; j < userSnaps.length; j++) {
            const userSnap = userSnaps[j];
            const userId = batch[j];

            if (!userSnap.exists) {
              console.log(`[Event Interest Notification] User ${userId} not found`);
              continue;
            }

            const userData = userSnap.data();

            // Check if user has enabled suggested events notifications
            const notificationSettings = userData?.userdata?.settings?.notifications?.app;
            const suggestedEventsEnabled = notificationSettings?.suggestedEvents !== false; // Default to true

            if (!suggestedEventsEnabled) {
              console.log(`[Event Interest Notification] User ${userId} has disabled suggested events notifications`);
              continue;
            }

            // Send immediate FCM notification using device token (like other notifications)
            try {
              // Get user's FCM token (check both deviceInfo.fcmToken and legacy fcmToken)
              const fcmToken = userData?.deviceInfo?.fcmToken || userData?.fcmToken;
              if (!fcmToken) {
                console.log(`[Event Interest Notification] User ${userId} has no FCM token`);
                continue;
              }

              // Send FCM notification with event detail navigation
              const message = {
                token: fcmToken,
                notification: {
                  title: 'New Event Matches Your Interests!',
                  body: `"${eventTitle}" - Check it out!`,
                },
                data: {
                  type: 'interest_based_suggestion',
                  eventId: eventId,
                  studioId: studioId,
                  eventTitle: eventTitle,
                  matchedInterests: eventInterests.join(', '),
                  screen: 'EventDetail'
                }
              };

              await admin.messaging().send(message);
              notificationsSent++;

              console.log(`[Event Interest Notification] Sent FCM notification to user ${userId} about event "${eventTitle}"`);
            } catch (error) {
              console.error(`[Event Interest Notification] Failed to send FCM to user ${userId}:`, error);
            }
          }
        } catch (error) {
          console.error(`[Event Interest Notification] Error processing user batch:`, error);
        }
      }

      console.log(`[Event Interest Notification] Successfully sent ${notificationsSent} FCM notifications for event "${eventTitle}"`);

    } catch (error) {
      console.error(`[Event Interest Notification] Error processing event ${eventId}:`, error);
    }
  });

/**
 * Extract potential interests from event title using actual studio interests
 * @param {string} eventTitle - Event title to analyze
 * @param {string} studioId - Studio ID to get actual interests from
 * @returns {Promise<string[]>} Array of matching interests
 */
async function extractInterestsFromEventTitle(eventTitle, studioId) {
  if (!eventTitle || !studioId) return [];

  const title = eventTitle.toLowerCase().trim();

  try {
    // Get all actual interests that exist in this studio
    const interestsSnapshot = await admin.firestore()
      .collection('studios')
      .doc(studioId)
      .collection('interests')
      .get();

    if (interestsSnapshot.empty) {
      console.log(`[Event Interest Notification] No interests found in studio ${studioId}`);
      return [];
    }

    // Check which interests appear in the event title
    const matchingInterests = [];
    interestsSnapshot.forEach(doc => {
      const interest = doc.id; // The interest name is the document ID
      if (title.includes(interest.toLowerCase())) {
        matchingInterests.push(interest);
      }
    });

    return matchingInterests;
  } catch (error) {
    console.error(`[Event Interest Notification] Error getting studio interests:`, error);
    return [];
  }
}