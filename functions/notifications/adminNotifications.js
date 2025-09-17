// Firebase Cloud Function - Admin & System Notifications
// Handles admin announcements, maintenance notifications, and system-wide alerts

const functions = require('firebase-functions/v2');
const admin = require('firebase-admin');

/**
 * Send system-wide admin notifications
 * Triggered by creating documents in admin/announcements collection
 */
exports.onAdminAnnouncement = functions.firestore.onDocumentCreated(
  'admin/announcements/{announcementId}',
  async (event) => {
    const announcementData = event.data.data();
    const { announcementId } = event.params;

    try {
      console.log(`Processing admin announcement: ${announcementId}`);

      const {
        title,
        message,
        targetAudience = 'all', // 'all', 'hosts', 'active', 'beta'
        priority = 'normal',
        expiresAt,
      } = announcementData;

      // Get target users based on audience
      let targetUsers = [];

      switch (targetAudience) {
        case 'all':
          targetUsers = await getAllActiveUsers();
          break;
        case 'hosts':
          targetUsers = await getEventHosts();
          break;
        case 'active':
          targetUsers = await getActiveUsers();
          break;
        case 'beta':
          targetUsers = await getBetaUsers();
          break;
        default:
          console.log(`Unknown target audience: ${targetAudience}`);
          return;
      }

      if (targetUsers.length === 0) {
        console.log('No target users found for announcement');
        return;
      }

      // Send notifications in batches
      await sendBatchNotifications({
        targetUsers,
        title: title || 'Announcement',
        message: message || 'New announcement from Big Vibe Studios',
        type: 'admin_notification',
        priority,
        data: {
          announcementId,
          screen: 'Announcements',
        },
      });

      // Mark announcement as sent
      await admin
        .firestore()
        .doc(`admin/announcements/${announcementId}`)
        .update({
          sent: true,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          recipientCount: targetUsers.length,
        });

      console.log(`Admin announcement sent to ${targetUsers.length} users`);
    } catch (error) {
      console.error('Error processing admin announcement:', error);
    }
  }
);

/**
 * Send maintenance notifications
 * Triggered by creating documents in admin/maintenance collection
 */
exports.onMaintenanceNotification = functions.firestore.onDocumentCreated(
  'admin/maintenance/{maintenanceId}',
  async (event) => {
    const maintenanceData = event.data.data();
    const { maintenanceId } = event.params;

    try {
      console.log(`Processing maintenance notification: ${maintenanceId}`);

      const {
        title,
        message,
        scheduledFor,
        estimatedDuration,
        affectedFeatures = [],
      } = maintenanceData;

      // Get all active users
      const targetUsers = await getAllActiveUsers();

      if (targetUsers.length === 0) {
        console.log('No users found for maintenance notification');
        return;
      }

      // Format maintenance message
      const maintenanceTime = new Date(scheduledFor).toLocaleString();
      const formattedMessage =
        message ||
        `Scheduled maintenance on ${maintenanceTime}. Estimated duration: ${estimatedDuration || 'TBD'}`;

      // Send high priority maintenance notifications
      await sendBatchNotifications({
        targetUsers,
        title: title || 'Scheduled Maintenance',
        message: formattedMessage,
        type: 'maintenance',
        priority: 'high',
        data: {
          maintenanceId,
          scheduledFor,
          estimatedDuration,
          affectedFeatures: affectedFeatures.join(', '),
          screen: 'Maintenance',
        },
      });

      // Mark maintenance notification as sent
      await admin.firestore().doc(`admin/maintenance/${maintenanceId}`).update({
        sent: true,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        recipientCount: targetUsers.length,
      });

      console.log(
        `Maintenance notification sent to ${targetUsers.length} users`
      );
    } catch (error) {
      console.error('Error processing maintenance notification:', error);
    }
  }
);

/**
 * Send app update notifications
 * Triggered by creating documents in admin/updates collection
 */
