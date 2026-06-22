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
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  VibeSearch,
} from '../components/ui';
import { useVibeAlert } from '../components/ui/base/VibeAlertContext';
import { useStatusBar } from '../components/ui/base/VibeAppWrapper';
import EventCard from '../events/components/EventCard';
import NotificationButton from '../components/notifications/NotificationButton';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../auth/services/firebase';
import { doc, getDoc } from '../lib/firebase/firestore';
import { useAuth } from '../auth/AuthContext';
import { getEventFeed, getOfficialEvents } from '../services/feedService';
import { hasAdminAccess } from '../services/adminService';
import { banEnforcementService } from '../services/banEnforcementService';
import { adminNotificationService } from '../services/adminNotificationService';
import { globalAdminService } from '../services/globalAdminService';
import { extractInterestsFromEvent } from '../services/interestService';
import { notificationPermissionService } from '../services/notificationPermissionService';
import theme from '../theme/themes';

export default function HomeScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [myEvents, setMyEvents] = useState([]);
  const [invitedEvents, setInvitedEvents] = useState([]);
  const [officialEvents, setOfficialEvents] = useState([]);
  const [followedEvents, setFollowedEvents] = useState([]);
  const [interestBasedEvents, setInterestBasedEvents] = useState([]);
  const [otherEvents, setOtherEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [studioCity, setStudioCity] = useState('');
  const [studioNickname, setStudioNickname] = useState('');

  // Ban enforcement state
  const [banStatus, setBanStatus] = useState(null);
  const [showBannedModal, setShowBannedModal] = useState(false);
  const [checkingBanStatus, setCheckingBanStatus] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [feedStats, setFeedStats] = useState(null);

  // Admin notifications state
  const [currentNotification, setCurrentNotification] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Get auth and alert context
  const { currentUserId, userData, isAuthenticated } = useAuth();
  const vibeAlert = useVibeAlert();

  // Ref for ScrollView to enable simultaneous gesture handling
  const scrollViewRef = useRef(null);
  const hasInitialLoadRef = useRef(false);

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
    () => <ProfileAvatar userData={userData} size={37} showBorder={true} />,
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
      // Fetch studio nickname from Firestore studio document
      let nickname = 'GVL'; // Default fallback
      try {
        const studioRef = doc(db, 'studios', userStudio);
        const studioSnap = await getDoc(studioRef);
        if (studioSnap.exists()) {
          const studioData = studioSnap.data();
          // Use nickname without space (e.g., "GVL"), otherwise use city with space (e.g., " Myrtle Beach")
          if (studioData.nickname) {
            nickname = studioData.nickname;
          } else if (studioData.city) {
            nickname = ` ${studioData.city}`; // Add space before city name
          } else {
            nickname = 'GVL';
          }
          console.log('[HomeScreen] Fetched studio nickname:', nickname);
        }
      } catch (error) {
        console.warn('[HomeScreen] Failed to fetch studio nickname:', error);
      }

      const [feedData, official] = await Promise.all([
        getEventFeed(currentUserId, userStudio, {
          followedLimit: 20,
          suggestedLimit: 15,
          includeSubscribed: true,
        }),
        getOfficialEvents(currentUserId, userStudio, null, 15)
      ]);

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

      // Add invited events (includes private events the user was invited to)
      const invitedEventIds = new Set();
      if (feedData.invitedEvents) {
        feedData.invitedEvents.forEach((event) => {
          const eventDate =
            event.eventTimestamp?.toDate() || new Date(event.utcDateTime);
          const oneHourAfterEvent = new Date(eventDate.getTime() + 60 * 60 * 1000);
          if (oneHourAfterEvent >= now && !subscribedEventIds.has(event.id)) {
            invited.push({
              ...event,
              isHostedByUser: event.createdBy === currentUserId,
            });
            invitedEventIds.add(event.id);
          }
        });
      }

      feedData.followedEvents.forEach((event) => {
        const eventDate =
          event.eventTimestamp?.toDate() || new Date(event.utcDateTime);
        // Only add if it's upcoming AND user hasn't subscribed or already invited
        if (eventDate >= now && !subscribedEventIds.has(event.id) && !invitedEventIds.has(event.id)) {
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
        // Only add if upcoming AND not already subscribed or invited
        if (eventDate >= now && !subscribedEventIds.has(event.id) && !invitedEventIds.has(event.id)) {
          const enrichedEvent = {
            ...event,
            isHostedByUser: event.createdBy === currentUserId,
          };

          // Check if this is an invited event (takes priority)
          if (pendingInvitations.has(event.id)) {
            invited.push(enrichedEvent);
          } else {
            // Check if event title or location matches any user interests (using sanitized interests)
            const matchedInterests = extractInterestsFromEvent(event.title, event.location, sanitizedInterests);

            if (matchedInterests.length > 0) {
              interestBased.push(enrichedEvent);
            } else {
              other.push(enrichedEvent);
            }
          }
        }
      });

      // Sort past events by date descending (most recent first)
      const sortedPast = myPast.sort((a, b) => {
        const dateA = a.eventTimestamp?.toDate() || new Date(a.utcDateTime);
        const dateB = b.eventTimestamp?.toDate() || new Date(b.utcDateTime);
        return dateB.getTime() - dateA.getTime(); // Most recent first
      });

      console.log('[HomeScreen] Feed loaded:', {
        myEvents: myUpcoming.length,
        invited: invited.length,
        official: official.length,
        followed: followed.length,
      });

      setMyEvents(myUpcoming);
      setInvitedEvents(invited);
      setOfficialEvents(official);
      setFollowedEvents(followed);
      setInterestBasedEvents(interestBased);
      setOtherEvents(other);
      setPastEvents(sortedPast);
      setFeedStats(feedData.stats);
      setStudioCity(studioCity);
      setStudioNickname(nickname);
    } catch (error) {
      console.error('[HomeScreen] Failed to load event feed:', error);
      vibeAlert.error('Error', 'Failed to load events. Please try again.');
    } finally {
      if (!isRefresh) setIsLoading(false);
    }
  }, [currentUserId, userData?.userdata?.studios?.default?.studioId]);

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

    // Check if we need to prompt user to enable notifications in Settings
    const checkNotificationPermission = async () => {
      try {
        // Safety net for users who never got an initial permission prompt
        // (e.g. finished onboarding before the post-onboarding prompt
        // shipped, or reinstalled and never created/joined/shown-interest).
        // The service dedups so this fires at most once per install.
        if (currentUserId) {
          await notificationPermissionService.requestPermissionIfNeeded(
            currentUserId,
            'home_visit'
          );
        }

        const shouldPrompt = await notificationPermissionService.shouldShowSettingsPrompt();
        if (shouldPrompt) {
          await notificationPermissionService.markSettingsPromptShown();
          vibeAlert.warning(
            'Notifications Off',
            'Enable notifications so you never miss event updates, invites, or recaps.',
            [
              {
                text: 'Open Settings',
                onPress: () => notificationPermissionService.openNotificationSettings(),
              },
              { text: 'Not Now' },
            ]
          );
        }
      } catch (error) {
        console.error('[HomeScreen] Error checking notification permission:', error);
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
        // Execute feed loading, notification checking, and permission check in parallel
        await Promise.all([
          loadEventFeed(),
          checkAdminNotifications(),
          checkNotificationPermission(),
        ]);
      }
    };

    initializeHomeScreen().then(() => {
      hasInitialLoadRef.current = true;
    });

    // Real-time updates will be handled by useFocusEffect instead
    // to avoid unnecessary reloads from notification-related changes
    return () => {}; // No-op cleanup
  }, [currentUserId, userData?.userdata?.studios?.default?.studioId, userData?.preferences?.interests, loadEventFeed]); // Re-run when studio or interests change

  // Handle hardware back button to confirm app exit
  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          vibeAlert.confirm(
            'Leave App?',
            'Are you sure you want to exit The Yo?',
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

  // 🐛 DIAGNOSTIC (admin-only on screen, console logs for everyone but
  // they're invisible to users): tracks insets.bottom and the screen
  // we navigated back from so we can pinpoint what triggers the
  // create-button drift. Remove once we've identified the root cause.
  // Tagged for `react-native log-android | grep INSET-DBG` filtering.
  useEffect(() => {
    console.log(
      `[Screen:Home] INSET-DBG change top=${insets.top} bottom=${insets.bottom}`
    );
  }, [insets.top, insets.bottom]);

  useFocusEffect(
    useCallback(() => {
      try {
        const state = navigation.getState?.();
        const routes = state?.routes || [];
        const prev = routes.length >= 2 ? routes[routes.length - 2]?.name : null;
        console.log(
          `[Screen:Home] INSET-DBG focused from=${prev || '(none)'} bottom=${insets.bottom}`
        );
      } catch (e) {}
    }, [insets.bottom, navigation])
  );

  // Refresh data when screen comes into focus (e.g., returning from CreateEvent)
  useFocusEffect(
    useCallback(() => {
      // Skip the initial mount — useEffect already handles it
      if (!hasInitialLoadRef.current) return;

      // Only refresh if user has data and isn't banned
      if (currentUserId && userData && !banStatus?.isBanned && !isLoading) {
        loadEventFeed(true); // Pass true to indicate this is a refresh
      }
    }, [currentUserId, userData?.userdata?.studios?.default?.studioId, banStatus, isLoading, loadEventFeed])
  );

  // Listen for refresh parameter (e.g., after joining an event)
  useEffect(() => {
    if (route?.params?.refresh && currentUserId && userData && !isLoading) {
      loadEventFeed(true);
    }
  }, [route?.params?.refresh, currentUserId, userData?.userdata?.studios?.default?.studioId, isLoading, loadEventFeed]);

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
          <Text style={styles.headerTitle}>The Yo</Text>
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
      {/* Header with Search Bar */}
      <LinearGradient
        colors={['#001020', '#001840']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.header}
      >
        <Image
          source={require('../../assets/HeaderIcon.png')}
          style={styles.headerLogo}
          resizeMode="contain"
        />
        <Pressable
          style={styles.searchBar}
          onPress={() => setShowSearch(true)}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchPlaceholder}>Search...</Text>
        </Pressable>
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
          contentContainerStyle={[
            styles.container,
            // The sticky CREATE button container already accounts for
            // insets.bottom itself, so the ScrollView only needs enough
            // padding to clear the button + its top padding (~140px).
            // Adding insets.bottom here too double-counts and shows an
            // empty gap below the last item.
            { paddingBottom: 140 },
          ]}
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

          {officialEvents.length > 0 && (
            <>
              <TouchableOpacity
                onPress={() => navigation.navigate('EventList', {
                  title: `Yo${studioNickname}`,
                  events: officialEvents
                })}
                activeOpacity={0.6}
                hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
              >
                <Text style={styles.officialSectionHeader}>
                  Yo{studioNickname}
                </Text>
              </TouchableOpacity>
              <VibeCarousel
                data={officialEvents}
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

      {/* 🐛 DIAGNOSTIC: admin-only live insets readout pinned to top-
          right corner so we can watch insets.bottom drift in real
          time. Remove once the root cause is identified. */}
      {hasAdminAccess(userData) && (
        <View
          pointerEvents="none"
          style={[styles.insetDebug, { top: insets.top + 4 }]}
        >
          <Text style={styles.insetDebugText}>
            INSET b:{insets.bottom} t:{insets.top}
          </Text>
        </View>
      )}

      {/* Sticky Create Event Button */}
      <View
        style={[
          styles.stickyButtonContainer,
          { paddingBottom: Math.max(insets.bottom, 12) + 12 },
        ]}
      >
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

      {/* Search Modal */}
      <VibeSearch
        visible={showSearch}
        onClose={() => setShowSearch(false)}
        navigation={navigation}
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
    paddingTop: 2,
    paddingBottom: 5,
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.vibeBlue,
  },
  headerLogo: {
    width: 70,
    height: 56,
    marginRight: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
    opacity: 0.5,
  },
  searchPlaceholder: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontFamily: theme.fonts.comicRegular,
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
  // 🐛 DIAGNOSTIC overlay styles — admin-only live insets readout.
  // Remove together with the JSX block when the root cause is found.
  insetDebug: {
    position: 'absolute',
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    zIndex: 9999,
    borderWidth: 1,
    borderColor: theme.colors.vibePink || '#ff66ff',
  },
  insetDebugText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: theme.fonts.main,
    fontWeight: '700',
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
  officialSectionHeader: {
    color: theme.colors.vibeGreen,
    fontSize: 22,
    fontFamily: theme.fonts.comicBold,
    marginBottom: 10,
    marginTop: 20,
    marginLeft: 4,
    textShadowColor: theme.colors.vibeGreen,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
    letterSpacing: 0.5,
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
