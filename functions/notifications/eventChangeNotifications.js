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
      // STEP 1: Handle notification settings changes (reschedule scheduledNotifications)
      await handleNotificationSettingsChanges(beforeData, afterData, eventId, studioId);

      // STEP 2: Handle event time changes (reschedule ALL scheduledNotifications)
      await handleEventTimeChange(beforeData, afterData, eventId, studioId);

      // STEP 3: Detect significant changes that warrant notifications
      const significantChanges = detectSignificantChanges(beforeData, afterData);

      if (significantChanges.length === 0) {
        console.log(`[Event Update] No significant changes detected for event ${eventId}`);
        return;
      }

      const eventTitle = afterData.title || 'Untitled Event';
      const eventCreatorId = afterData.createdBy;

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

      // Send notifications to each subscriber (excluding event creator)
      const notificationPromises = subscribersSnapshot.docs.map(async (subscriberDoc) => {
        const subscriberId = subscriberDoc.id;

        // Skip event creator - they made the changes
        if (subscriberId === eventCreatorId) {
          console.log(`[Event Update] Skipping notification for event creator ${subscriberId}`);
          return;
        }

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

          const fcmToken = subscriberData?.deviceInfo?.fcmToken;

          // If user has FCM token: send ONLY push notification (FCM handler creates in-app)
          // If NO token: create in-app notification directly (they won't get push)
          if (fcmToken) {
            // Send push notification - FCM handler will create in-app notification
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

            try {
              await admin.messaging().send(message);
              console.log(`[Event Update] ✅ Sent push notification to ${subscriberId} (FCM handler will create in-app)`);
            } catch (pushError) {
              console.error(`[Event Update] ❌ Failed to send push to ${subscriberId}:`, pushError);
              // Fallback: create in-app notification if push fails
              await admin.firestore()
                .collection('users')
                .doc(subscriberId)
                .collection('notifications')
                .add({
                  type: 'event_updated',
                  title: 'Event Updated',
                  message: `"${eventTitle}" has been updated: ${changesSummary}`,
                  read: false,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  data: {
                    resetStack: true,
                    navigationStack: 'Home,EventDetail',
                    eventId: eventId,
                    studioId: studioId,
                    eventTitle: eventTitle,
                    changes: significantChanges
                  }
                });
              console.log(`[Event Update] ✅ Created fallback in-app notification for ${subscriberId}`);
            }
          } else {
            // No FCM token - create in-app notification directly
            console.log(`[Event Update] ⚠️ Subscriber ${subscriberId} has no FCM token - creating in-app notification`);
            await admin.firestore()
              .collection('users')
              .doc(subscriberId)
              .collection('notifications')
              .add({
                type: 'event_updated',
                title: 'Event Updated',
                message: `"${eventTitle}" has been updated: ${changesSummary}`,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                data: {
                  resetStack: true,
                  navigationStack: 'Home,EventDetail',
                  eventId: eventId,
                  studioId: studioId,
                  eventTitle: eventTitle,
                  changes: significantChanges
                }
              });
            console.log(`[Event Update] ✅ Created in-app notification for ${subscriberId} (no token)`);
          }

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
      const eventCreatorId = eventData.createdBy;

      // CLEANUP FIRST: Delete all scheduled notifications for this deleted event
      // Do this BEFORE checking subscribers, so it runs even if there are no subscribers to notify
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
            const data = doc.data();
            batch.delete(doc.ref);
            // Enhanced logging for each deletion
            console.log(
              `[Event Deletion] 🗑️  DELETED scheduledNotification:`,
              `\n  ID: ${doc.id}`,
              `\n  Type: ${data.type}`,
              `\n  UserId: ${data.userId}`,
              `\n  EventId: ${data.eventId || 'N/A'}`,
              `\n  ScheduledFor: ${data.scheduledFor?.toDate()?.toISOString() || 'N/A'}`,
              `\n  Reason: Event deleted`
            );
          });

          await batch.commit();
          console.log(`[Event Deletion] Total deleted: ${scheduledNotificationsSnapshot.size} scheduled notifications for event ${eventId}`);
        }
      } catch (cleanupError) {
        console.error(`[Event Deletion] Error cleaning up scheduled notifications for event ${eventId}:`, cleanupError);
        // Don't throw - notification cleanup failure shouldn't break the function
      }

      // Get all event subscribers before deletion (from the deleted document data)
      // Note: We can't query the subcollection after deletion, so we use the subscribers array
      const subscriberIds = eventData.subscribers || [];

      // Filter out the event creator - they don't need a notification about their own deletion
      const subscribersToNotify = subscriberIds.filter(id => id !== eventCreatorId);

      if (subscribersToNotify.length === 0) {
        console.log(`[Event Deletion] No subscribers to notify for deleted event ${eventId} (creator excluded)`);
        return;
      }

      console.log(`[Event Deletion] Notifying ${subscribersToNotify.length} subscribers (excluding creator ${eventCreatorId})`);

      // Send notifications to each subscriber (ONLY push notifications - FCM handler creates in-app)
      const notificationPromises = subscribersToNotify.map(async (subscriberId) => {
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

          const fcmToken = subscriberData?.deviceInfo?.fcmToken;

          // If user has FCM token: send ONLY push notification (FCM handler creates in-app)
          // If NO token: create in-app notification directly (they won't get push)
          if (fcmToken) {
            // Send push notification - FCM handler will create in-app notification
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

            try {
              await admin.messaging().send(message);
              console.log(`[Event Deletion] ✅ Sent push notification to ${subscriberId} (FCM handler will create in-app)`);
            } catch (pushError) {
              console.error(`[Event Deletion] ❌ Failed to send push to ${subscriberId}:`, pushError);
              // Fallback: create in-app notification if push fails
              await admin.firestore()
                .collection('users')
                .doc(subscriberId)
                .collection('notifications')
                .add({
                  type: 'event_deleted',
                  title: '🚫 Event Cancelled',
                  message: `"${eventTitle}" has been cancelled`,
                  read: false,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  data: {
                    resetStack: true,
                    navigationStack: 'Home',
                    eventId: eventId,
                    studioId: studioId,
                    eventTitle: eventTitle
                  }
                });
              console.log(`[Event Deletion] ✅ Created fallback in-app notification for ${subscriberId}`);
            }
          } else {
            // No FCM token - create in-app notification directly
            console.log(`[Event Deletion] ⚠️ Subscriber ${subscriberId} has no FCM token - creating in-app notification`);
            await admin.firestore()
              .collection('users')
              .doc(subscriberId)
              .collection('notifications')
              .add({
                type: 'event_deleted',
                title: '🚫 Event Cancelled',
                message: `"${eventTitle}" has been cancelled`,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                data: {
                  resetStack: true,
                  navigationStack: 'Home',
                  eventId: eventId,
                  studioId: studioId,
                  eventTitle: eventTitle
                }
              });
            console.log(`[Event Deletion] ✅ Created in-app notification for ${subscriberId} (no token)`);
          }

        } catch (error) {
          console.error(`[Event Deletion] Error sending notification to subscriber ${subscriberId}:`, error);
          // Don't throw - continue with other subscribers
        }
      });

      // Wait for all notifications to complete
      await Promise.all(notificationPromises);

    } catch (error) {
      console.error(`[Event Deletion] Error processing event deletion:`, error);
      // Don't throw - we don't want to retry failed notifications
    }
  });

