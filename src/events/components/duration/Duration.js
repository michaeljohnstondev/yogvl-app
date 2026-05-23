// Event duration picker. Stores the duration as minutes on
// formData.eventDuration. Presets are computed at pick time using the
// event start (from dateTimeValues.event.value) and the studio timezone
// (for "All day", which means "until end of that day in studio TZ").
//
// Custom uses a date/time modal for the end time, then we derive
// minutes = (endTime - startTime). Capped at 10080 minutes (7 days).

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import theme from '../../../theme/themes';

const MAX_DURATION_MIN = 10080; // 7 days

const PRESETS = [
  { key: '30m', label: '30 min', minutes: 30 },
  { key: '1h', label: '1 hour', minutes: 60 },
  { key: '2h', label: '2 hours', minutes: 120 },
  { key: '4h', label: '4 hours', minutes: 240 },
  { key: 'all_day', label: 'All day', minutes: null }, // computed at pick
  { key: 'custom', label: 'Custom', minutes: null },   // user picks end time
];

const minutesUntilEndOfDay = (startDate, timezone) => {
  if (!startDate || isNaN(startDate.getTime())) return null;
  try {
    // Get end-of-day (23:59) wall-clock in studio TZ, then convert to UTC
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).formatToParts(startDate);
    const get = (type) => Number(parts.find((p) => p.type === type)?.value || 0);
    // Build "end of that day" in the studio TZ by constructing a local
    // Date with the same wall-clock date + 23:59. We use the same
    // formatToParts trick to find offset.
    const wallY = get('year');
    const wallM = get('month');
    const wallD = get('day');
    // Construct end-of-day in studio TZ by iterating: build UTC date for
    // (Y,M,D,23,59), then find offset by comparing wall-clock at that UTC.
    // Easier: just compute minutes from start wall-clock to 23:59 same day.
    const wallH = get('hour');
    const wallMin = get('minute');
    const minutesIntoDay = wallH * 60 + wallMin;
    const minutesUntilEnd = 24 * 60 - minutesIntoDay - 1; // -1 to land on 23:59
    return Math.max(1, Math.min(MAX_DURATION_MIN, minutesUntilEnd));
  } catch {
    return null;
  }
};

export const Duration = ({
  formData,
  updateField,
  styles,
  setFieldRef,
  dateTimeValues,
  studioTimezone,
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [activePreset, setActivePreset] = useState(() => {
    // Try to map an existing duration back onto a preset, else 'custom'
    const d = formData.eventDuration;
    if (d == null || d === '') return null;
    const match = PRESETS.find((p) => p.minutes === Number(d));
    return match ? match.key : 'custom';
  });

  const startDate = dateTimeValues?.event?.value;
  const tz = studioTimezone || 'America/New_York';

  const currentMinutes = formData.eventDuration;

  const endTimeLabel = useMemo(() => {
    if (!startDate || currentMinutes == null) return null;
    const endMs = startDate.getTime() + Number(currentMinutes) * 60 * 1000;
    const end = new Date(endMs);
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: 'numeric',
        minute: '2-digit',
        weekday: 'short',
      }).format(end);
    } catch {
      return end.toLocaleString();
    }
  }, [startDate, currentMinutes, tz]);

  const handlePresetPress = (preset) => {
    if (preset.key === 'custom') {
      setActivePreset('custom');
      setShowPicker(true);
      return;
    }
    if (preset.key === 'all_day') {
      const minutes = minutesUntilEndOfDay(startDate, tz);
      if (minutes != null) {
        setActivePreset('all_day');
        updateField('eventDuration', minutes);
      }
      return;
    }
    setActivePreset(preset.key);
    updateField('eventDuration', preset.minutes);
  };

  const handleClear = () => {
    setActivePreset(null);
    updateField('eventDuration', null);
  };

  const handleCustomConfirm = (date) => {
    setShowPicker(false);
    if (!startDate) return;
    const diffMs = date.getTime() - startDate.getTime();
    const minutes = Math.round(diffMs / 60000);
    if (minutes <= 0) return; // ignore: end must be after start
    const clamped = Math.min(MAX_DURATION_MIN, minutes);
    updateField('eventDuration', clamped);
  };

  // Custom picker constraints: min = start + 1 minute, max = start + 7 days
  const pickerMinDate = startDate ? new Date(startDate.getTime() + 60 * 1000) : new Date();
  const pickerMaxDate = startDate
    ? new Date(startDate.getTime() + MAX_DURATION_MIN * 60 * 1000)
    : new Date(Date.now() + MAX_DURATION_MIN * 60 * 1000);
  const pickerInitial = startDate
    ? new Date(startDate.getTime() + 60 * 60 * 1000) // default to start + 1h
    : new Date();

  return (
    <View ref={setFieldRef && setFieldRef('eventDuration')}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>Duration</Text>
      </View>

      <View style={localStyles.row}>
        {PRESETS.map((preset) => {
          const isActive = activePreset === preset.key;
          return (
            <TouchableOpacity
              key={preset.key}
              onPress={() => handlePresetPress(preset)}
              style={[
                localStyles.chip,
                isActive && localStyles.chipActive,
              ]}
            >
              <Text
                style={[
                  localStyles.chipText,
                  isActive && localStyles.chipTextActive,
                ]}
              >
                {preset.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {currentMinutes != null && endTimeLabel && (
        <View style={localStyles.summaryRow}>
          <Text style={localStyles.summaryText}>
            Ends {endTimeLabel}
          </Text>
          <TouchableOpacity onPress={handleClear} style={localStyles.clearBtn}>
            <Text style={localStyles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      <DateTimePickerModal
        isVisible={showPicker}
        mode="datetime"
        date={pickerInitial}
        minimumDate={pickerMinDate}
        maximumDate={pickerMaxDate}
        onConfirm={handleCustomConfirm}
        onCancel={() => setShowPicker(false)}
        themeVariant="dark"
      />
    </View>
  );
};

const localStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: theme.colors.vibeBlue,
    backgroundColor: 'transparent',
  },
  chipActive: {
    backgroundColor: theme.colors.vibeBlue,
  },
  chipText: {
    color: theme.colors.vibeBlue,
    fontFamily: theme.fonts.main,
    fontWeight: '600',
    fontSize: 14,
  },
  chipTextActive: {
    color: theme.colors.textPrimary,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 4,
  },
  summaryText: {
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.main,
    fontSize: 14,
  },
  clearBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  clearText: {
    color: theme.colors.vibePink,
    fontFamily: theme.fonts.main,
    fontWeight: '600',
    fontSize: 13,
  },
});

export default Duration;
