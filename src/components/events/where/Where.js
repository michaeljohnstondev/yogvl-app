// FILE: ../where/Where.js

import React from 'react';
import { View, Text } from 'react-native';
import VibeInput from '../../vibeComponents/VibeInput';
import VibeAutoComplete from '../../vibeComponents/VibeAutoComplete';

export const Where = ({
  formData,
  onInputChange,
  onInputFocus,
  hideSuggestions,
  getFieldData,
  updateField,
  styles,
}) => {
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
    }

    hideSuggestions('location');
  };

  return (
    <>
      <Text style={styles.label}>Location *</Text>
      <View style={styles.inputContainer}>
        <VibeInput
          value={formData.location}
          onChangeText={(text) => onInputChange('location', text)}
          onFocus={() => onInputFocus('location')}
          onBlur={() => hideSuggestions('location')}
          placeholder="Enter location"
          maxLength={200}
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

      <Text style={styles.label}>Address (optional)</Text>
      <VibeInput
        value={formData.address}
        onChangeText={(text) => updateField('address', text)}
        placeholder="123 Main St, City, State 12345"
        maxLength={300}
        isCompleted={formData.address && formData.address.trim().length > 0}
      />
    </>
  );
};
