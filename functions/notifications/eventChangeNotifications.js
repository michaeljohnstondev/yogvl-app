// FILE: functions/notifications/eventChangeNotifications.js
// Event change notification handlers using direct Firestore triggers

const admin = require('firebase-admin');
const functions = require('firebase-functions');

/**
 * Triggered when an event document is updated
 * Trigger: studios/{studioId}/events/{eventId} (document updated)
 * Sends notifications to subscribers about significant event changes
 */
exports.onEventUpdated = functions.firestore
  .document('studios/{studioId}/events/{eventId}')
  .onUpdate(async (change, context) => {
    const { studioId, eventId } = context.params;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    console.log(`[Event Update] Event ${eventId} updated in studio ${studioId}`);

    try {
      // Detect significant changes that warrant notifications
      const significantChanges = detectSignificantChanges(beforeData, afterData);

      if (significantChanges.length === 0) {
        console.log(`[Event Update] No significant changes detected for event ${eventId}`);
        return;
      }

      const eventTitle = afterData.title || 'Untitled Event';

      // Get all event subscribers
      const subscribersSnapshot = await admin.firestore()
        .collection(`studios/${studioId}/events/${eventId}/subscribers`)
        .get();

      if (subscribersSnapshot.empty) {
        console.log(`[Event Update] No subscribers found for event ${eventId}`);
        return;
      }

      // Create change summary for notification
      const changesSummary = createChangesSummary(significantChanges, beforeData, afterData);

      // Send notifications to each subscriber
      const notificationPromises = subscribersSnapshot.docs.map(async (subscriberDoc) => {
        const subscriberId = subscriberDoc.id;

        try {
          // Get subscriber details and notification settings
          const subscriberUserDoc = await admin.firestore().doc(`users/${subscriberId}`).get();

          if (!subscriberUserDoc.exists) {
            console.log(`[Event Update] Subscriber ${subscriberId} not found`);
            return;
          }

          const subscriberData = subscriberUserDoc.data();

          // Check if subscriber has enabled event change notifications
          const hostChangesEnabled = subscriberData?.userdata?.settings?.notifications?.attending?.hostChanges;

          if (!hostChangesEnabled) {
            console.log(`[Event Update] Subscriber ${subscriberId} has disabled host change notifications`);
            return;
          }

          // Get subscriber's FCM token
          const fcmToken = subscriberData?.deviceInfo?.fcmToken;

          if (!fcmToken) {
            console.log(`[Event Update] Subscriber ${subscriberId} has no FCM token`);
            return;
          }

          // Send FCM notification with navigation stack
          const message = {
            token: fcmToken,
            notification: {
              title: 'Event Updated',
              body: `"${eventTitle}" has been updated: ${changesSummary}`
            },
            data: {
              type: 'event_updated',
              resetStack: 'true',
              navigationStack: 'Home,EventDetail',
              eventId: eventId,
              studioId: studioId,
              eventTitle: eventTitle,
              changes: JSON.stringify(significantChanges)
            }
          };

          await admin.messaging().send(message);

          console.log(`[Event Update] Successfully sent notification to subscriber ${subscriberId} about event ${eventId} changes`);

        } catch (error) {
          console.error(`[Event Update] Error sending notification to subscriber ${subscriberId}:`, error);
          // Don't throw - continue with other subscribers
        }
      });

      // Wait for all notifications to complete
      await Promise.all(notificationPromises);

    } catch (error) {
      console.error(`[Event Update] Error processing event update:`, error);
      // Don't throw - we don't want to retry failed notifications
    }
  });

/**
 * Triggered when an event document is deleted
 * Trigger: studios/{studioId}/events/{eventId} (document deleted)
 * Sends notifications to subscribers about event cancellation/deletion
 */
