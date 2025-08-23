import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  getAuth,
  initializeAuth,
  onAuthStateChanged,
  getReactNativePersistence,
} from 'firebase/auth';
import { getFirestore, getDoc, doc, onSnapshot } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

import app from './auth/services/firebase';
import { UserDataCleanupService } from './services/UserDataCleanupService';
import { AuthProvider } from './auth/AuthContext';
import { useEventEndNotifications } from './hooks/useEventEndNotifications';
import fcmService from './services/fcmService';
import LandingScreen from './screens/LandingScreen';
import LoginScreen from './auth/screens/LoginScreen';
import SignUpScreen from './auth/screens/SignUpScreen';
import ContactInfoScreen from './auth/screens/ContactInfoScreen';
import LocationScreen from './auth/screens/LocationScreen';
import HomeScreen from './screens/HomeScreen';
import CreateEventScreen from './events/screens/CreateEventScreen';
import EventDetailScreen from './events/screens/EventDetailScreen';
import InviteGuestsScreen from './events/screens/InviteGuestsScreen';
import InvitationsScreen from './events/screens/InvitationsScreen';
import AttendanceScreen from './events/screens/AttendanceScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import InviteScreen from './screens/InviteScreen';
import PrivacySettingsScreen from './screens/PrivacySettingsScreen';
import NotificationSettingsScreen from './screens/NotificationSettingsScreen';
import UserProfileScreen from './screens/UserProfileScreen';
import InterestsScreen from './screens/InterestsScreen';
import AdminScreen from './screens/AdminScreen';
//import EditEventScreen from './events/screens/EditEventScreen/EditEventScreen';
import VibeScreen from './components/ui/VibeScreen';

const Stack = createNativeStackNavigator();

// Initialize Firebase services with persistence
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  if (error.code === 'auth/already-initialized') {
    auth = getAuth(app);
  } else {
    throw error;
  }
}

const db = getFirestore(app);

export default function Navigation() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [userDataLoading, setUserDataLoading] = useState(false);

  // Navigation reference for deep linking
  const navigationRef = React.useRef();

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
          if (!fcmService.isReady()) {
            await fcmService.initialize();
          }
          fcmService.setNavigationRef(navigationRef.current);
          await fcmService.registerTokenForUser(user.uid);

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
    const unsubscribe = onSnapshot(
      userDocRef,
      (doc) => {
        if (__DEV__) console.log('[Navigation] User data updated');
        if (doc.exists()) {
          const newUserData = doc.data();
          setUserData(newUserData);
        } else {
          if (__DEV__) console.log('[Navigation] User document missing');
          setUserData(null);
        }
      },
      (error) => {
        console.error('[Navigation] Firestore listener error:', error);
      }
    );

    if (__DEV__) console.log('[Navigation] User data listener created');
    return () => {
      if (__DEV__) console.log('[Navigation] Cleaning up user data listener');
      unsubscribe();
    };
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Get user completion status based on actual data
  const userStatus = UserDataCleanupService.getUserCompletionStatus(userData);
  
  // Basic navigation state logging (no sensitive data)
  if (__DEV__) {
    console.log('[Navigation] Auth state:', user ? 'authenticated' : 'unauthenticated');
    console.log('[Navigation] Contact info:', userStatus.hasContactInfo ? 'complete' : 'missing');
    console.log('[Navigation] Location:', userStatus.hasLocation ? 'set' : 'missing');
  }

  return (
    <AuthProvider user={user} userData={userData}>
      <VibeScreen>
        <NavigationContainer ref={navigationRef}>
        {!user ? (
          <Stack.Navigator
            initialRouteName="Landing"
            screenOptions={{ 
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' }
            }}
          >
            <Stack.Screen
              name="Landing"
              component={LandingScreen}
            />
            <Stack.Screen
              name="Login"
              component={LoginScreen}
            />
            <Stack.Screen
              name="SignUp"
              component={SignUpScreen}
            />
          </Stack.Navigator>
        ) : userDataLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : userData === null || !userStatus.hasContactInfo ? (
          <Stack.Navigator
            initialRouteName="ContactInfo"
            screenOptions={{ 
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' }
            }}
          >
            <Stack.Screen
              name="ContactInfo"
              component={ContactInfoScreen}
            />
          </Stack.Navigator>
        ) : !userStatus.hasLocation ? (
          <Stack.Navigator
            initialRouteName="Location"
            screenOptions={{ 
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' }
            }}
          >
            <Stack.Screen
              name="Location"
              component={LocationScreen}
            />
          </Stack.Navigator>
        ) : (
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{ 
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' }
            }}
          >
            <Stack.Screen
              name="Home"
              component={HomeScreen}
            />
            <Stack.Screen
              name="CreateEvent"
              component={CreateEventScreen}
            />
            <Stack.Screen
              name="EventDetail"
              component={EventDetailScreen}
            />
            <Stack.Screen
              name="EditEvent"
              component={CreateEventScreen}
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
          </Stack.Navigator>
        )}
        </NavigationContainer>
      </VibeScreen>
    </AuthProvider>
  );
}

export { auth, db };

const styles = {
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
};
