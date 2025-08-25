import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Text,
} from 'react-native';
import { useVibeAlert } from '../../components/ui/VibeAlertContext';
import { LinearGradient } from 'expo-linear-gradient';
import { signup } from '../services/FirebaseAuthService';
import { auth, db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { getDefaultUserSettings, getDefaultUserMetrics } from '../../services/defaultUserSettings';
import theme from '../../theme/themes';

export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const vibeAlert = useVibeAlert();

  console.log('SignUpScreen - navigation prop:', navigation);
  console.log(
    'SignUpScreen - navigation.navigate function:',
    typeof navigation.navigate
  );

  const handleSignUp = async () => {
    if (!email || !password) {
      vibeAlert.warning('Missing fields', 'Please enter email and password.');
      return;
    }

    setLoading(true);
    try {
      // Sign up user with Firebase Web SDK
      const userCredential = await signup(email, password);
      const user = userCredential.user;
      console.log('Signed up:', user);

      // Create user document in Firestore (Firebase Web SDK syntax)
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

      // onAuthStateChanged will automatically handle navigation
      // The Navigation component will automatically detect the new user
      // and route to ContactInfo since hasCompletedContactInfo is false
    } catch (err) {
      console.error('Signup error:', err);
      vibeAlert.error('Signup Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={theme.colors.backgroundGradient}
      style={styles.container}
    >
      <Text style={[styles.title, theme.shadows.textGlow]}>Create Account</Text>


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
        autoCapitalize="none"
        style={styles.input}
        secureTextEntry
        onChangeText={setPassword}
        value={password}
      />

      <TouchableOpacity
        style={styles.buttonContainer}
        onPress={handleSignUp}
        disabled={loading}
      >
        <LinearGradient
          colors={theme.colors.buttonGradient}
          style={[styles.button, loading && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.navigate('Login')}
      >
        <Text style={styles.linkText}>Already have an account? Sign In</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 40,
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
  },
  buttonContainer: {
    marginTop: 10,
    borderRadius: theme.sizes.buttonRadius,
    overflow: 'hidden',
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
  linkButton: {
    marginTop: 20,
    padding: 10,
  },
  linkText: {
    color: theme.colors.alertButton,
    textAlign: 'center',
    fontSize: 14,
  },
});
