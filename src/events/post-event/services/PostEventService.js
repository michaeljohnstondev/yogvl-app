// FILE: PostEventService.js - Centralized Post-Event Operations

import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  arrayUnion,
  arrayRemove,
  increment,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../../auth/services/firebase';
import { AttendanceService } from '../../../services/AttendanceService';
import { ReliabilityService } from '../../../services/ReliabilityService';
import {
  createNotification,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITY,
  DELIVERY_CHANNELS,
} from '../../../services/notifications';
import { notificationEngine } from '../../../services/shared/NotificationEngine';

export class PostEventService {
  /**
   * Complete an event and finalize attendance
   * @param {string} studioId - Studio ID
   * @param {string} eventId - Event ID
   * @param {string} hostId - Host user ID
   * @param {Array<string>} attendeeIds - User IDs who attended
   * @param {Array<string>} noShowIds - User IDs who didn't attend (for strict events)
   * @returns {Promise<boolean>} Success status
   */
  static async completeEvent(
    studioId,
    eventId,
    hostId,
    attendeeIds = [],
    noShowIds = []
  ) {
    try {
      const eventRef = doc(db, 'studios', studioId, 'events', eventId);
      const eventDoc = await getDoc(eventRef);

      if (!eventDoc.exists()) {
        throw new Error(`Event ${eventId} not found`);
      }

      const eventData = eventDoc.data();

      // Verify host permissions
      if (eventData.createdBy !== hostId) {
        throw new Error('Only the event host can complete an event');
      }

      // Check if already completed
      if (eventData.status === 'completed') {
        throw new Error('Event is already completed');
      }

      // Validate attendee/no-show lists don't overlap
      const overlap = attendeeIds.filter((id) => noShowIds.includes(id));
      if (overlap.length > 0) {
        throw new Error('Users cannot be both attendees and no-shows');
      }

      // Use atomic batch operation for event completion
      const batch = writeBatch(db);
      const now = Timestamp.now();

      // Update event status
      const updateData = {
        status: 'completed',
        completedAt: now,
        completedBy: hostId,
        attended: attendeeIds.length,
        noShows: noShowIds.length,
        // Build attendance array for detailed tracking
        attendance: this.buildAttendanceArray(
          attendeeIds,
          noShowIds,
          hostId,
          eventData,
          now
        ),
      };

      // Add legacy fields for backward compatibility
      updateData.finalAttendees = attendeeIds;
      updateData.attendeeCount = attendeeIds.length;

      if (eventData.attendanceType === 'strict') {
        updateData.noShows = noShowIds;
        updateData.noShowCount = noShowIds.length;
      }

      batch.update(eventRef, updateData);

      // Process attendance metrics + reliability updates atomically
      await this.addReliabilityUpdatesToBatch(
        batch,
        attendeeIds,
        noShowIds,
        eventData,
        eventId
      );

      // Commit all changes atomically
      await batch.commit();

      // Send completion notifications
      await this.sendEventCompletionNotifications(
        studioId,
        eventId,
        eventData,
        attendeeIds,
        noShowIds
      );

      console.log(
        `Event ${eventId} completed successfully with ${attendeeIds.length} attendees`
      );
      return true;
    } catch (error) {
      console.error('Error completing event:', error);
      throw error;
    }
  }

  /**
   * Process attendance records and update reliability scores
   * @private
   */
  static async processAttendanceRecords(
    studioId,
    eventId,
    hostId,
    attendeeIds,
    noShowIds,
    eventData
  ) {
    const isSoloEvent = AttendanceService.isSoloEvent(eventData);
    const allParticipants = [...new Set([...attendeeIds, ...noShowIds])];

    const attendancePromises = allParticipants.map(async (userId) => {
      const attended = attendeeIds.includes(userId);

      if (attended) {
        await AttendanceService.markAttended(studioId, eventId, userId, hostId);
      } else {
        await AttendanceService.markNoShow(studioId, eventId, userId, hostId);
      }
    });

    await Promise.all(attendancePromises);
  }

