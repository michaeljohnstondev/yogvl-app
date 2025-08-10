// FILE: screens/CreateEventScreen.js

import React, { useEffect, useCallback, useMemo } from 'react';
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

// Components
import VibeButton from '../components/VibeButton';
import VibeInput from '../components/VibeInput';
import VibeButtonPlain from '../components/VibeButtonPlain';
import ReliabilityWarning from '../components/ReliabilityWarning';
import EventTipsModal, { useEventTips } from '../components/EventTipsModal';
import VibeAutoComplete from '../components/VibeAutoComplete';
import VibeSegmentedControl from '../components/VibeSegmentedControl';
import {
  TemplateSelectionModal,
  SaveTemplateModal,
} from '../components/TemplateModals';

// Hooks
import { useSuggestions, filterSuggestions } from '../hooks/useSuggestions';
import { useEventTemplates } from '../hooks/useEventTemplates';
import useDateTimePickers from '../hooks/useDateTimePickers';
import useEventFormState, {
  eventFormValidators,
} from '../hooks/useEventFormState';
import useSmartAutoComplete, {
  autoCompleteConfigs,
} from '../hooks/useSmartAutoComplete';

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

// Main Component
export default function CreateEventScreen({ navigation }) {
  // TEMPLATE HOOK
  const { currentUserId, userData } = useAuth();
  const { showTips, closeTips, showTipsManually } = useEventTips('create');
  const { suggestions, isLoading, loadSuggestions } = useSuggestions();

  // FORM STATE HOOK - Handles all form data and logic
  const {
    formData,
    updateField,
    resetForm,
    replaceFormData,
    isDirty,
    hasBeenModified,
    toggleFee,
    togglePrivacy,
    toggleHostContact,
    toggleRsvpDeadline,
    appendToDetails,
    updateInputHeight,
    validateForm,
    exportFormData,
  } = useEventFormState(
    {},
    {
      enableDirtyTracking: true,
    }
  );

  // DATE/TIME PICKER CONFIGURATION
  const dateTimeConfig = {
    event: {
      label: 'Event Date & Time',
      required: true,
      futureOnly: true,
      minMinutesFromNow: 30,
    },
    rsvpDeadline: {
      label: 'RSVP Deadline',
      required: false, // Will be dynamically validated based on hasRsvpDeadline
      futureOnly: true,
      maxDate: 'event', // Must be before event
    },
  };

  // DATE/TIME PICKER HOOK
  const {
    values: dateTimeValues,
    PickerRow,
    DateTimePickerModals,
    validateAll: validateDateTime,
    updateFromData: updateDateTimeFromTemplate,
    resetAll: resetDateTime,
  } = useDateTimePickers(dateTimeConfig);

  // SMART AUTO-COMPLETE HOOK
  const autoCompleteConfig = useMemo(
    () => ({
      location: autoCompleteConfigs.eventLocation, // Enables location lookup!
      title: autoCompleteConfigs.eventTitle,
      details: autoCompleteConfigs.eventDetails,
    }),
    []
  );

  const {
    handleFieldChange: handleSmartFieldChange,
    handleFieldFocus: handleSmartFieldFocus,
    handleSuggestionSelect: handleSmartSuggestionSelect,
    getFieldData,
    updateExternalSuggestions,
    hideSuggestions: hideSmartSuggestions,
  } = useSmartAutoComplete(
    autoCompleteConfig,
    useCallback(
      (locationData) => {
        // This fires when they select a location with an address!
        updateField('address', locationData.address);
      },
      [updateField]
    )
  );
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

  // UI State (SUPER MINIMAL NOW!)
  const [isCreating, setIsCreating] = React.useState(false);
  const [showTemplateModal, setShowTemplateModal] = React.useState(false);

  // Load suggestions and integrate with smart auto-complete
  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  // Update smart auto-complete when suggestions change (separate effect!)
  useEffect(() => {
    if (suggestions.titles || suggestions.locations || suggestions.details) {
      // Convert { text, count } objects to simple strings for smart auto-complete
      const titleTexts = (suggestions.titles || []).map(
        (item) => item.text || item
      );
      const locationTexts = (suggestions.locations || []).map(
        (item) => item.text || item
      );
      const detailTexts = (suggestions.details || []).map(
        (item) => item.text || item
      );

      updateExternalSuggestions('title', titleTexts);
      updateExternalSuggestions('location', locationTexts);
      updateExternalSuggestions('details', detailTexts);
    }
  }, [suggestions, updateExternalSuggestions]);

  // Filtered suggestions (LEGACY - for comparison, but smart auto-complete is better!)
  const legacyFilteredSuggestions = useMemo(
    () => ({
      title: filterSuggestions(formData.title, suggestions.titles || []),
      location: filterSuggestions(
        formData.location,
        suggestions.locations || []
      ),
      details: filterSuggestions(formData.details, suggestions.details || []),
    }),
    [formData.title, formData.location, formData.details, suggestions]
  );

  // Template handlers (MUCH CLEANER!)
  const handleSaveAsTemplate = useCallback(() => {
    // Export form data with current date/time values
    const templateData = {
      ...exportFormData(),
      date: dateTimeValues.event.value,
      dateSelected: dateTimeValues.event.selected,
      time: dateTimeValues.event.value,
      timeSelected: dateTimeValues.event.selected,
      rsvpDeadline: dateTimeValues.rsvpDeadline.value,
      rsvpDeadlineSelected: dateTimeValues.rsvpDeadline.selected,
    };

    saveAsTemplate(templateData);
  }, [exportFormData, dateTimeValues, saveAsTemplate]);

  const handleShowSaveTemplate = useCallback(() => {
    showSaveTemplateModal(formData.title);
  }, [showSaveTemplateModal, formData.title]);

  const handleApplyTemplate = useCallback(
    (template) => {
      const templateData = applyTemplate(template);

      // Update form data (non-date fields)
      replaceFormData({
        title: templateData.title || '',
        location: templateData.location || '',
        address: templateData.address || '',
        details: templateData.details || '',
        maxGuests: templateData.maxGuests || '',
        hasFee: templateData.hasFee || false,
        entryFee: templateData.entryFee || '',
        feeDescription: templateData.feeDescription || '',
        isPrivate: templateData.isPrivate || false,
        additionalHosts: templateData.additionalHosts || [],
        showHostContact:
          templateData.showHostContact !== undefined
            ? templateData.showHostContact
            : true,
        hasRsvpDeadline: templateData.hasRsvpDeadline || false,
      });

      // Update date/time pickers
      updateDateTimeFromTemplate({
        event: {
          value: templateData.date || new Date(),
          selected: templateData.dateSelected || false,
        },
        rsvpDeadline: {
          value: templateData.rsvpDeadline || new Date(),
          selected: templateData.rsvpDeadlineSelected || false,
        },
      });

      setShowTemplateModal(false);

      Alert.alert(
        'Template Loaded',
        `"${template.name}" has been loaded. Date and time have been applied from the template.`
      );
    },
    [applyTemplate, replaceFormData, updateDateTimeFromTemplate]
  );

  // Input handlers (SIMPLIFIED WITH SMART AUTO-COMPLETE!)
  const handleInputChange = useCallback(
    (field, value) => {
      // Use smart auto-complete for configured fields
      if (autoCompleteConfig[field]) {
        handleSmartFieldChange(field, value, updateField);
      } else {
        // Fallback for non-configured fields
        updateField(field, value);
      }
    },
    [autoCompleteConfig, handleSmartFieldChange, updateField]
  );

  // Handle input focus
  const handleInputFocus = useCallback(
    (field) => {
      // Use smart auto-complete for configured fields
      if (autoCompleteConfig[field]) {
        handleSmartFieldFocus(field, formData[field] || '');
      }
    },
    [autoCompleteConfig, handleSmartFieldFocus, formData]
  );

  // Suggestion handlers (SMART VERSION!)
  const handleSuggestionSelect = useCallback(
    (field, suggestion) => {
      if (autoCompleteConfig[field]) {
        // Use smart auto-complete - suggestion is an object { text, type, address, etc. }
        handleSmartSuggestionSelect(
          field,
          suggestion,
          formData[field] || '',
          updateField
        );
      } else {
        // Legacy handling for details appending - suggestion might be a string
        const suggestionText =
          typeof suggestion === 'string' ? suggestion : suggestion?.text || '';

        if (
          field === 'details' &&
          formData.details &&
          formData.details.length > 0
        ) {
          appendToDetails(suggestionText);
        } else {
          updateField(field, suggestionText);
        }
      }
    },
    [
      autoCompleteConfig,
      handleSmartSuggestionSelect,
      formData,
      updateField,
      appendToDetails,
    ]
  );

  // Hide suggestions
  const hideSuggestions = useCallback(
    (field) => {
      if (autoCompleteConfig[field]) {
        hideSmartSuggestions(field);
      }
    },
    [autoCompleteConfig, hideSmartSuggestions]
  );

  // Navigation guard for unsaved changes
  const handleBackPress = useCallback(() => {
    if (isDirty || hasBeenModified) {
      Alert.alert(
        'Unsaved Changes',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Leave Anyway', onPress: () => navigation.goBack() },
        ]
      );
      return true; // Prevent default back action
    }
    return false;
  }, [isDirty, hasBeenModified, navigation]);

  // Create event handler (SUPER CLEAN!)
  const handleCreate = useCallback(async () => {
    if (!currentUserId) {
      Alert.alert('Error', 'You must be logged in to create events.');
      return;
    }

    const canCreateValidation = validateUserCanCreateEvent(userData);

    if (!canCreateValidation.canCreate) {
      Alert.alert('Event Creation Restricted', canCreateValidation.reason);
      return;
    }

    if (canCreateValidation.warning) {
      const proceed = await new Promise((resolve) => {
        Alert.alert('Attendance Notice', canCreateValidation.warning, [
          { text: 'Cancel', onPress: () => resolve(false) },
          { text: 'Create Anyway', onPress: () => resolve(true) },
        ]);
      });
      if (!proceed) return;
    }

    // Validate using our built-in form validators
    const fieldValidation = validateForm(eventFormValidators);

    if (!fieldValidation.isValid) {
      const firstError = Object.values(fieldValidation.errors)[0];
      Alert.alert('Error', firstError);
      return;
    }

    // Validate date/time
    const dateTimeValidation = validateDateTime();

    if (!dateTimeValidation.isValid) {
      Alert.alert('Error', dateTimeValidation.message);
      return;
    }

    // Create combined form data for final validation and storage
    const combinedFormData = {
      ...formData,
      date: dateTimeValues.event.value,
      dateSelected: dateTimeValues.event.selected,
      time: dateTimeValues.event.value,
      timeSelected: dateTimeValues.event.selected,
      rsvpDeadline: dateTimeValues.rsvpDeadline.value,
      rsvpDeadlineSelected: formData.hasRsvpDeadline
        ? dateTimeValues.rsvpDeadline.selected
        : false,
    };

    const legacyValidation = validateEventForm(combinedFormData);

    if (!legacyValidation.isValid) {
      Alert.alert('Error', legacyValidation.message);
      return;
    }

    setIsCreating(true);

    try {
      const eventData = formatEventForStorage(combinedFormData, currentUserId);

      eventData.createdAt = Timestamp.now();
      eventData.eventTimestamp = Timestamp.fromDate(eventData.eventTimestamp);

      // Handle RSVP deadline timestamp conversion
      if (eventData.rsvpDeadlineTimestamp) {
        eventData.rsvpDeadlineTimestamp = Timestamp.fromDate(
          eventData.rsvpDeadlineTimestamp
        );
      }

      const eventRef = await addDoc(collection(db, 'events'), eventData);

      await updateEventCreationMetrics(currentUserId, eventRef.id);

      loadSuggestions();
      resetForm();
      resetDateTime();

      Alert.alert(
        'Success!',
        'Event created successfully! You are automatically subscribed to your event.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', `Failed to create event: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  }, [
    currentUserId,
    userData,
    formData,
    dateTimeValues,
    validateForm,
    validateDateTime,
    loadSuggestions,
    resetForm,
    resetDateTime,
    navigation,
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

        {/* Event Name with Smart Auto-Complete */}
        <Text style={styles.label}>Event Name *</Text>
        <View style={styles.inputContainer}>
          <VibeInput
            value={formData.title}
            onChangeText={(text) => handleInputChange('title', text)}
            onFocus={() => handleInputFocus('title')}
            onBlur={() => hideSuggestions('title')}
            placeholder="Enter event name"
            maxLength={100}
          />
          <VibeAutoComplete
            suggestions={getFieldData('title', formData.title).suggestions}
            onSelect={(suggestion) =>
              handleSuggestionSelect('title', suggestion)
            }
            visible={getFieldData('title', formData.title).isVisible}
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
          onSelect={togglePrivacy}
        />

        {/* Date & Time */}
        <Text style={styles.label}>When *</Text>
        <PickerRow
          pickerId="event"
          dateIcon="📅"
          timeIcon="⏰"
          datePlaceholder="Date"
          timePlaceholder="Time"
        />

        {/* Location with SMART Location Lookup! */}
        <Text style={styles.label}>Location * </Text>
        <View style={styles.inputContainer}>
          <VibeInput
            value={formData.location}
            onChangeText={(text) => handleInputChange('location', text)}
            onFocus={() => handleInputFocus('location')}
            onBlur={() => hideSuggestions('location')}
            placeholder="Enter location"
            maxLength={200}
          />
          <VibeAutoComplete
            suggestions={(() => {
              const smartSuggestions = getFieldData(
                'location',
                formData.location
              );

              // Store the full objects for later lookup
              window.locationSuggestionObjects =
                smartSuggestions.suggestions || [];

              const formattedSuggestions =
                smartSuggestions.suggestions?.map((s) => {
                  if (s && s.text) {
                    return s.type === 'location'
                      ? `${s.icon || '📍'} ${s.text}`
                      : s.text;
                  }
                  return s || '';
                }) || [];

              return formattedSuggestions;
            })()}
            onSelect={(suggestionText) => {
              if (!suggestionText) return;

              // Find the full object that matches this text
              const fullSuggestion = window.locationSuggestionObjects?.find(
                (s) => {
                  if (!s || !s.text) return false;
                  const displayText =
                    s.type === 'location'
                      ? `${s.icon || '📍'} ${s.text}`
                      : s.text;
                  return displayText === suggestionText;
                }
              );

              if (fullSuggestion && fullSuggestion.type === 'location') {
                // This is a smart location - set location and address
                updateField('location', fullSuggestion.text);
                updateField('address', fullSuggestion.address);
              } else {
                updateField('location', cleanText);
              }

              // Hide suggestions
              hideSuggestions('location');
            }}
            visible={getFieldData('location', formData.location).isVisible}
            showCount={false}
          />
        </View>

        {/* Address (Auto-populated from location!) */}
        <Text style={styles.label}>Address (optional)</Text>
        <VibeInput
          value={formData.address}
          onChangeText={(text) => updateField('address', text)}
          placeholder="123 Main St, City, State 12345"
          maxLength={300}
          style={formData.address ? styles.autoFilledInput : undefined}
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

        {/* Host Contact Info */}
        <Text style={styles.label}>Host Contact Information</Text>
        <VibeSegmentedControl
          options={[
            { value: true, label: 'Show Contact' },
            { value: false, label: 'Hide Contact' },
          ]}
          selectedValue={formData.showHostContact}
          onSelect={toggleHostContact}
        />

        {/* RSVP Deadline */}
        <Text style={styles.label}>RSVP Deadline</Text>
        <VibeSegmentedControl
          options={[
            { value: false, label: 'No Deadline' },
            { value: true, label: 'Set Deadline' },
          ]}
          selectedValue={formData.hasRsvpDeadline}
          onSelect={toggleRsvpDeadline}
        />

        {/* RSVP Deadline Picker */}
        {formData.hasRsvpDeadline && (
          <PickerRow
            pickerId="rsvpDeadline"
            dateIcon="📅"
            timeIcon="⏰"
            datePlaceholder="Deadline Date"
            timePlaceholder="Deadline Time"
          />
        )}

        {/* Entry Fee */}
        <Text style={styles.label}>Entry Fee</Text>
        <VibeSegmentedControl
          options={[
            { value: false, label: 'Free' },
            { value: true, label: 'Paid' },
          ]}
          selectedValue={formData.hasFee}
          onSelect={toggleFee}
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

        {/* Details with Smart Auto-Complete */}
        <Text style={styles.label}>Details</Text>
        <View style={styles.inputContainer}>
          <VibeInput
            value={formData.details}
            onChangeText={(text) => handleInputChange('details', text)}
            onFocus={() => handleInputFocus('details')}
            onBlur={() => hideSuggestions('details')}
            multiline
            placeholder="Add any additional details about your event..."
            style={{
              minHeight: 80,
              textAlignVertical: 'top',
              height: Math.max(80, formData.inputHeight),
            }}
            onContentSizeChange={(e) =>
              updateInputHeight(e.nativeEvent.contentSize.height)
            }
            maxLength={500}
          />
          <VibeAutoComplete
            suggestions={getFieldData('details', formData.details).suggestions}
            onSelect={(suggestion) =>
              handleSuggestionSelect('details', suggestion)
            }
            visible={getFieldData('details', formData.details).isVisible}
          />
        </View>

        {/* Template Buttons */}
        <View style={styles.templateButtons}>
          <VibeButtonPlain
            label="Use Template"
            onPress={() => setShowTemplateModal(true)}
            style={styles.templateButton}
          />

          <VibeButtonPlain
            label="Save Template"
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
          {isDirty && '\n✏️ You have unsaved changes'}
          {formData.address && '\n✨ Address was auto-filled from location'}
        </Text>
      </ScrollView>

      {/* ALL DATE/TIME MODALS IN ONE LINE! */}
      {DateTimePickerModals}

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
  helpText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
    fontFamily: theme.fonts.main,
  },
  autoFilledInput: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
});
