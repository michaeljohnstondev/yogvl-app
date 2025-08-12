import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { DateTime } from 'luxon';

// Components
import VibeInput from '../components/VibeInput';
import VibeButton from '../components/VibeButton';
import VibeButtonPlain from '../components/VibeButtonPlain';
import ReliabilityWarning from '../components/ReliabilityWarning';
import EventTipsModal, { useEventTips } from '../components/EventTipsModal';
import VibeTimePicker from '../components/VibeTimePicker';
import VibeAutoComplete from '../components/VibeAutoComplete';
import VibeSegmentedControl from '../components/VibeSegmentedControl';

// Hooks
import { useSuggestions, filterSuggestions } from '../hooks/useSuggestions';

// Firebase
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useFocusEffect } from '@react-navigation/native';

// Utils and Context
import { useAuth } from '../AuthContext';
import {
  validateEventForm,
  formatEventForStorage,
  validateEventDateTime,
} from '../utils/eventFormValidation';
import { getUserEventPermissions, isPastEvent } from '../utils/eventUtils';
import theme from '../themes/themes';

// Custom Hook for Form State
const useFormState = (initialData = {}) => {
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    details: '',
    maxGuests: '',
    date: new Date(),
    time: new Date(),
    dateSelected: true, // Always true for edit
    timeSelected: true, // Always true for edit
    inputHeight: 80,
    hasFee: false,
    entryFee: '',
    feeDescription: '',
    eventTimeZone: 'America/New_York',
    ...initialData,
  });

  const updateField = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const populateFromEvent = useCallback((eventData) => {
    const updates = {
      title: eventData.title || '',
      location: eventData.location || '',
      details: eventData.desc || '',
      maxGuests: eventData.maxGuests?.toString() || '',
      hasFee: eventData.hasFee || false,
      entryFee: eventData.entryFee || '',
      feeDescription: eventData.feeDescription || '',
      eventTimeZone: eventData.eventTimeZone || 'America/New_York',
    };

    // Handle the date/time structure
    if (eventData.originalDate && eventData.originalTime) {
      updates.date = new Date(eventData.originalDate);
      const [hour, minute] = eventData.originalTime.split(':');
      const timeObj = new Date();
      timeObj.setHours(parseInt(hour), parseInt(minute));
      updates.time = timeObj;
    } else if (eventData.utcDateTime) {
      // Fallback to utcDateTime if originalDate/originalTime don't exist
      const utcDate = new Date(eventData.utcDateTime);
      updates.date = utcDate;
      updates.time = utcDate;
    }

    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  return { formData, updateField, populateFromEvent };
};

// Main Component
export default function EditEventScreen({ route, navigation }) {
  const { eventId } = route.params;
  const { currentUserId, userData } = useAuth();
  const { showTips, closeTips, showTipsManually } = useEventTips('edit');
  const { formData, updateField, populateFromEvent } = useFormState();
  const { suggestions, isLoading, loadSuggestions } = useSuggestions();

  // UI State
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [event, setEvent] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  // Suggestion visibility state
  const [suggestionVisibility, setSuggestionVisibility] = useState({
    title: false,
    location: false,
    details: false,
  });

  // Filtered suggestions
  const filteredSuggestions = useMemo(
    () => ({
      title: filterSuggestions(formData.title, suggestions.titles),
      location: filterSuggestions(formData.location, suggestions.locations),
      details: filterSuggestions(formData.details, suggestions.details),
    }),
    [formData.title, formData.location, formData.details, suggestions]
  );

  // Load suggestions on mount
  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const validateEventTime = (skipPastCheck = false) => {
    // Use the extracted utility with custom logic for editing
    const basicValidation = validateEventDateTime(formData.date, formData.time);

    if (!basicValidation.isValid) {
      return basicValidation;
    }

    // Additional edit-specific validation
    if (!skipPastCheck && event) {
      const timeZone =
        formData.eventTimeZone ||
        Intl.DateTimeFormat().resolvedOptions().timeZone;
      const eventDateTime = DateTime.fromObject(
        {
          year: formData.date.getFullYear(),
          month: formData.date.getMonth() + 1,
          day: formData.date.getDate(),
          hour: formData.time.getHours(),
          minute: formData.time.getMinutes(),
        },
        { zone: timeZone }
      );

      const now = DateTime.now().setZone(timeZone);
      const originalEventTime = event.eventTimestamp
        ? DateTime.fromJSDate(event.eventTimestamp.toDate()).setZone(timeZone)
        : DateTime.fromISO(event.utcDateTime).setZone(timeZone);

      // If original event was in future, don't allow moving to past
      if (
        originalEventTime > now &&
        eventDateTime <= now.minus({ minutes: 5 })
      ) {
        return {
          isValid: false,
          message:
            'Cannot move a future event to the past. Please select a future date and time.',
        };
      }
    }

    return { isValid: true };
  };

  useFocusEffect(
    useCallback(() => {
      if (isDeleted) return;
      const loadEvent = async () => {
        try {
          setLoading(true);
          const ref = doc(db, 'events', eventId);
          const snap = await getDoc(ref);

          if (snap.exists()) {
            const eventData = { id: snap.id, ...snap.data() };
            setEvent(eventData);
            populateFromEvent(eventData);
          } else {
            Alert.alert('Error', 'Event not found.', [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
            return;
          }
        } catch (err) {
          console.error('Failed to fetch event:', err);
          Alert.alert('Error', 'Failed to load event.', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        } finally {
          setLoading(false);
        }
      };

      loadEvent();
    }, [eventId, populateFromEvent, isDeleted]) // FIXED: Added isDeleted to dependencies
  );

  // Get user permissions using utility
  const permissions = getUserEventPermissions(currentUserId, userData, event);

  // Check permissions after event loads
  useEffect(() => {
    if (event && !loading && !permissions.canEdit) {
      Alert.alert('Access Denied', 'You can only edit events you created.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  }, [event, loading, permissions.canEdit]);

  // Input handlers
  const handleInputChange = useCallback(
    (field, value) => {
      updateField(field, value);

      if (['title', 'location'].includes(field) && !isLoading) {
        setSuggestionVisibility((prev) => ({
          ...prev,
          [field]: true,
        }));
      }

      if (field === 'details' && value.length < 5 && !isLoading) {
        setSuggestionVisibility((prev) => ({ ...prev, details: true }));
      } else if (field === 'details' && value.length >= 5) {
        setSuggestionVisibility((prev) => ({ ...prev, details: false }));
      }
    },
    [updateField, isLoading]
  );

  // Suggestion handlers
  const handleSuggestionSelect = useCallback(
    (field, suggestion) => {
      if (field === 'details' && formData.details.length > 0) {
        const separator = formData.details.match(/[.!?]$/) ? ' ' : '. ';
        updateField('details', formData.details + separator + suggestion);
      } else {
        updateField(field, suggestion);
      }
      setSuggestionVisibility((prev) => ({ ...prev, [field]: false }));
    },
    [formData.details, updateField]
  );

  const hideSuggestions = useCallback((field) => {
    setTimeout(() => {
      setSuggestionVisibility((prev) => ({ ...prev, [field]: false }));
    }, 150);
  }, []);

  // Date/Time handlers
  const handleDateConfirm = useCallback(
    (selectedDate) => {
      updateField('date', selectedDate);
      setShowDatePicker(false);
    },
    [updateField]
  );

  const handleTimeConfirm = useCallback(
    (selectedTime) => {
      updateField('time', selectedTime);
      setShowTimePicker(false);
    },
    [updateField]
  );

  const handleUpdate = async () => {
    console.log('🔵 handleUpdate started');

    if (!permissions.canEdit) {
      console.log('❌ No permission to edit');
      Alert.alert('Error', 'You do not have permission to edit this event.');
      return;
    }
    console.log('✅ Permissions OK');

    const validation = validateEventForm(formData);
    if (!validation.isValid) {
      console.log('❌ Form validation failed:', validation.message);
      Alert.alert('Error', validation.message);
      return;
    }
    console.log('✅ Form validation passed');

    const timeValidation = validateEventTime();
    if (!timeValidation.isValid) {
      console.log('❌ Time validation failed:', timeValidation.message);
      Alert.alert('Invalid Date/Time', timeValidation.message);
      return;
    }
    console.log('✅ Time validation passed');

    console.log('🔵 About to call performUpdate');
    performUpdate();
  };

  const performUpdate = async () => {
    setUpdating(true);

    try {
      // Use extracted formatting utility
      const eventData = formatEventForStorage(formData, currentUserId);

      // Track what changed for future notifications
      const changes = [];
      const originalEvent = event;

      if (originalEvent.title !== eventData.title) {
        changes.push('title');
      }
      if (originalEvent.location !== eventData.location) {
        changes.push('location');
      }
      if (originalEvent.desc !== eventData.desc) {
        changes.push('details');
      }
      if (originalEvent.maxGuests !== eventData.maxGuests) {
        changes.push('capacity');
      }
      if (originalEvent.hasFee !== eventData.hasFee) {
        changes.push('fee');
      }
      if (originalEvent.entryFee !== eventData.entryFee) {
        changes.push('fee');
      }

      // Check if date/time changed
      const originalDateTime = originalEvent.utcDateTime;
      const newDateTime = eventData.utcDateTime;
      if (originalDateTime !== newDateTime) {
        changes.push('datetime');
      }

      // Only track changes if there are actual changes
      const hasChanges = changes.length > 0;
      const subscribersToNotify = hasChanges
        ? (originalEvent.subscribers || []).filter((id) => id !== currentUserId)
        : [];

      // Update with edit-specific fields
      const updateData = {
        title: eventData.title,
        location: eventData.location,
        desc: eventData.desc,
        originalDate: eventData.originalDate,
        originalTime: eventData.originalTime,
        utcDateTime: eventData.utcDateTime,
        eventTimestamp: Timestamp.fromDate(eventData.eventTimestamp),
        eventTimeZone: eventData.eventTimeZone,
        maxGuests: eventData.maxGuests,
        hasFee: eventData.hasFee,
        entryFee: eventData.entryFee,
        feeDescription: eventData.feeDescription,
        updatedAt: Timestamp.now(),
        updatedBy: currentUserId, // Track who made the update
      };

      // Add change tracking if there are changes
      if (hasChanges) {
        updateData.lastChanges = changes;
        updateData.lastChangeTimestamp = Timestamp.now();
        updateData.subscribersToNotify = subscribersToNotify;
        updateData.changesRequireNotification = true;

        console.log('Event changes detected:', {
          changes,
          subscribersToNotify: subscribersToNotify.length,
          eventId,
        });
      }

      await updateDoc(doc(db, 'events', eventId), updateData);

      // Show success message with change info//
      const changeMessage = hasChanges
        ? `Event updated successfully! ${subscribersToNotify.length} attendees will be notified of changes.`
        : 'Event updated successfully!';

      Alert.alert('Success!', changeMessage, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      console.error('Failed to update event:', err);
      Alert.alert('Error', 'Failed to update event. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = () => {
    if (!permissions.canDelete) {
      Alert.alert('Error', 'You do not have permission to delete this event.');
      return;
    }

    const subscriberCount = event.subscriberCount || 0;
    const warningMessage =
      subscriberCount > 1
        ? `This event has ${subscriberCount} subscribers who will lose access. This action cannot be undone.`
        : 'This action cannot be undone.';

    Alert.alert(
      'Delete Event',
      `Are you sure you want to delete "${event.title}"? ${warningMessage}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: performDelete,
        },
      ]
    );
  };

  const performDelete = async () => {
    setDeleting(true);
    setIsDeleted(true); // FIXED: Mark as deleted immediately

    try {
      await deleteDoc(doc(db, 'events', eventId));
      Alert.alert('Deleted', 'Event has been deleted successfully.', [
        {
          text: 'OK',
          onPress: () =>
            navigation.reset({
              index: 0,
              routes: [{ name: 'Home' }],
            }),
        },
      ]);
    } catch (err) {
      console.error('Failed to delete event:', err);
      setIsDeleted(false); // FIXED: Revert if deletion failed
      Alert.alert('Error', 'Failed to delete event. Please try again.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading event...</Text>
      </View>
    );
  }

  if (!permissions.canEdit) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>You cannot edit this event</Text>
        <Text style={styles.errorSubtext}>
          Only the event creator or admins can make changes
        </Text>
        <VibeButton
          label="GO BACK"
          onPress={() => navigation.goBack()}
          style={{ marginTop: 20 }}
        />
      </View>
    );
  }

  const isEventPast = isPastEvent(event);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>✏️ Edit Event</Text>
          <TouchableOpacity
            style={styles.helpButton}
            onPress={showTipsManually}
            activeOpacity={0.7}
          >
            <Text style={styles.helpButtonText}>💡</Text>
          </TouchableOpacity>
        </View>

        <ReliabilityWarning userData={userData} context="edit" />

        {isLoading && (
          <Text style={styles.loadingText}>Loading suggestions...</Text>
        )}

        {isEventPast && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              ⚠️ This event has already ended
            </Text>
          </View>
        )}

        {/* Event Name */}
        <Text style={styles.label}>Event Name *</Text>
        <View style={styles.inputContainer}>
          <VibeInput
            value={formData.title}
            onChangeText={(text) => handleInputChange('title', text)}
            onFocus={() =>
              !isLoading &&
              setSuggestionVisibility((prev) => ({ ...prev, title: true }))
            }
            onBlur={() => hideSuggestions('title')}
            placeholder="Enter event name"
            maxLength={100}
          />
          <VibeAutoComplete
            suggestions={filteredSuggestions.title}
            onSelect={(suggestion) =>
              handleSuggestionSelect('title', suggestion)
            }
            visible={suggestionVisibility.title && !isLoading}
          />
        </View>

        {/* Date & Time */}
        <Text style={styles.label}>When *</Text>
        <View style={styles.row}>
          <View style={styles.flex}>
            <VibeButtonPlain
              label={formData.date.toLocaleDateString([], {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
              onPress={() => setShowDatePicker(true)}
            />
          </View>
          <View style={styles.flex}>
            <VibeButtonPlain
              label={formData.time.toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              })}
              onPress={() => setShowTimePicker(true)}
            />
          </View>
        </View>

        {/* Location */}
        <Text style={styles.label}>Location *</Text>
        <View style={styles.inputContainer}>
          <VibeInput
            value={formData.location}
            onChangeText={(text) => handleInputChange('location', text)}
            onFocus={() =>
              !isLoading &&
              setSuggestionVisibility((prev) => ({ ...prev, location: true }))
            }
            onBlur={() => hideSuggestions('location')}
            placeholder="Enter event location"
            maxLength={200}
          />
          <VibeAutoComplete
            suggestions={filteredSuggestions.location}
            onSelect={(suggestion) =>
              handleSuggestionSelect('location', suggestion)
            }
            visible={suggestionVisibility.location && !isLoading}
          />
        </View>

        {/* Max Guests */}
        <Text style={styles.label}>Max Guests (optional)</Text>
        <VibeInput
          value={formData.maxGuests}
          onChangeText={(text) => updateField('maxGuests', text)}
          keyboardType="numeric"
          maxLength={4}
          placeholder="Enter max guests"
        />
        {event?.subscriberCount > 0 && (
          <Text style={styles.helperText}>
            Currently {event.subscriberCount} people subscribed
          </Text>
        )}

        {/* Entry Fee */}
        <Text style={styles.label}>Entry Fee</Text>
        <VibeSegmentedControl
          options={[
            { value: false, label: 'Free', icon: '🆓' },
            { value: true, label: 'Paid', icon: '💰' },
          ]}
          selectedValue={formData.hasFee}
          onSelect={(value) => updateField('hasFee', value)}
        />

        {/* Show fee inputs if paid is selected */}
        {formData.hasFee && (
          <>
            <Text style={styles.label}>Entry Fee Amount *</Text>
            <VibeInput
              value={formData.entryFee}
              onChangeText={(text) => updateField('entryFee', text)}
              placeholder="$10.00"
              keyboardType="numeric"
            />

            <Text style={styles.label}>What's Included? (optional)</Text>
            <VibeInput
              value={formData.feeDescription}
              onChangeText={(text) => updateField('feeDescription', text)}
              placeholder="Food, drinks, materials, etc."
              maxLength={200}
            />
          </>
        )}

        {/* Details */}
        <Text style={styles.label}>Details</Text>
        <View style={styles.inputContainer}>
          <VibeInput
            value={formData.details}
            onChangeText={(text) => handleInputChange('details', text)}
            onFocus={() =>
              !isLoading &&
              formData.details.length < 5 &&
              setSuggestionVisibility((prev) => ({ ...prev, details: true }))
            }
            onBlur={() => hideSuggestions('details')}
            multiline
            placeholder="Add any details..."
            style={{
              minHeight: 80,
              textAlignVertical: 'top',
              height: Math.max(80, formData.inputHeight),
            }}
            onContentSizeChange={(e) =>
              updateField('inputHeight', e.nativeEvent.contentSize.height)
            }
            maxLength={500}
          />
          <VibeAutoComplete
            suggestions={filteredSuggestions.details}
            onSelect={(suggestion) =>
              handleSuggestionSelect('details', suggestion)
            }
            visible={suggestionVisibility.details && !isLoading}
          />
        </View>

        {/* Update and Delete Buttons */}
        <View style={styles.buttonContainer}>
          <VibeButton
            label={updating ? 'UPDATING...' : 'UPDATE EVENT'}
            onPress={handleUpdate}
            style={[
              styles.updateButton,
              (updating || deleting) && styles.disabledButton,
            ]}
            disabled={updating || deleting}
          />

          <VibeButton
            label={deleting ? 'DELETING...' : 'DELETE EVENT'}
            onPress={handleDelete}
            style={[
              styles.deleteButton,
              (updating || deleting) && styles.disabledButton,
            ]}
            disabled={updating || deleting}
          />
        </View>

        <Text style={styles.helpText}>
          * Required fields{'\n'}
          {event?.createdAt &&
            `Created ${event.createdAt.toDate().toLocaleDateString()}`}
          {event?.updatedAt &&
            ` • Last updated ${event.updatedAt.toDate().toLocaleDateString()}`}
          {'\n'}💡 Suggestions based on popular choices from recent events
        </Text>
      </ScrollView>

      {/* Modals */}
      <DateTimePickerModal
        isVisible={showDatePicker}
        mode="date"
        date={formData.date}
        minimumDate={new Date()}
        onConfirm={handleDateConfirm}
        onCancel={() => setShowDatePicker(false)}
      />

      <VibeTimePicker
        visible={showTimePicker}
        initialTime={formData.time}
        onConfirm={handleTimeConfirm}
        onClose={() => setShowTimePicker(false)}
      />

      <EventTipsModal type="edit" visible={showTips} onClose={closeTips} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    fontFamily: theme.fonts.main,
    flex: 1,
  },
  helpButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 198, 255, 0.15)',
    borderWidth: 1,
    borderColor: theme.colors.alertButton,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  helpButtonText: {
    fontSize: 18,
  },
  label: {
    marginTop: 20,
    marginBottom: 5,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontFamily: theme.fonts.main,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 10,
    fontFamily: theme.fonts.main,
  },
  inputContainer: {
    position: 'relative',
    zIndex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  flex: {
    flex: 1,
  },
  buttonContainer: {
    marginTop: 25,
  },
  updateButton: {
    marginBottom: 8,
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.error,
    borderWidth: 1,
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '600',
    fontFamily: theme.fonts.main,
  },
  errorSubtext: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    fontFamily: theme.fonts.main,
  },
  warningBanner: {
    backgroundColor: `${theme.colors.error}20`,
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.error,
  },
  warningText: {
    color: theme.colors.error,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: theme.fonts.main,
  },
  helperText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    fontFamily: theme.fonts.main,
  },
  helpText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
    fontFamily: theme.fonts.main,
  },
});
