// Firebase Cloud Functions for Big Vibe Studios Notification System
/* eslint-env node */

const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

// Import modular notification functions
const commentNotifications = require('./notifications/commentNotifications');
const eventReminders = require('./notifications/eventReminders');
const socialNotifications = require('./notifications/socialNotifications');
const adminNotifications = require('./notifications/adminNotifications');
const adminPushNotifications = require('./notifications/adminPushNotifications');
const scheduledNotificationProcessor = require('./notifications/scheduledNotificationProcessor');

// Export all notification functions
module.exports = {
  onAdminNotificationTrigger: adminPushNotifications.onAdminNotificationTrigger,
  // Comment-related notifications
  onCommentNotificationTrigger:
    commentNotifications.onCommentNotificationTrigger,

  // Event reminder scheduling
  sendEventReminders: eventReminders.sendEventReminders,

  // Social interaction notifications
  onFollowNotificationTrigger: socialNotifications.onFollowNotificationTrigger,
  onFriendRequestTrigger: socialNotifications.onFriendRequestTrigger,
  onMutualFollowTrigger: socialNotifications.onMutualFollowTrigger,

  // Admin and system notifications
  onAdminAnnouncement: adminNotifications.onAdminAnnouncement,
  onMaintenanceNotification: adminNotifications.onMaintenanceNotification,
  onAppUpdateNotification: adminNotifications.onAppUpdateNotification,

  // Scheduled notification processing
  processScheduledNotifications: scheduledNotificationProcessor.processScheduledNotifications,
};
