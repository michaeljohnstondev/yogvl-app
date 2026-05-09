import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import theme from '../../../theme/themes';

const QRCodeGenerator = ({
  type = 'user', // 'user', 'event', 'app-download', or 'promo'
  data, // userId, inviteCode, {studioId, eventId}, or {studioId, interests[]}
  size = 200,
  showShareButton = true,
  onShare = null,
}) => {
  const generateDeepLink = () => {
    switch (type) {
      case 'user':
        return `https://theyo.org/user/${data}`;
      case 'event':
        return `https://theyo.org/invite/${data}`;
      case 'app-download':
        return `https://theyo.org/invite/${data.inviteCode || 'unknown'}`;
      case 'promo': {
        const studioId = data?.studioId || 'unknown';
        const interests = data?.interests || [];
        let url = `https://theyo.org/promo/${studioId}`;
        if (interests.length > 0) {
          url += `?interests=${encodeURIComponent(interests.join(','))}`;
        }
        return url;
      }
      default:
        return `https://theyo.org/user/${data}`;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'user':
        return 'Follow My Profile';
      case 'event':
        return 'Join This Event';
      case 'app-download':
        return 'Join This Event';
      case 'promo':
        return 'Join Our Studio';
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
          ? 'Scan to follow my profile'
          : type === 'promo'
            ? 'Scan to join and discover events'
            : type === 'event' || type === 'app-download'
              ? 'Opens the app or redirects to download'
              : 'Scan to connect'}
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
