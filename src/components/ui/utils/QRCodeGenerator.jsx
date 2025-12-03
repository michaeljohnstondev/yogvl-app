import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import theme from '../../../theme/themes';

const QRCodeGenerator = ({
  type = 'user', // 'user', 'event', or 'app-download'
  data, // userId, inviteCode, or {studioId, eventId} for app-download
  size = 200,
  showShareButton = true,
  onShare = null,
}) => {
  const generateDeepLink = () => {
    switch (type) {
      case 'user':
        return `bvs-app://user/${data}`;
      case 'event':
        return `bvs-app://invite/${data}`;
      case 'app-download':
        // Generate a universal link that works for both app users and non-app users
        // This will redirect to app stores for non-app users, or deep link for app users
        return `https://bigvibestudios.com/theyo/join?studio=${data.studioId}&event=${data.eventId}`;
      default:
        return `bvs-app://user/${data}`;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'user':
        return 'Follow My Profile';
      case 'event':
        return 'Join Event';
      case 'app-download':
        return 'Download BVS & Join Event';
      default:
        return 'Scan to Connect';
    }
  };

  const qrValue = generateDeepLink();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{getTitle()}</Text>

      <View style={styles.qrContainer}>
        <QRCode
          value={qrValue}
          size={size}
          color={theme.colors.textPrimary}
          backgroundColor={theme.colors.background}
          logo={null}
        />
      </View>

      <Text style={styles.instructions}>
        {type === 'user'
          ? 'Scan this QR code to follow my profile'
          : type === 'event'
            ? 'Scan this QR code to join the event'
            : type === 'app-download'
              ? 'New to Big Vibe Studios? Scan to download the app and join this event!'
              : 'Scan this QR code to connect'}
      </Text>

      {showShareButton && (
        <TouchableOpacity style={styles.shareButton} onPress={onShare}>
          <Text style={styles.shareText}>Share QR Code</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 20,
    textAlign: 'center',
  },
  qrContainer: {
    padding: 20,
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.colors.vibeBlue,
    shadowColor: theme.colors.vibeBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  instructions: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  shareButton: {
    backgroundColor: theme.colors.vibeBlue,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: theme.colors.vibeBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  shareText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default QRCodeGenerator;
