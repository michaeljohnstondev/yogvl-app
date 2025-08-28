// FILE: components/ui/AdminNotificationTool.js - Tool for sending admin notifications

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import theme from '../../theme/themes';
import VibeButton from './VibeButton';
import { adminNotificationService } from '../../services/adminNotificationService';
import { globalAdminService } from '../../services/globalAdminService';

export default function AdminNotificationTool({ currentUserId }) {
  const [targetUserId, setTargetUserId] = useState('');
  const [isGlobalMessage, setIsGlobalMessage] = useState(false);
  const [notificationType, setNotificationType] = useState('announcement');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [sending, setSending] = useState(false);

  const notificationTypes = [
    { value: 'announcement', label: 'Announcement', color: theme.colors.vibeBlue },
    { value: 'system', label: 'System Notice', color: theme.colors.vibeGreen },
    { value: 'policy', label: 'Policy Update', color: theme.colors.vibePink },
    { value: 'custom', label: 'Custom Message', color: theme.colors.vibeYellow },
  ];

  const handleSendNotification = async () => {
    if (!isGlobalMessage && !targetUserId.trim()) {
      Alert.alert('Error', 'Please enter a target user ID or enable global message');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    setSending(true);
    try {
      if (isGlobalMessage) {
        // Post to global admin collection
        await globalAdminService.postGlobalMessage(
          notificationType,
          message.trim(),
          currentUserId,
          {
            title: title.trim() || undefined,
            requiresAcknowledgment: true
          }
        );
      } else {
        // Send to individual user
        await adminNotificationService.sendAnnouncement(
          targetUserId.trim(),
          title.trim(),
          message.trim(),
          currentUserId,
          {
            requiresResponse: true
          }
        );
      }

      Alert.alert('Success', isGlobalMessage ? 'Global notification posted - all users will see it!' : 'Notification sent successfully');
      
      // Reset form
      setTargetUserId('');
      setTitle('');
      setMessage('');
      setAdditionalInfo('');
      setNotificationType('announcement');
      setIsGlobalMessage(false);

    } catch (error) {
      console.error('[AdminNotificationTool] Error sending notification:', error);
      Alert.alert('Error', 'Failed to send notification: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  const selectedType = notificationTypes.find(t => t.value === notificationType);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Send Admin Notification</Text>
      
      <ScrollView showsVerticalScrollIndicator={false} style={styles.formContainer}>
        {/* Global Message Toggle */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Message Target</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                !isGlobalMessage && styles.toggleButtonActive
              ]}
              onPress={() => setIsGlobalMessage(false)}
            >
              <Text style={[
                styles.toggleButtonText,
                !isGlobalMessage && styles.toggleButtonTextActive
              ]}>
                Individual User
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                { borderColor: theme.colors.vibeOrange },
                isGlobalMessage && { backgroundColor: theme.colors.vibeOrange }
              ]}
              onPress={() => setIsGlobalMessage(true)}
            >
              <Text style={[
                styles.toggleButtonText,
                isGlobalMessage && styles.toggleButtonTextActive
              ]}>
                Global Message
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Target User ID - Only show if not global */}
        {!isGlobalMessage && (
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Target User ID *</Text>
            <TextInput
              style={styles.textInput}
              value={targetUserId}
              onChangeText={setTargetUserId}
              placeholder="Enter user ID to send notification to"
              placeholderTextColor={theme.colors.gray}
            />
          </View>
        )}

        {/* Global Message Info */}
        {isGlobalMessage && (
          <View style={styles.globalInfoSection}>
            <Text style={styles.globalInfoText}>
              📢 This will send the notification to ALL users in the system.
            </Text>
          </View>
        )}

        {/* Notification Type */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Notification Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScrollView}>
            {notificationTypes.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeButton,
                  { borderColor: type.color },
                  notificationType === type.value && { backgroundColor: type.color }
                ]}
                onPress={() => setNotificationType(type.value)}
              >
                <Text style={[
                  styles.typeButtonText,
                  notificationType === type.value && styles.typeButtonTextActive
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>


        {/* Title - Make it smaller */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Title (Optional)</Text>
          <TextInput
            style={[styles.textInput, { paddingVertical: 8 }]}
            value={title}
            onChangeText={setTitle}
            placeholder="Optional title"
            placeholderTextColor={theme.colors.gray}
            maxLength={100}
          />
        </View>

        {/* Message */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>Message *</Text>
          <TextInput
            style={[styles.textInput, styles.messageInput]}
            value={message}
            onChangeText={setMessage}
            placeholder="Enter message"
            placeholderTextColor={theme.colors.gray}
            multiline
            numberOfLines={2}
            maxLength={500}
            textAlignVertical="top"
          />
        </View>

      </ScrollView>

      {/* Send Button - Outside ScrollView so always visible */}
      <VibeButton
        label={sending ? "Sending..." : "Send Notification"}
        onPress={handleSendNotification}
        variant="primary"
        color={selectedType.color === theme.colors.vibeYellow ? 'yellow' : 
              selectedType.color === theme.colors.vibeGreen ? 'green' :
              selectedType.color === theme.colors.vibePink ? 'pink' : 'blue'}
        disabled={sending || (!isGlobalMessage && !targetUserId.trim()) || !message.trim()}
        style={styles.sendButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  sectionTitle: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.darkGray,
    paddingBottom: 8,
  },
  formContainer: {
    flex: 1,
  },
  inputSection: {
    marginBottom: 12,
  },
  inputLabel: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 8,
    padding: 12,
    color: theme.colors.white,
    fontSize: 14,
    fontFamily: theme.fonts.main,
    borderWidth: 1,
    borderColor: theme.colors.darkGray,
  },
  messageInput: {
    flex: 1,
    minHeight: 50,
  },
  characterCount: {
    color: theme.colors.gray,
    fontSize: 11,
    fontFamily: theme.fonts.main,
    textAlign: 'right',
    marginTop: 4,
  },
  typeScrollView: {
    flexDirection: 'row',
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  typeButtonText: {
    color: theme.colors.white,
    fontSize: 12,
    fontFamily: theme.fonts.main,
  },
  typeButtonTextActive: {
    color: theme.colors.black,
    fontWeight: 'bold',
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  toggleButtonActive: {
    backgroundColor: theme.colors.vibeBlue,
  },
  toggleButtonText: {
    color: theme.colors.white,
    fontSize: 12,
    fontFamily: theme.fonts.main,
    textAlign: 'center',
  },
  toggleButtonTextActive: {
    color: theme.colors.black,
    fontWeight: 'bold',
  },
  globalInfoSection: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.vibeOrange,
  },
  globalInfoText: {
    color: theme.colors.vibeOrange,
    fontSize: 13,
    fontFamily: theme.fonts.main,
    fontWeight: '500',
    textAlign: 'center',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  priorityButtonActive: {
    backgroundColor: theme.colors.vibeBlue,
  },
  priorityButtonText: {
    color: theme.colors.white,
    fontSize: 12,
    fontFamily: theme.fonts.main,
    textAlign: 'center',
  },
  priorityButtonTextActive: {
    color: theme.colors.black,
    fontWeight: 'bold',
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
  previewCard: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
  },
  previewType: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
    marginBottom: 4,
  },
  previewTitle: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
    marginBottom: 6,
  },
  previewMessage: {
    color: theme.colors.white,
    fontSize: 14,
    fontFamily: theme.fonts.main,
    lineHeight: 18,
  },
  previewAdditional: {
    color: theme.colors.gray,
    fontSize: 12,
    fontFamily: theme.fonts.main,
    fontStyle: 'italic',
    marginTop: 6,
  },
  sendButton: {
    marginTop: 8,
    width: '100%',
  },
});