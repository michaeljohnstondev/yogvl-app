// FILE: eventNotificationsService.js - Event-Specific Notification System
// Updated to use unified NotificationEngine

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../auth/services/firebase';
import {
  notificationEngine,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITY,
} from './NotificationEngine';

/**
 * Notifies event host when someone joins their event
 * @param {Object} params - Notification parameters
 * @param {string} params.hostId - Event host user ID
 * @param {string} params.eventId - Event ID
 * @param {string} params.eventTitle - Event title
 * @param {string} params.subscriberId - User who subscribed
 * @param {string} params.subscriberName - Subscriber display name
 * @returns {Promise<Object>} Notification result
 */
export const notifyHostOfEventJoin = async ({
  hostId,
  eventId,
  eventTitle,
  subscriberId,
  subscriberName,
}) => {
  try {
    if (!hostId || !eventId || !subscriberId || !subscriberName) {
      throw new Error('Missing required parameters for host join notification');
    }

    console.log(
      `[EventNotifications] Sending join notification to host ${hostId}`
    );

    const notificationId = await notificationEngine.createNotification({
      userId: hostId,
      type: NOTIFICATION_TYPES.EVENT_JOIN,
      title: 'New Event Subscriber!',
      message: `${subscriberName} joined your event "${eventTitle}"`,
      data: {
        eventId,
        eventTitle,
        subscriberId,
        subscriberName,
        actionType: 'join',
      },
      priority: NOTIFICATION_PRIORITY.NORMAL,
    });

    return {
      success: true,
      notificationId,
      message: 'Host join notification sent successfully',
    };
  } catch (error) {
    console.error(
      '[EventNotifications] Error sending host join notification:',
      error
    );
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Notifies event host when someone leaves their event
 * @param {Object} params - Notification parameters
 * @param {string} params.hostId - Event host user ID
 * @param {string} params.eventId - Event ID
 * @param {string} params.eventTitle - Event title
 * @param {string} params.unsubscriberId - User who unsubscribed
 * @param {string} params.unsubscriberName - Unsubscriber display name
 * @returns {Promise<Object>} Notification result
 */
export const notifyHostOfEventLeave = async ({
  hostId,
  eventId,
  eventTitle,
  unsubscriberId,
  unsubscriberName,
}) => {
  try {
    if (!hostId || !eventId || !unsubscriberId || !unsubscriberName) {
      throw new Error(
        'Missing required parameters for host leave notification'
      );
    }

    console.log(
      `[EventNotifications] Sending leave notification to host ${hostId}`
    );

    const notificationId = await notificationEngine.createNotification({
      userId: hostId,
      type: NOTIFICATION_TYPES.EVENT_LEAVE,
      title: 'Event Subscriber Left',
      message: `${unsubscriberName} left your event "${eventTitle}"`,
      data: {
        eventId,
        eventTitle,
        unsubscriberId,
        unsubscriberName,
        actionType: 'leave',
      },
      priority: NOTIFICATION_PRIORITY.LOW,
    });

    return {
      success: true,
      notificationId,
      message: 'Host leave notification sent successfully',
    };
  } catch (error) {
    console.error(
      '[EventNotifications] Error sending host leave notification:',
      error
    );
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Notifies subscribers when event details are updated
 * @param {Object} params - Notification parameters
 * @param {string} params.eventId - Event ID
 * @param {string} params.eventTitle - Event title
 * @param {string[]} params.subscriberIds - Array of subscriber user IDs
 * @param {string} params.updateType - Type of update (time, location, details, etc.)
 * @param {string} params.hostName - Event host display name
 * @returns {Promise<Object>} Notification results
 */
export const notifySubscribersOfEventUpdate = async ({
  eventId,
  eventTitle,
  subscriberIds,
  updateType = 'details',
  hostName,
}) => {
  try {
    if (
      !eventId ||
      !eventTitle ||
      !subscriberIds ||
      !Array.isArray(subscriberIds)
    ) {
      throw new Error(
        'Missing required parameters for subscriber update notification'
      );
    }

    if (subscriberIds.length === 0) {
      console.log(
        '[EventNotifications] No subscribers to notify for event update'
      );
      return { success: true, notificationsSent: 0 };
    }

    console.log(
      `[EventNotifications] Sending update notifications to ${subscriberIds.length} subscribers`
    );

    // Determine notification message based on update type
    let message;
    switch (updateType) {
      case 'time':
        message = `The time for "${eventTitle}" has been updated`;
        break;
      case 'location':
        message = `The location for "${eventTitle}" has been updated`;
        break;
      case 'cancelled':
        message = `"${eventTitle}" has been cancelled`;
        break;
      default:
        message = `"${eventTitle}" has been updated`;
    }

    // Send notifications to all subscribers in parallel
    const notificationPromises = subscriberIds.map((subscriberId) =>
      notificationEngine
        .createNotification({
          userId: subscriberId,
          type: NOTIFICATION_TYPES.EVENT_UPDATE,
          title: 'Event Updated',
          message,
          data: {
            eventId,
            eventTitle,
            updateType,
            hostName,
            actionType: 'update',
          },
          priority:
            updateType === 'cancelled'
              ? NOTIFICATION_PRIORITY.HIGH
              : NOTIFICATION_PRIORITY.NORMAL,
        })
        .catch((error) => {
          console.error(
            `[EventNotifications] Failed to notify subscriber ${subscriberId}:`,
            error
          );
          return null;
        })
    );

    const results = await Promise.allSettled(notificationPromises);
    const successCount = results.filter(
      (result) => result.status === 'fulfilled' && result.value !== null
    ).length;

    return {
      success: true,
      notificationsSent: successCount,
      totalSubscribers: subscriberIds.length,
      message: `Event update notifications sent to ${successCount}/${subscriberIds.length} subscribers`,
    };
  } catch (error) {
    console.error(
      '[EventNotifications] Error sending subscriber update notifications:',
      error
    );
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Notifies subscribers when event is cancelled
 * @param {Object} params - Notification parameters
 * @param {string} params.eventId - Event ID
 * @param {string} params.eventTitle - Event title
 * @param {string[]} params.subscriberIds - Array of subscriber user IDs
 * @param {string} params.hostName - Event host display name
 * @param {string} params.reason - Cancellation reason (optional)
 * @returns {Promise<Object>} Notification results
 */
export const notifySubscribersOfCancellation = async ({
  eventId,
  eventTitle,
  subscriberIds,
  hostName,
  reason = null,
}) => {
  try {
    if (
      !eventId ||
      !eventTitle ||
      !subscriberIds ||
      !Array.isArray(subscriberIds)
    ) {
      throw new Error(
        'Missing required parameters for cancellation notification'
      );
    }

    if (subscriberIds.length === 0) {
      console.log(
        '[EventNotifications] No subscribers to notify for event cancellation'
      );
      return { success: true, notificationsSent: 0 };
    }

    console.log(
      `[EventNotifications] Sending cancellation notifications to ${subscriberIds.length} subscribers`
    );

    const message = reason
      ? `"${eventTitle}" has been cancelled. Reason: ${reason}`
      : `"${eventTitle}" has been cancelled by ${hostName}`;

    // Send high priority notifications to all subscribers
    const notificationPromises = subscriberIds.map((subscriberId) =>
      notificationEngine
        .createNotification({
          userId: subscriberId,
          type: NOTIFICATION_TYPES.EVENT_CANCELLED,
          title: 'Event Cancelled',
          message,
          data: {
            eventId,
            eventTitle,
            hostName,
            reason,
            actionType: 'cancelled',
          },
          priority: NOTIFICATION_PRIORITY.HIGH,
        })
        .catch((error) => {
          console.error(
            `[EventNotifications] Failed to notify subscriber ${subscriberId}:`,
            error
          );
          return null;
        })
    );

    const results = await Promise.allSettled(notificationPromises);
    const successCount = results.filter(
      (result) => result.status === 'fulfilled' && result.value !== null
    ).length;

    return {
      success: true,
      notificationsSent: successCount,
      totalSubscribers: subscriberIds.length,
      message: `Event cancellation notifications sent to ${successCount}/${subscriberIds.length} subscribers`,
    };
  } catch (error) {
    console.error(
      '[EventNotifications] Error sending cancellation notifications:',
      error
    );
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Sends event reminder notifications to subscribers
 * @param {Object} params - Notification parameters
 * @param {string} params.eventId - Event ID
 * @param {string} params.eventTitle - Event title
 * @param {string[]} params.subscriberIds - Array of subscriber user IDs
 * @param {Date} params.eventDateTime - Event start time
 * @param {string} params.reminderType - Type of reminder (24h, 1h, etc.)
 * @returns {Promise<Object>} Notification results
 */
export const sendEventReminder = async ({
  eventId,
  eventTitle,
  subscriberIds,
  eventDateTime,
  reminderType = '1h',
}) => {
  try {
    if (
      !eventId ||
      !eventTitle ||
      !subscriberIds ||
      !Array.isArray(subscriberIds) ||
      !eventDateTime
    ) {
      throw new Error('Missing required parameters for event reminder');
    }

    if (subscriberIds.length === 0) {
      console.log('[EventNotifications] No subscribers to send reminders to');
      return { success: true, remindersSent: 0 };
    }

    console.log(
      `[EventNotifications] Sending ${reminderType} reminders to ${subscriberIds.length} subscribers`
    );

    // Format reminder message based on type
    let message;
    switch (reminderType) {
      case '24h':
        message = `Reminder: "${eventTitle}" is tomorrow at ${eventDateTime.toLocaleTimeString()}`;
        break;
      case '1h':
        message = `Reminder: "${eventTitle}" starts in 1 hour`;
        break;
      case '15m':
        message = `Reminder: "${eventTitle}" starts in 15 minutes`;
        break;
      default:
        message = `Reminder: "${eventTitle}" is coming up`;
    }

    // Send reminder notifications
    const reminderPromises = subscriberIds.map((subscriberId) =>
      notificationEngine
        .createNotification({
          userId: subscriberId,
          type: NOTIFICATION_TYPES.EVENT_REMINDER,
          title: 'Event Reminder',
          message,
          data: {
            eventId,
            eventTitle,
            eventDateTime: eventDateTime.toISOString(),
            reminderType,
            actionType: 'reminder',
          },
          priority:
            reminderType === '15m'
              ? NOTIFICATION_PRIORITY.HIGH
              : NOTIFICATION_PRIORITY.NORMAL,
        })
        .catch((error) => {
          console.error(
            `[EventNotifications] Failed to send reminder to subscriber ${subscriberId}:`,
            error
          );
          return null;
        })
    );

    const results = await Promise.allSettled(reminderPromises);
    const successCount = results.filter(
      (result) => result.status === 'fulfilled' && result.value !== null
    ).length;

    return {
      success: true,
      remindersSent: successCount,
      totalSubscribers: subscriberIds.length,
      reminderType,
      message: `Event reminders sent to ${successCount}/${subscriberIds.length} subscribers`,
    };
  } catch (error) {
    console.error('[EventNotifications] Error sending event reminders:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Gets event subscribers for notification purposes
 * @param {string} eventId - Event ID
 * @param {string} studioId - Studio ID
 * @returns {Promise<string[]>} Array of subscriber user IDs
 */
export const getEventSubscribers = async (eventId, studioId) => {
  try {
    if (!eventId || !studioId) {
      throw new Error('Missing eventId or studioId');
    }

    const eventRef = doc(db, 'studios', studioId, 'events', eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      console.warn(`[EventNotifications] Event ${eventId} not found`);
      return [];
    }

    const eventData = eventDoc.data();
    const subscribers = eventData.subscribers || [];

    console.log(
      `[EventNotifications] Found ${subscribers.length} subscribers for event ${eventId}`
    );
    return subscribers;
  } catch (error) {
    console.error(
      '[EventNotifications] Error getting event subscribers:',
      error
    );
    return [];
  }
};

export default {
  notifyHostOfEventJoin,
  notifyHostOfEventLeave,
  notifySubscribersOfEventUpdate,
  notifySubscribersOfCancellation,
  sendEventReminder,
  getEventSubscribers,
};
