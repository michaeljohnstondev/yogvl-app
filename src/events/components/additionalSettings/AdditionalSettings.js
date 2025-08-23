// FILE: ../advancedSettings/AdvancedSettings.js

import React, { useState, useImperativeHandle, forwardRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import VibeInput from '../../../components/ui/VibeInput';
import VibeSegmentedControl from '../../../components/ui/VibeSegmentedControl';

export const AdditionalSettings = forwardRef(({
  formData,
  toggleHostContact,
  toggleFee,
  toggleAttendanceTracking,
  updateField,
  styles,
  onExpansionChange,
  onInputFocus,
  setFieldRef,
}, ref) => {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    closeSection: () => {
      if (showAdvancedSettings) {
        setShowAdvancedSettings(false);
        onExpansionChange && onExpansionChange(false);
      }
    }
  }));

  return (
    <>
      {!showAdvancedSettings && (
        <Pressable
          style={[styles.toggleButton, { marginTop: 35 }]}
          onPress={() => {
            const newState = !showAdvancedSettings;
            setShowAdvancedSettings(newState);
            // Notify parent of expansion change
            onExpansionChange && onExpansionChange(newState);
            // Scroll to show the expanded additional settings with gentler positioning
            setTimeout(() => {
              if (onInputFocus) {
                // Call with minimal scroll - just ensure it's visible
                onInputFocus('additionalSection', { targetPosition: 'visible', offset: 10 });
              }
            }, 100);
          }}
        >
          <Text style={styles.toggleButtonText}>More Settings</Text>
        </Pressable>
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

          <Text style={styles.label}>Attendance Tracking</Text>
          <VibeSegmentedControl
            options={[
              { value: false, label: 'No Tracking' },
              { value: true, label: 'Track Attendance' },
            ]}
            selectedValue={formData.trackAttendance}
            onSelect={(value) => updateField('trackAttendance', value)}
          />


          <Pressable
            style={styles.toggleButton}
            onPress={() => {
              const newState = !showAdvancedSettings;
              setShowAdvancedSettings(newState);
              onExpansionChange && onExpansionChange(newState);
            }}
          >
            <Text style={styles.toggleButtonText}>Hide Additional Settings</Text>
          </Pressable>
        </>
      )}
    </>
  );
});
