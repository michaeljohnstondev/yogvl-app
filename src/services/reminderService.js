// FILE: services/reminderService.js - Reminder Management Service

import {
  collection,
  doc,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';

/**
 * Reminder document structure:
 * {
 *   eventId: string,
 *   studioId: string,
 *   userId: string,
 *   reminderTime: Timestamp,
 *   reminderType: '15min' | '1hour' | '1day' | 'custom',
 *   customAmount: number, // For custom reminders (e.g., 2)
 *   customUnit: string,   // For custom reminders (e.g., 'hours')
 *   sent: boolean,
 *   retryCount: number,
 *   eventTitle: string,
 *   eventDateTime: Timestamp,
 *   isHost: boolean,
 *   createdAt: Timestamp
 * }
 */

class ReminderService {
  /**
   * Create reminders for an event based on user's reminder templates
   * @param {Object} eventData - Event data
   * @param {string} userId - User ID (host or attendee)
   * @param {Array} reminderTemplates - User's reminder templates
   * @param {boolean} isHost - Whether this user is the host
   */
  async createRemindersForEvent(
    eventData,
    userId,
    reminderTemplates = [],
    isHost = false
  ) {
    try {
      const { eventId, studioId, title, eventTimestamp } = eventData;

      if (!eventId || !studioId || !eventTimestamp) {
        console.error('[ReminderService] Missing required event data');
        return false;
      }

      const eventDateTime =
        eventTimestamp instanceof Timestamp
          ? eventTimestamp
          : Timestamp.fromDate(new Date(eventTimestamp));

      const reminders = [];

      // Create reminders based on enabled templates
      for (const template of reminderTemplates) {
        if (!template.enabled) continue;

        const reminderTimeMs =
          eventDateTime.toMillis() -
          this.convertToMilliseconds(template.amount, template.unit);
        const reminderTime = Timestamp.fromMillis(reminderTimeMs);

        // Only create reminders for future times
        if (reminderTimeMs > Date.now()) {
          const reminderDoc = {
            eventId,
            studioId,
            userId,
            reminderTime,
            reminderType: this.getReminderType(template),
            customAmount: template.amount,
            customUnit: template.unit,
            sent: false,
            retryCount: 0,
            eventTitle: title,
            eventDateTime,
            isHost,
            createdAt: Timestamp.now(),
          };

          reminders.push(reminderDoc);
        }
      }

      // Batch create reminders
      const reminderPromises = reminders.map((reminder) =>
        addDoc(collection(db, 'reminders'), reminder)
      );

      await Promise.all(reminderPromises);

      console.log(
        `[ReminderService] Created ${reminders.length} reminders for user ${userId}`
      );
      return true;
    } catch (error) {
      console.error('[ReminderService] Failed to create reminders:', error);
      return false;
    }
  }

  /**
   * Delete all reminders for a specific event
   * @param {string} eventId - Event ID
   */
  async deleteRemindersForEvent(eventId) {
    try {
      const q = query(
        collection(db, 'reminders'),
        where('eventId', '==', eventId)
      );
      const querySnapshot = await getDocs(q);

      const deletePromises = querySnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);

      console.log(
        `[ReminderService] Deleted ${querySnapshot.docs.length} reminders for event ${eventId}`
      );
      return true;
    } catch (error) {
      console.error(
        '[ReminderService] Failed to delete reminders for event:',
        error
      );
      return false;
    }
  }

  /**
   * Delete reminders for a specific user on an event
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID
   */
  async deleteRemindersForUser(eventId, userId) {
    try {
      const q = query(
        collection(db, 'reminders'),
        where('eventId', '==', eventId),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);

      const deletePromises = querySnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);

      console.log(
        `[ReminderService] Deleted ${querySnapshot.docs.length} reminders for user ${userId} on event ${eventId}`
      );
      return true;
    } catch (error) {
      console.error(
        '[ReminderService] Failed to delete reminders for user:',
        error
      );
      return false;
    }
  }

  /**
   * Clean up old sent reminders
   * @param {number} daysOld - Delete reminders older than this many days (default: 7)
   */
  async cleanupOldReminders(daysOld = 7) {
    try {
      const cutoffTime = Timestamp.fromMillis(
        Date.now() - daysOld * 24 * 60 * 60 * 1000
      );

      const q = query(
        collection(db, 'reminders'),
        where('sent', '==', true),
        where('createdAt', '<', cutoffTime)
      );

      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map((doc) =>
        deleteDoc(doc.ref)
      );
      await Promise.all(deletePromises);

      console.log(
        `[ReminderService] Cleaned up ${querySnapshot.docs.length} old reminders`
      );
      return querySnapshot.docs.length;
    } catch (error) {
      console.error(
        '[ReminderService] Failed to cleanup old reminders:',
        error
      );
      return 0;
    }
  }

  /**
   * Convert amount and unit to milliseconds
   * @param {number} amount - Amount (e.g., 15, 1, 2)
   * @param {string} unit - Unit ('minutes', 'hours', 'days')
   * @returns {number} - Milliseconds
   */
  convertToMilliseconds(amount, unit) {
    const conversions = {
      minutes: amount * 60 * 1000,
      hours: amount * 60 * 60 * 1000,
      days: amount * 24 * 60 * 60 * 1000,
    };

    return conversions[unit] || 0;
  }

  /**
   * Get standard reminder type from template
   * @param {Object} template - Reminder template
   * @returns {string} - Reminder type
   */
  getReminderType(template) {
    const { amount, unit } = template;

    if (amount === 15 && unit === 'minutes') return '15min';
    if (amount === 1 && unit === 'hours') return '1hour';
    if (amount === 1 && unit === 'days') return '1day';

    return 'custom';
  }
}

// Export singleton instance
export default new ReminderService();
