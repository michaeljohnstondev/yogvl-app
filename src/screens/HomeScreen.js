import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import VibeButton from '../components/ui/VibeButton';
import { useVibeAlert } from '../components/ui/VibeAlertContext';
import VibeCarousel from '../components/ui/VibeCarousel';
import EventCard from '../events/components/EventCard';
import EmptyStateView from '../components/ui/EmptyStateView';
import { NotificationButton } from '../components/notifications';
import AccountSettingsDropdown from '../components/ui/AccountSettingsModal';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../auth/services/firebase';
import { useAuth } from '../auth/AuthContext';
import { getEventFeed } from '../services/feedService';
import theme from '../theme/themes';

export default function HomeScreen({ navigation }) {
  const [myEvents, setMyEvents] = useState([]);
  const [followedEvents, setFollowedEvents] = useState([]);
  const [suggestedEvents, setSuggestedEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [feedStats, setFeedStats] = useState(null);

  // Get auth and alert context
  const { currentUserId, userData, isAuthenticated } = useAuth();
  const vibeAlert = useVibeAlert();

  useEffect(() => {
    const defaultStudio = userData?.userdata?.studios?.default;
    if (!defaultStudio?.studioId || !currentUserId) return; // Wait for user studio info and auth
    
    // Get user's studio
    const userStudio = defaultStudio.studioId;
    
    // Load follow-based event feed
    const loadEventFeed = async () => {
      setIsLoading(true);
      try {
        console.log('[HomeScreen] Loading follow-based event feed...');
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

        // Add followed users' events
        feedData.followedEvents.forEach(event => {
          const eventDate = event.eventTimestamp?.toDate() || new Date(event.utcDateTime);
          if (eventDate >= now) {
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
        
        console.log('[HomeScreen] Event feed loaded:', {
          myEvents: myUpcoming.length,
          followedEvents: followed.length,
          suggestedEvents: suggested.length,
          pastEvents: myPast.length
        });
        
      } catch (error) {
        console.error('[HomeScreen] Failed to load event feed:', error);
        vibeAlert.error('Error', 'Failed to load events. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadEventFeed();
    
    // Optionally, set up a real-time subscription for my events only
    const q = query(
      collection(db, 'studios', userStudio, 'events'),
      orderBy('eventTimestamp')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Only update if we detect changes to user's subscribed events
      const hasSubscribedEventChanges = snapshot.docChanges().some(change => {
        const eventData = change.doc.data();
        return eventData.subscribers?.includes(currentUserId) || eventData.createdBy === currentUserId;
      });

      if (hasSubscribedEventChanges) {
        console.log('[HomeScreen] Detected changes to subscribed events, reloading feed...');
        loadEventFeed();
      }
    });

    return unsubscribe;
  }, [currentUserId, userData, vibeAlert]); // Re-run when user data changes

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

  // Don't show empty state while loading
  if (isLoading) {
    return (
      <View style={[styles.screen, styles.centerContent]}>
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  // Show main empty state if no events exist anywhere
  if (hasNoEvents) {
    return (
      <View style={styles.screen}>
        <EmptyStateView navigation={navigation} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Big Vibe Studios</Text>
        <View style={styles.headerIcons}>
          <NotificationButton
            onPress={() => navigation.navigate('Notifications')}
            iconComponent={<Text style={styles.bellIcon}>🔔</Text>}
          />
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => setShowAccountSettings(true)}
          >
            <View style={styles.profileIcon}>
              <Text style={styles.profileIconText}>
                {userData?.userdata?.contactinfo?.firstName
                  ? userData.userdata.contactinfo.firstName.charAt(0).toUpperCase()
                  : '?'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
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
          <VibeButton
            label="ADMIN TOOLS"
            onPress={handleAdminMenu}
            variant="toggle"
            color="purple"
            style={[styles.fullButton, styles.adminButton]}
          />
        </View>
      </ScrollView>

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
    backgroundColor: theme.colors.black,
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
  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.vibeBlue || '#00C6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIconText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
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
