// FILE: components/notifications/PersonalNotifications.js

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import AddReminderModal from './AddReminderModal';
import theme from '../../theme/themes';

export default function PersonalNotifications({
  reminders = [],
  onUpdateReminders,
  eventDateTime,
  title = 'Event Reminders',
  addButtonText = 'Add Reminder',
  emptyStateText = 'No reminders set',
}) {
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddReminder = useCallback(
    (newReminder) => {
      const updatedReminders = [
        ...reminders,
        {
          id: Date.now().toString(),
          ...newReminder,
          createdAt: new Date().toISOString(),
        },
      ];
      onUpdateReminders(updatedReminders);
      setShowAddModal(false);
    },
    [reminders, onUpdateReminders]
  );

  const handleRemoveReminder = useCallback(
    (reminderId) => {
      const updatedReminders = reminders.filter(
        (reminder) => reminder.id !== reminderId
      );
      onUpdateReminders(updatedReminders);
    },
    [reminders, onUpdateReminders]
  );

  const formatReminderTime = (reminder) => {
    if (reminder.timeType === 'relative') {
      const { amount, unit } = reminder.relativeTiming;
      const unitLabels = {
        minutes: amount === 1 ? 'minute' : 'minutes',
        hours: amount === 1 ? 'hour' : 'hours',
        days: amount === 1 ? 'day' : 'days',
        weeks: amount === 1 ? 'week' : 'weeks',
      };
      return `${amount} ${unitLabels[unit]} before`;
    } else if (reminder.timeType === 'absolute' && reminder.absoluteTime) {
      const date = new Date(reminder.absoluteTime);
      return date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }
    return 'Custom time';
  };

  const getNotificationTypeIcon = (type) => {
    switch (type) {
      case 'push':
        return '🔔';
      case 'alarm':
        return '⏰';
      case 'both':
        return '🔔⏰';
      default:
        return '🔔';
    }
  };

  const ReminderItem = ({ reminder }) => (
    <View style={styles.reminderItem}>
      <View style={styles.reminderContent}>
        <View style={styles.reminderHeader}>
          <Text style={styles.reminderIcon}>
            {getNotificationTypeIcon(reminder.notificationType)}
          </Text>
          <Text style={styles.reminderTime}>
            {formatReminderTime(reminder)}
          </Text>
        </View>
        {reminder.label && (
          <Text style={styles.reminderLabel}>{reminder.label}</Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveReminder(reminder.id)}
      >
        <Text style={styles.removeButtonText}>×</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ {addButtonText}</Text>
        </TouchableOpacity>
      </View>

      {/* Reminders List */}
      {reminders.length > 0 ? (
        <ScrollView
          style={styles.remindersList}
          showsVerticalScrollIndicator={false}
        >
          {reminders.map((reminder) => (
            <ReminderItem key={reminder.id} reminder={reminder} />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>{emptyStateText}</Text>
          <Text style={styles.emptyStateSubtext}>
            Tap "Add Reminder" to get notified before the event starts
          </Text>
        </View>
      )}

      {/* Add Reminder Modal */}
      <AddReminderModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddReminder={handleAddReminder}
        eventDateTime={eventDateTime}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 198, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.vibeBlue || '#00C6FF',
    padding: 16,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },
  addButton: {
    backgroundColor: theme.colors.vibeBlue || '#00C6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: theme.colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  remindersList: {
    maxHeight: 200,
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBackground,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
  },
  reminderContent: {
    flex: 1,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  reminderIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  reminderTime: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  reminderLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
  removeButton: {
    backgroundColor: theme.colors.red || '#FF4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  removeButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyStateText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
