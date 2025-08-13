// FILE: ../who/Who.js

import React from 'react';
import { View, Text } from 'react-native';
import VibeInput from '../../vibeComponents/VibeInput';

export const Who = ({ formData, updateField, styles }) => (
  <>
    <Text style={styles.label}>Max Guests (optional)</Text>
    <VibeInput
      value={formData.maxGuests}
      onChangeText={(text) => updateField('maxGuests', text)}
      keyboardType="numeric"
      maxLength={4}
      placeholder="Enter max guests"
      isCompleted={formData.maxGuests && formData.maxGuests.trim().length > 0}
    />

    <Text style={styles.label}>Additional Hosts</Text>
    <Text style={styles.placeholderText}>Coming soon...</Text>

    <Text style={styles.label}>Members Only</Text>
    <Text style={styles.placeholderText}>Coming soon...</Text>

    {formData.isPrivate && (
      <>
        <Text style={styles.label}>Invite Guests</Text>
        <Text style={styles.placeholderText}>
          Private event invitations coming soon...
        </Text>
      </>
    )}
  </>
);
