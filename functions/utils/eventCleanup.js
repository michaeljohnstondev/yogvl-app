// Firebase Cloud Functions - Event Cleanup Utilities
// Handles cleanup operations when events are deleted or cancelled

const admin = require('firebase-admin');

/**
 * Clean up all scheduled reminders for a deleted/cancelled event
 * @param {string} eventId - The event ID to clean up reminders for
 * @returns {Promise<Object>} Cleanup result with counts
 */
async function cleanupEventReminders(eventId) {
  if (!eventId) {
    throw new Error('Event ID is required for reminder cleanup');
  }

  console.log(`[EventCleanup] Starting reminder cleanup for event ${eventId}`);

  try {
    const db = admin.firestore();

    // Query for all pending reminders for this event
    const remindersQuery = db
      .collection('scheduledNotifications')
      .where('eventId', '==', eventId)
      .where('status', '==', 'pending');

    const reminderDocs = await remindersQuery.get();

    if (reminderDocs.empty) {
      console.log(`[EventCleanup] No pending reminders found for event ${eventId}`);
      return {
        success: true,
        deletedCount: 0,
        message: 'No reminders to clean up'
      };
    }

    console.log(`[EventCleanup] Found ${reminderDocs.size} pending reminders to delete for event ${eventId}`);

    // Delete reminders in batches to avoid exceeding Firestore batch limits
    const batchSize = 500; // Firestore batch limit
    let deletedCount = 0;

    for (let i = 0; i < reminderDocs.docs.length; i += batchSize) {
      const batch = db.batch();
      const batchDocs = reminderDocs.docs.slice(i, i + batchSize);

      batchDocs.forEach(doc => {
        const data = doc.data();
        // Instead of deleting, mark as cancelled for audit trail
        batch.update(doc.ref, {
          status: 'cancelled_event_deleted',
          cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
          originalEventId: eventId
        });
        // Enhanced logging for each cleanup
        console.log(
          `[EventCleanup] 🧹 CLEANED scheduledNotification:`,
          `\n  ID: ${doc.id}`,
          `\n  Type: ${data.type}`,
          `\n  UserId: ${data.userId}`,
          `\n  EventId: ${data.eventId || 'N/A'}`,
          `\n  ScheduledFor: ${data.scheduledFor?.toDate()?.toISOString() || 'N/A'}`,
          `\n  Reason: Event cleanup - marked as cancelled_event_deleted`
        );
      });

      await batch.commit();
      deletedCount += batchDocs.length;

      console.log(`[EventCleanup] Processed batch ${Math.floor(i / batchSize) + 1}: ${batchDocs.length} reminders marked as cancelled`);
    }

    console.log(`[EventCleanup] ✅ Successfully cleaned up ${deletedCount} reminders for event ${eventId}`);

    return {
      success: true,
      deletedCount,
      message: `Successfully cancelled ${deletedCount} scheduled reminders`
    };

  } catch (error) {
    console.error(`[EventCleanup] ❌ Error cleaning up reminders for event ${eventId}:`, error);

    return {
      success: false,
      deletedCount: 0,
      error: error.message,
      message: 'Failed to clean up reminders'
    };
  }
}

/**
 * Clean up all scheduled reminders for multiple events (batch operation)
 * @param {string[]} eventIds - Array of event IDs to clean up
 * @returns {Promise<Object>} Cleanup result summary
 */
async function bulkCleanupEventReminders(eventIds) {
  if (!Array.isArray(eventIds) || eventIds.length === 0) {
    throw new Error('Event IDs array is required for bulk cleanup');
  }

  console.log(`[EventCleanup] Starting bulk reminder cleanup for ${eventIds.length} events`);

  const results = {
    success: true,
    totalDeleted: 0,
    processedEvents: 0,
    failedEvents: [],
    successfulEvents: []
  };

  for (const eventId of eventIds) {
    try {
      const result = await cleanupEventReminders(eventId);

      if (result.success) {
        results.totalDeleted += result.deletedCount;
        results.successfulEvents.push({ eventId, deletedCount: result.deletedCount });
      } else {
        results.failedEvents.push({ eventId, error: result.error });
        results.success = false;
      }

      results.processedEvents++;

    } catch (error) {
      console.error(`[EventCleanup] Error processing event ${eventId}:`, error);
      results.failedEvents.push({ eventId, error: error.message });
      results.success = false;
    }
  }

  console.log(`[EventCleanup] Bulk cleanup completed: ${results.processedEvents}/${eventIds.length} events processed, ${results.totalDeleted} total reminders cleaned up`);

  return results;
}

/**
 * Clean up reminders for events older than specified days
 * Used for maintenance/cleanup of old event data
 * @param {number} daysOld - Delete reminders for events older than this many days
 * @param {number} limit - Maximum number of reminder documents to process
 * @returns {Promise<Object>} Cleanup result
 */
async function cleanupOldEventReminders(daysOld = 30, limit = 1000) {
  console.log(`[EventCleanup] Starting cleanup of reminders for events older than ${daysOld} days`);

  try {
    const db = admin.firestore();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Query for old reminders (this assumes scheduledFor field exists)
    const oldRemindersQuery = db
      .collection('scheduledNotifications')
      .where('scheduledFor', '<', admin.firestore.Timestamp.fromDate(cutoffDate))
      .where('status', '==', 'pending')
      .limit(limit);

    const oldReminderDocs = await oldRemindersQuery.get();

    if (oldReminderDocs.empty) {
      return {
        success: true,
        deletedCount: 0,
        message: 'No old reminders to clean up'
      };
    }

    const batch = db.batch();
    oldReminderDocs.docs.forEach(doc => {
      const data = doc.data();
      batch.update(doc.ref, {
        status: 'cancelled_old_event',
        cancelledAt: admin.firestore.FieldValue.serverTimestamp()
      });
      // Enhanced logging for each old event cleanup
      console.log(
        `[EventCleanup] 🧹 CLEANED OLD scheduledNotification:`,
        `\n  ID: ${doc.id}`,
        `\n  Type: ${data.type}`,
        `\n  UserId: ${data.userId}`,
        `\n  EventId: ${data.eventId || 'N/A'}`,
        `\n  ScheduledFor: ${data.scheduledFor?.toDate()?.toISOString() || 'N/A'}`,
        `\n  Reason: Old event cleanup - marked as cancelled_old_event`
      );
    });

    await batch.commit();

    console.log(`[EventCleanup] Total cleaned: ${oldReminderDocs.size} old event reminders`);

    return {
      success: true,
      deletedCount: oldReminderDocs.size,
      message: `Cleaned up ${oldReminderDocs.size} old reminders`
    };

  } catch (error) {
    console.error('[EventCleanup] ❌ Error cleaning up old reminders:', error);

    return {
      success: false,
      deletedCount: 0,
      error: error.message
    };
  }
}

module.exports = {
  cleanupEventReminders,
  bulkCleanupEventReminders,
  cleanupOldEventReminders
};