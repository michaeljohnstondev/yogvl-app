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
import {
  getUserNotifications,
  markAllNotificationsAsRead,
  deleteNotification,
  NOTIFICATION_TYPES,
} from '../services/notifications';
import { useAuth } from '../auth/AuthContext';
import { useRealtimeNotificationsContext } from '../contexts/RealtimeNotificationsContext';
import { NotificationItem } from '../components/notifications';
import VibeScreen from '../components/ui/VibeScreen';
import VibeButton from '../components/ui/VibeButton';
import CloseButton from '../components/ui/CloseButton';
import { useVibeAlert } from '../components/ui/VibeAlertContext';
import theme from '../theme/themes';

export default function NotificationsScreen({ navigation }) {
  const { currentUserId, userData } = useAuth();
  const vibeAlert = useVibeAlert();

  // Use shared real-time notifications context
  const { 
    notifications, 
    unreadCount, 
    isLoading, 
    error, 
    refreshNotifications 
  } = useRealtimeNotificationsContext();

  const [isRefreshing, setIsRefreshing] = useState(false);

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
  const handleNotificationPress = useCallback((notification) => {
    const { type, data } = notification;

    try {
      switch (type) {
        case NOTIFICATION_TYPES.INVITATION_RECEIVED:
        case NOTIFICATION_TYPES.COHOST_INVITATION:
          // Navigate to event detail for both guest and cohost invitations
          if (data.eventId) {
            navigation.navigate('EventDetail', { eventId: data.eventId });
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
              eventTitle: data.eventTitle || 'Event'
            });
          }
          break;
        case NOTIFICATION_TYPES.NEW_FOLLOWER:
          // Navigate to the follower's profile or followers list
          if (data.followerId) {
            // For now, just mark as read. Later we can add profile navigation
            console.log('Navigate to follower profile:', data.followerId);
          }
          break;
        default:
          // For system notifications or unknown types, just mark as read
          break;
      }
    } catch (error) {
      console.error('Error handling notification press:', error);
    }
  }, [navigation]);


  // Handle notification delete
  const handleNotificationDelete = useCallback((notificationId) => {
    // With real-time listeners, we don't need to manually update state
    // Firebase will automatically remove the deleted notification
    console.log(`[NotificationsScreen] Notification ${notificationId} deleted`);
  }, []);

  // Handle friend request acceptance
  const handleAcceptFriendRequest = useCallback(async (notification) => {
    try {
      const { acceptFriendRequest } = await import('../services/friendService');
      const { senderId } = notification.data;
      
      // Accept the friend request
      await acceptFriendRequest(notification.id, currentUserId, senderId);
      
      // Delete notification after successful acceptance
      await deleteNotification(notification.id, notification.userId);
      handleNotificationDelete(notification.id);
      
      vibeAlert.success('Success', 'Friend request accepted! 🎉');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      vibeAlert.error('Error', 'Failed to accept friend request. Please try again.');
    }
  }, [currentUserId]);

  // Handle friend request decline
  const handleDeclineFriendRequest = useCallback(async (notification) => {
    try {
      const { declineFriendRequest } = await import('../services/friendService');
      const { senderId } = notification.data;
      
      // Decline the friend request
      await declineFriendRequest(notification.id, currentUserId, senderId);
      
      // Delete notification after successful decline
      await deleteNotification(notification.id, notification.userId);
      handleNotificationDelete(notification.id);
      
      vibeAlert.info('Friend Request Declined', 'The friend request has been declined.');
    } catch (error) {
      console.error('Error declining friend request:', error);
      vibeAlert.error('Error', 'Failed to decline friend request. Please try again.');
    }
  }, [currentUserId]);

  // Handle guest invitation acceptance
  const handleAcceptGuestInvitation = useCallback(async (notification) => {
    try {
      const { invitationId, eventId, studioId } = notification.data;
      
      // Check if this is an event creation invitation (has studioId) or direct guest invitation
      if (studioId && notification.actions) {
        // Event creation invitation - use invitations.js system
        const { acceptInvitation } = await import('../events/services/invitations');
        await acceptInvitation(invitationId, currentUserId, studioId);
      } else {
        // Direct guest invitation - use friendService.js system  
        const { acceptGuestInvitation } = await import('../services/friendService');
        await acceptGuestInvitation(invitationId, currentUserId, eventId);
      }
      
      // Delete notification after successful acceptance (no longer needed)
      await deleteNotification(notification.id, notification.userId);
      handleNotificationDelete(notification.id); // Update UI state
      
      vibeAlert.success('Success', 'You\'re attending this event! 🎉');
    } catch (error) {
      console.error('Error accepting guest invitation:', error);
      vibeAlert.error('Error', 'Failed to accept invitation. Please try again.');
    }
  }, [currentUserId]);

  // Handle guest invitation decline
  const handleDeclineGuestInvitation = useCallback(async (notification) => {
    try {
      const { invitationId, studioId } = notification.data;
      
      // Check if this is an event creation invitation (has studioId) or direct guest invitation
      if (studioId && notification.actions) {
        // Event creation invitation - use invitations.js system
        const { declineInvitation } = await import('../events/services/invitations');
        await declineInvitation(invitationId, currentUserId);
      } else {
        // Direct guest invitation - use friendService.js system
        const { declineGuestInvitation } = await import('../services/friendService');
        await declineGuestInvitation(invitationId, currentUserId);
      }
      
      // Delete notification after successful decline (no longer needed)
      await deleteNotification(notification.id, notification.userId);
      handleNotificationDelete(notification.id); // Update UI state
      
      vibeAlert.info('Invitation Declined', 'You have declined the invitation.');
    } catch (error) {
      console.error('Error declining guest invitation:', error);
      vibeAlert.error('Error', 'Failed to decline invitation. Please try again.');
    }
  }, [currentUserId]);

  // Handle cohost invitation acceptance
  const handleAcceptCohostInvitation = useCallback(async (notification) => {
    try {
      const { acceptCohostInvitation } = await import('../services/friendService');
      const { invitationId, eventId } = notification.data;
      
      // Accept the cohost invitation
      await acceptCohostInvitation(invitationId, currentUserId, eventId);
      
      // Delete notification after successful acceptance (no longer needed)
      await deleteNotification(notification.id, notification.userId);
      handleNotificationDelete(notification.id); // Update UI state
      
      vibeAlert.success('Success', 'You\'re now a co-host for this event! ⭐');
    } catch (error) {
      console.error('Error accepting cohost invitation:', error);
      vibeAlert.error('Error', 'Failed to accept invitation. Please try again.');
    }
  }, [currentUserId]);

  // Handle cohost invitation decline
  const handleDeclineCohostInvitation = useCallback(async (notification) => {
    try {
      const { declineCohostInvitation } = await import('../services/friendService');
      const { invitationId } = notification.data;
      
      // Decline the cohost invitation
      await declineCohostInvitation(invitationId, currentUserId);
      
      // Delete notification after successful decline
      await deleteNotification(notification.id, notification.userId);
      handleNotificationDelete(notification.id);
      
      vibeAlert.info('Invitation Declined', 'You have declined the co-host invitation.');
    } catch (error) {
      console.error('Error declining cohost invitation:', error);
      vibeAlert.error('Error', 'Failed to decline invitation. Please try again.');
    }
  }, [currentUserId]);

  // Handle direct join from notification action button
  const handleJoinEventFromNotification = useCallback(async (notification) => {
    try {
      const { acceptInvitation } = await import('../events/services/invitations');
      const { invitationId, eventTitle, studioId } = notification.data;
      
      // Directly accept the invitation with studio context
      await acceptInvitation(invitationId, currentUserId, studioId);
      
      
      vibeAlert.success('Joined Event!', `You're now attending "${eventTitle}"! 🎉`);
      
      // Optionally navigate to event detail after short delay
      setTimeout(() => {
        handleNotificationPress(notification);
      }, 1500);
      
    } catch (error) {
      console.error('Error joining event from notification:', error);
      
      if (error.message.includes('already')) {
        vibeAlert.info('Already Joined', `You're already attending this event.`);
      } else {
        vibeAlert.error('Error', 'Unable to join event. Please try again.');
      }
    }
  }, [currentUserId, handleNotificationPress]);

  // Handle view event from notification action button
  const handleViewEventFromNotification = useCallback(async (notification) => {
    try {
      // Navigate to event detail
      handleNotificationPress(notification);
      
      
    } catch (error) {
      console.error('Error viewing event from notification:', error);
    }
  }, [handleNotificationPress]);




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
        <Text style={styles.emptyText}>No notifications yet.{'\n'}When you receive invitations or event updates, they'll appear here.</Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        {/* Custom transparent header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Notifications</Text>
          </View>
          <CloseButton onPress={() => navigation.goBack()} />
        </View>
        
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Custom transparent header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <CloseButton onPress={() => navigation.goBack()} />
      </View>
      
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
    </View>
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