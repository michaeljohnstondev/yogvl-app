// FILE: ../what/What.js

import React from 'react';
import { View, Text } from 'react-native';
import VibeInput from '../../../components/ui/VibeInput';
import VibeSegmentedControl from '../../../components/ui/VibeSegmentedControl';
import VibeAutoComplete from '../../../components/ui/VibeAutoComplete';

export const What = ({
  formData,
  onInputChange,
  onInputFocus,
  onSuggestionSelect,
  hideSuggestions,
  getFieldData,
  togglePrivacy,
  styles,
  setFieldRef,
}) => (
  <View style={styles.sectionContainer}>
    <Text style={styles.label}>
      Event Name <Text style={styles.asterisk}>*</Text>
    </Text>
    <View
      style={styles.inputContainer}
      ref={setFieldRef && setFieldRef('title')}
    >
      <VibeInput
        value={formData.title}
        onChangeText={(text) => onInputChange('title', text)}
        onFocus={() => onInputFocus('title')}
        onBlur={() => hideSuggestions('title')}
        placeholder="Enter event name"
        maxLength={30}
        isCompleted={formData.title && formData.title.trim().length > 0}
      />
      <VibeAutoComplete
        suggestions={getFieldData('title', formData.title).suggestions}
        onSelect={(suggestion) => onSuggestionSelect('title', suggestion)}
        visible={getFieldData('title', formData.title).isVisible}
        inputValue={formData.title}
        context="event"
        onHide={() => hideSuggestions('title')}
      />
    </View>

    <View>
      <Text style={styles.label}>Event Type</Text>
      <VibeSegmentedControl
        options={[
          { value: false, label: 'Public', icon: '🌍' },
          { value: true, label: 'Private', icon: '🔒' },
        ]}
        selectedValue={formData.isPrivate}
        onSelect={togglePrivacy}
        style={{ gap: 8 }}
      />
    </View>
  </View>
);
