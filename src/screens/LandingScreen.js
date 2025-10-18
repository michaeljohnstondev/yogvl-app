import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  VibeInput,
  VibeButton,
  VibeSegmentedControl,
} from '../components/ui/base';
import { useNavigation } from '@react-navigation/native';
import { useVibeAlert } from '../components/ui/base/VibeAlertContext';
import { login, signup } from '../auth/services/FirebaseAuthService';
import { db } from '../auth/services/firebase';
import { doc, setDoc } from '../lib/firebase';
import {
  getDefaultUserSettings,
  getDefaultUserMetrics,
} from '../services/defaultUserSettings';
import theme from '../theme/themes';
// Helper function to convert Firebase errors to human-friendly messages
const getHumanFriendlyError = (error) => {
  const errorCode = error.code || error.message;

  switch (errorCode) {
    case 'auth/user-not-found':
    case 'auth/invalid-email':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Wrong email or password. Double-check and try again!';

    case 'auth/email-already-in-use':
      return 'This email is already registered. Try logging in instead!';

    case 'auth/weak-password':
      return 'Choose a stronger password (at least 6 characters).';

    case 'auth/too-many-requests':
      return 'Too many failed attempts. Try again in a few minutes.';

    case 'auth/network-request-failed':
      return 'Connection issue. Check your internet and try again.';

    case 'auth/user-disabled':
      return 'This account has been disabled. Contact support if you need help.';

    default:
      // For any other errors, provide a generic friendly message
      return 'Something went wrong. Please try again!';
  }
};

export default function LandingScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation();
  const [authMode, setAuthMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const vibeAlert = useVibeAlert();

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      vibeAlert.warning('Missing fields', 'Please enter email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      console.log('Login successful - Navigation will handle routing');
    } catch (err) {
      console.error('Login error:', err);
      vibeAlert.error('Login Failed', getHumanFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      vibeAlert.warning('Missing fields', 'Please enter email and password.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signup(email, password);
      const user = userCredential.user;
      console.log('Signed up:', user);

      await setDoc(
        doc(db, 'users', user.uid),
        {
          userdata: {
            contactInfo: {
              email: user.email,
            },
            metadata: {
              createdAt: new Date(),
            },
            settings: getDefaultUserSettings(),
            metrics: getDefaultUserMetrics(),
          },
          uid: user.uid,
        },
        { merge: true }
      );

      console.log(
        'User document created successfully - Navigation will handle routing'
      );
    } catch (err) {
      console.error('Signup error:', err);
      vibeAlert.error('Signup Failed', getHumanFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <Text style={styles.title}>Big Vibe Studios</Text>

        {/* Auth Mode Toggle */}
        <VibeSegmentedControl
          options={[
            { label: 'Sign Up', value: 'signup' },
            { label: 'Log In', value: 'login' },
          ]}
          selectedValue={authMode}
          onSelect={setAuthMode}
          style={styles.authToggle}
        />

        {/* Email/Password Form */}
        <VibeInput
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          onChangeText={setEmail}
          value={email}
          maxLength={254}
          style={styles.authInput}
        />

        <VibeInput
          placeholder="Password"
          secureTextEntry
          autoCapitalize="none"
          onChangeText={setPassword}
          value={password}
          maxLength={128}
          style={styles.authInput}
        />

        <VibeButton
          label={
            loading
              ? authMode === 'login'
                ? 'Signing In...'
                : 'Creating Account...'
              : authMode === 'login'
                ? 'Sign In'
                : 'Sign Up'
          }
          onPress={authMode === 'login' ? handleLogin : handleSignUp}
          disabled={loading}
          style={styles.authButton}
        />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    minHeight: '100%',
  },
  title: {
    fontSize: 48,
    fontFamily: theme.fonts.comicBold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 40,
  },
  authToggle: {
    width: '100%',
    marginBottom: 30,
  },
  authInput: {
    width: '100%',
    marginBottom: 20,
  },
  authButton: {
    marginTop: 10,
    width: '100%',
  },
});
