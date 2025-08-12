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
import { login } from '../FirebaseAuthService';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import GoogleLoginButton from '../components/GoogleLoginButton';
import theme from '../../themes/themes';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter email and password.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await login(email, password);
      console.log('Logged in:', userCredential.user);

      // Check if user has completed contact info using Firebase Web SDK syntax
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().hasCompletedContactInfo) {
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
      Alert.alert('Login Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={theme.colors.backgroundGradient}
      style={styles.container}
    >
      <Text style={[styles.title, theme.shadows.textGlow]}>Welcome Back</Text>

      {/* Google Login Button */}
      <GoogleLoginButton navigation={navigation} mode="login" />

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
        style={styles.input}
        secureTextEntry
        autoCapitalize="none"
        onChangeText={setPassword}
        value={password}
      />

      <TouchableOpacity
        style={styles.buttonContainer}
        onPress={handleLogin}
        disabled={loading}
      >
        <LinearGradient
          colors={theme.colors.buttonGradient}
          style={[styles.button, loading && styles.buttonDisabled]}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Signing In...' : 'Sign In'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.navigate('SignUp')}
      >
        <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.navigate('Landing')}
      >
        <Text style={styles.linkText}>← Back</Text>
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
