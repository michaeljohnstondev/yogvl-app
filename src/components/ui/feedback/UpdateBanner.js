// Non-blocking banner that appears when an OTA update has been downloaded
// in the background and is ready to apply. Tapping "Restart" calls
// Updates.reloadAsync() so the new bundle takes effect immediately
// instead of waiting for the user to close and reopen the app.

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '../../../theme/themes';
import { useAppUpdate } from '../../../hooks/useAppUpdate';

export default function UpdateBanner() {
  const { updateReady, applyUpdate } = useAppUpdate();
  const insets = useSafeAreaInsets();
  const [dismissed, setDismissed] = useState(false);
  const translateY = useRef(new Animated.Value(-100)).current;
  const visible = updateReady && !dismissed;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : -120,
      useNativeDriver: true,
      bounciness: 6,
    }).start();
  }, [visible, translateY]);

  if (!updateReady) return null;

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.container,
        { paddingTop: insets.top + 8, transform: [{ translateY }] },
      ]}
    >
      <View style={styles.row}>
        <Text style={styles.text} numberOfLines={1}>
          ✨ New version ready
        </Text>
        <TouchableOpacity onPress={applyUpdate} style={styles.restartBtn}>
          <Text style={styles.restartText}>Restart</Text>
        </TouchableOpacity>
        <Pressable onPress={() => setDismissed(true)} hitSlop={10}>
          <Text style={styles.dismiss}>×</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: theme.colors.headerBackground,
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.vibeBlue,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  text: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.main,
    fontSize: 14,
    flex: 1,
  },
  restartBtn: {
    backgroundColor: theme.colors.vibeBlue,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  restartText: {
    color: '#000',
    fontFamily: theme.fonts.main,
    fontWeight: '700',
    fontSize: 13,
  },
  dismiss: {
    color: theme.colors.textSecondary,
    fontSize: 22,
    paddingHorizontal: 4,
  },
});
