// FILE: ../advancedSettings/AdvancedSettings.js

import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import VibeInput from '../../vibeComponents/VibeInput';
import VibeSegmentedControl from '../../vibeComponents/VibeSegmentedControl';

export const AdditionalSettings = ({
  formData,
  PickerRow,
  toggleRsvpDeadline,
  toggleHostContact,
  toggleFee,
  updateField,
  styles,
}) => {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  return (
    <>
      <Pressable
        style={styles.toggleButton}
        onPress={() => setShowAdvancedSettings(!showAdvancedSettings)}
      >
        <Text style={styles.toggleButtonText}>
          {showAdvancedSettings
            ? 'Hide Additional Settings'
            : 'Show Additional Settings'}
        </Text>
      </Pressable>

      {showAdvancedSettings && (
        <>
          <Text style={styles.label}>RSVP Deadline</Text>
          <VibeSegmentedControl
            options={[
              { value: false, label: 'No Deadline' },
              { value: true, label: 'Set Deadline' },
            ]}
            selectedValue={formData.hasRsvpDeadline}
            onSelect={toggleRsvpDeadline}
          />

          {formData.hasRsvpDeadline && (
            <>
              <Text style={styles.label}>RSVP Deadline Date & Time *</Text>
              <PickerRow
                pickerId="rsvpDeadline"
                dateIcon="📅"
                timeIcon="⏰"
                datePlaceholder="Deadline Date"
                timePlaceholder="Deadline Time"
              />
            </>
          )}

          <Text style={styles.label}>Host Contact Information</Text>
          <VibeSegmentedControl
            options={[
              { value: true, label: 'Show Contact' },
              { value: false, label: 'Hide Contact' },
            ]}
            selectedValue={formData.showHostContact}
            onSelect={toggleHostContact}
          />

          <Text style={styles.label}>Entry Fee</Text>
          <VibeSegmentedControl
            options={[
              { value: false, label: 'Free' },
              { value: true, label: 'Paid' },
            ]}
            selectedValue={formData.hasFee}
            onSelect={toggleFee}
          />

          {formData.hasFee && (
            <>
              <Text style={styles.label}>Entry Fee Amount *</Text>
              <VibeInput
                value={formData.entryFee}
                onChangeText={(text) => updateField('entryFee', text)}
                placeholder="$10.00"
                keyboardType="numeric"
              />

              <Text style={styles.label}>What's Included? (optional)</Text>
              <VibeInput
                value={formData.feeDescription}
                onChangeText={(text) => updateField('feeDescription', text)}
                placeholder="Food, drinks, materials, etc."
                maxLength={200}
              />
            </>
          )}
        </>
      )}
    </>
  );
};
