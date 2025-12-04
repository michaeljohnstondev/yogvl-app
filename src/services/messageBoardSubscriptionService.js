// FILE: services/messageBoardSubscriptionService.js - Message Board Subscription Management

import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { db } from '../auth/services/firebase';

/**
 * Service for managing message board subscriptions
 * Users are auto-subscribed when they post a comment
 * Users can opt-out/mute notifications per event
 */
class MessageBoardSubscriptionService {
  /**
   * Subscribe a user to message board notifications for an event
   * Called automatically when a user posts a comment
   * @param {string} studioId - Studio ID
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID to subscribe
   */
  async subscribeToMessageBoard(studioId, eventId, userId) {
    try {
      console.log(`[MessageBoardSub] Subscribing user ${userId} to event ${eventId}`);

      const eventRef = doc(db, 'studios', studioId, 'events', eventId);

      // Add user to messageBoardSubscribers array (if not already there)
      // Also remove from muted list if they were previously muted
      await updateDoc(eventRef, {
        messageBoardSubscribers: arrayUnion(userId),
        messageBoardMuted: arrayRemove(userId),
      });

      console.log(`[MessageBoardSub] ✅ Successfully subscribed user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('[MessageBoardSub] Error subscribing to message board:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mute message board notifications for a specific event
   * User will not receive notifications for new comments
   * @param {string} studioId - Studio ID
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID to mute notifications for
   */
  async muteMessageBoardNotifications(studioId, eventId, userId) {
    try {
      console.log(`[MessageBoardSub] Muting notifications for user ${userId} on event ${eventId}`);

      const eventRef = doc(db, 'studios', studioId, 'events', eventId);

      // Add user to muted list (they stay subscribed but won't get notifications)
      await updateDoc(eventRef, {
        messageBoardMuted: arrayUnion(userId),
      });

      console.log(`[MessageBoardSub] ✅ Successfully muted notifications for user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('[MessageBoardSub] Error muting notifications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Unmute message board notifications for a specific event
   * User will start receiving notifications for new comments again
   * @param {string} studioId - Studio ID
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID to unmute notifications for
   */
  async unmuteMessageBoardNotifications(studioId, eventId, userId) {
    try {
      console.log(`[MessageBoardSub] Unmuting notifications for user ${userId} on event ${eventId}`);

      const eventRef = doc(db, 'studios', studioId, 'events', eventId);

      // Remove user from muted list
      await updateDoc(eventRef, {
        messageBoardMuted: arrayRemove(userId),
      });

      console.log(`[MessageBoardSub] ✅ Successfully unmuted notifications for user ${userId}`);
      return { success: true };
    } catch (error) {
      console.error('[MessageBoardSub] Error unmuting notifications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if a user has muted message board notifications for an event
   * @param {string} studioId - Studio ID
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID to check
   * @returns {Promise<boolean>} - True if user has muted notifications
   */
  async isMessageBoardMuted(studioId, eventId, userId) {
    try {
      const eventRef = doc(db, 'studios', studioId, 'events', eventId);
      const eventSnap = await getDoc(eventRef);

      if (!eventSnap.exists()) {
        return false;
      }

      const eventData = eventSnap.data();
      const mutedUsers = eventData.messageBoardMuted || [];

      return mutedUsers.includes(userId);
    } catch (error) {
      console.error('[MessageBoardSub] Error checking mute status:', error);
      return false;
    }
  }

  /**
   * Get all users who should be notified about a new comment
   * Returns subscribers minus those who have muted notifications
   * @param {string} studioId - Studio ID
   * @param {string} eventId - Event ID
   * @param {string} excludeUserId - User ID to exclude (typically the commenter)
   * @returns {Promise<string[]>} - Array of user IDs who should be notified
   */
  async getNotifiableUsers(studioId, eventId, excludeUserId = null) {
    try {
      const eventRef = doc(db, 'studios', studioId, 'events', eventId);
      const eventSnap = await getDoc(eventRef);

      if (!eventSnap.exists()) {
        return [];
      }

      const eventData = eventSnap.data();
      const subscribers = eventData.messageBoardSubscribers || [];
      const mutedUsers = eventData.messageBoardMuted || [];

      // Filter out muted users and the commenter themselves
      let notifiableUsers = subscribers.filter(
        userId => !mutedUsers.includes(userId)
      );

      if (excludeUserId) {
        notifiableUsers = notifiableUsers.filter(
          userId => userId !== excludeUserId
        );
      }

      console.log(`[MessageBoardSub] Found ${notifiableUsers.length} notifiable users for event ${eventId}`);
      return notifiableUsers;
    } catch (error) {
      console.error('[MessageBoardSub] Error getting notifiable users:', error);
      return [];
    }
  }

  /**
   * Get subscription status for a user on an event
   * @param {string} studioId - Studio ID
   * @param {string} eventId - Event ID
   * @param {string} userId - User ID to check
   * @returns {Promise<Object>} - {isSubscribed: boolean, isMuted: boolean}
   */
  async getSubscriptionStatus(studioId, eventId, userId) {
    try {
      const eventRef = doc(db, 'studios', studioId, 'events', eventId);
      const eventSnap = await getDoc(eventRef);

      if (!eventSnap.exists()) {
        return { isSubscribed: false, isMuted: false };
      }

      const eventData = eventSnap.data();
      const subscribers = eventData.messageBoardSubscribers || [];
      const mutedUsers = eventData.messageBoardMuted || [];

      return {
        isSubscribed: subscribers.includes(userId),
        isMuted: mutedUsers.includes(userId),
      };
    } catch (error) {
      console.error('[MessageBoardSub] Error getting subscription status:', error);
      return { isSubscribed: false, isMuted: false };
    }
  }
}

// Export singleton instance
export const messageBoardSubscriptionService = new MessageBoardSubscriptionService();
