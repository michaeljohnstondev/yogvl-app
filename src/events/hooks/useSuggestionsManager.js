import { useCallback, useEffect, useMemo } from 'react';
import { useSuggestions, filterTitleSuggestions } from './useSuggestions';
import useSmartAutoComplete, { autoCompleteConfigs } from './useSmartAutoComplete';
import { getEmojiForText } from '../../lib/emojiUtils';

const hasEmojiAtStart = (text) => {
  if (!text || typeof text !== 'string') return false;
  
  const trimmed = text.trim();
  if (!trimmed) return false;
  
  const emojiRegex = /^[\u{1F600}-\u{1F64F}]|^[\u{1F300}-\u{1F5FF}]|^[\u{1F680}-\u{1F6FF}]|^[\u{1F1E6}-\u{1F1FF}]|^[\u{2600}-\u{26FF}]|^[\u{2700}-\u{27BF}]|^\u{2764}|^\u{2049}|^\u{203C}|^[\u{1F900}-\u{1F9FF}]|^[\u{1FA70}-\u{1FAFF}]/u;
  
  return emojiRegex.test(trimmed);
};

export const useSuggestionsManager = (updateField, appendToDetails, studioId = null) => {
  // Initialize suggestions hook
  const { suggestions, isLoading, loadSuggestions } = useSuggestions(studioId);

  // Smart auto-complete configuration
  const autoCompleteConfig = useMemo(
    () => ({
      location: autoCompleteConfigs.eventLocation,
      title: autoCompleteConfigs.eventTitle,
      details: autoCompleteConfigs.eventDetails,
    }),
    []
  );

  // Smart auto-complete management
  const {
    handleFieldChange: handleSmartFieldChange,
    handleFieldFocus: handleSmartFieldFocus,
    handleSuggestionSelect: handleSmartSuggestionSelect,
    getFieldData,
    updateExternalSuggestions,
    hideSuggestions: hideSmartSuggestions,
  } = useSmartAutoComplete(
    autoCompleteConfig,
    useCallback(
      (locationData) => {
        updateField('address', locationData.address);
      },
      [updateField]
    )
  );

  // Load suggestions on mount and integrate with auto-complete
  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  useEffect(() => {
    if (suggestions.titles || suggestions.locations || suggestions.details || suggestions.interests) {
      // For titles, combine with interests using the new filter function
      const titleTexts = (suggestions.titles || []).map(
        (item) => item.text || item
      );
      const interestSuggestions = suggestions.interests || [];
      
      // Create combined suggestions that include interests
      const combinedTitleSuggestions = [
        ...titleTexts,
        ...interestSuggestions.map(item => item.interest)
      ];
      
      const locationTexts = (suggestions.locations || []).map(
        (item) => item.text || item
      );
      const detailTexts = (suggestions.details || []).map(
        (item) => item.text || item
      );

      updateExternalSuggestions('title', combinedTitleSuggestions);
      updateExternalSuggestions('location', locationTexts);
      updateExternalSuggestions('details', detailTexts);
    }
  }, [suggestions, updateExternalSuggestions]);

  // Combined input change handler
  const handleInputChange = useCallback(
    (field, value) => {
      if (autoCompleteConfig[field]) {
        handleSmartFieldChange(field, value, updateField);
      } else {
        updateField(field, value);
      }
    },
    [autoCompleteConfig, handleSmartFieldChange, updateField]
  );

  // Combined input focus handler
  const handleInputFocus = useCallback(
    (field, formData) => {
      if (autoCompleteConfig[field]) {
        handleSmartFieldFocus(field, formData[field] || '');
      }
    },
    [autoCompleteConfig, handleSmartFieldFocus]
  );

  // Combined suggestion select handler
  const handleSuggestionSelect = useCallback(
    (field, suggestion, formData) => {
      if (autoCompleteConfig[field]) {
        handleSmartSuggestionSelect(
          field,
          suggestion,
          formData[field] || '',
          updateField
        );
      } else {
        const suggestionText =
          typeof suggestion === 'string' ? suggestion : suggestion?.text || '';

        if (
          field === 'details' &&
          formData.details &&
          formData.details.length > 0
        ) {
          appendToDetails(suggestionText);
        } else {
          // Add emoji only if the suggestion doesn't already have one
          const textWithEmoji = hasEmojiAtStart(suggestionText) 
            ? suggestionText 
            : `${getEmojiForText(suggestionText)} ${suggestionText}`;
          updateField(field, textWithEmoji);
        }
        
        // Hide suggestions after selection for non-smart fields
        hideSuggestions(field);
      }
    },
    [
      autoCompleteConfig,
      handleSmartSuggestionSelect,
      updateField,
      appendToDetails,
      hideSuggestions,
    ]
  );

  // Combined hide suggestions handler
  const hideSuggestions = useCallback(
    (field) => {
      if (autoCompleteConfig[field]) {
        hideSmartSuggestions(field);
      }
    },
    [autoCompleteConfig, hideSmartSuggestions]
  );

  return {
    // State
    suggestions,
    isLoading,
    
    // Handlers
    handleInputChange,
    handleInputFocus,
    handleSuggestionSelect,
    hideSuggestions,
    
    // Smart autocomplete data
    getFieldData,
    
    // Actions
    loadSuggestions,
  };
};