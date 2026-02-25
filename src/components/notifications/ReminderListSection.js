// Shared reminder list section - Google Calendar style
// Used by HostNotificationSettingsForm and GuestNotificationSettingsForm
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Keyboard,
  Platform,
} from 'react-native';
import VibeInput from '../ui/base/VibeInput';
import VibeDropdown from '../ui/base/VibeDropdown';
import { VibeButton } from '../ui';
import { useVibeAlert } from '../ui/base/VibeAlertContext';
import CustomTemplateService from '../../services/CustomTemplateService';
import theme from '../../theme/themes';

const PRESET_REMINDERS = [
  { amount: 15, unit: 'minutes', label: '15 min' },
  { amount: 30, unit: 'minutes', label: '30 min' },
  { amount: 1, unit: 'hours', label: '1 hour' },
  { amount: 2, unit: 'hours', label: '2 hours' },
  { amount: 1, unit: 'days', label: '1 day' },
  { amount: 1, unit: 'weeks', label: '1 week' },
];

const UNIT_MAP = { m: 'minutes', h: 'hours', d: 'days', w: 'weeks', x: 'months' };
const UNIT_ABBR = { minutes: 'm', hours: 'h', days: 'd', weeks: 'w', months: 'x' };

const UNIT_OPTIONS = [
  { label: 'Minutes', value: 'minutes' },
  { label: 'Hours', value: 'hours' },
  { label: 'Days', value: 'days' },
  { label: 'Weeks', value: 'weeks' },
  { label: 'Months', value: 'months' },
];

// Old-format template ID mapping for backward compatibility
const OLD_ID_MAP = {
  '15min': { amount: 15, unit: 'minutes', label: '15 min' },
  '30min': { amount: 30, unit: 'minutes', label: '30 min' },
  '1hour': { amount: 1, unit: 'hours', label: '1 hour' },
  '2hour': { amount: 2, unit: 'hours', label: '2 hours' },
  '1day': { amount: 1, unit: 'days', label: '1 day' },
  '1week': { amount: 1, unit: 'weeks', label: '1 week' },
};

function parseTemplateId(templateId) {
  if (OLD_ID_MAP[templateId]) {
    return { id: templateId, ...OLD_ID_MAP[templateId] };
  }

  const match = templateId.match(/^(\d+)([mhdwx])$/);
  if (match) {
    const amount = parseInt(match[1]);
    const unit = UNIT_MAP[match[2]] || 'minutes';
    const labels = {
      minutes: 'min',
      hours: amount === 1 ? 'hour' : 'hours',
      days: amount === 1 ? 'day' : 'days',
      weeks: amount === 1 ? 'week' : 'weeks',
      months: amount === 1 ? 'month' : 'months',
    };
    return { id: templateId, amount, unit, label: `${amount} ${labels[unit]}` };
  }

  return { id: templateId, amount: 0, unit: 'minutes', label: templateId };
}

function toMinutes(template) {
  const mult = { minutes: 1, hours: 60, days: 1440, weeks: 10080, months: 43200 };
  return template.amount * (mult[template.unit] || 1);
}

function makeId(amount, unit) {
  return `${amount}${UNIT_ABBR[unit]}`;
}

