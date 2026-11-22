// Non-blocking toast that appears when an OTA update has been downloaded
// in the background and is ready to apply. Tapping "Restart" calls
// Updates.reloadAsync() so the new bundle takes effect immediately
// instead of waiting for the user to close and reopen the app.
//
// Floating card (inset from the edges, rounded, soft shadow) rather than a
// full-width bar — reads as a notification, not part of the header.

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../theme/ThemeContext';
import { useAppUpdate } from '../../../hooks/useAppUpdate';

export default function UpdateBanner() {
  const { updateReady, applyUpdate } = useAppUpdate();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const t = theme.semantic;
  const dark = theme.isDark;
  const [dismissed, setDismissed] = useState(false);
  const translateY = useRef(new Animated.Value(-160)).current;
  const visible = updateReady && !dismissed;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : -160,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, [visible, translateY]);

  if (!updateReady) return null;

  const card = dark
    ? { backgroundColor: '#0B1A2E', borderColor: t.accent, borderWidth: 1 }
    : { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderWidth: 1 };

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[styles.wrap, { top: insets.top + 8, transform: [{ translateY }] }]}
    >
      <View style={[styles.card, card]}>
        <View style={[styles.icon, { backgroundColor: t.accent }]}>
          <Text style={styles.iconText}>↻</Text>
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>
            Update ready
          </Text>
          <Text style={[styles.subtitle, { color: t.textMuted }]} numberOfLines={1}>
            Restart to get the latest version
          </Text>
        </View>
        <Pressable
          onPress={applyUpdate}
          style={({ pressed }) => [
            styles.restartBtn,
            { backgroundColor: t.accent, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.restartText, { color: dark ? '#001020' : '#FFFFFF' }]}>
            Restart
          </Text>
        </Pressable>
        <Pressable onPress={() => setDismissed(true)} hitSlop={12} style={styles.dismissBtn}>
          <Text style={[styles.dismiss, { color: t.textMuted }]}>×</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 9999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  copy: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  restartBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
  },
  restartText: {
    fontWeight: '700',
    fontSize: 14,
  },
  dismissBtn: {
    paddingHorizontal: 4,
  },
  dismiss: {
    fontSize: 22,
    lineHeight: 24,
  },
});
