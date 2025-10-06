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
const eventInterestNotifications = require('./notifications/eventInterestNotifications');
const cohostJoinedNotifications = require('./notifications/cohostJoinedNotifications');
const adminNotifications = require('./notifications/adminNotifications');
const adminPushNotifications = require('./notifications/adminPushNotifications');
const adminDirectNotifications = require('./notifications/adminDirectNotifications');
const banDetectionNotifications = require('./notifications/banDetectionNotifications');
const adminAnnouncementNotifications = require('./notifications/adminAnnouncementNotifications');
const scheduledNotificationProcessor = require('./notifications/scheduledNotificationProcessor');

// Import utility functions
const eventCleanup = require('./utils/eventCleanup');

// Export all notification functions
module.exports = {
  // DISABLED: onAdminNotificationTrigger - notificationTriggers collection eliminated
  // onAdminNotificationTrigger: adminPushNotifications.onAdminNotificationTrigger,
  // DISABLED: onCommentNotificationTrigger - notificationTriggers collection eliminated
  // onCommentNotificationTrigger: commentNotifications.onCommentNotificationTrigger,


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

  // Unified invitation notifications (guest + cohost) - event-triggered
  onEventInvitation: eventInvitationNotifications.onEventInvitation,

  // Event interest-based notifications (new architecture)
  onEventCreated: eventInterestNotifications.onEventCreated,

  // Cohost joined notifications (new architecture)
  onCohostJoined: cohostJoinedNotifications.onCohostJoined,

  // DISABLED: onMutualFollowTrigger - notificationTriggers collection eliminated
  // onMutualFollowTrigger: socialNotifications.onMutualFollowTrigger,

  // Admin and system notifications (legacy)
  onAdminAnnouncement: adminNotifications.onAdminAnnouncement,
  onMaintenanceNotification: adminNotifications.onMaintenanceNotification,
  onAppUpdateNotification: adminNotifications.onAppUpdateNotification,

  // Modern admin notification system (direct triggers)
  onAdminNotificationCreated: adminDirectNotifications.onAdminNotificationCreated,
  onModerationRecordUpdated: banDetectionNotifications.onModerationRecordUpdated,
  onAdminAnnouncementCreated: adminAnnouncementNotifications.onAdminAnnouncementCreated,

  // Scheduled notification processing
  processScheduledNotifications: scheduledNotificationProcessor.processScheduledNotifications,

  // Event cleanup utilities
  cleanupEventReminders: eventCleanup.cleanupEventReminders,
  bulkCleanupEventReminders: eventCleanup.bulkCleanupEventReminders,
  cleanupOldEventReminders: eventCleanup.cleanupOldEventReminders,
};
