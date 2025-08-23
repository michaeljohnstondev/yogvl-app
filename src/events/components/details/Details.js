// FILE: ../details/Details.js

import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { View, Text, Pressable, TouchableOpacity } from 'react-native';
import VibeInput from '../../../components/ui/VibeInput';
import VibeAutoComplete from '../../../components/ui/VibeAutoComplete';
import { useVibeAlert } from '../../../components/ui/VibeAlertContext';
import theme from '../../../theme/themes';

export const Details = forwardRef(({
  formData,
  onInputChange,
  onInputFocus,
  onSuggestionSelect,
  hideSuggestions,
  getFieldData,
  updateField,
  updateInputHeight,
  styles,
  onExpansionChange,
  setFieldRef,
}, ref) => {
  const vibeAlert = useVibeAlert();

  // Expose methods to parent component (simplified)
  useImperativeHandle(ref, () => ({}));

  return (
    <View ref={setFieldRef && setFieldRef('details')}>
      <View style={[styles.labelContainer, { flexDirection: 'row', alignItems: 'center' }]}>
        <Text style={styles.label}>Event Details</Text>
        <TouchableOpacity
          onPress={() => {
            vibeAlert.alert(
              "Event Details",
              "• Where to meet\n• What's provided\n• What to bring\n• Parking instructions\n• Dress code"
            );
          }}
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: theme.colors.vibeBlue,
            justifyContent: 'center',
            alignItems: 'center',
            marginLeft: 8,
            marginTop: 15,
          }}
        >
          <Text style={{
            color: theme.colors.white,
            fontSize: 12,
            fontWeight: 'bold',
            fontFamily: theme.fonts.main,
          }}>?</Text>
        </TouchableOpacity>
      </View>
      <VibeInput
        value={formData.details}
        onChangeText={(text) => onInputChange('details', text)}
        onFocus={() => onInputFocus('details')}
        onBlur={() => hideSuggestions('details')}
        onContentSizeChange={(event) => {
          if (updateInputHeight) {
            updateInputHeight('details', event.nativeEvent.contentSize.height);
          }
        }}
        multiline
        placeholder="Enter details..."
        isCompleted={
          formData.details && formData.details.trim().length > 0
        }
        style={{
          textAlignVertical: 'top',
          minHeight: 40,
        }}
        maxLength={1500}
      />
      <VibeAutoComplete
        suggestions={
          getFieldData('details', formData.details).suggestions
        }
        onSelect={(suggestion) =>
          onSuggestionSelect('details', suggestion)
        }
        visible={getFieldData('details', formData.details).isVisible}
      />
    </View>
  );
});
