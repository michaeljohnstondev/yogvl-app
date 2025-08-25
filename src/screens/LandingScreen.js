import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import VibeButton from '../components/ui/VibeButton';
import VibeSegmentedControl from '../components/ui/VibeSegmentedControl';
import { useNavigation } from '@react-navigation/native';
import { useVibeAlert } from '../components/ui/VibeAlertContext';
import { login, signup } from '../auth/services/FirebaseAuthService';
import { db } from '../auth/services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getDefaultUserSettings, getDefaultUserMetrics } from '../services/defaultUserSettings';
import theme from '../theme/themes';
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
      const userCredential = await login(email, password);
      console.log('Logged in:', userCredential.user);

      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      const userData = userDoc.exists() ? userDoc.data() : null;
      const contactInfo = userData?.userdata?.contactInfo || {};
      const hasContactInfo = !!(contactInfo.firstName && contactInfo.lastName && contactInfo.email);

      if (hasContactInfo) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'ContactInfo' }],
        });
      }
    } catch (err) {
      console.error('Login error:', err);
      vibeAlert.error('Login Failed', err.message);
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

      console.log('User document created successfully');
    } catch (err) {
      console.error('Signup error:', err);
      vibeAlert.error('Signup Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

      <Text style={styles.title}>Big Vibe Studios</Text>

      {/* Auth Mode Toggle */}
      <VibeSegmentedControl
        options={[
          { label: 'Sign Up', value: 'signup' },
          { label: 'Log In', value: 'login' }
        ]}
        selectedValue={authMode}
        onSelect={setAuthMode}
        style={styles.authToggle}
      />

      {/* Email/Password Form */}
      <TextInput
        placeholder="Email"
        placeholderTextColor={theme.colors.textSecondary}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
        onChangeText={setEmail}
        value={email}
      />

      <TextInput
        placeholder="Password"
        placeholderTextColor={theme.colors.textSecondary}
        style={styles.input}
        secureTextEntry
        autoCapitalize="none"
        onChangeText={setPassword}
        value={password}
      />

      <TouchableOpacity
        style={styles.buttonContainer}
        onPress={authMode === 'login' ? handleLogin : handleSignUp}
        disabled={loading}
      >
        <LinearGradient
          colors={theme.colors.buttonGradient}
          style={[styles.button, loading && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>
            {loading ? (authMode === 'login' ? 'Signing In...' : 'Creating Account...') : (authMode === 'login' ? 'Sign In' : 'Sign Up')}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
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
    fontWeight: '900',
    fontFamily: theme.fonts.main,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 40,
    textShadowColor: theme.shadows.textGlow.textShadowColor,
    textShadowOffset: theme.shadows.textGlow.textShadowOffset,
    textShadowRadius: theme.shadows.textGlow.textShadowRadius,
  },
  authToggle: {
    width: '100%',
    marginBottom: 30,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    backgroundColor: theme.colors.inputBackground,
    color: theme.colors.textPrimary,
    marginBottom: 15,
    padding: theme.sizes.inputPadding,
    borderRadius: theme.sizes.borderRadius,
    fontSize: 16,
    width: '100%',
  },
  buttonContainer: {
    marginTop: 10,
    borderRadius: theme.sizes.buttonRadius,
    overflow: 'hidden',
    width: '100%',
  },
  button: {
    padding: 15,
    borderRadius: theme.sizes.buttonRadius,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: theme.colors.textPrimary,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});
