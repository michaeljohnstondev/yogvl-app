// FILE: functions/notifications/banDetectionNotifications.js
// Ban detection notification handler using direct moderation record triggers

const admin = require('firebase-admin');
const functions = require('firebase-functions');

/**
 * Triggered when a user document is updated
 * Detects new bans, warnings, and strikes in moderation field and creates admin notifications
 * Trigger: users/{userId} (document updated, monitors moderation field changes)
 */
exports.onModerationRecordUpdated = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const { userId } = context.params;
    const before = change.before.data();
    const after = change.after.data();

    // Only process if moderation data actually changed
    const beforeModeration = before?.moderation;
    const afterModeration = after?.moderation;

    if (!afterModeration || JSON.stringify(beforeModeration) === JSON.stringify(afterModeration)) {
      return; // No moderation changes to process
    }

    console.log(`[Ban Detection] Moderation record updated for user ${userId}`);

    try {
      // Check for new permanent ban
      const oldPermBan = beforeModeration?.bans?.permBan;
      const newPermBan = afterModeration?.bans?.permBan;

      if (!oldPermBan?.active && newPermBan?.active) {
        console.log(`[Ban Detection] New permanent ban detected for user ${userId}`);
        await createBanNotification(userId, {
          type: 'permanent',
          reason: newPermBan.reason,
          issuedAt: newPermBan.issuedAt,
          issuedBy: newPermBan.issuedBy,
          reportId: newPermBan.reportId
        });
      }

      // Check for new temporary bans
      const oldTempBans = beforeModeration?.bans?.tempBans || [];
      const newTempBans = afterModeration?.bans?.tempBans || [];

      // Find newly active temp bans
      for (const newBan of newTempBans) {
        if (newBan.active) {
          const wasActive = oldTempBans.some(oldBan =>
            oldBan.id === newBan.id && oldBan.active
          );

          if (!wasActive) {
            console.log(`[Ban Detection] New temporary ban detected for user ${userId}: ${newBan.id}`);
            const banDuration = Math.ceil((newBan.expiresAt.seconds - newBan.issuedAt.seconds) / 86400); // Convert to days

            await createBanNotification(userId, {
              type: 'temporary',
              reason: newBan.reason,
              issuedAt: newBan.issuedAt,
              expiresAt: newBan.expiresAt,
              issuedBy: newBan.issuedBy,
              reportId: newBan.reportId,
              duration: banDuration
            });
          }
        }
      }

      // Check for new strikes
      const oldStrikes = beforeModeration?.strikes || [];
      const newStrikes = afterModeration?.strikes || [];

      // Find newly active strikes
      for (const newStrike of newStrikes) {
        if (newStrike.active) {
          const wasActive = oldStrikes.some(oldStrike =>
            oldStrike.id === newStrike.id && oldStrike.active
          );

          if (!wasActive) {
            console.log(`[Ban Detection] New strike detected for user ${userId}: ${newStrike.id}`);
            const activeStrikeCount = newStrikes.filter(s => s.active).length;

            await createStrikeNotification(userId, {
              reason: newStrike.reason,
              issuedAt: newStrike.issuedAt,
              issuedBy: newStrike.issuedBy,
              reportId: newStrike.reportId,
              strikeCount: activeStrikeCount,
              strikeId: newStrike.id
            });
          }
        }
      }

      // Check for new warnings
      const oldWarnings = beforeModeration?.warnings || [];
      const newWarnings = afterModeration?.warnings || [];

      // Find new warnings (warnings don't have active status, just check if new ones were added)
      if (newWarnings.length > oldWarnings.length) {
        const newestWarning = newWarnings[newWarnings.length - 1];
        console.log(`[Ban Detection] New warning detected for user ${userId}`);

        await createWarningNotification(userId, {
          reason: newestWarning.reason,
          issuedAt: newestWarning.issuedAt,
          issuedBy: newestWarning.issuedBy,
          reportId: newestWarning.reportId,
          warningId: newestWarning.id
        });
      }

    } catch (error) {
      console.error(`[Ban Detection] Error processing moderation update for user ${userId}:`, error);
    }
  });

/**
 * Create a ban notification in the adminNotifications collection
 * @param {string} userId - Target user ID
 * @param {object} banData - Ban information
 */
