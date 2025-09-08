import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  BackHandler,
  Keyboard,
  Platform,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import theme from '../../theme/themes';

// Constants
const CLOCK_SIZE = 280;
const CLOCK_CENTER = CLOCK_SIZE / 2;
const HOUR_HAND_LENGTH = 80;
const MINUTE_HAND_LENGTH = 110;
const CLOCK_RADIUS = 130;

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
  minute: time.getMinutes(),
  period: time.getHours() >= 12 ? 'PM' : 'AM',
});

const formatDisplayTime = (hour, minute, period) => {
  return `${hour}:${minute.toString().padStart(2, '0')} ${period}`;
};

// Calculate angle for hour hand (30 degrees per hour + minute offset)
const getHourAngle = (hour, minute) => {
  return ((hour % 12) * 30) + (minute * 0.5) - 90; // -90 to start at 12 o'clock
};

// Calculate angle for minute hand (6 degrees per minute)
const getMinuteAngle = (minute) => {
  return (minute * 6) - 90; // -90 to start at 12 o'clock
};

// Convert angle and radius to x,y coordinates
const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
  const angleInRadians = (angleInDegrees * Math.PI) / 180;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
};

// Calculate hour from touch position
const getHourFromPosition = (x, y) => {
  const dx = x - CLOCK_CENTER;
  const dy = y - CLOCK_CENTER;
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);
  angle = (angle + 90 + 360) % 360; // Normalize to 0-360, starting at 12 o'clock
  const hour = Math.round(angle / 30) % 12;
  return hour === 0 ? 12 : hour;
};

// Calculate minute from touch position with 5-minute snapping
const getMinuteFromPosition = (x, y) => {
  const dx = x - CLOCK_CENTER;
  const dy = y - CLOCK_CENTER;
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);
  angle = (angle + 90 + 360) % 360; // Normalize to 0-360, starting at 12 o'clock
  const rawMinute = Math.round(angle / 6) % 60;
  
  // Snap to 5-minute increments for easier selection
  const snappedMinute = Math.round(rawMinute / 5) * 5;
  return snappedMinute === 60 ? 0 : snappedMinute;
};

// Clock Numbers Component
const ClockNumbers = React.memo(() => {
  const numbers = Array.from({ length: 12 }, (_, i) => {
    const hour = i === 0 ? 12 : i;
    const angle = (i * 30) - 90; // -90 to start at 12 o'clock
    const position = polarToCartesian(CLOCK_CENTER, CLOCK_CENTER, 115, angle);
    
    return (
      <SvgText
        key={hour}
        x={position.x}
        y={position.y + 6}
        textAnchor="middle"
        fontSize="18"
        fontWeight="600"
        fill={theme.colors.textPrimary}
      >
        {hour}
      </SvgText>
    );
  });

  return <>{numbers}</>;
});

// Clock Hand Component
const ClockHand = React.memo(({ angle, length, color, width = 3 }) => {
  const start = { x: CLOCK_CENTER, y: CLOCK_CENTER };
  const end = polarToCartesian(CLOCK_CENTER, CLOCK_CENTER, length, angle);
  
  return (
    <Line
      x1={start.x}
      y1={start.y}
      x2={end.x}
      y2={end.y}
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
    />
  );
});

// AM/PM Toggle Button
const AmPmButton = React.memo(({ period, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      { opacity: pressed ? 0.8 : 1 },
      styles.ampmButton,
    ]}
  >
    <LinearGradient
      colors={theme.colors.buttonGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.ampmGradient}
    >
      <Text style={styles.ampmButtonText}>{period}</Text>
    </LinearGradient>
  </Pressable>
));