/**
 * Handle notification settings changes by updating scheduledNotifications
 * @param {Object} beforeData - Event data before update
 * @param {Object} afterData - Event data after update
 * @param {string} eventId - Event ID
 * @param {string} studioId - Studio ID
 */
async function handleNotificationSettingsChanges(beforeData, afterData, eventId, studioId) {
  try {
    const beforeTemplates = beforeData?.notificationSettings?.reminderTemplates || {};
    const afterTemplates = afterData?.notificationSettings?.reminderTemplates || {};

    // Check if reminderTemplates changed
    if (JSON.stringify(beforeTemplates) === JSON.stringify(afterTemplates)) {
      console.log(`[Event Update] No notification settings changes detected for event ${eventId}`);
      return;
    }

    console.log(`[Event Update] Host notification settings changed for event ${eventId}`);

    // Get the event host (createdBy field)
    const hostId = afterData.createdBy;
    if (!hostId) {
      console.error(`[Event Update] Cannot update notifications - event has no host (createdBy)`);
      return;
    }

    console.log(`[Event Update] Updating scheduledNotifications for host ${hostId} only (not guests)`);

    // Identify added/enabled templates (went from false/missing to true)
    const addedTemplates = [];
    Object.keys(afterTemplates).forEach(templateId => {
      const wasDisabledOrMissing = !beforeTemplates[templateId];
      const isNowEnabled = afterTemplates[templateId] === true;
      if (isNowEnabled && wasDisabledOrMissing) {
        addedTemplates.push(templateId);
        console.log(`[Event Update] Template added/enabled: ${templateId} for event ${eventId}`);
      }
    });

    // Identify removed/disabled templates (went from true to false/missing)
    const removedTemplates = [];
    Object.keys(beforeTemplates).forEach(templateId => {
      const wasEnabled = beforeTemplates[templateId] === true;
      const isNowDisabledOrMissing = !afterTemplates[templateId];
      if (wasEnabled && isNowDisabledOrMissing) {
        removedTemplates.push(templateId);
        console.log(`[Event Update] Template removed/disabled: ${templateId} for event ${eventId}`);
      }
    });

    // Cancel scheduledNotifications for removed/disabled templates (host only)
    if (removedTemplates.length > 0) {
      for (const templateId of removedTemplates) {
        // Query for scheduledNotifications for THIS HOST only
        const notificationsQuery = admin.firestore()
          .collection('scheduledNotifications')
          .where('eventId', '==', eventId)
          .where('userId', '==', hostId)
          .where('reminderType', '==', templateId)
          .where('status', '==', 'pending');

        const snapshot = await notificationsQuery.get();

        if (!snapshot.empty) {
          const batch = admin.firestore().batch();
          snapshot.docs.forEach(doc => {
            batch.update(doc.ref, {
              status: 'cancelled',
              cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
              cancelReason: `Template ${templateId} disabled by host`
            });
            console.log(`[Event Update] ❌ Cancelled scheduledNotification ${doc.id} for host ${hostId}, template ${templateId}`);
          });
          await batch.commit();
          console.log(`[Event Update] Cancelled ${snapshot.size} host notifications for template ${templateId}`);
        }
      }
    }

    // Create scheduledNotifications for added/enabled templates
    if (addedTemplates.length > 0) {
      const eventTimestamp = afterData.eventTimestamp || afterData.eventDateTime;
      if (!eventTimestamp) {
        console.error(`[Event Update] Cannot schedule notifications - event has no timestamp`);
        return;
      }

      const eventTime = eventTimestamp.toDate();
      const eventTitle = afterData.title || afterData.what || 'Event';

      for (const templateId of addedTemplates) {
        // Parse template to get time offset
        const { amount, unit } = parseTemplateId(templateId);
        if (!amount || !unit) {
          console.error(`[Event Update] Invalid template format: ${templateId}`);
          continue;
        }

        // Calculate reminder time
        const reminderTime = calculateReminderTime(eventTime, amount, unit);
        if (reminderTime <= new Date()) {
          console.log(`[Event Update] Skipping ${templateId} - reminder time is in the past`);
          continue;
        }

        // Create scheduledNotification for HOST only
        const scheduleId = `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        await admin.firestore()
          .collection('scheduledNotifications')
          .doc(scheduleId)
          .set({
            id: scheduleId,
            userId: hostId,
            eventId: eventId,
            type: 'event_reminder',
            title: eventTitle,
            message: `Event starts in ${amount} ${unit}`,
            reminderType: templateId,
            data: {
              resetStack: true,
              navigationStack: 'Home,EventDetail',
              eventId: eventId,
              studioId: studioId,
              eventTitle: eventTitle,
            },
            scheduledFor: admin.firestore.Timestamp.fromDate(reminderTime),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: 'pending',
            attempts: 0,
            priority: 'normal',
            channels: ['push'],
          });

        console.log(`[Event Update] ✅ Created scheduledNotification for host ${hostId}, template ${templateId}, scheduled for ${reminderTime.toISOString()}`);
      }
    }

    console.log(`[Event Update] Notification settings update complete for event ${eventId}`);
  } catch (error) {
    console.error(`[Event Update] Error handling notification settings changes:`, error);
    // Don't throw - this shouldn't break the main event update flow
  }
}

/**
 * Handle event time changes by rescheduling ALL scheduledNotifications
 * @param {Object} beforeData - Event data before update
 * @param {Object} afterData - Event data after update
 * @param {string} eventId - Event ID
 * @param {string} studioId - Studio ID
 */
async function handleEventTimeChange(beforeData, afterData, eventId, studioId) {
  try {
    const beforeTime = beforeData.eventTimestamp || beforeData.eventDateTime;
    const afterTime = afterData.eventTimestamp || afterData.eventDateTime;

    // Check if event time changed
    if (!beforeTime || !afterTime || beforeTime.seconds === afterTime.seconds) {
      console.log(`[Event Update] No event time change detected for event ${eventId}`);
      return;
    }

    console.log(`[Event Update] Event time changed for event ${eventId}`);
    console.log(`[Event Update] Before: ${beforeTime.toDate().toISOString()}`);
    console.log(`[Event Update] After: ${afterTime.toDate().toISOString()}`);

    // Get ALL scheduledNotifications for this event (reminders + recap)
    const scheduledNotificationsQuery = admin.firestore()
      .collection('scheduledNotifications')
      .where('eventId', '==', eventId)
      .where('status', '==', 'pending');

    const snapshot = await scheduledNotificationsQuery.get();

    if (snapshot.empty) {
      console.log(`[Event Update] No pending scheduledNotifications found for event ${eventId}`);
      return;
    }

    console.log(`[Event Update] Found ${snapshot.size} scheduledNotifications to reschedule`);

    const newEventTime = afterTime.toDate();
    const eventTitle = afterData.title || afterData.what || 'Event';

    // Reschedule each notification
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const reminderType = data.reminderType;

      let newScheduledTime;

      // Handle event recap (1 hour AFTER event)
      if (data.type === 'event_recap' || reminderType === 'post_event_recap_1h') {
        newScheduledTime = new Date(newEventTime.getTime() + 60 * 60 * 1000); // +1 hour
        console.log(`[Event Update] Rescheduling event recap for ${data.userId} from ${data.scheduledFor?.toDate()?.toISOString()} to ${newScheduledTime.toISOString()}`);
      }
      // Handle event reminders (BEFORE event)
      else if (reminderType) {
        const { amount, unit } = parseTemplateId(reminderType);
        if (amount && unit) {
          newScheduledTime = calculateReminderTime(newEventTime, amount, unit);
          console.log(`[Event Update] Rescheduling ${reminderType} reminder for ${data.userId} from ${data.scheduledFor?.toDate()?.toISOString()} to ${newScheduledTime.toISOString()}`);
        } else {
          console.warn(`[Event Update] Invalid reminderType format: ${reminderType}, skipping`);
          continue;
        }
      } else {
        console.warn(`[Event Update] Unknown notification type, skipping: ${doc.id}`);
        continue;
      }

      // Skip if new time is in the past
      if (newScheduledTime <= new Date()) {
        console.log(`[Event Update] New scheduled time is in the past, cancelling instead: ${doc.id}`);
        await doc.ref.update({
          status: 'cancelled',
          cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
          cancelReason: 'Event time changed - new reminder time in past'
        });
        continue;
      }

      // Update the scheduledFor time
      await doc.ref.update({
        scheduledFor: admin.firestore.Timestamp.fromDate(newScheduledTime),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        title: eventTitle, // Update title in case it also changed
      });

      console.log(`[Event Update] ✅ Rescheduled scheduledNotification ${doc.id} for ${newScheduledTime.toISOString()}`);
    }

    console.log(`[Event Update] Successfully rescheduled ${snapshot.size} scheduledNotifications for event ${eventId}`);
  } catch (error) {
    console.error(`[Event Update] Error handling event time change:`, error);
    // Don't throw - this shouldn't break the main event update flow
  }
}

/**
 * Parse template ID to get amount and unit
 * @param {string} templateId - Template ID (e.g., "15m", "1h", "2d")
 * @returns {Object} { amount, unit }
 */
function parseTemplateId(templateId) {
  const match = templateId.match(/^(\d+)([mhdwx])$/);
  if (!match) return { amount: null, unit: null };

  const [, amount, unitChar] = match;
  const unitMap = {
    m: 'minutes',
    h: 'hours',
    d: 'days',
    w: 'weeks',
    x: 'months'
  };

  return {
    amount: parseInt(amount),
    unit: unitMap[unitChar] || null
  };
}

/**
 * Calculate reminder time based on event time and offset
 * @param {Date} eventTime - Event start time
 * @param {number} amount - Time amount
 * @param {string} unit - Time unit (minutes, hours, days, weeks, months)
 * @returns {Date} Reminder time
 */
function calculateReminderTime(eventTime, amount, unit) {
  const reminderTime = new Date(eventTime);

  switch (unit) {
    case 'minutes':
      reminderTime.setMinutes(reminderTime.getMinutes() - amount);
      break;
    case 'hours':
      reminderTime.setHours(reminderTime.getHours() - amount);
      break;
    case 'days':
      reminderTime.setDate(reminderTime.getDate() - amount);
      break;
    case 'weeks':
      reminderTime.setDate(reminderTime.getDate() - (amount * 7));
      break;
    case 'months':
      reminderTime.setMonth(reminderTime.getMonth() - amount);
      break;
  }

  return reminderTime;
}

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

/**
 * Triggered when guest notification settings are updated
 * Trigger: studios/{studioId}/events/{eventId}/guestNotificationSettings/{userId} (document updated)
 * Updates scheduledNotifications when guest changes their per-event notification settings
 */
exports.onGuestNotificationSettingsUpdated = functions.firestore
  .document('studios/{studioId}/events/{eventId}/guestNotificationSettings/{userId}')
  .onUpdate(async (change, context) => {
    const { studioId, eventId, userId } = context.params;
    const beforeData = change.before.data();
    const afterData = change.after.data();

    console.log(`[Guest Settings Update] Guest ${userId} updated notification settings for event ${eventId}`);

    try {
      // Compare reminderTemplates
      const beforeTemplates = beforeData?.notificationSettings?.reminderTemplates || {};
      const afterTemplates = afterData?.notificationSettings?.reminderTemplates || {};

      if (JSON.stringify(beforeTemplates) === JSON.stringify(afterTemplates)) {
        console.log(`[Guest Settings Update] No reminderTemplates changes for guest ${userId}, event ${eventId}`);
        return;
      }

      console.log(`[Guest Settings Update] Guest ${userId} changed reminderTemplates for event ${eventId}`);

      // Get event data for scheduling
      const eventDoc = await admin.firestore()
        .doc(`studios/${studioId}/events/${eventId}`)
        .get();

      if (!eventDoc.exists) {
        console.error(`[Guest Settings Update] Event ${eventId} not found`);
        return;
      }

      const eventData = eventDoc.data();
      const eventTimestamp = eventData.eventTimestamp || eventData.eventDateTime;

      if (!eventTimestamp) {
        console.error(`[Guest Settings Update] Event ${eventId} has no timestamp`);
        return;
      }

      const eventTime = eventTimestamp.toDate();
      const eventTitle = eventData.title || eventData.what || 'Event';

      // Identify added/enabled templates
      const addedTemplates = [];
      Object.keys(afterTemplates).forEach(templateId => {
        const wasDisabledOrMissing = !beforeTemplates[templateId];
        const isNowEnabled = afterTemplates[templateId] === true;
        if (isNowEnabled && wasDisabledOrMissing) {
          addedTemplates.push(templateId);
          console.log(`[Guest Settings Update] Template added/enabled: ${templateId} for guest ${userId}`);
        }
      });

      // Identify removed/disabled templates
      const removedTemplates = [];
      Object.keys(beforeTemplates).forEach(templateId => {
        const wasEnabled = beforeTemplates[templateId] === true;
        const isNowDisabledOrMissing = !afterTemplates[templateId];
        if (wasEnabled && isNowDisabledOrMissing) {
          removedTemplates.push(templateId);
          console.log(`[Guest Settings Update] Template removed/disabled: ${templateId} for guest ${userId}`);
        }
      });

      // Cancel scheduledNotifications for removed/disabled templates
      if (removedTemplates.length > 0) {
        for (const templateId of removedTemplates) {
          const notificationsQuery = admin.firestore()
            .collection('scheduledNotifications')
            .where('eventId', '==', eventId)
            .where('userId', '==', userId)
            .where('reminderType', '==', templateId)
            .where('status', '==', 'pending');

          const snapshot = await notificationsQuery.get();

          if (!snapshot.empty) {
            const batch = admin.firestore().batch();
            snapshot.docs.forEach(doc => {
              batch.update(doc.ref, {
                status: 'cancelled',
                cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
                cancelReason: `Template ${templateId} disabled by guest`
              });
              console.log(`[Guest Settings Update] ❌ Cancelled scheduledNotification ${doc.id} for guest ${userId}, template ${templateId}`);
            });
            await batch.commit();
            console.log(`[Guest Settings Update] Cancelled ${snapshot.size} notifications for guest ${userId}, template ${templateId}`);
          }
        }
      }

      // Create scheduledNotifications for added/enabled templates
      if (addedTemplates.length > 0) {
        for (const templateId of addedTemplates) {
          const { amount, unit } = parseTemplateId(templateId);
          if (!amount || !unit) {
            console.error(`[Guest Settings Update] Invalid template format: ${templateId}`);
            continue;
          }

          const reminderTime = calculateReminderTime(eventTime, amount, unit);
          if (reminderTime <= new Date()) {
            console.log(`[Guest Settings Update] Skipping ${templateId} - reminder time is in the past`);
            continue;
          }

          const scheduleId = `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          await admin.firestore()
            .collection('scheduledNotifications')
            .doc(scheduleId)
            .set({
              id: scheduleId,
              userId: userId,
              eventId: eventId,
              type: 'event_reminder',
              title: eventTitle,
              message: `Event starts in ${amount} ${unit}`,
              reminderType: templateId,
              data: {
                resetStack: true,
                navigationStack: 'Home,EventDetail',
                eventId: eventId,
                studioId: studioId,
                eventTitle: eventTitle,
              },
              scheduledFor: admin.firestore.Timestamp.fromDate(reminderTime),
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              status: 'pending',
              attempts: 0,
              priority: 'normal',
              channels: ['push'],
            });

          console.log(`[Guest Settings Update] ✅ Created scheduledNotification for guest ${userId}, template ${templateId}, scheduled for ${reminderTime.toISOString()}`);
        }
      }

      console.log(`[Guest Settings Update] Guest settings update complete for ${userId}, event ${eventId}`);
    } catch (error) {
      console.error(`[Guest Settings Update] Error handling guest settings changes:`, error);
      // Don't throw - this shouldn't break the main flow
    }
  });