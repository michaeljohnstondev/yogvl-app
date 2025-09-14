// FILE: screens/MessageBoardScreen.js

import React, { useState, useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useComments } from '../components/ui/comments/hooks/useComments';
import { UserAvatar } from '../components/ui';
import VibeScreen from '../components/ui/base/VibeScreen';
import { CloseButton } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { FormatDate, getRelativeTimeString } from '../lib/formatDate';
import theme from '../theme/themes';

export default function MessageBoardScreen({ route, navigation }) {
  const { eventId, eventTitle } = route.params;
  const { currentUserId, userData } = useAuth();
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  // Removed reply state - no longer using threading
  const flatListRef = useRef(null);

  const {
    comments: messages,
    loading,
    error,
    submitting,
    addComment: sendMessage,
    deleteComment: deleteMessage,
    clearError,
    eventData,
    getCurrentUserRole,
  } = useComments(eventId);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Handle sending message
  const handleSendMessage = async () => {
    if (!messageText.trim() || submitting) return;

    const success = await sendMessage(messageText.trim());
    if (success) {
      setMessageText('');
      setIsTyping(false);
    }
  };

  // Removed reply handlers - no longer using threading

  // Handle message deletion
  const handleDeleteMessage = async (messageId, messageUserId) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteMessage(messageId, messageUserId);
            if (!success && error) {
              Alert.alert('Error', error);
              clearError();
            }
          },
        },
      ]
    );
  };

  // Format message timestamp
  const formatMessageTime = (timestamp) => {
    return getRelativeTimeString(timestamp);
  };

  // Check if user can delete message
  const canDeleteMessage = (message) => {
    // User can delete their own message
    if (currentUserId === message.userId) return true;

    // Host can delete any message
    const userRole = getCurrentUserRole();
    if (userRole === 'host') return true;

    // Admin can delete any message (if we add admin role later)
    if (userRole === 'admin') return true;

    return false;
  };

  // Get border color based on user role
  const getBorderColor = (message) => {
    // Current user gets green border
    if (message.userId === currentUserId) {
      return theme.colors.vibeGreen;
    }

    // Admin gets purple border
    const userRole = message.userRole || 'attendee';
    if (userRole === 'admin') {
      return theme.colors.vibePurple;
    }

    // Host or cohost gets orange border
    if (userRole === 'host') {
      return theme.colors.vibeOrange;
    }

    // Everyone else gets blue border
    return theme.colors.vibeBlue;
  };

  // Message item component
  const MessageItem = memo(({ message, isCurrentUser }) => {
    const borderColor = getBorderColor(message);

    return (
      <View style={styles.messageContainer}>
        {/* Message Card */}
        <View
          style={[
            styles.messageCard,
            { borderColor: borderColor },
          ]}
        >
          {/* Delete button - top right */}
          {canDeleteMessage(message) && (
            <TouchableOpacity
              onPress={() =>
                handleDeleteMessage(message.id, message.userId)
              }
              style={styles.deleteButton}
            >
              <Text style={styles.deleteButtonText}>✕</Text>
            </TouchableOpacity>
          )}

          {/* Profile Avatar */}
          <View style={styles.avatarContainer}>
            <UserAvatar
              userId={message.userId}
              size={44}
            />
          </View>

          {/* Message Content */}
          <View style={styles.messageContentContainer}>
            {/* Sender name */}
            <Text style={styles.senderName}>
              {message.userName || 'Anonymous'}
              {message.userRole === 'host' && ' (Host)'}
              {message.userRole === 'admin' && ' (Admin)'}
            </Text>

            {/* Message text */}
            <Text style={styles.messageText}>
              {message.content}
            </Text>

            {/* Message footer */}
            <View style={styles.messageFooter}>
              <Text style={styles.messageTime}>
                {formatMessageTime(message.timestamp)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  });

  // Empty state component
  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>Start the conversation!</Text>
      <Text style={styles.emptyStateText}>
        Be the first to share thoughts about this event.
      </Text>
    </View>
  );

  return (
    <VibeScreen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <CloseButton onPress={() => navigation.goBack()} />
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Message Board</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {eventTitle}
            </Text>
          </View>
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageItem
              message={item}
              isCurrentUser={item.userId === currentUserId}
            />
          )}
          ListEmptyComponent={!loading ? <EmptyState /> : null}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => {}} // Hook handles auto-refresh
              tintColor={theme.colors.vibeBlue}
            />
          }
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            if (messages.length > 0) {
              flatListRef.current?.scrollToEnd({ animated: false });
            }
          }}
        />


        {/* Message Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              value={messageText}
              onChangeText={(text) => {
                setMessageText(text);
                setIsTyping(text.length > 0);
              }}
              placeholder="Type a message..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              maxLength={500}
              onFocus={() => {
                // Scroll to bottom when keyboard opens
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, 300);
              }}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                (!messageText.trim() || submitting) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={!messageText.trim() || submitting}
            >
              <LinearGradient
                colors={
                  messageText.trim() && !submitting
                    ? theme.colors.buttonGradient
                    : [theme.colors.darkGray, theme.colors.darkGray]
                }
                style={styles.sendButtonGradient}
              >
                <Text
                  style={[
                    styles.sendButtonText,
                    (!messageText.trim() || submitting) &&
                      styles.sendButtonTextDisabled,
                  ]}
                >
                  {submitting ? '⏳' : '➤'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Character count */}
          {messageText.length > 400 && (
            <Text
              style={[
                styles.charCount,
                messageText.length >= 500 && styles.charCountWarning,
              ]}
            >
              {messageText.length}/500
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </VibeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.inputBorder,
    backgroundColor: theme.colors.background,
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.main,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.main,
    marginTop: 2,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 20,
    paddingHorizontal: 16,
    position: 'relative',
  },
  messageCard: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: theme.sizes.borderRadius,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  messageContentContainer: {
    flex: 1,
    gap: 6,
  },
  senderName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.main,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.main,
  },
  messageFooter: {
    marginTop: 4,
  },
  messageTime: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.main,
  },
  deleteButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  deleteButtonText: {
    fontSize: 12,
    color: theme.colors.vibeRed || '#FF4444',
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.inputBorder,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.main,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    marginLeft: 12,
  },
  sendButtonGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  sendButtonTextDisabled: {
    color: theme.colors.textSecondary,
  },
  charCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  charCountWarning: {
    color: theme.colors.red || '#FF4444',
  },
});
