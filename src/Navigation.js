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

import app from './auth/firebase';
import { AuthProvider } from './auth/AuthContext';
import LandingScreen from './screens/LandingScreen';
import LoginScreen from './auth/screens/LoginScreen';
import SignUpScreen from './auth/screens/SignUpScreen';
import ContactInfoScreen from './auth/screens/ContactInfoScreen';
import HomeScreen from './screens/HomeScreen';
import CreateEventScreen from './components/events/screens/CreateEventScreen';
import EventDetailScreen from './components/events/screens/EventDetailScreen';
//import EditEventScreen from './components/events/screens/EditEventScreen';
import VibeWrappedScreen from './components/vibeComponents/VibeWrappedScreen';

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
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUserData(null);
        } finally {
          setUserDataLoading(false);
        }
      } else {
        setUser(null);
        setUserData(null);
        setUserDataLoading(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(
      userDocRef,
      (doc) => {
        if (doc.exists()) {
          setUserData(doc.data());
        } else {
          setUserData(null);
        }
      },
      (error) => {
        console.error('Firestore listener error:', error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  console.log(
    'Navigation render - User:',
    user
      ? `${user.email} | Completed: ${userData?.hasCompletedContactInfo}`
      : 'No user'
  );

  return (
    <AuthProvider user={user} userData={userData}>
      <NavigationContainer>
        {!user ? (
          <Stack.Navigator
            initialRouteName="Landing"
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen
              name="Landing"
              component={VibeWrappedScreen(LandingScreen)}
            />
            <Stack.Screen
              name="Login"
              component={VibeWrappedScreen(LoginScreen)}
            />
            <Stack.Screen
              name="SignUp"
              component={VibeWrappedScreen(SignUpScreen)}
            />
          </Stack.Navigator>
        ) : userDataLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        ) : userData === null || !userData.hasCompletedContactInfo ? (
          <Stack.Navigator
            initialRouteName="ContactInfo"
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen
              name="ContactInfo"
              component={VibeWrappedScreen(ContactInfoScreen)}
            />
          </Stack.Navigator>
        ) : (
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen
              name="Home"
              component={VibeWrappedScreen(HomeScreen)}
            />
            <Stack.Screen
              name="CreateEvent"
              component={VibeWrappedScreen(CreateEventScreen)}
            />
            <Stack.Screen
              name="EventDetail"
              component={VibeWrappedScreen(EventDetailScreen)}
            />
            <Stack.Screen
              name="EditEvent"
              component={VibeWrappedScreen(CreateEventScreen)}
            />
          </Stack.Navigator>
        )}
      </NavigationContainer>
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
