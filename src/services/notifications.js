// FILE: services/notifications.js - Comprehensive Notification System

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  arrayUnion,
  arrayRemove,
  increment,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../auth/services/firebase';

/**
 * NOTIFICATION DATA MODEL:
 * 
 * Collection: /users/{userId}/notifications/{notificationId}
 * {
 *   id: string,
 *   userId: string, // recipient
 *   type: 'invitation_received' | 'invitation_accepted' | 'invitation_declined' | 
 *         'event_updated' | 'event_cancelled' | 'event_reminder' | 'system',
 *   title: string,
 *   message: string,
 *   data: object, // contextual data (eventId, invitationId, etc.)
 *   read: boolean,
 *   createdAt: Timestamp,
 *   readAt?: Timestamp,
 *   expiresAt?: Timestamp, // optional expiration
 *   priority: 'low' | 'normal' | 'high' | 'urgent',
 *   channels: ['push', 'email', 'sms'], // delivery channels
 *   status: 'pending' | 'sent' | 'delivered' | 'failed',
 * }
 * 
 * User notification preferences:
 * /users/{userId}/notificationPreferences/{settingsId}
 * {
 *   pushNotifications: boolean,
 *   emailNotifications: boolean,
 *   smsNotifications: boolean,
 *   invitations: {
 *     received: boolean,
 *     responses: boolean,
 *   },
 *   events: {
 *     updates: boolean,
 *     reminders: boolean,
 *     cancellations: boolean,
 *   },
 *   quietHours: {
 *     enabled: boolean,
 *     startTime: string, // "22:00"
 *     endTime: string, // "08:00"
 *   },
 * }
 */

// NOTIFICATION TYPES
export const NOTIFICATION_TYPES = {
  INVITATION_RECEIVED: 'invitation_received',
  INVITATION_ACCEPTED: 'invitation_accepted',
  INVITATION_DECLINED: 'invitation_declined',
  EVENT_JOINED: 'event_joined',
  EVENT_LEFT: 'event_left',
  EVENT_UPDATED: 'event_updated',
  EVENT_CANCELLED: 'event_cancelled',
  EVENT_REMINDER: 'event_reminder',
  ATTENDANCE_REMINDER: 'attendance_reminder',
  NEW_FOLLOWER: 'new_follower',
  FRIEND_REQUEST: 'friend_request', // DEPRECATED - keeping for backward compatibility
  FRIEND_ACCEPTED: 'friend_accepted', // DEPRECATED
  COHOST_INVITATION: 'cohost_invitation',
  COHOST_ACCEPTED: 'cohost_accepted',
  SYSTEM: 'system',
};

// NOTIFICATION PRIORITIES
export const NOTIFICATION_PRIORITY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
};

// DELIVERY CHANNELS
export const DELIVERY_CHANNELS = {
  PUSH: 'push',
  EMAIL: 'email',
  SMS: 'sms',
};

/**
 * Create a notification
 */
export const createNotification = async ({
  userId,
  type,
  title,
  message,
  data = {},
  priority = NOTIFICATION_PRIORITY.NORMAL,
  channels = [DELIVERY_CHANNELS.PUSH],
  expiresIn = null, // days from now
}) => {
  try {
    // Validate inputs
    if (!userId || !type || !title || !message) {
      throw new Error('Missing required notification fields');
    }

    // Check user notification preferences
    const preferences = await getUserNotificationPreferences(userId);
    const shouldSend = await shouldSendNotification(type, preferences, channels);
    
    if (!shouldSend.send) {
      console.log(`Notification not sent: ${shouldSend.reason}`);
      return { success: false, reason: shouldSend.reason };
    }

    // Filter channels based on user preferences
    const allowedChannels = channels.filter(channel => {
      switch (channel) {
        case DELIVERY_CHANNELS.PUSH:
          return preferences.pushNotifications;
        case DELIVERY_CHANNELS.EMAIL:
          return preferences.emailNotifications;
        case DELIVERY_CHANNELS.SMS:
          return preferences.smsNotifications;
        default:
          return false;
      }
    });

    if (allowedChannels.length === 0) {
      console.log('No allowed delivery channels for user');
      return { success: false, reason: 'No allowed delivery channels' };
    }

    // Create notification document in user's subcollection
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const notificationRef = doc(db, 'users', userId, 'notifications', notificationId);
    
    const notification = {
      id: notificationId,
      userId,
      type,
      title,
      message,
      data,
      read: false,
      createdAt: Timestamp.now(),
      priority,
      channels: allowedChannels,
      status: 'pending',
    };

    // Add expiration if specified
    if (expiresIn) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresIn);
      notification.expiresAt = Timestamp.fromDate(expiresAt);
    }

    await setDoc(notificationRef, notification);

    // Update user's unread count (create user doc if it doesn't exist)
    const userRef = doc(db, 'users', userId);
    try {
      await updateDoc(userRef, {
        unreadNotifications: increment(1),
      });
    } catch (error) {
      if (error.code === 'not-found') {
        // User document doesn't exist, create it with basic structure
        await setDoc(userRef, {
          uid: userId,
          unreadNotifications: 1,
          userdata: {
            metadata: {
              createdAt: new Date(),
            }
          }
        });
      } else {
        throw error;
      }
    }

    // Send via enabled channels
    await sendNotificationToChannels(notification, allowedChannels);

    return {
      success: true,
      notificationId,
      notification: {
        ...notification,
        createdAt: notification.createdAt.toDate(),
        expiresAt: notification.expiresAt?.toDate(),
      },
    };
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Get notifications for a user
 */
