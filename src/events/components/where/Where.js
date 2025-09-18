// FILE: ../where/Where.js

import React, { useCallback, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { VibeInput, VibeAutoComplete } from '../../../components/ui/base';
import { GooglePlacesService } from '../../../services/GooglePlacesService';
import { VenueService } from '../../../services/VenueService';
import { isPersonalLocation } from '../../../lib/locationUtils';

export const Where = ({
  formData,
  onInputChange,
  onInputFocus,
  hideSuggestions,
  getFieldData,
  updateField,
  styles,
  setFieldRef,
  onLocationSelect, // Callback from useSmartAutoComplete for Google Places
}) => {
  const locationInputRef = useRef(null);
  const [locationInputPosition, setLocationInputPosition] = useState(null);

  // Handle location input focus to measure position for autocomplete portal
  const handleLocationFocus = () => {
    if (locationInputRef.current) {
      setTimeout(() => {
        locationInputRef.current.measureInWindow((x, y, width, height) => {
          setLocationInputPosition({ x, y, width, height });
        });
      }, 50);
    }
    onInputFocus?.('location');
  };

  // Handle location input changes with address auto-population
  const handleLocationInputChange = useCallback(
    async (text) => {
      // Always update the location field immediately
      onInputChange('location', text);

      // Check if it's a personal/private location (skip address lookup)
      if (isPersonalLocation(text)) {
        console.log(
          '[Where] Personal location detected, skipping address lookup'
        );
        return;
      }

      // Skip if text is too short or if address is already filled
      if (!text || text.trim().length < 3 || formData.address?.trim()) {
        return;
      }

      try {
        // Check our venue database for known addresses
        const venueData = await VenueService.getVenueAddress(text);

        if (venueData?.address) {
          console.log(
            '[Where] Auto-populating address for venue:',
            venueData.name
          );
          updateField('address', venueData.address);
        }
      } catch (error) {
        console.error('[Where] Error auto-populating address:', error);
        // Don't block user if there's an error - just continue without auto-population
      }
    },
    [onInputChange, formData.address, updateField]
  );

  // Handle Google Places selection callback
  const handleGooglePlaceSelection = useCallback(
    (placeData) => {
      console.log('[Where] Google Places selection callback:', placeData);

      if (placeData && placeData.address) {
        // Update the address field with Google Places result
        updateField('address', placeData.address);

        // If we have coordinates, we could save them for later use
        if (placeData.coordinates) {
          console.log('[Where] Place coordinates:', placeData.coordinates);
          // Could save coordinates in form data for future use (e.g., map display)
        }
      }
    },
    [updateField]
  );

  const handleLocationSelect = async (suggestionText) => {
    if (!suggestionText) return;

    // Find the full suggestion object that matches this text
    const fullSuggestion = window.locationSuggestionObjects?.find((s) => {
      if (!s || !s.text) return false;
      const displayText = s.icon ? `${s.icon} ${s.text}` : s.text;
      // Match either the full display text or just the text without icon
      return displayText === suggestionText || s.text === suggestionText;
    });

    if (fullSuggestion) {
      // Handle Google Places suggestion
      if (fullSuggestion.isGooglePlace && fullSuggestion.placeId) {
        console.log('[Where] Google Place selected:', fullSuggestion.text);
        updateField('location', fullSuggestion.text);

        // Trigger the address population by calling the Google Places service directly
        console.log('[Where] Getting place details for address population...');
        try {
          const placeDetails = await GooglePlacesService.getPlaceDetails(
            fullSuggestion.placeId
          );
          if (placeDetails && placeDetails.address) {
            console.log(
              '[Where] Auto-populating address:',
              placeDetails.address
            );
            updateField('address', placeDetails.address);
          } else {
            console.log('[Where] No address found in place details');
          }
        } catch (error) {
          console.error('[Where] Error getting place details:', error);
        }
      }
      // Handle local database suggestion
      else if (fullSuggestion.type === 'location' && fullSuggestion.address) {
        console.log('[Where] Local location selected:', fullSuggestion.text);
        updateField('location', fullSuggestion.text);
        updateField('address', fullSuggestion.address);
      }
      // Handle other suggestion types
      else {
        const cleanText = suggestionText.replace(
          /^[🏢🍽️📍🌳⛪🏥🏪🎭🏟️]\s*/,
          ''
        );
        updateField('location', cleanText);

        // Try to auto-populate address for selected suggestion
        await handleLocationInputChange(cleanText);
      }
    } else {
      // Fallback: clean the text and try to auto-populate
      const cleanText = suggestionText.replace(/^[🏢🍽️📍🌳⛪🏥🏪🎭🏟️]\s*/, '');
      updateField('location', cleanText);
      await handleLocationInputChange(cleanText);
    }

    hideSuggestions('location');
  };

  return (
    <>
      <Text style={styles.label}>
        Location <Text style={styles.asterisk}>*</Text>
      </Text>
      <View
        style={styles.inputContainer}
        ref={setFieldRef && setFieldRef('location')}
      >
        <VibeInput
          ref={locationInputRef}
          value={formData.location}
          onChangeText={handleLocationInputChange}
          onFocus={handleLocationFocus}
          onBlur={() => hideSuggestions('location')}
          placeholder="Enter location"
          maxLength={40}
          isCompleted={formData.location && formData.location.trim().length > 0}
        />
        <VibeAutoComplete
          suggestions={(() => {
            const smartSuggestions = getFieldData(
              'location',
              formData.location
            );
            window.locationSuggestionObjects =
              smartSuggestions.suggestions || [];

            return (
              smartSuggestions.suggestions?.map((s) => {
                if (s && s.text) {
                  return s.type === 'location'
                    ? `${s.icon || '📍'} ${s.text}`
                    : s.text;
                }
                return s || '';
              }) || []
            );
          })()}
          onSelect={handleLocationSelect}
          visible={getFieldData('location', formData.location).isVisible}
          showCount={false}
          usePortal={false}
        />
      </View>

      <View ref={setFieldRef && setFieldRef('address')}>
        <Text style={[styles.label, { marginTop: 20 }]}>Address</Text>
        <VibeInput
          value={formData.address}
          onChangeText={(text) => updateField('address', text)}
          onFocus={() => onInputFocus('address')}
          placeholder="123 Main St, City, State 12345"
          maxLength={300}
          isCompleted={formData.address && formData.address.trim().length > 0}
          style={{ marginBottom: 15 }}
        />
      </View>
    </>
  );
};
