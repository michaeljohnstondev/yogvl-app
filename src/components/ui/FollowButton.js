import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import theme from '../../theme/themes';

const FollowButton = ({ 
  isFollowing, 
  isLoading, 
  onFollow, 
  onUnfollow,
  disabled = false 
}) => {
  const handlePress = () => {
    if (disabled || isLoading) return;
    
    if (isFollowing) {
      onUnfollow();
    } else {
      onFollow();
    }
  };

  if (isLoading) {
    return (
      <ActivityIndicator 
        size="small" 
        color={theme.colors.vibeBlue} 
        style={styles.loader}
      />
    );
  }

  return (
    <TouchableOpacity 
      style={[
        styles.button,
        isFollowing ? styles.unfollowButton : styles.followButton,
        disabled && styles.disabledButton
      ]}
      onPress={handlePress}
      disabled={disabled || isLoading}
    >
      <Text style={[
        styles.buttonText,
        isFollowing ? styles.unfollowButtonText : styles.followButtonText,
        disabled && styles.disabledButtonText
      ]}>
        {isFollowing ? 'Unfollow' : 'Follow'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 80,
    alignItems: 'center',
  },
  followButton: {
    backgroundColor: theme.colors.vibeBlue,
  },
  unfollowButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  followButtonText: {
    color: '#fff',
  },
  unfollowButtonText: {
    color: theme.colors.vibeBlue,
  },
  disabledButtonText: {
    color: '#888',
  },
  loader: {
    minWidth: 80,
  },
});

export default FollowButton;