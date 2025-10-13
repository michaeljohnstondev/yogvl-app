import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProfileAvatar from './profile/ProfileAvatar';
import { useAuth } from '../../auth/AuthContext';
import { searchAll } from '../../services/searchService';
import theme from '../../theme/themes';

const RECENT_SEARCHES_KEY = '@recent_searches';
const MAX_RECENT_SEARCHES = 5;

export function VibeSearch({ visible, onClose, navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ events: [], users: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [activeTab, setActiveTab] = useState('people'); // 'people' or 'events'
  const { userData } = useAuth();

  // Load recent searches on mount
  useEffect(() => {
    loadRecentSearches();
  }, [visible]);

  // Debounced search
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        handleSearch();
      } else {
        setSearchResults({ events: [], users: [] });
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (error) {
      console.error('[VibeSearch] Error loading recent searches:', error);
    }
  };

  const saveRecentSearch = async (query) => {
    try {
      const trimmed = query.trim();
      if (!trimmed) return;

      // Remove duplicates and add to front
      const updated = [trimmed, ...recentSearches.filter(q => q !== trimmed)]
        .slice(0, MAX_RECENT_SEARCHES);

      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      setRecentSearches(updated);
    } catch (error) {
      console.error('[VibeSearch] Error saving recent search:', error);
    }
  };

  const removeRecentSearch = async (query) => {
    try {
      const updated = recentSearches.filter(q => q !== query);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      setRecentSearches(updated);
    } catch (error) {
      console.error('[VibeSearch] Error removing recent search:', error);
    }
  };

  const handleSearch = useCallback(async () => {
    const defaultStudio = userData?.userdata?.studios?.default;
    if (!defaultStudio?.studioId) return;

    setIsSearching(true);
    try {
      const results = await searchAll(searchQuery, defaultStudio.studioId);
      setSearchResults(results);
      saveRecentSearch(searchQuery);
    } catch (error) {
      console.error('[VibeSearch] Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, userData, recentSearches]);

  const handleEventPress = (eventId) => {
    navigation.navigate('EventDetail', { eventId });
    handleClose();
  };

  const handleUserPress = (userId) => {
    console.log('[VibeSearch] Navigating to UserProfile with userId:', userId);
    if (!userId) {
      console.error('[VibeSearch] userId is undefined!');
      return;
    }
    navigation.navigate('UserProfile', { userId: userId });
    handleClose();
  };

  const handleRecentSearchPress = (query) => {
    setSearchQuery(query);
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults({ events: [], users: [] });
    onClose();
  };

  const hasResults = searchResults.users.length > 0 || searchResults.events.length > 0;
  const showEmptyState = searchQuery.trim().length >= 2 && !isSearching && !hasResults;
  const showRecentSearches = searchQuery.trim().length === 0 && !isSearching;

  // Determine which results to show based on active tab
  const displayResults = activeTab === 'people' ? searchResults.users : searchResults.events;

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={handleClose} />

      {/* Dropdown overlay */}
      <View style={styles.searchOverlay}>
        {/* Search input */}
        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
          />
          <Pressable onPress={handleClose} style={styles.closeButton} hitSlop={8}>
            <Text style={styles.closeIcon}>✕</Text>
          </Pressable>
        </View>

        {/* Tabs - only show when there are results */}
        {hasResults && (
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'people' && styles.activeTab]}
              onPress={() => setActiveTab('people')}
            >
              <Text style={[styles.tabText, activeTab === 'people' && styles.activeTabText]}>
                People ({searchResults.users.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'events' && styles.activeTab]}
              onPress={() => setActiveTab('events')}
            >
              <Text style={[styles.tabText, activeTab === 'events' && styles.activeTabText]}>
                Events ({searchResults.events.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Search Results */}
        <ScrollView
          style={styles.resultsContainer}
          contentContainerStyle={styles.resultsContent}
          keyboardShouldPersistTaps="handled"
        >
          {isSearching && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.vibeBlue} />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          )}

          {showRecentSearches && (
            <View style={styles.recentContainer}>
              <Text style={styles.recentHeader}>
                {recentSearches.length > 0 ? 'Recent Searches' : 'No Recent Searches'}
              </Text>
              {recentSearches.map((query, index) => (
                <View key={index} style={styles.recentItem}>
                  <TouchableOpacity
                    style={styles.recentItemContent}
                    onPress={() => handleRecentSearchPress(query)}
                  >
                    <Text style={styles.recentIcon}>🔍</Text>
                    <Text style={styles.recentText}>{query}</Text>
                  </TouchableOpacity>
                  <Pressable
                    onPress={() => removeRecentSearch(query)}
                    style={styles.removeButton}
                    hitSlop={8}
                  >
                    <Text style={styles.removeIcon}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {showEmptyState && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>No results found</Text>
              <Text style={styles.emptySubtext}>Try a different search term</Text>
            </View>
          )}

          {/* Tab-based Results */}
          {!isSearching && hasResults && (
            <View style={styles.resultsList}>
              {activeTab === 'people' && searchResults.users.map((user) => (
                <TouchableOpacity
                  key={`user-${user.id}`}
                  style={styles.resultItem}
                  onPress={() => handleUserPress(user.id)}
                  activeOpacity={0.7}
                >
                  <ProfileAvatar
                    userData={{
                      userdata: {
                        contactInfo: {
                          displayName: user.displayName,
                          profilePicture: user.profilePicture,
                        },
                      },
                    }}
                    size={40}
                    showBorder={false}
                  />
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultTitle}>{user.displayName}</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              ))}
              {activeTab === 'events' && searchResults.events.map((event) => {
                const eventDate = event.eventTimestamp?.toDate() || new Date(event.utcDateTime);
                const dateStr = eventDate.toLocaleDateString();
                const location = event.location?.address || event.location?.name || 'Location TBD';

                return (
                  <TouchableOpacity
                    key={`event-${event.id}`}
                    style={styles.resultItem}
                    onPress={() => handleEventPress(event.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultTitle}>{event.title}</Text>
                      <Text style={styles.resultSubtext}>{dateStr} • {location}</Text>
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 998,
  },
  searchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#333',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 999,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.white,
    fontSize: 16,
    fontFamily: theme.fonts.comicRegular,
  },
  closeButton: {
    marginLeft: 12,
  },
  closeIcon: {
    fontSize: 24,
    color: theme.colors.vibeBlue,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: theme.colors.cardBackground,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: theme.colors.vibeBlue,
  },
  tabText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontFamily: theme.fonts.comicBold,
  },
  activeTabText: {
    color: theme.colors.vibeBlue,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    marginTop: 12,
    fontFamily: theme.fonts.comicRegular,
  },
  recentContainer: {
    paddingVertical: 8,
  },
  recentHeader: {
    color: theme.colors.vibeCyan,
    fontSize: 16,
    fontFamily: theme.fonts.comicBold,
    marginBottom: 12,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  recentItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recentIcon: {
    fontSize: 16,
    marginRight: 12,
    opacity: 0.5,
  },
  recentText: {
    color: theme.colors.white,
    fontSize: 14,
    fontFamily: theme.fonts.comicRegular,
    flex: 1,
  },
  removeButton: {
    padding: 4,
    marginLeft: 8,
  },
  removeIcon: {
    fontSize: 18,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    color: theme.colors.white,
    fontSize: 20,
    fontFamily: theme.fonts.comicBold,
    marginBottom: 8,
  },
  emptySubtext: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontFamily: theme.fonts.comicRegular,
    textAlign: 'center',
  },
  resultsList: {

  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  resultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resultTitle: {
    color: theme.colors.white,
    fontSize: 16,
    fontFamily: theme.fonts.comicBold,
    marginBottom: 2,
  },
  resultSubtext: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: theme.fonts.comicRegular,
  },
  chevron: {
    color: theme.colors.vibeBlue,
    fontSize: 24,
    marginLeft: 8,
  },
});
