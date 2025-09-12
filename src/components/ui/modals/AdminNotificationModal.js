// FILE: components/ui/AdminNotificationModal.js - Modal to show admin notifications to users

import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  ScrollView 
} from 'react-native';
import theme from '../../../theme/themes';
import VibeButton from './VibeButton';

/**
 * Modal to display admin notifications to users
 */
export default function AdminNotificationModal({ 
  visible, 
  notification, 
  onClose, 
  onAcknowledge 
}) {
  if (!visible || !notification) {
    return null;
  }

  const formatNotificationDate = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return 'Unknown';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const getNotificationConfig = () => {
    switch (notification.type) {
      case 'warning':
        return {
          icon: '⚠️',
          title: 'Warning Notice',
          titleColor: theme.colors.vibeYellow,
          borderColor: theme.colors.vibeYellow,
          description: 'You have received a warning from the moderation team. Please review the message below.'
        };
      case 'strike':
        return {
          icon: '🟡',
          title: 'Strike Issued',
          titleColor: theme.colors.vibeOrange,
          borderColor: theme.colors.vibeOrange,
          description: 'You have received a strike. Multiple strikes may result in temporary restrictions.'
        };
      case 'announcement':
        return {
          icon: '📢',
          title: 'Important Announcement',
          titleColor: theme.colors.vibeBlue,
          borderColor: theme.colors.vibeBlue,
          description: 'The admin team has an important message for you.'
        };
      case 'system':
        return {
          icon: '🔧',
          title: 'System Notice',
          titleColor: theme.colors.vibeGreen,
          borderColor: theme.colors.vibeGreen,
          description: 'System maintenance or update information.'
        };
      case 'policy':
        return {
          icon: '📋',
          title: 'Policy Update',
          titleColor: theme.colors.vibePink,
          borderColor: theme.colors.vibePink,
          description: 'Community guidelines or policy changes.'
        };
      default:
        return {
          icon: '💬',
          title: 'Admin Message',
          titleColor: theme.colors.vibeBlue,
          borderColor: theme.colors.vibeBlue,
          description: 'You have received a message from the admin team.'
        };
    }
  };

  const config = getNotificationConfig();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { borderColor: config.borderColor }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.title, { color: config.titleColor }]}>
              {config.icon} {config.title}
            </Text>
            
            <Text style={styles.description}>
              {config.description}
            </Text>

            {/* Notification Content */}
            <View style={styles.notificationCard}>
              <Text style={styles.notificationText}>
                {notification.message}
              </Text>
            </View>

            {/* Guidelines Reminder for warnings/strikes */}
            {(notification.type === 'warning' || notification.type === 'strike') && (
              <View style={styles.guidelinesSection}>
                <Text style={styles.guidelinesTitle}>Community Guidelines Reminder:</Text>
                <Text style={styles.guidelinesText}>
                  • Keep events and comments respectful{'\n'}
                  • No inappropriate or offensive content{'\n'}
                  • Follow event posting guidelines{'\n'}
                  • Be considerate of other community members
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Acknowledge Button */}
          <View style={styles.buttonContainer}>
            <VibeButton
              label={notification.requiresResponse ? "I Understand" : "Got It"}
              onPress={onAcknowledge}
              variant="primary"
              color={config.titleColor === theme.colors.vibeYellow ? 'yellow' : 
                    config.titleColor === theme.colors.vibeOrange ? 'orange' :
                    config.titleColor === theme.colors.vibeGreen ? 'green' :
                    config.titleColor === theme.colors.vibePink ? 'pink' : 'blue'}
              style={styles.acknowledgeButton}
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
    maxWidth: 450,
    maxHeight: '80%',
    borderWidth: 2,
    // borderColor set dynamically based on notification type
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
    textAlign: 'center',
    marginBottom: 12,
    // color set dynamically based on notification type
  },
  description: {
    color: theme.colors.white,
    fontSize: 14,
    fontFamily: theme.fonts.main,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  notificationCard: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.vibeBlue, // Will be overridden by inline styles
  },
  notificationText: {
    color: theme.colors.white,
    fontSize: 16,
    fontFamily: theme.fonts.main,
    lineHeight: 22,
    textAlign: 'center',
  },
  additionalInfoSection: {
    backgroundColor: theme.colors.darkGray,
    borderRadius: 6,
    padding: 8,
    marginTop: 4,
  },
  additionalInfoText: {
    color: theme.colors.gray,
    fontSize: 12,
    fontFamily: theme.fonts.main,
    fontStyle: 'italic',
  },
  urgentNotice: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.vibeRed,
  },
  urgentText: {
    color: theme.colors.vibeRed,
    fontSize: 13,
    fontFamily: theme.fonts.main,
    fontWeight: '500',
    textAlign: 'center',
  },
  guidelinesSection: {
    marginBottom: 16,
  },
  guidelinesTitle: {
    color: theme.colors.vibeGreen,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
    marginBottom: 8,
  },
  guidelinesText: {
    color: theme.colors.white,
    fontSize: 12,
    fontFamily: theme.fonts.main,
    lineHeight: 16,
  },
  buttonContainer: {
    marginTop: 20,
  },
  acknowledgeButton: {
    width: '100%',
  },
});