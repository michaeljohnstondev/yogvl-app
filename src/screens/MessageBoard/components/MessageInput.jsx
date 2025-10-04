// MessageInput.jsx - Isolated input component to prevent parent re-renders

import React, { useState, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import theme from '../../../theme/themes';

const MessageInput = memo(function MessageInput({
  onSendMessage,
  submitting,
  disabled,
}) {
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSend = async () => {
    if (!messageText.trim() || submitting) return;

    const text = messageText.trim();
    setMessageText('');
    setIsTyping(false);

    // Call parent send function
    await onSendMessage(text);
  };

  const handleTextChange = (text) => {
    setMessageText(text);
    setIsTyping(text.length > 0);
  };

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
          editable={!disabled}
        />

        {/* Bottom row with counter and send button */}
        <View style={styles.bottomRow}>
          {/* Character counter */}
          <Text
            style={[
              styles.characterCounter,
              messageText.length > 450 && styles.counterWarning,
            ]}
          >
            {messageText.length}/500
          </Text>

          {/* Send button */}
          <TouchableOpacity
            onPress={handleSend}
            style={[
              styles.sendButton,
              (!messageText.trim() || submitting) && styles.sendButtonDisabled,
            ]}
            disabled={!messageText.trim() || submitting}
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
    borderColor: theme.colors.vibeBlue,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  characterCounter: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontFamily: theme.fonts.main,
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
