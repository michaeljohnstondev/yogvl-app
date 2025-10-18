// FILE: ../what/What.js

import React, { useRef, useState } from 'react';
import { View, Text } from 'react-native';
import {
  VibeInput,
  VibeSegmentedControl,
  VibeAutoComplete,
} from '../../../components/ui/base';

export const What = ({
  formData,
  onInputChange,
  onInputFocus,
  onSuggestionSelect,
  hideSuggestions,
  getFieldData,
  togglePrivacy,
  updateField,
  styles,
  setFieldRef,
}) => {
  const titleInputRef = useRef(null);
  const [titleInputPosition, setTitleInputPosition] = useState(null);

  // Handle title input focus to measure position for autocomplete portal
  const handleTitleFocus = () => {
    if (titleInputRef.current) {
      setTimeout(() => {
        titleInputRef.current.measureInWindow((x, y, width, height) => {
          setTitleInputPosition({ x, y, width, height });
        });
      }, 50);
    }
    onInputFocus?.('title');
  };

  return (
  <View style={styles.sectionContainer}>
    <Text style={styles.label}>
      Event Name <Text style={styles.asterisk}>*</Text>
    </Text>
    <View
      style={styles.inputContainer}
      ref={setFieldRef && setFieldRef('title')}
    >
      <VibeInput
        ref={titleInputRef}
        value={formData.title}
        onChangeText={(text) => onInputChange('title', text)}
        onFocus={handleTitleFocus}
        onBlur={() => hideSuggestions('title')}
        placeholder="Enter event name"
        maxLength={30}
        isCompleted={formData.title && formData.title.trim().length > 0}
        hasDropdownOpen={getFieldData('title', formData.title).isVisible}
      />
      <VibeAutoComplete
        suggestions={getFieldData('title', formData.title).suggestions}
        onSelect={(suggestion) => onSuggestionSelect('title', suggestion)}
        visible={getFieldData('title', formData.title).isVisible}
        inputValue={formData.title}
        context="event"
        onHide={() => hideSuggestions('title')}
        usePortal={false}
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

    {/* Guest invite option - only show for private events */}
    {formData.isPrivate && (
      <View>
        <Text style={styles.label}>Allow guest invites?</Text>
        <VibeSegmentedControl
          options={[
            { value: true, label: 'Yes' },
            { value: false, label: 'No' },
          ]}
          selectedValue={formData.allowGuestInvites}
          onSelect={(value) => updateField('allowGuestInvites', value)}
          style={{ gap: 8 }}
        />
      </View>
    )}
  </View>
  );
};
