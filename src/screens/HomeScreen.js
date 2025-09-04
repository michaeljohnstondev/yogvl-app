import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  BackHandler,
} from 'react-native';
import VibeButton from '../components/ui/VibeButton';
import ProfileAvatar from '../components/ui/ProfileAvatar';
import VibeLoadingScreen from '../components/ui/VibeLoadingScreen';
import NotificationTester from '../components/ui/NotificationTester';
import { useVibeAlert } from '../components/ui/VibeAlertContext';
import VibeCarousel from '../components/ui/VibeCarousel';
import EventCard from '../events/components/EventCard';
import EmptyStateView from '../components/ui/EmptyStateView';
import { NotificationButton } from '../components/notifications';
import AccountSettingsDropdown from '../components/ui/AccountSettingsModal';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../auth/services/firebase';
import { useAuth } from '../auth/AuthContext';
import { getEventFeed } from '../services/feedService';
import { hasAdminAccess } from '../services/adminService';
import { banEnforcementService } from '../services/banEnforcementService';
import { adminNotificationService } from '../services/adminNotificationService';
import { globalAdminService } from '../services/globalAdminService';
import BannedUserModal from '../components/ui/BannedUserModal';
import AdminNotificationModal from '../components/ui/AdminNotificationModal';
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
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [feedStats, setFeedStats] = useState(null);
  const [lastFocusReload, setLastFocusReload] = useState(0);
  
  // Admin notifications state
  const [currentNotification, setCurrentNotification] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Get auth and alert context
  const { currentUserId, userData, isAuthenticated } = useAuth();
  const vibeAlert = useVibeAlert();

  // Memoize static components to prevent unnecessary re-renders
  const bellIcon = useMemo(() => <Text style={styles.bellIcon}>🔔</Text>, []);
  const handleNotificationsPress = useCallback(() => navigation.navigate('Notifications'), [navigation]);

  useEffect(() => {
    const defaultStudio = userData?.userdata?.studios?.default;
    if (!defaultStudio?.studioId || !currentUserId) return; // Wait for user studio info and auth
    
    // Check ban status first
    const checkBanStatus = async () => {
      setCheckingBanStatus(true);
      try {
        const status = await banEnforcementService.checkBanStatus(currentUserId);
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
    
    // Get user's studio
    const userStudio = defaultStudio.studioId;
    
    // Load follow-based event feed (only if not banned)
    const loadEventFeed = async () => {
      setIsLoading(true);
      try {
        const feedData = await getEventFeed(currentUserId, userStudio, {
          followedLimit: 20,
          suggestedLimit: 15,
          includeSubscribed: true
        });

        // Separate events by category
        const now = new Date();
        const myUpcoming = [];
        const followed = [];
        const suggested = [];
        const myPast = [];

        feedData.subscribedEvents.forEach(event => {
          const eventDate = event.eventTimestamp?.toDate() || new Date(event.utcDateTime);
          const enrichedEvent = {
            ...event,
            isHostedByUser: event.createdBy === currentUserId
          };
          
          if (eventDate >= now) {
            myUpcoming.push(enrichedEvent);
          } else {
            myPast.push(enrichedEvent);
          }
        });

        // Add followed users' events (exclude events user has already subscribed to)
        const subscribedEventIds = new Set(feedData.subscribedEvents.map(event => event.id));
        
        feedData.followedEvents.forEach(event => {
          const eventDate = event.eventTimestamp?.toDate() || new Date(event.utcDateTime);
          // Only add if it's upcoming AND user hasn't subscribed to it
          if (eventDate >= now && !subscribedEventIds.has(event.id)) {
            followed.push({
              ...event,
              isHostedByUser: event.createdBy === currentUserId
            });
          }
        });

        // Add suggested events
        feedData.suggestedEvents.forEach(event => {
          const eventDate = event.eventTimestamp?.toDate() || new Date(event.utcDateTime);
          if (eventDate >= now) {
            suggested.push({
              ...event,
              isHostedByUser: event.createdBy === currentUserId
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
        setIsLoading(false);
      }
    };

    // Check for admin notifications (both individual and global)
    const checkAdminNotifications = async () => {
      try {
        // Check individual notifications first
        const unacknowledgedNotifications = await adminNotificationService.getUnacknowledgedNotifications(currentUserId);
        
        // Check global notifications
        const globalMessages = await globalAdminService.getActiveGlobalMessages(currentUserId);
        
        // Combine and prioritize (global messages first, then individual)
        const allNotifications = [...globalMessages, ...unacknowledgedNotifications];
        
        if (allNotifications.length > 0) {
          // Show the most recent/highest priority notification
          const notification = allNotifications[0];
          // Mark if it's a global message for acknowledgment handling
          notification.isGlobal = globalMessages.includes(notification);
          setCurrentNotification(notification);
          setShowNotificationModal(true);
        }
      } catch (error) {
        console.error('[HomeScreen] Error checking admin notifications:', error);
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
  }, [currentUserId, userData, vibeAlert]); // Re-run when user data changes

  // Handle hardware back button to confirm app exit
  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        vibeAlert.confirm(
          'Leave App?',
          'Are you sure you want to exit Big Vibe Studios?',
          () => {
            BackHandler.exitApp();
          },
          () => {
            // Do nothing - stay in app
          }
        );
        return true; // Always prevent default back behavior
      });
      return () => backHandler.remove();
    }, [vibeAlert])
  );

  // Reload events when screen comes into focus (but not on first load)
  useFocusEffect(
    useCallback(() => {
      // Prevent frequent reloads from notification-triggered focus events
      const now = Date.now();
      if (now - lastFocusReload < 3000) { // 3 second cooldown
        console.log('[HomeScreen] Skipping focus reload due to recent reload');
        return;
      }
      
      // Only reload if we're not in initial loading state and user is authenticated
      if (!isLoading && !checkingBanStatus && currentUserId && userData?.userdata?.studios?.default) {
        setLastFocusReload(now);
        const loadEventFeed = async () => {
          const userStudio = userData.userdata.studios.default.studioId;
          try {
            const feedData = await getEventFeed(currentUserId, userStudio, {
              followedLimit: 20,
              suggestedLimit: 15,
              includeSubscribed: true
            });

            // Separate events by category
            const now = new Date();
            const myUpcoming = [];
            const followed = [];
            const suggested = [];
            const myPast = [];

            feedData.subscribedEvents.forEach(event => {
              const eventDate = event.eventTimestamp?.toDate() || new Date(event.utcDateTime);
              const enrichedEvent = {
                ...event,
                isHostedByUser: event.createdBy === currentUserId
              };
              
              if (eventDate >= now) {
                myUpcoming.push(enrichedEvent);
              } else {
                myPast.push(enrichedEvent);
              }
            });

            // Add followed users' events (exclude events user has already subscribed to)
            const subscribedEventIds = new Set(feedData.subscribedEvents.map(event => event.id));
            
            feedData.followedEvents.forEach(event => {
              const eventDate = event.eventTimestamp?.toDate() || new Date(event.utcDateTime);
              if (eventDate >= now && !subscribedEventIds.has(event.id)) {
                followed.push({
                  ...event,
                  isHostedByUser: event.createdBy === currentUserId
                });
              }
            });

            // Add suggested events
            feedData.suggestedEvents.forEach(event => {
              const eventDate = event.eventTimestamp?.toDate() || new Date(event.utcDateTime);
              if (eventDate >= now) {
                suggested.push({
                  ...event,
                  isHostedByUser: event.createdBy === currentUserId
                });
              }
            });

            setMyEvents(myUpcoming);
            setFollowedEvents(followed);
            setSuggestedEvents(suggested);
            setPastEvents(myPast.reverse());
            setFeedStats(feedData.stats);
            
          } catch (error) {
            console.error('[HomeScreen] Failed to refresh event feed:', error);
          }
        };

        // Small delay to avoid excessive calls
        const timeoutId = setTimeout(loadEventFeed, 100);
        return () => clearTimeout(timeoutId);
      }
    }, [isLoading, checkingBanStatus, currentUserId, userData, lastFocusReload])
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
          await globalAdminService.acknowledgeGlobalMessage(currentUserId, currentNotification.id);
        } else {
          await adminNotificationService.acknowledgeNotification(currentUserId, currentNotification.id);
        }
        
        setShowNotificationModal(false);
        setCurrentNotification(null);
        
        // Check if there are more notifications to show
        const individualNotifications = await adminNotificationService.getUnacknowledgedNotifications(currentUserId);
        const globalMessages = await globalAdminService.getActiveGlobalMessages(currentUserId);
        const allRemainingNotifications = [...globalMessages, ...individualNotifications];
        
        if (allRemainingNotifications.length > 0) {
          const nextNotification = allRemainingNotifications[0];
          nextNotification.isGlobal = globalMessages.includes(nextNotification);
          setCurrentNotification(nextNotification);
          setShowNotificationModal(true);
        }
      }
    } catch (error) {
      console.error('[HomeScreen] Error acknowledging notification:', error);
      vibeAlert.error('Error', 'Failed to acknowledge notification. Please try again.');
    }
  };

  // Don't show empty state while loading or checking ban status
  if (isLoading || checkingBanStatus) {
    return (
      <VibeLoadingScreen 
        loadingText={checkingBanStatus ? 'Checking account status...' : 'Loading events...'}
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
            <ProfileAvatar 
              userData={userData} 
              size={40}
              showBorder={true}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Show empty state if no events exist anywhere */}
      {hasNoEvents ? (
        <EmptyStateView navigation={navigation} />
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
        {/* Notification Tester - Remove this after testing */}
        <NotificationTester />
        
        {myEvents.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>My Events</Text>
            <VibeCarousel
              data={myEvents}
              renderItem={(item, isScrolling) => (
                <EventCard
                  {...item}
                  onPress={() => {
                    if (!isScrolling) {
                      navigation.navigate('EventDetail', { eventId: item.id });
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
              renderItem={(item, isScrolling) => (
                <EventCard
                  {...item}
                  onPress={() => {
                    if (!isScrolling) {
                      navigation.navigate('EventDetail', { eventId: item.id });
                    }
                  }}
                />
              )}
            />
          </>
        )}

        {suggestedEvents.length > 0 && (
          <>
            <Text style={styles.sectionHeader}>
              Discover Events
            </Text>
            <VibeCarousel
              data={suggestedEvents}
              renderItem={(item, isScrolling) => (
                <EventCard
                  {...item}
                  onPress={() => {
                    if (!isScrolling) {
                      navigation.navigate('EventDetail', { eventId: item.id });
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
              renderItem={(item, isScrolling) => (
                <EventCard
                  {...item}
                  onPress={() => {
                    if (!isScrolling) {
                      navigation.navigate('EventDetail', { eventId: item.id });
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
