// FILE: ../when/When.js

import React from 'react';
import { View, Text } from 'react-native';

export const When = ({ PickerRow, styles, dateTimeValues }) => (
  <>
    <Text style={styles.label}>
      Date & Time <Text style={styles.asterisk}>*</Text>
    </Text>
    <PickerRow
      pickerId="event"
      dateIcon="📅"
      timeIcon="⏰"
      datePlaceholder="Date"
      timePlaceholder="Time"
    />
  </>
);
