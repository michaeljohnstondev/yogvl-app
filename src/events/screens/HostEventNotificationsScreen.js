// HostEventNotificationsScreen.js

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ScreenHeader } from '../../components/ui/layout';
import { useVibeAlert } from '../../components/ui/base/VibeAlertContext';
import VibeInput from '../../components/ui/base/VibeInput';
import VibeDropdown from '../../components/ui/base/VibeDropdown';
import { VibeButton } from '../../components/ui';
import CustomTemplateService from '../../services/CustomTemplateService';
import theme from '../../theme/themes';

export default function HostEventNotificationsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const vibeAlert = useVibeAlert();

  const { notificationSettings, currentUserId, userContext = 'hosting' } =
    route.params;

  // Memoize default settings to ensure stable reference
  const defaultSettings = useMemo(() => ({
    enabled: true,
    notifyOnJoin: true,
    notifyOnLeave: true,
    newComments: true,
    eventRecap: false,
    attendanceReminders: 'none',
    reminderTemplates: {}, // Use object instead of array to match expected structure
  }), []);

  // Memoize initial settings to ensure stable reference
  const initialSettings = useMemo(() =>
    notificationSettings || defaultSettings,
    [notificationSettings, defaultSettings]
  );
  const [localSettings, setLocalSettings] = useState(initialSettings);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const scrollViewRef = useRef(null);

  // Custom reminder form state
  const [showAddCustomForm, setShowAddCustomForm] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [customUnit, setCustomUnit] = useState('minutes');
  const [isAddingReminder, setIsAddingReminder] = useState(false);

  // Auto-save - update parent form immediately when local settings change
  const isFirstRender = useRef(true);
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    // Skip saving on first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounced save after 500ms
    saveTimeoutRef.current = setTimeout(() => {
      // Only save if settings have actually changed from initial values
      if (JSON.stringify(localSettings) !== JSON.stringify(initialSettings)) {
        // Navigate back to CreateEvent with updated settings
        // Note: navigation.emit() is not supported in React Navigation v7
        navigation.navigate('CreateEvent', {
          updatedNotificationSettings: localSettings,
          timestamp: Date.now() // Force re-render on CreateEventForm
        });
      }
    }, 500);

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [localSettings, navigation, initialSettings]);

  // Initialize settings from route params
  useEffect(() => {
    if (notificationSettings) {
      setLocalSettings(notificationSettings);
    } else {
      setLocalSettings(defaultSettings);
    }

    // Set loading to false after initialization
    setIsLoadingTemplates(false);
  }, [notificationSettings, defaultSettings]);

  // Toggle functions
  const toggleSetting = (key) => {
    setLocalSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Handle attendance reminder selection
  const handleAttendanceReminderChange = (value) => {
    setLocalSettings((prev) => ({
      ...prev,
      attendanceReminders: value,
    }));
  };

  // Custom reminder functionality
  const handleShowAddForm = () => {
    setShowAddCustomForm(true);
    // Scroll down to show the form
    setTimeout(() => {
      if (scrollViewRef?.current) {
        scrollViewRef.current.scrollTo({
          y: 450,
          animated: true,
        });
      }
    }, 150);
  };

  // Available reminder template options
  const availableTemplates = [
    { id: '15min', amount: 15, unit: 'minutes', label: '15 min' },
    { id: '30min', amount: 30, unit: 'minutes', label: '30 min' },
    { id: '1hour', amount: 1, unit: 'hours', label: '1 hour' },
    { id: '2hour', amount: 2, unit: 'hours', label: '2 hours' },
    { id: '1day', amount: 1, unit: 'days', label: '1 day' },
    { id: '1week', amount: 1, unit: 'weeks', label: '1 week' },
  ];

  // Convert template ID back to display info
  const parseTemplateId = (templateId) => {
    // Handle built-in templates
    const builtIn = availableTemplates.find(t => t.id === templateId);
    if (builtIn) {
      return builtIn;
    }

    // Handle custom templates with new format (e.g., "5m", "2h", "3d")
    const match = templateId.match(/^(\d+)([mhdwy])$/);
    if (match) {
      const [, amount, unitChar] = match;
      const unitMap = {
        m: 'minutes',
        h: 'hours',
        d: 'days',
        w: 'weeks',
        y: 'months'
      };
      const unit = unitMap[unitChar] || 'minutes';
      const unitLabels = {
        minutes: 'min',
        hours: parseInt(amount) === 1 ? 'hour' : 'hours',
        days: parseInt(amount) === 1 ? 'day' : 'days',
        weeks: parseInt(amount) === 1 ? 'week' : 'weeks',
        months: parseInt(amount) === 1 ? 'month' : 'months',
      };

      return {
        id: templateId,
        amount: parseInt(amount),
        unit: unit,
        label: `${amount} ${unitLabels[unit]}`
      };
    }

    // Fallback for unknown format
    return {
      id: templateId,
      amount: 0,
      unit: 'minutes',
      label: templateId
    };
  };

  // Get current reminder templates - show templates that have been set (true or false)
  const getCurrentTemplates = () => {
    const templateSettings = localSettings?.reminderTemplates || {};

    // Show templates that have been explicitly set (true or false), not undefined
    const templates = Object.keys(templateSettings)
      .filter(templateId => templateSettings.hasOwnProperty(templateId)) // Has been set
      .map(templateId => ({
        ...parseTemplateId(templateId),
        enabled: templateSettings[templateId]
      }))
      .sort((a, b) => {
        // Convert to minutes for chronological sorting
        const getMinutes = (template) => {
          const { amount, unit } = template;
          switch (unit) {
            case 'minutes': return amount;
            case 'hours': return amount * 60;
            case 'days': return amount * 60 * 24;
            case 'weeks': return amount * 60 * 24 * 7;
            case 'months': return amount * 60 * 24 * 30;
            case 'years': return amount * 60 * 24 * 365;
            default: return amount;
          }
        };

        return getMinutes(a) - getMinutes(b); // Ascending order (shortest to longest)
      });

    return templates;
  };

  const customUnitOptions = [
    { label: 'Minutes', value: 'minutes' },
    { label: 'Hours', value: 'hours' },
    { label: 'Days', value: 'days' },
    { label: 'Weeks', value: 'weeks' },
    { label: 'Months', value: 'months' },
  ];

  // Attendance reminder options (removed 'casual', made 'none' default)
  const attendanceReminderOptions = [
    { label: 'None', value: 'none' },
    { label: 'Strict Events Only', value: 'strict' },
    { label: 'Both Event Types', value: 'both' },
  ];

  const toggleReminder = (reminder) => {
    const currentSettings = localSettings?.reminderTemplates || {};
    const updatedSettings = {
      ...currentSettings,
      [reminder.id]: !currentSettings[reminder.id]
    };

    // Keep the key in the object, just toggle true/false
    // Don't delete disabled templates - keep them as false
    setLocalSettings({
      ...localSettings,
      reminderTemplates: updatedSettings,
    });
  };

  const deleteCustomReminder = async (template) => {
    const currentSettings = localSettings?.reminderTemplates || {};
    const updatedSettings = { ...currentSettings };

    // Remove the template from settings
    delete updatedSettings[template.id];

    // Update local settings immediately
    setLocalSettings({
      ...localSettings,
      reminderTemplates: updatedSettings,
    });

    // Background cleanup for custom templates
    if (currentUserId && template.id.startsWith('custom_')) {
      try {
        await CustomTemplateService.removeCustomTemplate(
          currentUserId,
          template.id,
          userContext
        );
      } catch (error) {
        console.warn(
          '[HostEventNotifications] Failed to auto-remove custom reminder from global store:',
          error
        );
        // Don't show error to user - local functionality still works
      }
    }
  };

  const addCustomReminder = async () => {
    if (isAddingReminder) {
      return; // Prevent double-clicks
    }

    // Dismiss keyboard first to prevent the "first tap dismisses keyboard, second tap registers" issue
    Keyboard.dismiss();

    setIsAddingReminder(true);

    try {
      const amount = parseInt(customAmount);

      // Validation
      if (
        !customAmount ||
        typeof customAmount !== 'string' ||
        customAmount.trim() === ''
      ) {
        vibeAlert.warning('Invalid Input', 'Please enter a number');
        return;
      }

      if (!amount || amount <= 0) {
        vibeAlert.warning(
          'Invalid Input',
          'Please enter a number greater than 0'
        );
        return;
      }

      if (amount > 999) {
        vibeAlert.warning(
          'Invalid Input',
          'Please enter a number less than 1000'
        );
        return;
      }

      // Create template ID based on amount and unit
      const templateId = `${amount}${customUnit.charAt(0)}`;
      const currentSettings = localSettings?.reminderTemplates || {};

      // Check for duplicates - see if this template ID already exists
      if (currentSettings[templateId]) {
        const unitLabels = {
          minutes: 'min',
          hours: amount === 1 ? 'hour' : 'hours',
          days: amount === 1 ? 'day' : 'days',
          weeks: amount === 1 ? 'week' : 'weeks',
          months: amount === 1 ? 'month' : 'months',
        };
        const unitText = unitLabels[customUnit] || customUnit;
        vibeAlert.warning(
          'Duplicate Reminder',
          `A reminder for "${amount} ${unitText}" already exists`
        );
        return;
      }

      const updatedSettings = {
        ...currentSettings,
        [templateId]: true
      };

      // Update local settings immediately
      setLocalSettings({
        ...localSettings,
        reminderTemplates: updatedSettings,
      });

      // Auto-save to global store for future use (background operation)
      if (currentUserId) {
        try {
          await CustomTemplateService.saveTemplateSettings(currentUserId, updatedSettings, userContext);
        } catch (error) {
          console.warn(
            '[HostEventNotifications] Failed to auto-save custom reminder to global store:',
            error
          );
          // Don't show error to user - local functionality still works
        }
      }

      // Reset form
      setCustomAmount('');
      setCustomUnit('minutes');
      setShowAddCustomForm(false);
    } finally {
      setIsAddingReminder(false);
    }
  };

  const SettingItem = ({
    title,
    description,
    value,
    onToggle,
    disabled = false,
    isLast = false,
  }) => (
    <View style={[styles.settingItem, !isLast && styles.settingBorder]}>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, disabled && styles.disabledText]}>
          {title}
        </Text>
        <Text
          style={[styles.settingDescription, disabled && styles.disabledText]}
        >
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{
          false: theme.colors.darkGray,
          true: theme.colors.vibeGreen,
        }}
        thumbColor={value ? theme.colors.white : theme.colors.gray}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScreenHeader
        title="Event Notifications"
        onClose={() => navigation.goBack()}
        showBorder={true}
        showCloseButton={true}
      />

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Enable/Disable Toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>EVENT NOTIFICATIONS</Text>
          <View style={styles.settingsGroup}>
            <SettingItem
              title="Enable Notifications"
              description="Turn on notifications for this event"
              value={localSettings?.enabled ?? true}
              onToggle={() => toggleSetting('enabled')}
              isLast
            />
          </View>
        </View>

        {/* Only show other settings if notifications are enabled */}
        {(localSettings?.enabled ?? true) && (
          <>
            {/* Custom Reminder Templates */}
            <View style={[styles.section, styles.remindersSection]}>
              <Text style={styles.sectionTitle}>CUSTOM REMINDERS</Text>
              <View style={styles.settingsGroup}>
                <View style={styles.quickRemindersContainer}>
                  {isLoadingTemplates ? (
                    <Text style={styles.loadingText}>
                      Loading saved templates...
                    </Text>
                  ) : (
                    <View style={styles.quickRemindersButtons}>
                      {/* Show all reminder templates */}
                      {getCurrentTemplates().map((template) => (
                        <TouchableOpacity
                          key={template.id}
                          style={[
                            styles.reminderButton,
                            template.enabled
                              ? styles.reminderButtonEnabled
                              : styles.reminderButtonDisabled,
                          ]}
                          onPress={() => toggleReminder(template)}
                          onLongPress={() => {
                            vibeAlert.confirm(
                              'Delete Reminder',
                              `Remove "${template.label}" reminder completely?`,
                              () => deleteCustomReminder(template)
                            );
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.reminderButtonText,
                              template.enabled
                                ? styles.reminderButtonTextEnabled
                                : styles.reminderButtonTextDisabled,
                            ]}
                          >
                            {template.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Add Custom Reminder */}
                {!showAddCustomForm ? (
                  <VibeButton
                    label="+ Add Custom Reminder"
                    onPress={handleShowAddForm}
                    variant="toggle"
                    color="blue"
                    style={styles.addCustomButton}
                  />
                ) : (
                  <View style={styles.addCustomForm}>
                    <Text style={styles.addCustomFormTitle}>
                      Add Custom Reminder
                    </Text>
                    <View style={styles.customFormRow}>
                      <VibeInput
                        value={customAmount}
                        onChangeText={(text) => {
                          // Only allow numbers
                          const numericValue = text.replace(/[^0-9]/g, '');
                          setCustomAmount(numericValue);
                        }}
                        keyboardType="numeric"
                        autoComplete="off"
                        textContentType="none"
                        importantForAutofill="no"
                        autoCorrect={false}
                        autoCapitalize="none"
                        spellCheck={false}
                        dataDetectorTypes="none"
                        maxLength={3}
                        autoFocus={true}
                        style={styles.customAmountInput}
                      />
                      <VibeDropdown
                        options={customUnitOptions}
                        selectedValue={customUnit}
                        onSelect={setCustomUnit}
                        placeholder="Select unit"
                        style={styles.customUnitSelector}
                        hideSelectedFromList={true}
                      />
                    </View>
                    <View style={styles.customFormButtons}>
                      <VibeButton
                        label="Cancel"
                        onPress={() => {
                          setShowAddCustomForm(false);
                          setCustomAmount('');
                          setCustomUnit('minutes');
                        }}
                        variant="toggle"
                        color="gray"
                        style={styles.cancelButton}
                      />
                      <VibeButton
                        label={isAddingReminder ? 'Adding...' : 'Add'}
                        onPress={addCustomReminder}
                        variant="toggle"
                        color="green"
                        disabled={
                          isAddingReminder ||
                          !customAmount ||
                          parseInt(customAmount) <= 0
                        }
                        style={[
                          styles.addReminderButton,
                          (isAddingReminder ||
                            !customAmount ||
                            parseInt(customAmount) <= 0) &&
                            styles.addReminderButtonDisabled,
                        ]}
                      />
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Event Activity Settings - Only show if notifications are enabled */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>EVENT ACTIVITY</Text>
              <View style={styles.settingsGroup}>
                <SettingItem
                  title="Someone Joins"
                  description="Notify when guests or cohosts join this event"
                  value={localSettings?.notifyOnJoin ?? true}
                  onToggle={() => toggleSetting('notifyOnJoin')}
                />
                <SettingItem
                  title="Someone Leaves"
                  description="Notify when guests or cohosts leave this event"
                  value={localSettings?.notifyOnLeave ?? true}
                  onToggle={() => toggleSetting('notifyOnLeave')}
                />
                <SettingItem
                  title="Someone Comments"
                  description="Notify when guests or cohosts comment on this event"
                  value={localSettings?.newComments ?? true}
                  onToggle={() => toggleSetting('newComments')}
                  isLast
                />
              </View>
            </View>

            {/* Post-event Settings - Only show if notifications are enabled */}
            <View style={[styles.section, styles.lastSection]}>
              <Text style={styles.sectionTitle}>POST-EVENT</Text>
              <View style={styles.settingsGroup}>
                <View style={[styles.settingItem, styles.settingBorder]}>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>Attendance Reminders</Text>
                    <Text style={styles.settingDescription}>
                      When to send attendance reminder notifications after events
                    </Text>
                  </View>
                  <View style={styles.dropdownContainer}>
                    <VibeDropdown
                      options={attendanceReminderOptions}
                      selectedValue={localSettings?.attendanceReminders ?? 'none'}
                      onSelect={handleAttendanceReminderChange}
                      placeholder="Select option"
                      style={styles.attendanceDropdown}
                      hideSelectedFromList={true}
                    />
                  </View>
                </View>
                <SettingItem
                  title="Event Recap"
                  description="Send a summary notification after this event ends"
                  value={localSettings?.eventRecap ?? false}
                  onToggle={() => toggleSetting('eventRecap')}
                  isLast
                />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 20,
  },
  remindersSection: {
    zIndex: 99,
    elevation: 99,
  },
  lastSection: {
    marginBottom: 25, // Extra margin at bottom for last section
  },
  sectionTitle: {
    color: theme.colors.vibeGreen,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 10,
  },
  settingsGroup: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: theme.sizes.borderRadius,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    overflow: 'visible',
    zIndex: 1,
    elevation: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    zIndex: 1,
    elevation: 1,
  },
  settingBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.inputBorder,
  },
  settingContent: {
    flex: 1,
    marginRight: 15,
  },
  settingTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  settingDescription: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  disabledText: {
    opacity: 0.6,
  },
  dropdownContainer: {
    minWidth: 140,
    zIndex: 1000,
    elevation: 1000,
  },
  attendanceDropdown: {
    minWidth: 140,
  },
  quickRemindersContainer: {
    marginBottom: 16,
    padding: 16,
    overflow: 'visible',
    zIndex: 1001,
    elevation: 1001,
  },
  quickRemindersButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reminderButton: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reminderButtonEnabled: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderColor: theme.colors.vibeBlue,
  },
  reminderButtonDisabled: {
    backgroundColor: theme.colors.inputBackground,
    borderColor: theme.colors.inputBorder,
  },
  reminderButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  reminderButtonTextEnabled: {
    color: theme.colors.vibeBlue,
    fontWeight: '600',
  },
  reminderButtonTextDisabled: {
    color: theme.colors.textSecondary,
  },
  addCustomButton: {
    marginTop: 8,
  },
  addCustomForm: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    overflow: 'visible',
    zIndex: 1000,
    elevation: 1000,
  },
  addCustomFormTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  customFormRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    zIndex: 99,
    elevation: 99,
  },
  customAmountInput: {
    width: 60,
    textAlign: 'center',
  },
  customUnitSelector: {
    flex: 1,
  },
  customFormButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  addReminderButton: {
    flex: 1,
  },
  addReminderButtonDisabled: {
    opacity: 0.5,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
});
