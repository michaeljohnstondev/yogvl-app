import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ProfileAvatar from '../profile/ProfileAvatar';
import FollowButton from '../buttons/FollowButton';
import { getUserDisplayName } from '../../../lib/userUtils';
import theme from '../../../theme/themes';

const SocialUserItem = ({
  user,
  currentUserId,
  onUserPress,
  onFollow,
  onUnfollow,
  isLoading = false,
}) => {
  const isCurrentUser = user.id === currentUserId;
  const displayName = getUserDisplayName(user);

  const handleUserPress = () => {
    if (isCurrentUser || !onUserPress) return;
    onUserPress(user);
  };

  const handleFollow = () => {
    if (onFollow) onFollow(user.id);
  };

  const handleUnfollow = () => {
    if (onUnfollow) onUnfollow(user.id);
  };

  return (
    <View style={styles.userItem}>
      <TouchableOpacity
        style={styles.userInfo}
        onPress={handleUserPress}
        disabled={isCurrentUser}
      >
        <ProfileAvatar userData={user} size={50} />
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{displayName}</Text>
          {user.userdata?.studios?.default?.studioName && (
            <Text style={styles.userLocation}>
              {user.userdata.studios.default.studioName}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {!isCurrentUser && (
        <View style={styles.actionButton}>
          <FollowButton
            isFollowing={user.isFollowing}
            isLoading={isLoading}
            onFollow={handleFollow}
            onUnfollow={handleUnfollow}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 198, 255, 0.1)',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  userLocation: {
    color: '#888',
    fontSize: 14,
    marginTop: 2,
  },
  actionButton: {
    minWidth: 80,
    alignItems: 'flex-end',
  },
});

export default SocialUserItem;