async function createBanNotification(userId, banData) {
  try {
    const notificationId = `ban_${banData.type}_${userId}_${Date.now()}`;

    const title = banData.type === 'permanent'
      ? '🚫 Account Permanently Banned'
      : `⏳ Account Temporarily Banned (${banData.duration} days)`;

    const message = banData.reason || 'Your account has been restricted due to community violations.';

    // Get admin name if available
    let adminName = 'System Admin';
    if (banData.issuedBy) {
      try {
        const adminDoc = await admin.firestore().doc(`users/${banData.issuedBy}`).get();
        if (adminDoc.exists) {
          adminName = adminDoc.data()?.userdata?.contactInfo?.displayName || 'Admin';
        }
      } catch (error) {
        console.warn(`[Ban Detection] Could not fetch admin name: ${error.message}`);
      }
    }

    const notification = {
      targetUserId: userId,
      notificationId: notificationId,

      type: 'ban',
      subType: banData.type === 'permanent' ? 'perm_ban' : 'temp_ban',
      priority: 'urgent',

      title: title,
      message: message,
      additionalInfo: banData.reason,

      issuedBy: banData.issuedBy || 'system',
      issuedByName: adminName,
      relatedReport: banData.reportId || null,

      createdAt: admin.firestore.Timestamp.now(),
      scheduledFor: admin.firestore.Timestamp.now(),

      processed: false,
      attempts: 0,

      data: {
        banType: banData.type,
        banDuration: banData.duration || null,
        banReason: banData.reason,
        expiresAt: banData.expiresAt ? banData.expiresAt.seconds * 1000 : null,
        screen: 'Home',
        channels: ['push', 'in_app'],
        requiresAck: true
      }
    };

    await admin.firestore().doc(`adminNotifications/${notificationId}`).set(notification);
    console.log(`[Ban Detection] Created ban notification: ${notificationId}`);

  } catch (error) {
    console.error(`[Ban Detection] Failed to create ban notification:`, error);
  }
}

/**
 * Create a strike notification in the adminNotifications collection
 * @param {string} userId - Target user ID
 * @param {object} strikeData - Strike information
 */
async function createStrikeNotification(userId, strikeData) {
  try {
    const notificationId = `strike_${userId}_${Date.now()}`;

    const title = `🔴 Strike ${strikeData.strikeCount} Issued`;
    const message = `You have received a community guideline strike. Reason: ${strikeData.reason}`;

    // Get admin name if available
    let adminName = 'System Admin';
    if (strikeData.issuedBy) {
      try {
        const adminDoc = await admin.firestore().doc(`users/${strikeData.issuedBy}`).get();
        if (adminDoc.exists) {
          adminName = adminDoc.data()?.userdata?.contactInfo?.displayName || 'Admin';
        }
      } catch (error) {
        console.warn(`[Ban Detection] Could not fetch admin name: ${error.message}`);
      }
    }

    const notification = {
      targetUserId: userId,
      notificationId: notificationId,

      type: 'strike',
      subType: 'community_strike',
      priority: 'high',

      title: title,
      message: message,
      additionalInfo: strikeData.reason,

      issuedBy: strikeData.issuedBy || 'system',
      issuedByName: adminName,
      relatedReport: strikeData.reportId || null,

      createdAt: admin.firestore.Timestamp.now(),
      scheduledFor: admin.firestore.Timestamp.now(),

      processed: false,
      attempts: 0,

      data: {
        strikeCount: strikeData.strikeCount,
        strikeId: strikeData.strikeId,
        reason: strikeData.reason,
        screen: 'Notifications',
        channels: ['push', 'in_app'],
        requiresAck: true
      }
    };

    await admin.firestore().doc(`adminNotifications/${notificationId}`).set(notification);
    console.log(`[Ban Detection] Created strike notification: ${notificationId}`);

  } catch (error) {
    console.error(`[Ban Detection] Failed to create strike notification:`, error);
  }
}

/**
 * Create a warning notification in the adminNotifications collection
 * @param {string} userId - Target user ID
 * @param {object} warningData - Warning information
 */
async function createWarningNotification(userId, warningData) {
  try {
    const notificationId = `warning_${userId}_${Date.now()}`;

    const title = '⚠️ Community Warning';
    const message = `You have received a community warning. Reason: ${warningData.reason}`;

    // Get admin name if available
    let adminName = 'System Admin';
    if (warningData.issuedBy) {
      try {
        const adminDoc = await admin.firestore().doc(`users/${warningData.issuedBy}`).get();
        if (adminDoc.exists) {
          adminName = adminDoc.data()?.userdata?.contactInfo?.displayName || 'Admin';
        }
      } catch (error) {
        console.warn(`[Ban Detection] Could not fetch admin name: ${error.message}`);
      }
    }

    const notification = {
      targetUserId: userId,
      notificationId: notificationId,

      type: 'warning',
      subType: 'community_warning',
      priority: 'normal',

      title: title,
      message: message,
      additionalInfo: warningData.reason,

      issuedBy: warningData.issuedBy || 'system',
      issuedByName: adminName,
      relatedReport: warningData.reportId || null,

      createdAt: admin.firestore.Timestamp.now(),
      scheduledFor: admin.firestore.Timestamp.now(),

      processed: false,
      attempts: 0,

      data: {
        warningId: warningData.warningId,
        reason: warningData.reason,
        screen: 'Notifications',
        channels: ['push', 'in_app'],
        requiresAck: false
      }
    };

    await admin.firestore().doc(`adminNotifications/${notificationId}`).set(notification);
    console.log(`[Ban Detection] Created warning notification: ${notificationId}`);

  } catch (error) {
    console.error(`[Ban Detection] Failed to create warning notification:`, error);
  }
}