  /**
   * Send completion notifications to participants
   * @private
   */
  static async sendEventCompletionNotifications(
    studioId,
    eventId,
    eventData,
    attendeeIds,
    noShowIds
  ) {
    try {
      const eventTitle = eventData.title || 'Event';
      const allParticipants = [...new Set([...attendeeIds, ...noShowIds])];

      const notificationPromises = allParticipants.map(async (userId) => {
        if (userId === eventData.createdBy) return; // Don't notify the host

        const attended = attendeeIds.includes(userId);

        return createNotification({
          userId: userId,
          type: NOTIFICATION_TYPES.EVENT_COMPLETED,
          title: 'Event Completed',
          message: attended
            ? `"${eventTitle}" has ended. Thanks for attending!`
            : `"${eventTitle}" has ended. Sorry you couldn't make it.`,
          data: {
            eventId,
            eventTitle,
            studioId,
            attended,
            canReportAttendance:
              eventData.attendanceType === 'casual' && !attended,
          },
          priority: NOTIFICATION_PRIORITY.NORMAL,
          channels: [DELIVERY_CHANNELS.PUSH],
          actions: [
            {
              id: 'view_event_recap',
              title: 'View Recap',
              action: 'navigate_to_screen',
              params: { screen: 'EventWrapUp', eventId, studioId },
            },
          ],
        });
      });

      await Promise.all(notificationPromises);
    } catch (error) {
      console.error('Error sending completion notifications:', error);
      // Don't fail the completion if notifications fail
    }
  }

  /**
   * Handle guest self-reporting attendance
   * @param {string} studioId - Studio ID
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID reporting attendance
   * @param {boolean} attended - Whether user attended
   * @returns {Promise<boolean>} Success status
   */
  static async handleGuestAttendanceReport(
    studioId,
    eventId,
    userId,
    attended
  ) {
    try {
      // Use existing AttendanceService method for self-reporting
      await AttendanceService.selfReportAttendance(
        studioId,
        eventId,
        userId,
        attended
      );

      // Update guest attendance reports array for host visibility
      const eventRef = doc(db, 'studios', studioId, 'events', eventId);
      const report = {
        userId,
        status: attended ? 'attended' : 'missed',
        reportedAt: Timestamp.now(),
        selfReported: true,
      };

      await updateDoc(eventRef, {
        [`guestAttendanceReports.${userId}`]: report,
      });

      return true;
    } catch (error) {
      console.error('Error handling guest attendance report:', error);
      throw error;
    }
  }

