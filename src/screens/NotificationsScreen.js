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
  NOTIFICATION_TYPES,
} from '../services/notifications';
import { useAuth } from '../auth/AuthContext';
import { NotificationItem } from '../components/notifications';
import VibeScreen from '../components/ui/VibeScreen';
import VibeButton from '../components/ui/VibeButton';
import { useVibeAlert } from '../components/ui/VibeAlertContext';
import theme from '../theme/themes';

export default function NotificationsScreen({ navigation }) {
  const { currentUserId, userData } = useAuth();
  const vibeAlert = useVibeAlert();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'unread', 'invitations', 'events', 'social'

  // Load notifications
  useEffect(() => {
    if (currentUserId) {
      loadNotifications();
    }
  }, [currentUserId]);

  const loadNotifications = useCallback(async () => {
    if (!currentUserId) return;

    try {
      setIsLoading(true);
      const userNotifications = await getUserNotifications(currentUserId, {
        limitCount: 100,
      });
      setNotifications(userNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      vibeAlert.error('Error', 'Failed to load notifications');
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadNotifications();
    setIsRefreshing(false);
  }, [loadNotifications]);

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

  // Handle notification read
  const handleNotificationRead = useCallback((notificationId) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId
          ? { ...notif, read: true, readAt: new Date() }
          : notif
      )
    );
  }, []);

  // Handle notification delete
  const handleNotificationDelete = useCallback((notificationId) => {
    setNotifications(prev =>
      prev.filter(notif => notif.id !== notificationId)
    );
  }, []);

  // Handle friend request acceptance
  const handleAcceptFriendRequest = useCallback(async (notification) => {
    try {
      const { acceptFriendRequest } = await import('../services/friendService');
      const { senderId } = notification.data;
      
      // Accept the friend request
      await acceptFriendRequest(notification.id, currentUserId, senderId);
      
      // Mark notification as read and update UI
      handleNotificationRead(notification.id);
      
      vibeAlert.success('Success', 'Friend request accepted! 🎉');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      vibeAlert.error('Error', 'Failed to accept friend request. Please try again.');
    }
  }, [currentUserId, handleNotificationRead]);

  // Handle friend request decline
  const handleDeclineFriendRequest = useCallback(async (notification) => {
    try {
      const { declineFriendRequest } = await import('../services/friendService');
      const { senderId } = notification.data;
      
      // Decline the friend request
      await declineFriendRequest(notification.id, currentUserId, senderId);
      
      // Mark notification as read and update UI
      handleNotificationRead(notification.id);
      
      vibeAlert.info('Friend Request Declined', 'The friend request has been declined.');
    } catch (error) {
      console.error('Error declining friend request:', error);
      vibeAlert.error('Error', 'Failed to decline friend request. Please try again.');
    }
  }, [currentUserId, handleNotificationRead]);

  // Handle guest invitation acceptance
  const handleAcceptGuestInvitation = useCallback(async (notification) => {
    try {
      const { acceptGuestInvitation } = await import('../services/friendService');
      const { invitationId, eventId } = notification.data;
      
      // Accept the guest invitation (subscribe to event)
      await acceptGuestInvitation(invitationId, currentUserId, eventId);
      
      // Mark notification as read and update UI
      handleNotificationRead(notification.id);
      
      vibeAlert.success('Success', 'You\'re attending this event! 🎉');
    } catch (error) {
      console.error('Error accepting guest invitation:', error);
      vibeAlert.error('Error', 'Failed to accept invitation. Please try again.');
    }
  }, [currentUserId, handleNotificationRead]);

  // Handle guest invitation decline
  const handleDeclineGuestInvitation = useCallback(async (notification) => {
    try {
      const { declineGuestInvitation } = await import('../services/friendService');
      const { invitationId } = notification.data;
      
      // Decline the guest invitation
      await declineGuestInvitation(invitationId, currentUserId);
      
      // Mark notification as read and update UI
      handleNotificationRead(notification.id);
      
      vibeAlert.info('Invitation Declined', 'You have declined the invitation.');
    } catch (error) {
      console.error('Error declining guest invitation:', error);
      vibeAlert.error('Error', 'Failed to decline invitation. Please try again.');
    }
  }, [currentUserId, handleNotificationRead]);

  // Handle cohost invitation acceptance
  const handleAcceptCohostInvitation = useCallback(async (notification) => {
    try {
      const { acceptCohostInvitation } = await import('../services/friendService');
      const { invitationId, eventId } = notification.data;
      
      // Accept the cohost invitation
      await acceptCohostInvitation(invitationId, currentUserId, eventId);
      
      // Mark notification as read and update UI
      handleNotificationRead(notification.id);
      
      vibeAlert.success('Success', 'You\'re now a co-host for this event! ⭐');
    } catch (error) {
      console.error('Error accepting cohost invitation:', error);
      vibeAlert.error('Error', 'Failed to accept invitation. Please try again.');
    }
  }, [currentUserId, handleNotificationRead]);

  // Handle cohost invitation decline
  const handleDeclineCohostInvitation = useCallback(async (notification) => {
    try {
      const { declineCohostInvitation } = await import('../services/friendService');
      const { invitationId } = notification.data;
      
      // Decline the cohost invitation
      await declineCohostInvitation(invitationId, currentUserId);
      
      // Mark notification as read and update UI
      handleNotificationRead(notification.id);
      
      vibeAlert.info('Invitation Declined', 'You have declined the co-host invitation.');
    } catch (error) {
      console.error('Error declining cohost invitation:', error);
      vibeAlert.error('Error', 'Failed to decline invitation. Please try again.');
    }
  }, [currentUserId, handleNotificationRead]);

  // Mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      const result = await markAllNotificationsAsRead(currentUserId);
      if (result.success) {
        setNotifications(prev =>
          prev.map(notif => ({
            ...notif,
            read: true,
            readAt: new Date(),
          }))
        );
        vibeAlert.success('Success', `Marked ${result.updatedCount} notifications as read`);
      }
    } catch (error) {
      vibeAlert.error('Error', 'Failed to mark all notifications as read');
    }
  }, [currentUserId]);

  // Filter notifications based on active filter
  const filteredNotifications = notifications.filter(notification => {
    switch (activeFilter) {
      case 'unread':
        return !notification.read;
      case 'invitations':
        return [
          NOTIFICATION_TYPES.INVITATION_RECEIVED,
          NOTIFICATION_TYPES.INVITATION_ACCEPTED,
          NOTIFICATION_TYPES.INVITATION_DECLINED,
        ].includes(notification.type);
      case 'events':
        return [
          NOTIFICATION_TYPES.EVENT_JOINED,
          NOTIFICATION_TYPES.EVENT_LEFT,
          NOTIFICATION_TYPES.EVENT_UPDATED,
          NOTIFICATION_TYPES.EVENT_CANCELLED,
          NOTIFICATION_TYPES.EVENT_REMINDER,
          NOTIFICATION_TYPES.ATTENDANCE_REMINDER,
        ].includes(notification.type);
      case 'social':
        return [
          NOTIFICATION_TYPES.NEW_FOLLOWER,
          NOTIFICATION_TYPES.FRIEND_REQUEST, // Legacy
          NOTIFICATION_TYPES.FRIEND_ACCEPTED, // Legacy
        ].includes(notification.type);
      case 'all':
      default:
        return true;
    }
  });

  // Get counts for filter tabs
  const unreadCount = notifications.filter(n => !n.read).length;
  const invitationCount = notifications.filter(n =>
    [NOTIFICATION_TYPES.INVITATION_RECEIVED, NOTIFICATION_TYPES.INVITATION_ACCEPTED, NOTIFICATION_TYPES.INVITATION_DECLINED].includes(n.type)
  ).length;
  const eventCount = notifications.filter(n =>
    [NOTIFICATION_TYPES.EVENT_JOINED, NOTIFICATION_TYPES.EVENT_LEFT, NOTIFICATION_TYPES.EVENT_UPDATED, NOTIFICATION_TYPES.EVENT_CANCELLED, NOTIFICATION_TYPES.EVENT_REMINDER, NOTIFICATION_TYPES.ATTENDANCE_REMINDER].includes(n.type)
  ).length;
  const socialCount = notifications.filter(n =>
    [NOTIFICATION_TYPES.NEW_FOLLOWER, NOTIFICATION_TYPES.FRIEND_REQUEST, NOTIFICATION_TYPES.FRIEND_ACCEPTED].includes(n.type)
  ).length;

  // Render filter button
  const renderFilterButton = (filter, label, count) => {
    const isActive = activeFilter === filter;
    return (
      <TouchableOpacity
        style={[styles.filterButton, isActive && styles.activeFilter]}
        onPress={() => setActiveFilter(filter)}
      >
        <Text style={[styles.filterText, isActive && styles.activeFilterText]}>
          {label} {count > 0 && `(${count})`}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render notification item
  const renderNotificationItem = ({ item }) => (
    <NotificationItem
      notification={item}
      onPress={handleNotificationPress}
      onRead={handleNotificationRead}
      onDelete={handleNotificationDelete}
      onAcceptFriendRequest={handleAcceptFriendRequest}
      onDeclineFriendRequest={handleDeclineFriendRequest}
      onAcceptGuestInvitation={handleAcceptGuestInvitation}
      onDeclineGuestInvitation={handleDeclineGuestInvitation}
      onAcceptCohostInvitation={handleAcceptCohostInvitation}
      onDeclineCohostInvitation={handleDeclineCohostInvitation}
      currentUserId={currentUserId}
      userData={userData}
    />
  );

  // Render empty state
  const renderEmptyState = () => {
    let message = '';
    switch (activeFilter) {
      case 'unread':
        message = "No unread notifications.\nYou're all caught up!";
        break;
      case 'social':
        message = "No social notifications.\nNew followers and social updates will appear here.";
        break;
      case 'invitations':
        message = "No invitation notifications.\nInvitation updates will appear here.";
        break;
      case 'events':
        message = "No event notifications.\nEvent updates and reminders will appear here.";
        break;
      case 'all':
      default:
        message = "No notifications yet.\nWhen you receive invitations or event updates, they'll appear here.";
        break;
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🔔</Text>
        <Text style={styles.emptyText}>{message}</Text>
      </View>
    );
  };

  if (isLoading) {
    return (
      <VibeScreen
        title="Notifications"
        subtitle="Stay updated on your events"
        onBack={() => navigation.goBack()}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      </VibeScreen>
    );
  }

  return (
    <VibeScreen
      title="Notifications"
      subtitle="Stay updated on your events"
      onBack={() => navigation.goBack()}
    >
      <View style={styles.container}>
        {/* Header actions */}
        {notifications.length > 0 && unreadCount > 0 && (
          <View style={styles.headerActions}>
            <VibeButton
              label="Mark All Read"
              onPress={handleMarkAllAsRead}
              style={styles.markAllButton}
              variant="outline"
            />
          </View>
        )}

        {/* Filter tabs */}
        <View style={styles.filterContainer}>
          {renderFilterButton('all', 'All', notifications.length)}
          {renderFilterButton('unread', 'Unread', unreadCount)}
          {renderFilterButton('social', 'Social', socialCount)}
          {renderFilterButton('invitations', 'Invitations', invitationCount)}
          {renderFilterButton('events', 'Events', eventCount)}
        </View>

        {/* Notifications list */}
        {filteredNotifications.length > 0 ? (
          <FlatList
            data={filteredNotifications}
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
    </VibeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.black,
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
  headerActions: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.darkGray,
  },
  markAllButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.darkGray,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: theme.colors.darkGray,
  },
  activeFilter: {
    backgroundColor: theme.colors.vibeBlue,
  },
  filterText: {
    color: theme.colors.gray,
    fontSize: 12,
    fontWeight: '600',
  },
  activeFilterText: {
    color: theme.colors.white,
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