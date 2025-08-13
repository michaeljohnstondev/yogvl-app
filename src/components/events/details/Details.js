// FILE: ../details/Details.js

import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import VibeInput from '../../vibeComponents/VibeInput';
import VibeAutoComplete from '../../vibeComponents/VibeAutoComplete';

export const Details = ({
  formData,
  onInputChange,
  onInputFocus,
  onSuggestionSelect,
  hideSuggestions,
  getFieldData,
  updateField,
  updateInputHeight,
  styles,
}) => {
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);

  return (
    <>
      <Pressable
        style={styles.toggleButton}
        onPress={() => setShowAdditionalDetails(!showAdditionalDetails)}
      >
        <Text style={styles.toggleButtonText}>
          {showAdditionalDetails
            ? 'Hide Additional Details'
            : 'Add Additional Details'}
        </Text>
      </Pressable>

      {showAdditionalDetails && (
        <>
          <Text style={styles.label}>Extra Details</Text>
          <View style={styles.inputContainer}>
            <VibeInput
              value={formData.details}
              onChangeText={(text) => onInputChange('details', text)}
              onFocus={() => onInputFocus('details')}
              onBlur={() => hideSuggestions('details')}
              multiline
              placeholder="Add any additional details about your event..."
              isCompleted={
                formData.details && formData.details.trim().length > 0
              }
              style={{
                minHeight: 80,
                textAlignVertical: 'top',
                height: Math.max(80, formData.inputHeight),
              }}
              onContentSizeChange={(e) =>
                updateInputHeight(e.nativeEvent.contentSize.height)
              }
              maxLength={500}
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
          <Text style={styles.label}>What's Provided/Included (optional)</Text>
          <VibeInput
            value={formData.whatsProvided || ''}
            onChangeText={(text) => updateField('whatsProvided', text)}
            placeholder="Food, drinks, equipment, materials, etc."
            maxLength={200}
            isCompleted={
              formData.whatsProvided && formData.whatsProvided.trim().length > 0
            }
          />

          <Text style={styles.label}>What to Bring (optional)</Text>
          <VibeInput
            value={formData.whatToBring || ''}
            onChangeText={(text) => updateField('whatToBring', text)}
            placeholder="Items guests should bring"
            isCompleted={
              formData.whatToBring && formData.whatToBring.trim().length > 0
            }
            maxLength={200}
          />

          <Text style={styles.label}>Parking Instructions (optional)</Text>
          <VibeInput
            value={formData.parkingInstructions || ''}
            onChangeText={(text) => updateField('parkingInstructions', text)}
            placeholder="Where to park, parking fees, etc."
            maxLength={200}
            isCompleted={
              formData.parkingInstructions &&
              formData.parkingInstructions.trim().length > 0
            }
          />

          <Text style={styles.label}>Dress Code (optional)</Text>
          <VibeInput
            value={formData.dressCode || ''}
            onChangeText={(text) => updateField('dressCode', text)}
            placeholder="Casual, formal, costume, etc."
            maxLength={100}
            isCompleted={
              formData.dressCode && formData.dressCode.trim().length > 0
            }
          />

          <Text style={styles.label}>Age Restrictions (optional)</Text>
          <VibeInput
            value={formData.ageRestrictions || ''}
            onChangeText={(text) => updateField('ageRestrictions', text)}
            placeholder="18+, family-friendly, etc."
            maxLength={100}
            isCompleted={
              formData.ageRestrictions &&
              formData.ageRestrictions.trim().length > 0
            }
          />
        </>
      )}
    </>
  );
};
