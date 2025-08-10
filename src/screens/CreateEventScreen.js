// FILE: screens/CreateEventScreen.js

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

// Components
import VibeButton from '../components/VibeButton';
import VibeInput from '../components/VibeInput';
import VibeButtonPlain from '../components/VibeButtonPlain';
import ReliabilityWarning from '../components/ReliabilityWarning';
import EventTipsModal, { useEventTips } from '../components/EventTipsModal';
import VibeTimePicker from '../components/VibeTimePicker';
import VibeAutoComplete from '../components/VibeAutoComplete';
import VibeSegmentedControl from '../components/VibeSegmentedControl';
import {
  TemplateSelectionModal,
  SaveTemplateModal,
} from '../components/TemplateModals';

// Hooks
import { useSuggestions, filterSuggestions } from '../hooks/useSuggestions';
import { useEventTemplates } from '../hooks/useEventTemplates';

// Firebase
import { db } from '../firebase';
import { Timestamp, collection, addDoc } from 'firebase/firestore';

// Utils and Context
import { useAuth } from '../AuthContext';
import {
  validateEventForm,
  formatEventForStorage,
} from '../utils/eventFormValidation';
import { validateUserCanCreateEvent } from '../utils/eventValidation';
import { updateEventCreationMetrics } from '../utils/userMetrics';
import theme from '../themes/themes';

// Custom Hook for Form State
const useFormState = () => {
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    address: '',
    details: '',
    maxGuests: '',
    date: new Date(),
    time: new Date(),
    dateSelected: false,
    timeSelected: false,
    inputHeight: 80,
    hasFee: false,
    entryFee: '',
    feeDescription: '',

    // NEW FIELDS
    isPrivate: false,
    additionalHosts: [],
    showHostContact: true,
    hasRsvpDeadline: false,
    rsvpDeadline: new Date(),
    rsvpDeadlineSelected: false,
  });

  const updateField = useCallback((field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      title: '',
      location: '',
      address: '',
      details: '',
      maxGuests: '',
      date: new Date(),
      time: new Date(),
      dateSelected: false,
      timeSelected: false,
      inputHeight: 80,
      hasFee: false,
      entryFee: '',
      feeDescription: '',

      // Reset new fields
      isPrivate: false,
      additionalHosts: [],
      showHostContact: true,
      hasRsvpDeadline: false,
      rsvpDeadline: new Date(),
      rsvpDeadlineSelected: false,
    });
  }, []);

  const replaceFormData = useCallback((newFormData) => {
    console.log('Replacing form data with:', newFormData);
    setFormData(newFormData);
  }, []);

  return { formData, updateField, resetForm, replaceFormData };
};

