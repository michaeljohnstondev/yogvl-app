// FILE: screens/MessageBoardScreen.js

import React, { useRef, useEffect, memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  RefreshControl,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useComments } from '../components/ui/comments/hooks/useComments';
import { UserAvatar } from '../components/ui';
import { CloseButton } from '../components/ui';
import { useAuth } from '../auth/AuthContext';
import { FormatDate, getRelativeTimeString } from '../lib/formatDate';
import { usePrivacyValidation } from '../hooks/usePrivacyValidation';
import { useVibeAlert } from '../components/ui/base/VibeAlertContext';
import { useStatusBar } from '../components/ui/base/VibeAppWrapper';
import MessageInput from './MessageBoard/components/MessageInput';
import theme from '../theme/themes';
import { useFocusEffect } from '@react-navigation/native';

export default function MessageBoardScreen({ route, navigation }) {
  const { eventId, eventTitle, scrollToComment } = route.params;
  const { currentUserId, userData } = useAuth();
  const vibeAlert = useVibeAlert();
  const { validateAndNavigate } = usePrivacyValidation(currentUserId);
  const flatListRef = useRef(null);
  const previousMessageCount = useRef(0);
  const isInitialLoad = useRef(true);
  const hasScrolledToComment = useRef(false);

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

  // Scroll to specific comment when opening from notification
  useEffect(() => {
    if (scrollToComment && messages.length > 0 && !hasScrolledToComment.current) {
      const commentIndex = messages.findIndex(msg => msg.id === scrollToComment);

      if (commentIndex !== -1) {
        console.log(`[MessageBoard] Scrolling to comment ${scrollToComment} at index ${commentIndex}`);
        hasScrolledToComment.current = true;

        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: commentIndex,
            animated: true,
            viewPosition: 0.5 // Center the comment on screen
          });
        }, 300);
      }
    }
  }, [scrollToComment, messages]);

  // Auto-scroll to bottom when new messages arrive (newest messages are last)
  useEffect(() => {
    // Skip auto-scroll on initial load
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      previousMessageCount.current = messages.length;
      return;
    }

    // Skip auto-scroll if we're trying to scroll to a specific comment
    if (scrollToComment && !hasScrolledToComment.current) {
      previousMessageCount.current = messages.length;
      return;
    }

    // Only auto-scroll if new messages were added
    if (messages.length > previousMessageCount.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }

    previousMessageCount.current = messages.length;
  }, [messages.length, scrollToComment]);

  // Handle sending message from isolated input component
  const handleSendMessage = useCallback(
    async (messageText) => {
      const success = await sendMessage(messageText);
      if (success) {
        // Auto-scroll to bottom when new message is sent (newest messages are last)
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
      return success;
    },
    [sendMessage]
  );

  // Removed reply handlers - no longer using threading

  // Handle profile navigation with privacy validation
  const handleProfileNavigation = useCallback(
    async (userId) => {
      if (!userId || userId === currentUserId) {
        // Navigate to own profile directly
        navigation.navigate('UserProfile', { userId: currentUserId });
        return;
      }

      await validateAndNavigate(
        userId,
        // On access granted - navigate to profile
        () => {
          console.log('[MessageBoard] Navigating to profile:', userId);
          navigation.navigate('UserProfile', { userId });
        },
        // On access denied - show feedback
        (validation) => {
          console.log(
            '[MessageBoard] Profile access denied:',
            validation.reason
          );
          if (validation.shouldShowFeedback && validation.message) {
            vibeAlert.error('Profile Unavailable', validation.message);
          }
        }
      );
    },
    [currentUserId, navigation, validateAndNavigate, vibeAlert]
  );

  // Handle message deletion
  const handleDeleteMessage = useCallback(
    async (messageId, messageUserId) => {
      vibeAlert.confirm(
        'Delete Message',
        'Are you sure you want to delete this message?',
        async () => {
          const success = await deleteMessage(messageId, messageUserId);
          if (!success && error) {
            vibeAlert.error('Error', error);
            clearError();
          }
        }
      );
    },
    [deleteMessage, error, clearError, vibeAlert]
  );

  // Format message timestamp
  const formatMessageTime = (timestamp) => {
    return getRelativeTimeString(timestamp);
  };

  // Check if user can delete message
  const canDeleteMessage = useCallback(
    (message) => {
      // User can delete their own message
      if (currentUserId === message.userId) return true;

      // Host can delete any message
      const userRole = getCurrentUserRole();
      if (userRole === 'host') return true;

      // Admin can delete any message (if we add admin role later)
      if (userRole === 'admin') return true;

      return false;
    },
    [currentUserId, getCurrentUserRole]
  );

  // Get border color based on user role
  const getBorderColor = useCallback(
    (message) => {
      // Current user gets green border
      if (message.userId === currentUserId) {
        return theme.colors.vibeGreen;
      }

      // Admin gets orange border
      const userRole = message.userRole || 'attendee';
      if (userRole === 'admin') {
        return theme.colors.vibeOrange;
      }

      // Host or cohost gets purple border
      if (userRole === 'host') {
        return theme.colors.vibePurple;
      }

      // Everyone else gets blue border
      return theme.colors.vibeBlue;
    },
    [currentUserId]
  );

  // Get background tint based on border color (slightly transparent version)
  const getBackgroundTint = useCallback(
    (message) => {
      // Current user gets green tint
      if (message.userId === currentUserId) {
        return 'rgba(0, 255, 136, 0.08)'; // vibeGreen with low opacity
      }

      // Admin gets orange tint
      const userRole = message.userRole || 'attendee';
      if (userRole === 'admin') {
        return 'rgba(255, 119, 0, 0.08)'; // vibeOrange with low opacity
      }

      // Host or cohost gets purple tint
      if (userRole === 'host') {
        return 'rgba(170, 0, 255, 0.08)'; // vibePurple with low opacity
      }

      // Everyone else gets blue tint
      return 'rgba(0, 194, 255, 0.08)'; // vibeBlue with low opacity
    },
    [currentUserId]
  );

  // Create stable delete handlers for each message
  const createDeleteHandler = useCallback(
    (messageId, messageUserId) => {
      return () => handleDeleteMessage(messageId, messageUserId);
    },
    [handleDeleteMessage]
  );

  // Create stable avatar press handlers for each message
  const createAvatarPressHandler = useCallback(
    (userId) => {
      return () => handleProfileNavigation(userId);
    },
    [handleProfileNavigation]
  );

  // Memoized render item to prevent unnecessary re-renders
  const renderMessage = useCallback(
    ({ item }) => (
      <MessageItem
        message={item}
        isCurrentUser={item.userId === currentUserId}
        borderColor={getBorderColor(item)}
        backgroundColor={getBackgroundTint(item)}
        canDelete={canDeleteMessage(item)}
        onDelete={createDeleteHandler(item.id, item.userId)}
        onAvatarPress={createAvatarPressHandler(item.userId)}
        formattedTime={formatMessageTime(item.timestamp)}
      />
    ),
    [currentUserId, getBorderColor, getBackgroundTint, canDeleteMessage, createDeleteHandler, createAvatarPressHandler]
  );

  // Message item component with pre-computed values
  const MessageItem = memo(
    ({
      message,
      isCurrentUser,
      borderColor,
      backgroundColor,
      canDelete,
      onDelete,
      onAvatarPress,
      formattedTime,
    }) => {
      return (
        <View style={styles.messageContainer}>
          {/* Message Card */}
          <View style={[styles.messageCard, { borderColor: borderColor, backgroundColor: backgroundColor }]}>
            {/* Delete button - top right */}
            {canDelete && (
              <Pressable onPress={onDelete} style={styles.deleteButton}>
                <Text style={styles.deleteButtonText}>✕</Text>
              </Pressable>
            )}

            {/* Profile Avatar */}
            <View style={styles.avatarContainer}>
              <UserAvatar
                userId={message.userId}
                size={44}
                onPress={onAvatarPress}
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
              <Text style={styles.messageText}>{message.content}</Text>

              {/* Message footer */}
              <View style={styles.messageFooter}>
                <Text style={styles.messageTime}>
                  {formattedTime}
                </Text>
              </View>
            </View>
          </View>
        </View>
      );
    },
    (prevProps, nextProps) => {
      // Custom comparison - only re-render if these specific props change
      return (
        prevProps.message.id === nextProps.message.id &&
        prevProps.message.content === nextProps.message.content &&
        prevProps.formattedTime === nextProps.formattedTime &&
        prevProps.isCurrentUser === nextProps.isCurrentUser &&
        prevProps.borderColor === nextProps.borderColor &&
        prevProps.canDelete === nextProps.canDelete &&
        prevProps.onDelete === nextProps.onDelete &&
        prevProps.onAvatarPress === nextProps.onAvatarPress
      );
    }
  );

  MessageItem.displayName = 'MessageItem';

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
    <View style={styles.background}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
          renderItem={renderMessage}
          windowSize={10}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={true}
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
        />

        {/* Message Input - Isolated Component */}
        <MessageInput
          onSendMessage={handleSendMessage}
          submitting={submitting}
          disabled={false}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.vibeBlue,
    backgroundColor: theme.colors.headerBackground,
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
    paddingBottom: 30, // Bottom spacing requirement for comfortable scrolling
  },
  messageContainer: {
    marginBottom: 12,
    paddingHorizontal: 16,
    position: 'relative',
  },
  messageCard: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: theme.sizes.borderRadius,
    paddingVertical: 5,
    paddingHorizontal: 16,
    borderWidth: 3,
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
    // UI Restrictions: NO borders, NO background colors on close/report buttons
  },
  deleteButtonText: {
    fontSize: 17,
    color: theme.colors.vibeBlue,
    fontWeight: '900',
    lineHeight: 17,
    // Simple clean text only - no borders or backgrounds
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
    borderWidth: 2,
    borderColor: theme.colors.vibeTurquoise,
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
