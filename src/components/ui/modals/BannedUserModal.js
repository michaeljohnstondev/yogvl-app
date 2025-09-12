// FILE: components/ui/BannedUserModal.js - Modal for Banned Users

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import theme from '../../../theme/themes';
import VibeButton from './VibeButton';

/**
 * Modal to display ban information to users
 */
export default function BannedUserModal({ visible, banStatus, onClose, onLogout }) {
  
  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return 'Unknown';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const getBanTitle = () => {
    if (banStatus?.type === 'permanent') {
      return '🚫 Account Permanently Banned';
    } else if (banStatus?.type === 'temporary') {
      return '🔒 Account Temporarily Banned';
    }
    return '⚠️ Account Restricted';
  };

  const getBanMessage = () => {
    if (banStatus?.type === 'permanent') {
      return `Your account has been permanently banned from Big Vibe Studios.\n\nYou cannot create events, join events, or participate in the community.`;
    } else if (banStatus?.type === 'temporary') {
      return `Your account has been temporarily banned from Big Vibe Studios.\n\nYou cannot create events, join events, or participate in the community until your ban expires.`;
    }
    return 'Your account has restricted access to Big Vibe Studios features.';
  };

  const getTimeRemaining = () => {
    if (banStatus?.type === 'temporary' && banStatus?.daysRemaining) {
      const days = banStatus.daysRemaining;
      if (days > 1) {
        return `${days} days remaining`;
      } else if (days === 1) {
        return 'Less than 1 day remaining';
      } else {
        return 'Ban expires soon';
      }
    }
    return null;
  };

  if (!visible || !banStatus?.isBanned) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>{getBanTitle()}</Text>
          
          <Text style={styles.message}>{getBanMessage()}</Text>
          
          {banStatus.reason && (
            <View style={styles.reasonContainer}>
              <Text style={styles.reasonLabel}>Reason:</Text>
              <Text style={styles.reasonText}>{banStatus.reason}</Text>
            </View>
          )}
          
          <View style={styles.detailsContainer}>
            <Text style={styles.detailLabel}>Ban Date:</Text>
            <Text style={styles.detailText}>{formatDate(banStatus.issuedAt)}</Text>
            
            {banStatus.type === 'temporary' && banStatus.expiresAt && (
              <>
                <Text style={styles.detailLabel}>Expires:</Text>
                <Text style={styles.detailText}>{formatDate(banStatus.expiresAt)}</Text>
                
                {getTimeRemaining() && (
                  <>
                    <Text style={styles.detailLabel}>Time Remaining:</Text>
                    <Text style={[styles.detailText, styles.timeRemaining]}>{getTimeRemaining()}</Text>
                  </>
                )}
              </>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <VibeButton
              label="Close"
              onPress={onClose}
              variant="secondary"
              style={styles.closeButton}
            />
            
            {onLogout && (
              <VibeButton
                label="Sign Out"
                onPress={onLogout}
                variant="primary"
                color="red"
                style={styles.logoutButton}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: theme.colors.vibeRed,
  },
  title: {
    color: theme.colors.vibeRed,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    color: theme.colors.white,
    fontSize: 14,
    fontFamily: theme.fonts.main,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  reasonContainer: {
    backgroundColor: theme.colors.vibeBackgroundOrange,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.vibeOrange,
  },
  reasonLabel: {
    color: theme.colors.vibeOrange,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
    marginBottom: 4,
  },
  reasonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontFamily: theme.fonts.main,
    lineHeight: 18,
  },
  detailsContainer: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  detailLabel: {
    color: theme.colors.gray,
    fontSize: 12,
    fontFamily: theme.fonts.main,
    marginTop: 8,
    marginBottom: 2,
  },
  detailText: {
    color: theme.colors.white,
    fontSize: 13,
    fontFamily: theme.fonts.main,
  },
  timeRemaining: {
    color: theme.colors.vibeYellow,
    fontWeight: 'bold',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  closeButton: {
    flex: 1,
  },
  logoutButton: {
    flex: 1,
  },
});