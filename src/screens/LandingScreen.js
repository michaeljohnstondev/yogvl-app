import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import {
  VibeInput,
  VibeButton,
  VibeSegmentedControl,
} from '../components/ui/base';
import { useNavigation } from '@react-navigation/native';
import { useVibeAlert } from '../components/ui/base/VibeAlertContext';
import { login, signup, resetPassword } from '../auth/services/FirebaseAuthService';
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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
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

  const handleForgotPassword = async () => {
    if (!email) {
      vibeAlert.warning('Email Required', 'Please enter your email address to reset your password.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      vibeAlert.success('Email Sent!', `Password reset instructions have been sent to ${email}`);
      setShowForgotPassword(false);
    } catch (err) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/user-not-found') {
        vibeAlert.error('Email Not Found', 'No account exists with this email address.');
      } else {
        vibeAlert.error('Reset Failed', getHumanFriendlyError(err));
      }
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
        <Image
          source={require('../../assets/TheYoBanner.png')}
          style={styles.banner}
          resizeMode="contain"
        />

        {/* Forgot Password Mode */}
        {showForgotPassword ? (
          <View style={styles.forgotPasswordSection}>
            <Text style={styles.forgotPasswordTitle}>Reset Password</Text>
            <Text style={styles.forgotPasswordDescription}>
              Enter your email and we'll send you a link to reset your password.
            </Text>
            <VibeInput
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              onChangeText={setEmail}
              value={email}
              maxLength={254}
              style={styles.authInput}
            />
            <VibeButton
              label={loading ? 'Sending...' : 'Send Reset Link'}
              onPress={handleForgotPassword}
              disabled={loading}
              style={styles.resetButton}
            />
            <Text
              style={styles.cancelLink}
              onPress={() => setShowForgotPassword(false)}
            >
              Back to Login
            </Text>
          </View>
        ) : (
          <>
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

            {/* Forgot Password Link - Always reserve space to prevent layout shift */}
            <View style={styles.forgotPasswordContainer}>
              {authMode === 'login' && (
                <Text
                  style={styles.forgotPasswordLink}
                  onPress={() => setShowForgotPassword(true)}
                >
                  Forgot Password?
                </Text>
              )}
            </View>
          </>
        )}
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
    paddingTop: 0,
    paddingBottom: 40,
    minHeight: '100%',
  },
  banner: {
    width: '100%',
    height: 120,
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
  forgotPasswordContainer: {
    height: 54, // Reserve space: 20px top margin + 14px font + 20px line height
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotPasswordLink: {
    color: theme.colors.vibeBlue,
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  forgotPasswordSection: {
    width: '100%',
  },
  forgotPasswordTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.white,
    textAlign: 'center',
    marginBottom: 12,
  },
  forgotPasswordDescription: {
    fontSize: 14,
    color: theme.colors.gray,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  resetButton: {
    marginTop: 10,
    width: '100%',
  },
  cancelLink: {
    color: theme.colors.vibeBlue,
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
    paddingVertical: 8,
    marginTop: 12,
  },
});
