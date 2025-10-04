// Firebase Cloud Function - Scheduled Notification Processor
// Processes user-scheduled notifications from users/{userId}/scheduledNotifications
// Runs every minute to check for pending notifications

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

      for (const notificationDoc of scheduledNotificationsSnapshot.docs) {
        const notificationData = notificationDoc.data();
        const notificationId = notificationDoc.id;
        const userId = notificationData.userId;

        console.log(`[ScheduledProcessor] Processing notification ${notificationId} for user ${userId}`);

        try {
          // Validate reminder template format if this is an event reminder
          if (notificationData.type === 'event_reminder' && notificationData.reminderType) {
            if (!isValidReminderTemplate(notificationData.reminderType)) {
              console.warn(`[ScheduledProcessor] Invalid reminder template format: ${notificationData.reminderType} for notification ${notificationId}`);
              // Mark as failed due to invalid format
              await notificationDoc.ref.update({
                status: 'failed',
                error: `Invalid reminder template format: ${notificationData.reminderType}`,
                lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              continue;
            }
          }

          // DISABLED: notificationTriggers collection eliminated
          console.warn('[scheduledNotificationProcessor] notificationTriggers disabled - collection eliminated');

          // Mark as failed since we can't send via old trigger system
          await notificationDoc.ref.update({
            status: 'failed',
            failureReason: 'notificationTriggers collection eliminated - needs direct trigger implementation',
            lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
            attempts: (notificationData.attempts || 0) + 1,
          });
          continue; // Skip to next notification

          /* REMOVED - WAS CREATING ZOMBIE notificationTriggers COLLECTION
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