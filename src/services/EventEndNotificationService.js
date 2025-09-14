import {
  collection,
  collectionGroup,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';
import {
  createNotification,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITY,
  DELIVERY_CHANNELS,
} from './notifications';

/**
 * Service to detect when events end and send attendance notifications to hosts
 */
export class EventEndNotificationService {
  /**
   * Check for recently ended events and send attendance notifications to hosts
   * This should be called periodically (e.g., every 15-30 minutes)
   */
  static async checkAndNotifyEventEnds() {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

      // Query for events across all studios that ended in the last hour but haven't sent attendance notifications yet
      const q = query(
        collectionGroup(db, 'events'),
        where('eventTimestamp', '>', Timestamp.fromDate(sixHoursAgo)),
        where('eventTimestamp', '<=', Timestamp.fromDate(oneHourAgo))
      );

      const querySnapshot = await getDocs(q);

      const notifications = [];

      for (const eventDoc of querySnapshot.docs) {
        const eventData = eventDoc.data();
        const eventId = eventDoc.id;

        // Skip if attendance notification already sent
        if (eventData.attendanceNotificationSent) {
          continue;
        }

        // Skip if event doesn't have attendance tracking enabled
        if (eventData.trackAttendance === false) {
          continue;
        }

        // Skip if event doesn't have subscribers (no one to take attendance for)
        if (!eventData.subscribers || eventData.subscribers.length === 0) {
          continue;
        }

        // Skip if the event was cancelled
        if (eventData.cancelled) {
          continue;
        }

        // Calculate event end time (event start + estimated duration)
        const eventStart = eventData.eventTimestamp.toDate();
        const estimatedDuration = this.getEstimatedEventDuration(eventData);
        const eventEnd = new Date(eventStart.getTime() + estimatedDuration);

        // Check if event has actually ended (with some buffer time)
        const bufferTime = 30 * 60 * 1000; // 30 minutes buffer
        const eventEndWithBuffer = new Date(eventEnd.getTime() + bufferTime);

        if (now >= eventEndWithBuffer) {
          try {
            // Send attendance notification to host
            const result = await this.sendAttendanceNotificationToHost(
              eventId,
              eventData
            );

            if (result.success) {
              // Mark that attendance notification has been sent
              // Use the document reference from the query result which includes the correct path
              await updateDoc(eventDoc.ref, {
                attendanceNotificationSent: true,
                attendanceNotificationSentAt: Timestamp.now(),
              });

              notifications.push({
                eventId,
                eventTitle: eventData.title,
                success: true,
              });
            } else {
            }
          } catch (error) {}
        }
      }

      return {
        success: true,
        checkedEvents: querySnapshot.size,
        sentNotifications: notifications.length,
        notifications,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send attendance notification to event host
   */
  static async sendAttendanceNotificationToHost(eventId, eventData) {
    try {
      const hostId = eventData.createdBy || eventData.hostId;
      if (!hostId) {
        return { success: false, error: 'No host ID found for event' };
      }

      const attendeeCount = eventData.subscribers
        ? eventData.subscribers.length
        : 0;

      return await createNotification({
        userId: hostId,
        type: NOTIFICATION_TYPES.ATTENDANCE_REMINDER,
        title: '📋 Time to Mark Attendance!',
        message: `Your event "${eventData.title}" has ended. Please mark attendance for ${attendeeCount} attendee${attendeeCount !== 1 ? 's' : ''}.`,
        data: {
          eventId,
          eventTitle: eventData.title,
          attendeeCount,
          eventEndTime: new Date().toISOString(),
          actionRequired: 'mark_attendance',
        },
        priority: NOTIFICATION_PRIORITY.HIGH,
        channels: [DELIVERY_CHANNELS.PUSH],
        expiresIn: 7, // Expire after 7 days
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get estimated event duration based on event type or default
   */
  static getEstimatedEventDuration(eventData) {
    // Try to extract duration from event details or use defaults
    const defaultDurations = {
      // Default durations in milliseconds
      party: 4 * 60 * 60 * 1000, // 4 hours
      meeting: 2 * 60 * 60 * 1000, // 2 hours
      dinner: 3 * 60 * 60 * 1000, // 3 hours
      sports: 2 * 60 * 60 * 1000, // 2 hours
      concert: 3 * 60 * 60 * 1000, // 3 hours
      workshop: 4 * 60 * 60 * 1000, // 4 hours
      conference: 8 * 60 * 60 * 1000, // 8 hours
      default: 3 * 60 * 60 * 1000, // 3 hours default
    };

    // Try to detect event type from title or details
    const title = (eventData.title || '').toLowerCase();
    const details = (eventData.details || '').toLowerCase();
    const text = `${title} ${details}`;

    for (const [type, duration] of Object.entries(defaultDurations)) {
      if (type !== 'default' && text.includes(type)) {
        return duration;
      }
    }

    // Look for explicit duration mentions (e.g., "2 hours", "3h", etc.)
    const durationMatch = text.match(/(\d+)\s*(hour|hr|h)s?/i);
    if (durationMatch) {
      const hours = parseInt(durationMatch[1]);
      if (hours > 0 && hours <= 12) {
        // Reasonable range
        return hours * 60 * 60 * 1000;
      }
    }

    return defaultDurations.default;
  }

  /**
   * Schedule attendance notifications for future events
   * This is a client-side implementation - for production, use Cloud Functions
   */
  static schedulePeriodicCheck() {
    // Check every 30 minutes
    const checkInterval = 30 * 60 * 1000; // 30 minutes

    // Initial check
    this.checkAndNotifyEventEnds().catch((error) => {});

    // Set up periodic checks
    const intervalId = setInterval(() => {
      this.checkAndNotifyEventEnds().catch((error) => {});
    }, checkInterval);

    // Return cleanup function
    return () => {
      clearInterval(intervalId);
    };
  }

  /**
   * Manually trigger attendance notification for a specific event
   * Useful for testing or manual triggers
   */
  static async triggerAttendanceNotification(eventId) {
    try {
      const eventDoc = await getDocs(
        query(collection(db, 'events'), where('__name__', '==', eventId))
      );

      if (eventDoc.empty) {
        throw new Error('Event not found');
      }

      const eventData = eventDoc.docs[0].data();

      const result = await this.sendAttendanceNotificationToHost(
        eventId,
        eventData
      );

      if (result.success) {
        await updateDoc(doc(db, 'events', eventId), {
          attendanceNotificationSent: true,
          attendanceNotificationSentAt: Timestamp.now(),
          manuallyTriggered: true,
        });
      }

      return result;
    } catch (error) {
      throw error;
    }
  }
}
