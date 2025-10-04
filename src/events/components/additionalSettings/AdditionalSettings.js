// FILE: ../advancedSettings/AdvancedSettings.js

import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import { VibeInput, VibeSegmentedControl, VibeButton } from '../../../components/ui';

export const AdditionalSettings = forwardRef(
  (
    {
      formData,
      toggleHostContact,
      toggleFee,
      updateField,
      styles,
      onExpansionChange,
      onInputFocus,
      setFieldRef,
    },
    ref
  ) => {
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      closeSection: () => {
        if (showAdvancedSettings) {
          setShowAdvancedSettings(false);
          onExpansionChange && onExpansionChange(false);
        }
      },
    }));

    return (
      <>
        {!showAdvancedSettings && (
          <VibeButton
            label="SETTINGS"
            onPress={() => {
              const newState = !showAdvancedSettings;
              setShowAdvancedSettings(newState);
              // Notify parent of expansion change
              onExpansionChange && onExpansionChange(newState);
              // Scroll to show the expanded additional settings with gentler positioning
              setTimeout(() => {
                if (onInputFocus) {
                  // Call with minimal scroll - just ensure it's visible
                  onInputFocus('additionalSection', {
                    targetPosition: 'visible',
                    offset: 10,
                  });
                }
              }, 100);
            }}
            style={{ marginTop: 35 }}
          />
        )}

        {showAdvancedSettings && (
          <>
            <Text style={styles.label}>My Contact Information</Text>
            <VibeSegmentedControl
              options={[
                { value: false, label: 'Hide Info' },
                { value: true, label: 'Show Info' },
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
              <View ref={setFieldRef && setFieldRef('entryFee')}>
                <Text style={styles.label}>Entry Fee Amount *</Text>
                <VibeInput
                  value={formData.entryFee}
                  onChangeText={(text) => updateField('entryFee', text)}
                  onFocus={() => onInputFocus && onInputFocus('entryFee')}
                  placeholder="$10.00"
                  keyboardType="numeric"
                />
              </View>
            )}

            <Text style={styles.label}>Attendance Mode</Text>
            <VibeSegmentedControl
              options={[
                { value: 'casual', label: '🌊 Casual' },
                { value: 'strict', label: '🎯 Strict' },
              ]}
              selectedValue={formData.attendanceType}
              onSelect={(value) => updateField('attendanceType', value)}
            />

            <VibeButton
              label="HIDE SETTINGS"
              onPress={() => {
                const newState = !showAdvancedSettings;
                setShowAdvancedSettings(newState);
                onExpansionChange && onExpansionChange(newState);
              }}
              style={{ marginTop: 35 }}
            />
          </>
        )}
      </>
    );
  }
);
