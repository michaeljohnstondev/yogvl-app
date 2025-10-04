import { useState } from 'react';
import { followUser, unfollowUser } from '../services/followService';
import { useVibeAlert } from '../components/ui/base/VibeAlertContext';

export const useFollowActions = (
  currentUserId,
  userData,
  onStatsChange,
  onRefresh,
  getTargetUserData = null // Optional function to get target user data
) => {
  const [actionLoading, setActionLoading] = useState({});
  const vibeAlert = useVibeAlert();

  const handleFollow = async (targetUserId) => {
    if (!currentUserId || !targetUserId) return;

    setActionLoading((prev) => ({ ...prev, [targetUserId]: true }));

    try {
      // Get target user data if available
      const targetUserData = getTargetUserData ? getTargetUserData(targetUserId) : null;
      const result = await followUser(currentUserId, targetUserId, userData, targetUserData);

      // Check if operation succeeded
      const succeeded = !result || result.success !== false;

      if (succeeded) {
        // Refresh data if callback provided
        if (onRefresh) {
          await onRefresh();
        }

        // Notify parent to refresh stats
        if (onStatsChange) {
          onStatsChange();
        }
      }

      // Return success status so screen can rollback if needed
      return succeeded;

      // Success feedback provided by loading state changing to "Unfollow" button
    } catch (error) {
      console.error('Follow error:', error);
      vibeAlert.error('Error', 'Unable to follow user');
      return false; // Return false so screen can rollback
    } finally {
      setActionLoading((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleUnfollow = async (targetUserId) => {
    if (!currentUserId || !targetUserId) return;

    setActionLoading((prev) => ({ ...prev, [targetUserId]: true }));

    try {
      const result = await unfollowUser(currentUserId, targetUserId);

      // Check if operation succeeded
      const succeeded = !result || result.success !== false;

      if (succeeded) {
        // Refresh data if callback provided
        if (onRefresh) {
          await onRefresh();
        }

        // Notify parent to refresh stats
        if (onStatsChange) {
          onStatsChange();
        }
      }

      // Return success status so screen can rollback if needed
      return succeeded;

      // Success feedback provided by loading state changing to "Follow" button
    } catch (error) {
      console.error('Unfollow error:', error);
      vibeAlert.error('Error', 'Unable to unfollow user');
      return false; // Return false so screen can rollback
    } finally {
      setActionLoading((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  const isActionLoading = (userId) => {
    return !!actionLoading[userId];
  };

  return {
    actionLoading,
    handleFollow,
    handleUnfollow,
    isActionLoading,
  };
};
