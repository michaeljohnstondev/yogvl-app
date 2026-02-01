import React from 'react';
import { View, Text } from 'react-native';
import QRCodeGenerator from '../../../../components/ui/utils/QRCodeGenerator';
import styles from '../../styles/inviteScreenStyles';

const QRCodeTab = ({
  // QR data
  eventId,
  inviteCode,
  studioId,

  // UI state
  isHostMode,
}) => {
  return (
    <View style={styles.qrContainer}>
      <Text style={styles.qrTitle}>Share with QR Code</Text>

      {/* Universal Event QR Code - Works for both app users and new users */}
      {inviteCode && (
        <View style={styles.qrSection}>
          <QRCodeGenerator
            type="event"
            data={inviteCode}
            size={200}
            showShareButton={false}
          />
          <Text style={styles.qrDescription}>
            Scan to join event{'\n'}
            Works for both app users and new downloads
          </Text>
        </View>
      )}
    </View>
  );
};

export default QRCodeTab;
