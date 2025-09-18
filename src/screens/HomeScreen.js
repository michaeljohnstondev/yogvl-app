import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  BackHandler,
  RefreshControl,
} from 'react-native';
import {
  VibeButton,
  VibeLoadingScreen,
  VibeCarousel,
} from '../components/ui/base';
import {
  ProfileAvatar,
  EmptyStateView,
  AccountSettingsDropdown,
  BannedUserModal,
  AdminNotificationModal,
} from '../components/ui';
import { useVibeAlert } from '../components/ui/base/VibeAlertContext';
import EventCard from '../events/components/EventCard';
import NotificationButton from '../components/notifications/NotificationButton';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../auth/services/firebase';
import { useAuth } from '../auth/AuthContext';
import { getEventFeed } from '../services/feedService';
import { hasAdminAccess } from '../services/adminService';
import { banEnforcementService } from '../services/banEnforcementService';
import { adminNotificationService } from '../services/adminNotificationService';
import { globalAdminService } from '../services/globalAdminService';
import theme from '../theme/themes';

export default function HomeScreen({ navigation }) {
  const [myEvents, setMyEvents] = useState([]);
  const [followedEvents, setFollowedEvents] = useState([]);
  const [suggestedEvents, setSuggestedEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);

  // Ban enforcement state
  const [banStatus, setBanStatus] = useState(null);
  const [showBannedModal, setShowBannedModal] = useState(false);
  const [checkingBanStatus, setCheckingBanStatus] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [feedStats, setFeedStats] = useState(null);

  // Admin notifications state
  const [currentNotification, setCurrentNotification] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Get auth and alert context
  const { currentUserId, userData, isAuthenticated } = useAuth();
  const vibeAlert = useVibeAlert();

  // Ref for ScrollView to enable simultaneous gesture handling
  const scrollViewRef = useRef(null);

  // Memoize static components to prevent unnecessary re-renders
  const bellIcon = useMemo(() => <Text style={styles.bellIcon}>🔔</Text>, []);
  const handleNotificationsPress = useCallback(
    () => navigation.navigate('Notifications'),
    [navigation]
  );

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEventFeed(true);
    setRefreshing(false);
  }, [loadEventFeed]);

  // Load follow-based event feed
  const loadEventFeed = useCallback(async (isRefresh = false) => {
    const defaultStudio = userData?.userdata?.studios?.default;
    if (!defaultStudio?.studioId || !currentUserId) return;

    const userStudio = defaultStudio.studioId;

    if (!isRefresh) setIsLoading(true);
    try {
      const feedData = await getEventFeed(currentUserId, userStudio, {
        followedLimit: 20,
        suggestedLimit: 15,
        includeSubscribed: true,
      });

      // Separate events by category
      const now = new Date();
      const myUpcoming = [];
      const followed = [];
      const suggested = [];
      const myPast = [];

      feedData.subscribedEvents.forEach((event) => {
        const eventDate =
          event.eventTimestamp?.toDate() || new Date(event.utcDateTime);
        const enrichedEvent = {
          ...event,
          isHostedByUser: event.createdBy === currentUserId,
        };

        if (eventDate >= now) {
          myUpcoming.push(enrichedEvent);
        } else {
          myPast.push(enrichedEvent);
        }
      });

      // Add followed users' events (exclude events user has already subscribed to)
      const subscribedEventIds = new Set(
        feedData.subscribedEvents.map((event) => event.id)
      );

      feedData.followedEvents.forEach((event) => {
        const eventDate =
          event.eventTimestamp?.toDate() || new Date(event.utcDateTime);
        // Only add if it's upcoming AND user hasn't subscribed to it
        if (eventDate >= now && !subscribedEventIds.has(event.id)) {
          followed.push({
            ...event,
            isHostedByUser: event.createdBy === currentUserId,
          });
        }
      });

      // Add suggested events
      feedData.suggestedEvents.forEach((event) => {
        const eventDate =
          event.eventTimestamp?.toDate() || new Date(event.utcDateTime);
        if (eventDate >= now) {
          suggested.push({
            ...event,
            isHostedByUser: event.createdBy === currentUserId,
          });
        }
      });

      setMyEvents(myUpcoming);
      setFollowedEvents(followed);
      setSuggestedEvents(suggested);
      setPastEvents(myPast.reverse()); // Most recent first
      setFeedStats(feedData.stats);
    } catch (error) {
      console.error('[HomeScreen] Failed to load event feed:', error);
      vibeAlert.error('Error', 'Failed to load events. Please try again.');
    } finally {
      if (!isRefresh) setIsLoading(false);
    }
  }, [currentUserId, userData, vibeAlert]);

  useEffect(() => {
    const defaultStudio = userData?.userdata?.studios?.default;
    if (!defaultStudio?.studioId || !currentUserId) return; // Wait for user studio info and auth

    // Check ban status first
    const checkBanStatus = async () => {
      setCheckingBanStatus(true);
      try {
        const status =
          await banEnforcementService.checkBanStatus(currentUserId);
        setBanStatus(status);

        if (status?.isBanned) {
          setShowBannedModal(true);
        }

        setCheckingBanStatus(false);
        return status;
      } catch (error) {
        console.error('[HomeScreen] Error checking ban status:', error);
        setCheckingBanStatus(false);
        return { isBanned: false, error: true };
      }
    };


    // Check for admin notifications (both individual and global)
    const checkAdminNotifications = async () => {
      try {
        // Check individual notifications first
        const unacknowledgedNotifications =
          await adminNotificationService.getUnacknowledgedNotifications(
            currentUserId
          );

        // Check global notifications
        const globalMessages =
          await globalAdminService.getActiveGlobalMessages(currentUserId);

        // Combine and prioritize (global messages first, then individual)
        const allNotifications = [
          ...globalMessages,
          ...unacknowledgedNotifications,
        ];

        if (allNotifications.length > 0) {
          // Show the most recent/highest priority notification
          const notification = allNotifications[0];
          // Mark if it's a global message for acknowledgment handling
          notification.isGlobal = globalMessages.includes(notification);
          setCurrentNotification(notification);
          setShowNotificationModal(true);
        }
      } catch (error) {
        console.error(
          '[HomeScreen] Error checking admin notifications:',
          error
        );
      }
    };

    // First check ban status, then load events if not banned, and check notifications
    const initializeHomeScreen = async () => {
      const status = await checkBanStatus();

      // Only load events if user is not banned
      if (!status?.isBanned) {
        loadEventFeed();
        // Check for admin notifications after loading events
        await checkAdminNotifications();
      }
    };

    initializeHomeScreen();

    // Real-time updates will be handled by useFocusEffect instead
    // to avoid unnecessary reloads from notification-related changes
    return () => {}; // No-op cleanup
  }, [currentUserId, userData, loadEventFeed]); // Re-run when user data changes (removed vibeAlert to prevent dialog-triggered reloads)

  // Handle hardware back button to confirm app exit
  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          vibeAlert.confirm(
            'Leave App?',
            'Are you sure you want to exit Big Vibe Studios?',
            () => {
              BackHandler.exitApp();
            }
          );
          return true; // Always prevent default back behavior
        }
      );
      return () => backHandler.remove();
    }, [vibeAlert])
  );

  // Refresh data when screen comes into focus (e.g., returning from CreateEvent)
  useFocusEffect(
    useCallback(() => {
      // Only refresh if user has data and isn't banned
      if (currentUserId && userData && !banStatus?.isBanned && !isLoading) {
        loadEventFeed(true); // Pass true to indicate this is a refresh
      }
    }, [currentUserId, userData, banStatus, isLoading, loadEventFeed])
  );

  // Check if user has no events at all
  const hasNoEvents =
    myEvents.length === 0 &&
    followedEvents.length === 0 &&
    suggestedEvents.length === 0 &&
    pastEvents.length === 0;

  // Admin functions
  const handleAdminMenu = () => {
    navigation.navigate('Admin');
  };

  // Handle notification acknowledgment
  const handleNotificationAcknowledge = async () => {
    try {
      if (currentNotification) {
        // Handle global vs individual notifications
        if (currentNotification.isGlobal) {
          await globalAdminService.acknowledgeGlobalMessage(
            currentUserId,
            currentNotification.id
          );
        } else {
          await adminNotificationService.acknowledgeNotification(
            currentUserId,
            currentNotification.id
          );
        }

        setShowNotificationModal(false);
        setCurrentNotification(null);

        // Check if there are more notifications to show
        const individualNotifications =
          await adminNotificationService.getUnacknowledgedNotifications(
            currentUserId
          );
        const globalMessages =
          await globalAdminService.getActiveGlobalMessages(currentUserId);
        const allRemainingNotifications = [
          ...globalMessages,
          ...individualNotifications,
        ];

        if (allRemainingNotifications.length > 0) {
          const nextNotification = allRemainingNotifications[0];
          nextNotification.isGlobal = globalMessages.includes(nextNotification);
          setCurrentNotification(nextNotification);
          setShowNotificationModal(true);
        }
      }
    } catch (error) {
      console.error('[HomeScreen] Error acknowledging notification:', error);
      vibeAlert.error(
        'Error',
        'Failed to acknowledge notification. Please try again.'
      );
    }
  };

  // Don't show empty state while loading or checking ban status
  if (isLoading || checkingBanStatus) {
    return (
      <VibeLoadingScreen
        loadingText={
          checkingBanStatus ? 'Checking account status...' : 'Loading events...'
        }
        showBranding={false}
      />
    );
  }

  // If user is banned, show minimal interface (banned modal will show)
  if (banStatus?.isBanned) {
    return (
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Big Vibe Studios</Text>
        </View>

        <View style={[styles.centerContent, { flex: 1 }]}>
          <Text style={styles.loadingText}>Account Restricted</Text>
        </View>

        {/* Banned User Modal */}
        <BannedUserModal
          visible={showBannedModal}
          banStatus={banStatus}
          onClose={() => setShowBannedModal(false)}
          onLogout={() => {
            setShowBannedModal(false);
            navigation.reset({
              index: 0,
              routes: [{ name: 'Landing' }],
            });
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Header - Always visible */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Big Vibe Studios</Text>
        <View style={styles.headerIcons}>
          <NotificationButton
            onPress={handleNotificationsPress}
            iconComponent={bellIcon}
          />
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => setShowAccountSettings(true)}
          >
            <ProfileAvatar userData={userData} size={40} showBorder={true} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Show empty state if no events exist anywhere */}
      {hasNoEvents ? (
        <EmptyStateView navigation={navigation} />
      ) : (
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.container}
          scrollEnabled={true}
          nestedScrollEnabled={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.vibeBlue}
              colors={[theme.colors.vibeBlue]}
            />
          }
        >
          {myEvents.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>My Events</Text>
              <VibeCarousel
                data={myEvents}
                scrollViewRef={scrollViewRef}
                renderItem={(item, isScrolling) => (
                  <EventCard
                    {...item}
                    onPress={() => {
                      if (!isScrolling) {
                        navigation.navigate('EventDetail', {
                          eventId: item.id,
                        });
                      }
                    }}
                  />
                )}
              />
            </>
          )}

          {followedEvents.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>
                Events from People You Follow
              </Text>
              <VibeCarousel
                data={followedEvents}
                scrollViewRef={scrollViewRef}
                renderItem={(item, isScrolling) => (
                  <EventCard
                    {...item}
                    onPress={() => {
                      if (!isScrolling) {
                        navigation.navigate('EventDetail', {
                          eventId: item.id,
                        });
                      }
                    }}
                  />
                )}
              />
            </>
          )}

          {suggestedEvents.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>Discover Events</Text>
              <VibeCarousel
                data={suggestedEvents}
                scrollViewRef={scrollViewRef}
                renderItem={(item, isScrolling) => (
                  <EventCard
                    {...item}
                    onPress={() => {
                      if (!isScrolling) {
                        navigation.navigate('EventDetail', {
                          eventId: item.id,
                        });
                      }
                    }}
                  />
                )}
              />
            </>
          )}

          {pastEvents.length > 0 && (
            <>
              <Text style={styles.sectionHeader}>My Past Events</Text>
              <VibeCarousel
                data={pastEvents}
                scrollViewRef={scrollViewRef}
                renderItem={(item, isScrolling) => (
                  <EventCard
                    {...item}
                    onPress={() => {
                      if (!isScrolling) {
                        navigation.navigate('EventDetail', {
                          eventId: item.id,
                        });
                      }
                    }}
                  />
                )}
              />
            </>
          )}

          <View style={styles.buttonStack}>
            <VibeButton
              label="CREATE EVENT"
              onPress={() => navigation.navigate('CreateEvent')}
              variant="filled"
              style={styles.fullButton}
            />
            {hasAdminAccess(userData) && (
              <VibeButton
                label="ADMIN TOOLS"
                onPress={handleAdminMenu}
                variant="toggle"
                color="purple"
                style={[styles.fullButton, styles.adminButton]}
              />
            )}
          </View>
        </ScrollView>
      )}

      {showAccountSettings && (
        <TouchableOpacity
          style={styles.dropdownOverlay}
          onPress={() => setShowAccountSettings(false)}
          activeOpacity={1}
          // Ensure this overlay doesn't interfere with scrolling when not visible
          pointerEvents={showAccountSettings ? 'auto' : 'none'}
        />
      )}

      <AccountSettingsDropdown
        visible={showAccountSettings}
        onClose={() => setShowAccountSettings(false)}
        navigation={navigation}
        userData={userData}
      />

      {/* Banned User Modal */}
      <BannedUserModal
        visible={showBannedModal}
        banStatus={banStatus}
        onClose={() => setShowBannedModal(false)}
        onLogout={() => {
          setShowBannedModal(false);
          navigation.reset({
            index: 0,
            routes: [{ name: 'Landing' }],
          });
        }}
      />

      {/* Admin Notification Modal */}
      <AdminNotificationModal
        visible={showNotificationModal}
        notification={currentNotification}
        onClose={() => setShowNotificationModal(false)}
        onAcknowledge={handleNotificationAcknowledge}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: 'visible',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.darkGray,
  },
  headerTitle: {
    color: theme.colors.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellIcon: {
    fontSize: 24,
  },
  profileButton: {
    padding: 4,
  },
  container: {
    paddingTop: 20,
    paddingBottom: 60,
    paddingHorizontal: 16,
    overflow: 'visible',
    minHeight: '150%', // Force scroll by making content taller than screen
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonStack: {
    flexDirection: 'column',
    marginTop: 30,
    gap: 12,
  },
  fullButton: {
    width: '100%',
  },
  adminButton: {
    opacity: 0.8,
  },
  sectionHeader: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    marginLeft: 4,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    opacity: 0.8,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
});