export const getUserNotifications = async (userId, options = {}) => {
  try {
    const {
      unreadOnly = false,
      limitCount = 50,
      types = null, // array of types to filter
    } = options;

    let q = query(
      collection(db, 'users', userId, 'notifications')
    );

    if (unreadOnly) {
      q = query(q, where('read', '==', false));
    }

    if (types && types.length > 0) {
      q = query(q, where('type', 'in', types));
    }

    if (limitCount) {
      q = query(q, limit(limitCount));
    }

    const snapshot = await getDocs(q);
    const notifications = [];

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      notifications.push({
        ...data,
        createdAt: data.createdAt.toDate(),
        readAt: data.readAt?.toDate(),
        expiresAt: data.expiresAt?.toDate(),
      });
    });

    // Sort by createdAt descending (most recent first) since we removed orderBy from query
    notifications.sort((a, b) => b.createdAt - a.createdAt);

    return notifications;
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId, userId) => {
  const batch = writeBatch(db);
  
  try {
    // Get notification to verify ownership and current read status
    const notificationRef = doc(db, 'users', userId, 'notifications', notificationId);
    const notificationDoc = await getDoc(notificationRef);
    
    if (!notificationDoc.exists()) {
      throw new Error('Notification not found');
    }

    const notification = notificationDoc.data();
    
    if (notification.userId !== userId) {
      throw new Error('Unauthorized to mark this notification as read');
    }

    if (notification.read) {
      return { success: true, alreadyRead: true };
    }

    // Mark as read
    batch.update(notificationRef, {
      read: true,
      readAt: Timestamp.now(),
    });

    // Decrease user's unread count
    const userRef = doc(db, 'users', userId);
    batch.update(userRef, {
      unreadNotifications: increment(-1),
    });

    await batch.commit();

    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (userId) => {
  try {
    // Get all unread notifications
    const q = query(
      collection(db, 'users', userId, 'notifications'),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return { success: true, updatedCount: 0 };
    }

    const batch = writeBatch(db);

    // Mark all as read
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        read: true,
        readAt: Timestamp.now(),
      });
    });

    // Reset user's unread count
    const userRef = doc(db, 'users', userId);
    batch.update(userRef, {
      unreadNotifications: 0,
    });

    await batch.commit();

    return { success: true, updatedCount: snapshot.size };
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Delete notification
 */
