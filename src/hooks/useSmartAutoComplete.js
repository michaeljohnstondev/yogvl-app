// hooks/useSmartAutoComplete.js
import { useState, useCallback, useMemo, useEffect } from 'react';

/**
 * Location database for Greenville area popular spots
 * In a real app, this could be loaded from your backend or a service like Google Places
 */
const LOCATION_DATABASE = {
  // Parks
  'Unity Park': {
    address: '950 Riverfront Dr, Greenville, SC 29601',
    category: 'park',
    aliases: ['unity', 'unity park', 'riverfront park'],
  },
  'Falls Park': {
    address: '601 S Main St, Greenville, SC 29601',
    category: 'park',
    aliases: ['falls park', 'falls', 'reedy river falls', 'main street park'],
  },
  'Cleveland Park': {
    address: '1 Conestee Rd, Greenville, SC 29607',
    category: 'park',
    aliases: ['cleveland', 'cleveland park', 'zoo park'],
  },

  // Restaurants
  'The Lazy Goat': {
    address: '170 River Pl, Greenville, SC 29601',
    category: 'restaurant',
    aliases: ['lazy goat', 'the lazy goat', 'goat restaurant'],
  },
  'Tupelo Honey': {
    address: '10 N Main St, Greenville, SC 29601',
    category: 'restaurant',
    aliases: ['tupelo', 'tupelo honey', 'honey restaurant'],
  },
  "Soby's": {
    address: '207 S Main St, Greenville, SC 29601',
    category: 'restaurant',
    aliases: ['sobys', 'soby', 'sobys restaurant'],
  },

  // Entertainment
  'Liberty Bridge': {
    address: 'Falls Park Dr, Greenville, SC 29601',
    category: 'landmark',
    aliases: ['liberty bridge', 'falls park bridge', 'suspension bridge'],
  },
  'Peace Center': {
    address: '300 S Main St, Greenville, SC 29601',
    category: 'venue',
    aliases: ['peace center', 'peace', 'theater', 'performing arts'],
  },
  'Bon Secours Wellness Arena': {
    address: '650 N Academy St, Greenville, SC 29601',
    category: 'venue',
    aliases: ['wellness arena', 'bon secours arena', 'arena', 'swamp rabbits'],
  },

  // Shopping
  'Main Street': {
    address: 'Main St, Greenville, SC 29601',
    category: 'area',
    aliases: ['main street', 'downtown', 'main st', 'downtown main'],
  },
  'Haywood Mall': {
    address: '700 Haywood Rd, Greenville, SC 29607',
    category: 'shopping',
    aliases: ['haywood', 'haywood mall', 'mall'],
  },

  // Popular neighborhoods/areas
  'Augusta Road': {
    address: 'Augusta Rd, Greenville, SC 29605',
    category: 'area',
    aliases: ['augusta road', 'augusta', 'augusta rd'],
  },
  Verdae: {
    address: 'Verdae Blvd, Greenville, SC 29607',
    category: 'area',
    aliases: ['verdae', 'verdae area', 'verdae boulevard'],
  },
};

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

  // Loading states for different fields
  const [loadingStates, setLoadingStates] = useState({});

  // Initialize visibility state for all configured fields
  useEffect(() => {
    const initialVisibility = {};
    Object.keys(config).forEach((fieldId) => {
      initialVisibility[fieldId] = false;
    });
    setSuggestionVisibility(initialVisibility);
  }, [config]);

  // Smart location search function
  const searchLocations = useCallback((query) => {
    if (!query || typeof query !== 'string' || query.trim().length < 2)
      return [];

    const searchTerm = query.toLowerCase().trim();
    const matches = [];

    Object.entries(LOCATION_DATABASE).forEach(([name, data]) => {
      // Check main name
      if (name.toLowerCase().includes(searchTerm)) {
        matches.push({
          name,
          address: data.address,
          category: data.category,
          matchType: 'name',
          score: name.toLowerCase().indexOf(searchTerm) === 0 ? 10 : 5,
        });
      }

      // Check aliases
      data.aliases.forEach((alias) => {
        if (
          alias.includes(searchTerm) &&
          !matches.find((m) => m.name === name)
        ) {
          matches.push({
            name,
            address: data.address,
            category: data.category,
            matchType: 'alias',
            score: alias.indexOf(searchTerm) === 0 ? 8 : 3,
          });
        }
      });
    });

    // Sort by relevance score (higher = better)
    return matches.sort((a, b) => b.score - a.score).slice(0, 8); // Limit to top 8 results
  }, []);

  // Filter and combine suggestions for a field
  const getFilteredSuggestions = useCallback(
    (fieldId, currentValue) => {
      const fieldConfig = config[fieldId];
      if (!fieldConfig) return [];

      const suggestions = [];

      // Add location suggestions for location fields
      if (fieldConfig.enableLocationLookup && currentValue) {
        const locationMatches = searchLocations(currentValue);
        suggestions.push(
          ...locationMatches.map((match) => ({
            text: match.name,
            type: 'location',
            address: match.address,
            category: match.category,
          }))
        );
      }

      // Add external suggestions (from your API)
      const external = externalSuggestions[fieldId] || [];
      const filteredExternal = external
        .filter((suggestion) => {
          const suggestionText =
            typeof suggestion === 'string' ? suggestion : suggestion.text || '';
          return (
            currentValue &&
            suggestionText.toLowerCase().includes(currentValue.toLowerCase()) &&
            !suggestions.find(
              (s) => s.text.toLowerCase() === suggestionText.toLowerCase()
            )
          );
        })
        .slice(0, 5)
        .map((suggestion) => ({
          text:
            typeof suggestion === 'string' ? suggestion : suggestion.text || '',
          type: 'suggestion',
          icon: '💡',
        }));

      suggestions.push(...filteredExternal);

      return suggestions.slice(0, 8); // Max 8 total suggestions
    },
    [config, externalSuggestions, searchLocations]
  );

  // Show suggestions for a field
  const showSuggestions = useCallback((fieldId) => {
    setSuggestionVisibility((prev) => ({ ...prev, [fieldId]: true }));
  }, []);

  // Hide suggestions for a field
  const hideSuggestions = useCallback((fieldId, delay = 150) => {
    setTimeout(() => {
      setSuggestionVisibility((prev) => ({ ...prev, [fieldId]: false }));
    }, delay);
  }, []);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback(
    (fieldId, suggestion, currentValue, onFieldUpdate) => {
      console.log('🎯 Smart suggestion select:', {
        fieldId,
        suggestion,
        currentValue,
      });

      // Safely extract suggestion text
      const suggestionText =
        typeof suggestion === 'string' ? suggestion : suggestion?.text || '';

      if (!suggestionText) {
        console.warn('No valid suggestion text found:', suggestion);
        return;
      }

      // Update the field value
      onFieldUpdate(fieldId, suggestionText);

      // If it's a location with an address, trigger the location callback
      if (
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

      // Hide suggestions
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
    [config, showSuggestions, hideSuggestions]
  );

  // Handle field focus
  const handleFieldFocus = useCallback(
    (fieldId, currentValue) => {
      const fieldConfig = config[fieldId];
      if (!fieldConfig) return;

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
      const isVisible = suggestionVisibility[fieldId] && suggestions.length > 0;
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

  // Search for location by name (utility function)
  const findLocationByName = useCallback((locationName) => {
    if (!locationName || typeof locationName !== 'string') return null;

    const searchTerm = locationName.toLowerCase().trim();

    for (const [name, data] of Object.entries(LOCATION_DATABASE)) {
      if (name.toLowerCase() === searchTerm) {
        return { name, ...data };
      }

      // Check aliases
      for (const alias of data.aliases) {
        if (alias === searchTerm) {
          return { name, ...data };
        }
      }
    }

    return null;
  }, []);

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
    searchLocations,
    findLocationByName,

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
