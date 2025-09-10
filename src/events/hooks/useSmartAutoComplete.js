// components/events/hooks/useSmartAutoComplete.js
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { getEmojiForText } from '../../lib/emojiUtils';
import { GooglePlacesService } from '../../services/GooglePlacesService';
import { VenueService } from '../../services/VenueService';
import { isPersonalLocation } from '../../lib/locationUtils';

/**
 * Check if text already contains an emoji
 * @param {string} text - Text to check
 * @returns {boolean} - True if text contains emoji
 */
const hasEmojiAtStart = (text) => {
  if (!text || typeof text !== 'string') return false;
  
  // Trim any leading/trailing spaces
  const trimmed = text.trim();
  if (!trimmed) return false;
  
  // Use regex to detect emoji at the start (more comprehensive)
  const emojiRegex = /^[\u{1F600}-\u{1F64F}]|^[\u{1F300}-\u{1F5FF}]|^[\u{1F680}-\u{1F6FF}]|^[\u{1F1E6}-\u{1F1FF}]|^[\u{2600}-\u{26FF}]|^[\u{2700}-\u{27BF}]|^\u{2764}|^\u{2049}|^\u{203C}|^[\u{1F900}-\u{1F9FF}]|^[\u{1FA70}-\u{1FAFF}]/u;
  
  return emojiRegex.test(trimmed);
};

// Removed hardcoded Greenville location database 
// Now using past events + Google Places API for location suggestions

/**
 * Default suggestion databases for when user has no events yet
 */
const DEFAULT_TITLE_SUGGESTIONS = [
  'Birthday Party',
  'Game Night', 
  'Movie Night',
  'BBQ & Chill',
  'House Party',
  'Dinner Party',
  'Wine Tasting',
  'Book Club',
  'Coffee Meetup',
  'Potluck Dinner',
  'Karaoke Night',
  'Trivia Night',
  'Happy Hour',
  'Brunch',
  'Pool Party',
  'Beach Day',
  'Hiking Trip',
  'Art & Craft Night',
  'Cooking Class',
  'Study Group'
];

const DEFAULT_DETAIL_PHRASES = [
  'BYOB',
  'Bring a friend!',
  'Casual dress code',
  'Food will be provided',
  'Please RSVP',
  'Rain or shine',
  'Free parking available',
  'All ages welcome',
  'Pet friendly',
  'Bring your own drinks',
  'Light refreshments provided',
  'Come hungry!',
  'Comfortable shoes recommended',
  'Indoor/outdoor event',
  'Music and dancing',
  'Games provided',
  'Bring a dish to share',
  'Cash bar available',
  'Photography welcome',
  'Questions? Just ask!'
];

/**
 * Smart auto-complete hook with location-to-address mapping
 * @param {Object} config - Configuration for each field
 * @param {Function} onLocationSelect - Callback when a location with address is selected
 * @returns {Object} Hook interface with suggestions and handlers
 */
