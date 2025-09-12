import { useState, useEffect } from 'react';
import { getFollowingList, getFollowersList, getMutualFriendsList } from '../services/followService';
import { useVibeAlert } from '../components/ui/base/VibeAlertContext';

export const useSocialList = (userId, listType) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const vibeAlert = useVibeAlert();

  const loadUsers = async () => {
    if (!userId || !listType) {
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let userData = [];
      
      switch (listType) {
        case 'friends':
          userData = await getMutualFriendsList(userId);
          break;
        case 'following':
          userData = await getFollowingList(userId);
          break;
        case 'followers':
          userData = await getFollowersList(userId);
          break;
        default:
          throw new Error(`Invalid list type: ${listType}`);
      }
      
      setUsers(userData);
    } catch (err) {
      console.error(`Error loading ${listType}:`, err);
      setError(err);
      vibeAlert.error('Error', `Unable to load ${listType}`);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [listType, userId]);

  return {
    users,
    loading,
    error,
    loadUsers,
    setUsers
  };
};