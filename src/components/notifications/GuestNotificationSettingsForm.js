// Guest/attendee notification settings form component with custom reminder templates
import React, { useState, memo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Keyboard,
} from 'react-native';
import { useVibeAlert } from '../ui/base/VibeAlertContext';
import VibeInput from '../ui/base/VibeInput';
import VibeDropdown from '../ui/base/VibeDropdown';
import { VibeButton } from '../ui';
import CustomTemplateService from '../../services/CustomTemplateService';
import theme from '../../theme/themes';

const GuestNotificationSettingsForm = memo(function GuestNotificationSettingsForm({
  settings,
  onUpdateSettings,
  showCriticalUpdates = true,
  showEventUpdates = true,
  showReminders = true,
  showSocialActivity = true,
  sectionStyle,
  scrollViewRef,
  isLoadingTemplates = false,
  currentUserId,
  userContext = 'attending', // 'hosting' or 'attending' - determines which templates to load
}) {
  const vibeAlert = useVibeAlert();
  const [showAddCustomForm, setShowAddCustomForm] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [customUnit, setCustomUnit] = useState('minutes');
  const [isAddingReminder, setIsAddingReminder] = useState(false);

  const handleShowAddForm = useCallback(() => {
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
  }, [scrollViewRef]);

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
    const match = templateId.match(/^(\d+)([mhdwx])$/);
    if (match) {
      const [, amount, unitChar] = match;
      const unitMap = {
        m: 'minutes',
        h: 'hours',
        d: 'days',
        w: 'weeks',
        x: 'months'
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
    const templateSettings = settings?.reminderTemplates || {};
    console.log(
      '[GuestNotificationSettings] getCurrentTemplates - template settings:',
      templateSettings
    );
    console.log(
      '[GuestNotificationSettings] isLoadingTemplates:',
      isLoadingTemplates
    );

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

    console.log(
      '[GuestNotificationSettings] Templates with explicit state (sorted):',
      templates
    );

    return templates;
  };

  const customUnitOptions = [
    { label: 'Minutes', value: 'minutes' },
    { label: 'Hours', value: 'hours' },
    { label: 'Days', value: 'days' },
    { label: 'Weeks', value: 'weeks' },
    { label: 'Months', value: 'months' },
  ];

  const toggleSetting = (key) => {
    onUpdateSettings({
      ...settings,
      [key]: !settings?.[key],
    });
  };

  const toggleReminder = (reminder) => {
    const currentSettings = settings?.reminderTemplates || {};
    const updatedSettings = {
      ...currentSettings,
      [reminder.id]: !currentSettings[reminder.id]
    };

    // Keep the key in the object, just toggle true/false
    // Don't delete disabled templates - keep them as false

    onUpdateSettings({
      ...settings,
      reminderTemplates: updatedSettings,
    });
  };

  const deleteCustomReminder = async (template) => {
    const currentSettings = settings?.reminderTemplates || {};
    const updatedSettings = { ...currentSettings };

    // Remove the template from settings
    delete updatedSettings[template.id];

    // Update local settings immediately
    onUpdateSettings({
      ...settings,
      reminderTemplates: updatedSettings,
    });

    // Auto-remove from global store if it's a custom template
    if (currentUserId && template.id.startsWith('custom_')) {
      try {
        console.log(
          '[GuestNotificationSettings] Auto-removing custom reminder from global store:',
          template.label
        );
        await CustomTemplateService.removeCustomTemplate(
          currentUserId,
          template.id,
          userContext
        );
      } catch (error) {
        console.warn(
          '[GuestNotificationSettings] Failed to auto-remove custom reminder from global store:',
          error
        );
        // Don't show error to user - local functionality still works
      }
    }
  };

  const addCustomReminder = async () => {
    if (isAddingReminder) {
      console.log(
        '[GuestNotificationSettings] Already adding reminder, ignoring click'
      );
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
      // Use proper unit abbreviations: m=minutes, h=hours, d=days, w=weeks, x=months (y reserved for years)
      const unitAbbreviation = {
        minutes: 'm',
        hours: 'h',
        days: 'd',
        weeks: 'w',
        months: 'x',
      };
      const templateId = `${amount}${unitAbbreviation[customUnit]}`;
      const currentSettings = settings?.reminderTemplates || {};

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
      onUpdateSettings({
        ...settings,
        reminderTemplates: updatedSettings,
      });

      // Auto-save to global store for future use
      if (currentUserId) {
        try {
          console.log(
            '[GuestNotificationSettings] Auto-saving custom reminder to global store:',
            templateId
          );
          await CustomTemplateService.saveTemplateSettings(currentUserId, updatedSettings, userContext);
        } catch (error) {
          console.warn(
            '[GuestNotificationSettings] Failed to auto-save custom reminder to global store:',
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
    <>
      {/* Master Toggle for Attendee Notifications */}
      <View style={[styles.section, sectionStyle]}>
        <Text style={styles.sectionTitle}>GUEST NOTIFICATIONS</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            title="Enable Notifications"
            description="Turn on notifications for events you're attending"
            value={settings?.enabled ?? true}
            onToggle={() => toggleSetting('enabled')}
            isLast
          />
        </View>
      </View>

      {/* Only show other settings if notifications are enabled */}
      {(settings?.enabled ?? true) && (
        <>
          {/* Critical Updates - Always On */}
          {showCriticalUpdates && (
        <View style={[styles.section, sectionStyle]}>
          <Text style={styles.sectionTitle}>CRITICAL UPDATES</Text>
          <View style={styles.settingsGroup}>
            <SettingItem
              title="Event Cancellation"
              description="Important: Always receive cancellation notices"
              value={true}
              onToggle={() => {}} // No-op
              disabled={true}
              isLast
            />
          </View>
        </View>
      )}


      {/* Custom Reminder Templates */}
      {showReminders && (
        <View style={[styles.section, sectionStyle, styles.remindersSection]}>
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
              <TouchableOpacity
                onPress={handleShowAddForm}
                style={styles.addCustomButton}
              >
                <Text style={styles.addCustomButtonText}>+ Add Custom Reminder</Text>
              </TouchableOpacity>
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
      )}

      {/* Event Activity */}
      {showSocialActivity && (
        <View style={[styles.section, sectionStyle]}>
          <Text style={styles.sectionTitle}>EVENT ACTIVITY</Text>
          <View style={styles.settingsGroup}>
            <SettingItem
              title="Host Changes"
              description="Time, location, details, fees, and other event changes"
              value={settings?.hostChanges ?? true}
              onToggle={() => toggleSetting('hostChanges')}
            />
            <SettingItem
              title="Host Comments"
              description="Comments from the event host"
              // TODO: Implement batching after first comment
              value={settings?.hostComments ?? true}
              onToggle={() => toggleSetting('hostComments')}
            />
            <SettingItem
              title="Other Comments"
              description="Comments from attendees"
              // TODO: Implement batching after first comment
              value={settings?.newComments ?? false}
              onToggle={() => toggleSetting('newComments')}
              isLast
            />
          </View>
        </View>
      )}
        </>
      )}
    </>
  );
});

export default GuestNotificationSettingsForm;

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
  },
  remindersSection: {
    zIndex: 99,
    elevation: 99,
  },
  sectionTitle: {
    color: theme.colors.vibeCyan,
    fontSize: 12,
    fontFamily: theme.fonts.comicBold,
    letterSpacing: 1,
    marginBottom: 10,
  },
  settingsGroup: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: theme.sizes.borderRadius,
    borderWidth: 3,
    borderColor: theme.colors.vibeBlue,
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
    paddingVertical: 12,
    alignItems: 'center',
  },
  addCustomButtonText: {
    color: theme.colors.vibeBlue,
    fontSize: 14,
    fontWeight: '600',
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