// Main Component
export default function CreateEventScreen({ navigation }) {
  console.log('=== CreateEventScreen rendered ===');

  const { currentUserId, userData } = useAuth();
  const { showTips, closeTips, showTipsManually } = useEventTips('create');
  const { formData, updateField, resetForm, replaceFormData } = useFormState();
  const { suggestions, isLoading, loadSuggestions } = useSuggestions();

  // All template functionality from the hook
  const {
    templates,
    loading: templatesLoading,
    templateName,
    setTemplateName,
    showSaveTemplate,
    saveAsTemplate,
    showSaveTemplateModal,
    hideSaveTemplateModal,
    applyTemplate,
    deleteTemplate,
  } = useEventTemplates(currentUserId);

  // UI State
  const [isCreating, setIsCreating] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // NEW: RSVP Deadline Pickers
  const [showRsvpDatePicker, setShowRsvpDatePicker] = useState(false);
  const [showRsvpTimePicker, setShowRsvpTimePicker] = useState(false);

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

  // Template handlers
  const handleSaveAsTemplate = () => {
    console.log('=== handleSaveAsTemplate called ===');
    console.log('Current form data:', formData);
    saveAsTemplate(formData);
  };

  const handleShowSaveTemplate = () => {
    console.log('=== handleShowSaveTemplate called ===');
    showSaveTemplateModal(formData.title);
  };

  const handleApplyTemplate = (template) => {
    console.log('=== handleApplyTemplate called ===');
    console.log('Original template:', template);

    const templateData = applyTemplate(template);
    console.log('Processed template data:', templateData);

    replaceFormData(templateData);
    setShowTemplateModal(false);

    Alert.alert(
      'Template Loaded',
      `"${template.name}" has been loaded. Date and time have been applied from the template.`
    );
  };

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
      console.log('Date selected:', selectedDate);
      updateField('date', selectedDate);
      updateField('dateSelected', true);
      setShowDatePicker(false);
    },
    [updateField]
  );

  const handleTimeConfirm = useCallback(
    (selectedTime) => {
      console.log('Time selected:', selectedTime);
      updateField('time', selectedTime);
      updateField('timeSelected', true);
      setShowTimePicker(false);
    },
    [updateField]
  );

  // NEW: RSVP Deadline handlers
  const handleRsvpDateConfirm = useCallback(
    (selectedDate) => {
      console.log('RSVP Date selected:', selectedDate);
      updateField('rsvpDeadline', selectedDate);
      updateField('rsvpDeadlineSelected', true);
      setShowRsvpDatePicker(false);
    },
    [updateField]
  );

  const handleRsvpTimeConfirm = useCallback(
    (selectedTime) => {
      console.log('RSVP Time selected:', selectedTime);
      const currentDeadline = formData.rsvpDeadline;
      const newDeadline = new Date(
        currentDeadline.getFullYear(),
        currentDeadline.getMonth(),
        currentDeadline.getDate(),
        selectedTime.getHours(),
        selectedTime.getMinutes()
      );
      updateField('rsvpDeadline', newDeadline);
      updateField('rsvpDeadlineSelected', true);
      setShowRsvpTimePicker(false);
    },
    [updateField, formData.rsvpDeadline]
  );

  // Create event handler
  const handleCreate = useCallback(async () => {
    console.log('=== DEBUG: handleCreate called ===');
    console.log('1. currentUserId:', currentUserId);
    console.log('2. userData:', userData);
    console.log('3. formData:', formData);

    if (!currentUserId) {
      console.log('ERROR: No currentUserId');
      Alert.alert('Error', 'You must be logged in to create events.');
      return;
    }

    console.log('4. Validating user can create event...');
    const canCreateValidation = validateUserCanCreateEvent(userData);
    console.log('5. canCreateValidation result:', canCreateValidation);

    if (!canCreateValidation.canCreate) {
      console.log(
        'ERROR: User cannot create event:',
        canCreateValidation.reason
      );
      Alert.alert('Event Creation Restricted', canCreateValidation.reason);
      return;
    }

    if (canCreateValidation.warning) {
      console.log('6. Warning exists, showing alert...');
      const proceed = await new Promise((resolve) => {
        Alert.alert('Attendance Notice', canCreateValidation.warning, [
          { text: 'Cancel', onPress: () => resolve(false) },
          { text: 'Create Anyway', onPress: () => resolve(true) },
        ]);
      });
      console.log('7. User chose to proceed:', proceed);
      if (!proceed) return;
    }

    console.log('8. Validating form data...');
    const validation = validateEventForm(formData);
    console.log('9. Form validation result:', validation);

    if (!validation.isValid) {
      console.log('ERROR: Form validation failed:', validation.message);
      Alert.alert('Error', validation.message);
      return;
    }

    console.log('10. Setting isCreating to true...');
    setIsCreating(true);

    try {
      console.log('11. Formatting event data...');
      const eventData = formatEventForStorage(formData, currentUserId);
      console.log('12. Formatted event data (before timestamps):', eventData);

      eventData.createdAt = Timestamp.now();
      eventData.eventTimestamp = Timestamp.fromDate(eventData.eventTimestamp);

      // Handle RSVP deadline timestamp conversion
      if (eventData.rsvpDeadlineTimestamp) {
        eventData.rsvpDeadlineTimestamp = Timestamp.fromDate(
          eventData.rsvpDeadlineTimestamp
        );
      }

      console.log('13. Final event data for storage:', eventData);
      console.log('14. About to call addDoc...');

      const eventRef = await addDoc(collection(db, 'events'), eventData);
      console.log('15. SUCCESS! Event created with ID:', eventRef.id);

      console.log('16. Updating metrics...');
      await updateEventCreationMetrics(currentUserId, eventRef.id);
      console.log('17. Metrics updated successfully');

      console.log('18. Cleaning up form...');
      loadSuggestions();
      resetForm();
      setSuggestionVisibility({
        title: false,
        location: false,
        details: false,
      });

      console.log('19. Showing success alert...');
      Alert.alert(
        'Success!',
        'Event created successfully! You are automatically subscribed to your event.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('ERROR in try block:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      Alert.alert('Error', `Failed to create event: ${error.message}`);
    } finally {
      console.log('20. Setting isCreating to false...');
      setIsCreating(false);
    }
  }, [
    currentUserId,
    userData,
    formData,
    loadSuggestions,
    resetForm,
    navigation,
  ]);

  // Debug current form state
  useEffect(() => {
    console.log('Current form data state:', {
      dateSelected: formData.dateSelected,
      timeSelected: formData.timeSelected,
      date: formData.date,
      time: formData.time,
      isPrivate: formData.isPrivate,
      showHostContact: formData.showHostContact,
      hasRsvpDeadline: formData.hasRsvpDeadline,
      rsvpDeadlineSelected: formData.rsvpDeadlineSelected,
    });
  }, [
    formData.dateSelected,
    formData.timeSelected,
    formData.date,
    formData.time,
    formData.isPrivate,
    formData.showHostContact,
    formData.hasRsvpDeadline,
    formData.rsvpDeadlineSelected,
  ]);

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
          <Text style={styles.title}>Create Event</Text>
          <Pressable style={styles.helpButton} onPress={showTipsManually}>
            <Text style={styles.helpButtonText}>💡</Text>
          </Pressable>
        </View>

        <ReliabilityWarning userData={userData} context="create" />

        {(isLoading || templatesLoading) && (
          <Text style={styles.loadingText}>Loading...</Text>
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

        {/* Privacy Setting */}
        <Text style={styles.label}>Event Privacy</Text>
        <VibeSegmentedControl
          options={[
            { value: false, label: 'Public', icon: '🌍' },
            { value: true, label: 'Private', icon: '🔒' },
          ]}
          selectedValue={formData.isPrivate}
          onSelect={(value) => updateField('isPrivate', value)}
        />

        {/* Date & Time */}
        <Text style={styles.label}>When *</Text>
        <View style={styles.row}>
          <View style={styles.flex}>
            <VibeButtonPlain
              label={
                formData.dateSelected
                  ? formData.date.toLocaleDateString([], {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })
                  : '📅 Date'
              }
              onPress={() => setShowDatePicker(true)}
              style={!formData.dateSelected && styles.unselectedButton}
            />
          </View>
          <View style={styles.flex}>
            <VibeButtonPlain
              label={
                formData.timeSelected
                  ? formData.time.toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : '⏰ Time'
              }
              onPress={() => setShowTimePicker(true)}
              style={!formData.timeSelected && styles.unselectedButton}
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

        {/* Address (NEW) */}
        <Text style={styles.label}>Address (optional)</Text>
        <VibeInput
          value={formData.address}
          onChangeText={(text) => updateField('address', text)}
          placeholder="123 Main St, City, State 12345"
          maxLength={300}
        />

        {/* Max Guests */}
        <Text style={styles.label}>Max Guests (optional)</Text>
        <VibeInput
          value={formData.maxGuests}
          onChangeText={(text) => updateField('maxGuests', text)}
          keyboardType="numeric"
          maxLength={4}
          placeholder="Enter max guests"
        />

        {/* Host Contact Info (NEW) */}
        <Text style={styles.label}>Host Contact Information</Text>
        <VibeSegmentedControl
          options={[
            { value: true, label: 'Show Contact', icon: '📞' },
            { value: false, label: 'Hide Contact', icon: '🙈' },
          ]}
          selectedValue={formData.showHostContact}
          onSelect={(value) => updateField('showHostContact', value)}
        />

        {/* RSVP Deadline (NEW) */}
        <Text style={styles.label}>RSVP Deadline</Text>
        <VibeSegmentedControl
          options={[
            { value: false, label: 'No Deadline', icon: '♾️' },
            { value: true, label: 'Set Deadline', icon: '⏰' },
          ]}
          selectedValue={formData.hasRsvpDeadline}
          onSelect={(value) => updateField('hasRsvpDeadline', value)}
        />

        {/* Show deadline picker if enabled */}
        {formData.hasRsvpDeadline && (
          <View style={styles.row}>
            <View style={styles.flex}>
              <VibeButtonPlain
                label={
                  formData.rsvpDeadlineSelected
                    ? formData.rsvpDeadline.toLocaleDateString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })
                    : '📅 Deadline Date'
                }
                onPress={() => setShowRsvpDatePicker(true)}
                style={
                  !formData.rsvpDeadlineSelected && styles.unselectedButton
                }
              />
            </View>
            <View style={styles.flex}>
              <VibeButtonPlain
                label={
                  formData.rsvpDeadlineSelected
                    ? formData.rsvpDeadline.toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : '⏰ Deadline Time'
                }
                onPress={() => setShowRsvpTimePicker(true)}
                style={
                  !formData.rsvpDeadlineSelected && styles.unselectedButton
                }
              />
            </View>
          </View>
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
            placeholder="Add any additional details about your event..."
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

        {/* Template Buttons */}
        <View style={styles.templateButtons}>
          <VibeButtonPlain
            label="📋 Use Template"
            onPress={() => setShowTemplateModal(true)}
            style={styles.templateButton}
          />

          <VibeButtonPlain
            label="💾 Save as Template"
            onPress={handleShowSaveTemplate}
            style={styles.templateButton}
          />
        </View>

        {/* Create Button */}
        <VibeButton
          label={isCreating ? 'CREATING...' : 'CREATE EVENT'}
          onPress={handleCreate}
          style={[styles.createButton, isCreating && styles.disabledButton]}
          disabled={isCreating}
        />

        <Text style={styles.helpText}>
          * Required fields{'\n'}
          You will be automatically subscribed to your event{'\n'}
          💡 Suggestions based on popular choices from recent events
          {formData.isPrivate &&
            '\n🔒 Private events are only visible to invited guests'}
          {formData.hasRsvpDeadline && '\n⏰ RSVP deadline will be enforced'}
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

      {/* NEW: RSVP Deadline Modals */}
      <DateTimePickerModal
        isVisible={showRsvpDatePicker}
        mode="date"
        date={formData.rsvpDeadline}
        minimumDate={new Date()}
        maximumDate={formData.date} // Can't be after event date
        onConfirm={handleRsvpDateConfirm}
        onCancel={() => setShowRsvpDatePicker(false)}
      />

      <VibeTimePicker
        visible={showRsvpTimePicker}
        initialTime={formData.rsvpDeadline}
        onConfirm={handleRsvpTimeConfirm}
        onClose={() => setShowRsvpTimePicker(false)}
      />

      <EventTipsModal type="create" visible={showTips} onClose={closeTips} />

      {/* Template Modals */}
      <TemplateSelectionModal
        visible={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        templates={templates}
        onSelectTemplate={handleApplyTemplate}
        onDeleteTemplate={deleteTemplate}
      />

      <SaveTemplateModal
        visible={showSaveTemplate}
        onClose={hideSaveTemplateModal}
        templateName={templateName}
        setTemplateName={setTemplateName}
        onSave={handleSaveAsTemplate}
      />
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
  templateButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    marginBottom: 10,
  },
  templateButton: {
    flex: 1,
  },
  createButton: {
    marginTop: 30,
  },
  disabledButton: {
    opacity: 0.6,
  },
  unselectedButton: {
    opacity: 0.7,
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
