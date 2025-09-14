// FILE: components/notifications/NotificationItem.js

import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { deleteNotification } from '../../services/notifications';
import { useVibeAlert } from '../ui/base/VibeAlertContext';
import theme from '../../theme/themes';

const { width: screenWidth } = Dimensions.get('window');

export default function NotificationItem({
  notification,
  onPress,
  onDelete,
  showActions = true,
  onAcceptFriendRequest,
  onDeclineFriendRequest,
  onAcceptGuestInvitation,
  onDeclineGuestInvitation,
  onAcceptCohostInvitation,
  onDeclineCohostInvitation,
  // New handlers for direct notification actions
  onJoinEventFromNotification,
  onViewEventFromNotification,
  currentUserId,
  userData,
}) {
  const vibeAlert = useVibeAlert();
  const translateX = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only respond to horizontal gestures
        return (
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          Math.abs(gestureState.dx) > 10
        );
      },
      onPanResponderGrant: () => {
        // Store the current offset when gesture starts
        lastOffset.current = translateX._value;
      },
      onPanResponderMove: (evt, gestureState) => {
        // Only allow swiping to the right (positive dx) for dismissing
        const newTranslateX = Math.max(0, lastOffset.current + gestureState.dx);
        translateX.setValue(newTranslateX);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const swipeThreshold = screenWidth * 0.3; // 30% of screen width
        const velocity = gestureState.vx;
        const offset = lastOffset.current + gestureState.dx;

        if (offset > swipeThreshold || velocity > 0.5) {
          // Dismiss notification
          Animated.timing(translateX, {
            toValue: screenWidth,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            handleSwipeDelete();
          });
        } else {
          // Snap back to original position
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
          lastOffset.current = 0;
        }
      },
    })
  ).current;

  const handleSwipeDelete = async () => {
    try {
      await deleteNotification(notification.id, notification.userId);
      onDelete && onDelete(notification.id);
    } catch (error) {
      // Reset position if delete fails
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
      lastOffset.current = 0;
      Alert.alert('Error', 'Failed to delete notification');
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteNotification(notification.id, notification.userId);
              onDelete && onDelete(notification.id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete notification');
            }
          },
        },
      ]
    );
  };

  const handleActionPress = async (action) => {
    try {
      if (action.action === 'follow_user') {
        if (!currentUserId || !userData) {
          Alert.alert('Error', 'Unable to complete action');
          return;
        }

        // Import follow service and follow the user
        const { followUser } = await import('../../services/followService');

        console.log('[NotificationItem] Following user:', action.params.userId);

        await followUser(currentUserId, action.params.userId, userData);

        vibeAlert.success(
          'Following',
          `You are now following ${notification.data.followerName}! ✨`
        );

        // Delete notification immediately after successful follow (no confirmation dialog)
        try {
          await deleteNotification(notification.id, notification.userId);
          onDelete && onDelete(notification.id);
        } catch (error) {
          console.error('Failed to delete follow back notification:', error);
        }
      }
    } catch (error) {
      console.error('Error handling notification action:', error);
      if (error.message === 'Already following this user') {
        vibeAlert.info(
          'Already Following',
          `You are already following ${notification.data.followerName}.`
        );
        // Delete notification immediately since it's no longer relevant
        try {
          await deleteNotification(notification.id, notification.userId);
          onDelete && onDelete(notification.id);
        } catch (deleteError) {
          console.error(
            'Failed to delete already-following notification:',
            deleteError
          );
        }
      } else {
        vibeAlert.error('Error', 'Failed to follow user. Please try again.');
      }
    }
  };

  const handleNotificationAction = async (action) => {
    try {
      if (action.action === 'accept_invitation') {
        // Use the parent handler if provided, otherwise handle directly
        if (onJoinEventFromNotification) {
          onJoinEventFromNotification(notification);
        } else {
          // Fallback: directly accept the event invitation
          const { acceptInvitation } = await import(
            '../../events/services/invitations'
          );

          await acceptInvitation(
            action.params.invitationId,
            currentUserId,
            action.params.studioId || notification.data.studioId
          );

          vibeAlert.success(
            'Joined Event!',
            `You're now attending "${notification.data.eventTitle}"! 🎉`
          );

          // Delete notification immediately after successful join (no confirmation dialog)
          try {
            await deleteNotification(notification.id, notification.userId);
            onDelete && onDelete(notification.id);
          } catch (error) {
            console.error(
              'Failed to delete event invitation notification:',
              error
            );
          }

          // Optionally navigate to event detail
          if (onPress) {
            setTimeout(() => {
              onPress(notification);
            }, 500);
          }
        }
      } else if (action.action === 'view_event') {
        // Use the parent handler if provided, otherwise handle directly
        if (onViewEventFromNotification) {
          onViewEventFromNotification(notification);
        } else {
          // Fallback: Navigate to event detail screen
          if (onPress) {
            onPress(notification);
          }
        }
      }
    } catch (error) {
      console.error('Error handling notification action:', error);

      if (
        error.message === 'You are already attending this event' ||
        error.message.includes('already attending')
      ) {
        vibeAlert.info(
          'Already Joined',
          `You're already attending "${notification.data.eventTitle || 'this event'}".`
        );
        // Delete notification immediately since it's no longer relevant
        try {
          await deleteNotification(notification.id, notification.userId);
          onDelete && onDelete(notification.id);
        } catch (deleteError) {
          console.error(
            'Failed to delete already-attending notification:',
            deleteError
          );
        }
      } else {
        vibeAlert.error(
          'Error',
          'Unable to complete action. Please try again.'
        );
      }
    }
  };

  const handlePress = () => {
    onPress && onPress(notification);
  };

  const handleAcceptFriendRequest = async () => {
    try {
      await onAcceptFriendRequest(notification);
    } catch (error) {
      Alert.alert('Error', 'Failed to accept friend request');
    }
  };

  const handleDeclineFriendRequest = async () => {
    try {
      await onDeclineFriendRequest(notification);
    } catch (error) {
      Alert.alert('Error', 'Failed to decline friend request');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'invitation_received':
        return '📬';
      case 'invitation_accepted':
        return '✅';
      case 'invitation_declined':
        return '❌';
      case 'event_joined':
        return '🎉';
      case 'event_left':
        return '👋';
      case 'event_updated':
        return '✏️';
      case 'event_cancelled':
        return '🚫';
      case 'event_reminder':
        return '⏰';
      case 'new_follower':
        return '👥';
      case 'friend_request':
        return '👤'; // DEPRECATED
      case 'friend_accepted':
        return '🤝'; // DEPRECATED
      case 'cohost_invitation':
        return '🎭';
      case 'cohost_accepted':
        return '⭐';
      case 'guest_invitation':
        return '🎉';
      case 'guest_accepted':
        return '🎊';
      case 'system':
        return 'ℹ️';
      default:
        return '📝';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return theme.colors.vibeRed;
      case 'high':
        return theme.colors.vibeOrange;
      case 'normal':
        return theme.colors.vibeBlue;
      case 'low':
        return theme.colors.gray;
      default:
        return theme.colors.vibeBlue;
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  return (
    <View style={styles.swipeContainer}>
      {/* Main notification item */}
      <Animated.View
        style={[
          styles.animatedContainer,
          {
            transform: [{ translateX }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.container}
          onPress={handlePress}
          activeOpacity={0.7}
        >
          {/* Priority indicator */}
          <View
            style={[
              styles.priorityIndicator,
              { backgroundColor: getPriorityColor(notification.priority) },
            ]}
          />

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <Text style={styles.typeIcon}>
                  {getTypeIcon(notification.type)}
                </Text>
                <Text style={styles.title}>{notification.title}</Text>
              </View>
              <Text style={styles.time}>
                {formatTime(notification.createdAt)}
              </Text>
            </View>

            <Text style={styles.message}>{notification.message}</Text>

            {/* Action buttons */}
            {showActions && (
              <View style={styles.actions}>
                {/* Legacy friend request actions (deprecated but kept for existing notifications) */}
                {notification.type === 'friend_request' && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={handleAcceptFriendRequest}
                    >
                      <Text style={styles.actionText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.declineButton]}
                      onPress={handleDeclineFriendRequest}
                    >
                      <Text style={[styles.actionText, styles.declineText]}>
                        Decline
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* New follower actions */}
                {notification.type === 'new_follower' &&
                  (console.log(
                    '[NotificationItem] New follower notification data:',
                    notification.data
                  ) ||
                    notification.data?.actions) && (
                    <>
                      {notification.data.actions.map((action) => (
                        <TouchableOpacity
                          key={action.id}
                          style={[styles.actionButton, styles.followBackButton]}
                          onPress={() => handleActionPress(action)}
                        >
                          <Text
                            style={[styles.actionText, styles.followBackText]}
                          >
                            {action.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}

                {/* Guest invitation actions - using new action system */}
                {notification.type === 'invitation_received' &&
                  notification.actions && (
                    <>
                      {notification.actions.map((action) => (
                        <TouchableOpacity
                          key={action.id}
                          style={[
                            styles.actionButton,
                            action.action === 'accept_invitation'
                              ? styles.acceptButton
                              : styles.viewButton,
                          ]}
                          onPress={() => handleNotificationAction(action)}
                        >
                          <Text
                            style={[
                              styles.actionText,
                              action.action === 'view_event'
                                ? styles.viewText
                                : null,
                            ]}
                          >
                            {action.title}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </>
                  )}

                {/* Legacy guest invitation actions (fallback for old notifications) */}
                {notification.type === 'invitation_received' &&
                  !notification.actions && (
                    <>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.acceptButton]}
                        onPress={() =>
                          onAcceptGuestInvitation &&
                          onAcceptGuestInvitation(notification)
                        }
                      >
                        <Text style={styles.actionText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionButton, styles.declineButton]}
                        onPress={() =>
                          onDeclineGuestInvitation &&
                          onDeclineGuestInvitation(notification)
                        }
                      >
                        <Text style={[styles.actionText, styles.declineText]}>
                          Decline
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}

                {/* Cohost invitation actions */}
                {notification.type === 'cohost_invitation' && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={() => onAcceptCohostInvitation(notification)}
                    >
                      <Text style={styles.actionText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.declineButton]}
                      onPress={() => onDeclineCohostInvitation(notification)}
                    >
                      <Text style={[styles.actionText, styles.declineText]}>
                        Decline
                      </Text>
                    </TouchableOpacity>
                  </>
                )}

                {/* Guest invitation actions */}
                {notification.type === 'guest_invitation' && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={() =>
                        onAcceptGuestInvitation &&
                        onAcceptGuestInvitation(notification)
                      }
                    >
                      <Text style={styles.actionText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.declineButton]}
                      onPress={() =>
                        onDeclineGuestInvitation &&
                        onDeclineGuestInvitation(notification)
                      }
                    >
                      <Text style={[styles.actionText, styles.declineText]}>
                        Decline
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  animatedContainer: {
    position: 'relative',
    zIndex: 1,
  },
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.darkGray,
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  priorityIndicator: {
    width: 4,
    height: '100%',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  typeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  title: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    opacity: 0.8,
  },
  time: {
    color: theme.colors.gray,
    fontSize: 12,
  },
  message: {
    color: theme.colors.white,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    opacity: 0.9,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: theme.colors.vibeBlue,
  },
  acceptButton: {
    backgroundColor: theme.colors.vibeGreen || '#00FF7F',
  },
  declineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.vibeRed,
  },
  viewButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  followBackButton: {
    backgroundColor: theme.colors.vibeBlue,
  },
  followBackText: {
    color: theme.colors.white,
  },
  actionText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  declineText: {
    color: theme.colors.vibeRed,
  },
  viewText: {
    color: theme.colors.vibeBlue,
  },
});
