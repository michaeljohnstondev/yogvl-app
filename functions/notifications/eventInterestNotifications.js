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

      // Extract user IDs from unified invitation objects
      // invitations is now [{userId, type}, ...] not just [userId, ...]
      // Force redeploy - handle both object and legacy string formats
      const invitedUserIds = invitations.map(inv => inv.userId || inv);

      console.log(`[Event Interest Notification] 🔍 Exclusion analysis:`, {
        hostId,
        cohostsCount: cohosts.length,
        cohosts,
        invitationsRaw: invitations,
        invitedUserIds,
        totalExcluded: 1 + cohosts.length + invitedUserIds.length
      });

      // Remove duplicates and filter out excluded users
      const excludeUserIds = new Set([hostId, ...cohosts, ...invitedUserIds]);

      // Debug: Log the exclusion set
      console.log(`[Event Interest Notification] 🚫 Excluded user IDs:`, {
        excludeUserIds: Array.from(excludeUserIds),
        interestedUserIds: interestedUserIds
      });

      const uniqueInterestedUsers = [...new Set(interestedUserIds)]
        .filter(userId => {
          const isExcluded = excludeUserIds.has(userId);
          if (isExcluded) {
            console.log(`[Event Interest Notification] 🚫 Excluding user ${userId} (host/cohost/invited)`);
          }
          return !isExcluded;
        });

      console.log(`[Event Interest Notification] 📊 Filtering results:`, {
        totalInterestedUsers: interestedUserIds.length,
        uniqueInterestedUsers: [...new Set(interestedUserIds)].length,
        afterExclusion: uniqueInterestedUsers.length,
        excluded: [...new Set(interestedUserIds)].length - uniqueInterestedUsers.length
      });

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

            const fcmToken = userData?.deviceInfo?.fcmToken || userData?.fcmToken;

            // If user has FCM token: send ONLY push notification (FCM handler creates in-app)
            // If NO token: create in-app notification directly (they won't get push)
            if (fcmToken) {
              // Send push notification - FCM handler will create in-app notification
              try {
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
                console.log(`[Event Interest Notification] ✅ Sent push notification to ${userId} (FCM handler will create in-app)`);
              } catch (pushError) {
                console.error(`[Event Interest Notification] ❌ Failed to send push to ${userId}:`, pushError);
                // Fallback: create in-app notification if push fails
                await admin.firestore()
                  .collection('users')
                  .doc(userId)
                  .collection('notifications')
                  .add({
                    type: 'interest_based_suggestion',
                    title: 'New Event Matches Your Interests!',
                    message: `"${eventTitle}" - Check it out!`,
                    read: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    data: {
                      eventId: eventId,
                      studioId: studioId,
                      eventTitle: eventTitle,
                      matchedInterests: eventInterests.join(', '),
                      screen: 'EventDetail'
                    }
                  });
                console.log(`[Event Interest Notification] ✅ Created fallback in-app notification for ${userId}`);
              }
            } else {
              // No FCM token - create in-app notification directly
              console.log(`[Event Interest Notification] ⚠️ User ${userId} has no FCM token - creating in-app notification`);
              await admin.firestore()
                .collection('users')
                .doc(userId)
                .collection('notifications')
                .add({
                  type: 'interest_based_suggestion',
                  title: 'New Event Matches Your Interests!',
                  message: `"${eventTitle}" - Check it out!`,
                  read: false,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  data: {
                    eventId: eventId,
                    studioId: studioId,
                    eventTitle: eventTitle,
                    matchedInterests: eventInterests.join(', '),
                    screen: 'EventDetail'
                  }
                });
              console.log(`[Event Interest Notification] ✅ Created in-app notification for ${userId} (no token)`);
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