import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import VibeInput from '../components/ui/VibeInput';
import ProfileAvatar from '../components/ui/ProfileAvatar';
import VibeButton from '../components/ui/VibeButton';
import CloseButton from '../components/ui/CloseButton';
import { getFollowingList, getFollowersList, getMutualFriendsList, followUser, unfollowUser } from '../services/followService';
import { useAuth } from '../auth/AuthContext';
import { useVibeAlert } from '../components/ui/VibeAlertContext';
import theme from '../theme/themes';

const SocialListScreen = ({ navigation, route }) => {
  const { userId, type, onStatsChange } = route.params;
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
    
    // Navigate to HostProfile - it will handle back navigation naturally
    navigation.navigate('HostProfile', { 
      hostData: user,
      currentUserId: currentUserId
    });
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
        {/* Header */}
        <View style={styles.header}>
          <CloseButton onPress={() => navigation.goBack()} style={styles.closeButton} />
          <Text style={styles.title}>
            {getTitle()}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.vibeBlue} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <CloseButton onPress={() => navigation.goBack()} style={styles.closeButton} />
        <Text style={styles.title}>
          {getTitle()} ({users.length})
        </Text>
        <View style={styles.headerSpacer} />
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
    flex: 1,
    backgroundColor: theme.colors.vibeBackgroundBlue,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.vibeBlue,
  },
  closeButton: {
    zIndex: 10,
  },
  title: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerSpacer: {
    width: 40, // Same width as close button for balance
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    flex: 1,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
  searchContainer: {
    padding: 16,
  },
  searchInput: {
    marginBottom: 0,
  },
});

export default SocialListScreen;