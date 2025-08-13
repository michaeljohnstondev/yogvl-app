// FILE: ../what/What.js

import React from 'react';
import { View, Text } from 'react-native';
import VibeInput from '../../vibeComponents/VibeInput';
import VibeSegmentedControl from '../../vibeComponents/VibeSegmentedControl';
import VibeAutoComplete from '../../vibeComponents/VibeAutoComplete';

export const What = ({
  formData,
  onInputChange,
  onInputFocus,
  onSuggestionSelect,
  hideSuggestions,
  getFieldData,
  togglePrivacy,
  styles,
}) => (
  <View style={styles.sectionContainer}>
    <Text style={styles.label}>Name *</Text>
    <View style={styles.inputContainer}>
      <VibeInput
        value={formData.title}
        onChangeText={(text) => onInputChange('title', text)}
        onFocus={() => onInputFocus('title')}
        onBlur={() => hideSuggestions('title')}
        placeholder="Enter event name"
        maxLength={100}
        isCompleted={formData.title && formData.title.trim().length > 0}
      />
      <VibeAutoComplete
        suggestions={getFieldData('title', formData.title).suggestions}
        onSelect={(suggestion) => onSuggestionSelect('title', suggestion)}
        visible={getFieldData('title', formData.title).isVisible}
      />
    </View>

    <VibeSegmentedControl
      options={[
        { value: false, label: 'Public', icon: '🌍' },
        { value: true, label: 'Private', icon: '🔒' },
      ]}
      selectedValue={formData.isPrivate}
      onSelect={togglePrivacy}
    />
  </View>
);