const useSmartAutoComplete = (config = {}, onLocationSelect = () => {}) => {
  // Suggestion visibility state
  const [suggestionVisibility, setSuggestionVisibility] = useState({});

  // Cache for external suggestions (from your existing API)
  const [externalSuggestions, setExternalSuggestions] = useState({});

  // Cache for Google Places suggestions
  const [googlePlacesSuggestions, setGooglePlacesSuggestions] = useState({});

  // Cache for venue database suggestions 
  const [venueDatabaseSuggestions, setVenueDatabaseSuggestions] = useState({});

  // Loading states for different fields
  const [loadingStates, setLoadingStates] = useState({});

  // Track when a suggestion was just selected to prevent immediate re-showing
  const recentlySelectedRef = useRef({});

  // Initialize visibility state for all configured fields
  useEffect(() => {
    const initialVisibility = {};
    Object.keys(config).forEach((fieldId) => {
      initialVisibility[fieldId] = false;
    });
    setSuggestionVisibility(initialVisibility);
  }, [config]);

  // Venue database search function - YOUR DATABASE SEARCH (FREE)
  const searchVenueDatabase = useCallback(async (fieldId, query) => {
    if (!query || query.trim().length < 2) {
      setVenueDatabaseSuggestions(prev => ({ ...prev, [fieldId]: [] }));
      return;
    }

    // Skip venue database search for personal locations
    if (isPersonalLocation(query)) {
      console.log('[useSmartAutoComplete] Personal location detected, skipping venue database');
      setVenueDatabaseSuggestions(prev => ({ ...prev, [fieldId]: [] }));
      return;
    }

    try {
      console.log('[useSmartAutoComplete] Searching venue database for:', query);
      const venueSuggestions = await VenueService.getVenueSuggestions(query);
      
      // Format venue suggestions for autocomplete
      const formattedVenues = venueSuggestions.map(venue => ({
        text: venue.name,
        type: 'location',
        address: venue.address,
        category: 'venue',
        icon: '🏢',
        isVenueDb: true,
        venueId: venue.id
      }));

      setVenueDatabaseSuggestions(prev => ({ 
        ...prev, 
        [fieldId]: formattedVenues 
      }));
      
      console.log(`[useSmartAutoComplete] Found ${formattedVenues.length} venue database results`);
    } catch (error) {
      console.error('[useSmartAutoComplete] Error searching venue database:', error);
      setVenueDatabaseSuggestions(prev => ({ ...prev, [fieldId]: [] }));
    }
  }, []);

  // Google Places search function - COSTS MONEY (fallback only)
  const searchGooglePlaces = useCallback(async (fieldId, query) => {
    if (!query || query.trim().length < 3) {
      setGooglePlacesSuggestions(prev => ({ ...prev, [fieldId]: [] }));
      return;
    }

    // Skip Google Places search for personal locations
    if (isPersonalLocation(query)) {
      console.log('[useSmartAutoComplete] Personal location detected, skipping Google Places');
      setGooglePlacesSuggestions(prev => ({ ...prev, [fieldId]: [] }));
      return;
    }

    setLoadingStates(prev => ({ ...prev, [fieldId]: true }));

    try {
      console.log('[useSmartAutoComplete] Searching Google Places for:', query);
      const predictions = await GooglePlacesService.getAutocompletePredictions(query);

      const formattedPredictions = predictions.map(prediction => 
        GooglePlacesService.formatPredictionForAutocomplete(prediction)
      );

      setGooglePlacesSuggestions(prev => ({ 
        ...prev, 
        [fieldId]: formattedPredictions 
      }));
    } catch (error) {
      console.error('[useSmartAutoComplete] Error fetching Google Places:', error);
      setGooglePlacesSuggestions(prev => ({ ...prev, [fieldId]: [] }));
    } finally {
      setLoadingStates(prev => ({ ...prev, [fieldId]: false }));
    }
  }, []);

  // Filter and combine suggestions for a field
  const getFilteredSuggestions = useCallback(
    (fieldId, currentValue) => {
      const fieldConfig = config[fieldId];
      if (!fieldConfig) {
        return [];
      }

      const suggestions = [];

      // COST OPTIMIZATION: Search FREE sources first, Google Places only as expensive fallback

      // 1. Add external suggestions (past events - FREE)
      const external = externalSuggestions[fieldId] || [];
      const filteredExternal = external
        .filter((suggestion) => {
          const suggestionText =
            typeof suggestion === 'string' ? suggestion : suggestion.text || '';
          return (
            currentValue &&
            suggestionText.toLowerCase().includes(currentValue.toLowerCase())
          );
        })
        .slice(0, 3) // Limit past events to top 3 to leave room for venue db
        .map((suggestion) => ({
          text:
            typeof suggestion === 'string' ? suggestion : suggestion.text || '',
          type: 'past_event',
          icon: '🔄'
        }));

      suggestions.push(...filteredExternal);

      // 2. Add YOUR venue database suggestions (FREE - higher priority than Google)
      if (fieldConfig.enableLocationLookup && currentValue && suggestions.length < 6) {
        const venueSuggestions = venueDatabaseSuggestions[fieldId] || [];
        const remainingSlots = 6 - suggestions.length;
        
        // Filter out duplicates with past events
        const uniqueVenueSuggestions = venueSuggestions.filter(venueSug => {
          const isDuplicate = suggestions.find(s => 
            s.text && venueSug.text && 
            s.text.toLowerCase() === venueSug.text.toLowerCase()
          );
          return !isDuplicate;
        });
        
        suggestions.push(...uniqueVenueSuggestions.slice(0, remainingSlots));
      }

      // 3. Add Google Places suggestions LAST (COSTS MONEY - only if we need more results)
      if (fieldConfig.enableLocationLookup && currentValue && suggestions.length < 6) {
        const googleSuggestions = googlePlacesSuggestions[fieldId] || [];
        const remainingSlots = 6 - suggestions.length;
        
        // Filter out duplicates with existing suggestions
        const uniqueGoogleSuggestions = googleSuggestions.filter(googleSug => {
          const isDuplicate = suggestions.find(s => 
            s.text && googleSug.text && 
            s.text.toLowerCase() === googleSug.text.toLowerCase()
          );
          return !isDuplicate;
        });
        
        suggestions.push(...uniqueGoogleSuggestions.slice(0, remainingSlots));
      }

      // External suggestions already handled above

      // Add contextual suggestions (same logic as VibeAutoComplete)
      if (currentValue && currentValue.length >= 1 && fieldId === 'title') {
        const { getContextualSuggestions } = require('../../lib/emojiUtils');
        const contextualSuggestions = getContextualSuggestions(currentValue, 'event');
        
        contextualSuggestions.forEach((contextSuggestion) => {
          const contextText = typeof contextSuggestion === 'string' ? contextSuggestion : contextSuggestion.text;
          // Avoid duplicates
          const notDuplicate = !suggestions.find(
            (s) => s.text.toLowerCase() === contextText.toLowerCase()
          );
          
          if (notDuplicate) {
            suggestions.push({
              text: contextText,
              type: 'contextual',
              icon: '🎯',
            });
          }
        });
      }

      // If we have very few suggestions, add defaults
      if (suggestions.length < 3) {
        let defaultSuggestions = [];
        
        if (fieldId === 'title') {
          defaultSuggestions = DEFAULT_TITLE_SUGGESTIONS;
        } else if (fieldId === 'details') {
          defaultSuggestions = DEFAULT_DETAIL_PHRASES;
        }

        const filteredDefaults = defaultSuggestions
          .filter((defaultSugg) => {
            // Filter based on current value if provided
            const matchesInput = !currentValue || 
              defaultSugg.toLowerCase().includes(currentValue.toLowerCase());
            
            // Avoid duplicates
            const notDuplicate = !suggestions.find(
              (s) => s.text.toLowerCase() === defaultSugg.toLowerCase()
            );
            
            return matchesInput && notDuplicate;
          })
          .slice(0, 6 - suggestions.length) // Fill up to 6 total suggestions
          .map((defaultSugg) => ({
            text: defaultSugg,
            type: 'default',
            icon: '✨',
          }));

        suggestions.push(...filteredDefaults);
      }

      return suggestions.slice(0, 8); // Max 8 total suggestions
    },
    [config, externalSuggestions, venueDatabaseSuggestions, googlePlacesSuggestions]
  );

  // Show suggestions for a field
  const showSuggestions = useCallback((fieldId) => {
    setSuggestionVisibility((prev) => ({ ...prev, [fieldId]: true }));
  }, []);

  // Hide suggestions for a field
  const hideSuggestions = useCallback((fieldId, delay = 150) => {
    if (delay === 0) {
      // Immediate hide, no timeout
      setSuggestionVisibility((prev) => ({ ...prev, [fieldId]: false }));
    } else {
      setTimeout(() => {
        setSuggestionVisibility((prev) => ({ ...prev, [fieldId]: false }));
      }, delay);
    }
  }, []);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback(
    async (fieldId, suggestion, currentValue, onFieldUpdate) => {
      // Safely extract suggestion text
      const suggestionText =
        typeof suggestion === 'string' ? suggestion : suggestion?.text || '';

      if (!suggestionText) {
        return;
      }

      // Add emoji only if the suggestion doesn't already have one
      const textWithEmoji = hasEmojiAtStart(suggestionText) 
        ? suggestionText 
        : `${getEmojiForText(suggestionText)} ${suggestionText}`;
      
      // Update the field value
      onFieldUpdate(fieldId, textWithEmoji);

      // Handle Google Places selection
      if (suggestion && suggestion.isGooglePlace && suggestion.placeId) {
        console.log('[useSmartAutoComplete] Google Place selected, getting details...');
        setLoadingStates(prev => ({ ...prev, [fieldId]: true }));
        
        try {
          const placeDetails = await GooglePlacesService.getPlaceDetails(suggestion.placeId);
          console.log('[useSmartAutoComplete] Place details received:', placeDetails);
          if (placeDetails && placeDetails.address) {
            console.log('[useSmartAutoComplete] Calling onLocationSelect with:', {
              fieldId,
              location: placeDetails.name,
              address: placeDetails.address,
              placeId: suggestion.placeId,
              isGooglePlace: true,
              coordinates: placeDetails.location
            });
            onLocationSelect({
              fieldId,
              location: placeDetails.name,
              address: placeDetails.address,
              placeId: suggestion.placeId,
              isGooglePlace: true,
              coordinates: placeDetails.location
            });
          } else {
            console.log('[useSmartAutoComplete] No address found in place details:', placeDetails);
          }
        } catch (error) {
          console.error('[useSmartAutoComplete] Error getting Google Place details:', error);
        } finally {
          setLoadingStates(prev => ({ ...prev, [fieldId]: false }));
        }
      }
      // Handle local location selection
      else if (
        suggestion &&
        typeof suggestion === 'object' &&
        suggestion.type === 'location' &&
        suggestion.address
      ) {
        onLocationSelect({
          fieldId,
          location: suggestionText,
          address: suggestion.address,
          category: suggestion.category,
        });
      }

      // Mark as recently selected to prevent immediate re-showing
      recentlySelectedRef.current[fieldId] = Date.now();

      // Hide suggestions immediately (no delay for explicit selection)
      setSuggestionVisibility((prev) => ({ ...prev, [fieldId]: false }));
    },
    [onLocationSelect]
  );

  // Handle field change with smart logic
  const handleFieldChange = useCallback(
    (fieldId, value, onFieldUpdate) => {
      // Update the field
      onFieldUpdate(fieldId, value);

      const fieldConfig = config[fieldId];
      if (!fieldConfig) return;

      // Check if a suggestion was recently selected (within 500ms)
      const recentlySelected = recentlySelectedRef.current[fieldId];
      const timeSinceSelection = recentlySelected ? Date.now() - recentlySelected : Infinity;
      
      if (timeSinceSelection < 500) {
        // Don't show suggestions immediately after selection
        return;
      }

      // Trigger location searches for location fields - DATABASE FIRST, then Google Places
      if (fieldConfig.enableLocationLookup) {
        // 1. Search your venue database first (FREE)
        searchVenueDatabase(fieldId, value);
        
        // 2. Only search Google Places if available (COSTS MONEY - fallback)
        if (GooglePlacesService.isAvailable()) {
          searchGooglePlaces(fieldId, value);
        }
      }

      // Show suggestions based on field configuration
      if (fieldConfig.showSuggestionsOnChange) {
        if (
          fieldConfig.minCharsForSuggestions &&
          value.length >= fieldConfig.minCharsForSuggestions
        ) {
          showSuggestions(fieldId);
        } else if (!fieldConfig.minCharsForSuggestions && value.length > 0) {
          showSuggestions(fieldId);
        } else {
          hideSuggestions(fieldId, 0);
        }
      }
    },
    [config, showSuggestions, hideSuggestions, searchVenueDatabase, searchGooglePlaces]
  );

  // Handle field focus
  const handleFieldFocus = useCallback(
    (fieldId, currentValue) => {
      const fieldConfig = config[fieldId];
      if (!fieldConfig) {
        return;
      }

      if (fieldConfig.showSuggestionsOnFocus) {
        if (fieldConfig.minCharsForSuggestions) {
          if (currentValue.length >= fieldConfig.minCharsForSuggestions) {
            showSuggestions(fieldId);
          }
        } else {
          showSuggestions(fieldId);
        }
      }
    },
    [config, showSuggestions]
  );

  // Update external suggestions (from your API)
  const updateExternalSuggestions = useCallback((fieldId, suggestions) => {
    setExternalSuggestions((prev) => ({
      ...prev,
      [fieldId]: suggestions,
    }));
  }, []);

  // Set loading state for a field
  const setFieldLoading = useCallback((fieldId, loading) => {
    setLoadingStates((prev) => ({ ...prev, [fieldId]: loading }));
  }, []);

  // Get all data for a field
  const getFieldData = useCallback(
    (fieldId, currentValue) => {
      const fieldConfig = config[fieldId];
      const suggestions = getFilteredSuggestions(fieldId, currentValue);
      const visibilityState = suggestionVisibility[fieldId];
      const isVisible = visibilityState === true && suggestions.length > 0;
      const isLoading = loadingStates[fieldId] || false;
      

      return {
        fieldConfig,
        suggestions,
        isVisible,
        isLoading,
        hasLocationLookup: fieldConfig?.enableLocationLookup || false,
      };
    },
    [config, getFilteredSuggestions, suggestionVisibility, loadingStates]
  );

  // Bulk hide all suggestions
  const hideAllSuggestions = useCallback(() => {
    setSuggestionVisibility((prev) => {
      const newState = { ...prev };
      Object.keys(newState).forEach((key) => {
        newState[key] = false;
      });
      return newState;
    });
  }, []);

  // Location search by name removed - using past events + Google Places only

  return {
    // Field handlers
    handleFieldChange,
    handleFieldFocus,
    handleSuggestionSelect,

    // Suggestion management
    showSuggestions,
    hideSuggestions,
    hideAllSuggestions,
    getFieldData,

    // External data management
    updateExternalSuggestions,
    setFieldLoading,

    // Utilities  
    searchVenueDatabase,
    searchGooglePlaces,

    // State
    suggestionVisibility,
    loadingStates,
  };
};

// Default configurations for common field types
export const autoCompleteConfigs = {
  eventLocation: {
    enableLocationLookup: true,
    showSuggestionsOnFocus: true,
    showSuggestionsOnChange: true,
    minCharsForSuggestions: 1,
  },
  eventTitle: {
    enableLocationLookup: false,
    showSuggestionsOnFocus: true,
    showSuggestionsOnChange: true,
    minCharsForSuggestions: 1,
  },
  eventDetails: {
    enableLocationLookup: false,
    showSuggestionsOnFocus: true,
    showSuggestionsOnChange: true,
    minCharsForSuggestions: 5,
  },
};

export default useSmartAutoComplete;
