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
import { notificationPermissionService } from './services/notificationPermissionService';

// Consolidated screen imports using barrel exports
import {
  LandingScreen,
  HomeScreen,
  EventListScreen,
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
  HostEventNotificationsScreen,
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

export default function Navigation({ onReady }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [userDataLoading, setUserDataLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Initializing app...");

  // Navigation reference for deep linking
  const navigationRef = React.useRef();

  // Handler for when NavigationContainer is ready
  const handleNavigationReady = () => {
    if (navigationRef.current) {
      fcmService.setNavigationRef(navigationRef.current);
    }
  };

  // Deep linking configuration
  const linking = {
    prefixes: [
      Linking.createURL('/'),
      'the-yo://',
      'https://bigvibestudios.com',
      'https://theyo.org',
    ],
    config: {
      screens: {
        UserProfile: {
          path: '/user/:userId',
          parse: {
            userId: (userId) => userId,
          },
        },
        // Direct event link. Note: /invite/:inviteCode is handled in the
        // subscribe() handler below so we can resolve the code to an event
        // before navigating; it is intentionally NOT mapped here.
        EventDetail: {
          path: '/event/:eventId',
          parse: {
            eventId: (eventId) => eventId,
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
        // Promo QR deep link (studio + interests)
        Interests: {
          path: '/promo/:studioId',
          parse: {
            studioId: (studioId) => studioId,
          },
        },
      },
    },
    subscribe(listener) {
      // Handle pending deep links after authentication
      const handleDeepLink = async (url) => {
        if (!url) return;

        console.log('[Navigation] Deep link received:', url);

        // Parse URL to extract parameters for deep links
        try {
          const urlObj = new URL(url);
          const pathname = urlObj.pathname;

          if (pathname.startsWith('/invite/') || pathname.startsWith('/theyo/invite/')) {
            // Resolve invite code → event, then navigate (if signed in)
            // or stash for after-auth processing.
            const inviteCode = pathname
              .replace('/theyo/invite/', '')
              .replace('/invite/', '')
              .split('/')[0];

            if (inviteCode) {
              try {
                const { findEventByInviteCode } = await import(
                  './services/inviteCodeService'
                );
                const result = await findEventByInviteCode(inviteCode);
                if (result?.eventId) {
                  if (user && navigationRef.current) {
                    navigationRef.current.navigate('EventDetail', {
                      eventId: result.eventId,
                      studioId: result.studioId,
                      inviteCode,
                    });
                    return;
                  } else {
                    await AsyncStorage.setItem(
                      'pendingDeepLink',
                      `/invite/${inviteCode}`
                    );
                  }
                } else {
                  console.warn('[Navigation] No event found for invite code:', inviteCode);
                }
              } catch (error) {
                console.error('[Navigation] Failed to resolve invite code:', error);
              }
            }
          } else if (pathname === '/join' || pathname === '/theyo/join') {
            // App download QR with studio + event
            const studioId = urlObj.searchParams.get('studio');
            const eventId = urlObj.searchParams.get('event');

            if (studioId && eventId) {
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
          } else if (pathname.startsWith('/promo/') || pathname.startsWith('/theyo/promo/')) {
            // Promo QR with studio + interests
            const promoPath = pathname.startsWith('/theyo/promo/')
              ? pathname.replace('/theyo/promo/', '')
              : pathname.replace('/promo/', '');
            const studioId = promoPath.split('/')[0];
            const interestsParam = urlObj.searchParams.get('interests');
            const interests = interestsParam
              ? interestsParam.split(',').map(i => decodeURIComponent(i.trim())).filter(Boolean)
              : [];

            if (studioId) {
              // Store promo data for processing through onboarding
              const promoData = { studioId, interests, source: 'promo-qr' };
              await AsyncStorage.setItem('pendingPromoData', JSON.stringify(promoData));

              // Also set pendingStudioSelection for LocationScreen to auto-select
              await AsyncStorage.setItem(
                'pendingStudioSelection',
                JSON.stringify({
                  studioId,
                  source: 'promo-qr',
                })
              );

              console.log('[Navigation] Stored pending promo data:', promoData);
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
            const data = snap.data();
            setUserData(data);
          } else {
            console.warn('[Navigation] ⚠️ User document does not exist');
            setUserData(null);
          }

          // Initialize FCM, notification permissions, and register token in parallel
          try {
            const fcmReady = fcmService.isReady()
              ? Promise.resolve()
              : fcmService.initialize();
            const permReady = notificationPermissionService.initialized
              ? Promise.resolve()
              : notificationPermissionService.initialize();

            await Promise.all([fcmReady, permReady]);

            // Register token after FCM is ready
            if (user?.uid) {
              const tokenRegistered = await fcmService.registerTokenForUser(
                user.uid
              );
              if (!tokenRegistered) {
                console.warn('[Navigation] ⚠️ Failed to register push token');
              }
            }
          } catch (fcmError) {
            console.error('[Navigation] ❌ FCM setup failed:', fcmError);
          }

          // Signal to FCM that auth and user data are ready
          fcmService.setAuthReady(user.uid);
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
      return;
    }

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
          if (doc.exists()) {
            const newUserData = doc.data();

            // Only update state if navigation-relevant fields changed
            setUserData((prevUserData) => {
              if (!prevUserData) {
                // First load - always update
                return newUserData;
              }

              // Exclude non-navigation-relevant fields from comparison
              // These fields change frequently but don't affect routing/navigation
              const { preferences: prevPrefs, userdata: prevUserdata, ...prevRest } = prevUserData;
              const { preferences: newPrefs, userdata: newUserdata, ...newRest } = newUserData;

              // Exclude interests from preferences comparison
              const { interests: prevInterests, ...prevPrefsRest } = prevPrefs || {};
              const { interests: newInterests, ...newPrefsRest } = newPrefs || {};

              // Exclude social metrics from userdata comparison (follow/unfollow shouldn't reset navigation)
              const { metrics: prevMetrics, ...prevUserdataRest } = prevUserdata || {};
              const { metrics: newMetrics, ...newUserdataRest } = newUserdata || {};

              const { social: prevSocial, ...prevMetricsRest } = prevMetrics || {};
              const { social: newSocial, ...newMetricsRest } = newMetrics || {};

              // Deep comparison of navigation-relevant data only
              const navigationDataChanged =
                JSON.stringify(prevRest) !== JSON.stringify(newRest) ||
                JSON.stringify(prevPrefsRest) !== JSON.stringify(newPrefsRest) ||
                JSON.stringify(prevUserdataRest) !== JSON.stringify(newUserdataRest) ||
                JSON.stringify(prevMetricsRest) !== JSON.stringify(newMetricsRest);

              if (navigationDataChanged) {
                // Navigation-relevant data changed - update state
                return newUserData;
              } else {
                // Only non-navigation fields changed (interests, social metrics) - don't trigger re-render
                return prevUserData;
              }
            });
          } else {
            setUserData(null);
          }
        }, 50);
      },
      (error) => {
        console.error('[Navigation] Firestore listener error:', error);
      }
    );

    return () => {
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

      // Check for pending promo data (works even during onboarding - interests are auto-added on InterestsScreen)
      // No navigation needed here - LocationScreen and InterestsScreen read pendingPromoData from AsyncStorage
      try {
        const promoData = await AsyncStorage.getItem('pendingPromoData');
        if (promoData && userStatus.isComplete) {
          // Fully onboarded user scanned a promo QR - navigate to Interests to auto-add
          const { interests } = JSON.parse(promoData);
          if (interests?.length > 0 && navigationRef.current) {
            console.log('[Navigation] Fully onboarded user with promo data, navigating to Interests');
            navigationRef.current.navigate('Interests', { promoInterests: interests });
          }
          // pendingPromoData will be cleared by InterestsScreen after processing
        }
      } catch (error) {
        console.error('[Navigation] Error checking promo data:', error);
      }

      // For non-promo deep links, wait until fully onboarded (including interests)
      if (!userStatus.hasContactInfo || !userStatus.hasLocation || !userStatus.hasInterests) return;

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
        } else if (pendingLink.includes('/join') || pendingLink.includes('/theyo/join')) {
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
        // Promo deep links are handled above via pendingPromoData, not here
      } catch (error) {
        console.error('[Navigation] Error handling pending deep link:', error);
      }
    };

    handlePendingDeepLink();
  }, [user, userData, userDataLoading]);

  // Update loading message based on current state
  useEffect(() => {
    if (loading) {
      setLoadingMessage("Initializing app...");
    } else if (userDataLoading) {
      setLoadingMessage("Loading your profile...");
    }
  }, [loading, userDataLoading]);

  // Call onReady when loading is complete
  useEffect(() => {
    if (!loading && !userDataLoading && onReady) {
      // Small delay to ensure everything is rendered
      setTimeout(() => {
        onReady();
      }, 100);
    }
  }, [loading, userDataLoading, onReady]);

  // Return null during loading - native splash will remain visible
  if (loading || userDataLoading) {
    return null;
  }

  // Get user completion status based on actual data
  const userStatus = UserDataCleanupService.getUserCompletionStatus(userData);

  return (
    <AuthProvider user={user} userData={userData}>
      <RealtimeNotificationsProvider>
        <NavigationContainer ref={navigationRef} linking={linking} onReady={handleNavigationReady}>
          {!user ? (
            <Stack.Navigator
              initialRouteName="Landing"
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: 'transparent' },
                presentation: 'card',
                animation: 'none',
                animationEnabled: false,
              }}
            >
              <Stack.Screen name="Landing" component={LandingScreen} />
            </Stack.Navigator>
          ) : userData === null || !userStatus.hasContactInfo ? (
            <Stack.Navigator
              initialRouteName="ContactInfo"
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: 'transparent' },
                presentation: 'card',
                animation: 'none',
                animationEnabled: false,
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
                presentation: 'card',
                animation: 'none',
                animationEnabled: false,
              }}
            >
              <Stack.Screen name="Location" component={LocationScreen} />
            </Stack.Navigator>
          ) : !userStatus.hasInterests ? (
            <Stack.Navigator
              initialRouteName="Interests"
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: 'transparent' },
                presentation: 'card',
                animation: 'none',
                animationEnabled: false,
              }}
            >
              <Stack.Screen name="Interests" component={InterestsScreen} />
            </Stack.Navigator>
          ) : (
            <Stack.Navigator
              initialRouteName="Home"
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: 'transparent' },
                presentation: 'card',
                animation: 'none',
                animationEnabled: false,
              }}
            >
              <Stack.Screen name="Home" component={HomeScreen} />
              <Stack.Screen
                name="EventList"
                component={EventListScreen}
              />
              <Stack.Screen
                name="CreateEvent"
                component={CreateEventScreen}
              />
              <Stack.Screen
                name="HostEventNotifications"
                component={HostEventNotificationsScreen}
              />
              <Stack.Screen
                name="EventDetail"
                component={EventDetailScreen}
              />
              <Stack.Screen
                name="EditEvent"
                component={EditEventScreen}
              />
              <Stack.Screen
                name="InviteGuests"
                component={InviteGuestsScreen}
              />
              <Stack.Screen
                name="Invitations"
                component={InvitationsScreen}
              />
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
                  presentation: 'card',
                  animation: 'default',
                  animationDuration: 150,
                }}
              />
              <Stack.Screen
                name="Location"
                component={LocationScreen}
              />
              <Stack.Screen
                name="UserProfile"
                component={UserProfileScreen}
              />
              <Stack.Screen
                name="SocialList"
                component={SocialListScreen}
                options={{
                  title: 'Social List',
                  presentation: 'card',
                  animation: 'default',
                  animationDuration: 150,
                }}
              />
              <Stack.Screen
                name="Privacy"
                component={PrivacySettingsScreen}
              />
              <Stack.Screen
                name="NotificationSettings"
                component={NotificationSettingsScreen}
              />
              <Stack.Screen
                name="Interests"
                component={InterestsScreen}
              />
              <Stack.Screen
                name="Admin"
                component={AdminScreen}
              />
              <Stack.Screen
                name="HostProfile"
                component={HostProfileScreen}
              />
              <Stack.Screen
                name="MessageBoard"
                component={MessageBoardScreen}
              />
              <Stack.Screen
                name="EventWrapUp"
                component={EventWrapUpScreen}
              />
            </Stack.Navigator>
          )}
        </NavigationContainer>
      </RealtimeNotificationsProvider>
    </AuthProvider>
  );
}

export { auth, db };

const styles = {};
