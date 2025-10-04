// services/scheduled/eventReminderTemplates.js - Event Reminder Templates & Intervals

import { NOTIFICATION_TYPES, NOTIFICATION_PRIORITY } from '../notifications';
import { ScheduledNotificationCore } from './scheduledNotificationCore';

// Reminder intervals (in minutes before event)
export const REMINDER_INTERVALS = {
  ONE_DAY: 24 * 60, // 24 hours
  FOUR_HOURS: 4 * 60, // 4 hours
  ONE_HOUR: 60, // 1 hour
  THIRTY_MINUTES: 30, // 30 minutes
  TEN_MINUTES: 10, // 10 minutes
};

export class EventReminderTemplates {
  /**
   * Map user notification settings to intervals
   * @param {Object} reminderTemplates - User's reminder templates settings (e.g., {'1h': true, '1d': false})
   * @returns {Array} Array of intervals for enabled notifications
   */
  static mapUserSettingsToIntervals(reminderTemplates) {
    const intervals = [];

    if (reminderTemplates['15m']) {
      intervals.push({
        key: '15m',
        minutes: 15,
        title: 'Event Starting in 15 Minutes!',
      });
    }

    if (reminderTemplates['30m']) {
      intervals.push({
        key: '30m',
        minutes: 30,
        title: 'Event Starting in 30 Minutes!',
      });
    }

    if (reminderTemplates['1h']) {
      intervals.push({
        key: '1h',
        minutes: 60,
        title: 'Event Starting Soon!',
      });
    }

    if (reminderTemplates['2h']) {
      intervals.push({
        key: '2h',
        minutes: 120,
        title: 'Event in 2 Hours',
      });
    }

    if (reminderTemplates['1d']) {
      intervals.push({
        key: '1d',
        minutes: 1440, // 24 * 60
        title: 'Event Tomorrow!',
      });
    }

    if (reminderTemplates['1w']) {
      intervals.push({
        key: '1w',
        minutes: 10080, // 7 * 24 * 60
        title: 'Event Next Week!',
      });
    }

    console.log(`[EventReminderTemplates] Mapped ${intervals.length} enabled intervals from user settings`);
    return intervals;
  }

  /**
   * Get default reminder intervals with messages
   */
  static getDefaultIntervals() {
    return [
      {
        key: 'ONE_DAY',
        minutes: REMINDER_INTERVALS.ONE_DAY,
        title: 'Event Tomorrow!',
      },
      {
        key: 'FOUR_HOURS',
        minutes: REMINDER_INTERVALS.FOUR_HOURS,
        title: 'Event in 4 Hours',
      },
      {
        key: 'ONE_HOUR',
        minutes: REMINDER_INTERVALS.ONE_HOUR,
        title: 'Event Starting Soon!',
      },
      {
        key: 'THIRTY_MINUTES',
        minutes: REMINDER_INTERVALS.THIRTY_MINUTES,
        title: 'Event Starting in 30 Minutes!',
      },
      {
        key: 'TEN_MINUTES',
        minutes: REMINDER_INTERVALS.TEN_MINUTES,
        title: 'Event Starting Now!',
      },
    ];
  }

  /**
   * Convert custom templates to interval format
   */
  static convertCustomTemplates(customReminderTemplates) {
    return customReminderTemplates
      .filter((template) => template.enabled)
      .map((template) => {
        let minutes;
        if (template.unit === 'minutes') {
          minutes = template.amount;
        } else if (template.unit === 'hours') {
          minutes = template.amount * 60;
        } else if (template.unit === 'days') {
          minutes = template.amount * 24 * 60;
        } else if (template.unit === 'weeks') {
          minutes = template.amount * 7 * 24 * 60;
        } else if (template.unit === 'months') {
          minutes = template.amount * 30 * 24 * 60; // Approximate 30 days per month
        } else {
          console.warn(`[EventReminderTemplates] Unknown unit: ${template.unit}, defaulting to minutes`);
          minutes = template.amount; // fallback to minutes
        }

        return {
          key: `custom_${template.id || template.label}`,
          minutes,
          title: template.title || `Event Reminder: ${template.label}`,
          message: template.message,
          template,
        };
      });
  }

