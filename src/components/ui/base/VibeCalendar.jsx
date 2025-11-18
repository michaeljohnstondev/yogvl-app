// components/ui/base/VibeCalendar.jsx
import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Calendar } from 'react-native-calendars';
import theme from '../../../theme/themes';

/**
 * Custom calendar component with punk/cyberpunk theme
 * Replaces native iOS wheel picker with visual calendar
 */
const VibeCalendar = ({
  visible,
  initialDate,
  onConfirm,
  onClose,
  minimumDate,
  maximumDate,
}) => {
  const [selectedDate, setSelectedDate] = React.useState(
    initialDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
  );

  const handleDayPress = (day) => {
    setSelectedDate(day.dateString);
  };

  const handleConfirm = () => {
    const date = new Date(selectedDate);
    onConfirm(date);
  };

  const minDate = minimumDate?.toISOString().split('T')[0];
  const maxDate = maximumDate?.toISOString().split('T')[0];

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
            <Text style={styles.headerText}>Select Date</Text>
          </View>

          {/* Calendar */}
          <Calendar
            current={selectedDate}
            onDayPress={handleDayPress}
            minDate={minDate}
            maxDate={maxDate}
            markedDates={{
              [selectedDate]: {
                selected: true,
                selectedColor: theme.colors.vibeBlue,
                selectedTextColor: theme.colors.black,
              },
            }}
            theme={{
              calendarBackground: theme.colors.background,
              textSectionTitleColor: theme.colors.vibeBlue,
              selectedDayBackgroundColor: theme.colors.vibeBlue,
              selectedDayTextColor: theme.colors.black,
              todayTextColor: theme.colors.vibeGreen,
              dayTextColor: theme.colors.textPrimary,
              textDisabledColor: theme.colors.textSecondary,
              monthTextColor: theme.colors.textPrimary,
              indicatorColor: theme.colors.vibeBlue,
              textDayFontFamily: 'System',
              textMonthFontFamily: 'System',
              textDayHeaderFontFamily: 'System',
              textDayFontWeight: '400',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14,
              // Arrow colors
              arrowColor: theme.colors.vibeBlue,
              // Disable default styles
              'stylesheet.calendar.header': {
                header: {
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingLeft: 10,
                  paddingRight: 10,
                  marginTop: 6,
                  alignItems: 'center',
                  backgroundColor: theme.colors.background,
                },
                monthText: {
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: theme.colors.textPrimary,
                  margin: 10,
                },
                arrow: {
                  padding: 10,
                },
                arrowImage: {
                  tintColor: theme.colors.vibeBlue,
                },
                week: {
                  marginTop: 7,
                  flexDirection: 'row',
                  justifyContent: 'space-around',
                },
              },
              'stylesheet.day.basic': {
                base: {
                  width: 32,
                  height: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                text: {
                  marginTop: 4,
                  fontSize: 16,
                  fontWeight: '400',
                  color: theme.colors.textPrimary,
                },
                selected: {
                  backgroundColor: theme.colors.vibeBlue,
                  borderRadius: 16,
                },
                today: {
                  borderWidth: 2,
                  borderColor: theme.colors.vibeGreen,
                  borderRadius: 16,
                },
                disabledText: {
                  color: theme.colors.textSecondary,
                  opacity: 0.3,
                },
              },
            }}
            style={styles.calendar}
          />

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
    overflow: 'hidden',
  },
  header: {
    backgroundColor: theme.colors.background,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.vibeBlue,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.vibeBlue,
    textAlign: 'center',
  },
  calendar: {
    borderRadius: 0,
    paddingBottom: 10,
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
