import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
} from 'firebase/auth';
import { Platform } from 'react-native';
import { auth, db } from './firebase';
import { doc, setDoc, getDoc } from '../../lib/firebase';
import { useState, useEffect } from 'react';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import {
  getDefaultUserSettings,
  getDefaultUserMetrics,
} from '../../services/defaultUserSettings';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: '824215388091-hfoep5l3nip6cgpph728q8rk7frpb6fa.apps.googleusercontent.com',
});

// Email/Password authentication
export async function signup(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    return userCredential;
  } catch (error) {
    throw error;
  }
}

export async function login(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return userCredential;
  } catch (error) {
    throw error;
  }
}

export async function logout() {
  try {
    const userId = auth.currentUser?.uid;

    // Remove FCM token before logout to prevent cross-account notifications
    if (userId) {
      try {
        const fcmService = (await import('../../services/fcmService')).default;
        await fcmService.removeTokenForUser(userId);
        console.log('[Auth] ✅ FCM token removed for user:', userId);
      } catch (fcmError) {
        // Non-critical - continue with logout even if FCM cleanup fails
        console.warn('[Auth] ⚠️  Failed to remove FCM token:', fcmError);
      }
    }

    await signOut(auth);
  } catch (error) {
    throw error;
  }
}

export async function resetPassword(email) {
  try {
    // Send password reset email using Firebase's default settings
    // This will use the default Firebase-hosted password reset page
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    throw error;
  }
}

/**
 * Sign in with Google via native account picker.
 * Returns Firebase UserCredential + whether user is new.
 */
export async function signInWithGoogle() {
  // Ensure Google Play Services available (Android)
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  // Clear any cached Google session so the account picker always shows
  try { await GoogleSignin.signOut(); } catch (_) { /* no cached session */ }

  // Trigger native Google sign-in UI
  const signInResult = await GoogleSignin.signIn();

  // Extract ID token (v13+ style, then fallback)
  const idToken = signInResult.data?.idToken ?? signInResult.idToken;
  if (!idToken) {
    throw new Error('No ID token returned from Google Sign-In');
  }

  // Build Firebase credential and sign in
  const googleCredential = GoogleAuthProvider.credential(idToken);
  const userCredential = await signInWithCredential(auth, googleCredential);

  const isNewUser = userCredential._tokenResponse?.isNewUser ?? false;
  return { userCredential, isNewUser };
}

/**
 * Sign in with Apple via the native iOS sheet. Returns a Firebase
 * UserCredential, whether the user is new, and the parsed name when
 * Apple provides one (only on first authorization — subsequent
 * sign-ins return null for `fullName`).
 *
 * iOS-only. Apple Sign-In is required by App Store guideline 4.8
 * when any third-party login is offered (Google in our case).
 */
export async function signInWithApple() {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Sign-In is only available on iOS');
  }

  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    throw new Error('Apple Sign-In is not available on this device');
  }

  // Trigger native Apple sheet
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('No identity token returned from Apple Sign-In');
  }

  // Build Firebase credential — Apple uses generic OAuthProvider
  const provider = new OAuthProvider('apple.com');
  const firebaseCredential = provider.credential({
    idToken: credential.identityToken,
    rawNonce: undefined, // expo-apple-authentication does not surface the nonce
  });
  const userCredential = await signInWithCredential(auth, firebaseCredential);

  // Apple returns the user's full name only on the FIRST sign-in.
  // Persist it so we can pre-fill ContactInfo and skip ahead.
  const firstName = credential.fullName?.givenName || null;
  const lastName = credential.fullName?.familyName || null;

  const isNewUser = userCredential._tokenResponse?.isNewUser ?? false;
  return { userCredential, isNewUser, firstName, lastName };
}

/**
 * Ensures a Firestore user doc exists. Creates with defaults if not.
 * Used by both email signup and Google sign-in.
 */
export async function ensureUserDocument(user, options = {}) {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    return { created: false };
  }

  const contactInfo = { email: user.email };
  if (options.firstName) contactInfo.firstName = options.firstName;
  if (options.lastName) contactInfo.lastName = options.lastName;
  if (options.firstName && options.lastName) {
    contactInfo.displayName = `${options.firstName} ${options.lastName}`;
  }
  if (options.profilePicture) contactInfo.profilePicture = options.profilePicture;

  await setDoc(
    userRef,
    {
      userdata: {
        contactInfo,
        metadata: {
          createdAt: new Date(),
          authProvider: options.authProvider || 'email',
        },
        settings: getDefaultUserSettings(),
        metrics: getDefaultUserMetrics(),
      },
      uid: user.uid,
    },
    { merge: true }
  );

  return { created: true };
}

// Auth state hook
export function useAuthState() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (initializing) setInitializing(false);
    });

    return unsubscribe;
  }, [initializing]);

  return { user, initializing };
}
