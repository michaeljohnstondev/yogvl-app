// FILE: screens/NotificationsScreen.js

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  getUserNotifications,
  markAllNotificationsAsRead,
  deleteNotification,
  NOTIFICATION_TYPES,
} from '../services/notifications';
import { useAuth } from '../auth/AuthContext';
import { useRealtimeNotificationsContext } from '../contexts/RealtimeNotificationsContext';
import NotificationItem from '../components/notifications/NotificationItem';
import VibeAppWrapper from '../components/ui/base/VibeAppWrapper';
import { VibeButton, CloseButton } from '../components/ui';
import ScreenHeader from '../components/ui/layout/ScreenHeader';
import { useVibeAlert } from '../components/ui/base/VibeAlertContext';
import theme from '../theme/themes';

export default function NotificationsScreen({ navigation }) {
  const { currentUserId, userData } = useAuth();
  const vibeAlert = useVibeAlert();

  // Use shared real-time notifications context
  const { notifications, unreadCount, isLoading, error, refreshNotifications } =
    useRealtimeNotificationsContext();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-clear notification badge when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (currentUserId && unreadCount > 0) {
        console.log(`[NotificationsScreen] 🔔 Auto-clearing ${unreadCount} unread notifications`);
        markAllNotificationsAsRead(currentUserId)
          .then(() => {
            console.log('[NotificationsScreen] ✅ Badge cleared successfully');
          })
          .catch((error) => {
            console.error('[NotificationsScreen] ❌ Failed to clear badge:', error);
          });
      }
    }, [currentUserId, unreadCount])
  );

  // Handle real-time errors
  useEffect(() => {
    if (error) {
      console.error('Real-time notifications error:', error);
      vibeAlert.error('Error', 'Failed to load notifications');
    }
  }, [error, vibeAlert]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // With real-time notifications, refresh is automatic, but we can still show the refresh animation
    refreshNotifications();
    setTimeout(() => setIsRefreshing(false), 500); // Brief animation
  }, [refreshNotifications]);

  // Handle notification press (navigate to relevant screen)
  const handleNotificationPress = useCallback(
    (notification) => {
      const { type, data } = notification;

      try {
        switch (type) {
          case NOTIFICATION_TYPES.INVITATION_RECEIVED:
          case NOTIFICATION_TYPES.COHOST_INVITATION:
            // Navigate to event detail for both guest and cohost invitations
            if (data.eventId) {
              console.log(`[NotificationsScreen] 📨 ${type} - navigating to event ${data.eventId}`);
              navigation.navigate('EventDetail', {
                eventId: data.eventId,
                studioId: data.studioId
              });
            }
            break;
          case NOTIFICATION_TYPES.INVITATION_ACCEPTED:
          case NOTIFICATION_TYPES.INVITATION_DECLINED:
          case NOTIFICATION_TYPES.COHOST_ACCEPTED:
            if (data.eventId) {
              navigation.navigate('EventDetail', { eventId: data.eventId });
            }
            break;
          case NOTIFICATION_TYPES.EVENT_JOINED:
          case NOTIFICATION_TYPES.EVENT_LEFT:
          case NOTIFICATION_TYPES.EVENT_UPDATED:
          case NOTIFICATION_TYPES.EVENT_CANCELLED:
          case NOTIFICATION_TYPES.EVENT_REMINDER:
            if (data.eventId) {
              navigation.navigate('EventDetail', { eventId: data.eventId });
            }
            break;
          case NOTIFICATION_TYPES.ATTENDANCE_REMINDER:
            if (data.eventId) {
              navigation.navigate('EventAttendance', {
                eventId: data.eventId,
                eventTitle: data.eventTitle || 'Event',
              });
            }
            break;
          case NOTIFICATION_TYPES.FOLLOW_NOTIFICATION:
          case NOTIFICATION_TYPES.FOLLOW_REQUEST:
          case 'new_follower':
            // Navigate to the follower's user profile
            if (data.followerId) {
              console.log('[NotificationsScreen] 👥 Navigating to follower profile:', data.followerId);
              navigation.navigate('UserProfile', {
                userId: data.followerId,
                userName: data.followerName || 'User',
              });
            }
            break;
          case 'new_comment':
          case 'batch_comments':
          case 'message_board_activity':
          case 'host_comment':
          case 'guest_comment':
            // Navigate to event message board
            if (data.eventId) {
              console.log('[NotificationsScreen] 💬 Navigating to message board:', data.eventId);
              navigation.navigate('MessageBoard', {
                eventId: data.eventId,
                eventTitle: data.eventTitle || 'Event',
              });
            }
            break;
          case NOTIFICATION_TYPES.INTEREST_BASED_SUGGESTION:
            // Navigate to event detail for interest-based suggestions
            if (data.eventId) {
              navigation.navigate('EventDetail', { eventId: data.eventId });
            }
            break;
          default:
            // For system notifications or unknown types, just mark as read
            break;
        }
      } catch (error) {
        console.error('Error handling notification press:', error);
      }
    },
    [navigation]
  );

  // Handle notification delete
  const handleNotificationDelete = useCallback(async (notificationId) => {
    if (!currentUserId) {
      console.error('[NotificationsScreen] Cannot delete: no current user');
      return;
    }

    try {
      console.log(`[NotificationsScreen] Deleting notification ${notificationId}`);

      // Call the actual delete service
      await deleteNotification(currentUserId, notificationId);

      console.log(`[NotificationsScreen] Successfully deleted notification ${notificationId}`);

      // Real-time listeners will automatically update UI after successful deletion
    } catch (error) {
      console.error(`[NotificationsScreen] Failed to delete notification ${notificationId}:`, error);
      vibeAlert.error('Delete Failed', 'Unable to delete notification. Please try again.');
    }
  }, [currentUserId, vibeAlert]);

  // Handle friend request acceptance
  const handleAcceptFriendRequest = useCallback(
    async (notification) => {
      try {
        const { acceptFriendRequest } = await import(
          '../services/shared/userRelationshipsService'
        );
        const { senderId } = notification.data;

        // Accept the friend request
        await acceptFriendRequest(notification.id, currentUserId, senderId);

        // Delete notification after successful acceptance
        await handleNotificationDelete(notification.id);

        vibeAlert.success('Success', 'Friend request accepted! 🎉');
      } catch (error) {
        console.error('Error accepting friend request:', error);
        vibeAlert.error(
          'Error',
          'Failed to accept friend request. Please try again.'
        );
      }
    },
    [currentUserId]
  );

  // Handle friend request decline
  const handleDeclineFriendRequest = useCallback(
    async (notification) => {
      try {
        const { declineFriendRequest } = await import(
          '../services/shared/userRelationshipsService'
        );
        const { senderId } = notification.data;

        // Decline the friend request
        await declineFriendRequest(notification.id, currentUserId, senderId);

        // Delete notification after successful decline
        await handleNotificationDelete(notification.id);

        vibeAlert.info(
          'Friend Request Declined',
          'The friend request has been declined.'
        );
      } catch (error) {
        console.error('Error declining friend request:', error);
        vibeAlert.error(
          'Error',
          'Failed to decline friend request. Please try again.'
        );
      }
    },
    [currentUserId]
  );

  // Handle guest invitation acceptance
  const handleAcceptGuestInvitation = useCallback(
    async (notification) => {
      try {
        const { invitationId, eventId, studioId } = notification.data;

        // Validate required data for guest invitation acceptance
        if (!eventId) {
          throw new Error('Missing eventId in notification data');
        }
        if (!studioId) {
          throw new Error('Missing studioId in notification data');
        }

        console.log(`[NotificationsScreen] Accepting guest invitation for event ${eventId} in studio ${studioId}`);

        // Check if this is an event creation invitation (has studioId) or direct guest invitation
        if (studioId && notification.actions) {
          // Event creation invitation - use invitations.js system
          const { acceptInvitation } = await import(
            '../events/services/invitations'
          );
          await acceptInvitation(invitationId, currentUserId, studioId);
        } else {
          // Direct guest invitation - use guestInvitationsService.js system with correct parameters
          const { acceptGuestInvitation } = await import(
            '../services/shared/guestInvitationsService'
          );
          await acceptGuestInvitation(currentUserId, eventId, studioId); // Fixed parameter order
        }

        // Delete notification after successful acceptance (no longer needed)
        await handleNotificationDelete(notification.id);

        vibeAlert.success('Success', "You're attending this event! 🎉");
      } catch (error) {
        console.error('Error accepting guest invitation:', error);

        // Provide more specific error messages based on the error
        let errorMessage = 'Failed to accept invitation. Please try again.';
        if (error.message?.includes('Event not found')) {
          errorMessage = 'This event is no longer available.';
        } else if (error.message?.includes('Missing')) {
          errorMessage = 'Invalid invitation data. Please try again.';
        }

        vibeAlert.error('Error', errorMessage);
      }
    },
    [currentUserId, vibeAlert, handleNotificationDelete]
  );

  // Handle guest invitation decline
  const handleDeclineGuestInvitation = useCallback(
    async (notification) => {
      try {
        const { invitationId, studioId } = notification.data;

        // Check if this is an event creation invitation (has studioId) or direct guest invitation
        if (studioId && notification.actions) {
          // Event creation invitation - use invitations.js system
          const { declineInvitation } = await import(
            '../events/services/invitations'
          );
          await declineInvitation(invitationId, currentUserId);
        } else {
          // Direct guest invitation - use guestInvitationsService
          const { declineGuestInvitation } = await import(
            '../services/shared/guestInvitationsService'
          );
          await declineGuestInvitation(invitationId, currentUserId);
        }

        // Delete notification after successful decline (no longer needed)
        await handleNotificationDelete(notification.id);

        vibeAlert.info(
          'Invitation Declined',
          'You have declined the invitation.'
        );
      } catch (error) {
        console.error('Error declining guest invitation:', error);
        vibeAlert.error(
          'Error',
          'Failed to decline invitation. Please try again.'
        );
      }
    },
    [currentUserId]
  );

  // Handle cohost invitation acceptance
  const handleAcceptCohostInvitation = useCallback(
    async (notification) => {
      try {
        const { acceptCohostInvitation } = await import(
          '../services/shared/cohostInvitationsService'
        );
        const { eventId } = notification.data;

        // Accept the cohost invitation (invitationId not needed - function will find it by eventId)
        const result = await acceptCohostInvitation(null, currentUserId, eventId);

        // Delete notification after successful acceptance (no longer needed)
        await handleNotificationDelete(notification.id);

        // Ask if they want to view the event details or go home
        vibeAlert.confirm(
          'You\'re Now a Co-Host! ⭐',
          `Would you like to view the event details or return home?`,
          () => {
            // onConfirm - Navigate to EventDetail
            navigation.navigate('EventDetail', {
              eventId,
              studioId: notification.data.studioId || result.newCohost?.studioId
            });
          },
          () => {
            // onCancel - Go home
            navigation.navigate('Home');
          }
        );
      } catch (error) {
        console.error('Error accepting cohost invitation:', error);
        vibeAlert.error(
          'Error',
          'Failed to accept invitation. Please try again.'
        );
      }
    },
    [currentUserId]
  );

  // Handle cohost invitation decline
  const handleDeclineCohostInvitation = useCallback(
    async (notification) => {
      try {
        const { declineCohostInvitation } = await import(
          '../services/shared/cohostInvitationsService'
        );
        const { invitationId } = notification.data;

        // Decline the cohost invitation
        await declineCohostInvitation(invitationId, currentUserId);

        // Delete notification after successful decline
        await handleNotificationDelete(notification.id);

        vibeAlert.info(
          'Invitation Declined',
          'You have declined the co-host invitation.'
        );
      } catch (error) {
        console.error('Error declining cohost invitation:', error);
        vibeAlert.error(
          'Error',
          'Failed to decline invitation. Please try again.'
        );
      }
    },
    [currentUserId]
  );

  // Handle direct join from notification action button
  const handleJoinEventFromNotification = useCallback(
    async (notification) => {
      try {
        const { acceptInvitation } = await import(
          '../events/services/invitations'
        );
        const { invitationId, eventTitle, studioId } = notification.data;

        // Directly accept the invitation with studio context
        await acceptInvitation(invitationId, currentUserId, studioId);

        vibeAlert.success(
          'Joined Event!',
          `You're now attending "${eventTitle}"! 🎉`
        );

        // Optionally navigate to event detail after short delay
        setTimeout(() => {
          handleNotificationPress(notification);
        }, 1500);
      } catch (error) {
        console.error('Error joining event from notification:', error);

        if (error.message.includes('already')) {
          vibeAlert.info(
            'Already Joined',
            `You're already attending this event.`
          );
        } else {
          vibeAlert.error('Error', 'Unable to join event. Please try again.');
        }
      }
    },
    [currentUserId, handleNotificationPress]
  );

  // Handle view event from notification action button
  const handleViewEventFromNotification = useCallback(
    async (notification) => {
      try {
        // Navigate to event detail
        handleNotificationPress(notification);
      } catch (error) {
        console.error('Error viewing event from notification:', error);
      }
    },
    [handleNotificationPress]
  );

  // Render notification item
  const renderNotificationItem = ({ item }) => (
    <NotificationItem
      notification={item}
      onPress={handleNotificationPress}
      onDelete={handleNotificationDelete}
      onAcceptFriendRequest={handleAcceptFriendRequest}
      onDeclineFriendRequest={handleDeclineFriendRequest}
      onAcceptGuestInvitation={handleAcceptGuestInvitation}
      onDeclineGuestInvitation={handleDeclineGuestInvitation}
      onAcceptCohostInvitation={handleAcceptCohostInvitation}
      onDeclineCohostInvitation={handleDeclineCohostInvitation}
      // New handlers for direct notification actions
      onJoinEventFromNotification={handleJoinEventFromNotification}
      onViewEventFromNotification={handleViewEventFromNotification}
      currentUserId={currentUserId}
      userData={userData}
    />
  );

  // Render empty state
  const renderEmptyState = () => {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🔔</Text>
        <Text style={styles.emptyText}>
          No notifications yet.{'\n'}When you receive invitations or event
          updates, they'll appear here.
        </Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScreenHeader
          title="Notifications"
          count={unreadCount}
          onClose={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleDeleteAll = useCallback(async () => {
    if (notifications.length === 0) return;

    vibeAlert.confirm(
      'Delete All Notifications',
      'Are you sure you want to delete all notifications? This cannot be undone.',
      async () => {
        try {
          // Delete all notifications one by one
          const deletePromises = notifications.map(notification =>
            deleteNotification(currentUserId, notification.id)
          );
          await Promise.all(deletePromises);

          refreshNotifications();
        } catch (error) {
          console.error('Error deleting all notifications:', error);
          vibeAlert.error('Error', 'Failed to delete all notifications');
        }
      },
      () => {
        // User cancelled
      }
    );
  }, [currentUserId, notifications, vibeAlert, refreshNotifications]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader
        title="Notifications"
        count={unreadCount}
        onClose={() => navigation.goBack()}
      />
      <View style={styles.content}>
        {/* Notifications list */}
        {notifications.length > 0 ? (
          <FlatList
            data={notifications}
            renderItem={renderNotificationItem}
            keyExtractor={(item) => item.id}
            style={styles.notificationsList}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            // Optimize for performance with many notifications
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            // Ensure smooth scrolling
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.vibeBlue}
                colors={[theme.colors.vibeBlue]}
              />
            }
          />
        ) : (
          <ScrollView
            style={styles.emptyScrollView}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.vibeBlue}
                colors={[theme.colors.vibeBlue]}
              />
            }
          >
            {renderEmptyState()}
          </ScrollView>
        )}
      </View>

      {/* Sticky Delete All Button */}
      {notifications.length > 0 && (
        <View style={styles.stickyButtonContainer}>
          <VibeButton
            label="DELETE ALL"
            onPress={handleDeleteAll}
            variant="filled"
            style={styles.stickyButton}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 20,
    backgroundColor: 'transparent',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: theme.colors.white,
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.gray,
    fontSize: 16,
    fontStyle: 'italic',
  },
  notificationsList: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 120, // Extra bottom spacing for sticky button
  },
  stickyButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
    backgroundColor: theme.colors.background,
    borderTopWidth: 2,
    borderTopColor: theme.colors.vibeBlue,
  },
  stickyButton: {
    width: '100%',
  },
  emptyScrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    minHeight: 400,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    color: theme.colors.gray,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
  },
});
