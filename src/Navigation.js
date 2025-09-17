import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { VibeLoadingScreen } from './components/ui/base';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';
import {
  getAuth,
  onAuthStateChanged,
  getDoc,
  doc,
  onSnapshot,
  getFirestore,
} from './lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

import app, { auth as firebaseAuth } from './auth/services/firebase';
import { UserDataCleanupService } from './services/UserDataCleanupService';
import { AuthProvider } from './auth/AuthContext';
import { RealtimeNotificationsProvider } from './contexts/RealtimeNotificationsContext';
import fcmService from './services/fcmServiceWrapper';

// Consolidated screen imports using barrel exports
import {
  LandingScreen,
  HomeScreen,
  NotificationsScreen,
  InviteScreen,
  PrivacySettingsScreen,
  NotificationSettingsScreen,
  UserProfileScreen,
  SocialListScreen,
  InterestsScreen,
  AdminScreen,
  HostProfileScreen,
  MessageBoardScreen,
} from './screens';

import { ContactInfoScreen, LocationScreen } from './auth/screens';

import {
  CreateEventScreen,
  EventDetailScreen,
  EventNotificationSettingsScreen,
  InviteGuestsScreen,
  InvitationsScreen,
  AttendanceScreen,
  EditEventScreen,
  EventWrapUpScreen,
} from './events/screens';

const Stack = createNativeStackNavigator();

// Use the already initialized auth from firebase.js
const auth = firebaseAuth;

const db = getFirestore(app);

