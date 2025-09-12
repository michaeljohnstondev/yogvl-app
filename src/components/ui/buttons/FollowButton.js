import React from 'react';
import { Pressable, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../../theme/themes';

const FollowButton = ({ 
  isFollowing, 
  isLoading, 
  onFollow, 
  onUnfollow,
  disabled = false,
  style 
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
      <View style={[styles.loadingContainer, style]}>
        <ActivityIndicator 
          size="small" 
          color={theme.colors.vibeBlue} 
        />
        <Text style={styles.loadingText}>
          {isFollowing ? 'Unfollowing...' : 'Following...'}
        </Text>
      </View>
    );
  }

  // Follow button - use gradient like VibeButton
  if (!isFollowing) {
    return (
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        style={({ pressed }) => [
          { opacity: pressed ? 0.8 : (disabled ? 0.5 : 1) }, 
          style
        ]}
      >
        <LinearGradient
          colors={theme.colors.buttonGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBorder}
        >
          <View style={styles.buttonContent}>
            <Text style={styles.followText}>Follow</Text>
          </View>
        </LinearGradient>
      </Pressable>
    );
  }

  // Unfollow button - use bordered style like VibeButton toggle
  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.unfollowButton,
        { opacity: pressed ? 0.8 : (disabled ? 0.5 : 1) },
        style
      ]}
    >
      <Text style={styles.unfollowText}>Following</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  // Follow button (gradient style like VibeButton)
  gradientBorder: {
    borderRadius: theme.sizes.buttonRadius,
    padding: 2,
    minWidth: 120,
  },
  buttonContent: {
    backgroundColor: 'transparent',
    borderRadius: theme.sizes.buttonRadius,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  followText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
  },
  
  // Unfollow button (bordered style like VibeButton toggle)
  unfollowButton: {
    borderWidth: 2,
    borderColor: theme.colors.vibeBlue,
    borderRadius: theme.sizes.buttonRadius,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: 'transparent',
    minWidth: 120,
  },
  unfollowText: {
    color: theme.colors.vibeBlue,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
    textAlign: 'center',
  },
  
  // Loading state
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 120,
    borderRadius: theme.sizes.buttonRadius,
    borderWidth: 2,
    borderColor: theme.colors.vibeBlue,
    backgroundColor: 'transparent',
    gap: 8,
  },
  loadingText: {
    color: theme.colors.vibeBlue,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },
});

export default FollowButton;