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
  isHostMode
}) => {
  return (
    <View style={styles.qrContainer}>
      <Text style={styles.qrTitle}>Share with QR Codes</Text>
      
      {/* Event QR Code for App Users */}
      {inviteCode && (
        <View style={styles.qrSection}>
          <Text style={styles.qrSubtitle}>For App Users</Text>
          <QRCodeGenerator
            type="event"
            data={inviteCode}
            size={180}
            showShareButton={false}
          />
          <Text style={styles.qrDescription}>
            Scan to join event instantly
          </Text>
        </View>
      )}
      
      {/* App Download QR Code for New Users */}
      {studioId && eventId && (
        <View style={styles.qrSection}>
          <Text style={styles.qrSubtitle}>For New Users</Text>
          <QRCodeGenerator
            type="app-download"
            data={{ studioId, eventId }}
            size={180}
            showShareButton={false}
          />
          <Text style={styles.qrDescription}>
            Scan to download app & join event
          </Text>
        </View>
      )}
    </View>
  );
};

export default QRCodeTab;