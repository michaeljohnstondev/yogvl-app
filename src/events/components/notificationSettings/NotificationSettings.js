// FILE: events/components/notificationSettings/NotificationSettings.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Switch,
  ScrollView,
} from 'react-native';
import VibeButton from '../../../components/ui/VibeButton';
import VibeInput from '../../../components/ui/VibeInput';
import VibeSegmentedControl from '../../../components/ui/VibeSegmentedControl';
import CloseButton from '../../../components/ui/CloseButton';
import theme from '../../../theme/themes';

export default function NotificationSettings({
  visible,
  onClose,
  notificationSettings,
  onUpdateSettings,
  userDefaults = {},
  currentUserId,
  eventDateTime,
}) {
  const defaultSettings = {
    enabled: true,
    notifyOnJoin: true,
    notifyOnLeave: true,
    newComments: true,
    customReminders: [],
    quickReminders: []
  };
  
  const [localSettings, setLocalSettings] = useState(notificationSettings || defaultSettings);
  const [showAddCustomForm, setShowAddCustomForm] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [customUnit, setCustomUnit] = useState('hours');
  const [customLabel, setCustomLabel] = useState('');

  // Update local settings when prop changes
  useEffect(() => {
    if (notificationSettings) {
      setLocalSettings(notificationSettings);
    }
  }, [notificationSettings]);

  const quickReminderOptions = [
    { label: '15 min', value: { amount: 15, unit: 'minutes' } },
    { label: '1 hour', value: { amount: 1, unit: 'hours' } },
    { label: '1 day', value: { amount: 1, unit: 'days' } },
  ];

  const customUnitOptions = [
    { label: 'Min', value: 'minutes' },
    { label: 'Hours', value: 'hours' },
    { label: 'Days', value: 'days' },
    { label: 'Weeks', value: 'weeks' },
    { label: 'Months', value: 'months' },
  ];

  const toggleSetting = (key) => {
    setLocalSettings(prev => ({
      ...defaultSettings,
      ...prev,
      [key]: !prev?.[key]
    }));
  };

  const toggleQuickReminder = (reminderOption) => {
    setLocalSettings(prev => {
      const currentQuick = prev.quickReminders || [];
      const isSelected = currentQuick.some(r => 
        r.amount === reminderOption.amount && r.unit === reminderOption.unit
      );
      
      let newQuickReminders;
      if (isSelected) {
        // Remove it
        newQuickReminders = currentQuick.filter(r => 
          !(r.amount === reminderOption.amount && r.unit === reminderOption.unit)
        );
      } else {
        // Add it
        newQuickReminders = [...currentQuick, {
          id: Date.now().toString(),
          amount: reminderOption.amount,
          unit: reminderOption.unit,
          type: 'quick'
        }];
      }
      
      return {
        ...defaultSettings,
        ...prev,
        quickReminders: newQuickReminders
      };
    });
  };

  const addCustomReminder = () => {
    const amount = parseInt(customAmount);
    if (!amount || amount <= 0) return;

    const newReminder = {
      id: Date.now().toString(),
      amount,
      unit: customUnit,
      label: customLabel.trim() || null,
      type: 'custom'
    };

    setLocalSettings(prev => ({
      ...defaultSettings,
      ...prev,
      customReminders: [...(prev.customReminders || []), newReminder]
    }));

    // Reset form
    setCustomAmount('');
    setCustomLabel('');
    setShowAddCustomForm(false);
  };

  const removeCustomReminder = (reminderId) => {
    setLocalSettings(prev => ({
      ...defaultSettings,
      ...prev,
      customReminders: prev.customReminders.filter(r => r.id !== reminderId)
    }));
  };

  const formatReminderText = (reminder) => {
    const { amount, unit, label } = reminder;
    const unitText = amount === 1 ? unit.slice(0, -1) : unit; // Remove 's' if amount is 1
    const reminderText = `${amount} ${unitText} before`;
    return label ? `${reminderText} - "${label}"` : reminderText;
  };

  const saveAsDefaults = async () => {
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../../../auth/services/firebase');
      
      if (!currentUserId) {
        console.error('No user ID available');
        return;
      }

      // Save current local settings as user defaults
      const userRef = doc(db, 'users', currentUserId);
      await updateDoc(userRef, {
        'userdata.settings.notifications.hosting': {
          enabled: localSettings?.enabled ?? true,
          notifyOnJoin: localSettings?.notifyOnJoin ?? true,
          notifyOnLeave: localSettings?.notifyOnLeave ?? true,
          newComments: localSettings?.newComments ?? true,
          quickReminders: localSettings?.quickReminders ?? [],
          customReminders: localSettings?.customReminders ?? [],
        }
      });

      console.log('Successfully saved notification defaults');
      // Could add a success message here if needed
    } catch (error) {
      console.error('Failed to save notification defaults:', error);
      // Could add an error message here if needed
    }
  };

  const handleSave = () => {
    onUpdateSettings(localSettings);
    onClose();
  };

  const SettingItem = ({ title, description, value, onToggle, isLast = false }) => (
    <View style={[styles.settingItem, !isLast && styles.settingBorder]}>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{
          false: theme.colors.darkGray,
          true: theme.colors.vibeGreen,
        }}
        thumbColor={value ? theme.colors.white : theme.colors.gray}
      />
    </View>
  );

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
          <Text style={styles.headerTitle}>Notification Settings</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Master Toggle */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
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

          {localSettings?.enabled && (
            <>
              {/* Event Activity */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>EVENT ACTIVITY</Text>
                <View style={styles.settingsGroup}>
                  <SettingItem
                    title="Guest Joins Event"
                    description="Notify when someone joins your event"
                    value={localSettings.notifyOnJoin}
                    onToggle={() => toggleSetting('notifyOnJoin')}
                  />
                  <SettingItem
                    title="Guest Leaves Event"
                    description="Notify when someone leaves your event"
                    value={localSettings.notifyOnLeave}
                    onToggle={() => toggleSetting('notifyOnLeave')}
                  />
                  <SettingItem
                    title="New Comments"
                    description="Notify when someone comments on your event"
                    value={localSettings.newComments}
                    onToggle={() => toggleSetting('newComments')}
                    isLast
                  />
                </View>
              </View>

              {/* My Reminders */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>MY REMINDERS</Text>
                <Text style={styles.sectionSubtitle}>Get personal notifications before this event</Text>
                
                {/* Quick Reminders */}
                <View style={styles.quickRemindersContainer}>
                  <Text style={styles.quickRemindersLabel}>Quick Reminders:</Text>
                  <View style={styles.quickRemindersButtons}>
                    {quickReminderOptions.map((option, index) => {
                      const isSelected = localSettings.quickReminders?.some(r => 
                        r.amount === option.value.amount && r.unit === option.value.unit
                      );
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.quickReminderButton,
                            isSelected && styles.quickReminderButtonSelected
                          ]}
                          onPress={() => toggleQuickReminder(option.value)}
                        >
                          <Text style={[
                            styles.quickReminderButtonText,
                            isSelected && styles.quickReminderButtonTextSelected
                          ]}>
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Custom Reminders List */}
                {localSettings.customReminders && localSettings.customReminders.length > 0 && (
                  <View style={styles.customRemindersList}>
                    <Text style={styles.customRemindersLabel}>Custom Reminders:</Text>
                    {localSettings.customReminders.map((reminder) => (
                      <View key={reminder.id} style={styles.customReminderItem}>
                        <Text style={styles.customReminderText}>
                          • {formatReminderText(reminder)}
                        </Text>
                        <TouchableOpacity 
                          onPress={() => removeCustomReminder(reminder.id)}
                          style={styles.removeReminderButton}
                        >
                          <Text style={styles.removeReminderButtonText}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* Add Custom Reminder */}
                {!showAddCustomForm ? (
                  <TouchableOpacity
                    style={styles.addCustomButton}
                    onPress={() => setShowAddCustomForm(true)}
                  >
                    <Text style={styles.addCustomButtonText}>+ Add Custom Reminder</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.addCustomForm}>
                    <Text style={styles.addCustomFormTitle}>Add Custom Reminder</Text>
                    <View style={styles.customFormRow}>
                      <VibeInput
                        value={customAmount}
                        onChangeText={setCustomAmount}
                        placeholder="1"
                        keyboardType="numeric"
                        style={styles.customAmountInput}
                      />
                      <VibeSegmentedControl
                        options={customUnitOptions}
                        selectedValue={customUnit}
                        onValueChange={setCustomUnit}
                        style={styles.customUnitSelector}
                      />
                    </View>
                    <VibeInput
                      value={customLabel}
                      onChangeText={setCustomLabel}
                      placeholder="Label (optional) - e.g., Time to leave"
                      style={styles.customLabelInput}
                    />
                    <View style={styles.customFormButtons}>
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => {
                          setShowAddCustomForm(false);
                          setCustomAmount('');
                          setCustomLabel('');
                        }}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.addReminderButton,
                          (!customAmount || parseInt(customAmount) <= 0) && styles.addReminderButtonDisabled
                        ]}
                        onPress={addCustomReminder}
                        disabled={!customAmount || parseInt(customAmount) <= 0}
                      >
                        <Text style={styles.addReminderButtonText}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Save as Defaults Button */}
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.defaultsButton}
                  onPress={saveAsDefaults}
                >
                  <Text style={styles.defaultsButtonText}>Save as Default Settings</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
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
    width: 80,
    alignItems: 'flex-end',
  },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveButtonText: {
    color: theme.colors.vibeBlue,
    fontSize: 16,
    fontWeight: '600',
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
    marginBottom: 8,
    letterSpacing: 1,
  },
  settingsGroup: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: theme.sizes.borderRadius,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    overflow: 'hidden',
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
  reminderLabel: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  segmentedControl: {
    marginBottom: 8,
  },
  label: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  messageInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  defaultsButton: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: theme.sizes.borderRadius,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  defaultsButtonText: {
    color: theme.colors.vibeGreen,
    fontSize: 16,
    fontWeight: '600',
  },
  sectionSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: -4,
    marginBottom: 16,
    lineHeight: 16,
  },
  quickRemindersContainer: {
    marginBottom: 16,
  },
  quickRemindersLabel: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  quickRemindersButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickReminderButton: {
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  quickReminderButtonSelected: {
    backgroundColor: theme.colors.vibeBackgroundBlue,
    borderColor: theme.colors.vibeBlue,
  },
  quickReminderButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '500',
  },
  quickReminderButtonTextSelected: {
    color: theme.colors.vibeBlue,
    fontWeight: '600',
  },
  customRemindersList: {
    marginBottom: 16,
  },
  customRemindersLabel: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  customReminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  customReminderText: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    flex: 1,
  },
  removeReminderButton: {
    backgroundColor: theme.colors.red || '#FF4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  removeReminderButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  addCustomButton: {
    backgroundColor: theme.colors.vibeBlue,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  addCustomButtonText: {
    color: theme.colors.white,
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
  customLabelInput: {
    marginBottom: 12,
  },
  customFormButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: theme.colors.darkGray,
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  addReminderButton: {
    flex: 1,
    backgroundColor: theme.colors.vibeBlue,
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addReminderButtonDisabled: {
    opacity: 0.5,
  },
  addReminderButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});