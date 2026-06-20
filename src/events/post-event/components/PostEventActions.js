// FILE: PostEventActions.js - Component for post-event social actions (follow, etc.)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { useAuth } from '../../../auth/AuthContext';
import { useVibeAlert } from '../../../components/ui/base/VibeAlertContext';
import {
  followUser,
  unfollowUser,
  checkIfFollowing,
  checkIfMutualFollows,
} from '../../../services/followService';
import { VibeButton } from '../../../components/ui';
import { ProfileAvatar } from '../../../components/ui/profile';
import theme from '../../../theme/themes';

const PostEventActions = ({
  participants,
  userStatus,
  eventData,
  onDeleteEvent,
  submitting,
  navigation,
  eventId,
  studioId,
}) => {
  const { currentUserId, userData } = useAuth();
  const vibeAlert = useVibeAlert();

  const [followingStatus, setFollowingStatus] = useState({});
  const [mutualFollowStatus, setMutualFollowStatus] = useState({});
  const [loadingFollows, setLoadingFollows] = useState(true);

  // Load follow status for all participants
  useEffect(() => {
    if (participants.length > 0 && currentUserId) {
      loadFollowStatuses();
    }
  }, [participants, currentUserId]);

  const loadFollowStatuses = async () => {
    try {
      setLoadingFollows(true);

      const followStatusPromises = participants.map(async (user) => {
        if (user.id === currentUserId) return [user.id, false, false]; // Can't follow yourself

        // Use service functions instead of direct Firebase calls
        const [iFollowThem, isMutualFriend] = await Promise.all([
          checkIfFollowing(currentUserId, user.id),
          checkIfMutualFollows(currentUserId, user.id),
        ]);

        return [user.id, iFollowThem, isMutualFriend];
      });

      const followStatusResults = await Promise.all(followStatusPromises);
      const followStatusMap = {};
      const mutualFollowMap = {};

      followStatusResults.forEach(([userId, isFollowing, isMutual]) => {
        followStatusMap[userId] = isFollowing;
        mutualFollowMap[userId] = isMutual;
      });

      setFollowingStatus(followStatusMap);
      setMutualFollowStatus(mutualFollowMap);
    } catch (error) {
      console.error('[PostEventActions] Error loading follow statuses:', error);
    } finally {
      setLoadingFollows(false);
    }
  };

  const handleToggleFollow = async (targetUserId) => {
    if (targetUserId === currentUserId) return;

    try {
      const targetUser = participants.find((user) => user.id === targetUserId);
      const userName =
        targetUser?.userdata?.contactInfo?.firstName ||
        targetUser?.userdata?.contactInfo?.displayName ||
        'user';
      const isCurrentlyFollowing = followingStatus[targetUserId];

      if (isCurrentlyFollowing) {
        await unfollowUser(currentUserId, targetUserId);
        setFollowingStatus((prev) => ({ ...prev, [targetUserId]: false }));
        setMutualFollowStatus((prev) => ({ ...prev, [targetUserId]: false }));
        // Success feedback provided by button state change
      } else {
        await followUser(currentUserId, targetUserId, userData);
        setFollowingStatus((prev) => ({ ...prev, [targetUserId]: true }));
        // Check if it's now mutual using service function
        const isMutual = await checkIfMutualFollows(
          currentUserId,
          targetUserId
        );
        setMutualFollowStatus((prev) => ({
          ...prev,
          [targetUserId]: isMutual,
        }));
        // Success feedback provided by button state change
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      const targetUser = participants.find((user) => user.id === targetUserId);
      const userName = targetUser?.userdata?.contactInfo?.firstName || 'user';
      vibeAlert.error(
        'Error',
        `Failed to ${followingStatus[targetUserId] ? 'unfollow' : 'follow'} ${userName}`
      );
    }
  };

  const handleDeleteEvent = () => {
    vibeAlert.confirm(
      'Delete Event',
      'Are you sure you want to permanently delete this event? This action cannot be undone.',
      async () => {
        const success = await onDeleteEvent();
        if (success) {
          // Navigation will be handled by the parent component
        }
      },
      () => {} // Cancel - do nothing
    );
  };

  const handleNavigateToProfile = (userId, isHost, userData) => {
    if (!navigation) return;

    // Navigate to different screen based on if they're the host or not
    if (isHost && userData) {
      navigation.navigate('HostProfile', {
        hostData: userData,
        eventId,
        studioId
      });
    } else if (userId !== currentUserId) {
      navigation.navigate('UserProfile', { userId });
    }
  };

  const renderParticipant = ({ item }) => {
    if (!item.userdata?.contactInfo) return null;

    const isCurrentUser = item.id === currentUserId;
    const isHost = item.id === eventData?.createdBy;
    const isFollowing = followingStatus[item.id];
    const isMutualFriend = mutualFollowStatus[item.id];

    const displayName =
      item.userdata.contactInfo.displayName ||
      item.userdata.contactInfo.firstName ||
      'Unknown User';

    return (
      <TouchableOpacity
        key={item.id}
        style={[
          styles.participantItem,
          isHost && styles.participantItemHost,
        ]}
        onPress={() => handleNavigateToProfile(item.id, isHost, item)}
        disabled={loadingFollows}
      >
        <ProfileAvatar userData={item} size={50} showBorder={false} />

        <View style={styles.participantInfo}>
          <Text style={styles.participantName}>
            {displayName}
            {isCurrentUser && ' (You)'}
            {isHost && !isCurrentUser && ' (Host)'}
          </Text>
          {!isCurrentUser && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                handleToggleFollow(item.id);
              }}
              style={styles.followButton}
            >
              <Text
                style={[
                  styles.followButtonText,
                  isFollowing && styles.followingText,
                ]}
              >
                {isMutualFriend
                  ? '👫 Friends'
                  : isFollowing
                    ? '✓ Following'
                    : '+ Follow'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Participants Section */}
      {participants.length > 0 && (
        <View style={styles.participantsSection}>
          <Text style={styles.sectionHeader}>Connect</Text>

          <FlatList
            data={participants}
            renderItem={renderParticipant}
            keyExtractor={(item) => item.id}
            style={styles.participantsList}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Host Actions */}
      {userStatus.isHost && eventData?.status === 'completed' && (
        <View style={styles.hostActions}>
          <Text style={styles.hostActionsTitle}>Event Management</Text>

          <VibeButton
            label="DELETE EVENT"
            onPress={handleDeleteEvent}
            variant="red"
            disabled={submitting}
            style={styles.deleteButton}
          />

          <Text style={styles.deleteNote}>
            This will permanently delete the event and all its data.
          </Text>
        </View>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },

  // Participants Section
  participantsSection: {
    marginBottom: 10,
  },
  sectionHeader: {
    color: theme.colors.white,
    fontSize: 20,
    fontFamily: theme.fonts.comicBold,
    marginBottom: 10,
    marginTop: 20,
    marginLeft: 4,
  },
  participantsList: {
    maxHeight: 400,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderColor: theme.colors.vibeBlue,
  },
  participantItemHost: {
    backgroundColor: theme.colors.vibeBackgroundOrange,
    borderColor: theme.colors.vibeOrange,
  },
  participantInfo: {
    flex: 1,
    marginLeft: 12,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
    marginBottom: 4,
  },
  followButton: {
    alignSelf: 'flex-start',
  },
  followButtonText: {
    fontSize: 13,
    color: theme.colors.vibeBlue,
    fontWeight: '600',
  },
  followingText: {
    color: theme.colors.vibeGreen,
  },

  // Host Actions
  hostActions: {
    backgroundColor: theme.colors.vibeBackgroundRed,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.vibeRed,
  },
  hostActionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: theme.colors.vibeRed,
    marginVertical: 0,
  },
  deleteNote: {
    fontSize: 12,
    color: theme.colors.gray,
    textAlign: 'center',
    marginTop: 8,
  },

  // Future Features
  futureSection: {
    marginBottom: 20,
  },
  futureSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: 16,
    textAlign: 'center',
  },
  futureFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
    opacity: 0.6,
  },
  futureFeatureIcon: {
    fontSize: 20,
    marginRight: 16,
  },
  futureFeatureContent: {
    flex: 1,
  },
  futureFeatureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
    marginBottom: 4,
  },
  futureFeatureDescription: {
    fontSize: 12,
    color: theme.colors.gray,
    lineHeight: 18,
  },
});

export default PostEventActions;
