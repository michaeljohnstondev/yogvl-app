// FILE: components/ui/MessageBoardButton.js

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useComments } from '../comments/hooks/useComments';
import theme from '../../../theme/themes';

export default function MessageBoardButton({
  eventId,
  eventTitle,
  navigation,
}) {
  const { comments, loading } = useComments(eventId);

  const handlePress = () => {
    navigation.navigate('MessageBoard', {
      eventId,
      eventTitle,
    });
  };

  const getMessageCountText = () => {
    if (loading) return 'Loading...';
    if (comments.length === 0) return 'No messages yet';
    return `${comments.length} message${comments.length === 1 ? '' : 's'}`;
  };

  const getLastMessagePreview = () => {
    if (loading || comments.length === 0) return null;

    const lastMessage = comments[comments.length - 1];
    const preview =
      lastMessage.content.length > 50
        ? `${lastMessage.content.substring(0, 50)}...`
        : lastMessage.content;

    return `${lastMessage.userName || 'Someone'}: ${preview}`;
  };

  return (
    <Pressable
      style={styles.container}
      onPress={handlePress}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.emojiContainer}>💬</Text>

          <View style={styles.textContent}>
            <Text style={styles.title}>Message Board</Text>
            <Text style={styles.subtitle}>{getMessageCountText()}</Text>
            {getLastMessagePreview() && (
              <Text style={styles.preview} numberOfLines={1}>
                {getLastMessagePreview()}
              </Text>
            )}
            {!loading && comments.length === 0 && (
              <Text style={styles.emptyMessage}>
                Start a conversation about this event
              </Text>
            )}
          </View>

          <View style={styles.chevron}>
            <Text style={styles.chevronText}>‹</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  content: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: theme.sizes.borderRadius,
    padding: 20,
    borderWidth: 2,
    borderColor: theme.colors.vibeBlue, // Blue instead of inputBorder
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emojiContainer: {
    fontSize: 24,
    marginRight: 16,
    width: 40,
    textAlign: 'center',
    lineHeight: 24,
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.main,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.vibeBlue,
    fontFamily: theme.fonts.main,
    fontWeight: '500',
  },
  chevron: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontWeight: 'bold',
    transform: [{ rotate: '180deg' }],
  },
  preview: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.main,
    marginTop: 2,
  },
  emptyMessage: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.main,
  },
});
