// FILE: src/components/ui/forms/AutoCompleteInput.js - Reusable autocomplete input component

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
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
  usePortal = true,
  style,
  inputProps = {},
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputPosition, setInputPosition] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const inputRef = useRef(null);

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
    const newValue =
      showEmojis && suggestion.emoji
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

  // Handle input focus and measure position for portal
  const handleFocus = () => {
    if (inputRef.current && inputRef.current.measureInWindow) {
      setTimeout(() => {
        inputRef.current.measureInWindow((x, y, width, height) => {
          setInputPosition({ x, y, width, height });
        });
      }, 50);
    }
  };

  const renderSuggestions = () => (
    <>
      {suggestions.map((suggestion, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.dropdownItem,
            index === suggestions.length - 1 && styles.dropdownItemLast,
          ]}
          onPress={() => handleSuggestionPress(suggestion)}
        >
          <Text style={styles.dropdownText}>
            {showEmojis && suggestion.emoji ? `${suggestion.emoji} ` : ''}
            {suggestion.text}
          </Text>
        </TouchableOpacity>
      ))}
    </>
  );

  const hasSuggestions = showSuggestions && suggestions.length > 0;

  return (
    <View style={[styles.container, style]}>
      <VibeInput
        ref={inputRef}
        value={value}
        onChangeText={handleTextChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        hasDropdownOpen={hasSuggestions}
        {...inputProps}
      />

      {/* Inline dropdown (no Modal) */}
      {!usePortal && hasSuggestions && (
        <View style={styles.inlineDropdown}>
          {renderSuggestions()}
        </View>
      )}

      {/* Portal dropdown (with Modal) */}
      {usePortal && hasSuggestions && (
        <Modal
          visible={true}
          transparent={true}
          animationType="none"
          onRequestClose={() => setShowSuggestions(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowSuggestions(false)}
            activeOpacity={1}
          >
            <View
              style={[
                styles.modalDropdown,
                {
                  top: inputPosition.y + inputPosition.height,
                  left: inputPosition.x,
                  width: inputPosition.width,
                }
              ]}
            >
              {renderSuggestions()}
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },

  // Inline dropdown (no modal)
  inlineDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 999999,
    elevation: 999999,
    backgroundColor: theme.colors.background,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: theme.colors.vibeBlue,
    borderTopWidth: 0,
    maxHeight: 200,
    marginTop: 0,
    shadowColor: theme.colors.vibeBlue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  // Modal overlay and dropdown styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  modalDropdown: {
    position: 'absolute',
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    maxHeight: 200,
    elevation: 1000,
    zIndex: 9999,
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
