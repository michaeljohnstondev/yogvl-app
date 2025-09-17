// services/scheduled/scheduledNotificationCore.js - Core Scheduling Service

import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../auth/services/firebase';
import {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITY,
  DELIVERY_CHANNELS,
} from '../notifications';

/**
 * SCHEDULED NOTIFICATION DATA MODEL:
 *
 * Collection: /scheduledNotifications/{scheduleId}
 * ⚠️  SCALABLE APPROACH: Global collection instead of user subcollections
 * This allows efficient querying across ALL users for due notifications
 * {
 *   id: string,
 *   userId: string,
 *   eventId?: string,
 *   type: string, // 'event_reminder', 'event_starting_soon', etc.
 *   title: string,
 *   message: string,
 *   data: object,
 *   scheduledFor: Timestamp, // when to send
 *   createdAt: Timestamp,
 *   status: 'pending' | 'sent' | 'cancelled' | 'failed',
 *   attempts: number,
 *   lastAttemptAt?: Timestamp,
 *   sentAt?: Timestamp,
 * }
 */

export class ScheduledNotificationCore {
  /**
   * Schedule a single notification
   */
  static async scheduleNotification({
    userId,
    eventId = null,
    type,
    title,
    message,
    data = {},
    scheduledFor,
    priority = NOTIFICATION_PRIORITY.NORMAL,
    channels = [DELIVERY_CHANNELS.PUSH],
  }) {
    try {
      const scheduleId = `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      // SCALABLE: Use global collection instead of user subcollections
      const scheduledNotificationRef = doc(
        db,
        'scheduledNotifications',
        scheduleId
      );

      const scheduledNotification = {
        id: scheduleId,
        userId,
        eventId,
        type,
        title,
        message,
        data,
        scheduledFor: Timestamp.fromDate(scheduledFor),
        createdAt: Timestamp.now(),
        status: 'pending',
        attempts: 0,
        priority,
        channels,
      };

      await setDoc(scheduledNotificationRef, scheduledNotification);

      console.log(
        `[ScheduledCore] Scheduled notification ${scheduleId} for ${scheduledFor.toISOString()}`
      );
      return scheduleId;
    } catch (error) {
      console.error('[ScheduledCore] Error scheduling notification:', error);
      throw error;
    }
  }

  /**
   * Generate unique schedule ID
   */
  static generateScheduleId() {
    return `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create notification data structure
   */
  static createNotificationData({
    scheduleId,
    userId,
    eventId,
    type,
    title,
    message,
    data,
    scheduledFor,
    priority,
    channels,
  }) {
    return {
      id: scheduleId,
      userId,
      eventId,
      type,
      title,
      message,
      data,
      scheduledFor: Timestamp.fromDate(scheduledFor),
      createdAt: Timestamp.now(),
      status: 'pending',
      attempts: 0,
      priority,
      channels,
    };
  }

  /**
   * Validate scheduling parameters
   */
  static validateSchedulingParams({
    userId,
    type,
    title,
    message,
    scheduledFor,
  }) {
    if (!userId) {
      throw new Error('userId is required');
    }
    if (!type) {
      throw new Error('type is required');
    }
    if (!title || title.trim().length === 0) {
      throw new Error('title is required');
    }
    if (!message || message.trim().length === 0) {
      throw new Error('message is required');
    }
    if (!scheduledFor || !(scheduledFor instanceof Date)) {
      throw new Error('scheduledFor must be a valid Date');
    }
    if (scheduledFor <= new Date()) {
      throw new Error('scheduledFor must be in the future');
    }
  }
}

export default ScheduledNotificationCore;
