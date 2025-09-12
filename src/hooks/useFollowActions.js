import { useState } from 'react';
import { followUser, unfollowUser } from '../services/followService';
import { useVibeAlert } from '../components/ui/VibeAlertContext';

export const useFollowActions = (currentUserId, userData, onStatsChange, onRefresh) => {
  const [actionLoading, setActionLoading] = useState({});
  const vibeAlert = useVibeAlert();

  const handleFollow = async (targetUserId) => {
    if (!currentUserId || !targetUserId) return;

    setActionLoading(prev => ({ ...prev, [targetUserId]: true }));
    
    try {
      await followUser(currentUserId, targetUserId, userData);
      
      // Refresh data if callback provided
      if (onRefresh) {
        await onRefresh();
      }
      
      // Notify parent to refresh stats
      if (onStatsChange) {
        onStatsChange();
      }
      
      vibeAlert.success('Success', 'Now following user');
    } catch (error) {
      console.error('Follow error:', error);
      vibeAlert.error('Error', 'Unable to follow user');
    } finally {
      setActionLoading(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleUnfollow = async (targetUserId) => {
    if (!currentUserId || !targetUserId) return;

    setActionLoading(prev => ({ ...prev, [targetUserId]: true }));
    
    try {
      await unfollowUser(currentUserId, targetUserId);
      
      // Refresh data if callback provided
      if (onRefresh) {
        await onRefresh();
      }
      
      // Notify parent to refresh stats
      if (onStatsChange) {
        onStatsChange();
      }
      
      vibeAlert.success('Success', 'Unfollowed user');
    } catch (error) {
      console.error('Unfollow error:', error);
      vibeAlert.error('Error', 'Unable to unfollow user');
    } finally {
      setActionLoading(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  const isActionLoading = (userId) => {
    return !!actionLoading[userId];
  };

  return {
    actionLoading,
    handleFollow,
    handleUnfollow,
    isActionLoading
  };
};