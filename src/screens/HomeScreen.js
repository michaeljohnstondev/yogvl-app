import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  BackHandler,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
import { useStatusBar } from '../components/ui/base/VibeAppWrapper';
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
import { extractInterestsFromEventTitle } from '../services/interestService';
import theme from '../theme/themes';

export default function HomeScreen({ navigation, route }) {
  const [myEvents, setMyEvents] = useState([]);
  const [invitedEvents, setInvitedEvents] = useState([]);
  const [followedEvents, setFollowedEvents] = useState([]);
  const [interestBasedEvents, setInterestBasedEvents] = useState([]);
  const [otherEvents, setOtherEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [studioCity, setStudioCity] = useState('');

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
  const handleProfilePress = useCallback(
    () => setShowAccountSettings(true),
    []
  );
  const handleCloseAccountSettings = useCallback(
    () => setShowAccountSettings(false),
    []
  );

  // Memoize ProfileAvatar to prevent unnecessary re-renders
  const profileAvatar = useMemo(
    () => <ProfileAvatar userData={userData} size={40} showBorder={true} />,
    [userData]
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
    const studioCity = defaultStudio.studioCity || 'your area';

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
      const invited = [];
      const followed = [];
      const suggested = [];
      const myPast = [];

      // Get user's pending invitations
      const pendingInvitations = new Set(userData?.userdata?.pendingInvitations || []);

      feedData.subscribedEvents.forEach((event) => {
        const eventDate =
          event.eventTimestamp?.toDate() || new Date(event.utcDateTime);
        const enrichedEvent = {
          ...event,
          isHostedByUser: event.createdBy === currentUserId,
        };

        // Show events in "My Events" until 1 hour after they start (for latecomers)
        const oneHourAfterEvent = new Date(eventDate.getTime() + 60 * 60 * 1000);
        if (oneHourAfterEvent >= now) {
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
          const enrichedEvent = {
            ...event,
            isHostedByUser: event.createdBy === currentUserId,
          };

          // Check if this is an invited event
          if (pendingInvitations.has(event.id)) {
            invited.push(enrichedEvent);
          } else {
            followed.push(enrichedEvent);
          }
        }
      });

      // Split suggested events into interest-based and other events
      const userInterests = userData?.preferences?.interests || [];
      // Sanitize user interests to remove any emoji spaces or extra whitespace
      const sanitizedInterests = userInterests.map(interest => interest.trim());
      const interestBased = [];
      const other = [];

      feedData.suggestedEvents.forEach((event) => {
        const eventDate =
          event.eventTimestamp?.toDate() || new Date(event.utcDateTime);
        // Only add if upcoming AND not already subscribed
        if (eventDate >= now && !subscribedEventIds.has(event.id)) {
          const enrichedEvent = {
            ...event,
            isHostedByUser: event.createdBy === currentUserId,
          };

          // Check if this is an invited event (takes priority)
          if (pendingInvitations.has(event.id)) {
            invited.push(enrichedEvent);
          } else {
            // Check if event title matches any user interests (using sanitized interests)
            const matchedInterests = extractInterestsFromEventTitle(event.title, sanitizedInterests);

            if (matchedInterests.length > 0) {
              interestBased.push(enrichedEvent);
            } else {
              other.push(enrichedEvent);
            }
          }
        }
      });

      setMyEvents(myUpcoming);
      setInvitedEvents(invited);
      setFollowedEvents(followed);
      setInterestBasedEvents(interestBased);
      setOtherEvents(other);
      setPastEvents(myPast.reverse()); // Most recent first
      setFeedStats(feedData.stats);
      setStudioCity(studioCity);
    } catch (error) {
      console.error('[HomeScreen] Failed to load event feed:', error);
      vibeAlert.error('Error', 'Failed to load events. Please try again.');
    } finally {
      if (!isRefresh) setIsLoading(false);
    }
  }, [currentUserId, userData]);

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
        // Check both notification types in parallel
        const [unacknowledgedNotifications, globalMessages] = await Promise.all([
          adminNotificationService.getUnacknowledgedNotifications(currentUserId),
          globalAdminService.getActiveGlobalMessages(currentUserId)
        ]);

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

    // Parallel execution: check ban status while preparing other operations
    const initializeHomeScreen = async () => {
      // Start ban check immediately
      const banCheckPromise = checkBanStatus();

      // Prepare other operations (but don't execute until ban check completes)
      const banStatus = await banCheckPromise;

      // Only proceed if user is not banned
      if (!banStatus?.isBanned) {
        // Execute feed loading and notification checking in parallel
        const [, ] = await Promise.all([
          loadEventFeed(),
          checkAdminNotifications()
        ]);
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
    }, [])
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

  // Listen for refresh parameter (e.g., after joining an event)
  useEffect(() => {
    if (route?.params?.refresh && currentUserId && userData && !isLoading) {
      loadEventFeed(true);
    }
  }, [route?.params?.refresh, currentUserId, userData, isLoading, loadEventFeed]);

  // Check if user has no events at all
  const hasNoEvents =
    myEvents.length === 0 &&
    invitedEvents.length === 0 &&
    followedEvents.length === 0 &&
    interestBasedEvents.length === 0 &&
    otherEvents.length === 0 &&
    pastEvents.length === 0;

  // Admin functions
  const handleAdminMenu = () => {
    console.log('[HomeScreen] Admin Tools button pressed, navigating to Admin');
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

        // Check if there are more notifications to show (parallel execution)
        const [individualNotifications, globalMessages] = await Promise.all([
          adminNotificationService.getUnacknowledgedNotifications(currentUserId),
          globalAdminService.getActiveGlobalMessages(currentUserId)
        ]);
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
      <LinearGradient
        colors={['#001020', '#001840']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Big Vibe Studios</Text>
        <View style={styles.headerIcons}>
          <NotificationButton
            onPress={handleNotificationsPress}
            iconComponent={bellIcon}
          />
          <Pressable
            style={({ pressed }) => [
              styles.profileButton,
              {
                opacity: pressed ? 0.7 : 1,
                transform: [{ scale: pressed ? 0.95 : 1 }]
              }
            ]}
            onPress={handleProfilePress}
            delayPressIn={0}
            delayPressOut={0}
            hitSlop={8}
          >
            {profileAvatar}
          </Pressable>
        </View>
      </LinearGradient>

      {/* Show empty state if no events exist anywhere */}
      {hasNoEvents ? (
        <EmptyStateView navigation={navigation} />
      ) : (
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.container}
          scrollEnabled={true}
          nestedScrollEnabled={true}
          scrollEventThrottle={16}
          directionalLockEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.vibeBlue}
              colors={[theme.colors.vibeBlue]}
              progressBackgroundColor={theme.colors.background}
            />
          }
        >
          {myEvents.length > 0 && (
            <>
              <TouchableOpacity
                onPress={() => navigation.navigate('EventList', {
                  title: 'Your Events',
                  events: myEvents
                })}
                activeOpacity={0.6}
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              >
                <Text style={styles.sectionHeader}>Your Events</Text>
              </TouchableOpacity>
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

          {invitedEvents.length > 0 && (
            <>
              <TouchableOpacity
                onPress={() => navigation.navigate('EventList', {
                  title: 'Invited To',
                  events: invitedEvents
                })}
                activeOpacity={0.6}
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              >
                <Text style={styles.sectionHeader}>Invited To</Text>
              </TouchableOpacity>
              <VibeCarousel
                data={invitedEvents}
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
              <TouchableOpacity
                onPress={() => navigation.navigate('EventList', {
                  title: 'Events from People You Follow',
                  events: followedEvents
                })}
                activeOpacity={0.6}
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              >
                <Text style={styles.sectionHeader}>
                  Events from People You Follow
                </Text>
              </TouchableOpacity>
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

          {interestBasedEvents.length > 0 && (
            <>
              <TouchableOpacity
                onPress={() => navigation.navigate('EventList', {
                  title: `For You in ${studioCity}`,
                  events: interestBasedEvents
                })}
                activeOpacity={0.6}
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              >
                <Text style={styles.sectionHeader}>
                  For You in {studioCity}
                </Text>
              </TouchableOpacity>
              <VibeCarousel
                data={interestBasedEvents}
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

          {otherEvents.length > 0 && (
            <>
              <TouchableOpacity
                onPress={() => navigation.navigate('EventList', {
                  title: `Discover ${studioCity}`,
                  events: otherEvents
                })}
                activeOpacity={0.6}
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              >
                <Text style={styles.sectionHeader}>
                  Discover {studioCity}
                </Text>
              </TouchableOpacity>
              <VibeCarousel
                data={otherEvents}
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
              <TouchableOpacity
                onPress={() => navigation.navigate('EventList', {
                  title: 'Your Past Events',
                  events: pastEvents
                })}
                activeOpacity={0.6}
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              >
                <Text style={styles.sectionHeader}>Your Past Events</Text>
              </TouchableOpacity>
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

          {hasAdminAccess(userData) && (
            <View style={styles.buttonStack}>
              <VibeButton
                label="ADMIN TOOLS"
                onPress={handleAdminMenu}
                style={styles.fullButton}
              />
            </View>
          )}
        </ScrollView>
      )}

      {/* Sticky Create Event Button */}
      <View style={styles.stickyButtonContainer}>
        <VibeButton
          label="CREATE AN EVENT"
          onPress={() => navigation.navigate('CreateEvent')}
          variant="filled"
          style={styles.stickyButton}
        />
      </View>

      {showAccountSettings && (
        <>
          <TouchableOpacity
            style={styles.dropdownOverlay}
            onPress={handleCloseAccountSettings}
            activeOpacity={1}
          />
          <AccountSettingsDropdown
            visible={showAccountSettings}
            onClose={handleCloseAccountSettings}
            navigation={navigation}
            userData={userData}
          />
        </>
      )}

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
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.vibeBlue,
  },
  headerTitle: {
    color: theme.colors.white,
    fontSize: 24,
    marginLeft: -8,
    fontFamily: theme.fonts.comicBold,
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
    paddingBottom: 120,
    paddingHorizontal: 16,
    overflow: 'visible',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonStack: {
    flexDirection: 'column',
    marginTop: 30,
    marginBottom: 20,
    gap: 12,
  },
  fullButton: {
    width: '100%',
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
  sectionHeader: {
    color: theme.colors.vibeCyan,
    fontSize: 20,
    fontFamily: theme.fonts.comicBold,
    marginBottom: 10,
    marginTop: 20,
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
