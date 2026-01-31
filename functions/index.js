// Firebase Cloud Functions for Big Vibe Studios Notification System
/* eslint-env node */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

// Import modular notification functions
const socialNotifications = require('./notifications/socialNotifications');
const followNotifications = require('./notifications/followNotifications');
const friendEventActivityNotifications = require('./notifications/friendEventActivityNotifications');
const eventSubscriptionNotifications = require('./notifications/eventSubscriptionNotifications');
const eventCommentNotifications = require('./notifications/eventCommentNotifications');
const eventChangeNotifications = require('./notifications/eventChangeNotifications');
const eventInvitationNotifications = require('./notifications/eventInvitationNotifications');
const eventInterestNotifications = require('./notifications/eventInterestNotifications');
const cohostJoinedNotifications = require('./notifications/cohostJoinedNotifications');
const adminNotifications = require('./notifications/adminNotifications');
const adminDirectNotifications = require('./notifications/adminDirectNotifications');
const banDetectionNotifications = require('./notifications/banDetectionNotifications');
const adminAnnouncementNotifications = require('./notifications/adminAnnouncementNotifications');
const adminAlertNotifications = require('./notifications/adminAlertNotifications');
const scheduledNotificationProcessor = require('./notifications/scheduledNotificationProcessor');

// Import utility functions
const eventCleanup = require('./utils/eventCleanup');

// Export all notification functions
module.exports = {
  // Follow notifications
  onUserFollowed: followNotifications.onUserFollowed,

  // Friend event activity notifications
  onFriendEventActivity: friendEventActivityNotifications.onFriendEventActivity,

  // Event subscription notifications (join/leave)
  onEventSubscribed: eventSubscriptionNotifications.onEventSubscribed,
  onEventUnsubscribed: eventSubscriptionNotifications.onEventUnsubscribed,

  // Event comment notifications
  onHostComment: eventCommentNotifications.onHostComment,
  onGuestComment: eventCommentNotifications.onGuestComment,

  // Event change notifications (updates/deletions)
  onEventUpdated: eventChangeNotifications.onEventUpdated,
  onEventDeleted: eventChangeNotifications.onEventDeleted,
  onGuestNotificationSettingsUpdated: eventChangeNotifications.onGuestNotificationSettingsUpdated,

  // Event invitation notifications (guest + cohost)
  onEventInvitation: eventInvitationNotifications.onEventInvitation,

  // Event interest-based notifications (includes official event notifications)
  onEventCreated: eventInterestNotifications.onEventCreated,

  // Cohost joined notifications
  onCohostJoined: cohostJoinedNotifications.onCohostJoined,

  // Admin and system notifications
  onAdminAnnouncement: adminNotifications.onAdminAnnouncement,
  onMaintenanceNotification: adminNotifications.onMaintenanceNotification,
  onAppUpdateNotification: adminNotifications.onAppUpdateNotification,
  onAdminNotificationCreated: adminDirectNotifications.onAdminNotificationCreated,
  onModerationRecordUpdated: banDetectionNotifications.onModerationRecordUpdated,
  onAdminAnnouncementCreated: adminAnnouncementNotifications.onAdminAnnouncementCreated,

  // Admin alert notifications (notify admins of reports/requests)
  onStudioRequested: adminAlertNotifications.onStudioRequested,
  onUserReported: adminAlertNotifications.onUserReported,
  onEventReported: adminAlertNotifications.onEventReported,

  // Scheduled notification processing
  processScheduledNotifications: scheduledNotificationProcessor.processScheduledNotifications,

  // Event cleanup utilities
  cleanupEventReminders: eventCleanup.cleanupEventReminders,
  bulkCleanupEventReminders: eventCleanup.bulkCleanupEventReminders,
  cleanupOldEventReminders: eventCleanup.cleanupOldEventReminders,
};