// Main Analog Clock Component
const VibeAnalogClock = ({
  visible,
  onClose,
  onConfirm,
  initialTime = null,
  cancelText = 'Cancel',
  confirmText = 'Done',
}) => {
  // Get safe area insets
  const getBottomPadding = () => {
    const { height } = Dimensions.get('window');
    if (Platform.OS === 'ios' && height >= 812) {
      return 25;
    }
    return 15;
  };

  // If no initial time provided, use current time or 12:00 PM
  const getDefaultTime = () => {
    return new Date();
  };

  const timeToUse = initialTime || getDefaultTime();
  const initialSelection = parseTimeToSelection(timeToUse);

  const [selectedHour, setSelectedHour] = useState(initialSelection.hour);
  const [selectedMinute, setSelectedMinute] = useState(initialSelection.minute);
  const [selectedPeriod, setSelectedPeriod] = useState(initialSelection.period);
  const [currentStep, setCurrentStep] = useState(0); // 0: hour, 1: minute

  // Calculate hand angles
  const hourAngle = useMemo(() => 
    getHourAngle(selectedHour, selectedMinute), 
    [selectedHour, selectedMinute]
  );
  
  const minuteAngle = useMemo(() => 
    getMinuteAngle(selectedMinute), 
    [selectedMinute]
  );

  // Handle clock face touch
  const handleClockTouch = useCallback((event) => {
    const { locationX, locationY } = event.nativeEvent;
    
    if (currentStep === 0) {
      // Hour selection
      const hour = getHourFromPosition(locationX, locationY);
      setSelectedHour(hour);
      setCurrentStep(1); // Move to minute selection
    } else if (currentStep === 1) {
      // Minute selection
      const minute = getMinuteFromPosition(locationX, locationY);
      setSelectedMinute(minute);
      // Stay at step 1 - user can continue adjusting or click Done
    }
  }, [currentStep]);

  // Handle AM/PM toggle
  const handlePeriodToggle = useCallback(() => {
    setSelectedPeriod(prev => prev === 'AM' ? 'PM' : 'AM');
  }, []);

  // Handle done button
  const handleDone = useCallback(() => {
    const newTime = createTimeFromSelection(selectedHour, selectedMinute, selectedPeriod);
    Keyboard.dismiss();
    onConfirm(newTime);
  }, [selectedHour, selectedMinute, selectedPeriod, onConfirm]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setSelectedHour(initialSelection.hour);
    setSelectedMinute(initialSelection.minute);
    setSelectedPeriod(initialSelection.period);
    setCurrentStep(0);
    Keyboard.dismiss();
    onClose();
  }, [initialSelection, onClose]);

  // Handle background tap
  const handleBackgroundPress = useCallback(() => {
    Keyboard.dismiss();
    handleCancel();
  }, [handleCancel]);

  // Handle Android back button
  React.useEffect(() => {
    if (!visible) return;

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleCancel();
        return true;
      }
    );

    return () => backHandler.remove();
  }, [visible, handleCancel]);

  // Reset when modal opens
  React.useEffect(() => {
    if (visible) {
      const timeToUse = initialTime || getDefaultTime();
      const selection = parseTimeToSelection(timeToUse);
      setSelectedHour(selection.hour);
      setSelectedMinute(selection.minute);
      setSelectedPeriod(selection.period);
      setCurrentStep(0);
    }
  }, [visible, initialTime]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <Pressable
        style={styles.overlay}
        onPress={handleBackgroundPress}
        activeOpacity={1}
      >
        <Pressable
          style={[styles.modal, { paddingBottom: getBottomPadding() }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.timeDisplayContainer}>
              <View style={styles.timePartsContainer}>
                <Pressable onPress={() => setCurrentStep(0)} style={[styles.timePartContainer, currentStep === 0 && styles.activeTimePart]}>
                  <Text style={[styles.timeDisplay, currentStep === 0 && styles.activeTimeText]}>
                    {selectedHour}
                  </Text>
                </Pressable>
                <Text style={styles.timeDisplay}>:</Text>
                <Pressable onPress={() => setCurrentStep(1)} style={[styles.timePartContainer, currentStep === 1 && styles.activeTimePart]}>
                  <Text style={[styles.timeDisplay, currentStep === 1 && styles.activeTimeText]}>
                    {selectedMinute.toString().padStart(2, '0')}
                  </Text>
                </Pressable>
              </View>
              <Pressable onPress={handlePeriodToggle} style={styles.ampmContainer}>
                <Text style={styles.ampmDisplay}>{selectedPeriod}</Text>
              </Pressable>
            </View>
          </View>

          {/* Clock Container */}
          <View style={styles.clockContainer}>
            <View style={styles.clockWrapper}>
              <Pressable onPress={handleClockTouch}>
                <Svg width={CLOCK_SIZE} height={CLOCK_SIZE} style={styles.clockSvg}>
                  {/* Clock face circle */}
                  <Circle
                    cx={CLOCK_CENTER}
                    cy={CLOCK_CENTER}
                    r={CLOCK_RADIUS}
                    fill="none"
                    stroke={theme.colors.inputBorder}
                    strokeWidth="2"
                  />
                  
                  
                  {/* Minute markers */}
                  {Array.from({ length: 60 }, (_, i) => {
                    if (i % 5 !== 0) { // Skip hour positions
                      const angle = (i * 6) - 90;
                      const outerPos = polarToCartesian(CLOCK_CENTER, CLOCK_CENTER, CLOCK_RADIUS - 5, angle);
                      const innerPos = polarToCartesian(CLOCK_CENTER, CLOCK_CENTER, CLOCK_RADIUS - 12, angle);
                      
                      return (
                        <Line
                          key={i}
                          x1={outerPos.x}
                          y1={outerPos.y}
                          x2={innerPos.x}
                          y2={innerPos.y}
                          stroke={theme.colors.darkGray}
                          strokeWidth="1"
                        />
                      );
                    }
                    return null;
                  })}
                  
                  {/* Numbers */}
                  <ClockNumbers />
                  
                  {/* Clock hands - only show after user has started selecting */}
                  {currentStep > 0 && (
                    <>
                      {/* Hour hand */}
                      <ClockHand
                        angle={hourAngle}
                        length={HOUR_HAND_LENGTH}
                        color={theme.colors.vibeGreen}
                        width={4}
                      />
                      
                      {/* Minute hand */}
                      <ClockHand
                        angle={minuteAngle}
                        length={MINUTE_HAND_LENGTH}
                        color={theme.colors.vibeGreen}
                        width={3}
                      />
                      
                      {/* Center dot */}
                      <Circle
                        cx={CLOCK_CENTER}
                        cy={CLOCK_CENTER}
                        r="6"
                        fill={theme.colors.vibeBlue}
                      />
                    </>
                  )}
                </Svg>
              </Pressable>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            <View style={styles.actionButtons}>
              <Pressable onPress={handleCancel} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </Pressable>
              
              <Pressable onPress={handleDone} style={styles.doneButton}>
                <Text style={styles.doneButtonText}>{confirmText}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.sizes.borderRadius * 2,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    shadowColor: theme.colors.vibeBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    margin: 20,
    width: 360,
    maxWidth: '90%',
  },
  header: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 25,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.darkGray,
  },
  timeDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
    width: '100%',
  },
  timePartsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'nowrap',
  },
  timePartContainer: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: theme.sizes.borderRadius,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 60,
    alignItems: 'center',
    flexShrink: 0,
  },
  activeTimePart: {
    backgroundColor: 'rgba(0, 198, 255, 0.1)',
    borderColor: theme.colors.vibeBlue,
  },
  timeDisplay: {
    color: theme.colors.textPrimary, // This should be white
    fontSize: 36,
    fontWeight: '700',
    fontFamily: theme.fonts.main,
  },
  activeTimeText: {
    color: theme.colors.textPrimary, // Keep white even when active
  },
  ampmContainer: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.sizes.borderRadius,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 70,
    alignItems: 'center',
    flexShrink: 0,
    backgroundColor: theme.colors.inputBackground,
  },
  ampmDisplay: {
    color: theme.colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    fontFamily: theme.fonts.main,
  },
  clockContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  clockWrapper: {
    position: 'relative',
  },
  clockSvg: {
    backgroundColor: 'transparent',
  },
  controls: {
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 25,
    paddingBottom: 25,
    gap: 20,
  },
  ampmButton: {
    height: 50,
    paddingHorizontal: 30,
    borderRadius: theme.sizes.borderRadius,
  },
  ampmGradient: {
    height: '100%',
    width: '100%',
    borderRadius: theme.sizes.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  ampmButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: theme.fonts.main,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20,
    width: '100%',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: theme.sizes.borderRadius,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    backgroundColor: theme.colors.inputBackground,
  },
  cancelButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },
  doneButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    backgroundColor: 'rgba(0, 198, 255, 0.1)',
    borderRadius: theme.sizes.borderRadius,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue,
    alignItems: 'center',
  },
  doneButtonText: {
    color: theme.colors.vibeBlue,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },
});

export default VibeAnalogClock;