// FILE: src/components/ui/forms/AutoCompleteInput.js - Reusable autocomplete input component

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import VibeInput from '../base/VibeInput';
import { getContextualSuggestions } from '../../../lib/emojiUtils';
import theme from '../../../theme/themes';

/**
 * AutoComplete Input Component with Smart Suggestions
 * @param {Object} props
 * @param {string} props.value - Current input value
 * @param {Function} props.onChangeText - Callback when text changes
 * @param {Function} props.onSuggestionSelect - Callback when suggestion is selected
 * @param {string} props.context - Context for suggestions ('group', 'event', 'general')
 * @param {string} props.placeholder - Input placeholder text
 * @param {number} props.maxSuggestions - Maximum number of suggestions to show (default: 5)
 * @param {boolean} props.showEmojis - Whether to show emojis in suggestions (default: true)
 * @param {Object} props.style - Additional styles for container
 * @param {Object} props.inputProps - Additional props passed to VibeInput
 */
export default function AutoCompleteInput({
  value,
  onChangeText,
  onSuggestionSelect,
  context = 'general',
  placeholder = 'Type here...',
  maxSuggestions = 5,
  showEmojis = true,
  style,
  inputProps = {}
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Generate suggestions when value changes
  useEffect(() => {
    if (value && value.length >= 2) {
      const newSuggestions = getContextualSuggestions(value, context);
      setSuggestions(newSuggestions.slice(0, maxSuggestions));
      setShowSuggestions(newSuggestions.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [value, context, maxSuggestions]);

  // Handle suggestion selection
  const handleSuggestionPress = (suggestion) => {
    // Include emoji in the text value if showEmojis is true
    const newValue = showEmojis && suggestion.emoji 
      ? `${suggestion.emoji} ${suggestion.text}`
      : suggestion.text;
    
    onChangeText(newValue);
    onSuggestionSelect && onSuggestionSelect(suggestion);
    setShowSuggestions(false);
  };

  // Handle text change
  const handleTextChange = (text) => {
    onChangeText(text);
    // Show suggestions again if user continues typing after selecting one
    if (text.length >= 2 && !showSuggestions) {
      setShowSuggestions(true);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <VibeInput
        value={value}
        onChangeText={handleTextChange}
        placeholder={placeholder}
        {...inputProps}
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.dropdownContainer}>
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dropdownItem,
                index === suggestions.length - 1 && styles.dropdownItemLast
              ]}
              onPress={() => handleSuggestionPress(suggestion)}
            >
              <Text style={styles.dropdownText}>
                {showEmojis && suggestion.emoji ? `${suggestion.emoji} ` : ''}{suggestion.text}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  
  // Dropdown styling
  dropdownContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: theme.colors.vibeBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.darkGray,
  },
  dropdownText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: theme.fonts.main,
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
  },
});