import { db } from '../auth/services/firebase';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  addDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';

/**
 * Cleans up scheduled notifications and generates a report
 * Only keeps pending notifications that haven't fired yet
 * Reports all successes, failures, and overdue notifications to admin/reports
 */
export const cleanupScheduledNotifications = async () => {
  console.log('[ScheduledCleanup] Starting cleanup...');

  const report = {
    timestamp: Timestamp.now(),
    type: 'scheduledNotificationCleanup',
    summary: {
      total: 0,
      deleted: 0,
      kept: 0,
    },
    deleted: {
      success: [],
      failed: [],
      overdue: [],
    },
  };

  try {
    // Get all scheduled notifications
    const scheduledNotificationsRef = collection(db, 'scheduledNotifications');
    const snapshot = await getDocs(scheduledNotificationsRef);

    report.summary.total = snapshot.size;
    console.log(`[ScheduledCleanup] Found ${snapshot.size} scheduled notifications`);

    const now = new Date();
    const deletePromises = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const scheduledFor = data.scheduledFor?.toDate();

      // Determine if we should delete this notification
      let shouldDelete = false;
      let reason = '';

      if (data.status === 'sent') {
        shouldDelete = true;
        reason = 'success';
        report.deleted.success.push({
          id: docSnap.id,
          userId: data.userId,
          type: data.type,
          eventId: data.eventId,
          scheduledFor: scheduledFor?.toISOString(),
          sentAt: data.sentAt?.toDate()?.toISOString(),
        });
      } else if (data.status === 'failed') {
        shouldDelete = true;
        reason = 'failed';
        report.deleted.failed.push({
          id: docSnap.id,
          userId: data.userId,
          type: data.type,
          eventId: data.eventId,
          scheduledFor: scheduledFor?.toISOString(),
          error: data.error || 'Unknown error',
        });
      } else if (data.status === 'pending' && scheduledFor && scheduledFor < now) {
        shouldDelete = true;
        reason = 'overdue';
        report.deleted.overdue.push({
          id: docSnap.id,
          userId: data.userId,
          type: data.type,
          eventId: data.eventId,
          scheduledFor: scheduledFor?.toISOString(),
          minutesOverdue: Math.round((now - scheduledFor) / 1000 / 60),
        });
      } else {
        // Keep this notification (it's pending and not overdue)
        report.summary.kept++;
      }

      // Add deletion promise if needed
      if (shouldDelete) {
        report.summary.deleted++;
        deletePromises.push(
          deleteDoc(doc(db, 'scheduledNotifications', docSnap.id))
            .then(() => {
              console.log(`[ScheduledCleanup] Deleted ${reason}: ${docSnap.id}`);
            })
            .catch((error) => {
              console.error(`[ScheduledCleanup] Error deleting ${docSnap.id}:`, error);
              // Track deletion errors
              if (!report.deletionErrors) {
                report.deletionErrors = [];
              }
              report.deletionErrors.push({
                id: docSnap.id,
                reason,
                error: error.message,
              });
            })
        );
      }
    });

    // Execute all deletions
    await Promise.all(deletePromises);

    console.log('[ScheduledCleanup] Cleanup complete:', report.summary);

    // Save report to admin/reports
    const reportsRef = collection(db, 'admin', 'reports', 'scheduledNotificationCleanups');
    await addDoc(reportsRef, report);

    console.log('[ScheduledCleanup] Report saved to admin/reports');

    return {
      success: true,
      report,
    };
  } catch (error) {
    console.error('[ScheduledCleanup] Error during cleanup:', error);

    // Save error report
    report.error = error.message;
    try {
      const reportsRef = collection(db, 'admin', 'reports', 'scheduledNotificationCleanups');
      await addDoc(reportsRef, report);
    } catch (reportError) {
      console.error('[ScheduledCleanup] Failed to save error report:', reportError);
    }

    return {
      success: false,
      error: error.message,
      report,
    };
  }
};