  /**
   * Schedule event reminder notifications with custom templates
   */
  static async scheduleEventRemindersWithCustomTemplates(
    eventData,
    hostReminderTemplates = {}
  ) {
    try {
      const {
        id: eventId,
        title,
        eventTimestamp,
        subscribers = [],
        createdBy,
      } = eventData;

      if (!eventTimestamp) {
        throw new Error('Event must have a timestamp to schedule reminders');
      }

      const eventTime = eventTimestamp.toDate
        ? eventTimestamp.toDate()
        : new Date(eventTimestamp);
      const notifications = [];

      // Get all users who should receive reminders (subscribers + host)
      const allUsers = Array.from(new Set([...subscribers, createdBy]));

      // Map user settings to intervals - no hardcoded fallback
      console.log('[EventReminderTemplates] Using host reminder settings:', hostReminderTemplates);
      const intervals = this.mapUserSettingsToIntervals(hostReminderTemplates);

      if (intervals.length === 0) {
        console.log('[EventReminderTemplates] No reminder intervals enabled for host - skipping notifications');
        return {
          success: true,
          scheduledCount: 0,
          notifications: [],
        };
      }

      for (const interval of intervals) {
        const reminderTime = new Date(
          eventTime.getTime() - interval.minutes * 60 * 1000
        );

        // Skip if reminder time is in the past
        if (reminderTime <= new Date()) {
          console.log(
            `[EventReminderTemplates] Skipping ${interval.key} reminder for ${eventId} - time has passed`
          );
          continue;
        }

        // Schedule for each user
        for (const userId of allUsers) {
          const customTitle = interval.title || `${interval.title} 🎉`;
          const customMessage =
            interval.message ||
            `"${title}" ${this.getTimeMessage(interval.minutes)}`;

          const scheduleId =
            await ScheduledNotificationCore.scheduleNotification({
              userId,
              eventId,
              type: NOTIFICATION_TYPES.EVENT_REMINDER,
              title: customTitle,
              message: customMessage,
              data: {
                eventId,
                eventTitle: title,
                eventTime: eventTime.toISOString(),
                reminderType: interval.key,
                isHost: userId === createdBy,
                customTemplate: interval.template || null,
              },
              scheduledFor: reminderTime,
              priority:
                interval.minutes <= 60
                  ? NOTIFICATION_PRIORITY.HIGH
                  : NOTIFICATION_PRIORITY.NORMAL,
            });

          notifications.push({
            scheduleId,
            userId,
            reminderType: interval.key,
            scheduledFor: reminderTime,
          });
        }
      }

      return {
        success: true,
        scheduledCount: notifications.length,
        notifications,
      };
    } catch (error) {
      console.error(
        '[EventReminderTemplates] Error scheduling event reminders with custom templates:',
        error
      );
      throw error;
    }
  }

