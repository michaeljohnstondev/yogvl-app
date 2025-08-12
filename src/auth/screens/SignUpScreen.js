import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Text,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { signup } from '../FirebaseAuthService';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import GoogleLoginButton from '../components/GoogleLoginButton';
import theme from '../../themes/themes';

export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  console.log('SignUpScreen - navigation prop:', navigation);
  console.log(
    'SignUpScreen - navigation.navigate function:',
    typeof navigation.navigate
  );

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter email and password.');
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
          email: user.email,
          uid: user.uid,
          hasCompletedContactInfo: false,
          signUpMethod: 'email',
          createdAt: new Date(),
        },
        { merge: true }
      );

      console.log('User document created successfully');

      // onAuthStateChanged will automatically handle navigation
      // The Navigation component will automatically detect the new user
      // and route to ContactInfo since hasCompletedContactInfo is false
    } catch (err) {
      console.error('Signup error:', err);
      Alert.alert('Signup Failed', err.message);
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

      {/* Google Sign Up Button */}
      <GoogleLoginButton navigation={navigation} mode="signup" />

      {/* Divider */}
      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.textSecondary,
    opacity: 0.3,
  },
  dividerText: {
    marginHorizontal: 16,
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontFamily: theme.fonts.main,
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
