import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithCredential,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from './firebase'; // Your firebase config
import * as Google from 'expo-auth-session/providers/google';
import { useState, useEffect } from 'react';

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
    await signOut(auth);
  } catch (error) {
    throw error;
  }
}

// Google Sign-in hook for Expo
export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId:
      '824215388091-hfoep5l3nip6cgpph728q8rk7frpb6fa.apps.googleusercontent.com',
    iosClientId:
      '824215388091-hfoep5l3nip6cgpph728q8rk7frpb6fa.apps.googleusercontent.com',
    androidClientId:
      '824215388091-hfoep5l3nip6cgpph728q8rk7frpb6fa.apps.googleusercontent.com',
    webClientId:
      '824215388091-hfoep5l3nip6cgpph728q8rk7frpb6fa.apps.googleusercontent.com',
  });

  const signInWithGoogle = async () => {
    try {
      const result = await promptAsync();

      if (result?.type === 'success') {
        const { id_token } = result.params;
        const credential = GoogleAuthProvider.credential(id_token);
        const userCredential = await signInWithCredential(auth, credential);
        return userCredential;
      } else {
        throw new Error('Google sign-in was cancelled');
      }
    } catch (error) {
      console.error('Google Sign-in Error:', error);
      throw error;
    }
  };

  return { request, signInWithGoogle, response };
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
