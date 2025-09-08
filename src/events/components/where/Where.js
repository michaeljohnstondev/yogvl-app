// FILE: ../where/Where.js

import React, { useCallback } from 'react';
import { View, Text } from 'react-native';
import VibeInput from '../../../components/ui/VibeInput';
import VibeAutoComplete from '../../../components/ui/VibeAutoComplete';
import { VenueService } from '../../../services/VenueService';

export const Where = ({
  formData,
  onInputChange,
  onInputFocus,
  hideSuggestions,
  getFieldData,
  updateField,
  styles,
  setFieldRef,
}) => {
  // Handle location input changes with address auto-population
  const handleLocationInputChange = useCallback(async (text) => {
    // Always update the location field immediately
    onInputChange('location', text);
    
    // Check if it's a personal/private location (skip address lookup)
    if (VenueService.isPersonalLocation(text)) {
      console.log('[Where] Personal location detected, skipping address lookup');
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
        console.log('[Where] Auto-populating address for venue:', venueData.name);
        updateField('address', venueData.address);
      }
    } catch (error) {
      console.error('[Where] Error auto-populating address:', error);
      // Don't block user if there's an error - just continue without auto-population
    }
  }, [onInputChange, formData.address, updateField]);

  const handleLocationSelect = (suggestionText) => {
    if (!suggestionText) return;

    // Find the full object that matches this text
    const fullSuggestion = window.locationSuggestionObjects?.find((s) => {
      if (!s || !s.text) return false;
      const displayText =
        s.type === 'location' ? `${s.icon || '📍'} ${s.text}` : s.text;
      return displayText === suggestionText;
    });

    if (fullSuggestion && fullSuggestion.type === 'location') {
      updateField('location', fullSuggestion.text);
      updateField('address', fullSuggestion.address);
    } else {
      const cleanText = suggestionText.replace(/^📍\s*/, '');
      updateField('location', cleanText);
      
      // Try to auto-populate address for selected suggestion
      handleLocationInputChange(cleanText);
    }

    hideSuggestions('location');
  };

  return (
    <>
      <Text style={styles.label}>
        Location <Text style={styles.asterisk}>*</Text>
      </Text>
      <View style={styles.inputContainer} ref={setFieldRef && setFieldRef('location')}>
        <VibeInput
          value={formData.location}
          onChangeText={handleLocationInputChange}
          onFocus={() => onInputFocus('location')}
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
