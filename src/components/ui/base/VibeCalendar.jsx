// components/ui/base/VibeCalendar.jsx
import React, { useState } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Text, ScrollView } from 'react-native';
import theme from '../../../theme/themes';

/**
 * Pure JS calendar component - no native dependencies
 * Built for punk/cyberpunk theme
 */
const VibeCalendar = ({
  visible,
  initialDate,
  onConfirm,
  onClose,
  minimumDate,
  maximumDate,
}) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = initialDate || new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  const [selectedDate, setSelectedDate] = useState(() => {
    return initialDate || new Date();
  });

  // Get days in month
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday, 6 = Saturday)
  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  // Check if date is disabled
  const isDateDisabled = (date) => {
    if (minimumDate && date < minimumDate) return true;
    if (maximumDate && date > maximumDate) return true;
    return false;
  };

  // Check if date is today
  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Check if date is selected
  const isSelected = (date) => {
    return (
      selectedDate &&
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  // Navigate months
  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Handle day press
  const handleDayPress = (day) => {
    if (day === null) return; // Empty cell
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (!isDateDisabled(date)) {
      setSelectedDate(date);
    }
  };

  // Handle confirm
  const handleConfirm = () => {
    onConfirm(selectedDate);
  };

  // Generate calendar grid
  const generateCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const monthYear = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const calendarDays = generateCalendar();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={previousMonth} style={styles.navButton}>
              <Text style={styles.navButtonText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.headerText}>{monthYear}</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navButton}>
              <Text style={styles.navButtonText}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Week day headers */}
          <View style={styles.weekDaysRow}>
            {weekDays.map((day) => (
              <View key={day} style={styles.weekDayCell}>
                <Text style={styles.weekDayText}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar grid */}
          <ScrollView style={styles.calendarScroll}>
            <View style={styles.calendarGrid}>
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return <View key={`empty-${index}`} style={styles.dayCell} />;
                }

                const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                const disabled = isDateDisabled(date);
                const today = isToday(date);
                const selected = isSelected(date);

                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayCell,
                      selected && styles.selectedDay,
                      today && !selected && styles.todayDay,
                      disabled && styles.disabledDay,
                    ]}
                    onPress={() => handleDayPress(day)}
                    disabled={disabled}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        selected && styles.selectedDayText,
                        today && !selected && styles.todayDayText,
                        disabled && styles.disabledDayText,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.vibeBlue,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.vibeBlue,
  },
  navButton: {
    padding: 8,
  },
  navButtonText: {
    fontSize: 32,
    color: theme.colors.vibeBlue,
    fontWeight: 'bold',
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.vibeBlue,
  },
  weekDaysRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.vibeBlue,
    paddingVertical: 12,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayText: {
    color: theme.colors.vibeBlue,
    fontSize: 12,
    fontWeight: '600',
  },
  calendarScroll: {
    maxHeight: 300,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  dayCell: {
    width: '14.28%', // 100% / 7 days
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  selectedDay: {
    backgroundColor: theme.colors.vibeBlue,
    borderRadius: 20,
  },
  todayDay: {
    borderWidth: 2,
    borderColor: theme.colors.vibeGreen,
    borderRadius: 20,
  },
  disabledDay: {
    opacity: 0.3,
  },
  dayText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '400',
  },
  selectedDayText: {
    color: theme.colors.black,
    fontWeight: 'bold',
  },
  todayDayText: {
    color: theme.colors.vibeGreen,
    fontWeight: 'bold',
  },
  disabledDayText: {
    color: theme.colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 2,
    borderTopColor: theme.colors.vibeBlue,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.textSecondary,
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: theme.colors.vibeBlue,
  },
  confirmButtonText: {
    color: theme.colors.black,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default VibeCalendar;
