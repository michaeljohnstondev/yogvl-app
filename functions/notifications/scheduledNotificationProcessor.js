/**
 * SCHEDULED NOTIFICATION PROCESSOR - Firebase Cloud Function
 *
 * PURPOSE:
 *   Processes pending scheduled notifications from Firestore and sends push notifications
 *   to users via Firebase Cloud Messaging (FCM)
 *
 * SCHEDULE:
 *   Runs every 1 minute via Cloud Scheduler
 *
 * DATA FLOW:
 *   1. Query scheduledNotifications collection for pending notifications where scheduledFor <= now
 *   2. For each pending notification:
 *      a. Validate reminderType format (for event reminders)
 *      b. Get user's FCM tokens from users/{userId}
 *      c. Send push notification via FCM to all user devices
 *      d. Update notification status to 'sent' or 'failed'
 *   3. Process max 100 notifications per run to avoid timeouts
 *
 * DATA STRUCTURE:
 *   /scheduledNotifications/{notificationId}
 *   {
 *     id: string,
 *     userId: string,
 *     eventId: string (optional),
 *     type: 'EVENT_REMINDER' | 'ATTENDANCE_REMINDER' | 'EVENT_RECAP',
 *     title: string,
 *     message: string,
 *     reminderType: string (for EVENT_REMINDER - e.g., '55m', '15m', '1h'),
 *     data: object (additional metadata),
 *     scheduledFor: Timestamp,
 *     status: 'pending' | 'sent' | 'failed',
 *     attempts: number,
 *     priority: 'high' | 'normal',
 *     channels: ['push']
 *   }
 *
 * REMINDER TYPE FORMAT:
 *   Format: {amount}{unit} where unit is: m (minutes), h (hours), d (days), w (weeks), x (months), y (years)
 *   Examples: '5m' = 5 minutes, '2h' = 2 hours, '1d' = 1 day, '55m' = 55 minutes
 *   Validated by reminderUtils.isValidReminderTemplate()
 *
 * ERROR HANDLING:
 *   - Missing user: Mark as failed immediately
 *   - No FCM tokens: Mark as failed immediately
 *   - Invalid reminder format: Mark as failed immediately
 *   - FCM send failure: Retry up to 3 times, then mark as failed
 *   - Partial success (some devices): Mark as sent if at least 1 device succeeded
 *
 * MONITORING:
 *   - Console logs track: processed count, error count, individual notification results
 *   - Failed notifications remain in DB with failure reason for debugging
 *   - Sent notifications remain in DB with sentAt timestamp for auditing
 */

const functions = require('firebase-functions/v2');
const admin = require('firebase-admin');
const { reminderToLabel, isValidReminderTemplate } = require('../utils/reminderUtils');

/**
 * Scheduled function to process pending user notifications
 * Runs every minute to check for notifications that should be sent
 */
