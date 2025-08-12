import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../themes/themes';

// Constants
const TIME_CONFIG = {
  HOURS: Array.from({ length: 12 }, (_, i) => i + 1),
  MINUTES: [0, 15, 30, 45],
  PERIODS: ['AM', 'PM'],
};

// Utility Functions
const createTimeFromSelection = (hour, minute, period) => {
  const newTime = new Date();
  let hour24 = hour;
  if (period === 'PM' && hour !== 12) hour24 += 12;
  if (period === 'AM' && hour === 12) hour24 = 0;
  newTime.setHours(hour24, minute, 0, 0);
  return newTime;
};

const parseTimeToSelection = (time) => ({
  hour: time.getHours() % 12 || 12,
  minute: Math.floor(time.getMinutes() / 15) * 15,
  period: time.getHours() >= 12 ? 'PM' : 'AM',
});

// Themed Picker Button Component
const ThemedPickerButton = React.memo(({ label, onPress, selected }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      { opacity: pressed ? 0.8 : 1 },
      styles.pickerButton,
      !selected && styles.unselectedPickerButton,
    ]}
  >
    {selected ? (
      <LinearGradient
        colors={theme.colors.buttonGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.selectedPickerGradient}
      >
        <Text style={styles.selectedPickerText}>{label}</Text>
      </LinearGradient>
    ) : (
      <View style={styles.unselectedPickerContent}>
        <Text style={styles.unselectedPickerText}>{label}</Text>
      </View>
    )}
  </Pressable>
));

// Time Column Component
const TimeColumn = React.memo(
  ({
    label,
    options,
    selectedValue,
    onSelect,
    formatter = (v) => v.toString(),
  }) => (
    <View style={styles.timeColumn}>
      <Text style={styles.columnLabel}>{label}</Text>
      <ScrollView
        style={styles.timeScrollView}
        showsVerticalScrollIndicator={false}
        snapToInterval={50}
        decelerationRate="fast"
      >
        {options.map((option) => (
          <ThemedPickerButton
            key={option}
            label={formatter(option)}
            onPress={() => onSelect(option)}
            selected={selectedValue === option}
          />
        ))}
      </ScrollView>
    </View>
  )
);

// Main Custom Time Picker Component
const VibeTimePicker = ({
  visible,
  onClose,
  onConfirm,
  initialTime = new Date(),
  title = 'Select Time',
  cancelText = 'Cancel',
  confirmText = 'Done',
}) => {
  const initialSelection = parseTimeToSelection(initialTime);

  const [selectedHour, setSelectedHour] = useState(initialSelection.hour);
  const [selectedMinute, setSelectedMinute] = useState(initialSelection.minute);
  const [selectedPeriod, setSelectedPeriod] = useState(initialSelection.period);

  const handleConfirm = useCallback(() => {
    const newTime = createTimeFromSelection(
      selectedHour,
      selectedMinute,
      selectedPeriod
    );
    onConfirm(newTime);
  }, [selectedHour, selectedMinute, selectedPeriod, onConfirm]);

  const handleCancel = useCallback(() => {
    // Reset to initial values when cancelled
    setSelectedHour(initialSelection.hour);
    setSelectedMinute(initialSelection.minute);
    setSelectedPeriod(initialSelection.period);
    onClose();
  }, [initialSelection, onClose]);

  // Update selection when initialTime changes and modal is visible
  React.useEffect(() => {
    if (visible) {
      const selection = parseTimeToSelection(initialTime);
      setSelectedHour(selection.hour);
      setSelectedMinute(selection.minute);
      setSelectedPeriod(selection.period);
    }
  }, [visible, initialTime]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={handleCancel} style={styles.headerButton}>
              <Text style={styles.cancelButtonText}>{cancelText}</Text>
            </Pressable>

            <Text style={styles.title}>{title}</Text>

            <Pressable onPress={handleConfirm} style={styles.headerButton}>
              <LinearGradient
                colors={theme.colors.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.confirmButtonGradient}
              >
                <Text style={styles.confirmButtonText}>{confirmText}</Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Time Selection */}
          <View style={styles.timeContainer}>
            {/* Hour Column */}
            <TimeColumn
              label="Hour"
              options={TIME_CONFIG.HOURS}
              selectedValue={selectedHour}
              onSelect={setSelectedHour}
            />

            {/* Minute Column */}
            <TimeColumn
              label="Min"
              options={TIME_CONFIG.MINUTES}
              selectedValue={selectedMinute}
              onSelect={setSelectedMinute}
              formatter={(value) => value.toString().padStart(2, '0')}
            />

            {/* Period Column */}
            <TimeColumn
              label="Period"
              options={TIME_CONFIG.PERIODS}
              selectedValue={selectedPeriod}
              onSelect={setSelectedPeriod}
            />
          </View>

          {/* Current Selection Display */}
          <View style={styles.previewContainer}>
            <Text style={styles.previewLabel}>Selected Time:</Text>
            <Text style={styles.previewTime}>
              {selectedHour}:{selectedMinute.toString().padStart(2, '0')}{' '}
              {selectedPeriod}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.inputBorder,
    backgroundColor: theme.colors.background,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },
  headerButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontFamily: theme.fonts.main,
  },
  confirmButtonGradient: {
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  confirmButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },
  timeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    justifyContent: 'space-around',
  },
  timeColumn: {
    flex: 1,
    alignItems: 'center',
  },
  columnLabel: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 10,
    fontFamily: theme.fonts.main,
  },
  timeScrollView: {
    height: 150,
    width: 60,
  },
  pickerButton: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.sizes.borderRadius,
    marginVertical: 2,
  },
  selectedPickerGradient: {
    height: '100%',
    width: '100%',
    borderRadius: theme.sizes.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedPickerText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },
  unselectedPickerButton: {
    backgroundColor: theme.colors.inputBackground,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
  },
  unselectedPickerContent: {
    height: '100%',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.sizes.borderRadius,
  },
  unselectedPickerText: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '500',
    fontFamily: theme.fonts.main,
  },
  previewContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.inputBorder,
  },
  previewLabel: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontFamily: theme.fonts.main,
    marginBottom: 4,
  },
  previewTime: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },
});

export default VibeTimePicker;
