import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore'; // Add this import
import { useGoogleAuth } from '../FirebaseAuthService'; // Updated to use hook
import theme from '../themes/themes';

export default function GoogleLoginButton({ navigation, mode = 'login' }) {
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle } = useGoogleAuth(); // Use the hook

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      // Use Firebase Web SDK Google Sign-in
      const userCredential = await signInWithGoogle();
      const user = userCredential.user;

      console.log('Google sign in successful:', user);

      // Check if user document exists using Firebase Web SDK syntax
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // New user - create user document with Google info
        await setDoc(
          userDocRef,
          {
            email: user.email,
            uid: user.uid,
            hasCompletedContactInfo: false,
            // Pre-fill with Google data
            firstName: user.displayName?.split(' ')[0] || '',
            lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
            displayName: user.displayName || '',
            photoURL: user.photoURL || '',
            signUpMethod: 'google',
            createdAt: new Date(),
          },
          { merge: true }
        );

        console.log('New Google user document created');

        // Navigate to contact info for new users
        navigation.reset({
          index: 0,
          routes: [{ name: 'ContactInfo' }],
        });
      } else {
        // Existing user - update last login
        const existingData = userDoc.data();
        const updates = {
          lastLoginAt: new Date(),
        };

        // Update profile picture if we have a newer one from Google
        if (user.photoURL && !existingData.photoURL) {
          updates.photoURL = user.photoURL;
        }

        await setDoc(userDocRef, updates, { merge: true });

        // Navigate based on contact info completion
        if (existingData.hasCompletedContactInfo) {
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
      }
    } catch (error) {
      console.error('Google authentication error:', error);

      // Handle specific error cases
      if (error.code === 'auth/account-exists-with-different-credential') {
        Alert.alert(
          'Account Exists',
          'An account already exists with the same email address but different sign-in credentials.'
        );
      } else if (error.code === 'auth/invalid-credential') {
        Alert.alert(
          'Invalid Credentials',
          'The supplied auth credential is malformed or has expired.'
        );
      } else {
        Alert.alert(
          'Authentication Failed',
          error.message ||
            'Something went wrong with Google sign in. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const buttonText =
    mode === 'signup' ? 'Continue with Google' : 'Sign in with Google';

  return (
    <TouchableOpacity
      style={styles.buttonContainer}
      onPress={handleGoogleSignIn}
      disabled={loading}
    >
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        style={[styles.button, loading && styles.buttonDisabled]}
      >
        <View style={styles.buttonContent}>
          {/* Google G logo */}
          <View style={styles.googleLogo}>
            <Text style={styles.googleG}>G</Text>
          </View>

          <Text style={styles.buttonText}>
            {loading ? 'Signing in...' : buttonText}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  buttonContainer: {
    marginVertical: 10,
    borderRadius: theme.sizes.buttonRadius,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  button: {
    padding: 15,
    borderRadius: theme.sizes.buttonRadius,
    borderWidth: 1,
    borderColor: '#dadce0',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLogo: {
    width: 20,
    height: 20,
    borderRadius: 2,
    backgroundColor: '#4285f4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  googleG: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  buttonText: {
    color: '#3c4043',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: theme.fonts.main,
  },
});
