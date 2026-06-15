// FILE: functions/notifications/eventInterestNotifications.js
// Event interest-based notification handlers for new event creation
// Also handles follow activity notifications when events are created

const admin = require('firebase-admin');
const functions = require('firebase-functions');

/**
 * Helper function to get all followers of a user
 * Queries the followers subcollection for the given user
 * Returns users who are following this user (who would see their event activity)
 * @param {string} userId - User ID to get followers for
 * @returns {Promise<string[]>} Array of follower user IDs
 */
async function getFollowersOf(userId) {
  try {
    const followersSnapshot = await admin
      .firestore()
      .collection('users')
      .doc(userId)
      .collection('followers')
      .get();

    return followersSnapshot.docs.map((doc) => doc.id);
  } catch (error) {
    console.error(`[Follow Activity] Error getting followers of ${userId}:`, error);
    return [];
  }
}

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
      const isOfficialEvent = eventData.isOfficialEvent || false;
      const hostId = eventData.createdBy;
      const cohosts = eventData.cohosts || [];
      const invitations = eventData.invitations || [];

      // ========== OFFICIAL EVENT NOTIFICATIONS ==========
      // If this is an official event, send notifications to all studio members first
      if (isOfficialEvent) {
        console.log(`[Official Event Notification] Processing official event: "${eventTitle}"`);

        try {
          // Fetch studio nickname for notification
          let displayName = 'YoGVL';
          try {
            const studioDoc = await admin.firestore().collection('studios').doc(studioId).get();
            if (studioDoc.exists) {
              const studioData = studioDoc.data();
              if (studioData.nickname) {
                displayName = `Yo${studioData.nickname}`;
              } else if (studioData.city) {
                displayName = `Yo ${studioData.city}`;
              }
            }
          } catch (error) {
            console.warn(`[Official Event Notification] Failed to fetch studio nickname:`, error);
          }

          // Get all users in the studio
          const usersSnapshot = await admin.firestore()
            .collection('users')
            .where('userdata.studios.default.studioId', '==', studioId)
            .get();

          console.log(`[Official Event Notification] Found ${usersSnapshot.size} users in studio ${studioId}`);

          // For official events, notify ALL studio members (no filtering)
          const eligibleUsers = usersSnapshot.docs;

          if (eligibleUsers.length === 0) {
            console.log(`[Official Event Notification] No users to notify`);
          } else {
            // Send notifications in batches
            let notificationsSent = 0;
            const batchSize = 10;

            for (let i = 0; i < eligibleUsers.length; i += batchSize) {
              const batch = eligibleUsers.slice(i, i + batchSize);

              for (const userDoc of batch) {
                const userId = userDoc.id;
                const userData = userDoc.data();

                // Check notification settings
                const notificationSettings = userData?.userdata?.settings?.notifications?.app;

                // Check master push notifications toggle
                const pushNotificationsEnabled = notificationSettings?.pushNotifications !== false;
                if (!pushNotificationsEnabled) {
                  console.log(`[Official Event Notification] User ${userId} has disabled all push notifications`);
                  continue;
                }

                // Check if user has enabled official events notifications
                const officialEventsEnabled = notificationSettings?.officialEvents !== false;
                if (!officialEventsEnabled) {
                  console.log(`[Official Event Notification] User ${userId} has muted official events`);
                  continue;
                }

                const fcmToken = userData?.deviceInfo?.fcmToken || userData?.fcmToken;
                const notificationTitle = displayName;
                const notificationBody = `New event: ${eventTitle}`;

                // Send FCM push notification
                if (fcmToken) {
                  try {
                    await admin.messaging().send({
                      token: fcmToken,
                      notification: {
                        title: notificationTitle,
                        body: notificationBody,
                      },
                      data: {
                        type: 'official_event',
                        eventId,
                        studioId,
                        eventTitle,
                        displayName,
                        screen: 'EventDetail',
                      },
                    });
                    notificationsSent++;
                    console.log(`[Official Event Notification] ✅ Sent push notification to ${userId}`);
                  } catch (pushError) {
                    console.error(`[Official Event Notification] ❌ Failed to send push to ${userId}:`, pushError);
                    // Fallback: create in-app notification
                    await admin.firestore()
                      .collection('users')
                      .doc(userId)
                      .collection('notifications')
                      .add({
                        type: 'official_event',
                        title: notificationTitle,
                        message: notificationBody,
                        read: false,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        data: { eventId, studioId, eventTitle, displayName, screen: 'EventDetail' },
                      });
                    console.log(`[Official Event Notification] ✅ Created fallback in-app notification for ${userId}`);
                  }
                } else {
                  // No FCM token - create in-app notification directly
                  console.log(`[Official Event Notification] ⚠️ User ${userId} has no FCM token - creating in-app notification`);
                  await admin.firestore()
                    .collection('users')
                    .doc(userId)
                    .collection('notifications')
                    .add({
                      type: 'official_event',
                      title: notificationTitle,
                      message: notificationBody,
                      read: false,
                      createdAt: admin.firestore.FieldValue.serverTimestamp(),
                      data: { eventId, studioId, eventTitle, displayName, screen: 'EventDetail' },
                    });
                  console.log(`[Official Event Notification] ✅ Created in-app notification for ${userId}`);
                }
              }
            }

            console.log(`[Official Event Notification] Successfully sent ${notificationsSent} notifications for official event "${eventTitle}"`);
          }
        } catch (officialError) {
          console.error(`[Official Event Notification] Error processing official event ${eventId}:`, officialError);
        }
      }

      // ========== INTEREST-BASED NOTIFICATIONS ==========
      // Extract matching interests from event title and location (venue
      // name), then merge in the creator's explicit tags so broad-match
      // tags (e.g. "concert", "house music") fan out even when title +
      // location don't naturally contain those words. Legacy events
      // without a tags field still work — they just contribute nothing
      // here. Downstream `new Set(interestedUserIds)` already collapses
      // a user matching multiple tags to a single notification.
      const eventLocation = eventData.location || '';
      const explicitTags = Array.isArray(eventData.tags)
        ? eventData.tags
            .map((t) => (typeof t === 'string' ? t.toLowerCase().trim() : ''))
            .filter((t) => t.length > 0)
        : [];
      console.log(`[Event Interest Notification] 🔍 Extracting interests from title: "${eventTitle}", location: "${eventLocation}", tags: [${explicitTags.join(', ')}] in studio ${studioId}`);
      const extracted = await extractInterestsFromEvent(eventTitle, eventLocation, studioId);
      const eventInterests = Array.from(new Set([...extracted, ...explicitTags]));

      if (eventInterests.length === 0) {
        console.log(`[Event Interest Notification] ❌ No matching interests found in title: "${eventTitle}"`);
        // Don't return early - continue to follow activity notifications
      } else {
        console.log(`[Event Interest Notification] ✅ Found interests: ${eventInterests.join(', ')} for event "${eventTitle}"`);

      // Get users with matching interests using the simplified array approach
      const interestedUserIds = [];
      for (const interest of eventInterests) {
        try {
          const normalizedInterest = interest.toLowerCase().trim();
          console.log(`[Event Interest Notification] 🔍 Querying interest document: studios/${studioId}/interests/${normalizedInterest}`);
          const interestDoc = await admin.firestore()
            .collection('studios')
            .doc(studioId)
            .collection('interests')
            .doc(normalizedInterest)
            .get();

          if (interestDoc.exists) {
            const userIds = interestDoc.data().userIds || [];
            console.log(`[Event Interest Notification] ✅ Interest "${normalizedInterest}" has ${userIds.length} users:`, userIds);
            interestedUserIds.push(...userIds);
          } else {
            console.log(`[Event Interest Notification] ❌ Interest document "${normalizedInterest}" does NOT exist in studio ${studioId}`);
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

      // Remove duplicates and filter out excluded users. For public
      // events, also exclude the creator's followers — they get the
      // follow-activity notification below, and we want one notification
      // per user per event regardless of how many channels matched
      // (interest tag, venue interest, friend posting). Private events
      // skip this exclusion because follow-activity doesn't fire there.
      const excludeUserIds = new Set([hostId, ...cohosts, ...invitedUserIds]);
      if (!eventData.isPrivate) {
        try {
          const creatorFollowers = await getFollowersOf(eventData.createdBy);
          creatorFollowers.forEach((id) => excludeUserIds.add(id));
          console.log(`[Event Interest Notification] 🔁 Excluding ${creatorFollowers.length} followers (they'll get follow-activity instead)`);
        } catch (e) {
          console.error('[Event Interest Notification] Failed to fetch followers for dedup:', e);
        }
      }

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
        // Don't return early - continue to follow activity notifications below
      } else {
        console.log(`[Event Interest Notification] Found ${uniqueInterestedUsers.length} interested users for event ${eventId}`);

      // Send immediate FCM notifications (only if we have users)
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

            // Check notification settings
            const notificationSettings = userData?.userdata?.settings?.notifications?.app;

            // 1. Check master push notifications toggle
            const pushNotificationsEnabled = notificationSettings?.pushNotifications !== false; // Default to true
            if (!pushNotificationsEnabled) {
              console.log(`[Event Interest Notification] User ${userId} has disabled all push notifications`);
              continue;
            }

            // 2. Check suggested events toggle
            const suggestedEventsEnabled = notificationSettings?.suggestedEvents !== false; // Default to true
            if (!suggestedEventsEnabled) {
              console.log(`[Event Interest Notification] User ${userId} has disabled suggested events notifications`);
              continue;
            }

            // 3. For official events: check if user has official event notifications enabled
            let notificationTitle = 'New Event Matches Your Interests!';
            let notificationBody = `"${eventTitle}" - Check it out!`;

            if (isOfficialEvent) {
              const officialEventsEnabled = notificationSettings?.officialEvents !== false; // Default to true
              if (officialEventsEnabled) {
                console.log(`[Event Interest Notification] Skipping user ${userId} for official event - they'll get the official notification instead`);
                continue;
              } else {
                // User has official notifications OFF but matches interests - send with special message
                console.log(`[Event Interest Notification] Sending interest notification to ${userId} for official event (official notifications disabled)`);
                notificationTitle = 'Official Event Matches Your Interests!';
                notificationBody = `"${eventTitle}" - Check it out!`;
              }
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
                    title: notificationTitle,
                    body: notificationBody,
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
                    title: notificationTitle,
                    message: notificationBody,
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
                  title: notificationTitle,
                  message: notificationBody,
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
      } // End of uniqueInterestedUsers.length > 0 block
      }

      // ========== FOLLOW ACTIVITY NOTIFICATIONS ==========
      // Send notifications to followers of the event creator
      console.log(`[Follow Activity] Processing follow activity notifications for event ${eventId}`);

      try {
        // Only process public events for follow activity
        if (eventData.isPrivate) {
          console.log(`[Follow Activity] Skipping private event ${eventId}`);
        } else {
          const creatorId = eventData.createdBy;
          const creatorDoc = await admin.firestore().doc(`users/${creatorId}`).get();

          if (!creatorDoc.exists) {
            console.log(`[Follow Activity] Creator ${creatorId} not found`);
          } else {
            const creatorName = creatorDoc.data()?.userdata?.contactInfo?.displayName || 'Someone';
            const followerIds = await getFollowersOf(creatorId);

            if (followerIds.length === 0) {
              console.log(`[Follow Activity] Creator ${creatorName} has no followers`);
            } else {
              console.log(`[Follow Activity] Notifying ${followerIds.length} followers about new event`);

              // Create exclusion set: invitations, cohosts, subscribers, and host
              const eventInvitations = (invitations || []).map((inv) => inv.userId || inv);
              const allExcluded = new Set([
                hostId,
                ...cohosts,
                ...(eventData.subscribers || []),
                ...eventInvitations,
              ]);

              console.log(`[Follow Activity] Excluding ${allExcluded.size} users (invited/attending)`);

              // Notify each follower
              let followNotificationsSent = 0;
              for (const followerId of followerIds) {
                try {
                  // Skip if follower is invited or already attending
                  if (allExcluded.has(followerId)) {
                    console.log(`[Follow Activity] Skipping ${followerId} - already invited or attending`);
                    continue;
                  }

                  // Get follower's notification settings
                  const followerDoc = await admin.firestore().doc(`users/${followerId}`).get();

                  if (!followerDoc.exists) {
                    console.log(`[Follow Activity] Follower ${followerId} not found`);
                    continue;
                  }

                  const followerData = followerDoc.data();
                  const settings = followerData?.userdata?.settings?.notifications;

                  // Check global toggle
                  if (settings?.app?.friendEventActivity === false) {
                    console.log(`[Follow Activity] Follower ${followerId} has disabled notifications`);
                    continue;
                  }

                  // Check per-user muting
                  const mutedUsers = settings?.mutedFollowingEvents || settings?.mutedFriendsEvents || [];
                  if (mutedUsers.includes(creatorId)) {
                    console.log(`[Follow Activity] Follower ${followerId} has muted ${creatorName}`);
                    continue;
                  }

                  const fcmToken = followerData?.deviceInfo?.fcmToken;

                  // Create in-app notification
                  const notificationData = {
                    type: 'follow_event_activity',
                    title: 'New Event',
                    message: `${creatorName} created "${eventTitle}"`,
                    data: {
                      eventId: eventId,
                      studioId: studioId,
                      eventTitle: eventTitle,
                      userId: creatorId,
                      userName: creatorName,
                      activityType: 'created',
                    },
                    read: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  };

                  await admin.firestore().collection('users').doc(followerId).collection('notifications').add(notificationData);
                  console.log(`[Follow Activity] ✅ Created in-app notification for ${followerId}`);

                  // Send push notification
                  if (fcmToken) {
                    const message = {
                      token: fcmToken,
                      notification: {
                        title: 'New Event',
                        body: `${creatorName} created "${eventTitle}"`,
                      },
                      data: {
                        type: 'follow_event_activity',
                        resetStack: 'true',
                        navigationStack: 'Home,EventDetail',
                        eventId: eventId,
                        studioId: studioId,
                        eventTitle: eventTitle,
                        userId: creatorId,
                        userName: creatorName,
                        activityType: 'created',
                      },
                    };

                    try {
                      await admin.messaging().send(message);
                      followNotificationsSent++;
                      console.log(`[Follow Activity] ✅ Sent push notification to ${followerId}`);
                    } catch (pushError) {
                      console.error(`[Follow Activity] ⚠️ Failed to send push to ${followerId}:`, pushError.message);
                    }
                  }
                } catch (followerError) {
                  console.error(`[Follow Activity] Error processing follower ${followerId}:`, followerError);
                }
              }

              console.log(`[Follow Activity] ✅ Sent ${followNotificationsSent} follow activity notifications`);
            }
          }
        }
      } catch (followError) {
        console.error(`[Follow Activity] ❌ Error processing follow activity:`, followError);
      }

    } catch (error) {
      console.error(`[Event Interest Notification] Error processing event ${eventId}:`, error);
    }
  });

