// Host notification settings form component with custom reminder templates
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Keyboard,
} from 'react-native';
import { useVibeAlert } from '../ui/VibeAlertContext';
import VibeInput from '../ui/VibeInput';
import VibeDropdown from '../ui/VibeDropdown';
import VibeButton from '../ui/VibeButton';
import CustomTemplateService from '../../services/CustomTemplateService';
import theme from '../../theme/themes';

export default function HostNotificationSettingsForm({
  settings,
  onUpdateSettings,
  showCriticalUpdates = true,
  showEventUpdates = true,
  showEventActivity = true,
  showReminders = true,
  showSocialActivity = true,
  sectionStyle,
  scrollViewRef,
  isLoadingTemplates = false,
  currentUserId,
}) {
  const vibeAlert = useVibeAlert();
  const [showAddCustomForm, setShowAddCustomForm] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [customUnit, setCustomUnit] = useState('hours');
  const [isAddingReminder, setIsAddingReminder] = useState(false);

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

  // Default reminder templates for hosts
  const defaultReminderTemplates = [
    { id: '15min', amount: 15, unit: 'minutes', enabled: true, label: '15 min' },
    { id: '1hour', amount: 1, unit: 'hours', enabled: true, label: '1 hour' },
    { id: '1day', amount: 1, unit: 'days', enabled: false, label: '1 day' },
  ];

  // Get current reminder templates from settings, fallback to defaults
  const getCurrentTemplates = () => {
    const templates = settings?.reminderTemplates || [];
    console.log('[HostNotificationSettings] getCurrentTemplates - templates from settings:', templates.length, templates);
    console.log('[HostNotificationSettings] isLoadingTemplates:', isLoadingTemplates);
    
    // If no templates exist, return defaults (for new users)
    if (templates.length === 0) {
      console.log('[HostNotificationSettings] No templates, returning defaults');
      return defaultReminderTemplates;
    }
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
      [key]: !settings?.[key]
    });
  };

  const toggleReminder = (reminder) => {
    const currentTemplates = getCurrentTemplates();
    const updatedTemplates = currentTemplates.map(template => 
      template.id === reminder.id 
        ? { ...template, enabled: !template.enabled }
        : template
    );
    
    onUpdateSettings({
      ...settings,
      reminderTemplates: updatedTemplates
    });
  };

  const deleteCustomReminder = async (template) => {
    const currentTemplates = getCurrentTemplates();
    const updatedTemplates = currentTemplates.filter(t => t.id !== template.id);
    
    // Update local settings immediately
    onUpdateSettings({
      ...settings,
      reminderTemplates: updatedTemplates
    });

    // Auto-remove from global store if it's a custom template
    if (currentUserId && template.id.startsWith('custom_')) {
      try {
        console.log('[HostNotificationSettings] Auto-removing custom reminder from global store:', template.label);
        await CustomTemplateService.removeCustomTemplate(currentUserId, template.id);
      } catch (error) {
        console.warn('[HostNotificationSettings] Failed to auto-remove custom reminder from global store:', error);
        // Don't show error to user - local functionality still works
      }
    }
  };

  const addCustomReminder = async () => {
    if (isAddingReminder) {
      console.log('[HostNotificationSettings] Already adding reminder, ignoring click');
      return; // Prevent double-clicks
    }
    
    // Dismiss keyboard first to prevent the "first tap dismisses keyboard, second tap registers" issue
    Keyboard.dismiss();
    
    setIsAddingReminder(true);
    
    try {
      const amount = parseInt(customAmount);
      
      // Validation
      if (!customAmount || (typeof customAmount !== 'string') || customAmount.trim() === '') {
        vibeAlert.warning('Invalid Input', 'Please enter a number');
        return;
      }
      
      if (!amount || amount <= 0) {
        vibeAlert.warning('Invalid Input', 'Please enter a number greater than 0');
        return;
      }
      
      if (amount > 999) {
        vibeAlert.warning('Invalid Input', 'Please enter a number less than 1000');
        return;
      }

      const currentTemplates = getCurrentTemplates();
      
      // Check for duplicates
      const duplicate = currentTemplates.find(r => r.amount === amount && r.unit === customUnit);
      if (duplicate) {
        const unitLabels = {
          'minutes': 'min',
          'hours': amount === 1 ? 'hour' : 'hours',
          'days': amount === 1 ? 'day' : 'days',
          'weeks': amount === 1 ? 'week' : 'weeks',
          'months': amount === 1 ? 'month' : 'months'
        };
        const unitText = unitLabels[customUnit] || customUnit;
        vibeAlert.warning('Duplicate Reminder', `A reminder for "${amount} ${unitText}" already exists`);
        return;
      }

      // Convert to consistent short form labels
      const unitLabels = {
        'minutes': 'min',
        'hours': amount === 1 ? 'hour' : 'hours',
        'days': amount === 1 ? 'day' : 'days',
        'weeks': amount === 1 ? 'week' : 'weeks',
        'months': amount === 1 ? 'month' : 'months'
      };
      const unitText = unitLabels[customUnit] || customUnit;
      const newReminder = {
        id: `custom_${Date.now()}`,
        amount,
        unit: customUnit,
        enabled: true,
        label: `${amount} ${unitText}`
      };

      const updatedTemplates = [...currentTemplates, newReminder];
      
      // Update local settings immediately
      onUpdateSettings({
        ...settings,
        reminderTemplates: updatedTemplates
      });

      // Auto-save to global store for future use
      if (currentUserId) {
        try {
          console.log('[HostNotificationSettings] Auto-saving custom reminder to global store:', newReminder.label);
          await CustomTemplateService.saveCustomTemplates(currentUserId, [newReminder]);
        } catch (error) {
          console.warn('[HostNotificationSettings] Failed to auto-save custom reminder to global store:', error);
          // Don't show error to user - local functionality still works
        }
      }

      // Reset form
      setCustomAmount('');
      setCustomUnit('hours');
      setShowAddCustomForm(false);
      
    } finally {
      setIsAddingReminder(false);
    }
  };

  const SettingItem = ({ title, description, value, onToggle, disabled = false, isLast = false }) => (
    <View style={[styles.settingItem, !isLast && styles.settingBorder]}>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, disabled && styles.disabledText]}>{title}</Text>
        <Text style={[styles.settingDescription, disabled && styles.disabledText]}>
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
      {/* Master Toggle for Host Notifications */}
      <View style={[styles.section, sectionStyle]}>
        <Text style={styles.sectionTitle}>HOST NOTIFICATIONS</Text>
        <View style={styles.settingsGroup}>
          <SettingItem
            title="Enable Host Notifications"
            description="Turn on notifications for events you're hosting"
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
        <View style={[styles.section, sectionStyle]}>
          <Text style={styles.sectionTitle}>CUSTOM REMINDERS</Text>
          <View style={styles.settingsGroup}>
              <View style={styles.quickRemindersContainer}>
                {isLoadingTemplates ? (
                  <Text style={styles.loadingText}>Loading saved templates...</Text>
                ) : (
                <View style={styles.quickRemindersButtons}>
                  {/* Show all reminder templates */}
                  {getCurrentTemplates().map((template) => (
                    <TouchableOpacity
                      key={template.id}
                      style={[
                        styles.reminderButton,
                        template.enabled ? styles.reminderButtonEnabled : styles.reminderButtonDisabled
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
                      <Text style={[
                        styles.reminderButtonText,
                        template.enabled ? styles.reminderButtonTextEnabled : styles.reminderButtonTextDisabled
                      ]}>
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
                  <Text style={styles.addCustomFormTitle}>Add Custom Reminder</Text>
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
                        setCustomUnit('hours');
                      }}
                      variant="toggle"
                      color="gray"
                      style={styles.cancelButton}
                    />
                    <VibeButton
                      label={isAddingReminder ? "Adding..." : "Add"}
                      onPress={addCustomReminder}
                      variant="toggle"
                      color="green"
                      disabled={isAddingReminder || !customAmount || parseInt(customAmount) <= 0}
                      style={[
                        styles.addReminderButton,
                        (isAddingReminder || !customAmount || parseInt(customAmount) <= 0) && styles.addReminderButtonDisabled
                      ]}
                    />
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

      {/* Event Activity - Host-specific notifications */}
      {showEventActivity && (
        <View style={[styles.section, sectionStyle, styles.lastSection]}>
          <Text style={styles.sectionTitle}>EVENT ACTIVITY</Text>
          <View style={styles.settingsGroup}>
            <SettingItem
              title="Guest Joins Event"
              description="Notify when someone joins your event"
              value={settings?.notifyOnJoin ?? true}
              onToggle={() => toggleSetting('notifyOnJoin')}
            />
            <SettingItem
              title="Guest Leaves Event"
              description="Notify when someone leaves your event"
              value={settings?.notifyOnLeave ?? true}
              onToggle={() => toggleSetting('notifyOnLeave')}
            />
            <SettingItem
              title="Guest Comments"
              description="Notify when guests comment on your event"
              value={settings?.newComments ?? true}
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
}

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
  },
  lastSection: {
    marginBottom: 25, // Extra margin at bottom for last section
  },
  sectionTitle: {
    color: theme.colors.vibeGreen,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 1,
  },
  settingsGroup: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: theme.sizes.borderRadius,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    overflow: 'visible',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
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