// FILE: components/notifications/NotificationItem.js

import React, { useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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

  // Reanimated 3 shared values for smooth animations
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  // State for deletion handling
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle swipe delete function
  const handleSwipeDelete = useCallback(async () => {
    if (isDeleting) return; // Prevent double deletion

    setIsDeleting(true);

    try {
      // Call parent's delete handler which will handle the service call
      if (onDelete) {
        await onDelete(notification.id);
      } else {
        // Fallback: direct service call if no parent handler
        await deleteNotification(notification.userId, notification.id);
      }
    } catch (error) {
      console.error('[NotificationItem] Delete failed:', error);

      // Reset position if delete fails with smooth animation
      translateX.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
      });
      opacity.value = withSpring(1, {
        damping: 20,
        stiffness: 300,
      });
      scale.value = withSpring(1, {
        damping: 20,
        stiffness: 300,
      });

      setIsDeleting(false);
      Alert.alert('Error', 'Failed to delete notification');
    }
  }, [isDeleting, onDelete, notification.id, notification.userId, translateX, opacity, scale]);

  // Create a worklet-safe delete function
  const triggerDelete = useCallback(() => {
    handleSwipeDelete();
  }, [handleSwipeDelete]);

  // Modern Reanimated 3 gesture handling with scroll compatibility
  const panGesture = Gesture.Pan()
    .activeOffsetX(10) // Require 10px horizontal movement before activating
    .failOffsetY([-10, 10]) // Fail if vertical movement is too large (allows scroll)
    .onStart(() => {
      // Store initial position when gesture starts
    })
    .onUpdate((event) => {
      // Only allow rightward swipe (positive translation)
      if (event.translationX >= 0) {
        translateX.value = event.translationX;

        // Add subtle visual feedback during swipe
        const progress = Math.min(event.translationX / (screenWidth * 0.15), 1);
        opacity.value = interpolate(
          progress,
          [0, 0.5, 1],
          [1, 0.8, 0.6],
          Extrapolate.CLAMP
        );
        scale.value = interpolate(
          progress,
          [0, 1],
          [1, 0.95],
          Extrapolate.CLAMP
        );
      }
    })
    .onEnd((event) => {
      // Improved threshold: 15% of screen or velocity > 300
      const swipeThreshold = screenWidth * 0.15;
      const velocityThreshold = 300;

      const shouldDelete =
        translateX.value > swipeThreshold ||
        event.velocityX > velocityThreshold;

      if (shouldDelete) {
        // Quick delete animation - start delete immediately
        runOnJS(triggerDelete)();

        // Fast exit animation
        translateX.value = withTiming(screenWidth, { duration: 150 });
        opacity.value = withTiming(0, { duration: 150 });
        scale.value = withTiming(0.8, { duration: 150 });
      } else {
        // Spring back with nice easing
        translateX.value = withSpring(0, {
          damping: 20,
          stiffness: 300,
        });
        opacity.value = withSpring(1, {
          damping: 20,
          stiffness: 300,
        });
        scale.value = withSpring(1, {
          damping: 20,
          stiffness: 300,
        });
      }
    });


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
              // Call parent's delete handler which will handle the service call
              if (onDelete) {
                await onDelete(notification.id);
              } else {
                // Fallback: direct service call if no parent handler
                await deleteNotification(notification.userId, notification.id);
              }
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
          if (onDelete) {
            await onDelete(notification.id);
          } else {
            await deleteNotification(notification.userId, notification.id);
          }
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
          if (onDelete) {
            await onDelete(notification.id);
          } else {
            await deleteNotification(notification.userId, notification.id);
          }
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
            if (onDelete) {
              await onDelete(notification.id);
            } else {
              await deleteNotification(notification.userId, notification.id);
            }
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
      } else if (action.action === 'manage_cohost_notifications') {
        // Navigate to host notification settings for the specific event
        console.log('[NotificationItem] Managing cohost notifications for:', {
          eventId: notification.data.eventId,
          eventTitle: notification.data.eventTitle,
          cohostId: notification.data.cohostId
        });

        // For now, show info that this will be available soon
        // In the future, this would navigate to event-specific host notification settings
        vibeAlert.info(
          'Notification Management',
          `Event-specific notification settings for "${notification.data.eventTitle}" will be available in a future update!\n\nFor now, you can manage your general hosting notification preferences in Settings.`
        );
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
          if (onDelete) {
            await onDelete(notification.id);
          } else {
            await deleteNotification(notification.userId, notification.id);
          }
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

  const handlePress = useCallback(() => {
    // Prevent press during delete animation
    if (isDeleting) return;
    onPress && onPress(notification);
  }, [isDeleting, onPress, notification]);

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
      case 'interest_based_suggestion':
        return '✨';
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

  // Animated styles using Reanimated 3
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { scale: scale.value },
      ],
      opacity: opacity.value,
    };
  });

  // Delete indicator background
  const deleteBackgroundStyle = useAnimatedStyle(() => {
    const progress = Math.min(translateX.value / (screenWidth * 0.15), 1);
    return {
      opacity: interpolate(
        progress,
        [0, 0.3, 1],
        [0, 0.5, 1],
        Extrapolate.CLAMP
      ),
    };
  });

  return (
    <View style={styles.swipeContainer}>
      {/* Delete indicator background */}
      <Animated.View style={[styles.deleteBackground, deleteBackgroundStyle]}>
        <View style={styles.deleteIndicator}>
          <Text style={styles.deleteIcon}>🗑️</Text>
          <Text style={styles.deleteText}>Delete</Text>
        </View>
      </Animated.View>

      {/* Main notification item */}
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[styles.animatedContainer, animatedStyle]}
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
                              : action.action === 'manage_cohost_notifications'
                              ? styles.manageButton
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
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  deleteBackground: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: theme.colors.vibeRed,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    zIndex: 0,
  },
  deleteIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  deleteText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  animatedContainer: {
    position: 'relative',
    zIndex: 1,
    backgroundColor: theme.colors.darkGray,
    borderRadius: 8,
  },
  container: {
    flexDirection: 'row',
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
  manageButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.vibePink,
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
