// Firebase Cloud Functions for Big Vibe Studios Notification System
/* eslint-env node */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

// Import modular notification functions
const commentNotifications = require('./notifications/commentNotifications');
const socialNotifications = require('./notifications/socialNotifications');
const followNotifications = require('./notifications/followNotifications');
const eventSubscriptionNotifications = require('./notifications/eventSubscriptionNotifications');
const eventCommentNotifications = require('./notifications/eventCommentNotifications');
const eventChangeNotifications = require('./notifications/eventChangeNotifications');
const eventInvitationNotifications = require('./notifications/eventInvitationNotifications');
const cohostInvitationNotifications = require('./notifications/cohostInvitationNotifications');
const cohostJoinedNotifications = require('./notifications/cohostJoinedNotifications');
const adminNotifications = require('./notifications/adminNotifications');
const adminPushNotifications = require('./notifications/adminPushNotifications');
const scheduledNotificationProcessor = require('./notifications/scheduledNotificationProcessor');

// Import utility functions
const eventCleanup = require('./utils/eventCleanup');

// Export all notification functions
module.exports = {
  onAdminNotificationTrigger: adminPushNotifications.onAdminNotificationTrigger,
  // Comment-related notifications
  onCommentNotificationTrigger:
    commentNotifications.onCommentNotificationTrigger,


  // Direct follow notifications (new architecture)
  onUserFollowed: followNotifications.onUserFollowed,

  // Event subscription notifications (new architecture)
  onEventSubscribed: eventSubscriptionNotifications.onEventSubscribed,
  onEventUnsubscribed: eventSubscriptionNotifications.onEventUnsubscribed,

  // Event comment notifications (new architecture)
  onHostComment: eventCommentNotifications.onHostComment,
  onGuestComment: eventCommentNotifications.onGuestComment,

  // Event change notifications (new architecture)
  onEventUpdated: eventChangeNotifications.onEventUpdated,
  onEventDeleted: eventChangeNotifications.onEventDeleted,

  // Event invitation notifications (new architecture)
  onEventInvitation: eventInvitationNotifications.onEventInvitation,

  // Cohost invitation notifications (new architecture)
  onCohostInvitation: cohostInvitationNotifications.onCohostInvitation,

  // Cohost joined notifications (new architecture)
  onCohostJoined: cohostJoinedNotifications.onCohostJoined,

  // Mutual follow notifications (legacy)
  onMutualFollowTrigger: socialNotifications.onMutualFollowTrigger,

  // Admin and system notifications
  onAdminAnnouncement: adminNotifications.onAdminAnnouncement,
  onMaintenanceNotification: adminNotifications.onMaintenanceNotification,
  onAppUpdateNotification: adminNotifications.onAppUpdateNotification,

  // Scheduled notification processing
  processScheduledNotifications: scheduledNotificationProcessor.processScheduledNotifications,

  // Event cleanup utilities
  cleanupEventReminders: eventCleanup.cleanupEventReminders,
  bulkCleanupEventReminders: eventCleanup.bulkCleanupEventReminders,
  cleanupOldEventReminders: eventCleanup.cleanupOldEventReminders,
};