exports.onEventDeleted = functions.firestore
  .document('studios/{studioId}/events/{eventId}')
  .onDelete(async (snap, context) => {
    const { studioId, eventId } = context.params;
    const eventData = snap.data();

    console.log(`[Event Deletion] Event ${eventId} deleted from studio ${studioId}`);

    try {
      const eventTitle = eventData.title || 'Untitled Event';

      // Get all event subscribers before deletion (from the deleted document data)
      // Note: We can't query the subcollection after deletion, so we use the subscribers array
      const subscriberIds = eventData.subscribers || [];

      if (subscriberIds.length === 0) {
        console.log(`[Event Deletion] No subscribers found for deleted event ${eventId}`);
        return;
      }

      // Send notifications to each subscriber
      const notificationPromises = subscriberIds.map(async (subscriberId) => {
        try {
          // Get subscriber details and notification settings
          const subscriberUserDoc = await admin.firestore().doc(`users/${subscriberId}`).get();

          if (!subscriberUserDoc.exists) {
            console.log(`[Event Deletion] Subscriber ${subscriberId} not found`);
            return;
          }

          const subscriberData = subscriberUserDoc.data();

          // Check if subscriber has enabled event change notifications
          const hostChangesEnabled = subscriberData?.userdata?.settings?.notifications?.attending?.hostChanges;

          if (!hostChangesEnabled) {
            console.log(`[Event Deletion] Subscriber ${subscriberId} has disabled host change notifications`);
            return;
          }

          // Get subscriber's FCM token
          const fcmToken = subscriberData?.deviceInfo?.fcmToken;

          if (!fcmToken) {
            console.log(`[Event Deletion] Subscriber ${subscriberId} has no FCM token`);
            return;
          }

          // Send FCM notification with navigation stack
          const message = {
            token: fcmToken,
            notification: {
              title: '🚫 Event Cancelled',
              body: `"${eventTitle}" has been cancelled`
            },
            data: {
              type: 'event_deleted',
              resetStack: 'true',
              navigationStack: 'Home',
              eventId: eventId,
              studioId: studioId,
              eventTitle: eventTitle
            }
          };

          await admin.messaging().send(message);

          console.log(`[Event Deletion] Successfully sent cancellation notification to subscriber ${subscriberId} for event ${eventId}`);

        } catch (error) {
          console.error(`[Event Deletion] Error sending notification to subscriber ${subscriberId}:`, error);
          // Don't throw - continue with other subscribers
        }
      });

      // Wait for all notifications to complete
      await Promise.all(notificationPromises);

      // CLEANUP: Delete all scheduled notifications for this deleted event
      // Query global scheduledNotifications collection for any notifications related to this event
      console.log(`[Event Deletion] Cleaning up scheduled notifications for event ${eventId}`);

      try {
        const scheduledNotificationsQuery = admin.firestore()
          .collection('scheduledNotifications')
          .where('eventId', '==', eventId);

        const scheduledNotificationsSnapshot = await scheduledNotificationsQuery.get();

        if (scheduledNotificationsSnapshot.empty) {
          console.log(`[Event Deletion] No scheduled notifications found for event ${eventId}`);
        } else {
          // Delete all scheduled notifications in batch
          const batch = admin.firestore().batch();
          scheduledNotificationsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
          });

          await batch.commit();
          console.log(`[Event Deletion] Deleted ${scheduledNotificationsSnapshot.size} scheduled notifications for event ${eventId}`);
        }
      } catch (cleanupError) {
        console.error(`[Event Deletion] Error cleaning up scheduled notifications for event ${eventId}:`, cleanupError);
        // Don't throw - notification cleanup failure shouldn't break the function
      }

    } catch (error) {
      console.error(`[Event Deletion] Error processing event deletion:`, error);
      // Don't throw - we don't want to retry failed notifications
    }
  });

/**
 * Detect significant changes that warrant notifications
 * @param {Object} beforeData - Event data before update
 * @param {Object} afterData - Event data after update
 * @returns {Array} Array of significant changes
 */
function detectSignificantChanges(beforeData, afterData) {
  const significantChanges = [];

  // Check for time/date changes
  if (beforeData.eventDateTime?.seconds !== afterData.eventDateTime?.seconds) {
    significantChanges.push({
      field: 'eventDateTime',
      type: 'time_change',
      before: beforeData.eventDateTime,
      after: afterData.eventDateTime
    });
  }

  // Check for location changes
  if (JSON.stringify(beforeData.location) !== JSON.stringify(afterData.location)) {
    significantChanges.push({
      field: 'location',
      type: 'location_change',
      before: beforeData.location,
      after: afterData.location
    });
  }

  // Check for title changes
  if (beforeData.what !== afterData.what) {
    significantChanges.push({
      field: 'what',
      type: 'title_change',
      before: beforeData.what,
      after: afterData.what
    });
  }

  // Check for description changes
  if (beforeData.description !== afterData.description) {
    significantChanges.push({
      field: 'description',
      type: 'description_change',
      before: beforeData.description,
      after: afterData.description
    });
  }

  // Check for privacy changes
  if (beforeData.privacy !== afterData.privacy) {
    significantChanges.push({
      field: 'privacy',
      type: 'privacy_change',
      before: beforeData.privacy,
      after: afterData.privacy
    });
  }

  return significantChanges;
}

/**
 * Create a human-readable summary of changes
 * @param {Array} changes - Array of detected changes
 * @param {Object} beforeData - Event data before update
 * @param {Object} afterData - Event data after update
 * @returns {string} Human-readable summary
 */
function createChangesSummary(changes, beforeData, afterData) {
  if (changes.length === 0) return 'No significant changes';

  if (changes.length === 1) {
    const change = changes[0];
    switch (change.type) {
      case 'time_change':
        return 'time changed';
      case 'location_change':
        return 'location changed';
      case 'title_change':
        return 'title changed';
      case 'description_change':
        return 'description updated';
      case 'privacy_change':
        return 'privacy settings changed';
      default:
        return 'event details changed';
    }
  }

  // Multiple changes
  const changeTypes = changes.map(c => {
    switch (c.type) {
      case 'time_change': return 'time';
      case 'location_change': return 'location';
      case 'title_change': return 'title';
      case 'description_change': return 'description';
      case 'privacy_change': return 'privacy';
      default: return 'details';
    }
  });

  return `${changeTypes.slice(0, -1).join(', ')} and ${changeTypes[changeTypes.length - 1]} changed`;
}