// Notification batching service for comments
import { doc, updateDoc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../auth/services/firebase';

/**
 * Smart comment notification handler
 * - First comment: Instant notification
 * - Subsequent comments: Batched (just update badge count)
 */
export class CommentNotificationService {
  
  /**
   * Handle new comment notification
   * @param {string} eventId - Event ID
   * @param {string} hostId - Event host user ID  
   * @param {Object} comment - Comment data
   * @param {Object} commenter - User who commented
   */
  static async handleCommentNotification(eventId, hostId, comment, commenter) {
    try {
      // Get event notification settings
      const eventRef = doc(db, 'events', eventId);
      const eventSnap = await getDoc(eventRef);
      
      if (!eventSnap.exists()) {
        console.log('Event not found');
        return;
      }

      const eventData = eventSnap.data();
      const notificationSettings = eventData.notificationSettings || {};

      // Check if host has comment notifications enabled
      if (!notificationSettings.enabled || !notificationSettings.newComments) {
        console.log('Comment notifications disabled for this event');
        return;
      }

      // Check if this is the first comment
      const isFirstComment = await this.isFirstComment(eventId, comment.id);

      if (isFirstComment) {
        // Send instant notification for first comment
        await this.sendInstantNotification(hostId, eventData, comment, commenter);
      } else {
        // Just update the badge count (no additional push notification)
        await this.updateBadgeCount(hostId, eventId);
      }

      // Update event's last notification timestamp
      await updateDoc(eventRef, {
        'notificationData.lastCommentNotification': Timestamp.now(),
        'notificationData.totalCommentNotifications': (eventData.notificationData?.totalCommentNotifications || 0) + 1
      });

    } catch (error) {
      console.error('Error handling comment notification:', error);
    }
  }

  /**
   * Check if this is the first comment on the event
   */
  static async isFirstComment(eventId, commentId) {
    try {
      // Simple check: see if there are any other comments
      // In a real implementation, you'd query the comments collection
      const eventRef = doc(db, 'events', eventId);
      const eventSnap = await getDoc(eventRef);
      
      if (!eventSnap.exists()) return true;
      
      const notificationData = eventSnap.data().notificationData;
      return !notificationData || notificationData.totalCommentNotifications === 0;
      
    } catch (error) {
      console.error('Error checking first comment:', error);
      return true; // Default to true for safety
    }
  }

  /**
   * Send instant push notification (first comment only)
   * This triggers a Cloud Function that handles the actual FCM sending
   */
  static async sendInstantNotification(hostId, eventData, comment, commenter) {
    try {
      console.log('Triggering comment notification:', {
        to: hostId,
        title: `New comment on ${eventData.title}`,
        body: `${commenter.displayName}: ${comment.text.substring(0, 50)}...`,
        eventId: eventData.id
      });

      // Create a notification trigger document that Cloud Functions will pick up
      const notificationTriggerRef = doc(db, 'notificationTriggers', `comment_${eventData.id}_${comment.id}_${Date.now()}`);
      await setDoc(notificationTriggerRef, {
        type: 'comment',
        eventId: eventData.id,
        hostId: hostId,
        comment: {
          id: comment.id,
          text: comment.text.substring(0, 100), // Truncate for notification
          timestamp: comment.timestamp
        },
        commenter: {
          id: commenter.id,
          displayName: commenter.displayName,
          firstName: commenter.firstName
        },
        eventTitle: eventData.title,
        isFirstComment: true,
        createdAt: Timestamp.now(),
        processed: false
      });

      // Update user's notification document for badge counting
      const userNotificationRef = doc(db, 'users', hostId, 'notifications', 'comments');
      await setDoc(userNotificationRef, {
        [`events.${eventData.id}`]: {
          eventTitle: eventData.title,
          lastNotificationSent: Timestamp.now(),
          unreadCount: 1,
          lastComment: {
            text: comment.text,
            author: commenter.displayName,
            timestamp: comment.timestamp
          }
        }
      }, { merge: true });

    } catch (error) {
      console.error('Error sending instant notification:', error);
    }
  }

  /**
   * Update badge count silently (no push notification)
   */
  static async updateBadgeCount(hostId, eventId) {
    try {
      const userNotificationRef = doc(db, 'users', hostId, 'notifications', 'comments');
      const notificationSnap = await getDoc(userNotificationRef);
      
      if (notificationSnap.exists()) {
        const currentData = notificationSnap.data();
        const eventNotifications = currentData.events?.[eventId] || {};
        
        await updateDoc(userNotificationRef, {
          [`events.${eventId}.unreadCount`]: (eventNotifications.unreadCount || 0) + 1,
          [`events.${eventId}.lastActivity`]: Timestamp.now()
        });
      }

      console.log(`Updated badge count for event ${eventId}, host ${hostId}`);
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  }

  /**
   * Mark event comments as read (clears badge)
   */
  static async markCommentsAsRead(userId, eventId) {
    try {
      const userNotificationRef = doc(db, 'users', userId, 'notifications', 'comments');
      await updateDoc(userNotificationRef, {
        [`events.${eventId}.unreadCount`]: 0,
        [`events.${eventId}.lastRead`]: Timestamp.now()
      });

      console.log(`Marked comments as read for event ${eventId}, user ${userId}`);
    } catch (error) {
      console.error('Error marking comments as read:', error);
    }
  }

  /**
   * Get unread comment count for an event
   */
  static async getUnreadCount(userId, eventId) {
    try {
      const userNotificationRef = doc(db, 'users', userId, 'notifications', 'comments');
      const notificationSnap = await getDoc(userNotificationRef);
      
      if (!notificationSnap.exists()) return 0;
      
      const eventNotifications = notificationSnap.data().events?.[eventId];
      return eventNotifications?.unreadCount || 0;
      
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }
}

export default CommentNotificationService;