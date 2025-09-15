// services/scheduled/notificationValidator.js - Event Validation & Helper Functions

import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../../auth/services/firebase';

export class NotificationValidator {
  /**
   * Validate event exists and is not cancelled for notification
   */
  static async validateEventForNotification(eventId) {
    try {
      // Check if event exists across all studios using collectionGroup
      const eventQuery = query(
        collection(db, 'events'),
        where('__name__', '==', eventId)
      );

      const snapshot = await getDocs(eventQuery);

      if (snapshot.empty) {
        console.log(`[NotificationValidator] Event ${eventId} not found`);
        return false;
      }

      const eventData = snapshot.docs[0].data();

      // Check if event is cancelled
      if (eventData.cancelled) {
        console.log(`[NotificationValidator] Event ${eventId} is cancelled`);
        return false;
      }

      // Check if event is in the past
      const eventTime = eventData.eventTimestamp.toDate
        ? eventData.eventTimestamp.toDate()
        : new Date(eventData.eventTimestamp);
      if (eventTime < new Date()) {
        console.log(`[NotificationValidator] Event ${eventId} is in the past`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[NotificationValidator] Error validating event:', error);
      return false; // Assume invalid on error
    }
  }

  /**
   * Check if event exists in the database
   */
  static async doesEventExist(eventId) {
    try {
      const eventQuery = query(
        collection(db, 'events'),
        where('__name__', '==', eventId)
      );

      const snapshot = await getDocs(eventQuery);
      return !snapshot.empty;
    } catch (error) {
      console.error('[NotificationValidator] Error checking event existence:', error);
      return false;
    }
  }

  /**
   * Check if event is cancelled
   */
  static async isEventCancelled(eventId) {
    try {
      const eventQuery = query(
        collection(db, 'events'),
        where('__name__', '==', eventId)
      );

      const snapshot = await getDocs(eventQuery);

      if (snapshot.empty) {
        return true; // Consider non-existent events as cancelled
      }

      const eventData = snapshot.docs[0].data();
      return Boolean(eventData.cancelled);
    } catch (error) {
      console.error('[NotificationValidator] Error checking event cancellation:', error);
      return true; // Assume cancelled on error for safety
    }
  }

  /**
   * Check if event is in the past
   */
  static async isEventInPast(eventId) {
    try {
      const eventQuery = query(
        collection(db, 'events'),
        where('__name__', '==', eventId)
      );

      const snapshot = await getDocs(eventQuery);

      if (snapshot.empty) {
        return true; // Consider non-existent events as past
      }

      const eventData = snapshot.docs[0].data();
      const eventTime = eventData.eventTimestamp.toDate
        ? eventData.eventTimestamp.toDate()
        : new Date(eventData.eventTimestamp);

      return eventTime < new Date();
    } catch (error) {
      console.error('[NotificationValidator] Error checking event time:', error);
      return true; // Assume past on error for safety
    }
  }

  /**
   * Get event details for validation
   */
  static async getEventForValidation(eventId) {
    try {
      const eventQuery = query(
        collection(db, 'events'),
        where('__name__', '==', eventId)
      );

      const snapshot = await getDocs(eventQuery);

      if (snapshot.empty) {
        return null;
      }

      const eventData = snapshot.docs[0].data();
      const eventTime = eventData.eventTimestamp.toDate
        ? eventData.eventTimestamp.toDate()
        : new Date(eventData.eventTimestamp);

      return {
        id: eventId,
        title: eventData.title,
        eventTime,
        cancelled: Boolean(eventData.cancelled),
        isInPast: eventTime < new Date(),
        valid: !eventData.cancelled && eventTime >= new Date(),
      };
    } catch (error) {
      console.error('[NotificationValidator] Error getting event details:', error);
      return null;
    }
  }

  /**
   * Validate notification scheduling parameters
   */
  static validateNotificationParams({
    userId,
    type,
    title,
    message,
    scheduledFor,
  }) {
    const errors = [];

    if (!userId || typeof userId !== 'string') {
      errors.push('userId must be a non-empty string');
    }

    if (!type || typeof type !== 'string') {
      errors.push('type must be a non-empty string');
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      errors.push('title must be a non-empty string');
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      errors.push('message must be a non-empty string');
    }

    if (!scheduledFor || !(scheduledFor instanceof Date)) {
      errors.push('scheduledFor must be a valid Date object');
    } else if (scheduledFor <= new Date()) {
      errors.push('scheduledFor must be in the future');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sanitize notification content
   */
  static sanitizeNotificationContent(title, message) {
    const sanitizeText = (text) => {
      if (!text || typeof text !== 'string') return '';

      return text
        .trim()
        .substring(0, 200) // Limit length
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
        .replace(/[<>]/g, ''); // Remove HTML brackets
    };

    return {
      title: sanitizeText(title),
      message: sanitizeText(message),
    };
  }
}

export default NotificationValidator;