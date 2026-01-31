// FILE: functions/notifications/adminAlertNotifications.js
// Firebase Cloud Functions - Admin Alert Notifications
// Notifies admins when important moderation/admin actions are needed

const functions = require('firebase-functions/v2');
const admin = require('firebase-admin');

/**
 * Notify admins when a new studio is requested
 * Triggered by creating documents in admin/studioRequests/requests collection
 */
exports.onStudioRequested = functions.firestore.onDocumentCreated(
  'admin/studioRequests/requests/{requestId}',
  async (event) => {
    const requestData = event.data.data();
    const { requestId } = event.params;

    try {
      console.log(`[Admin Alert] New studio request: ${requestId}`);

      const {
        cityName,
        stateName,
        country,
        requestedBy,
        reason,
        requestCount = 1,
      } = requestData;

      // Get requester info
      let requesterName = 'Unknown';
      let requesterEmail = 'Unknown';
      try {
        const requesterDoc = await admin
          .firestore()
          .doc(`users/${requestedBy}`)
          .get();

        if (requesterDoc.exists()) {
          const requesterData = requesterDoc.data();
          requesterName = requesterData?.userdata?.contactInfo?.firstName || 'Unknown';
          requesterEmail = requesterData?.userdata?.contactInfo?.email || 'Unknown';
        }
      } catch (error) {
        console.warn('[Admin Alert] Could not fetch requester info:', error);
      }

      // Get all global admins
      const adminUsers = await getGlobalAdmins();

      if (adminUsers.length === 0) {
        console.log('[Admin Alert] No global admins found');
        return;
      }

      // Send notifications to all admins
      await sendAdminAlertNotifications({
        adminUsers,
        title: '🏙️ New Studio Request',
        message: `${requesterName} requested a studio for ${cityName}, ${stateName}`,
        type: 'studio_request',
        priority: requestCount > 1 ? 'high' : 'normal',
        data: {
          requestId,
          cityName,
          stateName,
          country,
          requestedBy,
          requesterName,
          requesterEmail,
          reason: reason || 'No reason provided',
          requestCount: requestCount.toString(),
          screen: 'AdminScreen',
          adminAction: 'review_studio_request',
        },
      });

      console.log(
        `[Admin Alert] Studio request notification sent to ${adminUsers.length} admins`
      );
    } catch (error) {
      console.error('[Admin Alert] Error processing studio request:', error);
    }
  }
);

/**
 * Notify admins when a user is reported
 * Triggered by creating documents in studios/{studioId}/admin collection (type: user)
 */
exports.onUserReported = functions.firestore.onDocumentCreated(
  'studios/{studioId}/admin/{reportId}',
  async (event) => {
    const reportData = event.data.data();
    const { studioId, reportId } = event.params;

    try {
      // Only process user reports
      if (reportData.type !== 'user') {
        return;
      }

      console.log(`[Admin Alert] User reported: ${reportId} in studio ${studioId}`);

      const {
        reportedUser,
        reportedBy,
        reporterInfo,
        reason,
        status = 'pending',
      } = reportData;

      // Only notify for pending reports (not reviewed/resolved)
      if (status !== 'pending') {
        return;
      }

      const reportedUserName = reportedUser?.reportedInfo?.name || 'Unknown User';
      const reporterName = reporterInfo?.name || 'Unknown';

      // Get studio admins
      const studioAdmins = await getStudioAdmins(studioId);

      if (studioAdmins.length === 0) {
        console.log(`[Admin Alert] No admins found for studio ${studioId}`);
        return;
      }

      // Send notifications to studio admins
      await sendAdminAlertNotifications({
        adminUsers: studioAdmins,
        title: '🚨 User Reported',
        message: `${reporterName} reported ${reportedUserName} for: ${reason}`,
        type: 'user_report',
        priority: 'high',
        data: {
          reportId,
          studioId,
          reportedUserId: reportedUser?.id || '',
          reportedUserName,
          reportedBy,
          reporterName,
          reason,
          screen: 'AdminScreen',
          adminAction: 'review_user_report',
        },
      });

      console.log(
        `[Admin Alert] User report notification sent to ${studioAdmins.length} admins`
      );
    } catch (error) {
      console.error('[Admin Alert] Error processing user report:', error);
    }
  }
);

/**
 * Notify admins when an event is reported
 * Triggered by creating documents in studios/{studioId}/admin collection (type: event)
 */
