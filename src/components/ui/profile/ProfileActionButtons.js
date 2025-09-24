import React from 'react';
import { View, TouchableOpacity, Text, Pressable } from 'react-native';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import VibeButton from '../base/VibeButton';
import FollowButton from '../buttons/FollowButton';
import BlockButton from '../buttons/BlockButton';
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
  // Edit mode save props
  onSave,
  isSaving,
}) => {
  // Top row buttons (close, report, edit)
  const renderTopButtons = () => {
    const shouldShowReport =
      targetUserId &&
      currentUserId &&
      targetUserId !== currentUserId &&
      !isOwnProfile;

    return (
      <View style={styles.topButtonsContainer}>
        <View style={styles.topButtonsRightSide}>
          {/* Report button - only for other users */}
          {shouldShowReport && (
            <TouchableOpacity style={styles.reportButton} onPress={onReportUser}>
              <Text style={styles.reportButtonText}>⚠️</Text>
            </TouchableOpacity>
          )}

          {/* Edit/Save button - only for own profile */}
          {isOwnProfile && (
            <TouchableOpacity
              onPress={isEditing ? onSave : () => setIsEditing(!isEditing)}
              style={styles.editButton}
              disabled={isEditing && isSaving}
            >
              <Text style={styles.editButtonText}>
                {isEditing ? (isSaving ? 'Saving...' : 'Save') : 'Edit'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

      </View>
    );
  };

  // Red gradient button component (matching BlockButton style)
  const RedButton = ({ label, onPress, style }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        { opacity: pressed ? 0.8 : 1 },
        style,
      ]}
    >
      <LinearGradient
        colors={['#CC0022', '#FF0844', '#AA001B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.redGradientBorder}
      >
        <View style={styles.redButtonContent}>
          <Text style={styles.redButtonText}>{label}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );

  // Bottom action buttons
  const renderBottomButtons = () => {
    if (isOwnProfile) {
      return (
        <View style={styles.buttonContainer}>
          <VibeButton
            label="LOGOUT"
            onPress={onLogout}
            variant="toggle"
            color="red"
            style={styles.actionButton}
            textStyle={{ fontWeight: '900', letterSpacing: 2 }}
          />
          <RedButton
            label="DELETE ACCOUNT"
            onPress={onDeleteAccount}
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
  topButtonsContainer: {
    alignItems: 'flex-end',
    gap: 8,
  },
  topButtonsRightSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  saveButtonContainer: {
    marginTop: 4,
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
    backgroundColor: theme.colors.vibeBlue, // Should be blue #00C6FF
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
  // Red gradient button styles (matching BlockButton)
  redGradientBorder: {
    borderRadius: theme.sizes.buttonRadius,
    padding: 2,
  },
  redButtonContent: {
    backgroundColor: 'transparent',
    borderRadius: theme.sizes.buttonRadius,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  redButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
    fontFamily: theme.fonts.main,
    textAlign: 'center',
  },
});

export default ProfileActionButtons;
