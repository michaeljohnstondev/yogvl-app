import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import VibeInput from '../base/VibeInput';
import FriendItem from './FriendItem';
import theme from '../../../theme/themes';

export default function FriendsList({
  friends = [],
  selectedIds = [],
  onSelect,
  maxSelections = 5,
  searchPlaceholder = 'Search friends...',
  emptyMessage = 'No friends found',
  forceShowSearch = false,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter friends based on search query
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;

    const query = searchQuery.toLowerCase();
    return friends.filter(
      (friend) =>
        friend.name?.toLowerCase().includes(query) ||
        friend.email?.toLowerCase().includes(query) ||
        friend.phone?.includes(query)
    );
  }, [friends, searchQuery]);

  const handleSelect = (friendId) => {
    const isCurrentlySelected = selectedIds.includes(friendId);

    // If trying to select and already at max, don't allow
    if (!isCurrentlySelected && selectedIds.length >= maxSelections) {
      return;
    }

    onSelect(friendId);
  };

  const isMaxReached = selectedIds.length >= maxSelections;

  return (
    <View style={styles.container}>
      {/* Search Input */}
      {(friends.length > 3 || forceShowSearch) && (
        <View style={styles.searchContainer}>
          <VibeInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={searchPlaceholder}
            style={styles.searchInput}
          />
        </View>
      )}

      {/* Selection Counter */}
      {maxSelections > 1 && (
        <Text style={styles.counter}>
          {selectedIds.length} of {maxSelections} selected
          {isMaxReached && (
            <Text style={styles.maxReachedText}> (maximum reached)</Text>
          )}
        </Text>
      )}

      {/* Friends List */}
      <View style={styles.friendsList}>
        {filteredFriends.length === 0 ? (
          <Text style={styles.emptyMessage}>
            {searchQuery ? `No friends match "${searchQuery}"` : emptyMessage}
          </Text>
        ) : (
          filteredFriends.map((friend) => (
            <FriendItem
              key={friend.id}
              friend={friend}
              isSelected={selectedIds.includes(friend.id)}
              onSelect={handleSelect}
              disabled={isMaxReached && !selectedIds.includes(friend.id)}
            />
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchInput: {
    marginBottom: 0,
  },
  counter: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.main,
    marginBottom: 12,
    textAlign: 'center',
  },
  maxReachedText: {
    color: theme.colors.vibePink || '#FF0064',
    fontWeight: '600',
  },
  friendsList: {
    flex: 1,
  },
  emptyMessage: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontFamily: theme.fonts.main,
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  },
});
