import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import theme from '../../../theme/themes';
import {
  getEmojiForText,
  getContextualSuggestions,
} from '../../../lib/emojiUtils';

// Helper to check if text already contains an emoji
const hasEmojiAtStart = (text) => {
  if (!text || typeof text !== 'string') return false;

  // Trim any leading/trailing spaces
  const trimmed = text.trim();
  if (!trimmed) return false;

  // Use regex to detect emoji at the start (more comprehensive)
  const emojiRegex =
    /^[\u{1F600}-\u{1F64F}]|^[\u{1F300}-\u{1F5FF}]|^[\u{1F680}-\u{1F6FF}]|^[\u{1F1E6}-\u{1F1FF}]|^[\u{2600}-\u{26FF}]|^[\u{2700}-\u{27BF}]|^\u{2764}|^\u{2049}|^\u{203C}|^[\u{1F900}-\u{1F9FF}]|^[\u{1FA70}-\u{1FAFF}]/u;

  return emojiRegex.test(trimmed);
};

// Helper to normalize text for comparison (strip emojis)
const normalizeForComparison = (text) => {
  if (!text || typeof text !== 'string') return '';

  const emojiRegex =
    /^[\u{1F600}-\u{1F64F}]|^[\u{1F300}-\u{1F5FF}]|^[\u{1F680}-\u{1F6FF}]|^[\u{1F1E6}-\u{1F1FF}]|^[\u{2600}-\u{26FF}]|^[\u{2700}-\u{27BF}]|^\u{2764}|^\u{2049}|^\u{203C}|^[\u{1F900}-\u{1F9FF}]|^[\u{1FA70}-\u{1FAFF}]/u;

  let normalized = text.trim();
  while (emojiRegex.test(normalized)) {
    normalized = normalized.replace(emojiRegex, '').trim();
  }

  return normalized.toLowerCase();
};

const VibeAutoComplete = React.memo(
  ({
    suggestions,
    onSelect,
    visible,
    showCount = false,
    inputValue = '',
    context = 'event',
    onHide,
  }) => {
    // Track when a selection was made to prevent immediate re-showing
    const lastSelectionTimeRef = useRef(0);
    const lastSelectedValueRef = useRef('');

    // Create unified suggestions list: prioritize historical suggestions, then add contextual ones
    const createUnifiedSuggestions = () => {
      const unifiedSuggestions = [];
      const seenNormalized = new Set();

      // Add historical suggestions first (these are smart suggestions from past events)
      if (suggestions && suggestions.length > 0) {
        suggestions.forEach((suggestion) => {
          const suggestionText =
            typeof suggestion === 'string' ? suggestion : suggestion.text;
          const normalized = normalizeForComparison(suggestionText);

          if (!seenNormalized.has(normalized) && normalized) {
            seenNormalized.add(normalized);
            unifiedSuggestions.push(suggestion);
          }
        });
      }

      // Add contextual suggestions if we need more and have input
      if (inputValue && inputValue.length >= 1) {
        const contextualSuggestions = getContextualSuggestions(
          inputValue,
          context
        );
        contextualSuggestions.forEach((contextSuggestion) => {
          // Only add if not already seen (normalize for comparison)
          const contextNormalized = normalizeForComparison(
            contextSuggestion.text
          );

          if (!seenNormalized.has(contextNormalized) && contextNormalized) {
            seenNormalized.add(contextNormalized);
            unifiedSuggestions.push(contextSuggestion.text);
          }
        });
      }

      return unifiedSuggestions;
    };

    const displaySuggestions = createUnifiedSuggestions();

    // Simplified visibility: show only when explicitly visible and we have suggestions
    const hasInput = inputValue && inputValue.length >= 1;
    const hasSuggestions = displaySuggestions && displaySuggestions.length > 0;

    // Check if we should hide due to recent selection
    const timeSinceSelection = Date.now() - lastSelectionTimeRef.current;
    const isRecentSelection = timeSinceSelection < 1000; // Hide for 1 second after selection
    const isSameValueAsSelected = inputValue === lastSelectedValueRef.current;
    const shouldHideFromSelection = isRecentSelection && isSameValueAsSelected;

    // Show when visible prop is true AND we have suggestions
    // But don't show if we're hiding from recent selection
    const shouldShow = !shouldHideFromSelection && visible && hasSuggestions;

    // Handle selection and hide
    const handleSelect = (suggestion) => {
      // Record selection time
      lastSelectionTimeRef.current = Date.now();

      // Calculate what the final value will be after selection
      const suggestionText =
        typeof suggestion === 'string' ? suggestion : suggestion?.text || '';
      const finalValue = hasEmojiAtStart(suggestionText)
        ? suggestionText
        : `${getEmojiForText(suggestionText)} ${suggestionText}`;
      lastSelectedValueRef.current = finalValue;

      // Call onSelect to update the field
      onSelect(suggestion);

      // Call onHide as well
      if (onHide) {
        onHide();
      }
    };

    if (!shouldShow) return null;

    return (
      <View style={styles.autocompleteContainer}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          {displaySuggestions.map((item, index) => {
            // Handle both string and object suggestions
            const text = typeof item === 'string' ? item : item.text;
            const count = typeof item === 'object' ? item.count : null;

            return (
              <Pressable
                key={`${text}-${index}`}
                style={({ pressed }) => [
                  styles.suggestionItem,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => handleSelect(text)}
              >
                <View style={styles.suggestionContent}>
                  <Text style={styles.suggestionText} numberOfLines={1}>
                    {hasEmojiAtStart(text)
                      ? text
                      : `${getEmojiForText(text)} ${text}`}
                  </Text>
                  {showCount && count && typeof count === 'number' && (
                    <Text style={styles.suggestionCount}>Used {count}x</Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  autocompleteContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: theme.colors.background,
    borderRadius: theme.sizes.borderRadius,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 5,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.inputBorder,
  },
  suggestionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontFamily: theme.fonts.main,
    flex: 1,
  },
  suggestionCount: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: theme.fonts.main,
    marginLeft: 8,
  },
  scrollView: {
    flexGrow: 1,
  },
});

VibeAutoComplete.displayName = 'VibeAutoComplete';

export default VibeAutoComplete;
