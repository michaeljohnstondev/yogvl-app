import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import VibeInput from './VibeInput';
import ProfileAvatar from './ProfileAvatar';
import VibeButton from './VibeButton';
import { getFollowingList, getFollowersList, getMutualFriendsList, followUser, unfollowUser } from '../../services/followService';
import { useAuth } from '../../auth/AuthContext';
import { useVibeAlert } from './VibeAlertContext';
import theme from '../../theme/themes';

const SocialListView = ({ userId, type, navigation, onClose, onStatsChange, showBackButton = false }) => {
  const { currentUserId, userData } = useAuth();
  const vibeAlert = useVibeAlert();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  const getTitle = () => {
    switch (type) {
      case 'friends': return 'Mutual Friends';
      case 'following': return 'Following';
      case 'followers': return 'Followers';
      default: return 'Social';
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      let userData = [];
      
      switch (type) {
        case 'friends':
          userData = await getMutualFriendsList(userId);
          break;
        case 'following':
          userData = await getFollowingList(userId);
          break;
        case 'followers':
          userData = await getFollowersList(userId);
          break;
      }
      
      setUsers(userData);
      setFilteredUsers(userData);
    } catch (error) {
      console.error(`Error loading ${type}:`, error);
      vibeAlert.error('Error', `Unable to load ${type}`);
      setUsers([]);
      setFilteredUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [type, userId]);

  // Filter users based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => {
        const name = `${user.userdata?.contactInfo?.firstName || ''} ${user.userdata?.contactInfo?.lastName || ''}`.trim().toLowerCase();
        const email = (user.userdata?.contactInfo?.email || user.email || '').toLowerCase();
        const query = searchQuery.toLowerCase();
        
        return name.includes(query) || email.includes(query);
      });
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  const handleFollow = async (targetUserId) => {
    setActionLoading(prev => ({ ...prev, [targetUserId]: true }));
    
    try {
      await followUser(currentUserId, targetUserId, userData);
      // Refresh the list
      await loadUsers();
      // Notify parent to refresh stats
      if (onStatsChange) {
        onStatsChange();
      }
      vibeAlert.success('Success', 'Now following user');
    } catch (error) {
      vibeAlert.error('Error', 'Unable to follow user');
    } finally {
      setActionLoading(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleUnfollow = async (targetUserId) => {
    setActionLoading(prev => ({ ...prev, [targetUserId]: true }));
    
    try {
      await unfollowUser(currentUserId, targetUserId);
      // Refresh the list
      await loadUsers();
      // Notify parent to refresh stats
      if (onStatsChange) {
        onStatsChange();
      }
      vibeAlert.success('Success', 'Unfollowed user');
    } catch (error) {
      vibeAlert.error('Error', 'Unable to unfollow user');
    } finally {
      setActionLoading(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleUserPress = (user) => {
    if (user.id === currentUserId) {
      // Don't navigate to own profile
      return;
    }
    
    // Navigate to HostProfile with context about where we came from
    const navParams = { 
      hostData: user,
      currentUserId: currentUserId,
      returnTo: 'UserProfile',
      returnParams: { activeTab: type } // Pass the current social tab
    };
    console.log('SocialListView navigating to HostProfile with params:', navParams);
    navigation.navigate('HostProfile', navParams);
  };

  const renderUser = ({ item: user }) => {
    const isCurrentUser = user.id === currentUserId;
    const name = user.displayName || 
                 `${user.userdata?.contactInfo?.firstName || ''} ${user.userdata?.contactInfo?.lastName || ''}`.trim() ||
                 user.email?.split('@')[0] || 
                 'User';

    return (
      <View style={styles.userItem}>
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={() => handleUserPress(user)}
          disabled={isCurrentUser}
        >
          <ProfileAvatar userData={user} size={50} />
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{name}</Text>
            {user.userdata?.studios?.default?.studioName && (
              <Text style={styles.userLocation}>
                {user.userdata.studios.default.studioName}
              </Text>
            )}
          </View>
        </TouchableOpacity>
        
        {!isCurrentUser && (
          <View style={styles.actionButton}>
            {actionLoading[user.id] ? (
              <ActivityIndicator size="small" color={theme.colors.vibeBlue} />
            ) : user.isFollowing ? (
              <TouchableOpacity 
                style={styles.unfollowButton}
                onPress={() => handleUnfollow(user.id)}
              >
                <Text style={styles.unfollowButtonText}>Unfollow</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={styles.followButton}
                onPress={() => handleFollow(user.id)}
              >
                <Text style={styles.followButtonText}>Follow</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{getTitle()}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.vibeBlue} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {showBackButton && (
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        )}
        <Text style={[styles.title, showBackButton && styles.titleWithBack]}>
          {getTitle()} ({users.length})
        </Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <VibeInput
          placeholder={`Search ${getTitle().toLowerCase()}...`}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </View>
      
      {users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {type === 'friends' && 'No mutual friends yet'}
            {type === 'following' && 'Not following anyone yet'}  
            {type === 'followers' && 'No followers yet'}
          </Text>
        </View>
      ) : filteredUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No results found for "{searchQuery}"
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUser}
          keyExtractor={item => item.id}
          style={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.vibeBlue,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  titleWithBack: {
    flex: 1,
    textAlign: 'center',
    marginRight: 32, // Compensate for back button width
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  list: {
    maxHeight: 300,
  },
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
  followButton: {
    backgroundColor: theme.colors.vibeBlue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  followButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  unfollowButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  unfollowButtonText: {
    color: theme.colors.vibeBlue,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
  searchContainer: {
    padding: 16,
    paddingTop: 0,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.vibeBlue,
  },
  searchInput: {
    marginBottom: 0,
  },
});

export default SocialListView;