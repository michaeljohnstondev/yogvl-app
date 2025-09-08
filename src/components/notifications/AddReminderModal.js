// FILE: components/notifications/AddReminderModal.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import VibeInput from '../ui/VibeInput';
import VibeButton from '../ui/VibeButton';
import CloseButton from '../ui/CloseButton';
import VibeSegmentedControl from '../ui/VibeSegmentedControl';
import theme from '../../theme/themes';

export default function AddReminderModal({
  visible,
  onClose,
  onAddReminder,
  eventDateTime,
}) {
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [customUnit, setCustomUnit] = useState('hours');
  const [notificationType, setNotificationType] = useState('push');
  const [label, setLabel] = useState('');
  const [timeType, setTimeType] = useState('preset'); // 'preset' or 'custom'

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedPreset(null);
      setCustomAmount('');
      setCustomUnit('hours');
      setNotificationType('push');
      setLabel('');
      setTimeType('preset');
    }
  }, [visible]);

  const presetOptions = [
    { label: '5 minutes', value: { amount: 5, unit: 'minutes' } },
    { label: '15 minutes', value: { amount: 15, unit: 'minutes' } },
    { label: '30 minutes', value: { amount: 30, unit: 'minutes' } },
    { label: '1 hour', value: { amount: 1, unit: 'hours' } },
    { label: '2 hours', value: { amount: 2, unit: 'hours' } },
    { label: '1 day', value: { amount: 1, unit: 'days' } },
    { label: '1 week', value: { amount: 7, unit: 'days' } },
  ];

  const notificationTypeOptions = [
    { label: '🔔 Push', value: 'push' },
    { label: '⏰ Alarm', value: 'alarm' },
    { label: '🔔⏰ Both', value: 'both' },
  ];

  const timeUnitOptions = [
    { label: 'Minutes', value: 'minutes' },
    { label: 'Hours', value: 'hours' },
    { label: 'Days', value: 'days' },
  ];

  const calculateReminderTime = () => {
    if (!eventDateTime) return null;
    
    const eventDate = new Date(eventDateTime);
    let timing;
    
    if (timeType === 'preset' && selectedPreset) {
      timing = selectedPreset;
    } else if (timeType === 'custom' && customAmount) {
      const amount = parseInt(customAmount);
      if (isNaN(amount) || amount <= 0) return null;
      timing = { amount, unit: customUnit };
    } else {
      return null;
    }

    // Calculate milliseconds based on unit
    const unitMultipliers = {
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
    };

    const reminderTime = new Date(eventDate.getTime() - (timing.amount * unitMultipliers[timing.unit]));
    
    // Don't allow reminders in the past
    if (reminderTime <= new Date()) {
      return null;
    }

    return {
      reminderTime,
      relativeTiming: timing,
    };
  };

  const handleAddReminder = () => {
    const reminderCalc = calculateReminderTime();
    
    if (!reminderCalc) {
      Alert.alert(
        'Invalid Time',
        'Please select a valid reminder time that is not in the past.'
      );
      return;
    }

    const reminder = {
      timeType: 'relative',
      relativeTiming: reminderCalc.relativeTiming,
      absoluteTime: reminderCalc.reminderTime.toISOString(),
      notificationType,
      label: label.trim() || null,
    };

    onAddReminder(reminder);
  };

  const canAddReminder = () => {
    if (timeType === 'preset' && selectedPreset) {
      return calculateReminderTime() !== null;
    }
    if (timeType === 'custom' && customAmount) {
      const amount = parseInt(customAmount);
      return !isNaN(amount) && amount > 0 && calculateReminderTime() !== null;
    }
    return false;
  };

  const formatPreviewTime = () => {
    const calc = calculateReminderTime();
    if (!calc) return null;
    
    return calc.reminderTime.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <CloseButton onPress={onClose} />
          </View>
          <Text style={styles.headerTitle}>Add Reminder</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Time Selection Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>REMINDER TIME</Text>
            <View style={styles.timeTypeContainer}>
              <TouchableOpacity
                style={[styles.timeTypeButton, timeType === 'preset' && styles.timeTypeButtonActive]}
                onPress={() => setTimeType('preset')}
              >
                <Text style={[
                  styles.timeTypeButtonText,
                  timeType === 'preset' && styles.timeTypeButtonTextActive
                ]}>
                  Quick Options
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timeTypeButton, timeType === 'custom' && styles.timeTypeButtonActive]}
                onPress={() => setTimeType('custom')}
              >
                <Text style={[
                  styles.timeTypeButtonText,
                  timeType === 'custom' && styles.timeTypeButtonTextActive
                ]}>
                  Custom
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Preset Options */}
          {timeType === 'preset' && (
            <View style={styles.section}>
              <View style={styles.presetsContainer}>
                {presetOptions.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.presetOption,
                      selectedPreset?.amount === option.value.amount &&
                      selectedPreset?.unit === option.value.unit &&
                      styles.presetOptionSelected
                    ]}
                    onPress={() => setSelectedPreset(option.value)}
                  >
                    <Text style={[
                      styles.presetOptionText,
                      selectedPreset?.amount === option.value.amount &&
                      selectedPreset?.unit === option.value.unit &&
                      styles.presetOptionTextSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Custom Time Input */}
          {timeType === 'custom' && (
            <View style={styles.section}>
              <View style={styles.customTimeContainer}>
                <View style={styles.customAmountContainer}>
                  <VibeInput
                    value={customAmount}
                    onChangeText={setCustomAmount}
                    placeholder="1"
                    keyboardType="numeric"
                    style={styles.customAmountInput}
                  />
                </View>
                <VibeSegmentedControl
                  options={timeUnitOptions}
                  selectedValue={customUnit}
                  onValueChange={setCustomUnit}
                  style={styles.unitSelector}
                />
              </View>
            </View>
          )}

          {/* Preview Time */}
          {canAddReminder() && (
            <View style={styles.previewContainer}>
              <Text style={styles.previewLabel}>Reminder will be sent on:</Text>
              <Text style={styles.previewTime}>{formatPreviewTime()}</Text>
            </View>
          )}

          {/* Notification Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NOTIFICATION TYPE</Text>
            <VibeSegmentedControl
              options={notificationTypeOptions}
              selectedValue={notificationType}
              onValueChange={setNotificationType}
            />
          </View>

          {/* Custom Label */}
          <View style={styles.section}>
            <Text style={styles.label}>Label (Optional)</Text>
            <VibeInput
              value={label}
              onChangeText={setLabel}
              placeholder="e.g., Time to leave, Get ready, Prep supplies"
              style={styles.labelInput}
            />
          </View>
        </ScrollView>

        {/* Add Button */}
        <View style={styles.footer}>
          <VibeButton
            title="Add Reminder"
            onPress={handleAddReminder}
            disabled={!canAddReminder()}
            style={[styles.addButton, !canAddReminder() && styles.addButtonDisabled]}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.darkGray,
  },
  headerLeft: {
    width: 50,
  },
  headerTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  headerRight: {
    width: 50,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    color: theme.colors.vibeGreen,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: 1,
  },
  timeTypeContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    backgroundColor: theme.colors.inputBackground,
    padding: 4,
  },
  timeTypeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  timeTypeButtonActive: {
    backgroundColor: theme.colors.vibeBlue,
  },
  timeTypeButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  timeTypeButtonTextActive: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  presetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetOption: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  presetOptionSelected: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderColor: theme.colors.vibeBlue,
  },
  presetOptionText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  presetOptionTextSelected: {
    color: theme.colors.vibeBlue,
    fontWeight: '600',
  },
  customTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  customAmountContainer: {
    width: 80,
  },
  customAmountInput: {
    textAlign: 'center',
  },
  unitSelector: {
    flex: 1,
  },
  previewContainer: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
    alignItems: 'center',
  },
  previewLabel: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginBottom: 4,
  },
  previewTime: {
    color: theme.colors.vibeBlue,
    fontSize: 16,
    fontWeight: '600',
  },
  label: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  labelInput: {
    marginBottom: 8,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.darkGray,
  },
  addButton: {
    width: '100%',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
});