exports.onEventReported = functions.firestore.onDocumentCreated(
  'studios/{studioId}/admin/{reportId}',
  async (event) => {
    const reportData = event.data.data();
    const { studioId, reportId } = event.params;

    try {
      // Only process event reports
      if (reportData.type !== 'event') {
        return;
      }

      console.log(`[Admin Alert] Event reported: ${reportId} in studio ${studioId}`);

      const {
        reportedEvent,
        reportedBy,
        reporterInfo,
        reason,
        status = 'pending',
      } = reportData;

      // Only notify for pending reports (not reviewed/resolved)
      if (status !== 'pending') {
        return;
      }

      const eventTitle = reportedEvent?.eventData?.title || 'Unknown Event';
      const eventCreator = reportedEvent?.creatorInfo?.name || 'Unknown';
      const reporterName = reporterInfo?.name || 'Unknown';

      // Get studio admins
      const studioAdmins = await getStudioAdmins(studioId);

      if (studioAdmins.length === 0) {
        console.log(`[Admin Alert] No admins found for studio ${studioId}`);
        return;
      }

      // Send notifications to studio admins
      await sendAdminAlertNotifications({
        adminUsers: studioAdmins,
        title: '⚠️ Event Reported',
        message: `${reporterName} reported "${eventTitle}" (by ${eventCreator}) for: ${reason}`,
        type: 'event_report',
        priority: 'high',
        data: {
          reportId,
          studioId,
          eventId: reportedEvent?.id || '',
          eventTitle,
          eventCreatorId: reportedEvent?.creatorInfo?.id || '',
          eventCreatorName: eventCreator,
          reportedBy,
          reporterName,
          reason,
          screen: 'AdminScreen',
          adminAction: 'review_event_report',
        },
      });

      console.log(
        `[Admin Alert] Event report notification sent to ${studioAdmins.length} admins`
      );
    } catch (error) {
      console.error('[Admin Alert] Error processing event report:', error);
    }
  }
);

/**
 * Helper function to send admin alert notifications
 * Creates both in-app notifications and push notifications
 */
async function sendAdminAlertNotifications({
  adminUsers,
  title,
  message,
  type,
  priority,
  data,
}) {
  const batch = admin.firestore().batch();
  const notificationPromises = [];

  for (const adminUser of adminUsers) {
    const { userId, fcmToken } = adminUser;

    // Create in-app notification in user's notifications subcollection
    const notificationId = `${type}_${data.reportId || data.requestId}_${Date.now()}`;
    const userNotificationRef = admin
      .firestore()
      .doc(`users/${userId}/notifications/${notificationId}`);

    batch.set(userNotificationRef, {
      id: notificationId,
      type,
      title,
      message,
      priority,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
      data,
    });

    // Send push notification if FCM token exists
    if (fcmToken) {
      notificationPromises.push(
        admin
          .messaging()
          .send({
            token: fcmToken,
            notification: {
              title,
              body: message,
            },
            data: {
              type,
              ...Object.fromEntries(
                Object.entries(data).map(([key, value]) => [
                  key,
                  String(value),
                ])
              ),
            },
            android: {
              priority: priority === 'high' ? 'high' : 'normal',
              notification: {
                channelId: 'admin_alerts',
                priority: priority === 'high' ? 'high' : 'default',
                sound: priority === 'high' ? 'default' : undefined,
              },
            },
            apns: {
              payload: {
                aps: {
                  sound: priority === 'high' ? 'default' : undefined,
                  badge: 1,
                },
              },
            },
          })
          .catch((error) => {
            console.error(`Failed to send FCM to ${userId}:`, error);
          })
      );
    }
  }

  // Commit in-app notifications
  await batch.commit();

  // Send all push notifications
  await Promise.allSettled(notificationPromises);

  console.log(
    `[Admin Alert] Created ${adminUsers.length} in-app notifications and sent ${notificationPromises.length} push notifications`
  );
}

/**
 * Get all global admins with FCM tokens
 * Global admins have userdata.roles.isGlobalAdmin = true
 */
async function getGlobalAdmins() {
  try {
    const usersSnapshot = await admin
      .firestore()
      .collection('users')
      .where('userdata.roles.isGlobalAdmin', '==', true)
      .get();

    return usersSnapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          userId: doc.id,
          fcmToken: data?.deviceInfo?.fcmToken || null,
        };
      })
      .filter((user) => user.fcmToken !== null); // Only return users with FCM tokens
  } catch (error) {
    console.error('[Admin Alert] Error getting global admins:', error);
    return [];
  }
}

/**
 * Get studio admins with FCM tokens
 * Studio admins have userdata.roles.studios[studioId].isAdmin = true
 */
async function getStudioAdmins(studioId) {
  try {
    // First, get the studio to find its users
    const studioDoc = await admin
      .firestore()
      .doc(`studios/${studioId}`)
      .get();

    if (!studioDoc.exists()) {
      console.log(`[Admin Alert] Studio ${studioId} not found`);
      return [];
    }

    const studioData = studioDoc.data();
    const userIds = studioData.users || [];

    if (userIds.length === 0) {
      return [];
    }

    // Get all users in the studio
    const userPromises = userIds.map((userId) =>
      admin
        .firestore()
        .doc(`users/${userId}`)
        .get()
    );

    const userDocs = await Promise.all(userPromises);

    // Filter for admins with FCM tokens
    const adminUsers = [];

    for (const userDoc of userDocs) {
      if (!userDoc.exists()) continue;

      const userData = userDoc.data();
      const isAdmin =
        userData?.userdata?.roles?.studios?.[studioId]?.isAdmin === true ||
        userData?.userdata?.roles?.isGlobalAdmin === true;

      const fcmToken = userData?.deviceInfo?.fcmToken;

      if (isAdmin && fcmToken) {
        adminUsers.push({
          userId: userDoc.id,
          fcmToken,
        });
      }
    }

    return adminUsers;
  } catch (error) {
    console.error('[Admin Alert] Error getting studio admins:', error);
    return [];
  }
}
