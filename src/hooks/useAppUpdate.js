// Watches for an OTA update in the background and exposes:
//   updateReady: boolean — a new bundle has been downloaded and is staged
//   applyUpdate: () => Promise<void> — reload the app to use the new bundle
//
// Wire this with <UpdateBanner /> at the root of the app to show a
// non-blocking "New version ready — restart" prompt instead of forcing
// users to close and reopen the app to pick up an OTA.

import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import * as Updates from 'expo-updates';

// How often to re-check while the app is in the foreground.
const FOREGROUND_POLL_MS = 5 * 60 * 1000; // 5 minutes

export function useAppUpdate() {
  const [updateReady, setUpdateReady] = useState(false);
  const checkingRef = useRef(false);

  const checkOnce = useCallback(async () => {
    if (checkingRef.current) return;
    // Dev/preview builds and Expo Go don't have OTA — bail quietly.
    if (!Updates.isEnabled || __DEV__) return;

    checkingRef.current = true;
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        setUpdateReady(true);
      }
    } catch (error) {
      // Network errors etc. are non-fatal; we'll try again next cycle.
      console.log('[useAppUpdate] Update check failed:', error?.message);
    } finally {
      checkingRef.current = false;
    }
  }, []);

  const applyUpdate = useCallback(async () => {
    try {
      await Updates.reloadAsync();
    } catch (error) {
      console.error('[useAppUpdate] reloadAsync failed:', error);
    }
  }, []);

  useEffect(() => {
    // Check at mount, then on a slow interval, and whenever the app
    // returns to the foreground.
    checkOnce();
    const interval = setInterval(checkOnce, FOREGROUND_POLL_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkOnce();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, [checkOnce]);

  return { updateReady, applyUpdate };
}
