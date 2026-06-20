// VersionInfo.jsx — Admin block surfacing the currently-running app's
// binary version + OTA runtime + update ID so the dev can confirm at
// a glance which version is actually on their device (e.g. "did my
// last OTA actually land?"). Includes a manual Check for Update button
// that forces expo-updates to pull the latest matching-runtime bundle
// instead of waiting for the next launch.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { VibeButton } from '../index';
import theme from '../../../theme/themes';

const fmtDate = (d) => {
  if (!d) return '—';
  try {
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleString();
  } catch (e) {
    return String(d);
  }
};

const VersionInfo = () => {
  const [checking, setChecking] = useState(false);

  // Read once on mount — these don't change during a session unless
  // we trigger a runtime update + reload below.
  const [info] = useState(() => {
    const appVersion =
      Constants.nativeAppVersion ||
      Constants.expoConfig?.version ||
      'unknown';
    const buildVersion =
      Constants.nativeBuildVersion ||
      Constants.expoConfig?.android?.versionCode?.toString() ||
      Constants.expoConfig?.ios?.buildNumber ||
      'unknown';
    const runtimeVersion = Updates.runtimeVersion || 'unknown';
    const channel = Updates.channel || 'unknown';
    const updateId = Updates.updateId || 'embedded (no OTA)';
    const createdAt = Updates.createdAt;
    return { appVersion, buildVersion, runtimeVersion, channel, updateId, createdAt };
  });

  const handleCheckForUpdate = async () => {
    if (checking) return;
    setChecking(true);
    try {
      const result = await Updates.checkForUpdateAsync();
      if (!result.isAvailable) {
        Alert.alert('Up to date', 'No new OTA available for this runtime.');
        return;
      }
      await Updates.fetchUpdateAsync();
      Alert.alert(
        'Update Fetched',
        'A new OTA was downloaded. Reload now to apply?',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'Reload Now', onPress: () => Updates.reloadAsync() },
        ],
      );
    } catch (e) {
      Alert.alert(
        'Check Failed',
        `Could not check for update: ${e?.message || 'unknown error'}`,
      );
    } finally {
      setChecking(false);
    }
  };

  const Row = ({ label, value, monospace }) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, monospace && styles.mono]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Version Info</Text>

      <Row label="App version" value={`${info.appVersion} (${info.buildVersion})`} />
      <Row label="Runtime" value={info.runtimeVersion} />
      <Row label="Channel" value={info.channel} />
      <Row label="OTA update ID" value={info.updateId} monospace />
      <Row label="OTA applied at" value={fmtDate(info.createdAt)} />

      <View style={styles.buttonRow}>
        <VibeButton
          label={checking ? 'Checking…' : 'Check for Update'}
          onPress={handleCheckForUpdate}
          disabled={checking}
          variant="primary"
        />
        {checking && (
          <ActivityIndicator size="small" color={theme.colors.vibeCyan} style={styles.spinner} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.vibeCyan,
    backgroundColor: 'rgba(0, 212, 255, 0.04)',
  },
  title: {
    color: theme.colors.white,
    fontSize: 16,
    fontFamily: theme.fonts.main,
    fontWeight: '700',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: theme.fonts.main,
    width: 110,
  },
  value: {
    color: theme.colors.white,
    fontSize: 13,
    fontFamily: theme.fonts.main,
    flex: 1,
  },
  mono: {
    fontFamily: theme.fonts.main,
    fontSize: 11,
  },
  buttonRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  spinner: {
    marginLeft: 10,
  },
});

export default VersionInfo;