export default function Navigation() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [userDataLoading, setUserDataLoading] = useState(false);

  // Navigation reference for deep linking
  const navigationRef = React.useRef();

  // Deep linking configuration
  const linking = {
    prefixes: [
      Linking.createURL('/'),
      'bvs-app://',
      'https://bigvibestudios.com',
    ],
    config: {
      screens: {
        UserProfile: {
          path: '/user/:userId',
          parse: {
            userId: (userId) => userId,
          },
        },
        EventDetail: {
          path: '/invite/:inviteCode',
          parse: {
            inviteCode: (inviteCode) => inviteCode,
          },
        },
        // New route for app download universal links
        AppDownload: {
          path: '/join',
          parse: {
            studio: (studio) => studio,
            event: (event) => event,
          },
        },
      },
    },
    subscribe(listener) {
      // Handle pending deep links after authentication
      const handleDeepLink = async (url) => {
        if (!url) return;

        console.log('[Navigation] Deep link received:', url);

        // Parse URL to extract studio and event parameters for app download links
        try {
          const urlObj = new URL(url);
          if (urlObj.pathname === '/join') {
            const studioId = urlObj.searchParams.get('studio');
            const eventId = urlObj.searchParams.get('event');

            if (studioId && eventId) {
              // Store the studio and event for after authentication/onboarding
              await AsyncStorage.setItem(
                'pendingStudioSelection',
                JSON.stringify({
                  studioId,
                  eventId,
                  source: 'app-download-qr',
                })
              );
              console.log(
                '[Navigation] Stored pending studio/event selection:',
                { studioId, eventId }
              );
            }
          }
        } catch (error) {
          console.log('[Navigation] Error parsing deep link URL:', error);
        }

        // Store the deep link for after authentication
        if (!user) {
          await AsyncStorage.setItem('pendingDeepLink', url);
        }
      };

      // Listen for incoming links while app is running
      const subscription = Linking.addEventListener('url', handleDeepLink);

      // Check for initial deep link when app is opened
      Linking.getInitialURL().then(handleDeepLink);

      return () => subscription.remove();
    },
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        setUserDataLoading(true);

        try {
          const userRef = doc(db, 'users', user.uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            setUserData(snap.data());
          } else {
            setUserData(null);
          }

          // Initialize FCM service and register token for authenticated user
          try {
            if (!fcmService.isReady()) {
              console.log('[Navigation] Initializing FCM service...');
              await fcmService.initialize();
            }
            fcmService.setNavigationRef(navigationRef.current);

            // Register FCM token for authenticated user
            if (user?.uid) {
              const tokenRegistered = await fcmService.registerTokenForUser(
                user.uid
              );
              if (!tokenRegistered) {
                console.warn('[Navigation] Failed to register push token');
              }
            }
          } catch (fcmError) {
            console.error('[Navigation] FCM setup failed:', fcmError);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUserData(null);
        } finally {
          setUserDataLoading(false);
        }
      } else {
        // User logged out - cleanup FCM token
        if (user) {
          fcmService.removeTokenForUser(user.uid);
        }
        setUser(null);
        setUserData(null);
        setUserDataLoading(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      if (__DEV__) console.log('[Navigation] No user, skipping listener setup');
      return;
    }

    if (__DEV__) console.log('[Navigation] Setting up user data listener');
    const userDocRef = doc(db, 'users', user.uid);

    // Add debouncing to reduce excessive updates from rapid Firestore changes
    let updateTimeout;

    const unsubscribe = onSnapshot(
      userDocRef,
      (doc) => {
        // Clear any pending updates
        if (updateTimeout) {
          clearTimeout(updateTimeout);
        }

        // Debounce the update by 50ms to batch rapid changes
        updateTimeout = setTimeout(() => {
          if (__DEV__) console.log('[Navigation] User data updated');
          if (doc.exists()) {
            const newUserData = doc.data();

            // Only update state if navigation-relevant fields changed
            setUserData((prevUserData) => {
              if (!prevUserData) {
                // First load - always update
                return newUserData;
              }

              // Check if only interests changed (ignore preferences.interests updates)
              const { preferences: prevPrefs, ...prevRest } = prevUserData;
              const { preferences: newPrefs, ...newRest } = newUserData;

              const { interests: prevInterests, ...prevPrefsRest } =
                prevPrefs || {};
              const { interests: newInterests, ...newPrefsRest } =
                newPrefs || {};

              // Deep comparison of non-interest data
              const navigationDataChanged =
                JSON.stringify(prevRest) !== JSON.stringify(newRest) ||
                JSON.stringify(prevPrefsRest) !== JSON.stringify(newPrefsRest);

              if (navigationDataChanged) {
                return newUserData;
              } else {
                // Only interests changed - don't trigger re-render
                if (__DEV__)
                  console.log('[Navigation] Ignored interest-only update');
                return prevUserData;
              }
            });
          } else {
            if (__DEV__) console.log('[Navigation] User document missing');
            setUserData(null);
          }
        }, 50);
      },
      (error) => {
        console.error('[Navigation] Firestore listener error:', error);
      }
    );

    if (__DEV__) console.log('[Navigation] User data listener created');
    return () => {
      if (__DEV__) console.log('[Navigation] Cleaning up user data listener');
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      unsubscribe();
    };
  }, [user]);

  // Handle pending deep links after user is fully authenticated and has completed onboarding
  useEffect(() => {
    const handlePendingDeepLink = async () => {
      if (!user || !userData || userDataLoading) return;

      const userStatus =
        UserDataCleanupService.getUserCompletionStatus(userData);
      if (!userStatus.hasContactInfo || !userStatus.hasLocation) return;

      try {
        const pendingLink = await AsyncStorage.getItem('pendingDeepLink');
        if (!pendingLink) return;

        console.log('[Navigation] Processing pending deep link:', pendingLink);

        // Clear the pending link
        await AsyncStorage.removeItem('pendingDeepLink');

        // Parse and navigate to the deep link
        if (pendingLink.includes('/user/')) {
          const userId = pendingLink.split('/user/')[1];
          if (userId && navigationRef.current) {
            navigationRef.current.navigate('UserProfile', { userId });
          }
        } else if (pendingLink.includes('/invite/')) {
          const inviteCode = pendingLink.split('/invite/')[1];
          if (inviteCode && navigationRef.current) {
            // Find event by invite code and navigate
            const { findEventByInviteCode } = await import(
              './services/inviteCodeService'
            );
            const result = await findEventByInviteCode(inviteCode);

            if (result) {
              navigationRef.current.navigate('EventDetail', {
                eventId: result.eventId,
                studioId: result.studioId,
                inviteCode: inviteCode,
              });
            }
          }
        } else if (pendingLink.includes('/join')) {
          // Handle app download universal links
          try {
            const urlObj = new URL(pendingLink);
            const studioId = urlObj.searchParams.get('studio');
            const eventId = urlObj.searchParams.get('event');

            if (studioId && eventId && navigationRef.current) {
              console.log(
                '[Navigation] Navigating to event from app download link:',
                { studioId, eventId }
              );
              navigationRef.current.navigate('EventDetail', {
                eventId: eventId,
                studioId: studioId,
                source: 'app-download-qr',
              });
            }
          } catch (error) {
            console.error(
              '[Navigation] Error parsing app download link:',
              error
            );
          }
        }
      } catch (error) {
        console.error('[Navigation] Error handling pending deep link:', error);
      }
    };

    handlePendingDeepLink();
  }, [user, userData, userDataLoading]);

  if (loading) {
    return (
      <VibeLoadingScreen
        loadingText="Initializing app..."
        showBranding={true}
      />
    );
  }

  // Get user completion status based on actual data
  const userStatus = UserDataCleanupService.getUserCompletionStatus(userData);

  // Log navigation state for debugging
  if (__DEV__) {
    console.log(
      '[Navigation] Auth state:',
      user ? 'authenticated' : 'unauthenticated'
    );
    console.log(
      '[Navigation] Contact info:',
      userStatus.hasContactInfo ? 'complete' : 'missing'
    );
    console.log(
      '[Navigation] Location:',
      userStatus.hasLocation ? 'set' : 'missing'
    );
    console.log('[Navigation] User data updated');
  }

  return (
    <AuthProvider user={user} userData={userData}>
      <RealtimeNotificationsProvider>
        <NavigationContainer ref={navigationRef} linking={linking}>
          {!user ? (
            <Stack.Navigator
              initialRouteName="Landing"
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: 'transparent' },
              }}
            >
              <Stack.Screen name="Landing" component={LandingScreen} />
            </Stack.Navigator>
          ) : userDataLoading ? (
            <VibeLoadingScreen
              loadingText="Loading your profile..."
              showBranding={false}
            />
          ) : userData === null || !userStatus.hasContactInfo ? (
            <Stack.Navigator
              initialRouteName="ContactInfo"
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: 'transparent' },
              }}
            >
              <Stack.Screen name="ContactInfo" component={ContactInfoScreen} />
            </Stack.Navigator>
          ) : !userStatus.hasLocation ? (
            <Stack.Navigator
              initialRouteName="Location"
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: 'transparent' },
              }}
            >
              <Stack.Screen name="Location" component={LocationScreen} />
            </Stack.Navigator>
          ) : (
            <Stack.Navigator
              initialRouteName="Home"
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: 'transparent' },
              }}
            >
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
              <Stack.Screen
                name="EventNotificationSettings"
                component={EventNotificationSettingsScreen}
              />
              <Stack.Screen name="EventDetail" component={EventDetailScreen} />
              <Stack.Screen name="EditEvent" component={EditEventScreen} />
              <Stack.Screen
                name="InviteGuests"
                component={InviteGuestsScreen}
              />
              <Stack.Screen name="Invitations" component={InvitationsScreen} />
              <Stack.Screen
                name="EventAttendance"
                component={AttendanceScreen}
              />
              <Stack.Screen
                name="Notifications"
                component={NotificationsScreen}
              />
              <Stack.Screen
                name="Invite"
                component={InviteScreen}
                options={{
                  headerShown: false,
                  gestureEnabled: true,
                }}
              />
              <Stack.Screen name="Location" component={LocationScreen} />
              <Stack.Screen name="UserProfile" component={UserProfileScreen} />
              <Stack.Screen
                name="SocialList"
                component={SocialListScreen}
                options={{
                  title: 'Social List',
                }}
              />
              <Stack.Screen name="Privacy" component={PrivacySettingsScreen} />
              <Stack.Screen
                name="NotificationSettings"
                component={NotificationSettingsScreen}
              />
              <Stack.Screen name="Interests" component={InterestsScreen} />
              <Stack.Screen name="Admin" component={AdminScreen} />
              <Stack.Screen name="HostProfile" component={HostProfileScreen} />
              <Stack.Screen
                name="MessageBoard"
                component={MessageBoardScreen}
              />
              <Stack.Screen name="EventWrapUp" component={EventWrapUpScreen} />
            </Stack.Navigator>
          )}
        </NavigationContainer>
      </RealtimeNotificationsProvider>
    </AuthProvider>
  );
}

export { auth, db };

const styles = {};
