// hooks/useDateTimePickers.js
import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import VibeTimePicker from '../components/VibeTimePicker';
import VibeButtonPlain from '../components/VibeButtonPlain';

/**
 * Reusable hook for managing multiple date/time pickers
 * @param {Object} config - Configuration for each picker
 * @param {Function} onUpdate - Callback when any picker value changes
 * @returns {Object} Hook interface with state, handlers, and components
 */
const useDateTimePickers = (config = {}, onUpdate = () => {}) => {
  // Internal state for all pickers
  const [pickerData, setPickerData] = useState(() => {
    const initialState = {};
    Object.keys(config).forEach((key) => {
      const pickerConfig = config[key];
      initialState[key] = {
        value: pickerConfig.initialValue || new Date(),
        selected: pickerConfig.initialSelected || false,
        showDatePicker: false,
        showTimePicker: false,
      };
    });
    return initialState;
  });

  // Update a specific picker's value
  const updatePicker = useCallback(
    (pickerId, field, value) => {
      setPickerData((prev) => {
        const newData = {
          ...prev,
          [pickerId]: {
            ...prev[pickerId],
            [field]: value,
          },
        };

        // Call the update callback with all current values
        const currentValues = {};
        Object.keys(newData).forEach((id) => {
          currentValues[id] = {
            value: newData[id].value,
            selected: newData[id].selected,
          };
        });
        onUpdate(currentValues);

        return newData;
      });
    },
    [onUpdate]
  );

  // Show a specific picker
  const showPicker = useCallback((pickerId, type) => {
    setPickerData((prev) => ({
      ...prev,
      [pickerId]: {
        ...prev[pickerId],
        [`show${type}Picker`]: true,
      },
    }));
  }, []);

  // Hide a specific picker
  const hidePicker = useCallback((pickerId, type) => {
    setPickerData((prev) => ({
      ...prev,
      [pickerId]: {
        ...prev[pickerId],
        [`show${type}Picker`]: false,
      },
    }));
  }, []);

  // Handle date confirmation
  const handleDateConfirm = useCallback(
    (pickerId, selectedDate) => {
      updatePicker(pickerId, 'value', selectedDate);
      updatePicker(pickerId, 'selected', true);
      hidePicker(pickerId, 'Date');
    },
    [updatePicker, hidePicker]
  );

  // Handle time confirmation
  const handleTimeConfirm = useCallback(
    (pickerId, selectedTime) => {
      const currentDate = pickerData[pickerId].value;
      const newDateTime = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        currentDate.getDate(),
        selectedTime.getHours(),
        selectedTime.getMinutes()
      );
      updatePicker(pickerId, 'value', newDateTime);
      updatePicker(pickerId, 'selected', true);
      hidePicker(pickerId, 'Time');
    },
    [pickerData, updatePicker, hidePicker]
  );

  // Format date for display
  const formatDate = useCallback((date, options = {}) => {
    const defaultOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      ...options,
    };
    return date.toLocaleDateString([], defaultOptions);
  }, []);

  // Format time for display
  const formatTime = useCallback((time, options = {}) => {
    const defaultOptions = {
      hour: 'numeric',
      minute: '2-digit',
      ...options,
    };
    return time.toLocaleTimeString([], defaultOptions);
  }, []);

  // Get formatted value for a picker
  const getFormattedValue = useCallback(
    (pickerId, type, placeholder) => {
      const picker = pickerData[pickerId];
      if (!picker || !picker.selected) {
        return placeholder;
      }

      return type === 'date'
        ? formatDate(picker.value)
        : formatTime(picker.value);
    },
    [pickerData, formatDate, formatTime]
  );

  // Validation helpers
  const validatePicker = useCallback(
    (pickerId) => {
      const pickerConfig = config[pickerId];
      const picker = pickerData[pickerId];

      if (!picker) return { isValid: true };

      // Check if required field is selected
      if (pickerConfig.required && !picker.selected) {
        return {
          isValid: false,
          message: `${pickerConfig.label || pickerId} is required`,
        };
      }

      // Check if date is in the future (if required)
      if (pickerConfig.futureOnly && picker.selected) {
        const now = new Date();
        const minutesDiff = (picker.value - now) / (1000 * 60);

        if (minutesDiff < 0) {
          return {
            isValid: false,
            message: `${pickerConfig.label || pickerId} must be in the future`,
          };
        }

        if (
          pickerConfig.minMinutesFromNow &&
          minutesDiff < pickerConfig.minMinutesFromNow
        ) {
          return {
            isValid: false,
            message: `${pickerConfig.label || pickerId} must be at least ${pickerConfig.minMinutesFromNow} minutes from now`,
          };
        }
      }

      // Check maximum date constraint
      if (pickerConfig.maxDate && picker.selected) {
        const maxDatePickerId = pickerConfig.maxDate;
        const maxDatePicker = pickerData[maxDatePickerId];

        if (
          maxDatePicker &&
          maxDatePicker.selected &&
          picker.value >= maxDatePicker.value
        ) {
          return {
            isValid: false,
            message: `${pickerConfig.label || pickerId} must be before ${config[maxDatePickerId].label || maxDatePickerId}`,
          };
        }
      }

      return { isValid: true };
    },
    [config, pickerData]
  );

  // Validate all pickers
  const validateAll = useCallback(() => {
    const errors = [];
    Object.keys(config).forEach((pickerId) => {
      const validation = validatePicker(pickerId);
      if (!validation.isValid) {
        errors.push(validation.message);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      message: errors[0], // Return first error
    };
  }, [config, validatePicker]);

  // Reset all pickers
  const resetAll = useCallback(() => {
    const resetState = {};
    Object.keys(config).forEach((key) => {
      const pickerConfig = config[key];
      resetState[key] = {
        value: pickerConfig.initialValue || new Date(),
        selected: pickerConfig.initialSelected || false,
        showDatePicker: false,
        showTimePicker: false,
      };
    });
    setPickerData(resetState);
  }, [config]);

  // Update from external data (for templates, etc.)
  const updateFromData = useCallback(
    (data) => {
      const newState = { ...pickerData };
      Object.keys(data).forEach((pickerId) => {
        if (newState[pickerId] && data[pickerId]) {
          newState[pickerId] = {
            ...newState[pickerId],
            value: data[pickerId].value || newState[pickerId].value,
            selected:
              data[pickerId].selected !== undefined
                ? data[pickerId].selected
                : newState[pickerId].selected,
          };
        }
      });
      setPickerData(newState);
    },
    [pickerData]
  );

  // Generate picker button component
  const PickerButton = useCallback(
    ({ pickerId, type, placeholder, icon, style }) => {
      const picker = pickerData[pickerId];
      const pickerConfig = config[pickerId];

      if (!picker || !pickerConfig) return null;

      const isSelected = picker.selected;
      const displayValue = isSelected
        ? getFormattedValue(pickerId, type, placeholder)
        : `${icon} ${placeholder}`;

      return (
        <VibeButtonPlain
          label={displayValue}
          onPress={() =>
            showPicker(pickerId, type === 'date' ? 'Date' : 'Time')
          }
          style={[!isSelected && styles.unselectedButton, style]}
        />
      );
    },
    [pickerData, config, getFormattedValue, showPicker]
  );

  // Generate date/time picker row
  const PickerRow = useCallback(
    ({
      pickerId,
      dateIcon = '📅',
      timeIcon = '⏰',
      datePlaceholder = 'Date',
      timePlaceholder = 'Time',
    }) => {
      return (
        <View style={styles.row}>
          <View style={styles.flex}>
            <PickerButton
              pickerId={pickerId}
              type="date"
              placeholder={datePlaceholder}
              icon={dateIcon}
            />
          </View>
          <View style={styles.flex}>
            <PickerButton
              pickerId={pickerId}
              type="time"
              placeholder={timePlaceholder}
              icon={timeIcon}
            />
          </View>
        </View>
      );
    },
    [PickerButton]
  );

  // Generate all modals
  const DateTimePickerModals = useMemo(() => {
    return (
      <>
        {Object.keys(config).map((pickerId) => {
          const picker = pickerData[pickerId];
          const pickerConfig = config[pickerId];

          if (!picker) return null;

          return (
            <React.Fragment key={pickerId}>
              {/* Date Picker Modal */}
              <DateTimePickerModal
                isVisible={picker.showDatePicker}
                mode="date"
                date={picker.value}
                minimumDate={pickerConfig.futureOnly ? new Date() : undefined}
                maximumDate={
                  pickerConfig.maxDate
                    ? pickerData[pickerConfig.maxDate]?.value
                    : undefined
                }
                onConfirm={(date) => handleDateConfirm(pickerId, date)}
                onCancel={() => hidePicker(pickerId, 'Date')}
              />

              {/* Time Picker Modal */}
              <VibeTimePicker
                visible={picker.showTimePicker}
                initialTime={picker.value}
                onConfirm={(time) => handleTimeConfirm(pickerId, time)}
                onClose={() => hidePicker(pickerId, 'Time')}
              />
            </React.Fragment>
          );
        })}
      </>
    );
  }, [config, pickerData, handleDateConfirm, handleTimeConfirm, hidePicker]);

  // Get current values for external use
  const values = useMemo(() => {
    const result = {};
    Object.keys(pickerData).forEach((pickerId) => {
      result[pickerId] = {
        value: pickerData[pickerId].value,
        selected: pickerData[pickerId].selected,
      };
    });
    return result;
  }, [pickerData]);

  return {
    // State
    values,

    // Components
    PickerButton,
    PickerRow,
    DateTimePickerModals,

    // Handlers
    showPicker,
    updateFromData,
    resetAll,

    // Formatters
    formatDate,
    formatTime,
    getFormattedValue,

    // Validation
    validatePicker,
    validateAll,
  };
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  flex: {
    flex: 1,
  },
  unselectedButton: {
    opacity: 0.7,
  },
});

export default useDateTimePickers;
