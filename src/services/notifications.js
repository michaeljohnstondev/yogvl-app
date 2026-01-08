// FILE: services/notifications.js - Main Notification System Orchestrator
// This file now coordinates between specialized notification services
//
// ⚠️  WARNING: DO NOT USE expo-notifications IN THIS PROJECT
// ⚠️  Use Firebase Cloud Messaging (@react-native-firebase/messaging) ONLY
// ⚠️  All push notifications must go through FCM Cloud Functions
//

// Import all notification services
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITY,
  DELIVERY_CHANNELS,
  notificationEngine,
} from './shared/NotificationEngine';

import {
  notifyHostOfEventJoin,
  notifyHostOfEventLeave,
  notifySubscribersOfEventUpdate,
  notifySubscribersOfCancellation,
  sendEventReminder,
  getEventSubscribers,
} from './shared/eventNotificationsService';

import {
  notifyNewFollower,
  notifyFriendRequestAccepted,
  notifyFriendRequest,
  notifyFriendEventActivity,
  notifyMutualFollow,
  notifyMention,
} from './shared/socialNotificationsService';

import {
  notifyEventInvitation,
  notifyInvitationAccepted,
  notifyInvitationDeclined,
  notifyCohostInvitation,
  notifyCohostAccepted,
  sendBulkInvitationNotifications,
} from './shared/invitationNotificationsService';

/**
 * COMPATIBILITY LAYER: This maintains backward compatibility with existing code
 * that imports from notifications.js. All functions are re-exported from the
 * specialized services to avoid breaking changes.
 */

// Core notification dispatch functions - redirected to NotificationEngine
export const createNotification =
  notificationEngine.createNotification.bind(notificationEngine);
export const getUserNotifications =
  notificationEngine.getUserNotifications.bind(notificationEngine);
export const markNotificationAsRead =
  notificationEngine.markNotificationAsRead.bind(notificationEngine);
export const markAllNotificationsAsRead =
  notificationEngine.markAllNotificationsAsRead.bind(notificationEngine);
export const deleteNotification =
  notificationEngine.deleteNotification.bind(notificationEngine);
export const cleanupExpiredNotifications =
  notificationEngine.cleanupExpiredNotifications.bind(notificationEngine);

// Constants
export { NOTIFICATION_TYPES, NOTIFICATION_PRIORITY, DELIVERY_CHANNELS };

// Event notification functions
export {
  notifyHostOfEventJoin,
  notifyHostOfEventLeave,
  notifySubscribersOfEventUpdate,
  notifySubscribersOfCancellation,
  sendEventReminder,
  getEventSubscribers,
};

// Social notification functions
export {
  notifyNewFollower,
  notifyFriendRequestAccepted,
  notifyFriendRequest,
  notifyFriendEventActivity,
  notifyMutualFollow,
  notifyMention,
};

// Invitation notification functions
export {
  notifyEventInvitation,
  notifyInvitationAccepted,
  notifyInvitationDeclined,
  notifyCohostInvitation,
  notifyCohostAccepted,
  sendBulkInvitationNotifications,
};

/**
 * DEFAULT EXPORT: Combined notification service for backward compatibility
 * This allows existing code using `import notifications from './notifications'`
 * to continue working without changes.
 */
export default {
  // Core dispatch
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  cleanupExpiredNotifications,

  // Event notifications
  notifyHostOfEventJoin,
  notifyHostOfEventLeave,
  notifySubscribersOfEventUpdate,
  notifySubscribersOfCancellation,
  sendEventReminder,
  getEventSubscribers,

  // Social notifications
  notifyNewFollower,
  notifyFriendRequestAccepted,
  notifyFriendRequest,
  notifyMutualFollow,
  notifyMention,

  // Invitation notifications
  notifyEventInvitation,
  notifyInvitationAccepted,
  notifyInvitationDeclined,
  notifyCohostInvitation,
  notifyCohostAccepted,
  sendBulkInvitationNotifications,

  // Constants
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITY,
  DELIVERY_CHANNELS,
};