export default function ReminderListSection({
  settings,
  onUpdateSettings,
  isLoadingTemplates = false,
  currentUserId,
  userContext = 'hosting',
  eventData,
  sectionStyle,
}) {
  const vibeAlert = useVibeAlert();
  const [showModal, setShowModal] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [customUnit, setCustomUnit] = useState('minutes');
  const [isAdding, setIsAdding] = useState(false);
  const [calendarAdded, setCalendarAdded] = useState(false);
  const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);

  const getActiveReminders = () => {
    const templates = settings?.reminderTemplates || {};
    return Object.entries(templates)
      .filter(([, enabled]) => enabled === true)
      .map(([id]) => parseTemplateId(id))
      .sort((a, b) => toMinutes(a) - toMinutes(b));
  };

  const isPresetActive = (preset) => {
    const templates = settings?.reminderTemplates || {};
    const newId = makeId(preset.amount, preset.unit);
    if (templates[newId] === true) return true;
    const oldEntry = Object.entries(OLD_ID_MAP).find(
      ([, v]) => v.amount === preset.amount && v.unit === preset.unit
    );
    if (oldEntry && templates[oldEntry[0]] === true) return true;
    return false;
  };

  const saveToGlobalStore = async (updatedTemplates) => {
    if (!currentUserId) return;
    try {
      await CustomTemplateService.saveTemplateSettings(
        currentUserId, updatedTemplates, userContext
      );
    } catch (e) {
      console.warn('[ReminderList] Failed to save to global store:', e);
    }
  };

  const addPreset = async (preset) => {
    const id = makeId(preset.amount, preset.unit);
    const updated = { ...(settings?.reminderTemplates || {}), [id]: true };
    onUpdateSettings({ ...settings, reminderTemplates: updated });
    await saveToGlobalStore(updated);
    closeModal();
  };

  const addCustom = async () => {
    if (isAdding) return;
    Keyboard.dismiss();
    setIsAdding(true);

    try {
      const amount = parseInt(customAmount);
      if (!customAmount?.trim() || !amount || amount <= 0) {
        vibeAlert.warning('Invalid Input', 'Enter a number greater than 0');
        return;
      }
      if (amount > 999) {
        vibeAlert.warning('Invalid Input', 'Enter a number less than 1000');
        return;
      }

      const id = makeId(amount, customUnit);
      const current = settings?.reminderTemplates || {};
      if (current[id] === true) {
        const unitLabels = {
          minutes: 'min', hours: amount === 1 ? 'hour' : 'hours',
          days: amount === 1 ? 'day' : 'days', weeks: amount === 1 ? 'week' : 'weeks',
          months: amount === 1 ? 'month' : 'months',
        };
        vibeAlert.warning('Duplicate', `"${amount} ${unitLabels[customUnit]}" already exists`);
        return;
      }

      const updated = { ...current, [id]: true };
      onUpdateSettings({ ...settings, reminderTemplates: updated });
      await saveToGlobalStore(updated);
      closeModal();
    } finally {
      setIsAdding(false);
    }
  };

  const deleteReminder = async (template) => {
    const current = settings?.reminderTemplates || {};
    const updated = { ...current };
    delete updated[template.id];
    onUpdateSettings({ ...settings, reminderTemplates: updated });

    // Host context: also remove from Firestore directly
    if (currentUserId && userContext === 'hosting') {
      try {
        const { db } = await import('../../lib/firebase');
        const { doc, updateDoc, deleteField } = await import('../../lib/firebase');
        await updateDoc(doc(db, 'users', currentUserId), {
          [`userdata.settings.notifications.hosting.reminderTemplates.${template.id}`]: deleteField(),
        });
      } catch (e) {
        console.warn('[ReminderList] Failed to remove from Firestore:', e);
      }
    }

    if (currentUserId && template.id.startsWith('custom_')) {
      try {
        await CustomTemplateService.removeCustomTemplate(
          currentUserId, template.id, userContext
        );
      } catch (e) {
        console.warn('[ReminderList] Failed to remove custom template:', e);
      }
    }
  };

  const addToCalendar = async () => {
    if (isAddingToCalendar || !eventData) return;
    setIsAddingToCalendar(true);

    try {
      const Calendar = await import('expo-calendar');
      const { status } = await Calendar.requestCalendarPermissionsAsync();

      if (status !== 'granted') {
        vibeAlert.warning(
          'Calendar Access',
          'Enable calendar access in your phone settings to add events.'
        );
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const writable = calendars.find(
        (c) => c.allowsModifications && c.source?.name === (Platform.OS === 'ios' ? 'iCloud' : 'Google')
      ) || calendars.find((c) => c.allowsModifications);

      if (!writable) {
        vibeAlert.warning('No Calendar', 'No writable calendar found on this device.');
        return;
      }

      // Build start date
      const startDate = eventData.eventTimestamp?.toDate
        ? eventData.eventTimestamp.toDate()
        : new Date(eventData.eventTimestamp || eventData.dateTime);

      // End date: use endTime if available, otherwise 1 hour after start
      const endDate = eventData.endTime
        ? (eventData.endTime.toDate ? eventData.endTime.toDate() : new Date(eventData.endTime))
        : new Date(startDate.getTime() + 60 * 60 * 1000);

      // Build alarms from active reminders
      const alarms = getActiveReminders().map((template) => ({
        relativeOffset: -toMinutes(template),
        method: Calendar.AlarmMethod.ALERT,
      }));

      const location = eventData.location?.displayName || eventData.location || eventData.address || '';

      await Calendar.createEventAsync(writable.id, {
        title: eventData.title || 'Event',
        startDate,
        endDate,
        location: typeof location === 'object' ? location.displayName || '' : location,
        notes: eventData.description || '',
        timeZone: eventData.eventTimeZone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        alarms: alarms.length > 0 ? alarms : [{ relativeOffset: -1440, method: Calendar.AlarmMethod.ALERT }],
      });

      setCalendarAdded(true);
      vibeAlert.success('Added to Calendar', 'Event and reminders added to your calendar.');
    } catch (e) {
      console.warn('[ReminderList] Failed to add to calendar:', e);
      vibeAlert.error('Calendar Error', 'Failed to add event to calendar.');
    } finally {
      setIsAddingToCalendar(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setShowCustom(false);
    setCustomAmount('');
    setCustomUnit('minutes');
  };

  const activeReminders = getActiveReminders();

  return (
    <>
      <View style={[styles.section, sectionStyle]}>
        <Text style={styles.sectionTitle}>REMINDERS</Text>
        <View style={styles.card}>
          {isLoadingTemplates ? (
            <Text style={styles.loadingText}>Loading reminders...</Text>
          ) : (
            <>
              {activeReminders.length === 0 && (
                <View style={[styles.row, styles.rowBorder]}>
                  <Text style={styles.emptyText}>No reminders set</Text>
                </View>
              )}

              {activeReminders.map((template) => (
                <View key={template.id} style={[styles.row, styles.rowBorder]}>
                  <Text style={styles.rowLabel}>{template.label}</Text>
                  <TouchableOpacity
                    onPress={() => deleteReminder(template)}
                    style={styles.deleteBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                onPress={() => setShowModal(true)}
                style={styles.addRow}
              >
                <Text style={styles.addRowText}>+ Add Reminder</Text>
              </TouchableOpacity>

              {/* Add to Phone Calendar */}
              {eventData && (
                <TouchableOpacity
                  onPress={addToCalendar}
                  disabled={calendarAdded || isAddingToCalendar}
                  style={[styles.calendarRow, calendarAdded && styles.calendarRowDone]}
                >
                  <Text style={[styles.calendarRowText, calendarAdded && styles.calendarRowTextDone]}>
                    {isAddingToCalendar ? 'Adding...' : calendarAdded ? '✓ Added to Calendar' : '📅 Add to Calendar'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>

      {/* Add Reminder Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeModal}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Add Reminder</Text>

            <View style={styles.presetGrid}>
              {PRESET_REMINDERS.map((preset) => {
                const active = isPresetActive(preset);
                return (
                  <TouchableOpacity
                    key={makeId(preset.amount, preset.unit)}
                    style={[styles.presetBtn, active && styles.presetBtnActive]}
                    onPress={() => !active && addPreset(preset)}
                    disabled={active}
                  >
                    <Text style={[styles.presetText, active && styles.presetTextActive]}>
                      {preset.label}
                    </Text>
                    {active && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {!showCustom ? (
              <TouchableOpacity
                onPress={() => setShowCustom(true)}
                style={styles.customToggle}
              >
                <Text style={styles.customToggleText}>Custom Time</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.customForm}>
                <View style={styles.customRow}>
                  <VibeInput
                    value={customAmount}
                    onChangeText={(t) => setCustomAmount(t.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    maxLength={3}
                    autoFocus
                    style={styles.customInput}
                    autoComplete="off"
                    textContentType="none"
                    autoCorrect={false}
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                  <VibeDropdown
                    options={UNIT_OPTIONS}
                    selectedValue={customUnit}
                    onSelect={setCustomUnit}
                    placeholder="Unit"
                    style={styles.customDropdown}
                    hideSelectedFromList
                  />
                </View>
                <VibeButton
                  label={isAdding ? 'Adding...' : 'Add Custom'}
                  onPress={addCustom}
                  variant="toggle"
                  color="green"
                  disabled={isAdding || !customAmount || parseInt(customAmount) <= 0}
                  style={styles.customAddBtn}
                />
              </View>
            )}

            <TouchableOpacity onPress={closeModal} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    color: theme.colors.vibeCyan,
    fontSize: 12,
    fontFamily: theme.fonts.comicBold,
    letterSpacing: 1,
    marginBottom: 10,
  },
  card: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: theme.sizes.borderRadius,
    borderWidth: 3,
    borderColor: theme.colors.vibeBlue,
    overflow: 'hidden',
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.inputBorder,
  },
  rowLabel: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
  },
  deleteBtn: {
    padding: 4,
  },
  deleteBtnText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  addRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  addRowText: {
    color: theme.colors.vibeBlue,
    fontSize: 16,
    fontWeight: '600',
  },
  calendarRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: theme.colors.inputBorder,
  },
  calendarRowDone: {
    opacity: 0.6,
  },
  calendarRowText: {
    color: theme.colors.vibeGreen,
    fontSize: 16,
    fontWeight: '600',
  },
  calendarRowTextDone: {
    color: theme.colors.textSecondary,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#001020',
    borderRadius: theme.sizes.borderRadius,
    borderWidth: 3,
    borderColor: theme.colors.vibeBlue,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  modalTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    fontFamily: theme.fonts.comicBold,
    marginBottom: 20,
    textAlign: 'center',
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  presetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 198, 255, 0.1)',
    borderWidth: 2,
    borderColor: theme.colors.vibeBlue,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 90,
    justifyContent: 'center',
  },
  presetBtnActive: {
    backgroundColor: 'rgba(0, 198, 255, 0.05)',
    borderColor: theme.colors.inputBorder,
  },
  presetText: {
    color: theme.colors.vibeBlue,
    fontSize: 14,
    fontWeight: '600',
  },
  presetTextActive: {
    color: theme.colors.textSecondary,
  },
  checkmark: {
    color: theme.colors.vibeGreen,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.inputBorder,
  },
  dividerText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginHorizontal: 12,
  },
  customToggle: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  customToggleText: {
    color: theme.colors.vibeCyan,
    fontSize: 16,
    fontWeight: '600',
  },
  customForm: {
    gap: 12,
  },
  customRow: {
    flexDirection: 'row',
    gap: 12,
    zIndex: 99,
    elevation: 99,
  },
  customInput: {
    width: 70,
    textAlign: 'center',
  },
  customDropdown: {
    flex: 1,
  },
  customAddBtn: {
    marginTop: 4,
  },
  cancelBtn: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  cancelText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
});
