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
import { useVibeAlert } from '../../components/ui/VibeAlertContext';
import VibeScreen from '../../components/ui/VibeScreen';
import CloseButton from '../../components/ui/CloseButton';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { StudioService } from '../../services/StudioService';
import { switchUserStudio } from '../../services/userService';
import * as Location from 'expo-location';
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

        // Request location permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        setLocationPermission(status);

        if (status === 'granted') {
          // Get user location
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setUserLocation(location.coords);

          // Get nearby studios
          const closest = StudioService.getClosestStudios(
            location.coords.latitude,
            location.coords.longitude,
            5
          );
          setNearbyStudios(closest);
        } else {
          // Fallback to showing all studios by region
          setNearbyStudios([]);
        }
      } catch (error) {
        console.log('Error initializing location:', error);
        setNearbyStudios([]);
      }

      setLoading(false);
    };

    initializeLocation();
  }, [user]);

  const handleConfirmStudio = async () => {
    if (!selectedStudio || !user) {
      vibeAlert.error('Error', 'Please select a studio first.');
      return;
    }

    if (saving) return;
    setSaving(true);
    await saveStudioData(selectedStudio);
  };

  const handleSearchTextChange = async (text) => {
    setSearchText(text);

    if (text.trim().length >= 2) {
      try {
        const studioSuggestions = StudioService.getSuggestions(text);
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

  const handleSuggestionSelect = (suggestion) => {
    setSearchText(suggestion.displayName);
    setShowSuggestions(false);
    setSuggestions([]);
    
    const studio = StudioService.getStudioById(suggestion.studioId);
    if (studio) {
      setSelectedStudio(studio);
    }
  };

  const handleSearchStudio = async () => {
    if (!searchText.trim()) {
      vibeAlert.warning('Missing Info', 'Please enter a city name to search.');
      return;
    }

    setSaving(true);
    try {
      const studioMatch = StudioService.generateStudioFromText(searchText.trim());
      
      if (studioMatch.studioId === 'unknown_location') {
        vibeAlert.warning('No Studio Found', 'No studio found for that location. Try a different city or browse our available studios.');
        setSaving(false);
        return;
      }

      const studio = StudioService.getStudioById(studioMatch.studioId);
      if (studio) {
        await saveStudioData(studio);
      } else {
        vibeAlert.error('Error', 'Studio not found. Please try again.');
        setSaving(false);
      }
    } catch (error) {
      vibeAlert.error('Error', 'Failed to find studio. Please try again.');
      setSaving(false);
    }
  };

  const saveStudioData = async (studio) => {
    if (!user) {
      vibeAlert.error('Error', 'No user found. Please try logging in again.');
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
                studioId: studio.id,
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
      
      // Navigate to Home screen
      navigation.navigate('Home');
    } catch (err) {
      console.error('Error joining studio:', err);
      vibeAlert.error('Error', 'Failed to join studio. Please try again.');
      setSaving(false);
    }
  };

  const handleClose = () => {
    navigation.goBack();
  };

  if (loading) {
    return (
      <VibeScreen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.alertButton} />
          <Text style={styles.loadingText}>Loading studios...</Text>
          <Text style={styles.subText}>Finding your local Big Vibe community</Text>
        </View>
      </VibeScreen>
    );
  }

  return (
    <VibeScreen>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {hasExistingStudio && (
          <View style={styles.closeButtonContainer}>
            <CloseButton onPress={handleClose} />
          </View>
        )}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid={true}
        >
          <Text style={[styles.title, theme.shadows.textGlow]}>
            Choose Your Studio
          </Text>
          <Text style={styles.subtitle}>
            Join your local Big Vibe community hub for events and connections
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
                  <View style={styles.centerCard}>
                    <Text style={styles.centerLabel}>Selected Studio:</Text>
                    <Text style={styles.centerName}>
                      {selectedStudio.name}
                    </Text>
                    <Text style={styles.centerLocation}>
                      {selectedStudio.city}, {selectedStudio.state}
                    </Text>
                    <Text style={[styles.centerStatus, styles.activeStatus]}>
                      🟢 Active
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.buttonContainer}
                    onPress={handleConfirmStudio}
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
                  {locationPermission === 'granted' && nearbyStudios.length > 0 ? (
                    <View style={styles.centersSection}>
                      <Text style={styles.sectionTitle}>📍 Closest Studios</Text>
                      <Text style={styles.sectionSubtitle}>Based on your current location</Text>
                      {nearbyStudios.map((studio) => (
                        <TouchableOpacity
                          key={studio.id}
                          style={styles.centerItem}
                          onPress={() => setSelectedStudio(studio)}
                        >
                          <Text style={styles.centerItemName}>{studio.name}</Text>
                          <Text style={styles.centerItemLocation}>{studio.city}, {studio.state}</Text>
                          <Text style={styles.centerItemDistance}>{studio.distance.toFixed(1)} miles away</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : locationPermission === 'denied' ? (
                    <View style={styles.centersSection}>
                      <Text style={styles.sectionTitle}>🌍 All Studios</Text>
                      <Text style={styles.sectionSubtitle}>Enable location for personalized results</Text>
                      {['Southeast', 'Northeast', 'Southwest', 'Midwest', 'West Coast'].map(region => {
                        const regionalStudios = StudioService.getStudiosByRegion(region);
                        if (regionalStudios.length === 0) return null;
                        
                        return (
                          <View key={region} style={styles.regionSection}>
                            <Text style={styles.regionTitle}>🎵 {region}</Text>
                            {regionalStudios.slice(0, 3).map((studio) => (
                              <TouchableOpacity
                                key={studio.id}
                                style={styles.centerItem}
                                onPress={() => setSelectedStudio(studio)}
                              >
                                <Text style={styles.centerItemName}>{studio.name}</Text>
                                <Text style={styles.centerItemLocation}>{studio.city}, {studio.state}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        );
                      })}
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
                  placeholder="e.g., Greenville, Mauldin, Charleston..."
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
                  onPress={handleSearchStudio}
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
              </View>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </VibeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingBottom: 50,
    justifyContent: 'center',
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
  centerCard: {
    backgroundColor: 'rgba(0, 198, 255, 0.1)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue || '#00C6FF',
  },
  centerLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  centerName: {
    fontSize: 22,
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  centerLocation: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  centerStatus: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  activeStatus: {
    color: theme.colors.vibeGreen,
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
  closeButtonContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
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
  sectionTitle: {
    fontSize: 18,
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
    marginBottom: 12,
    marginLeft: 4,
  },
  centerItem: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
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