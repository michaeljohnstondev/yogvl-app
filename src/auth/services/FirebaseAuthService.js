import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from './firebase';
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
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    throw error;
  }
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
