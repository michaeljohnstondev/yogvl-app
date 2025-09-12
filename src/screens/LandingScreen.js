import React, { useEffect, useRef, useState } from 'react';
// Cleaned up auth imports
import { View, Text, Animated, StyleSheet, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import VibeInput from '../components/ui/VibeInput';
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
      await login(email, password);
      console.log('Login successful - Navigation will handle routing');
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
      
      // Navigate to ContactInfo after successful signup
      navigation.reset({
        index: 0,
        routes: [{ name: 'ContactInfo' }],
      });
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
      <VibeInput
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        onChangeText={setEmail}
        value={email}
      />

      <VibeInput
        placeholder="Password"
        secureTextEntry
        autoCapitalize="none"
        onChangeText={setPassword}
        value={password}
      />

      <VibeButton
        label={loading ? (authMode === 'login' ? 'Signing In...' : 'Creating Account...') : (authMode === 'login' ? 'Sign In' : 'Sign Up')}
        onPress={authMode === 'login' ? handleLogin : handleSignUp}
        disabled={loading}
        style={styles.authButton}
      />
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
  authButton: {
    marginTop: 10,
    width: '100%',
  },
});
