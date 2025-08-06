// utils/notificationUtils.js
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Get events that need notification processing
 * @returns {Promise<Array>} Events with pending notifications
 */
export const getEventsWithPendingNotifications = async () => {
  try {
    const q = query(
      collection(db, 'events'),
      where('changesRequireNotification', '==', true)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching events with pending notifications:', error);
    return [];
  }
};

/**
 * Mark notification as processed for an event
 * @param {string} eventId - Event ID
 */
export const markNotificationProcessed = async (eventId) => {
  try {
    await updateDoc(doc(db, 'events', eventId), {
      changesRequireNotification: false,
      notificationProcessedAt: new Date(),
    });
  } catch (error) {
    console.error('Error marking notification as processed:', error);
  }
};

/**
 * Generate notification message based on changes
 * @param {Object} event - Event object with changes
 * @returns {Object} Notification content
 */
export const generateChangeNotificationContent = (event) => {
  const changes = event.lastChanges || [];
  const eventTitle = event.title || 'Event';

  if (changes.length === 0) {
    return {
      title: `${eventTitle} Updated`,
      body: 'The event details have been updated.',
      priority: 'normal',
    };
  }

  const changeDescriptions = {
    title: 'event name',
    location: 'location',
    details: 'event details',
    datetime: 'date and time',
    capacity: 'guest limit',
  };

  if (changes.length === 1) {
    const change = changeDescriptions[changes[0]] || 'details';
    return {
      title: `${eventTitle} Updated`,
      body: `The ${change} has been changed. Check the latest details!`,
      priority: changes.includes('datetime') ? 'high' : 'normal',
    };
  }

  const changeList = changes.map((c) => changeDescriptions[c] || c).join(', ');
  return {
    title: `${eventTitle} Updated`,
    body: `Multiple changes: ${changeList}. Please review the updated details.`,
    priority: changes.includes('datetime') ? 'high' : 'normal',
  };
};

/**
 * Get user notification preferences (placeholder for future implementation)
 * @param {string} userId - User ID
 * @returns {Object} Notification preferences
 */
export const getUserNotificationPreferences = async (userId) => {
  // Placeholder - return default preferences for now
  return {
    pushNotifications: true,
    emailNotifications: true,
    eventChanges: true,
    eventReminders: true,
    newEvents: false,
  };
};

/**
 * Process pending notifications (to be called by background service)
 * This is the main function that will be called by your notification system
 */
export const processPendingNotifications = async () => {
  try {
    const eventsWithNotifications = await getEventsWithPendingNotifications();

    console.log(
      `Processing ${eventsWithNotifications.length} events with pending notifications`
    );

    for (const event of eventsWithNotifications) {
      const { subscribersToNotify = [] } = event;
      const notificationContent = generateChangeNotificationContent(event);

      console.log(
        `Event "${event.title}": Notifying ${subscribersToNotify.length} users about changes:`,
        event.lastChanges
      );

      // Future implementation will send actual notifications here
      // For now, just log what would be sent
      for (const userId of subscribersToNotify) {
        const userPreferences = await getUserNotificationPreferences(userId);

        if (userPreferences.eventChanges) {
          console.log(`Would notify user ${userId}:`, notificationContent);
          // TODO: Send push notification
          // TODO: Send email notification
          // TODO: Create in-app notification
        }
      }

      // Mark as processed
      await markNotificationProcessed(event.id);
    }

    return { processed: eventsWithNotifications.length };
  } catch (error) {
    console.error('Error processing pending notifications:', error);
    return { error: error.message };
  }
};

/**
 * Utility to manually trigger notification processing (for testing)
 */
export const triggerNotificationProcessing = async () => {
  console.log('Manually triggering notification processing...');
  return await processPendingNotifications();
};
