// FILE: ../details/Details.js

import React, { useState, useImperativeHandle, forwardRef, useRef } from 'react';
import { View, Text, Pressable, TouchableOpacity } from 'react-native';
import { VibeInput, VibeAutoComplete } from '../../../components/ui';
import { useVibeAlert } from '../../../components/ui/base/VibeAlertContext';
import theme from '../../../theme/themes';

export const Details = forwardRef(
  (
    {
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
    },
    ref
  ) => {
    const vibeAlert = useVibeAlert();
    const detailsInputRef = useRef(null);
    const [detailsInputPosition, setDetailsInputPosition] = useState(null);

    // Handle details input focus to measure position for autocomplete portal
    const handleDetailsFocus = () => {
      if (detailsInputRef.current) {
        setTimeout(() => {
          detailsInputRef.current.measureInWindow((x, y, width, height) => {
            setDetailsInputPosition({ x, y, width, height });
          });
        }, 50);
      }
      onInputFocus?.('details');
    };

    // Expose methods to parent component (simplified)
    useImperativeHandle(ref, () => ({}));

    return (
      <View ref={setFieldRef && setFieldRef('details')}>
        <View
          style={[
            styles.labelContainer,
            { flexDirection: 'row', alignItems: 'center' },
          ]}
        >
          <Text style={styles.label}>Event Details</Text>
          <TouchableOpacity
            onPress={() => {
              vibeAlert.alert(
                'Event Details',
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
            <Text
              style={{
                color: theme.colors.white,
                fontSize: 12,
                fontWeight: 'bold',
                fontFamily: theme.fonts.main,
              }}
            >
              ?
            </Text>
          </TouchableOpacity>
        </View>
        <VibeInput
          ref={detailsInputRef}
          value={formData.details}
          onChangeText={(text) => onInputChange('details', text)}
          onFocus={handleDetailsFocus}
          onBlur={() => hideSuggestions('details')}
          onContentSizeChange={(event) => {
            if (updateInputHeight) {
              updateInputHeight(
                'details',
                event.nativeEvent.contentSize.height
              );
            }
          }}
          multiline
          placeholder="Enter details..."
          isCompleted={formData.details && formData.details.trim().length > 0}
          style={{
            padding: 16,
            fontSize: 16,
            textAlignVertical: 'top',
            minHeight: 90,
          }}
          maxLength={1500}
        />
        <VibeAutoComplete
          suggestions={getFieldData('details', formData.details).suggestions}
          onSelect={(suggestion) => onSuggestionSelect('details', suggestion)}
          visible={getFieldData('details', formData.details).isVisible}
        />
      </View>
    );
  }
);
