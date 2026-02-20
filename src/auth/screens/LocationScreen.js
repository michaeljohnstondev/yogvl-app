import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { useVibeAlert } from '../../components/ui/base/VibeAlertContext';
import { CloseButton } from '../../components/ui/buttons';
import ScreenHeader from '../../components/ui/layout/ScreenHeader';
import { VibeButton } from '../../components/ui/base';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, setDoc, getDoc } from '../../lib/firebase';
import { auth, db } from '../services/firebase';
import { StudioService } from '../../services/StudioService';
import { GooglePlacesService } from '../../services/GooglePlacesService';
import RequestStudioModal from '../../components/RequestStudioModal';
import { switchUserStudio } from '../../services/userService';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../../theme/themes';
import { useRef } from 'react';
import { useAuth } from '../AuthContext';
import { hasAdminAccess } from '../../services/adminService';

export default function LocationScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedStudio, setSelectedStudio] = useState(null);
  const [selectedTab, setSelectedTab] = useState('browse');
  const [searchText, setSearchText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [hasExistingStudio, setHasExistingStudio] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [nearbyStudios, setNearbyStudios] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [refreshingLocation, setRefreshingLocation] = useState(false);
  const [modalPreFill, setModalPreFill] = useState({ city: '', state: '' });
  const vibeAlert = useVibeAlert();
  const scrollViewRef = useRef(null);

  const user = auth.currentUser;
  const { userData } = useAuth();
  const isAdmin = hasAdminAccess(userData);

  useEffect(() => {
    const initializeLocation = async () => {
      // Safety timeout to prevent infinite loading (silent fallback)
      const safetyTimeout = setTimeout(() => {
        setLoading(false);
      }, 30000); // 30 seconds max

      if (!user) {
        clearTimeout(safetyTimeout);
        setLoading(false);
        return;
      }

      try {
        // Check existing studio
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const defaultStudio = userData?.userdata?.studios?.default;
          if (defaultStudio?.studioId) {
            setHasExistingStudio(true);
          }
        }

        // Ensure default studio exists
        console.log('[LocationScreen] Ensuring default studio exists...');
        try {
          await Promise.race([
            StudioService.ensureDefaultStudio(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('ensureDefaultStudio timeout')), 5000)
            ),
          ]);
          console.log('[LocationScreen] Default studio check complete');
        } catch (studioError) {
          console.warn('[LocationScreen] ensureDefaultStudio failed or timed out:', studioError.message);
          // Continue anyway - not critical for showing the screen
        }

        // Check for pending studio selection from deep link
        try {
          const pendingSelectionData = await AsyncStorage.getItem(
            'pendingStudioSelection'
          );
          if (pendingSelectionData) {
            const { studioId, eventId, source } =
              JSON.parse(pendingSelectionData);
            console.log('[LocationScreen] Found pending studio selection:', {
              studioId,
              eventId,
              source,
            });

            // Find the studio by ID
            const studio = await StudioService.getStudioById(studioId);
            if (studio) {
              console.log(
                '[LocationScreen] Auto-selecting studio from deep link:',
                studio.name
              );
              console.log('[LocationScreen] Studio object from deep link:', {
                id: studio.id,
                name: studio.name,
              });
              setSelectedStudio(studio);

              // Auto-confirm the studio selection
              setTimeout(() => {
                handleConfirmStudio(studio, { eventId, source });
              }, 1000); // Give UI time to update
            } else {
              console.warn('[LocationScreen] Studio not found:', studioId);
              // Clear invalid pending selection
              await AsyncStorage.removeItem('pendingStudioSelection');
            }
          }
        } catch (error) {
          console.error(
            '[LocationScreen] Error checking pending studio selection:',
            error
          );
        }

        // Check existing permission first, then request if needed
        console.log('[LocationScreen] Checking location permission...');
        let status = 'denied';
        try {
          // First check if we already have permission
          const currentPermissions = await Location.getForegroundPermissionsAsync();
          status = currentPermissions.status;
          console.log('[LocationScreen] Current permission status:', status);

          // Only request if we don't have it yet (and only if not denied)
          if (status !== 'granted' && status !== 'denied') {
            console.log('[LocationScreen] Requesting location permission...');
            const result = await Promise.race([
              Location.requestForegroundPermissionsAsync(),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Permission request timeout')), 3000)
              ),
            ]);
            status = result.status;
          }
        } catch (permissionError) {
          console.warn('[LocationScreen] Permission check/request failed:', permissionError.message);
          // Default to denied and show all studios
          status = 'denied';
        }
        console.log('[LocationScreen] Final permission status:', status);
        setLocationPermission(status);

        if (status === 'granted') {
          try {
            console.log('[LocationScreen] Getting user location...');
            // Get user location with timeout
            const location = await Promise.race([
              Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
                timeout: 12000, // Increased initial timeout
                maximumAge: 60000, // Accept location up to 60 seconds old for initial load
              }),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Location timeout')), 15000)
              ),
            ]);
            console.log('[LocationScreen] Location obtained:', location.coords);
            setUserLocation(location.coords);

            // Get nearby studios
            console.log('[LocationScreen] Getting nearby studios...');
            const closest = await StudioService.getClosestStudios(
              location.coords.latitude,
              location.coords.longitude,
              10
            );
            console.log('[LocationScreen] Found', closest.length, 'nearby studios');
            setNearbyStudios(closest);
          } catch (locationError) {
            console.log('[LocationScreen] Location error, using fallback:', locationError.message);
            // Fallback to showing all studios if location fails
            try {
              const allStudios = await StudioService.getAllStudios();
              setNearbyStudios(allStudios.slice(0, 10)); // Show first 10 studios
            } catch (fallbackError) {
              setNearbyStudios([]);
            }
          }
        } else {
          // Fallback to showing all studios by region
          try {
            const allStudios = await StudioService.getAllStudios();
            setNearbyStudios(allStudios.slice(0, 10)); // Show first 10 studios
          } catch (fallbackError) {
            setNearbyStudios([]);
          }
        }
      } catch (error) {
        setNearbyStudios([]);
      }

      setLoading(false);
    };

    initializeLocation();
  }, [user]);

  const handleConfirmStudio = async (
    studioOverride = null,
    pendingData = null
  ) => {
    const studio = studioOverride || selectedStudio;
    if (!studio || !user) {
      vibeAlert.error('Error', 'Please select a studio first.');
      return;
    }

    if (saving) return;
    setSaving(true);
    await saveStudioData(studio, pendingData);
  };

  const handleSearchTextChange = async (text) => {
    setSearchText(text);

    if (text.trim().length >= 2) {
      try {
        const studioSuggestions = await StudioService.getSuggestions(text);
        setSuggestions(studioSuggestions);
        setShowSuggestions(studioSuggestions.length > 0);
      } catch (error) {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionSelect = async (suggestion) => {
    setSearchText(suggestion.displayName);
    setShowSuggestions(false);
    setSuggestions([]);

    const studio = await StudioService.getStudioById(suggestion.studioId);
    if (studio) {
      console.log('[LocationScreen] Studio selected from suggestion:', {
        id: studio.id,
        name: studio.name,
      });
      setSelectedStudio(studio);
      // Switch to browse tab to show the selected studio clearly
      setSelectedTab('browse');
    } else {
      console.warn(
        '[LocationScreen] No studio found for suggestion:',
        suggestion.studioId
      );
    }
  };

  const handleSearchStudio = async () => {
    if (!searchText.trim()) {
      vibeAlert.warning('Missing Info', 'Please enter a city name to search.');
      return;
    }

    setSaving(true);
    try {
      const studioMatch = await StudioService.generateStudioFromText(
        searchText.trim()
      );

      if (studioMatch.studioId === 'unknown_location') {
        // Show option to request new studio
        vibeAlert.custom(
          'No Studio Found',
          `No studio found for "${searchText.trim()}". Would you like to request a new studio for this location?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Request Studio',
              onPress: () => {
                // Parse city/state from search text
                const parts = searchText
                  .trim()
                  .split(',')
                  .map((p) => p.trim());
                const cityName = parts[0] || '';
                const stateName = parts[1] || '';

                // Open request modal with pre-filled data
                setModalPreFill({ city: cityName, state: stateName });
                setShowRequestModal(true);
              },
            },
          ]
        );
        setSaving(false);
        return;
      }

      const studio = await StudioService.getStudioById(studioMatch.studioId);
      if (studio) {
        console.log('[LocationScreen] Studio found from search:', {
          id: studio.id,
          name: studio.name,
        });
        await saveStudioData(studio);
      } else {
        console.warn(
          '[LocationScreen] No studio found for search result:',
          studioMatch.studioId
        );
        vibeAlert.error('Error', 'Studio not found. Please try again.');
        setSaving(false);
      }
    } catch (error) {
      vibeAlert.error('Error', 'Failed to find studio. Please try again.');
      setSaving(false);
    }
  };

  const saveStudioData = async (studio, pendingData = null) => {
    if (!user) {
      vibeAlert.error('Error', 'No user found. Please try logging in again.');
      setSaving(false);
      return;
    }

    // Validate studio object
    if (!studio || !studio.id) {
      vibeAlert.error(
        'Error',
        'Invalid studio data. Please try selecting a studio again.'
      );
      setSaving(false);
      return;
    }

    try {
      // Get current studio ID before updating (for switching)
      let currentStudioId = null;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          currentStudioId =
            userDoc.data()?.userdata?.studios?.default?.studioId;
        }
      } catch (error) {
        console.warn('Failed to get current studio ID:', error);
        // Continue - we'll treat this as a new user
      }

      // Update user document with studio info in new structure
      await setDoc(
        doc(db, 'users', user.uid),
        {
          userdata: {
            studios: {
              default: {
                studioId: studio.id, // Validated above to ensure it exists
                studioName: studio.name,
                studioCity: studio.city,
                studioState: studio.state,
              },
              additional: [], // Array for future multiple studio support
            },
          },
        },
        { merge: true }
      );

      // Switch user to new studio (handles removal from old + addition to new)
      const switchResult = await switchUserStudio(
        user.uid,
        currentStudioId,
        studio.id
      );
      if (!switchResult.success) {
        console.warn('Failed to switch user studios:', switchResult.error);
        // Continue anyway - user document was saved successfully
      }

      console.log(
        `User ${user.uid} successfully switched to studio ${studio.id} from ${currentStudioId || 'none'}`
      );

      // Handle pending event navigation or default to Home
      if (pendingData && pendingData.eventId) {
        console.log(
          '[LocationScreen] Navigating to pending event:',
          pendingData.eventId
        );
        // Clear the pending selection since we're handling it
        await AsyncStorage.removeItem('pendingStudioSelection');

        // Navigate directly to the event
        navigation.navigate('EventDetail', {
          eventId: pendingData.eventId,
          studioId: studio.id,
          source: pendingData.source || 'app-download-qr',
        });

        // Show success message about joining the event
        setTimeout(() => {
          vibeAlert.success(
            'Welcome!',
            `You've been added to ${studio.name}! Now you can join the event.`
          );
        }, 500);
      }
      // Navigation.js will automatically transition to Home screen after location is set
      // No need to manually navigate - the auth state change will trigger it
    } catch (err) {
      console.error('Error joining studio:', err);
      vibeAlert.error('Error', 'Failed to join studio. Please try again.');
      setSaving(false);
    }
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const handleRefreshLocation = async () => {
    if (refreshingLocation) {
      console.log('[LocationScreen] Already refreshing, ignoring request');
      return;
    }

    console.log('[LocationScreen] Starting location refresh...');
    setRefreshingLocation(true);
    setNearbyStudios([]);

    // Safety timeout to prevent stuck refreshing state
    const refreshTimeout = setTimeout(() => {
      console.warn(
        '[LocationScreen] Refresh timeout reached, forcing state reset'
      );
      setRefreshingLocation(false);
    }, 30000); // 30 second timeout

    try {
      console.log('[LocationScreen] Refreshing location and studios...');

      // Re-request location permission with timeout
      let status = 'denied';
      try {
        const currentPermissions = await Location.getForegroundPermissionsAsync();
        status = currentPermissions.status;
        console.log('[LocationScreen] Current permission status:', status);

        // Only request if not already granted or denied
        if (status !== 'granted' && status !== 'denied') {
          const result = await Promise.race([
            Location.requestForegroundPermissionsAsync(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Permission timeout')), 3000)
            ),
          ]);
          status = result.status;
        }
      } catch (permError) {
        console.warn('[LocationScreen] Permission check failed:', permError.message);
        // Use existing status
      }
      console.log('[LocationScreen] Permission status:', status);
      setLocationPermission(status);

      // Check if location services are enabled
      const locationServicesEnabled = await Location.hasServicesEnabledAsync();

      if (status === 'granted') {
        if (!locationServicesEnabled) {
          console.error(
            '[LocationScreen] Location services are disabled at system level'
          );
          vibeAlert.error(
            'Location Disabled',
            'Please enable location services in your device settings'
          );
          return;
        }
        // Try multiple location methods in order of reliability
        let location;

        // Method 1: Try Google Geolocation API first (most reliable)
        try {
          const googleLocation = await GooglePlacesService.getCurrentLocation();
          if (googleLocation) {
            location = { coords: googleLocation };
          }
        } catch (googleError) {
          // Google API failed, continue to GPS
        }

        // Method 2: Try device GPS if Google failed
        if (!location) {
          try {
            const gpsResult = await Promise.race([
              Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
                timeout: 10000,
                maximumAge: 30000,
              }),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('GPS timeout')), 10000)
              ),
            ]);
            location = gpsResult;
          } catch (gpsError) {
            // GPS failed, continue to fallback
          }
        }

        // Method 3: Use previous location as last resort
        if (!location && userLocation) {
          location = { coords: userLocation };
        }

        // If all methods failed, throw error for final fallback
        if (!location) {
          throw new Error('All location methods failed');
        }
        setUserLocation(location.coords);

        // Get fresh nearby studios
        const closest = await StudioService.getClosestStudios(
          location.coords.latitude,
          location.coords.longitude,
          5
        );
        setNearbyStudios(closest);
      } else {
        vibeAlert.error(
          'Permission Denied',
          'Location permission is required to find nearby studios'
        );
      }
    } catch (error) {
      // Try to show all studios as fallback when location fails
      try {
        const allStudios = await StudioService.getAllStudios();
        setNearbyStudios(allStudios.slice(0, 5)); // Show first 5 studios
      } catch (fallbackError) {
        setNearbyStudios([]);
      }
    } finally {
      // Clear the safety timeout since we're completing normally
      clearTimeout(refreshTimeout);
      // Always reset the refreshing state, even if there are errors
      setRefreshingLocation(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.screenContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.alertButton} />
          <Text style={styles.loadingText}>Loading studios...</Text>
        </View>
      </View>
    );
  }

  // Function to scroll to search input
  const scrollToSearchInput = () => {
    if (scrollViewRef.current) {
      // Add small delay to ensure keyboard timing doesn't interfere
      setTimeout(() => {
        scrollViewRef.current.scrollTo({ y: 400, animated: true });
      }, 100);
    }
  };

  return (
    <View style={styles.screenContainer}>
      <ScreenHeader
        title="Choose Your Studio"
        showCloseButton={hasExistingStudio}
        onClose={handleClose}
      />
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
      >
          <Text style={styles.subtitle}>
            Join your local studio to find events and connections
          </Text>

          {/* Tab Selector */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'browse' && styles.activeTab]}
              onPress={() => setSelectedTab('browse')}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === 'browse' && styles.activeTabText,
                ]}
              >
                🏢 Browse Studios
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, selectedTab === 'search' && styles.activeTab]}
              onPress={() => setSelectedTab('search')}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === 'search' && styles.activeTabText,
                ]}
              >
                🔍 Search Location
              </Text>
            </TouchableOpacity>
          </View>

          {/* Browse Studios Tab Content */}
          {selectedTab === 'browse' && (
            <View style={styles.tabContent}>
              {selectedStudio ? (
                <>
                  <Text style={styles.selectedLabel}>Selected Studio:</Text>
                  <View style={styles.selectedStudioCard}>
                    <View style={styles.centerItemHeader}>
                      <View style={styles.centerItemInfo}>
                        <Text style={styles.centerItemName}>
                          {selectedStudio.name}
                        </Text>
                        <Text style={styles.centerItemLocation}>
                          {selectedStudio.city}, {selectedStudio.state}
                        </Text>
                        {typeof selectedStudio.distance === 'number' ? (
                          <Text style={styles.centerItemDistance}>
                            {selectedStudio.distance.toFixed(1)} miles away
                          </Text>
                        ) : null}
                      </View>
                      {isAdmin &&
                      selectedStudio.memberCount &&
                      typeof selectedStudio.memberCount === 'number' ? (
                        <Text style={styles.centerItemMembers}>
                          👥 {selectedStudio.memberCount}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <VibeButton
                    label={saving ? 'Joining...' : 'Join Studio'}
                    onPress={() => handleConfirmStudio()}
                    disabled={saving}
                    style={styles.joinButton}
                  />

                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => setSelectedStudio(null)}
                    disabled={saving}
                  >
                    <Text style={styles.secondaryButtonText}>
                      Choose Different Studio
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Location-based Studios */}
                  {locationPermission === 'granted' ? (
                    <View style={styles.centersSection}>
                      <Text style={styles.sectionTitle}>
                        {userLocation
                          ? '📍 Studios Near Me'
                          : '🏢 Available Studios'}
                      </Text>

                      {nearbyStudios.length > 0 ? (
                        nearbyStudios.map((studio) => (
                          <TouchableOpacity
                            key={studio.id}
                            style={styles.centerItem}
                            onPress={() => setSelectedStudio(studio)}
                          >
                            <View style={styles.centerItemHeader}>
                              <View style={styles.centerItemInfo}>
                                <Text style={styles.centerItemName}>
                                  {studio.name}
                                </Text>
                                <Text style={styles.centerItemLocation}>
                                  {studio.city}, {studio.state}
                                </Text>
                                {typeof studio.distance === 'number' ? (
                                  <Text style={styles.centerItemDistance}>
                                    {studio.distance.toFixed(1)} miles away
                                  </Text>
                                ) : null}
                              </View>
                              {isAdmin &&
                              studio.memberCount &&
                              typeof studio.memberCount === 'number' ? (
                                <Text style={styles.centerItemMembers}>
                                  👥 {studio.memberCount}
                                </Text>
                              ) : null}
                            </View>
                          </TouchableOpacity>
                        ))
                      ) : refreshingLocation ? (
                        <View style={styles.loadingState}>
                          <Text style={styles.loadingText}>
                            🔄 Finding nearby studios...
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.emptyState}>
                          <Text style={styles.emptyStateText}>
                            No studios found nearby
                          </Text>
                          <Text style={styles.emptyStateSubtext}>
                            Try refreshing or search by location
                          </Text>
                        </View>
                      )}

                      <TouchableOpacity
                        style={styles.refreshButtonBelow}
                        onPress={handleRefreshLocation}
                        disabled={refreshingLocation}
                      >
                        <Text style={styles.refreshButtonBelowText}>
                          {refreshingLocation
                            ? '🔄 Refreshing...'
                            : '🔄 Refresh Studios'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.requestStudioButton}
                        onPress={() => {
                          setModalPreFill({ city: '', state: '' });
                          setShowRequestModal(true);
                        }}
                      >
                        <Text style={styles.requestStudioButtonText}>
                          📍 Request New Studio
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : locationPermission === 'denied' ? (
                    <View style={styles.centersSection}>
                      <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>🌍 All Studios</Text>
                        <TouchableOpacity
                          style={styles.refreshButton}
                          onPress={handleRefreshLocation}
                          disabled={refreshingLocation}
                        >
                          <Text style={styles.refreshButtonText}>
                            {refreshingLocation
                              ? '🔄 Refreshing...'
                              : '📍 Try Again'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.sectionSubtitle}>
                        Tap "Try Again" to enable location for personalized
                        results
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.centersSection}>
                      <Text style={styles.sectionTitle}>
                        📍 Getting your location...
                      </Text>
                      <ActivityIndicator
                        size="small"
                        color={theme.colors.vibeBlue}
                        style={{ marginTop: 10 }}
                      />
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* Search Tab Content */}
          {selectedTab === 'search' && (
            <View style={styles.tabContent}>
              {selectedStudio ? (
                <>
                  <Text style={styles.selectedLabel}>Found Studio:</Text>
                  <View style={styles.selectedStudioCard}>
                    <View style={styles.centerItemHeader}>
                      <View style={styles.centerItemInfo}>
                        <Text style={styles.centerItemName}>
                          {selectedStudio.name}
                        </Text>
                        <Text style={styles.centerItemLocation}>
                          {selectedStudio.city}, {selectedStudio.state}
                        </Text>
                        {typeof selectedStudio.distance === 'number' ? (
                          <Text style={styles.centerItemDistance}>
                            {selectedStudio.distance.toFixed(1)} miles away
                          </Text>
                        ) : null}
                      </View>
                      {isAdmin &&
                      selectedStudio.memberCount &&
                      typeof selectedStudio.memberCount === 'number' ? (
                        <Text style={styles.centerItemMembers}>
                          👥 {selectedStudio.memberCount}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <VibeButton
                    label={saving ? 'Joining...' : 'Join Studio'}
                    onPress={() => handleConfirmStudio()}
                    disabled={saving}
                    style={styles.joinButton}
                  />

                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => {
                      setSelectedStudio(null);
                      setSearchText('');
                    }}
                    disabled={saving}
                  >
                    <Text style={styles.secondaryButtonText}>
                      Search Different Location
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.searchCard}>
                  <Text style={styles.searchTitle}>🔍 Search by Location</Text>
                  <Text style={styles.searchText}>
                    Enter your city to find the nearest studio.
                  </Text>

                  <TextInput
                    style={styles.searchInput}
                    value={searchText}
                    onChangeText={handleSearchTextChange}
                    placeholder=""
                    placeholderTextColor={theme.colors.textSecondary}
                    autoCapitalize="words"
                    autoCorrect={false}
                    onFocus={() => {
                      scrollToSearchInput();
                      if (searchText.trim().length >= 2) {
                        setShowSuggestions(true);
                      }
                    }}
                  />

                  {/* Suggestions Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                      <View style={styles.suggestionSeparator} />
                      {suggestions.map((suggestion, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.suggestionItem}
                          onPress={() => handleSuggestionSelect(suggestion)}
                        >
                          <Text style={styles.suggestionText}>
                            {suggestion.displayName}
                          </Text>
                          <Text
                            style={[
                              styles.suggestionStatus,
                              styles.activeStatus,
                            ]}
                          >
                            Active
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <VibeButton
                    label={saving ? 'Searching...' : 'Find My Studio'}
                    onPress={() => handleSearchStudio()}
                    disabled={saving || !searchText.trim()}
                    style={styles.joinButton}
                  />

                  <TouchableOpacity
                    style={styles.requestStudioButtonSearch}
                    onPress={() => {
                      // Pre-fill with search text if available
                      const parts = searchText
                        .trim()
                        .split(',')
                        .map((p) => p.trim());
                      const cityName = parts[0] || '';
                      const stateName = parts[1] || '';
                      setModalPreFill({ city: cityName, state: stateName });
                      setShowRequestModal(true);
                    }}
                  >
                    <Text style={styles.requestStudioButtonSearchText}>
                      📍 Can't find your city? Request a new studio
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>

      <RequestStudioModal
        visible={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        initialCity={modalPreFill.city}
        initialState={modalPreFill.state}
        onRequestSubmitted={(result) => {
          console.log('[LocationScreen] Studio request submitted:', result);
          // Optionally refresh suggestions or show success message
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: 'transparent', // Let App-level VibeAppWrapper handle background
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingLeft: 24,
    paddingRight: 24,
    paddingTop: 20, // Add spacing below header
    paddingBottom: 250, // Increased padding for keyboard space
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 22,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: theme.colors.darkGray,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderColor: theme.colors.vibeBlue,
    borderWidth: 2,
  },
  tabText: {
    color: theme.colors.gray,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },
  activeTabText: {
    color: theme.colors.vibeBlue,
    fontWeight: 'bold',
  },
  tabContent: {
    flex: 1,
  },
  selectedLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 12,
    fontWeight: '500',
    paddingLeft: 4,
  },
  selectedStudioCard: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: theme.colors.vibeBlue,
  },
  joinButton: {
    marginTop: 20,
    marginBottom: 10,
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.textSecondary,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  loadingText: {
    marginTop: 16,
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  subText: {
    marginTop: 8,
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  searchCard: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  searchTitle: {
    fontSize: 18,
    color: theme.colors.white,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: theme.colors.vibeBlue,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  searchText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  searchInput: {
    borderWidth: 3,
    borderColor: theme.colors.vibeBlue,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    color: theme.colors.textPrimary,
    padding: theme.sizes.inputPadding,
    marginBottom: 20,
    borderRadius: theme.sizes.borderRadius,
    fontSize: 16,
    textAlign: 'center',
  },
  centersSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
    marginLeft: 4,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 4,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  refreshButton: {
    backgroundColor: 'rgba(0, 198, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  refreshButtonText: {
    color: theme.colors.vibeBlue,
    fontSize: 12,
    fontWeight: '600',
  },
  refreshButtonBelow: {
    backgroundColor: 'rgba(0, 198, 255, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
    alignItems: 'center',
    marginTop: 16,
  },
  refreshButtonBelowText: {
    color: theme.colors.vibeBlue,
    fontSize: 14,
    fontWeight: '600',
  },
  loadingState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontStyle: 'italic',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  requestStudioButton: {
    backgroundColor: 'rgba(0, 255, 150, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.vibeGreen,
    alignItems: 'center',
    marginTop: 12,
  },
  requestStudioButtonText: {
    color: theme.colors.vibeGreen,
    fontSize: 14,
    fontWeight: '600',
  },
  requestStudioButtonSearch: {
    backgroundColor: 'rgba(0, 198, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 198, 255, 0.3)',
    alignItems: 'center',
    marginTop: 12,
  },
  requestStudioButtonSearchText: {
    color: theme.colors.vibeBlue,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  centerItem: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
  },
  centerItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  centerItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  centerItemName: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: 4,
  },
  centerItemLocation: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  centerItemDistance: {
    fontSize: 12,
    color: theme.colors.vibeGreen,
    fontWeight: '600',
  },
  centerItemMembers: {
    fontSize: 12,
    color: theme.colors.vibeBlue,
    fontWeight: '600',
    textAlign: 'right',
    minWidth: 50,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  regionSection: {
    marginBottom: 16,
  },
  regionTitle: {
    fontSize: 16,
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
    marginBottom: 8,
    marginLeft: 4,
  },
  suggestionsContainer: {
    backgroundColor: theme.colors.headerBackground, // Solid dark purple background
    borderBottomLeftRadius: theme.sizes.borderRadius,
    borderBottomRightRadius: theme.sizes.borderRadius,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderTopWidth: 0,
    borderColor: theme.colors.vibeBlue,
    marginTop: -23, // Pull up to connect with input (marginBottom 20 + borderWidth 3)
    marginBottom: 20,
    maxHeight: 200,
  },
  suggestionSeparator: {
    height: 1,
    backgroundColor: theme.colors.vibeBlue,
    marginHorizontal: 0,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  suggestionText: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    flex: 1,
  },
  suggestionStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
  },
  activeStatus: {
    color: theme.colors.vibeGreen,
  },
});
