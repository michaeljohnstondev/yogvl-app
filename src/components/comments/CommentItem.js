import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../../AuthContext';
import { formatTimestamp } from './utils/commentUtils';
import theme from '../../themes/themes';

const CommentItem = ({ comment, onDelete }) => {
  const { currentUserId } = useAuth();

  // Check if current user owns this comment
  const isOwner = currentUserId === comment.userId;

  const handleDelete = () => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(comment.id, comment.userId),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.userName}>{comment.userName}</Text>
        <View style={styles.rightHeader}>
          <Text style={styles.timestamp}>
            {formatTimestamp(comment.timestamp)}
          </Text>
          {isOwner && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.deleteButtonText}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={styles.content}>{comment.content}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: theme.sizes.borderRadius,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  userName: {
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontFamily: theme.fonts.main,
    flex: 1,
  },
  rightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timestamp: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: theme.fonts.main,
  },
  deleteButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  content: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    lineHeight: 18,
    fontFamily: theme.fonts.main,
  },
});

export default CommentItem;
