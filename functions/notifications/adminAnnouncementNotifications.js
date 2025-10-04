// FILE: functions/notifications/adminAnnouncementNotifications.js
// Admin announcement broadcast handler using direct triggers

const admin = require('firebase-admin');
const functions = require('firebase-functions');

/**
 * Triggered when a new admin announcement is created
 * Broadcasts announcements to all users or specific target audience
 * Trigger: adminAnnouncements/{announcementId} (document created)
 */
exports.onAdminAnnouncementCreated = functions.firestore
  .document('adminAnnouncements/{announcementId}')
  .onCreate(async (snap, context) => {
    const { announcementId } = context.params;
    const announcementData = snap.data();

    console.log(`[Admin Announcement] Processing announcement ${announcementId}: ${announcementData.title}`);

    try {
      // Validate announcement data
      if (!announcementData.title || !announcementData.message || !announcementData.createdBy) {
        console.error(`[Admin Announcement] Invalid announcement data for ${announcementId}`);
        await snap.ref.update({
          processed: true,
          processedAt: admin.firestore.Timestamp.now(),
          notificationsSent: 0,
          notificationsFailed: 0,
          error: 'Invalid announcement data - missing required fields'
        });
        return;
      }

      // Check if announcement should be processed now
      const scheduledFor = announcementData.scheduledFor || admin.firestore.Timestamp.now();
      const now = admin.firestore.Timestamp.now();

      if (scheduledFor.seconds > now.seconds) {
        console.log(`[Admin Announcement] Announcement ${announcementId} scheduled for future: ${scheduledFor.toDate()}`);
        // Future announcements will be processed by a scheduled function (not implemented in this example)
        return;
      }

      // Mark as being processed
      await snap.ref.update({
        processedAt: admin.firestore.Timestamp.now()
      });

      // Get target users based on audience type
      let targetUserIds = [];

      switch (announcementData.targetAudience) {
        case 'specific_users':
          targetUserIds = announcementData.targetUserIds || [];
          break;

        case 'active_users':
          targetUserIds = await getActiveUsers();
          break;

        case 'all_users':
        default:
          targetUserIds = await getAllUsers();
          break;
      }

      if (targetUserIds.length === 0) {
        console.log(`[Admin Announcement] No target users found for announcement ${announcementId}`);
        await snap.ref.update({
          processed: true,
          notificationsSent: 0,
          notificationsFailed: 0
        });
        return;
      }

      console.log(`[Admin Announcement] Broadcasting to ${targetUserIds.length} users`);

      // Process users in batches to avoid overwhelming the system
      const batchSize = 100;
      let totalSent = 0;
      let totalFailed = 0;

      for (let i = 0; i < targetUserIds.length; i += batchSize) {
        const batch = targetUserIds.slice(i, i + batchSize);
        const results = await processBatchAnnouncement(announcementId, announcementData, batch);

        totalSent += results.sent;
        totalFailed += results.failed;

        // Update progress
        await snap.ref.update({
          notificationsSent: totalSent,
          notificationsFailed: totalFailed
        });

        console.log(`[Admin Announcement] Processed batch ${Math.floor(i / batchSize) + 1}, sent: ${results.sent}, failed: ${results.failed}`);
      }

      // Mark as completely processed
      await snap.ref.update({
        processed: true,
        notificationsSent: totalSent,
        notificationsFailed: totalFailed
      });

      console.log(`[Admin Announcement] Completed announcement ${announcementId}: ${totalSent} sent, ${totalFailed} failed`);

    } catch (error) {
      console.error(`[Admin Announcement] Error processing announcement ${announcementId}:`, error);

      await snap.ref.update({
        processed: true,
        processedAt: admin.firestore.Timestamp.now(),
        error: error.message,
        notificationsSent: 0,
        notificationsFailed: 0
      });
    }
  });

/**
 * Process a batch of users for announcement broadcasting
 * @param {string} announcementId - Announcement ID
 * @param {object} announcementData - Announcement data
 * @param {string[]} userIds - Batch of user IDs
 * @returns {object} - Results with sent and failed counts
 */
async function processBatchAnnouncement(announcementId, announcementData, userIds) {
  let sent = 0;
  let failed = 0;

  // Get user documents in batch
  const userPromises = userIds.map(userId =>
    admin.firestore().doc(`users/${userId}`).get()
  );

  try {
    const userSnaps = await Promise.all(userPromises);

    // Process each user
    for (let i = 0; i < userSnaps.length; i++) {
      const userSnap = userSnaps[i];
      const userId = userIds[i];

      if (!userSnap.exists) {
        failed++;
        continue;
      }

      try {
        const userData = userSnap.data();

        // Check user notification preferences
        const notificationSettings = userData?.userdata?.settings?.notifications?.app;
        const systemAnnouncementsEnabled = notificationSettings?.systemAnnouncements !== false; // Default to true

        // Only send if user has announcements enabled (unless urgent)
        if (!systemAnnouncementsEnabled && announcementData.priority !== 'urgent') {
          console.log(`[Admin Announcement] User ${userId} has system announcements disabled`);
          continue; // Skip this user but don't count as failed
        }

        // Create individual notification for this user
        const notificationId = `announcement_${announcementId}_${userId}_${Date.now()}`;

        const notification = {
          targetUserId: userId,
          notificationId: notificationId,

          type: 'announcement',
          subType: announcementData.data?.type || 'system',
          priority: announcementData.priority || 'normal',

          title: announcementData.title,
          message: announcementData.message,
          additionalInfo: null,

          issuedBy: announcementData.createdBy,
          issuedByName: announcementData.createdByName,
          relatedReport: null,

          createdAt: admin.firestore.Timestamp.now(),
          scheduledFor: admin.firestore.Timestamp.now(),

          processed: false,
          attempts: 0,

          data: {
            announcementId: announcementId,
            announcementType: announcementData.data?.type || 'system',
            actionRequired: announcementData.data?.actionRequired || false,
            actionUrl: announcementData.data?.actionUrl || null,
            actionLabel: announcementData.data?.actionLabel || null,
            screen: 'Notifications',
            channels: ['push', 'in_app'],
            requiresAck: announcementData.data?.actionRequired || false
          }
        };

        // Create the notification document (this will trigger the direct notification handler)
        await admin.firestore().doc(`adminNotifications/${notificationId}`).set(notification);
        sent++;

      } catch (userError) {
        console.error(`[Admin Announcement] Failed to process user ${userId}:`, userError);
        failed++;
      }
    }
  } catch (batchError) {
    console.error(`[Admin Announcement] Failed to process user batch:`, batchError);
    failed += userIds.length;
  }

  return { sent, failed };
}

/**
 * Get all user IDs in the system
 * @returns {Promise<string[]>} Array of user IDs
 */
async function getAllUsers() {
  try {
    const usersSnapshot = await admin.firestore()
      .collection('users')
      .select() // Only get document IDs
      .get();

    return usersSnapshot.docs.map(doc => doc.id);
  } catch (error) {
    console.error('[Admin Announcement] Failed to get all users:', error);
    return [];
  }
}

/**
 * Get active user IDs (users who have been active in the last 30 days)
 * @returns {Promise<string[]>} Array of active user IDs
 */
async function getActiveUsers() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where('userdata.metadata.updatedAt', '>=', admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
      .select() // Only get document IDs
      .get();

    return usersSnapshot.docs.map(doc => doc.id);
  } catch (error) {
    console.error('[Admin Announcement] Failed to get active users:', error);
    // Fallback to all users if active user query fails
    return await getAllUsers();
  }
}