  /**
   * Schedule event reminder notifications for a specific user based on their settings
   */
  static async scheduleEventRemindersForUser(
    eventData,
    userId,
    notificationSettings
  ) {
    try {
      const {
        id: eventId,
        title,
        eventTimestamp,
        studioId,
      } = eventData;

      if (!eventTimestamp) {
        throw new Error('Event must have a timestamp to schedule reminders');
      }

      const eventTime = eventTimestamp.toDate
        ? eventTimestamp.toDate()
        : new Date(eventTimestamp);
      const notifications = [];

      // Determine which reminders to schedule based on user settings
      const remindersToSchedule = [];

      // Default reminder if no templates are set (fallback)
      if (!notificationSettings.reminderTemplates || Object.keys(notificationSettings.reminderTemplates).length === 0) {
        remindersToSchedule.push({
          key: 'DEFAULT_1HOUR',
          minutes: REMINDER_INTERVALS.ONE_HOUR,
          title: 'Event Starting Soon!',
        });
      }

      // Custom reminder templates
      if (notificationSettings.reminderTemplates?.length > 0) {
        const customIntervals = this.convertCustomTemplates(
          notificationSettings.reminderTemplates
        );
        remindersToSchedule.push(...customIntervals);
      }

      // Schedule each reminder
      for (const reminder of remindersToSchedule) {
        const reminderTime = new Date(
          eventTime.getTime() - reminder.minutes * 60 * 1000
        );

        // Skip if reminder time is in the past
        if (reminderTime <= new Date()) {
          console.log(
            `[EventReminderTemplates] Skipping ${reminder.key} reminder for user ${userId} - time has passed`
          );
          continue;
        }

        const scheduleId =
          await ScheduledNotificationCore.scheduleNotification({
            userId,
            eventId,
            type: NOTIFICATION_TYPES.EVENT_REMINDER,
            title: `${reminder.title} 🎉`,
            message: `"${title}" ${this.getTimeMessage(reminder.minutes)}`,
            data: {
              eventId,
              eventTitle: title,
              reminderType: reminder.key,
              minutesBefore: reminder.minutes,
              isCustomTemplate: reminder.key.startsWith('CUSTOM_'),
            },
            scheduledFor: reminderTime,
            priority: NOTIFICATION_PRIORITY.NORMAL,
          });

        if (scheduleId) {
          notifications.push({
            scheduleId,
            userId,
            reminderType: reminder.key,
            reminderTime,
            title: reminder.title,
          });

          console.log(
            `[EventReminderTemplates] Scheduled ${reminder.key} reminder for user ${userId} at ${reminderTime.toISOString()}`
          );
        }
      }

      return {
        success: true,
        eventId,
        userId,
        notificationsScheduled: notifications.length,
        notifications,
      };
    } catch (error) {
      console.error(
        '[EventReminderTemplates] Error scheduling reminders for user:',
        error
      );
      throw error;
    }
  }

  /**
   * Schedule event reminder notifications for an event (legacy method)
   */
  static async scheduleEventReminders(eventData) {
    try {
      const {
        id: eventId,
        title,
        eventTimestamp,
        subscribers = [],
        createdBy,
      } = eventData;

      if (!eventTimestamp) {
        throw new Error('Event must have a timestamp to schedule reminders');
      }

      const eventTime = eventTimestamp.toDate
        ? eventTimestamp.toDate()
        : new Date(eventTimestamp);
      const notifications = [];

      // Get all users who should receive reminders (subscribers + host)
      const allUsers = Array.from(new Set([...subscribers, createdBy]));

      // Schedule reminders for different intervals
      const intervals = this.getDefaultIntervals();

      for (const interval of intervals) {
        const reminderTime = new Date(
          eventTime.getTime() - interval.minutes * 60 * 1000
        );

        // Skip if reminder time is in the past
        if (reminderTime <= new Date()) {
          console.log(
            `[EventReminderTemplates] Skipping ${interval.key} reminder for ${eventId} - time has passed`
          );
          continue;
        }

        // Schedule for each user
        for (const userId of allUsers) {
          const scheduleId =
            await ScheduledNotificationCore.scheduleNotification({
              userId,
              eventId,
              type: NOTIFICATION_TYPES.EVENT_REMINDER,
              title: `${interval.title} 🎉`,
              message: `"${title}" ${this.getTimeMessage(interval.minutes)}`,
              data: {
                eventId,
                eventTitle: title,
                eventTime: eventTime.toISOString(),
                reminderType: interval.key,
                isHost: userId === createdBy,
              },
              scheduledFor: reminderTime,
              priority:
                interval.minutes <= 60
                  ? NOTIFICATION_PRIORITY.HIGH
                  : NOTIFICATION_PRIORITY.NORMAL,
            });

          notifications.push({
            scheduleId,
            userId,
            reminderType: interval.key,
            scheduledFor: reminderTime,
          });
        }
      }

      return {
        success: true,
        scheduledCount: notifications.length,
        notifications,
      };
    } catch (error) {
      console.error(
        '[EventReminderTemplates] Error scheduling event reminders:',
        error
      );
      throw error;
    }
  }

  /**
   * Helper method to get time message
   */
  static getTimeMessage(minutesBefore) {
    if (minutesBefore >= 24 * 60) {
      const days = Math.floor(minutesBefore / (24 * 60));
      return `starts in ${days} day${days > 1 ? 's' : ''}`;
    } else if (minutesBefore >= 60) {
      const hours = Math.floor(minutesBefore / 60);
      return `starts in ${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      return `starts in ${minutesBefore} minutes`;
    }
  }
}

export default EventReminderTemplates;
