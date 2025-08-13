// FILE: ../when/When.js

import React from 'react';
import { View, Text } from 'react-native';

export const When = ({ PickerRow, styles, dateTimeValues }) => (
  <View style={styles.sectionContainer}>
    <Text style={styles.label}>Date & Time *</Text>
    <PickerRow
      pickerId="event"
      dateIcon="📅"
      timeIcon="⏰"
      datePlaceholder="Date"
      timePlaceholder="Time"
    />
  </View>
);
