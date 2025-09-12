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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useVibeAlert } from '../../components/ui/base/VibeAlertContext';
import { CloseButton } from '../../components/ui/buttons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { StudioService } from '../../services/StudioService';
import { GooglePlacesService } from '../../services/GooglePlacesService';
import RequestStudioModal from '../../components/RequestStudioModal';
import { switchUserStudio } from '../../services/userService';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '../../theme/themes';

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
  
  const user = auth.currentUser;

  useEffect(() => {
    const initializeLocation = async () => {
      if (!user) {
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
        await StudioService.ensureDefaultStudio();

        // Check for pending studio selection from deep link
        try {
          const pendingSelectionData = await AsyncStorage.getItem('pendingStudioSelection');
          if (pendingSelectionData) {
            const { studioId, eventId, source } = JSON.parse(pendingSelectionData);
            console.log('[LocationScreen] Found pending studio selection:', { studioId, eventId, source });
            
            // Find the studio by ID
            const studio = await StudioService.getStudioById(studioId);
            if (studio) {
              console.log('[LocationScreen] Auto-selecting studio from deep link:', studio.name);
              console.log('[LocationScreen] Studio object from deep link:', { id: studio.id, name: studio.name });
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
          console.error('[LocationScreen] Error checking pending studio selection:', error);
        }

        // Request location permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        setLocationPermission(status);

        if (status === 'granted') {
          try {
            // Get user location with timeout
            const location = await Promise.race([
              Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
                timeout: 12000, // Increased initial timeout
                maximumAge: 60000, // Accept location up to 60 seconds old for initial load
              }),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Location timeout')), 15000)
              )
            ]);
            setUserLocation(location.coords);

            // Get nearby studios
            const closest = await StudioService.getClosestStudios(
              location.coords.latitude,
              location.coords.longitude,
              5
            );
            setNearbyStudios(closest);
          } catch (locationError) {
            // Fallback to showing all studios if location fails
            try {
              const allStudios = await StudioService.getAllStudios();
              setNearbyStudios(allStudios.slice(0, 5)); // Show first 5 studios
            } catch (fallbackError) {
              setNearbyStudios([]);
            }
          }
        } else {
          // Fallback to showing all studios by region
          try {
            const allStudios = await StudioService.getAllStudios();
            setNearbyStudios(allStudios.slice(0, 5)); // Show first 5 studios
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

  const handleConfirmStudio = async (studioOverride = null, pendingData = null) => {
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
      console.log('[LocationScreen] Studio selected from suggestion:', { id: studio.id, name: studio.name });
      setSelectedStudio(studio);
      // Switch to browse tab to show the selected studio clearly
      setSelectedTab('browse');
    } else {
      console.warn('[LocationScreen] No studio found for suggestion:', suggestion.studioId);
    }
  };

  const handleSearchStudio = async () => {
    if (!searchText.trim()) {
      vibeAlert.warning('Missing Info', 'Please enter a city name to search.');
      return;
    }

    setSaving(true);
    try {
      const studioMatch = await StudioService.generateStudioFromText(searchText.trim());
      
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
                const parts = searchText.trim().split(',').map(p => p.trim());
                const cityName = parts[0] || '';
                const stateName = parts[1] || '';
                
                // Open request modal with pre-filled data
                setModalPreFill({ city: cityName, state: stateName });
                setShowRequestModal(true);
              }
            }
          ]
        );
        setSaving(false);
        return;
      }

      const studio = await StudioService.getStudioById(studioMatch.studioId);
      if (studio) {
        console.log('[LocationScreen] Studio found from search:', { id: studio.id, name: studio.name });
        await saveStudioData(studio);
      } else {
        console.warn('[LocationScreen] No studio found for search result:', studioMatch.studioId);
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
      vibeAlert.error('Error', 'Invalid studio data. Please try selecting a studio again.');
      setSaving(false);
      return;
    }

    try {
      // Get current studio ID before updating (for switching)
      let currentStudioId = null;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          currentStudioId = userDoc.data()?.userdata?.studios?.default?.studioId;
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
              additional: [] // Array for future multiple studio support
            }
          }
        },
        { merge: true }
      );

      // Switch user to new studio (handles removal from old + addition to new)
      const switchResult = await switchUserStudio(user.uid, currentStudioId, studio.id);
      if (!switchResult.success) {
        console.warn('Failed to switch user studios:', switchResult.error);
        // Continue anyway - user document was saved successfully
      }

      console.log(`User ${user.uid} successfully switched to studio ${studio.id} from ${currentStudioId || 'none'}`);
      
      // Handle pending event navigation or default to Home
      if (pendingData && pendingData.eventId) {
        console.log('[LocationScreen] Navigating to pending event:', pendingData.eventId);
        // Clear the pending selection since we're handling it
        await AsyncStorage.removeItem('pendingStudioSelection');
        
        // Navigate directly to the event
        navigation.navigate('EventDetail', {
          eventId: pendingData.eventId,
          studioId: studio.id,
          source: pendingData.source || 'app-download-qr'
        });
        
        // Show success message about joining the event
        setTimeout(() => {
          vibeAlert.success('Welcome!', `You've been added to ${studio.name}! Now you can join the event.`);
        }, 500);
      } else {
        // Navigate to Home screen
        navigation.navigate('Home');
      }
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
      console.warn('[LocationScreen] Refresh timeout reached, forcing state reset');
      setRefreshingLocation(false);
    }, 30000); // 30 second timeout
    
    try {
      console.log('[LocationScreen] Refreshing location and studios...');
      
      // Re-request location permission and check system settings
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('[LocationScreen] Permission status:', status);
      setLocationPermission(status);

      // Check if location services are enabled
      const locationServicesEnabled = await Location.hasServicesEnabledAsync();

      if (status === 'granted') {
        if (!locationServicesEnabled) {
          console.error('[LocationScreen] Location services are disabled at system level');
          vibeAlert.error('Location Disabled', 'Please enable location services in your device settings');
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
              )
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
        vibeAlert.error('Permission Denied', 'Location permission is required to find nearby studios');
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

  return (
    <View style={styles.screenContainer}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
        >
          <View style={styles.headerRow}>
            <Text style={[styles.title, styles.titleFlexible, theme.shadows.textGlow]}>
              Choose Your Studio
            </Text>
            {hasExistingStudio && (
              <View style={styles.closeButtonContainer}>
                <CloseButton onPress={handleClose} />
              </View>
            )}
          </View>
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
                        <Text style={styles.centerItemName}>{selectedStudio.name}</Text>
                        <Text style={styles.centerItemLocation}>{selectedStudio.city}, {selectedStudio.state}</Text>
                        {typeof selectedStudio.distance === 'number' ? (
                          <Text style={styles.centerItemDistance}>{selectedStudio.distance.toFixed(1)} miles away</Text>
                        ) : null}
                      </View>
                      {(selectedStudio.memberCount && typeof selectedStudio.memberCount === 'number') ? (
                        <Text style={styles.centerItemMembers}>
                          👥 {selectedStudio.memberCount}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.buttonContainer}
                    onPress={() => handleConfirmStudio()}
                    disabled={saving}
                  >
                    <LinearGradient
                      colors={theme.colors.buttonGradient}
                      style={[styles.button, saving && styles.buttonDisabled]}
                    >
                      <Text style={styles.buttonText}>
                        {saving ? 'Joining...' : 'Join Studio'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

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
                        {userLocation ? '📍 Studios Near Me' : '🏢 Available Studios'}
                      </Text>
                      {userLocation && (
                        <Text style={styles.sectionSubtitle}>
                          Showing studios within 100 miles
                        </Text>
                      )}
                      
                      {nearbyStudios.length > 0 ? (
                        nearbyStudios.map((studio) => (
                          <TouchableOpacity
                            key={studio.id}
                            style={styles.centerItem}
                            onPress={() => setSelectedStudio(studio)}
                          >
                            <View style={styles.centerItemHeader}>
                              <View style={styles.centerItemInfo}>
                                <Text style={styles.centerItemName}>{studio.name}</Text>
                                <Text style={styles.centerItemLocation}>{studio.city}, {studio.state}</Text>
                                {typeof studio.distance === 'number' ? (
                                  <Text style={styles.centerItemDistance}>{studio.distance.toFixed(1)} miles away</Text>
                                ) : null}
                              </View>
                              {(studio.memberCount && typeof studio.memberCount === 'number') ? (
                                <Text style={styles.centerItemMembers}>
                                  👥 {studio.memberCount}
                                </Text>
                              ) : null}
                            </View>
                          </TouchableOpacity>
                        ))
                      ) : refreshingLocation ? (
                        <View style={styles.loadingState}>
                          <Text style={styles.loadingText}>🔄 Finding nearby studios...</Text>
                        </View>
                      ) : (
                        <View style={styles.emptyState}>
                          <Text style={styles.emptyStateText}>No studios found within 100 miles</Text>
                          <Text style={styles.emptyStateSubtext}>Try refreshing or search by location</Text>
                        </View>
                      )}
                      
                      <TouchableOpacity
                        style={styles.refreshButtonBelow}
                        onPress={handleRefreshLocation}
                        disabled={refreshingLocation}
                      >
                        <Text style={styles.refreshButtonBelowText}>
                          {refreshingLocation ? '🔄 Refreshing...' : '🔄 Refresh Studios'}
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
                            {refreshingLocation ? '🔄 Refreshing...' : '📍 Try Again'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.sectionSubtitle}>Tap "Try Again" to enable location for personalized results</Text>
                    </View>
                  ) : (
                    <View style={styles.centersSection}>
                      <Text style={styles.sectionTitle}>📍 Getting your location...</Text>
                      <ActivityIndicator size="small" color={theme.colors.vibeBlue} style={{ marginTop: 10 }} />
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
                        <Text style={styles.centerItemName}>{selectedStudio.name}</Text>
                        <Text style={styles.centerItemLocation}>{selectedStudio.city}, {selectedStudio.state}</Text>
                        {typeof selectedStudio.distance === 'number' ? (
                          <Text style={styles.centerItemDistance}>{selectedStudio.distance.toFixed(1)} miles away</Text>
                        ) : null}
                      </View>
                      {(selectedStudio.memberCount && typeof selectedStudio.memberCount === 'number') ? (
                        <Text style={styles.centerItemMembers}>
                          👥 {selectedStudio.memberCount}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.buttonContainer}
                    onPress={() => handleConfirmStudio()}
                    disabled={saving}
                  >
                    <LinearGradient
                      colors={theme.colors.buttonGradient}
                      style={[styles.button, saving && styles.buttonDisabled]}
                    >
                      <Text style={styles.buttonText}>
                        {saving ? 'Joining...' : 'Join Studio'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

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
                  <Text style={styles.searchTitle}>
                    🔍 Search by Location
                  </Text>
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
                      if (searchText.trim().length >= 2) {
                        setShowSuggestions(true);
                      }
                    }}
                  />

                  {/* Suggestions Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                      {suggestions.map((suggestion, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.suggestionItem}
                          onPress={() => handleSuggestionSelect(suggestion)}
                        >
                          <Text style={styles.suggestionText}>
                            {suggestion.displayName}
                          </Text>
                          <Text style={[styles.suggestionStatus, styles.activeStatus]}>
                            Active
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.buttonContainer}
                    onPress={() => handleSearchStudio()}
                    disabled={saving || !searchText.trim()}
                  >
                    <LinearGradient
                      colors={theme.colors.buttonGradient}
                      style={[
                        styles.button,
                        (saving || !searchText.trim()) &&
                          styles.buttonDisabled,
                      ]}
                    >
                      <Text style={styles.buttonText}>
                        {saving ? 'Searching...' : 'Find My Studio'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.requestStudioButtonSearch}
                    onPress={() => {
                      // Pre-fill with search text if available
                      const parts = searchText.trim().split(',').map(p => p.trim());
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
      </KeyboardAvoidingView>
      
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
    backgroundColor: 'transparent', // Let App-level VibeScreen handle background
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingLeft: 24,
    paddingRight: 24,
    paddingTop: 0, // Let SafeAreaView handle top spacing
    paddingBottom: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
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
  buttonContainer: {
    marginTop: 20,
    marginBottom: 10,
    borderRadius: theme.sizes.buttonRadius,
    overflow: 'hidden',
  },
  button: {
    padding: 15,
    borderRadius: theme.sizes.buttonRadius,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: theme.colors.textPrimary,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    marginTop: 8, // Reduced since we now have paddingTop on scrollContent
    marginLeft: 12, // Extra margin to ensure title shadow/glow isn't cut off on left
  },
  titleFlexible: {
    flex: 1,
    marginRight: 16,
    textAlign: 'left', // Override center alignment since it's now in a row
  },
  closeButtonContainer: {
    marginTop: 4, // Slight adjustment to align with title baseline
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
    backgroundColor: 'rgba(0, 255, 150, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 150, 0.3)',
  },
  searchTitle: {
    fontSize: 18,
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  searchText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    backgroundColor: theme.colors.inputBackground,
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
    backgroundColor: 'rgba(0, 255, 150, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 150, 0.3)',
    alignItems: 'center',
    marginTop: 12,
  },
  requestStudioButtonSearchText: {
    color: theme.colors.vibeGreen,
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
    backgroundColor: theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: theme.sizes.borderRadius,
    marginTop: -15,
    marginBottom: 20,
    maxHeight: 200,
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
});