  /**
   * Submit host rating by guest
   * @param {string} studioId - Studio ID
   * @param {string} eventId - Event ID
   * @param {string} hostId - Host user ID
   * @param {string} guestId - Guest user ID submitting rating
   * @param {number} rating - Rating (1-5)
   * @returns {Promise<boolean>} Success status
   */
  static async submitHostRating(studioId, eventId, hostId, guestId, rating) {
    try {
      // Validate rating
      if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        throw new Error('Rating must be an integer between 1 and 5');
      }

      // Prevent self-rating
      if (hostId === guestId) {
        throw new Error('Cannot rate yourself');
      }

      // Check if guest already rated for this event
      const eventRef = doc(db, 'studios', studioId, 'events', eventId);
      const eventDoc = await getDoc(eventRef);

      if (eventDoc.exists()) {
        const guestRatings = eventDoc.data().guestRatings || {};
        if (guestRatings[guestId]?.rated) {
          throw new Error('You have already rated this host for this event');
        }
      }

      const hostRef = doc(db, 'users', hostId);
      const hostDoc = await getDoc(hostRef);
      const currentRatings = hostDoc.data()?.userdata?.metrics?.hostRating || {
        stars: [],
        timeRated: [],
      };

      // Remove oldest rating if we have 50+ ratings (keep last 50)
      if (currentRatings.stars.length >= 50) {
        await updateDoc(hostRef, {
          'userdata.metrics.hostRating.stars': arrayRemove(currentRatings.stars[0]),
          'userdata.metrics.hostRating.timeRated': arrayRemove(currentRatings.timeRated[0]),
        });
      }

      // Add new rating and update metrics
      const updates = {
        'userdata.metrics.hostRating.stars': arrayUnion(rating),
        'userdata.metrics.hostRating.timeRated': arrayUnion(Timestamp.now()),
        'userdata.metrics.hostRating.totalRatings': increment(1),
        'userdata.metrics.hostRating.lastRated': Timestamp.now(),
      };

      // Mark in event that this guest rated the host
      const eventUpdates = {
        [`guestRatings.${guestId}`]: {
          rated: true,
          ratingValue: rating,
          timestamp: Timestamp.now(),
        },
      };

      await Promise.all([
        updateDoc(hostRef, updates),
        updateDoc(eventRef, eventUpdates),
      ]);

      console.log(
        `Rating submitted: ${rating} stars for host ${hostId} by guest ${guestId}`
      );
      return true;
    } catch (error) {
      console.error('Error submitting host rating:', error);
      throw error;
    }
  }

  /**
   * Get event wrap-up data for display
   * @param {string} studioId - Studio ID
   * @param {string} eventId - Event ID
   * @param {string} userId - Current user ID
   * @returns {Promise<Object>} Event wrap-up data
   */
  static async getEventWrapUpData(studioId, eventId, userId) {
    try {
      const eventRef = doc(db, 'studios', studioId, 'events', eventId);
      const eventDoc = await getDoc(eventRef);

      if (!eventDoc.exists()) {
        throw new Error('Event not found');
      }

      const eventData = { id: eventDoc.id, ...eventDoc.data() };
      const isHost = eventData.createdBy === userId;

      // Load participants data
      const subscribers = eventData.subscribers || [];
      const participantsData = await this.loadParticipantsData(subscribers);

      // Get attendance data if available
      let attendanceData = null;
      if (eventData.trackAttendance) {
        attendanceData = await AttendanceService.getEventAttendance(
          studioId,
          eventId
        );
      }

      // Check user's rating status
      const hasRatedHost =
        (!isHost && eventData.guestRatings?.[userId]?.rated) || false;

      // Check user's attendance report status
      const hasReportedAttendance =
        eventData.guestAttendanceReports?.[userId]?.status || null;

      return {
        event: eventData,
        participants: participantsData,
        attendance: attendanceData,
        userStatus: {
          isHost,
          hasRatedHost,
          hasReportedAttendance,
          canRateHost: !isHost && eventData.trackAttendance,
          canReportAttendance: !isHost && eventData.attendanceType === 'casual',
        },
      };
    } catch (error) {
      console.error('Error loading event wrap-up data:', error);
      throw error;
    }
  }

  /**
   * Send event recap notification to host
   * @param {string} studioId - Studio ID
   * @param {string} eventId - Event ID
   * @param {Object} eventData - Event data
   * @returns {Promise<boolean>} Success status
   */
  static async sendEventRecapNotification(studioId, eventId, eventData) {
    try {
      const hostId = eventData.createdBy;

      // Check if event recap is enabled in event settings
      const notificationSettings = eventData.notificationSettings || {};
      if (notificationSettings.eventRecap === false) {
        console.log(`[PostEventService] Event recap disabled for event ${eventId}`);
        return false;
      }

      // Calculate recap stats
      const totalSubscribers = (eventData.subscribers || []).length;
      const attendedCount = eventData.attended || 0;
      const noShowCount = eventData.noShows || 0;

      // Create recap notification data
      const recapData = {
        eventId,
        studioId,
        eventTitle: eventData.title,
        attendedCount,
        noShowCount,
        totalSubscribers,
        eventDate: eventData.dateTime?.toDate?.() || eventData.dateTime,
        completedAt: new Date(),
      };

      // Send recap notification via NotificationEngine
      const result = await notificationEngine.createNotification({
        userId: hostId,
        type: 'event_recap',
        data: recapData,
        priority: 'normal',
      });

      if (result.success) {
        console.log(`[PostEventService] Event recap notification sent for event ${eventId}`);
        return true;
      } else {
        console.warn(`[PostEventService] Failed to send event recap notification: ${result.error}`);
        return false;
      }
    } catch (error) {
      console.error('[PostEventService] Error sending event recap notification:', error);
      return false;
    }
  }

  /**
   * Load participant user data
   * @private
   */
  static async loadParticipantsData(userIds) {
    try {
      const userPromises = userIds.map(async (userId) => {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          return { id: userId, ...userDoc.data() };
        }
        return {
          id: userId,
          userdata: { contactInfo: { displayName: 'Unknown User' } },
        };
      });

      return await Promise.all(userPromises);
    } catch (error) {
      console.error('Error loading participants data:', error);
      return [];
    }
  }

  /**
   * Delete event and clean up post-event data
   * @param {string} studioId - Studio ID
   * @param {string} eventId - Event ID
   * @param {string} userId - User requesting deletion
   * @returns {Promise<boolean>} Success status
   */
  static async deleteEvent(studioId, eventId, userId) {
    try {
      const eventRef = doc(db, 'studios', studioId, 'events', eventId);
      const eventDoc = await getDoc(eventRef);

      if (!eventDoc.exists()) {
        throw new Error('Event not found');
      }

      const eventData = eventDoc.data();

      // Verify permissions (host or admin)
      if (eventData.createdBy !== userId) {
        throw new Error('Only the event host can delete an event');
      }

      // Clean up attendance data
      await AttendanceService.deleteEventAttendance(studioId, eventId);

      // Delete the event document
      await deleteDoc(eventRef);

      console.log(`Event ${eventId} deleted successfully`);
      return true;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  /**
   * Build attendance array according to DATABASE.md schema
   * @private
   */
  static buildAttendanceArray(
    attendeeIds,
    noShowIds,
    hostId,
    eventData,
    timestamp
  ) {
    const attendance = [];
    const allParticipants = [
      ...new Set([...attendeeIds, ...noShowIds, hostId]),
    ];

    allParticipants.forEach((userId) => {
      const attended = attendeeIds.includes(userId);
      const isHost = userId === hostId;

      attendance.push({
        userId,
        attended,
        isHost,
        markedBy: hostId,
        markedAt: timestamp,
        selfReported: false,
        isSoloEvent: AttendanceService.isSoloEvent(eventData),
        eventType: eventData.attendanceType || 'casual',
      });
    });

    return attendance;
  }

  /**
   * Add attendance metrics + reliability updates to batch for atomic operation
   * Attendance credit applies to ALL event types
   * No-show penalties only apply to strict events
   * Solo events (host-only) skip all metrics
   * @private
   */
  static async addReliabilityUpdatesToBatch(
    batch,
    attendeeIds,
    noShowIds,
    eventData,
    eventId
  ) {
    try {
      // Skip solo events — no metrics for host-only events
      if (AttendanceService.isSoloEvent(eventData)) {
        console.log('[PostEventService] Solo event — skipping metrics');
        return;
      }

      // Process no-shows (only for strict events — casual/open don't penalize)
      if (eventData.attendanceType === 'strict') {
        noShowIds.forEach((userId) => {
          const userRef = doc(db, 'users', userId);
          batch.update(userRef, {
            'userdata.metrics.events.noShows': increment(1),
            'userdata.metrics.events.noShowEvents': arrayUnion(eventId),
            'userdata.metrics.events.lastNoShow': Timestamp.now(),
            'userdata.lastUpdated': Timestamp.now(),
          });
        });
      }

      // Process attendees — ALL event types get attendance credit
      attendeeIds.forEach((userId) => {
        const userRef = doc(db, 'users', userId);
        batch.update(userRef, {
          'userdata.metrics.events.attended': increment(1),
          'userdata.metrics.events.attendedEvents': arrayUnion(eventId),
          'userdata.metrics.events.lastAttended': Timestamp.now(),
          'userdata.lastUpdated': Timestamp.now(),
        });
      });
    } catch (error) {
      console.error(
        '[PostEventService] Error adding reliability updates to batch:',
        error
      );
      throw error;
    }
  }
}