exports.onAppUpdateNotification = functions.firestore.onDocumentCreated(
  'admin/updates/{updateId}',
  async (event) => {
    const updateData = event.data.data();
    const { updateId } = event.params;

    try {
      console.log(`Processing app update notification: ${updateId}`);

      const {
        version,
        title,
        message,
        features = [],
        required = false,
        minimumVersion,
      } = updateData;

      // Get users who need the update
      const targetUsers = required
        ? await getAllActiveUsers()
        : await getOptionalUpdateUsers();

      if (targetUsers.length === 0) {
        console.log('No users found for update notification');
        return;
      }

      // Format update message
      const updateTitle = title || `App Update Available (v${version})`;
      const updateMessage =
        message ||
        `New features: ${features.join(', ')}. ${required ? 'This update is required.' : 'Update when convenient.'}`;

      // Send update notifications
      await sendBatchNotifications({
        targetUsers,
        title: updateTitle,
        message: updateMessage,
        type: 'update_available',
        priority: required ? 'high' : 'normal',
        data: {
          updateId,
          version,
          required: required.toString(),
          minimumVersion,
          screen: 'AppUpdate',
        },
      });

      // Mark update notification as sent
      await admin.firestore().doc(`admin/updates/${updateId}`).update({
        sent: true,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        recipientCount: targetUsers.length,
      });

      console.log(
        `App update notification sent to ${targetUsers.length} users`
      );
    } catch (error) {
      console.error('Error processing app update notification:', error);
    }
  }
);

/**
 * Helper function to send notifications in batches
 */
async function sendBatchNotifications({
  targetUsers,
  title,
  message,
  type,
  priority,
  data,
}) {
  const messages = targetUsers.map(({ userId, fcmToken }) => ({
    token: fcmToken,
    notification: { title, message },
    data: {
      type,
      ...data,
    },
    android: {
      priority: priority === 'high' ? 'high' : 'normal',
      notification: {
        channelId: 'admin',
        priority: priority === 'high' ? 'high' : 'default',
      },
    },
  }));

  // Send in batches of 500 (FCM limit)
  const batchSize = 500;
  let totalSent = 0;

  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    try {
      const response = await admin.messaging().sendEach(batch);
      totalSent += response.successCount;
      console.log(
        `Batch ${i / batchSize + 1}: ${response.successCount}/${batch.length} successful`
      );
    } catch (error) {
      console.error(`Error sending batch ${i / batchSize + 1}:`, error);
    }
  }

  return totalSent;
}

/**
 * Get all active users with valid FCM tokens
 */
async function getAllActiveUsers() {
  const usersSnapshot = await admin
    .firestore()
    .collection('users')
    .where('deviceInfo.fcmToken', '!=', null)
    .where('deviceInfo.notificationsEnabled', '==', true)
    .get();

  return usersSnapshot.docs.map((doc) => ({
    userId: doc.id,
    fcmToken: doc.data().deviceInfo.fcmToken,
  }));
}

/**
 * Get event hosts
 */
async function getEventHosts() {
  // This would need to be implemented based on your data structure
  // For now, return all active users
  return getAllActiveUsers();
}

/**
 * Get recently active users (last 30 days)
 */
async function getActiveUsers() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const usersSnapshot = await admin
    .firestore()
    .collection('users')
    .where('deviceInfo.fcmToken', '!=', null)
    .where('deviceInfo.notificationsEnabled', '==', true)
    .where('lastSeen', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
    .get();

  return usersSnapshot.docs.map((doc) => ({
    userId: doc.id,
    fcmToken: doc.data().deviceInfo.fcmToken,
  }));
}

/**
 * Get beta test users
 */
async function getBetaUsers() {
  const usersSnapshot = await admin
    .firestore()
    .collection('users')
    .where('deviceInfo.fcmToken', '!=', null)
    .where('deviceInfo.notificationsEnabled', '==', true)
    .where('userdata.isBetaTester', '==', true)
    .get();

  return usersSnapshot.docs.map((doc) => ({
    userId: doc.id,
    fcmToken: doc.data().deviceInfo.fcmToken,
  }));
}

/**
 * Get users eligible for optional updates
 */
async function getOptionalUpdateUsers() {
  // For now, return active users
  // Could be filtered by app version, device type, etc.
  return getActiveUsers();
}
