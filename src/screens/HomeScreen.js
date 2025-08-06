import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import VibeButton from '../components/VibeButton';
import VibeCarousel from '../components/VibeCarousel';
import EventCard from '../components/EventCard';
import EmptyStateView from '../components/EmptyStateView';
import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';

export default function HomeScreen({ navigation }) {
  const [myEvents, setMyEvents] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get auth data from context
  const { currentUserId, userData, isAuthenticated } = useAuth();

  useEffect(() => {
    // Listen to all events
    const q = query(collection(db, 'events'), orderBy('eventTimestamp'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = new Date();
      const myUpcoming = [];
      const otherUpcoming = [];
      const myPast = [];

      // Get subscribed event IDs from user data (already loaded in context)
      const subscribedEventIds = userData?.subscribedEvents || [];

      snapshot.docs.forEach((doc) => {
        const eventData = {
          id: doc.id,
          ...doc.data(),
        };

        const eventDate = eventData.eventTimestamp
          ? eventData.eventTimestamp.toDate()
          : new Date(eventData.utcDateTime);

        // Check if user is subscribed (dual check for safety)
        const isUserSubscribed =
          isAuthenticated &&
          (subscribedEventIds.includes(eventData.id) ||
            (eventData.subscribers &&
              eventData.subscribers.includes(currentUserId)));

        if (eventDate >= now) {
          if (isUserSubscribed) {
            myUpcoming.push(eventData);
          } else {
            otherUpcoming.push(eventData);
          }
        } else {
          // Only add to past events if user was subscribed
          if (isUserSubscribed) {
            myPast.push(eventData);
          }
        }
      });

      setMyEvents(myUpcoming);
      setUpcomingEvents(otherUpcoming);
      setPastEvents(myPast.reverse()); // Most recent first
      setIsLoading(false);
    });

    return unsubscribe;
  }, [currentUserId, userData]); // Re-run when user data changes

  // Check if user has no events at all
  const hasNoEvents =
    myEvents.length === 0 &&
    upcomingEvents.length === 0 &&
    pastEvents.length === 0;

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
      <ScrollView contentContainerStyle={styles.container}>
        {myEvents.length > 0 && (
          <>
            <Text style={styles.header}>My Events</Text>
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

        {upcomingEvents.length > 0 && (
          <>
            <Text style={styles.header}>Browse Events</Text>
            <VibeCarousel
              data={upcomingEvents}
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
            <Text style={styles.header}>My Past Events</Text>
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
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: 'visible',
  },
  container: {
    paddingTop: 60,
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
  },
  fullButton: {
    width: '100%',
  },
  header: {
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
});
