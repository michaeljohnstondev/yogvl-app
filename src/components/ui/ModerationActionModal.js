// FILE: components/ui/ModerationActionModal.js - Modal for Moderation Actions with Custom Messages

import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  TextInput,
  ScrollView 
} from 'react-native';
import theme from '../../theme/themes';
import VibeButton from './VibeButton';

/**
 * Modal for taking moderation actions with custom admin messages
 */
export default function ModerationActionModal({ 
  visible, 
  report, 
  action, 
  onConfirm, 
  onCancel 
}) {
  const [customMessage, setCustomMessage] = useState('');
  
  const getActionDetails = () => {
    switch (action) {
      case 'warning':
        return {
          title: '⚠️ Issue Warning',
          color: theme.colors.vibeBlue,
          description: 'Send a warning to the user. They will see your message when they open the app.',
          placeholder: 'e.g., "Please keep comments respectful" or "Event descriptions should be family-friendly"',
          defaultMessage: `Warning: ${report?.reason || 'Policy violation'}`
        };
      case 'strike':
        return {
          title: '🟡 Issue Strike',
          color: theme.colors.vibeYellow,
          description: 'Issue a formal strike (expires in 6 months). User will be notified.',
          placeholder: 'e.g., "Strike for inappropriate content - please review our community guidelines"',
          defaultMessage: `Strike issued: ${report?.reason || 'Policy violation'}`
        };
      case 'temp_ban':
        return {
          title: '🔒 Temporary Ban (7 days)',
          color: theme.colors.vibeOrange,
          description: 'Ban user for 7 days. They will be unable to use the app.',
          placeholder: 'e.g., "7-day ban for repeated violations. Please read our community guidelines."',
          defaultMessage: `Temporary ban: ${report?.reason || 'Policy violation'}`
        };
      case 'perm_ban':
        return {
          title: '🚫 Permanent Ban',
          color: theme.colors.vibeRed,
          description: 'Permanently ban user from the platform.',
          placeholder: 'e.g., "Permanent ban for severe policy violations."',
          defaultMessage: `Permanent ban: ${report?.reason || 'Severe policy violation'}`
        };
      case 'dismiss':
        return {
          title: '🗑️ Dismiss Report',
          color: theme.colors.gray,
          description: 'Delete this report without taking action.',
          placeholder: 'Optional reason for dismissal (internal use)',
          defaultMessage: 'Report dismissed - no violation found'
        };
      default:
        return {
          title: 'Moderation Action',
          color: theme.colors.vibeBlue,
          description: 'Take moderation action',
          placeholder: 'Enter message...',
          defaultMessage: report?.reason || ''
        };
    }
  };

  const handleConfirm = () => {
    const message = customMessage.trim() || getActionDetails().defaultMessage;
    onConfirm(message);
    setCustomMessage('');
  };

  const handleCancel = () => {
    setCustomMessage('');
    onCancel();
  };

  if (!visible || !report) {
    return null;
  }

  const actionDetails = getActionDetails();
  const targetName = report.type === 'user' 
    ? report.reportedUser?.reportedInfo?.name 
    : report.reportedEvent?.eventData?.title;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.title, { color: actionDetails.color }]}>
              {actionDetails.title}
            </Text>
            
            <Text style={styles.description}>
              {actionDetails.description}
            </Text>

            {/* Report Details */}
            <View style={styles.reportDetails}>
              <Text style={styles.reportLabel}>Target:</Text>
              <Text style={styles.reportText}>
                {report.type === 'user' ? '👤 ' : '📅 '}{targetName || 'Unknown'}
              </Text>
              
              <Text style={styles.reportLabel}>Original Report:</Text>
              <Text style={styles.reportText}>{report.reason}</Text>
              
              <Text style={styles.reportLabel}>Reporter:</Text>
              <Text style={styles.reportText}>{report.reporterInfo?.name || 'Unknown'}</Text>
            </View>

            {/* Custom Message Input */}
            <View style={styles.messageSection}>
              <Text style={styles.messageLabel}>
                {action === 'dismiss' ? 'Internal Notes (Optional):' : 'Message to User:'}
              </Text>
              <TextInput
                style={styles.messageInput}
                value={customMessage}
                onChangeText={setCustomMessage}
                placeholder={actionDetails.placeholder}
                placeholderTextColor={theme.colors.gray}
                multiline
                numberOfLines={3}
                maxLength={500}
              />
              <Text style={styles.characterCount}>
                {customMessage.length}/500 characters
              </Text>
            </View>

            {/* Preview */}
            {customMessage.trim() && action !== 'dismiss' && (
              <View style={styles.previewSection}>
                <Text style={styles.previewLabel}>User will see:</Text>
                <View style={styles.previewBox}>
                  <Text style={styles.previewText}>
                    {customMessage.trim() || actionDetails.defaultMessage}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <VibeButton
              label="Cancel"
              onPress={handleCancel}
              variant="secondary"
              style={styles.cancelButton}
            />
            
            <VibeButton
              label={action === 'dismiss' ? 'Dismiss Report' : `Confirm ${actionDetails.title.split(' ')[1]}`}
              onPress={handleConfirm}
              variant="primary"
              color={actionDetails.color === theme.colors.vibeYellow ? 'yellow' : 
                    actionDetails.color === theme.colors.vibeOrange ? 'orange' :
                    actionDetails.color === theme.colors.vibeRed ? 'red' : 'blue'}
              style={styles.confirmButton}
            />
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
    maxWidth: 500,
    maxHeight: '80%',
    borderWidth: 2,
    borderColor: theme.colors.vibeBlue,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    color: theme.colors.white,
    fontSize: 14,
    fontFamily: theme.fonts.main,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  reportDetails: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  reportLabel: {
    color: theme.colors.vibeBlue,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
    marginTop: 6,
    marginBottom: 2,
  },
  reportText: {
    color: theme.colors.white,
    fontSize: 13,
    fontFamily: theme.fonts.main,
    marginBottom: 4,
  },
  messageSection: {
    marginBottom: 16,
  },
  messageLabel: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
    marginBottom: 8,
  },
  messageInput: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 8,
    padding: 12,
    color: theme.colors.white,
    fontSize: 14,
    fontFamily: theme.fonts.main,
    borderWidth: 1,
    borderColor: theme.colors.darkGray,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  characterCount: {
    color: theme.colors.gray,
    fontSize: 11,
    fontFamily: theme.fonts.main,
    textAlign: 'right',
    marginTop: 4,
  },
  previewSection: {
    marginBottom: 16,
  },
  previewLabel: {
    color: theme.colors.vibeGreen,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
    marginBottom: 6,
  },
  previewBox: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.vibeBlue,
  },
  previewText: {
    color: theme.colors.white,
    fontSize: 13,
    fontFamily: theme.fonts.main,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 1,
  },
});