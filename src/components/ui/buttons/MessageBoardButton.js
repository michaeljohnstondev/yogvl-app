// FILE: components/ui/MessageBoardButton.js

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useComments } from './comments/hooks/useComments';
import theme from '../../../theme/themes';

export default function MessageBoardButton({ eventId, eventTitle, navigation }) {
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
    const preview = lastMessage.content.length > 50 
      ? `${lastMessage.content.substring(0, 50)}...`
      : lastMessage.content;
    
    return `${lastMessage.userName || 'Someone'}: ${preview}`;
  };

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleSection}>
            <Text style={styles.title}>💬 Message Board</Text>
            <Text style={styles.subtitle}>
              {getMessageCountText()}
            </Text>
          </View>
          
          <View style={styles.arrow}>
            <Text style={styles.arrowText}>›</Text>
          </View>
        </View>
        
        {/* Last message preview */}
        {getLastMessagePreview() && (
          <Text style={styles.preview} numberOfLines={1}>
            {getLastMessagePreview()}
          </Text>
        )}
        
        {/* Empty state message */}
        {!loading && comments.length === 0 && (
          <Text style={styles.emptyMessage}>
            Start a conversation about this event
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 198, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue || '#00C6FF',
    marginVertical: 8,
    overflow: 'hidden',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleSection: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.main,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.vibeBlue,
    fontFamily: theme.fonts.main,
    fontWeight: '500',
  },
  arrow: {
    backgroundColor: theme.colors.vibeBlue,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 2, // Optical centering
  },
  preview: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.main,
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyMessage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.main,
    fontStyle: 'italic',
  },
});