/**
 * Extract matching interests from event title AND location (venue name)
 * Checks both fields against actual studio interests, deduplicates results
 * so a user subscribed to both "karaoke" and "the lazy goat" only gets one notification
 * @param {string} eventTitle - Event title to analyze
 * @param {string} eventLocation - Event venue/location name (NOT address)
 * @param {string} studioId - Studio ID to get actual interests from
 * @returns {Promise<string[]>} Array of unique matching interests
 */
async function extractInterestsFromEvent(eventTitle, eventLocation, studioId) {
  if (!studioId || (!eventTitle && !eventLocation)) return [];

  const title = (eventTitle || '').toLowerCase().trim();
  const location = (eventLocation || '').toLowerCase().trim();

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

    // Check which interests appear in the event title OR location (deduplicated)
    const matchingInterests = new Set();
    const allInterests = [];
    interestsSnapshot.forEach(doc => {
      const interest = doc.id; // The interest name is the document ID
      const interestLower = interest.toLowerCase();
      allInterests.push(interest);

      if (title && title.includes(interestLower)) {
        matchingInterests.add(interest);
        console.log(`[Event Interest Notification] ✅ Interest "${interest}" MATCHES title "${eventTitle}"`);
      }
      if (location && location.includes(interestLower)) {
        matchingInterests.add(interest);
        console.log(`[Event Interest Notification] ✅ Interest "${interest}" MATCHES location "${eventLocation}"`);
      }
    });

    const results = [...matchingInterests];
    console.log(`[Event Interest Notification] 📊 Title: "${eventTitle}" | Location: "${eventLocation || 'none'}" | All studio interests: [${allInterests.join(', ')}] | Matched: [${results.join(', ')}]`);
    return results;
  } catch (error) {
    console.error(`[Event Interest Notification] Error getting studio interests:`, error);
    return [];
  }
}