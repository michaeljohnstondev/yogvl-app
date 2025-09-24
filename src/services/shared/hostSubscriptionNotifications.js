// FILE: hostSubscriptionNotifications.js - Host Notifications for Event Subscriptions
// Implements host notifications when users subscribe/unsubscribe to their events

import { doc, getDoc } from '../../lib/firebase';
import { db } from '../../auth/services/firebase';
import {
  notificationEngine,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITY,
} from './NotificationEngine';

/**
 * Notify event host when someone subscribes to their event
 * Called after successful subscription to event
 */
export const notifyHostOfNewSubscription = async ({
  hostId,
  eventId,
  eventTitle,
  subscriberId,
  subscriberName,
  studioId,
}) => {
  try {
    if (!hostId || !eventId || !subscriberId || !subscriberName || !studioId) {
      throw new Error(
        'Missing required parameters for host subscription notification'
      );
    }

    // Don't notify if host subscribes to their own event
    if (hostId === subscriberId) {
      console.log(
        '[HostNotifications] Skipping self-subscription notification'
      );
      return { success: true, skipped: true, reason: 'Self-subscription' };
    }

    console.log(
      `[HostNotifications] Notifying host ${hostId} of new subscription by ${subscriberName}`
    );

    const result = await notificationEngine.createNotification({
      userId: hostId,
      type: NOTIFICATION_TYPES.EVENT_JOIN,
      data: {
        eventId,
        studioId,
        eventTitle,
        subscriberId,
        subscriberName,
        actionType: 'subscribe',
      },
      priority: NOTIFICATION_PRIORITY.NORMAL,
    });

    return {
      success: true,
      notificationId: result.notificationId,
      message: 'Host subscription notification sent successfully',
    };
  } catch (error) {
    console.error(
      '[HostNotifications] Error sending subscription notification:',
      error
    );
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Notify event host when someone unsubscribes from their event
 * Called after successful unsubscription from event
 */
export const notifyHostOfUnsubscription = async ({
  hostId,
  eventId,
  eventTitle,
  unsubscriberId,
  unsubscriberName,
  studioId,
}) => {
  try {
    if (!hostId || !eventId || !unsubscriberId || !unsubscriberName || !studioId) {
      throw new Error(
        'Missing required parameters for host unsubscription notification'
      );
    }

    // Don't notify if host unsubscribes from their own event
    if (hostId === unsubscriberId) {
      console.log(
        '[HostNotifications] Skipping self-unsubscription notification'
      );
      return { success: true, skipped: true, reason: 'Self-unsubscription' };
    }

    console.log(
      `[HostNotifications] Notifying host ${hostId} of unsubscription by ${unsubscriberName}`
    );

    const result = await notificationEngine.createNotification({
      userId: hostId,
      type: NOTIFICATION_TYPES.EVENT_LEAVE,
      data: {
        eventId,
        studioId,
        eventTitle,
        unsubscriberId,
        unsubscriberName,
        actionType: 'unsubscribe',
      },
      priority: NOTIFICATION_PRIORITY.LOW, // Lower priority than subscriptions
    });

    return {
      success: true,
      notificationId: result.notificationId,
      message: 'Host unsubscription notification sent successfully',
    };
  } catch (error) {
    console.error(
      '[HostNotifications] Error sending unsubscription notification:',
      error
    );
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get event and host details for notification context
 * Helper function to gather required data for notifications
 */
export const getEventHostDetails = async (studioId, eventId) => {
  try {
    if (!studioId || !eventId) {
      throw new Error('Missing studioId or eventId');
    }

    const eventRef = doc(db, 'studios', studioId, 'events', eventId);
    const eventDoc = await getDoc(eventRef);

    if (!eventDoc.exists()) {
      throw new Error(`Event ${eventId} not found in studio ${studioId}`);
    }

    const eventData = eventDoc.data();
    const hostId = eventData.hostUserId;
    const eventTitle =
      eventData.eventName || eventData.title || 'Untitled Event';

    if (!hostId) {
      throw new Error('Event has no host user ID');
    }

    // Get host user details
    const hostRef = doc(db, 'users', hostId);
    const hostDoc = await getDoc(hostRef);

    if (!hostDoc.exists()) {
      console.warn(`Host user ${hostId} not found, using fallback`);
      return {
        hostId,
        eventTitle,
        hostName: 'Event Host',
      };
    }

    const hostData = hostDoc.data();
    const hostName =
      hostData.userdata?.contactInfo?.displayName ||
      hostData.userdata?.contactInfo?.firstName ||
      'Event Host';

    return {
      hostId,
      eventTitle,
      hostName,
      eventData,
    };
  } catch (error) {
    console.error(
      '[HostNotifications] Error getting event host details:',
      error
    );
    throw error;
  }
};

/**
 * Batch notify host of multiple subscription changes
 * Useful for bulk operations or event updates
 */
export const batchNotifyHostOfSubscriptionChanges = async ({
  hostId,
  eventId,
  eventTitle,
  subscriptions = [],
  unsubscriptions = [],
}) => {
  try {
    const notifications = [];

    // Add subscription notifications
    subscriptions.forEach(({ userId, userName }) => {
      notifications.push({
        userId: hostId,
        type: NOTIFICATION_TYPES.EVENT_JOIN,
        data: {
          eventId,
          eventTitle,
          subscriberId: userId,
          subscriberName: userName,
          actionType: 'subscribe',
        },
        priority: NOTIFICATION_PRIORITY.NORMAL,
      });
    });

    // Add unsubscription notifications
    unsubscriptions.forEach(({ userId, userName }) => {
      notifications.push({
        userId: hostId,
        type: NOTIFICATION_TYPES.EVENT_LEAVE,
        data: {
          eventId,
          eventTitle,
          unsubscriberId: userId,
          unsubscriberName: userName,
          actionType: 'unsubscribe',
        },
        priority: NOTIFICATION_PRIORITY.LOW,
      });
    });

    if (notifications.length === 0) {
      return { success: true, sent: 0, message: 'No notifications to send' };
    }

    const result =
      await notificationEngine.sendBatchNotifications(notifications);

    return {
      success: true,
      sent: result.sent,
      total: result.total,
      subscriptionNotifications: subscriptions.length,
      unsubscriptionNotifications: unsubscriptions.length,
    };
  } catch (error) {
    console.error(
      '[HostNotifications] Error sending batch notifications:',
      error
    );
    return {
      success: false,
      error: error.message,
    };
  }
};

export default {
  notifyHostOfNewSubscription,
  notifyHostOfUnsubscription,
  getEventHostDetails,
  batchNotifyHostOfSubscriptionChanges,
};