exports.processScheduledNotifications = functions.scheduler.onSchedule(
  'every 1 minutes',
  async (event) => {
    const now = new Date();
    console.log(`[ScheduledProcessor] Processing scheduled notifications at ${now.toISOString()}`);

    try {
      // SCALABLE APPROACH: Query single global collection for ready notifications
      // This scales to millions of users and notifications efficiently
      const scheduledNotificationsSnapshot = await admin
        .firestore()
        .collection('scheduledNotifications')
        .where('status', '==', 'pending')
        .where('scheduledFor', '<=', admin.firestore.Timestamp.fromDate(now))
        .limit(100) // Process max 100 notifications per run to avoid timeouts
        .get();

      let processedCount = 0;
      let errorCount = 0;

      console.log(`[ScheduledProcessor] Found ${scheduledNotificationsSnapshot.size} pending notifications`);

      for (const notificationDoc of scheduledNotificationsSnapshot.docs) {
        const notificationData = notificationDoc.data();
        const notificationId = notificationDoc.id;
        const userId = notificationData.userId;

        console.log(`[ScheduledProcessor] Processing notification ${notificationId}:`, {
          type: notificationData.type,
          reminderType: notificationData.reminderType,
          userId,
          scheduledFor: notificationData.scheduledFor.toDate().toISOString(),
        });

        try {
          // Validate reminder template format if this is an event reminder
          if (notificationData.type === 'event_reminder' && notificationData.reminderType) {
            if (!isValidReminderTemplate(notificationData.reminderType)) {
              console.warn(`[ScheduledProcessor] Invalid reminder template format: ${notificationData.reminderType} for notification ${notificationId}`);
              await notificationDoc.ref.update({
                status: 'failed',
                error: `Invalid reminder template format: ${notificationData.reminderType}`,
                lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              errorCount++;
              continue;
            }
            console.log(`[ScheduledProcessor] Reminder template '${notificationData.reminderType}' validated successfully`);
          }

          // Get user's FCM tokens for push notification
          const userDoc = await admin.firestore().doc(`users/${userId}`).get();
          if (!userDoc.exists) {
            console.warn(`[ScheduledProcessor] User ${userId} not found for notification ${notificationId}`);
            await notificationDoc.ref.update({
              status: 'failed',
              error: 'User not found',
              lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            errorCount++;
            continue;
          }

          const userData = userDoc.data();

          // Support both old (fcmTokens array) and new (deviceInfo.fcmToken) formats
          let fcmTokens = [];
          if (userData?.fcmTokens && Array.isArray(userData.fcmTokens)) {
            // Old format: fcmTokens array at root
            fcmTokens = userData.fcmTokens;
          } else if (userData?.deviceInfo?.fcmToken) {
            // New format: single token in deviceInfo.fcmToken
            fcmTokens = [userData.deviceInfo.fcmToken];
          }

          if (fcmTokens.length === 0) {
            console.warn(`[ScheduledProcessor] No FCM tokens for user ${userId}, notification ${notificationId}`);
            console.warn(`[ScheduledProcessor] User data structure:`, {
              hasFcmTokens: !!userData?.fcmTokens,
              hasDeviceInfo: !!userData?.deviceInfo,
              hasDeviceFcmToken: !!userData?.deviceInfo?.fcmToken
            });
            await notificationDoc.ref.update({
              status: 'failed',
              error: 'No FCM tokens available',
              lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            errorCount++;
            continue;
          }

          // Sanitize data object - FCM requires all values to be strings
          const sanitizeDataForFCM = (data) => {
            const sanitized = {};
            for (const [key, value] of Object.entries(data)) {
              if (value === null || value === undefined) {
                continue; // Skip null/undefined values
              }
              if (typeof value === 'object') {
                sanitized[key] = JSON.stringify(value); // Convert objects to JSON strings
              } else {
                sanitized[key] = String(value); // Convert everything else to string
              }
            }
            return sanitized;
          };

          // Build FCM message payload
          const fcmPayload = {
            notification: {
              title: notificationData.title,
              body: notificationData.message,
            },
            data: {
              type: notificationData.type,
              ...(notificationData.eventId && { eventId: notificationData.eventId }),
              ...(notificationData.reminderType && { reminderType: notificationData.reminderType }),
              ...sanitizeDataForFCM(notificationData.data || {}),
            },
            // iOS/Android configuration
            apns: {
              payload: {
                aps: {
                  sound: 'default',
                  badge: 1,
                }
              }
            },
            android: {
              priority: 'high',
              notification: {
                sound: 'default',
                channelId: 'event_reminders',
              }
            }
          };

          // Send to all user's devices
          const sendPromises = fcmTokens.map(token =>
            admin.messaging().send({
              ...fcmPayload,
              token: token,
            }).catch(error => {
              console.error(`[ScheduledProcessor] Failed to send to token ${token.substring(0, 20)}...:`, error);
              return { error, token };
            })
          );

          const sendResults = await Promise.allSettled(sendPromises);

          // Check if at least one succeeded
          const successCount = sendResults.filter(r => r.status === 'fulfilled' && !r.value?.error).length;

          if (successCount > 0) {
            // Mark as sent if at least one device received it
            await notificationDoc.ref.update({
              status: 'sent',
              sentAt: admin.firestore.FieldValue.serverTimestamp(),
              attempts: (notificationData.attempts || 0) + 1,
              lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
              devicesNotified: successCount,
            });
            processedCount++;
            console.log(`[ScheduledProcessor] ✅ Sent notification ${notificationId} to ${successCount}/${fcmTokens.length} devices`);
          } else {
            // All sends failed
            const attempts = (notificationData.attempts || 0) + 1;
            if (attempts >= 3) {
              await notificationDoc.ref.update({
                status: 'failed',
                attempts: attempts,
                lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
                error: 'Failed to send to any device after 3 attempts',
              });
              console.log(`[ScheduledProcessor] ❌ Marked notification ${notificationId} as failed after ${attempts} attempts`);
            } else {
              await notificationDoc.ref.update({
                attempts: attempts,
                lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
            errorCount++;
          }

          /* REMOVED - OLD TRIGGER SYSTEM
          const triggerId = `scheduled_${notificationData.type}_${userId}_${Date.now()}`;
          const notificationTriggerRef = admin
            .firestore()
            .doc(`notificationTriggers/${triggerId}`);

          // Enhanced notification data with reminder context
          const triggerData = {
            type: 'engine_notification',
            subType: notificationData.type,
            userId: userId,
            priority: notificationData.priority || 'normal',
            title: notificationData.title,
            message: notificationData.message,
            data: {
              ...notificationData.data,
              scheduledNotificationId: notificationId,
              originalScheduledFor: notificationData.scheduledFor,
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            processed: false,
          };

          // Add reminder-specific data for event reminders
          if (notificationData.type === 'event_reminder' && notificationData.reminderType) {
            triggerData.data.reminderType = notificationData.reminderType;
            triggerData.data.reminderLabel = reminderToLabel(notificationData.reminderType);
          }

          await notificationTriggerRef.set(triggerData);

          // Mark the scheduled notification as sent
          await notificationDoc.ref.update({
            status: 'sent',
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            attempts: (notificationData.attempts || 0) + 1,
            lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          processedCount++;
          console.log(`[ScheduledProcessor] ✅ Processed notification ${notificationId}`);
          */

        } catch (error) {
          console.error(`[ScheduledProcessor] ❌ Failed to process notification ${notificationId}:`, error);

          // Mark as failed after too many attempts
          const attempts = (notificationData.attempts || 0) + 1;
          if (attempts >= 3) {
            await notificationDoc.ref.update({
              status: 'failed',
              attempts: attempts,
              lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
              error: error.message,
            });
            console.log(`[ScheduledProcessor] ❌ Marked notification ${notificationId} as failed after ${attempts} attempts`);
          } else {
            await notificationDoc.ref.update({
              attempts: attempts,
              lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
          errorCount++;
        }
      }

      console.log(`[ScheduledProcessor] Completed: ${processedCount} notifications processed, ${errorCount} errors`);
      return { processedCount, errorCount };

    } catch (error) {
      console.error('[ScheduledProcessor] Fatal error processing scheduled notifications:', error);
      throw error;
    }
  }
);