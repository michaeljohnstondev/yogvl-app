import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Keyboard,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../auth/AuthContext';
import { VibeButton, VibeAutoComplete, CloseButton, VibeView } from '../components/ui';
import { useStatusBar } from '../components/ui/base/VibeAppWrapper';
import theme from '../theme/themes';
import {
  getUserInterests,
  addUserInterest,
  removeUserInterest,
  getStudioInterests,
} from '../services/interestService';

export default function InterestsScreen() {
  const navigation = useNavigation();
  const { currentUserId, userData } = useAuth();

  const [userInterests, setUserInterests] = useState([]);
  const [popularInterests, setPopularInterests] = useState([]);
  const [newInterest, setNewInterest] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const textInputRef = useRef(null);
  const scrollViewRef = useRef(null);
  const addInterestSectionRef = useRef(null);
  const blurTimeoutRef = useRef(null);

  useEffect(() => {
    loadInterests();
  }, [currentUserId]);

  // Generate autocomplete suggestions
  const generateSuggestions = (input) => {
    if (!input || input.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const searchTerm = input.toLowerCase().trim();

    // Combine popular interests with common interests
    const commonInterests = [
      'Basketball',
      'Football',
      'Fantasy Football',
      'Soccer',
      'Tennis',
      'Pickleball',
      'Baseball',
      'Volleyball',
      'Golf',
      'Swimming',
      'Running',
      'Yoga',
      'Fitness',
      'Music',
      'Live Music',
      'Dance',
      'Art',
      'Painting',
      'Photography',
      'Cooking',
      'Gaming',
      'Video Games',
      'Board Games',
      'Chess',
      'Poker',
      'Trivia',
      'Karaoke',
      'Comedy',
      'Stand-up Comedy',
      'Hiking',
      'Biking',
      'Mountain Biking',
      'Climbing',
      'Rock Climbing',
      'Skating',
      'Surfing',
      'Reading',
      'Writing',
      'Creative Writing',
      'Movies',
      'Theater',
      'Gardening',
      'Technology',
      'Science',
      'Craft Beer',
      'Wine Tasting',
      'Coffee',
      'Meditation',
      'Camping',
      'Fishing',
    ];

    // Filter based on input and exclude already added interests
    const allInterests = [
      ...popularInterests.map((item) => item.interest),
      ...commonInterests,
    ];

    console.log('[InterestsScreen] 🔍 Searching for:', searchTerm);
    console.log('[InterestsScreen] 📋 All interests:', allInterests);

    const filtered = allInterests
      .filter(
        (interest) =>
          interest.toLowerCase().includes(searchTerm) &&
          !userInterests.some(
            (userInt) => userInt.toLowerCase() === interest.toLowerCase()
          )
      )
      .slice(0, 5); // Show max 5 suggestions

    console.log('[InterestsScreen] ✅ Filtered suggestions:', filtered);

    setSuggestions([...new Set(filtered)]); // Remove duplicates
    setShowSuggestions(filtered.length > 0);
  };

  const handleInputChange = (text) => {
    setNewInterest(text);
    generateSuggestions(text);
  };

  const handleSuggestionSelect = (suggestion) => {
    console.log('[InterestsScreen] 🎯 Suggestion selected:', suggestion);
    console.log('[InterestsScreen] 🎯 Current newInterest value:', newInterest);

    // VibeAutoComplete now sends clean text without emoji
    const cleanSuggestion = typeof suggestion === 'string' ? suggestion.trim() : suggestion;

    console.log('[InterestsScreen] ✅ Clean suggestion:', cleanSuggestion);
    setNewInterest(cleanSuggestion);
    console.log('[InterestsScreen] 📝 Set input to:', cleanSuggestion);

    // Dismiss keyboard after selection
    Keyboard.dismiss();
  };

  const scrollToAddSection = () => {
    if (scrollViewRef.current) {
      // Simply scroll to bottom where Add Interest section is
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  };

  const loadInterests = async () => {
    const studioId = userData?.userdata?.studios?.default?.studioId;
    if (!currentUserId || !studioId) {
      console.log('[InterestsScreen] Missing currentUserId or studioId:', {
        currentUserId,
        studioId,
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Load user's current interests
      const interests = await getUserInterests(currentUserId);
      console.log('[InterestsScreen] Loaded user interests:', interests);
      setUserInterests(interests);

      // Load popular interests in the studio for suggestions
      const studioInterests = await getStudioInterests(studioId);
      console.log(
        '[InterestsScreen] Loaded studio interests:',
        studioInterests
      );

      // Filter out interests the user already has
      const availablePopular = studioInterests
        .filter(
          (item) =>
            !interests.some(
              (userInt) => userInt.toLowerCase() === item.interest.toLowerCase()
            )
        )
        .slice(0, 20); // Show top 20

      setPopularInterests(availablePopular);
    } catch (error) {
      console.error('[InterestsScreen] Error loading interests:', error);
      Alert.alert('Error', 'Failed to load interests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddInterest = async (interest) => {
    if (!interest || !currentUserId || adding) return; // Prevent double taps

    const trimmedInterest = interest.trim();
    if (!trimmedInterest) return;

    // Validate interest length (same as event title)
    if (trimmedInterest.length > 100) {
      return;
    }

    // Validate minimum length
    if (trimmedInterest.length < 2) {
      return;
    }

    // Check for duplicates (case insensitive)
    if (
      userInterests.some(
        (existing) => existing.toLowerCase() === trimmedInterest.toLowerCase()
      )
    ) {
      return;
    }

    setAdding(true);

    // Optimistically update UI immediately
    setUserInterests((prev) => [...prev, trimmedInterest]);

    // Remove from popular suggestions if it exists there
    setPopularInterests((prev) =>
      prev.filter(
        (item) =>
          item.interest.toLowerCase() !== trimmedInterest.toLowerCase()
      )
    );

    // Clear input and refocus for next entry
    if (interest === newInterest) {
      setNewInterest('');
      setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
    }

    try {
      const success = await addUserInterest(currentUserId, trimmedInterest);

      if (!success) {
        // Revert optimistic update on failure
        setUserInterests((prev) =>
          prev.filter((item) => item !== trimmedInterest)
        );
        await loadInterests(); // Reload to ensure consistency
      }
    } catch (error) {
      console.error('[InterestsScreen] Error adding interest:', error);
      // Revert optimistic update on error
      setUserInterests((prev) =>
        prev.filter((item) => item !== trimmedInterest)
      );
      await loadInterests(); // Reload to ensure consistency
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveInterest = async (interest) => {
    if (!currentUserId || adding) return; // Prevent double taps

    const studioId = userData?.userdata?.studios?.default?.studioId;
    setAdding(true);

    // Optimistically update UI immediately
    setUserInterests((prev) => prev.filter((item) => item !== interest));

    try {
      const success = await removeUserInterest(currentUserId, interest);

      if (!success) {
        // Revert optimistic update on failure
        setUserInterests((prev) => [...prev, interest]);
      } else if (studioId) {
        // Reload popular interests without triggering loading state
        const studioInterests = await getStudioInterests(studioId);
        const updatedUserInterests = userInterests.filter((item) => item !== interest);

        const availablePopular = studioInterests
          .filter(
            (item) =>
              !updatedUserInterests.some(
                (userInt) => userInt.toLowerCase() === item.interest.toLowerCase()
              )
          )
          .slice(0, 20);

        setPopularInterests(availablePopular);
      }
    } catch (error) {
      console.error('[InterestsScreen] Error removing interest:', error);
      // Revert optimistic update on error
      setUserInterests((prev) => [...prev, interest]);
    } finally {
      setAdding(false);
    }
  };

  const renderInterestChip = (
    interest,
    onPress,
    style = 'user',
    count = null
  ) => (
    <TouchableOpacity
      key={interest}
      style={[
        styles.interestChip,
        style === 'user' ? styles.userInterestChip : styles.popularInterestChip,
      ]}
      onPress={onPress}
      disabled={adding}
    >
      <Text
        style={[
          styles.interestText,
          style === 'user'
            ? styles.userInterestText
            : styles.popularInterestText,
        ]}
      >
        {interest}
      </Text>
      {count && count > 1 && <Text style={styles.countText}>{count}</Text>}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <VibeView>
        <View style={styles.header}>
          <CloseButton onPress={() => navigation.goBack()} />
          <Text style={styles.headerTitle}>My Interests</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your interests...</Text>
        </View>
      </VibeView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <CloseButton onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>My Interests</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
          {/* User's Current Interests */}
          <View style={[styles.section, styles.yourInterestsSection]}>
            <Text style={styles.sectionTitle}>
              My Interests ({userInterests.length})
            </Text>
            <Text style={styles.sectionSubtitle}>
              These help us connect you with events you'll love
            </Text>

            {userInterests.length > 0 ? (
              <View style={styles.chipContainer}>
                {userInterests.map((interest) =>
                  renderInterestChip(
                    interest,
                    () => handleRemoveInterest(interest),
                    'user'
                  )
                )}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  No interests added yet. Add some below to get personalized
                  event suggestions!
                </Text>
              </View>
            )}
          </View>

          {/* Popular Interests */}
          {popularInterests.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Popular in Your Studio</Text>
              <Text style={styles.sectionSubtitle}>
                Tap to add interests that others in your studio enjoy
              </Text>

              <View style={styles.chipContainer}>
                {popularInterests.map(({ interest, count }) =>
                  renderInterestChip(
                    interest,
                    () => handleAddInterest(interest),
                    'popular',
                    count
                  )
                )}
              </View>
            </View>
          )}

          {/* Add Custom Interest */}
          <View ref={addInterestSectionRef} style={styles.section}>
            <Text style={styles.sectionTitle}>Add Interests</Text>
            <View style={styles.inputContainer}>
              <TextInput
                ref={textInputRef}
                style={styles.textInput}
                placeholder="Type an interest"
                placeholderTextColor={theme.colors.gray}
                value={newInterest}
                onChangeText={handleInputChange}
                onFocus={() => {
                  generateSuggestions(newInterest || '');
                  setTimeout(scrollToAddSection, 100);
                }}
                onSubmitEditing={() => {
                  if (newInterest.trim()) {
                    handleAddInterest(newInterest);
                  }
                }}
                returnKeyType="done"
                autoCapitalize="words"
                autoCorrect={false}
                blurOnSubmit={false}
                enablesReturnKeyAutomatically={true}
                maxLength={100}
              />

              <VibeAutoComplete
                suggestions={suggestions}
                onSelect={handleSuggestionSelect}
                visible={showSuggestions}
                inputValue={newInterest}
                onHide={() => setShowSuggestions(false)}
              />
            </View>
            {newInterest.length > 80 && (
              <Text style={styles.characterCount}>
                {newInterest.length}/100
              </Text>
            )}
            <VibeButton
              label="Add Interest"
              onPress={() => {
                Keyboard.dismiss();
                handleAddInterest(newInterest);
              }}
              disabled={!newInterest.trim() || adding}
              style={styles.addButtonVertical}
            />
          </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = {
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: theme.colors.headerBackground,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.vibeBlue,
  },
  headerTitle: {
    color: theme.colors.white,
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: theme.fonts.main,
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  headerRight: {
    width: 50,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    color: theme.colors.white,
    fontSize: 16,
    fontFamily: theme.fonts.main,
  },
  section: {
    marginBottom: 30,
  },
  yourInterestsSection: {
    marginTop: 20,
  },
  sectionTitle: {
    color: theme.colors.white,
    fontSize: 18,
    fontFamily: theme.fonts.comicBold,
    marginBottom: 6,
  },
  sectionSubtitle: {
    color: theme.colors.gray,
    fontSize: 14,
    fontFamily: theme.fonts.main,
    marginBottom: 16,
    lineHeight: 20,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userInterestChip: {
    backgroundColor: theme.colors.vibeBackgroundGreen,
    borderColor: theme.colors.vibeGreen,
  },
  popularInterestChip: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderColor: theme.colors.vibeBlue,
  },
  interestText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },
  userInterestText: {
    color: theme.colors.vibeGreen,
  },
  popularInterestText: {
    color: theme.colors.vibeBlue,
  },
  countText: {
    fontSize: 11,
    color: theme.colors.gray,
    fontFamily: theme.fonts.main,
  },
  emptyState: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.darkGray,
  },
  emptyText: {
    color: theme.colors.gray,
    fontSize: 14,
    fontFamily: theme.fonts.main,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  textInput: {
    backgroundColor: theme.colors.inputBackground,
    borderWidth: 3,
    borderColor: theme.colors.vibeBlue,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: theme.colors.white,
    fontSize: 16,
    fontFamily: theme.fonts.main,
  },
  addButtonVertical: {
    marginVertical: 0,
  },
  characterCount: {
    color: theme.colors.gray,
    fontSize: 12,
    textAlign: 'right',
    marginTop: -12,
    marginBottom: 16,
    fontFamily: theme.fonts.main,
  },
  bottomPadding: {
    height: 120,
  },
};
