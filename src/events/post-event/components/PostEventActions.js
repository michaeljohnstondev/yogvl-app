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
import theme from '../../../theme/themes';

const PostEventActions = ({
  participants,
  userStatus,
  eventData,
  onDeleteEvent,
  submitting,
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

    const avatarInitial = displayName.charAt(0).toUpperCase();

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.participantItem}
        onPress={() => !isCurrentUser && handleToggleFollow(item.id)}
        disabled={isCurrentUser || loadingFollows}
      >
        <View style={styles.participantAvatar}>
          <Text style={styles.participantAvatarText}>{avatarInitial}</Text>
          {isHost && (
            <View style={styles.hostBadge}>
              <Text style={styles.hostBadgeText}>H</Text>
            </View>
          )}
        </View>
        <View style={styles.participantInfo}>
          <Text style={styles.participantName}>
            {displayName}
            {isCurrentUser && ' (You)'}
            {isHost && !isCurrentUser && ' (Host)'}
          </Text>
          {!isCurrentUser && (
            <Text
              style={[
                styles.participantFollow,
                isFollowing && styles.participantFollowing,
              ]}
            >
              {isMutualFriend
                ? 'Friend • Tap to unfollow'
                : isFollowing
                  ? 'Following • Tap to unfollow'
                  : 'Tap to follow'}
            </Text>
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
          <Text style={styles.participantsTitle}>
            Event Participants ({participants.length})
          </Text>
          <Text style={styles.participantsSubtitle}>
            {userStatus.isHost
              ? 'Connect with your guests'
              : 'Connect with other attendees'}
          </Text>

          <FlatList
            data={participants}
            renderItem={renderParticipant}
            keyExtractor={(item) => item.id}
            style={styles.participantsList}
            showsVerticalScrollIndicator={false}
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

      {/* Future Features Preview */}
      <View style={styles.futureSection}>
        <Text style={styles.futureSectionTitle}>Coming Soon</Text>

        <View style={styles.futureFeature}>
          <Text style={styles.futureFeatureIcon}>⭐</Text>
          <View style={styles.futureFeatureContent}>
            <Text style={styles.futureFeatureTitle}>Rate This Event</Text>
            <Text style={styles.futureFeatureDescription}>
              Share your experience and help others discover great events
            </Text>
          </View>
        </View>

        <View style={styles.futureFeature}>
          <Text style={styles.futureFeatureIcon}>📸</Text>
          <View style={styles.futureFeatureContent}>
            <Text style={styles.futureFeatureTitle}>Share Photos</Text>
            <Text style={styles.futureFeatureDescription}>
              Add photos from the event for everyone to see
            </Text>
          </View>
        </View>

        <View style={styles.futureFeature}>
          <Text style={styles.futureFeatureIcon}>💬</Text>
          <View style={styles.futureFeatureContent}>
            <Text style={styles.futureFeatureTitle}>Event Comments</Text>
            <Text style={styles.futureFeatureDescription}>
              Leave feedback and memories from the event
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },

  // Participants Section
  participantsSection: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  participantsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: 4,
  },
  participantsSubtitle: {
    fontSize: 14,
    color: theme.colors.gray,
    marginBottom: 16,
  },
  participantsList: {
    maxHeight: 300,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.darkGray,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  participantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.vibeBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  participantAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  hostBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.vibeGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
    marginBottom: 2,
  },
  participantFollow: {
    fontSize: 12,
    color: theme.colors.vibeBlue,
  },
  participantFollowing: {
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