export const deleteNotification = async (notificationId, userId) => {
  const batch = writeBatch(db);
  
  try {
    // Get notification to verify ownership and read status
    const notificationRef = doc(db, 'users', userId, 'notifications', notificationId);
    const notificationDoc = await getDoc(notificationRef);
    
    if (!notificationDoc.exists()) {
      throw new Error('Notification not found');
    }

    const notification = notificationDoc.data();
    
    if (notification.userId !== userId) {
      throw new Error('Unauthorized to delete this notification');
    }

    // Delete notification
    batch.delete(notificationRef);

    // Decrease unread count if notification was unread
    if (!notification.read) {
      const userRef = doc(db, 'users', userId);
      batch.update(userRef, {
        unreadNotifications: increment(-1),
      });
    }

    await batch.commit();

    return { success: true };
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

/**
 * Clean up expired notifications
 */
export const cleanupExpiredNotifications = async () => {
  // TODO: With per-user subcollections, this would need to query all users
  // For now, expired notifications will be cleaned up when users query their notifications
  try {
    console.log('Expired notification cleanup not implemented for per-user subcollections yet');
    return { success: true, deletedCount: 0 };
  } catch (error) {
    console.error('Error cleaning up expired notifications:', error);
    throw error;
  }
};

// HELPER FUNCTIONS

/**
 * Get user notification preferences
 */
const getUserNotificationPreferences = async (userId) => {
  try {
    const prefsRef = doc(db, 'users', userId, 'notificationPreferences', 'settings');
    const prefsDoc = await getDoc(prefsRef);
    
    if (prefsDoc.exists()) {
      return prefsDoc.data();
    }

    // Return default preferences
    return {
      pushNotifications: true,
      emailNotifications: true,
      smsNotifications: false,
      invitations: {
        received: true,
        responses: true,
      },
      events: {
        updates: true,
        reminders: true,
        cancellations: true,
        attendeeChanges: true,
        attendanceReminders: true,
      },
      friendRequests: {
        received: true,
        responses: true,
      },
      cohostInvitations: {
        received: true,
        responses: true,
      },
      followers: {
        newFollower: true,
      },
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
      },
    };
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    // Return permissive defaults on error
    return {
      pushNotifications: true,
      emailNotifications: false,
      smsNotifications: false,
      invitations: { received: true, responses: false },
      events: { updates: true, reminders: false, cancellations: true, attendeeChanges: true, attendanceReminders: true },
      friendRequests: { received: true, responses: true },
      cohostInvitations: { received: true, responses: true },
      followers: { newFollower: true },
      quietHours: { enabled: false },
    };
  }
};

/**
 * Check if notification should be sent based on preferences
 */
const shouldSendNotification = async (type, preferences, channels) => {
  try {
    // Check type-specific preferences
    switch (type) {
      case NOTIFICATION_TYPES.INVITATION_RECEIVED:
        if (!preferences.invitations?.received) {
          return { send: false, reason: 'User disabled invitation notifications' };
        }
        break;
      case NOTIFICATION_TYPES.INVITATION_ACCEPTED:
      case NOTIFICATION_TYPES.INVITATION_DECLINED:
        if (!preferences.invitations?.responses) {
          return { send: false, reason: 'User disabled invitation response notifications' };
        }
        break;
      case NOTIFICATION_TYPES.EVENT_JOINED:
      case NOTIFICATION_TYPES.EVENT_LEFT:
        if (!preferences.events?.attendeeChanges) {
          return { send: false, reason: 'User disabled attendee change notifications' };
        }
        break;
      case NOTIFICATION_TYPES.EVENT_UPDATED:
        if (!preferences.events?.updates) {
          return { send: false, reason: 'User disabled event update notifications' };
        }
        break;
      case NOTIFICATION_TYPES.EVENT_CANCELLED:
        if (!preferences.events?.cancellations) {
          return { send: false, reason: 'User disabled event cancellation notifications' };
        }
        break;
      case NOTIFICATION_TYPES.EVENT_REMINDER:
        if (!preferences.events?.reminders) {
          return { send: false, reason: 'User disabled event reminder notifications' };
        }
        break;
      case NOTIFICATION_TYPES.ATTENDANCE_REMINDER:
        if (!preferences.events?.attendanceReminders) {
          return { send: false, reason: 'User disabled attendance reminder notifications' };
        }
        break;
      case NOTIFICATION_TYPES.NEW_FOLLOWER:
        if (!preferences.followers?.newFollower) {
          return { send: false, reason: 'User disabled new follower notifications' };
        }
        break;
      case NOTIFICATION_TYPES.FRIEND_REQUEST:
        if (!preferences.friendRequests?.received) {
          return { send: false, reason: 'User disabled friend request notifications' };
        }
        break;
      case NOTIFICATION_TYPES.FRIEND_ACCEPTED:
        if (!preferences.friendRequests?.responses) {
          return { send: false, reason: 'User disabled friend request response notifications' };
        }
        break;
      case NOTIFICATION_TYPES.COHOST_INVITATION:
        if (!preferences.cohostInvitations?.received) {
          return { send: false, reason: 'User disabled cohost invitation notifications' };
        }
        break;
      case NOTIFICATION_TYPES.COHOST_ACCEPTED:
        if (!preferences.cohostInvitations?.responses) {
          return { send: false, reason: 'User disabled cohost invitation response notifications' };
        }
        break;
    }

    // Check quiet hours
    if (preferences.quietHours?.enabled) {
      const now = new Date();
      const currentTime = now.toTimeString().substr(0, 5); // "HH:MM"
      const { startTime, endTime } = preferences.quietHours;
      
      if (isInQuietHours(currentTime, startTime, endTime)) {
        // Only allow urgent notifications during quiet hours
        const hasUrgentChannel = channels.includes(DELIVERY_CHANNELS.PUSH);
        if (!hasUrgentChannel || type !== NOTIFICATION_TYPES.EVENT_CANCELLED) {
          return { send: false, reason: 'User in quiet hours' };
        }
      }
    }

    return { send: true };
  } catch (error) {
    console.error('Error checking notification preferences:', error);
    return { send: true }; // Default to sending on error
  }
};

/**
 * Check if current time is in quiet hours
 */
const isInQuietHours = (currentTime, startTime, endTime) => {
  const current = timeToMinutes(currentTime);
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  if (start <= end) {
    // Same day (e.g., 22:00 to 23:59)
    return current >= start && current <= end;
  } else {
    // Overnight (e.g., 22:00 to 08:00)
    return current >= start || current <= end;
  }
};

/**
 * Convert time string to minutes since midnight
 */
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Send notification to delivery channels
 */
const sendNotificationToChannels = async (notification, channels) => {
  const results = [];

  for (const channel of channels) {
    try {
      let result;
      switch (channel) {
        case DELIVERY_CHANNELS.PUSH:
          result = await sendPushNotification(notification);
          break;
        case DELIVERY_CHANNELS.EMAIL:
          result = await sendEmailNotification(notification);
          break;
        case DELIVERY_CHANNELS.SMS:
          result = await sendSMSNotification(notification);
          break;
        default:
          result = { success: false, error: 'Unknown channel' };
      }
      results.push({ channel, ...result });
    } catch (error) {
      console.error(`Error sending ${channel} notification:`, error);
      results.push({ channel, success: false, error: error.message });
    }
  }

  // Update notification status based on results
  const allSuccessful = results.every(r => r.success);
  const anySuccessful = results.some(r => r.success);
  
  const status = allSuccessful ? 'delivered' : anySuccessful ? 'sent' : 'failed';
  
  const notificationRef = doc(db, 'users', notification.userId, 'notifications', notification.id);
  await updateDoc(notificationRef, {
    status,
    deliveryResults: results,
    sentAt: Timestamp.now(),
  });

  return results;
};

/**
 * Send push notification (placeholder - integrate with Firebase Cloud Messaging)
 */
const sendPushNotification = async (notification) => {
  try {
    // TODO: Integrate with Firebase Cloud Messaging
    console.log('Push notification sent:', notification.title);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Send email notification
 */
const sendEmailNotification = async (notification) => {
  try {
    const { sendInvitationEmail, sendEventUpdateEmail, sendEventReminderEmail } = await import('./emailService');
    
    // Get user email
    const userDoc = await getDoc(doc(db, 'users', notification.userId));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    const userEmail = userData.email;
    
    if (!userEmail) {
      throw new Error('User email not found');
    }

    let result;
    
    switch (notification.type) {
      case NOTIFICATION_TYPES.INVITATION_RECEIVED:
        // Get event and host data from notification data
        const eventDoc = await getDoc(doc(db, 'events', notification.data.eventId));
        const hostDoc = await getDoc(doc(db, 'users', notification.data.hostId));
        
        if (eventDoc.exists() && hostDoc.exists()) {
          result = await sendInvitationEmail({
            recipientEmail: userEmail,
            recipientName: userData.displayName,
            eventData: eventDoc.data(),
            hostData: hostDoc.data(),
            invitationData: { id: notification.data.invitationId },
            customMessage: notification.data.customMessage || '',
          });
        }
        break;
        
      case NOTIFICATION_TYPES.EVENT_UPDATED:
        if (notification.data.eventId) {
          const eventDoc = await getDoc(doc(db, 'events', notification.data.eventId));
          if (eventDoc.exists()) {
            result = await sendEventUpdateEmail({
              recipientEmail: userEmail,
              recipientName: userData.displayName,
              eventData: eventDoc.data(),
              changes: notification.data.changes || [],
            });
          }
        }
        break;
        
      case NOTIFICATION_TYPES.EVENT_REMINDER:
        if (notification.data.eventId) {
          const eventDoc = await getDoc(doc(db, 'events', notification.data.eventId));
          if (eventDoc.exists()) {
            result = await sendEventReminderEmail({
              recipientEmail: userEmail,
              recipientName: userData.displayName,
              eventData: eventDoc.data(),
              reminderType: notification.data.reminderType || '24h',
            });
          }
        }
        break;
        
      default:
        // For other notification types, don't send email
        console.log(`Email not supported for notification type: ${notification.type}`);
        return { success: true, skipped: true };
    }
    
    if (result) {
      console.log('Email notification sent:', notification.title);
      return result;
    } else {
      return { success: false, error: 'Failed to send email' };
    }
    
  } catch (error) {
    console.error('Email notification error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send SMS notification (placeholder - integrate with SMS service)
 */
const sendSMSNotification = async (notification) => {
  try {
    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log('SMS notification sent:', notification.title);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// EVENT-SPECIFIC NOTIFICATION HELPERS

/**
 * Notify host when someone joins their event
 */
export const notifyHostOfEventJoin = async ({ eventId, eventTitle, hostId, joinedUserId, joinedUserName }) => {
  try {
    // Don't notify if host joins their own event
    if (hostId === joinedUserId) {
      return { success: true, skipped: true, reason: 'Host joined own event' };
    }

    return await createNotification({
      userId: hostId,
      type: NOTIFICATION_TYPES.EVENT_JOINED,
      title: 'New Event Attendee! 🎉',
      message: `${joinedUserName} just joined your event "${eventTitle}"`,
      data: {
        eventId,
        eventTitle,
        joinedUserId,
        joinedUserName,
        timestamp: new Date().toISOString(),
      },
      priority: NOTIFICATION_PRIORITY.NORMAL,
      channels: [DELIVERY_CHANNELS.PUSH],
    });
  } catch (error) {
    console.error('Error notifying host of event join:', error);
    throw error;
  }
};

/**
 * Notify host when someone leaves their event
 */
export const notifyHostOfEventLeave = async ({ eventId, eventTitle, hostId, leftUserId, leftUserName }) => {
  try {
    // Don't notify if host leaves their own event
    if (hostId === leftUserId) {
      return { success: true, skipped: true, reason: 'Host left own event' };
    }

    return await createNotification({
      userId: hostId,
      type: NOTIFICATION_TYPES.EVENT_LEFT,
      title: 'Attendee Left Event',
      message: `${leftUserName} left your event "${eventTitle}"`,
      data: {
        eventId,
        eventTitle,
        leftUserId,
        leftUserName,
        timestamp: new Date().toISOString(),
      },
      priority: NOTIFICATION_PRIORITY.LOW,
      channels: [DELIVERY_CHANNELS.PUSH],
    });
  } catch (error) {
    console.error('Error notifying host of event leave:', error);
    throw error;
  }
};

/**
 * Notify user when they receive a friend request
 */
export const notifyFriendRequest = async ({ recipientId, senderId, senderName }) => {
  try {
    return await createNotification({
      userId: recipientId,
      type: NOTIFICATION_TYPES.FRIEND_REQUEST,
      title: 'New Friend Request',
      message: `${senderName} sent you a friend request`,
      data: {
        senderId,
        senderName,
        timestamp: new Date().toISOString(),
      },
      priority: NOTIFICATION_PRIORITY.NORMAL,
      channels: [DELIVERY_CHANNELS.PUSH],
    });
  } catch (error) {
    console.error('Error notifying friend request:', error);
    throw error;
  }
};

/**
 * Notify user when their friend request is accepted
 */
export const notifyFriendAccepted = async ({ senderId, accepterId, accepterName }) => {
  try {
    return await createNotification({
      userId: senderId,
      type: NOTIFICATION_TYPES.FRIEND_ACCEPTED,
      title: 'Friend Request Accepted',
      message: `${accepterName} accepted your friend request`,
      data: {
        accepterId,
        accepterName,
        timestamp: new Date().toISOString(),
      },
      priority: NOTIFICATION_PRIORITY.NORMAL,
      channels: [DELIVERY_CHANNELS.PUSH],
    });
  } catch (error) {
    console.error('Error notifying friend accepted:', error);
    throw error;
  }
};

/**
 * Notify user when they're invited to co-host an event
 */
export const notifyCohostInvitation = async ({ recipientId, inviterId, inviterName, eventId, eventTitle }) => {
  try {
    return await createNotification({
      userId: recipientId,
      type: NOTIFICATION_TYPES.COHOST_INVITATION,
      title: 'Co-host Invitation',
      message: `${inviterName} invited you to co-host "${eventTitle}"`,
      data: {
        inviterId,
        inviterName,
        eventId,
        eventTitle,
        timestamp: new Date().toISOString(),
      },
      priority: NOTIFICATION_PRIORITY.HIGH,
      channels: [DELIVERY_CHANNELS.PUSH],
    });
  } catch (error) {
    console.error('Error notifying cohost invitation:', error);
    throw error;
  }
};

/**
 * Notify user when their co-host invitation is accepted
 */
export const notifyCohostAccepted = async ({ inviterId, accepterId, accepterName, eventId, eventTitle }) => {
  try {
    return await createNotification({
      userId: inviterId,
      type: NOTIFICATION_TYPES.COHOST_ACCEPTED,
      title: 'Co-host Invitation Accepted',
      message: `${accepterName} accepted your co-host invitation for "${eventTitle}"`,
      data: {
        accepterId,
        accepterName,
        eventId,
        eventTitle,
        timestamp: new Date().toISOString(),
      },
      priority: NOTIFICATION_PRIORITY.NORMAL,
      channels: [DELIVERY_CHANNELS.PUSH],
    });
  } catch (error) {
    console.error('Error notifying cohost accepted:', error);
    throw error;
  }
};

/**
 * Notify user when they're invited as a guest to an event
 */
export const notifyGuestInvitation = async ({ recipientId, inviterId, inviterName, eventId, eventTitle, invitationId }) => {
  try {
    return await createNotification({
      userId: recipientId,
      type: NOTIFICATION_TYPES.INVITATION_RECEIVED,
      title: 'Event Invitation',
      message: `${inviterName} invited you to "${eventTitle}"`,
      data: {
        inviterId,
        inviterName,
        eventId,
        eventTitle,
        invitationId,
        timestamp: new Date().toISOString(),
      },
      priority: NOTIFICATION_PRIORITY.HIGH,
      channels: [DELIVERY_CHANNELS.PUSH],
    });
  } catch (error) {
    console.error('Error notifying guest invitation:', error);
    throw error;
  }
};

/**
 * Notify user when their guest invitation is accepted
 */
export const notifyGuestAccepted = async ({ inviterId, accepterId, accepterName, eventId, eventTitle }) => {
  try {
    return await createNotification({
      userId: inviterId,
      type: NOTIFICATION_TYPES.INVITATION_ACCEPTED,
      title: 'Invitation Accepted',
      message: `${accepterName} is attending "${eventTitle}"`,
      data: {
        accepterId,
        accepterName,
        eventId,
        eventTitle,
        timestamp: new Date().toISOString(),
      },
      priority: NOTIFICATION_PRIORITY.NORMAL,
      channels: [DELIVERY_CHANNELS.PUSH],
    });
  } catch (error) {
    console.error('Error notifying guest accepted:', error);
    throw error;
  }
};

/**
 * Notify user when they get a new follower
 */
export const notifyNewFollower = async ({ targetUserId, followerId, followerName }) => {
  try {
    // Check if target is already following back (mutual follow = new friend)
    const { checkIfFollowing } = await import('./followService');
    const isAlreadyFollowing = await checkIfFollowing(targetUserId, followerId);
    
    if (isAlreadyFollowing) {
      // Mutual follow - create "New Friend" notification instead
      return await createNotification({
        userId: targetUserId,
        type: NOTIFICATION_TYPES.NEW_FOLLOWER,
        title: 'New Friend',
        message: `You and ${followerName} are now friends!`,
        data: {
          followerId,
          followerName,
          timestamp: new Date().toISOString(),
          isMutual: true,
        },
        priority: NOTIFICATION_PRIORITY.NORMAL,
        channels: [DELIVERY_CHANNELS.PUSH],
      });
    } else {
      // Regular follow - show follow back button
      return await createNotification({
        userId: targetUserId,
        type: NOTIFICATION_TYPES.NEW_FOLLOWER,
        title: 'New Follower',
        message: `${followerName} started following you`,
        data: {
          followerId,
          followerName,
          timestamp: new Date().toISOString(),
          actions: [
            {
              id: 'follow_back',
              label: 'Follow Back',
              type: 'primary',
              action: 'follow_user',
              params: { userId: followerId }
            }
          ]
        },
        priority: NOTIFICATION_PRIORITY.LOW,
        channels: [DELIVERY_CHANNELS.PUSH],
      });
    }
  } catch (error) {
    console.error('Error notifying new follower:', error);
    throw error;
  }
};

