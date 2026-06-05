import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  ScrollView,
  Image,
  Linking,
  Pressable,
  Platform,
} from 'react-native';
import {
  VibeInput,
  VibeButton,
  VibeSegmentedControl,
} from '../components/ui/base';
import { useNavigation } from '@react-navigation/native';
import { useVibeAlert } from '../components/ui/base/VibeAlertContext';
import {
  login,
  signup,
  resetPassword,
  signInWithGoogle,
  signInWithApple,
  ensureUserDocument,
} from '../auth/services/FirebaseAuthService';
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

    case 'auth/account-exists-with-different-credential':
      return 'An account with this email already exists. Try logging in with email and password.';

    case 'auth/credential-already-in-use':
      return 'This Google account is already linked to another user.';

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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
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
      await ensureUserDocument(userCredential.user);
      console.log('User document created - Navigation will handle routing');
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

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    let signedIn = false;
    try {
      const { userCredential, firstName, lastName } = await signInWithApple();
      const user = userCredential.user;
      signedIn = true;

      // Apple gives us name only on first sign-in. Pre-fill the user
      // doc so ContactInfo can skip the name step when present.
      await ensureUserDocument(user, {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        authProvider: 'apple',
      });

      console.log('Apple sign-in complete - Navigation will handle routing');
    } catch (err) {
      // Apple's cancellation codes — silently ignore
      if (err.code === 'ERR_REQUEST_CANCELED' || err.code === 'ERR_CANCELED') return;

      console.error('[AppleSignIn] failed', {
        signedIn,
        code: err?.code,
        message: err?.message,
      });

      // If Firebase signed in but the doc write failed, Navigation
      // will still route; suppress the error toast.
      if (signedIn) return;

      vibeAlert.error('Apple Sign-In Failed', getHumanFriendlyError(err));
    } finally {
      setAppleLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    let signedIn = false;
    try {
      const { userCredential } = await signInWithGoogle();
      const user = userCredential.user;
      signedIn = true;

      // Create user doc without firstName/lastName so contact info screen shows
      // The contact info screen will pre-fill name from auth.currentUser.displayName
      await ensureUserDocument(user, {
        profilePicture: user.photoURL || '',
        authProvider: 'google',
      });

      console.log('Google sign-in complete - Navigation will handle routing');
    } catch (err) {
      // User cancelled — do nothing
      if (err.code === 'SIGN_IN_CANCELLED' || err.code === '12501') return;

      console.error('[GoogleSignIn] failed', {
        signedIn,
        code: err?.code,
        message: err?.message,
        name: err?.name,
        stack: err?.stack,
      });

      // If the user is already signed in, the auth flow worked — only the
      // post-signin Firestore step failed. Don't scare the user; navigation
      // will still route them, and the next launch can retry the doc write.
      if (signedIn) return;

      vibeAlert.error('Google Sign-In Failed', getHumanFriendlyError(err));
    } finally {
      setGoogleLoading(false);
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
              disabled={loading || googleLoading || appleLoading}
              style={styles.authButton}
            />

            {/* Forgot Password Link */}
            {authMode === 'login' && (
              <Text
                style={styles.forgotPasswordLink}
                onPress={() => setShowForgotPassword(true)}
              >
                Forgot Password?
              </Text>
            )}

            {/* Apple Sign-In Button — iOS only. Required by App Store
                guideline 4.8 when offering third-party login. */}
            {Platform.OS === 'ios' && (
              <Pressable
                onPress={handleAppleSignIn}
                disabled={loading || googleLoading || appleLoading}
                style={({ pressed }) => [
                  styles.appleButton,
                  { opacity: pressed ? 0.85 : (loading || googleLoading || appleLoading) ? 0.5 : 1 },
                  { transform: [{ scale: pressed ? 0.98 : 1 }] },
                ]}
              >
                <Text style={styles.appleLogo}></Text>
                <Text style={styles.appleButtonText}>
                  {appleLoading ? 'Signing in...' : 'Sign in with Apple'}
                </Text>
              </Pressable>
            )}

            {/* Google Sign-In Button */}
            <Pressable
              onPress={handleGoogleSignIn}
              disabled={loading || googleLoading || appleLoading}
              style={({ pressed }) => [
                styles.googleButton,
                { opacity: pressed ? 0.85 : (loading || googleLoading || appleLoading) ? 0.5 : 1 },
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <View style={styles.googleIconContainer}>
                <Text style={styles.googleG}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>
                {googleLoading ? 'Signing in...' : 'Sign in with Google'}
              </Text>
            </Pressable>

            {/* Terms and Privacy Policy Links */}
            <View style={styles.legalLinksContainer}>
              <Text style={styles.legalText}>
                By {authMode === 'login' ? 'logging in' : 'signing up'}, you agree to our{' '}
                <Text style={styles.legalLink} onPress={() => Linking.openURL('https://bigvibestudios.com/terms')}>
                  Terms of Service
                </Text>
                {' '}and{' '}
                <Text style={styles.legalLink} onPress={() => Linking.openURL('https://bigvibestudios.com/privacy')}>
                  Privacy Policy
                </Text>
              </Text>
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
  forgotPasswordLink: {
    color: theme.colors.vibeBlue,
    fontSize: 14,
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginTop: 14,
    marginBottom: 4,
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
  // Apple HIG: black background, white text, Apple logo on left.
  // Sits above Google so the required option has equal/greater prominence.
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 48,
    backgroundColor: '#000000',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: theme.colors.vibeBlue,
    marginTop: 20,
  },
  appleLogo: {
    color: '#ffffff',
    fontSize: 20,
    marginRight: 10,
    marginTop: -2,
  },
  appleButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 48,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: theme.colors.vibeBlue,
    marginTop: 12,
  },
  googleIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  googleG: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  googleButtonText: {
    color: '#1f1f1f',
    fontSize: 15,
    fontWeight: '600',
  },
  legalLinksContainer: {
    marginTop: 20,
    paddingHorizontal: 10,
  },
  legalText: {
    fontSize: 12,
    color: theme.colors.gray,
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLink: {
    color: theme.colors.vibeBlue,
    textDecorationLine: 'underline',
    fontSize: 12,
  },
});
