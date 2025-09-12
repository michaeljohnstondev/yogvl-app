import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { StyleSheet } from 'react-native';
import VibeButton from './VibeButton';
import FollowButton from './FollowButton';
import BlockButton from './BlockButton';
import theme from '../../../theme/themes';

const ProfileActionButtons = ({
  isOwnProfile,
  targetUserId,
  currentUserId,
  isEditing,
  setIsEditing,
  onReportUser,
  // Follow/block props
  isFollowing,
  isFollowLoading,
  onFollow,
  onUnfollow,
  isBlocked,
  isBlockLoading,
  onBlock,
  onUnblock,
  // Own profile actions
  onSettings,
  onNotificationSettings,
  onPrivacySettings,
  onLogout,
  onDeleteAccount,
}) => {
  // Top row buttons (close, report, edit)
  const renderTopButtons = () => {
    // Debug logging for report button
    console.log('[ProfileActionButtons] Debug - targetUserId:', targetUserId);
    console.log('[ProfileActionButtons] Debug - currentUserId:', currentUserId);
    console.log('[ProfileActionButtons] Debug - isOwnProfile:', isOwnProfile);
    console.log('[ProfileActionButtons] Debug - targetUserId !== currentUserId:', targetUserId !== currentUserId);
    const shouldShowReport = targetUserId && currentUserId && targetUserId !== currentUserId && !isOwnProfile;
    console.log('[ProfileActionButtons] Debug - shouldShowReport:', shouldShowReport);
    
    return (
      <View style={styles.topButtonsRightSide}>
        {/* Report button - only for other users */}
        {shouldShowReport && (
          <TouchableOpacity
            style={styles.reportButton}
            onPress={onReportUser}
          >
            <Text style={styles.reportButtonText}>⚠️</Text>
          </TouchableOpacity>
        )}
      
      {/* Edit button - only for own profile */}
      {isOwnProfile && (
        <TouchableOpacity
          onPress={() => setIsEditing(!isEditing)}
          style={styles.editButton}
        >
          <Text style={styles.editButtonText}>
            {isEditing ? 'Cancel' : 'Edit'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
    );
  };

  // Bottom action buttons
  const renderBottomButtons = () => {
    if (isOwnProfile) {
      return (
        <View style={styles.buttonContainer}>
          <VibeButton
            label="Settings"
            onPress={onSettings}
            style={styles.settingsButton}
          />
          <VibeButton
            label="Privacy Settings"
            onPress={onPrivacySettings}
            style={styles.actionButton}
          />
          <VibeButton
            label="Notification Settings"
            onPress={onNotificationSettings}
            style={styles.actionButton}
          />
          
          <View style={styles.buttonSeparator} />
          
          <VibeButton
            label="Logout"
            onPress={onLogout}
            color="red"
            style={styles.actionButton}
          />
          <VibeButton
            label="Delete Account"
            onPress={onDeleteAccount}
            color="red"
            style={styles.actionButton}
          />
        </View>
      );
    } else {
      return (
        <View style={styles.socialButtonContainer}>
          <FollowButton
            isFollowing={isFollowing}
            isLoading={isFollowLoading}
            onFollow={onFollow}
            onUnfollow={onUnfollow}
            style={styles.followButton}
          />
          <BlockButton
            onPress={isBlocked ? onUnblock : onBlock}
            isLoading={isBlockLoading}
            label={isBlocked ? 'Unblock' : 'Block'}
            style={styles.actionButton}
          />
        </View>
      );
    }
  };

  return {
    topButtons: renderTopButtons(),
    bottomButtons: renderBottomButtons(),
  };
};

const styles = StyleSheet.create({
  topButtonsRightSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reportButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportButtonText: {
    fontSize: 18,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.vibeBlue,
  },
  editButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  settingsButton: {
    marginBottom: 12,
  },
  actionButton: {
    marginBottom: 12,
  },
  buttonSeparator: {
    height: 1,
    backgroundColor: theme.colors.vibeBlue,
    marginVertical: 20,
  },
  socialButtonContainer: {
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  followButton: {
    alignSelf: 'stretch',
  },
});

export default ProfileActionButtons;