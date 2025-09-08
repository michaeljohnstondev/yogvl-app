// FILE: screens/MessageBoardScreen.js

import React, { useState, useRef, useEffect } from 'react';
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
import ProfileAvatar from '../components/ui/ProfileAvatar';
import VibeScreen from '../components/ui/VibeScreen';
import CloseButton from '../components/ui/CloseButton';
import { useAuth } from '../auth/AuthContext';
import { FormatDate } from '../lib/formatDate';
import theme from '../theme/themes';

export default function MessageBoardScreen({ route, navigation }) {
  const { eventId, eventTitle } = route.params;
  const { currentUserId, userData } = useAuth();
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef(null);
  
  const {
    comments: messages,
    loading,
    error,
    submitting,
    addComment: sendMessage,
    deleteComment: deleteMessage,
    clearError,
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
    return FormatDate.getRelativeTimeString(timestamp);
  };

  // Check if user can delete message
  const canDeleteMessage = (message) => {
    return currentUserId === message.userId;
  };

  // Message item component
  const MessageItem = ({ message, isCurrentUser }) => (
    <View style={[
      styles.messageContainer,
      isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
    ]}>
      {!isCurrentUser && (
        <View style={styles.messageAvatar}>
          <ProfileAvatar 
            userId={message.userId}
            size={32}
            style={styles.avatar}
          />
        </View>
      )}
      
      <View style={[
        styles.messageContent,
        isCurrentUser ? styles.currentUserContent : styles.otherUserContent
      ]}>
        {!isCurrentUser && (
          <Text style={styles.senderName}>
            {message.userName || 'Anonymous'}
          </Text>
        )}
        
        <Text style={[
          styles.messageText,
          isCurrentUser ? styles.currentUserText : styles.otherUserText
        ]}>
          {message.content}
        </Text>
        
        <View style={styles.messageFooter}>
          <Text style={[
            styles.messageTime,
            isCurrentUser ? styles.currentUserTime : styles.otherUserTime
          ]}>
            {formatMessageTime(message.createdAt)}
          </Text>
          
          {canDeleteMessage(message) && (
            <TouchableOpacity
              onPress={() => handleDeleteMessage(message.id, message.userId)}
              style={styles.deleteButton}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {isCurrentUser && (
        <View style={styles.messageAvatar}>
          <ProfileAvatar 
            userId={message.userId}
            size={32}
            style={styles.avatar}
          />
        </View>
      )}
    </View>
  );

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
          <View style={styles.headerRight}>
            <Text style={styles.messageCount}>
              {messages.length === 0 ? 'No messages' : `${messages.length}`}
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
                (!messageText.trim() || submitting) && styles.sendButtonDisabled
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
                <Text style={[
                  styles.sendButtonText,
                  (!messageText.trim() || submitting) && styles.sendButtonTextDisabled
                ]}>
                  {submitting ? '⏳' : '➤'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          
          {/* Character count */}
          {messageText.length > 400 && (
            <Text style={[
              styles.charCount,
              messageText.length >= 500 && styles.charCountWarning
            ]}>
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
    borderBottomColor: theme.colors.darkGray,
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
  headerRight: {
    alignItems: 'flex-end',
  },
  messageCount: {
    fontSize: 12,
    color: theme.colors.vibeBlue,
    fontWeight: '600',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingHorizontal: 16,
    alignItems: 'flex-end',
  },
  currentUserMessage: {
    justifyContent: 'flex-end',
  },
  otherUserMessage: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    marginHorizontal: 8,
  },
  avatar: {
    borderWidth: 2,
    borderColor: theme.colors.vibeBlue,
  },
  messageContent: {
    maxWidth: '75%',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  currentUserContent: {
    backgroundColor: theme.colors.vibeBlue,
    borderBottomRightRadius: 4,
  },
  otherUserContent: {
    backgroundColor: theme.colors.inputBackground,
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.vibeBlue,
    marginBottom: 4,
    fontFamily: theme.fonts.main,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
    fontFamily: theme.fonts.main,
  },
  currentUserText: {
    color: theme.colors.white,
  },
  otherUserText: {
    color: theme.colors.textPrimary,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  messageTime: {
    fontSize: 11,
    fontFamily: theme.fonts.main,
  },
  currentUserTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  otherUserTime: {
    color: theme.colors.textSecondary,
  },
  deleteButton: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  deleteButtonText: {
    fontSize: 11,
    color: theme.colors.red || '#FF4444',
    fontWeight: '500',
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
    borderTopColor: theme.colors.darkGray,
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