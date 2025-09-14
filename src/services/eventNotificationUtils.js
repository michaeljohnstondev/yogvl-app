// services/eventNotificationUtils.js - Utilities for managing event notifications

import ScheduledNotificationService from './scheduledNotifications';
import { NOTIFICATION_TYPES } from './notifications';

/**
 * Add a user to existing scheduled notifications when they join an event
 */
export const addUserToEventNotifications = async (eventData, newUserId) => {
  try {
    console.log(
      `[EventNotificationUtils] Adding user ${newUserId} to scheduled notifications for event ${eventData.id}`
    );

    const { id: eventId, title, eventTimestamp } = eventData;
    const eventTime = eventTimestamp.toDate
      ? eventTimestamp.toDate()
      : new Date(eventTimestamp);

    // Skip if event is in the past
    if (eventTime <= new Date()) {
      console.log(
        `[EventNotificationUtils] Event ${eventId} is in the past, not scheduling notifications`
      );
      return { success: true, reason: 'Event in past' };
    }

    // Schedule the same reminder intervals as when event was created
    const intervals = [
      { minutes: 24 * 60, title: 'Event Tomorrow!' }, // 1 day
      { minutes: 4 * 60, title: 'Event in 4 Hours' }, // 4 hours
      { minutes: 60, title: 'Event Starting Soon!' }, // 1 hour
      { minutes: 30, title: 'Event Starting in 30 Minutes!' }, // 30 minutes
      { minutes: 10, title: 'Event Starting Now!' }, // 10 minutes
    ];

    const notifications = [];
    const now = new Date();

    for (const interval of intervals) {
      const reminderTime = new Date(
        eventTime.getTime() - interval.minutes * 60 * 1000
      );

      // Skip if reminder time has already passed
      if (reminderTime <= now) {
        console.log(
          `Skipping ${interval.minutes}min reminder - time has passed`
        );
        continue;
      }

      const scheduleId =
        await ScheduledNotificationService.scheduleNotification({
          userId: newUserId,
          eventId,
          type: NOTIFICATION_TYPES.EVENT_REMINDER,
          title: `${interval.title} 🎉`,
          message: `"${title}" ${getTimeMessage(interval.minutes)}`,
          data: {
            eventId,
            eventTitle: title,
            eventTime: eventTime.toISOString(),
            reminderType: interval.minutes >= 60 ? 'LONG' : 'SHORT',
            isHost: false,
            joinedLate: true, // Flag to indicate this user joined after event creation
          },
          scheduledFor: reminderTime,
        });

      notifications.push({
        scheduleId,
        reminderType: `${interval.minutes}min`,
        scheduledFor: reminderTime,
      });
    }

    console.log(
      `[EventNotificationUtils] ✅ Scheduled ${notifications.length} reminder notifications for new user`
    );

    return {
      success: true,
      scheduledCount: notifications.length,
      notifications,
    };
  } catch (error) {
    console.error(
      '[EventNotificationUtils] Error adding user to event notifications:',
      error
    );
    return { success: false, error: error.message };
  }
};

/**
 * Remove a user from existing scheduled notifications when they leave an event
 */
export const removeUserFromEventNotifications = async (eventId, userId) => {
  try {
    console.log(
      `[EventNotificationUtils] Removing user ${userId} from scheduled notifications for event ${eventId}`
    );

    // Import the service dynamically to avoid circular dependencies
    const { collection, query, where, getDocs, writeBatch } = await import(
      'firebase/firestore'
    );
    const { db } = await import('../auth/services/firebase');

    // Find all pending notifications for this user and event
    const q = query(
      collection(db, 'scheduledNotifications'),
      where('userId', '==', userId),
      where('eventId', '==', eventId),
      where('status', '==', 'pending')
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.log(
        `[EventNotificationUtils] No pending notifications found for user ${userId} and event ${eventId}`
      );
      return { success: true, cancelledCount: 0 };
    }

    // Cancel all pending notifications for this user/event
    const batch = writeBatch(db);

    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelReason: 'User left event',
      });
    });

    await batch.commit();

    console.log(
      `[EventNotificationUtils] ✅ Cancelled ${snapshot.size} scheduled notifications for user who left event`
    );

    return {
      success: true,
      cancelledCount: snapshot.size,
    };
  } catch (error) {
    console.error(
      '[EventNotificationUtils] Error removing user from event notifications:',
      error
    );
    return { success: false, error: error.message };
  }
};

/**
 * Update scheduled notifications when event details change
 */
export const updateEventNotifications = async (
  eventId,
  updatedEventData,
  changes = []
) => {
  try {
    console.log(
      `[EventNotificationUtils] Updating scheduled notifications for event ${eventId}`
    );

    // If event time changed significantly, cancel old notifications and create new ones
    if (changes.includes('datetime') || changes.includes('eventTimestamp')) {
      console.log(
        `[EventNotificationUtils] Event time changed, rescheduling all notifications`
      );

      // Cancel existing notifications
      await ScheduledNotificationService.cancelEventNotifications(
        eventId,
        'Event time changed'
      );

      // Reschedule with new time
      const result =
        await ScheduledNotificationService.scheduleEventReminders(
          updatedEventData
        );

      return {
        success: true,
        action: 'rescheduled',
        scheduledCount: result.scheduledCount,
      };
    }

    // If just title changed, update the message in pending notifications
    if (changes.includes('title')) {
      console.log(
        `[EventNotificationUtils] Event title changed, updating notification messages`
      );

      const { collection, query, where, getDocs, writeBatch } = await import(
        'firebase/firestore'
      );
      const { db } = await import('../auth/services/firebase');

      // Find all pending notifications for this event
      const q = query(
        collection(db, 'scheduledNotifications'),
        where('eventId', '==', eventId),
        where('status', '==', 'pending')
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const batch = writeBatch(db);

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const updatedMessage = data.message.replace(
            /[""].*[""]/,
            `"${updatedEventData.title}"`
          );

          batch.update(doc.ref, {
            message: updatedMessage,
            title: data.title, // Keep original timing title
            data: {
              ...data.data,
              eventTitle: updatedEventData.title,
            },
          });
        });

        await batch.commit();

        return {
          success: true,
          action: 'updated_messages',
          updatedCount: snapshot.size,
        };
      }
    }

    return {
      success: true,
      action: 'no_changes_needed',
    };
  } catch (error) {
    console.error(
      '[EventNotificationUtils] Error updating event notifications:',
      error
    );
    return { success: false, error: error.message };
  }
};

// Helper function to generate time message
function getTimeMessage(minutesBefore) {
  if (minutesBefore >= 24 * 60) {
    const days = Math.floor(minutesBefore / (24 * 60));
    return `starts in ${days} day${days > 1 ? 's' : ''}`;
  } else if (minutesBefore >= 60) {
    const hours = Math.floor(minutesBefore / 60);
    return `starts in ${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    return `starts in ${minutesBefore} minutes`;
  }
}

export default {
  addUserToEventNotifications,
  removeUserFromEventNotifications,
  updateEventNotifications,
};
