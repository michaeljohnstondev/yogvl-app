import React, { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import VibeButton from '../base/VibeButton';

const FollowButton = ({
  isFollowing,
  isLoading,
  onFollow,
  onUnfollow,
  disabled = false,
  style,
}) => {
  // Ref-based lock to prevent rapid-fire clicks
  const isProcessing = useRef(false);
  // Track which action is currently happening
  const [actionType, setActionType] = useState(null); // 'follow' | 'unfollow' | null

  const handlePress = async () => {
    // Ignore if already processing
    if (isProcessing.current) {
      return;
    }

    // Lock immediately
    isProcessing.current = true;

    try {
      // Call the appropriate handler and track which action
      if (isFollowing) {
        setActionType('unfollow');
        await onUnfollow?.();
      } else {
        setActionType('follow');
        await onFollow?.();
      }
    } finally {
      // Unlock after operation completes
      isProcessing.current = false;
      setActionType(null);
    }
  };

  // Determine label based on actual action being performed
  const getLabel = () => {
    if (isLoading) {
      // Show action that's actually happening
      return actionType === 'follow' ? 'Following...' : 'Unfollowing...';
    }
    return isFollowing ? 'Unfollow' : 'Follow';
  };

  return (
    <VibeButton
      label={getLabel()}
      onPress={handlePress}
      variant="default"
      disabled={disabled || isLoading}
      style={[styles.button, style]}
    />
  );
};

const styles = StyleSheet.create({
  button: {
    minWidth: 120,
  },
});

export default FollowButton;
