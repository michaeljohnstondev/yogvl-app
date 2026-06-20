// MessageInput.jsx - Isolated input component to prevent parent re-renders.
// Owns the message-text state plus the new image-attach flow: tapping
// the camera button opens Android's system Photo Picker / iOS picker
// (no broad-permission request — same pattern as profile + poster
// pickers), uploads the chosen image to Storage, then submits an
// image-only post via onSendMessage(text, imageUrl). Text-only posts
// keep working as before.

import React, { useState, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import theme from '../../../theme/themes';
import { uploadMessageBoardImage } from '../../../services/messageBoardImageService';

const MessageInput = memo(function MessageInput({
  onSendMessage,
  submitting,
  disabled,
  studioId,
  eventId,
}) {
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleSend = async () => {
    if (!messageText.trim() || submitting) return;

    const text = messageText.trim();
    setMessageText('');
    setIsTyping(false);

    // Text-only path — no imageUrl passed.
    await onSendMessage(text);
  };

  const handleAttachImage = async () => {
    if (uploadingImage || submitting || disabled) return;
    if (!studioId || !eventId) {
      Alert.alert('Error', 'Cannot attach image right now.');
      return;
    }

    setUploadingImage(true);
    try {
      // No permission request — system Photo Picker handles single-
      // image hand-off without requiring READ_MEDIA_IMAGES (same as
      // PosterImage and UserProfileScreen library picker).
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        setUploadingImage(false);
        return;
      }

      const url = await uploadMessageBoardImage(
        studioId,
        eventId,
        result.assets[0].uri
      );

      // Image-only post — pass empty text and the uploaded URL.
      await onSendMessage('', url);
    } catch (error) {
      console.error('[MessageInput] Image attach failed:', error);
      Alert.alert('Upload Failed', 'Could not share the image. Try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleTextChange = (text) => {
    setMessageText(text);
    setIsTyping(text.length > 0);
  };

  const busy = submitting || uploadingImage;

  return (
    <View style={styles.inputContainer}>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.textInput}
          value={messageText}
          onChangeText={handleTextChange}
          placeholder="Type your message..."
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          maxLength={500}
          editable={!disabled && !uploadingImage}
        />

        {/* Bottom row: image attach button + counter + send */}
        <View style={styles.bottomRow}>
          <TouchableOpacity
            onPress={handleAttachImage}
            style={styles.imageButton}
            disabled={busy || disabled}
            accessibilityLabel="Attach an image"
          >
            {uploadingImage ? (
              <ActivityIndicator size="small" color={theme.colors.vibeCyan} />
            ) : (
              <Ionicons
                name="image-outline"
                size={22}
                color={theme.colors.vibeCyan}
              />
            )}
          </TouchableOpacity>

          <Text
            style={[
              styles.characterCounter,
              messageText.length > 450 && styles.counterWarning,
            ]}
          >
            {messageText.length}/500
          </Text>

          <TouchableOpacity
            onPress={handleSend}
            style={[
              styles.sendButton,
              (!messageText.trim() || busy) && styles.sendButtonDisabled,
            ]}
            disabled={!messageText.trim() || busy}
          >
            <Text style={styles.sendButtonText}>
              {submitting ? 'Sending...' : 'Send'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  inputContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
    backgroundColor: theme.colors.cardBackground,
  },
  inputWrapper: {
    backgroundColor: '#1A0A35',
    borderRadius: 12,
    borderWidth: 3,
    borderColor: theme.colors.vibeCyan,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 60,
  },
  textInput: {
    color: theme.colors.white,
    fontSize: 16,
    fontFamily: theme.fonts.main,
    minHeight: 40,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  imageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.vibeCyan,
  },
  characterCounter: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontFamily: theme.fonts.main,
    flex: 1,
    textAlign: 'right',
  },
  counterWarning: {
    color: theme.colors.warning,
  },
  sendButton: {
    backgroundColor: theme.colors.vibeBlue,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.textSecondary,
    opacity: 0.5,
  },
  sendButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
  },
});

export default MessageInput;
