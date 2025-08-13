// FILE: screens/CreateEventScreen.js (Refactored)

import React, { useEffect, useCallback } from 'react';
import { Alert } from 'react-native';

// Components
import CreateEventForm from '../CreateEventForm';

// Hooks
import { useSuggestions } from '../hooks/useSuggestions';
import { useEventTemplates } from '../templates/hooks/useEventTemplates';
import useDateTimePickers from '../hooks/useDateTimePickers';
import useEventFormState, {
  eventFormValidators,
} from '../hooks/useEventFormState';
import useSmartAutoComplete, {
  autoCompleteConfigs,
} from '../hooks/useSmartAutoComplete';
import { useEventTips } from '../EventTipsModal';

// Firebase
import { db } from '../../../auth/firebase';
import { Timestamp, collection, addDoc } from 'firebase/firestore';

// Utils and Context
import { useAuth } from '../../../auth/AuthContext';
import {
  validateEventForm,
  formatEventForStorage,
} from '../utils/eventFormValidation';
import { validateUserCanCreateEvent } from '../utils/eventValidation';
import { updateEventCreationMetrics } from '../attendees/utils/userMetrics';

export default function CreateEventScreen({ navigation }) {
  const { currentUserId, userData } = useAuth();
  const { showTips, closeTips, showTipsManually } = useEventTips('create');
  const { suggestions, isLoading, loadSuggestions } = useSuggestions();

  // FORM STATE HOOK
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
      required: false,
      futureOnly: true,
      maxDate: 'event',
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
  const autoCompleteConfig = React.useMemo(
    () => ({
      location: autoCompleteConfigs.eventLocation,
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
        updateField('address', locationData.address);
      },
      [updateField]
    )
  );

  // TEMPLATE HOOK
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
  const [isCreating, setIsCreating] = React.useState(false);
  const [showTemplateModal, setShowTemplateModal] = React.useState(false);

  // Load suggestions and integrate with smart auto-complete
  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  useEffect(() => {
    if (suggestions.titles || suggestions.locations || suggestions.details) {
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

  // Input handlers
  const handleInputChange = useCallback(
    (field, value) => {
      if (autoCompleteConfig[field]) {
        handleSmartFieldChange(field, value, updateField);
      } else {
        updateField(field, value);
      }
    },
    [autoCompleteConfig, handleSmartFieldChange, updateField]
  );

  const handleInputFocus = useCallback(
    (field) => {
      if (autoCompleteConfig[field]) {
        handleSmartFieldFocus(field, formData[field] || '');
      }
    },
    [autoCompleteConfig, handleSmartFieldFocus, formData]
  );

  const handleSuggestionSelect = useCallback(
    (field, suggestion) => {
      if (autoCompleteConfig[field]) {
        handleSmartSuggestionSelect(
          field,
          suggestion,
          formData[field] || '',
          updateField
        );
      } else {
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

  const hideSuggestions = useCallback(
    (field) => {
      if (autoCompleteConfig[field]) {
        hideSmartSuggestions(field);
      }
    },
    [autoCompleteConfig, hideSmartSuggestions]
  );

  // Template handlers
  const handleSaveAsTemplate = useCallback(() => {
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
        whatsProvided: templateData.whatsProvided || '',
        whatToBring: templateData.whatToBring || '',
        parkingInstructions: templateData.parkingInstructions || '',
        dressCode: templateData.dressCode || '',
        ageRestrictions: templateData.ageRestrictions || '',
      });

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

  // Create event handler
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

    const fieldValidation = validateForm(eventFormValidators);

    if (!fieldValidation.isValid) {
      const firstError = Object.values(fieldValidation.errors)[0];
      Alert.alert('Error', firstError);
      return;
    }

    const dateTimeValidation = validateDateTime();

    if (!dateTimeValidation.isValid) {
      Alert.alert('Error', dateTimeValidation.message);
      return;
    }

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
    <CreateEventForm
      // Data
      formData={formData}
      userData={userData}
      isLoading={isLoading}
      templatesLoading={templatesLoading}
      isCreating={isCreating}
      showTips={showTips}
      showTemplateModal={showTemplateModal}
      showSaveTemplate={showSaveTemplate}
      templates={templates}
      templateName={templateName}
      // Handlers
      onInputChange={handleInputChange}
      onInputFocus={handleInputFocus}
      onSuggestionSelect={handleSuggestionSelect}
      hideSuggestions={hideSuggestions}
      getFieldData={getFieldData}
      updateField={updateField}
      updateInputHeight={updateInputHeight}
      togglePrivacy={togglePrivacy}
      toggleRsvpDeadline={toggleRsvpDeadline}
      toggleHostContact={toggleHostContact}
      toggleFee={toggleFee}
      // Actions
      onShowTipsManually={showTipsManually}
      onCloseTips={closeTips}
      onShowTemplateModal={() => setShowTemplateModal(true)}
      onCloseTemplateModal={() => setShowTemplateModal(false)}
      onShowSaveTemplate={handleShowSaveTemplate}
      onHideSaveTemplateModal={hideSaveTemplateModal}
      onApplyTemplate={handleApplyTemplate}
      onDeleteTemplate={deleteTemplate}
      onSaveAsTemplate={handleSaveAsTemplate}
      setTemplateName={setTemplateName}
      onCreate={handleCreate}
      // DateTime
      PickerRow={PickerRow}
      DateTimePickerModals={DateTimePickerModals}
      dateTimeValues={dateTimeValues}
    />
  );
}
