import React from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import VibeInput from '../components/ui/VibeInput';
import ScreenHeader from '../components/ui/ScreenHeader';
import SocialUserItem from '../components/ui/SocialUserItem';
import { useAuth } from '../auth/AuthContext';
import { useSocialList } from '../hooks/useSocialList';
import { useUserSearch } from '../hooks/useUserSearch';
import { useFollowActions } from '../hooks/useFollowActions';
import { getSocialListTitle, getSocialListEmptyMessage, getSocialListPlaceholder } from '../lib/socialUtils';
import { EmptyState } from '../components/ui/EmptyState';
import theme from '../theme/themes';

const SocialListScreen = ({ navigation, route }) => {
  const { userId, type, onStatsChange } = route.params;
  const { currentUserId, userData } = useAuth();
  
  // Use custom hooks
  const { users, loading, loadUsers } = useSocialList(userId, type);
  const { searchQuery, setSearchQuery, filteredUsers, hasSearch } = useUserSearch(users);
  const { actionLoading, handleFollow, handleUnfollow, isActionLoading } = useFollowActions(
    currentUserId, 
    userData, 
    onStatsChange, 
    loadUsers
  );
  
  const title = getSocialListTitle(type);

  const handleUserPress = (user) => {
    navigation.navigate('HostProfile', { 
      hostData: user,
      currentUserId: currentUserId
    });
  };

  const renderUser = ({ item: user }) => (
    <SocialUserItem
      user={user}
      currentUserId={currentUserId}
      onUserPress={handleUserPress}
      onFollow={handleFollow}
      onUnfollow={handleUnfollow}
      isLoading={isActionLoading(user.id)}
    />
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader 
          title={title}
          onClose={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.vibeBlue} />
        </View>
      </View>
    );
  }

  const showEmptyState = users.length === 0;
  const showNoResults = !showEmptyState && filteredUsers.length === 0 && hasSearch;

  return (
    <View style={styles.container}>
      <ScreenHeader 
        title={title}
        count={users.length}
        onClose={() => navigation.goBack()}
      />
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <VibeInput
          placeholder={getSocialListPlaceholder(type)}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </View>
      
      {showEmptyState ? (
        <EmptyState message={getSocialListEmptyMessage(type)} />
      ) : showNoResults ? (
        <EmptyState message={`No results found for "${searchQuery}"`} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
  },
  searchInput: {
    marginBottom: 0,
  },
});

export default SocialListScreen;