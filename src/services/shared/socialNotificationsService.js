// FILE: socialNotificationsService.js - Social/Follow-Related Notification System

import {
  notificationEngine,
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITY,
} from './NotificationEngine';

/**
 * Notifies user when someone follows them
 * @deprecated This function is deprecated. Follow notifications are now handled
 * automatically by the onUserFollowed Cloud Function when users are added to the
 * followers collection. This manual function is kept for testing and backwards
 * compatibility only.
 * @param {Object} params - Notification parameters
 * @param {string} params.targetUserId - User being followed
 * @param {string} params.followerId - User who followed
 * @param {string} params.followerName - Follower's display name
 * @returns {Promise<Object>} Notification result
 */
export const notifyNewFollower = async ({
  targetUserId,
  followerId,
  followerName,
}) => {
  try {
    if (!targetUserId || !followerId || !followerName) {
      throw new Error(
        'Missing required parameters for new follower notification'
      );
    }

    console.log(
      `[SocialNotifications] Sending new follower notification to ${targetUserId}`
    );

    const notificationId = await notificationEngine.createNotification({
      userId: targetUserId,
      type: NOTIFICATION_TYPES.FOLLOW_REQUEST,
      title: 'New Follower!',
      message: `${followerName} started following you`,
      data: {
        followerId,
        followerName,
        actionType: 'follow',
      },
      priority: NOTIFICATION_PRIORITY.NORMAL,
      senderId: followerId,
    });

    return {
      success: true,
      notificationId,
      message: 'New follower notification sent successfully',
    };
  } catch (error) {
    console.error(
      '[SocialNotifications] Error sending new follower notification:',
      error
    );
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Notifies user when their friend request is accepted
 * @param {Object} params - Notification parameters
 * @param {string} params.requesterId - User who sent the friend request
 * @param {string} params.accepterId - User who accepted the request
 * @param {string} params.accepterName - Accepter's display name
 * @returns {Promise<Object>} Notification result
 */
export const notifyFriendRequestAccepted = async ({
  requesterId,
  accepterId,
  accepterName,
}) => {
  try {
    if (!requesterId || !accepterId || !accepterName) {
      throw new Error(
        'Missing required parameters for friend request accepted notification'
      );
    }

    console.log(
      `[SocialNotifications] Sending friend request accepted notification to ${requesterId}`
    );

    const notificationId = await notificationEngine.createNotification({
      userId: requesterId,
      type: NOTIFICATION_TYPES.FRIEND_ACCEPTED,
      title: 'Friend Request Accepted!',
      message: `${accepterName} accepted your friend request`,
      data: {
        accepterId,
        accepterName,
        actionType: 'friend_accepted',
      },
      priority: NOTIFICATION_PRIORITY.NORMAL,
      senderId: accepterId,
    });

    return {
      success: true,
      notificationId,
      message: 'Friend request accepted notification sent successfully',
    };
  } catch (error) {
    console.error(
      '[SocialNotifications] Error sending friend request accepted notification:',
      error
    );
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Notifies user when they receive a new friend request
 * @param {Object} params - Notification parameters
 * @param {string} params.targetUserId - User receiving the friend request
 * @param {string} params.requesterId - User sending the friend request
 * @param {string} params.requesterName - Requester's display name
 * @returns {Promise<Object>} Notification result
 */
export const notifyFriendRequest = async ({
  targetUserId,
  requesterId,
  requesterName,
}) => {
  try {
    if (!targetUserId || !requesterId || !requesterName) {
      throw new Error(
        'Missing required parameters for friend request notification'
      );
    }

    console.log(
      `[SocialNotifications] Sending friend request notification to ${targetUserId}`
    );

    const notificationId = await notificationEngine.createNotification({
      userId: targetUserId,
      type: NOTIFICATION_TYPES.FRIEND_REQUEST,
      title: 'New Friend Request',
      message: `${requesterName} sent you a friend request`,
      data: {
        requesterId,
        requesterName,
        actionType: 'friend_request',
      },
      priority: NOTIFICATION_PRIORITY.NORMAL,
      senderId: requesterId,
    });

    return {
      success: true,
      notificationId,
      message: 'Friend request notification sent successfully',
    };
  } catch (error) {
    console.error(
      '[SocialNotifications] Error sending friend request notification:',
      error
    );
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Notifies users when they become mutual followers (friends)
 * @param {Object} params - Notification parameters
 * @param {string} params.user1Id - First user ID
 * @param {string} params.user1Name - First user's display name
 * @param {string} params.user2Id - Second user ID
 * @param {string} params.user2Name - Second user's display name
 * @returns {Promise<Object>} Notification results
 */
export const notifyMutualFollow = async ({
  user1Id,
  user1Name,
  user2Id,
  user2Name,
}) => {
  try {
    if (!user1Id || !user1Name || !user2Id || !user2Name) {
      throw new Error(
        'Missing required parameters for mutual follow notification'
      );
    }

    console.log(
      `[SocialNotifications] Sending mutual follow notifications between ${user1Id} and ${user2Id}`
    );

    // Send notification to both users in parallel
    const [notification1, notification2] = await Promise.allSettled([
      notificationEngine.createNotification({
        userId: user1Id,
        type: NOTIFICATION_TYPES.FRIEND_ACCEPTED,
        title: "You're Now Friends!",
        message: `You and ${user2Name} are now mutual followers`,
        data: {
          friendId: user2Id,
          friendName: user2Name,
          actionType: 'mutual_follow',
        },
        priority: NOTIFICATION_PRIORITY.NORMAL,
        senderId: user2Id, // System triggered by user2's action
      }),
      notificationEngine.createNotification({
        userId: user2Id,
        type: NOTIFICATION_TYPES.FRIEND_ACCEPTED,
        title: "You're Now Friends!",
        message: `You and ${user1Name} are now mutual followers`,
        data: {
          friendId: user1Id,
          friendName: user1Name,
          actionType: 'mutual_follow',
        },
        priority: NOTIFICATION_PRIORITY.NORMAL,
        senderId: user1Id, // System triggered by user1's action
      }),
    ]);

    const successCount = [notification1, notification2].filter(
      (result) => result.status === 'fulfilled'
    ).length;

    return {
      success: successCount > 0,
      notificationsSent: successCount,
      message: `Mutual follow notifications sent to ${successCount}/2 users`,
    };
  } catch (error) {
    console.error(
      '[SocialNotifications] Error sending mutual follow notifications:',
      error
    );
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Notifies user when someone mentions them in an event or comment
 * @param {Object} params - Notification parameters
 * @param {string} params.mentionedUserId - User being mentioned
 * @param {string} params.mentionerUserId - User doing the mentioning
 * @param {string} params.mentionerName - Mentioner's display name
 * @param {string} params.context - Where the mention occurred (event, comment, etc.)
 * @param {string} params.contextId - ID of the context (eventId, commentId, etc.)
 * @param {string} params.contextTitle - Title/name of the context
 * @returns {Promise<Object>} Notification result
 */
export const notifyMention = async ({
  mentionedUserId,
  mentionerUserId,
  mentionerName,
  context,
  contextId,
  contextTitle,
}) => {
  try {
    if (!mentionedUserId || !mentionerUserId || !mentionerName || !context) {
      throw new Error('Missing required parameters for mention notification');
    }

    console.log(
      `[SocialNotifications] Sending mention notification to ${mentionedUserId}`
    );

    let message;
    switch (context) {
      case 'event':
        message = `${mentionerName} mentioned you in the event "${contextTitle}"`;
        break;
      case 'comment':
        message = `${mentionerName} mentioned you in a comment`;
        break;
      default:
        message = `${mentionerName} mentioned you`;
    }

    const notificationId = await notificationEngine.createNotification({
      userId: mentionedUserId,
      type: NOTIFICATION_TYPES.FRIEND_REQUEST, // Using closest available type
      title: 'You Were Mentioned!',
      message,
      data: {
        mentionerUserId,
        mentionerName,
        context,
        contextId,
        contextTitle,
        actionType: 'mention',
      },
      priority: NOTIFICATION_PRIORITY.NORMAL,
      senderId: mentionerUserId,
    });

    return {
      success: true,
      notificationId,
      message: 'Mention notification sent successfully',
    };
  } catch (error) {
    console.error(
      '[SocialNotifications] Error sending mention notification:',
      error
    );
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Notifies friends when someone joins/creates a public event
 * This function is called by Cloud Functions when events are created or participants are added
 * @param {Object} params - Notification parameters
 * @param {string} params.friendId - User ID of the friend who joined/created the event
 * @param {string} params.friendName - Display name of the friend
 * @param {string} params.eventId - Event ID
 * @param {string} params.eventTitle - Event title
 * @param {string} params.studioId - Studio ID
 * @param {string} params.activityType - Type of activity: 'joined', 'created', or 'cohosting'
 * @param {string[]} params.recipientIds - Array of friend user IDs to notify
 * @param {Object} params.eventData - Full event data for additional checks
 * @returns {Promise<Object>} Notification result
 */
export const notifyFriendEventActivity = async ({
  friendId,
  friendName,
  eventId,
  eventTitle,
  studioId,
  activityType = 'joined',
  recipientIds = [],
  eventData = {},
}) => {
  try {
    if (!friendId || !friendName || !eventId || !eventTitle || recipientIds.length === 0) {
      throw new Error(
        'Missing required parameters for friend event activity notification'
      );
    }

    // Only notify for public events
    if (eventData.isPrivate) {
      console.log('[SocialNotifications] Skipping notification for private event');
      return {
        success: true,
        notificationsSent: 0,
        message: 'Skipped notification for private event',
      };
    }

    console.log(
      `[SocialNotifications] Sending friend event activity notifications for ${friendName} ${activityType} event ${eventId}`
    );

    // Filter out recipients who are already invited to the event
    // This prevents duplicate notifications (invitation + friend activity)
    const invitedUserIds = (eventData.invitations || []).map(inv => inv.userId || inv);
    const subscribersSet = new Set([
      ...(eventData.subscribers || []),
      ...(eventData.cohosts || []),
      eventData.createdBy
    ]);

    const filteredRecipients = recipientIds.filter((recipientId) => {
      // Skip if user is invited (they'll get an invitation notification instead)
      if (invitedUserIds.includes(recipientId)) {
        console.log(`[SocialNotifications] Skipping ${recipientId} - already invited`);
        return false;
      }
      // Skip if user is already attending (shouldn't happen, but just in case)
      if (subscribersSet.has(recipientId)) {
        console.log(`[SocialNotifications] Skipping ${recipientId} - already attending`);
        return false;
      }
      return true;
    });

    if (filteredRecipients.length === 0) {
      console.log('[SocialNotifications] No eligible recipients after filtering');
      return {
        success: true,
        notificationsSent: 0,
        message: 'All recipients were invited or already attending',
      };
    }

    // Send notifications to all filtered recipients in parallel
    const notificationPromises = filteredRecipients.map((recipientId) =>
      notificationEngine.createNotification({
        userId: recipientId,
        type: NOTIFICATION_TYPES.FRIEND_EVENT_ACTIVITY,
        data: {
          friendId,
          friendName,
          eventId,
          eventTitle,
          studioId,
          activityType,
        },
        priority: NOTIFICATION_PRIORITY.NORMAL,
        senderId: friendId,
      })
    );

    const results = await Promise.allSettled(notificationPromises);
    const successCount = results.filter((result) => result.status === 'fulfilled').length;

    return {
      success: successCount > 0,
      notificationsSent: successCount,
      totalRecipients: filteredRecipients.length,
      message: `Friend event activity notifications sent to ${successCount}/${filteredRecipients.length} users`,
    };
  } catch (error) {
    console.error(
      '[SocialNotifications] Error sending friend event activity notifications:',
      error
    );
    return {
      success: false,
      error: error.message,
    };
  }
};

export default {
  notifyNewFollower,
  notifyFriendRequestAccepted,
  notifyFriendRequest,
  notifyMutualFollow,
  notifyMention,
  notifyFriendEventActivity,
};
