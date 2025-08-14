// FILE: screens/CreateEventScreen.js (Complete Rewritten Version)

import React, { useEffect, useCallback } from 'react';
import { Alert } from 'react-native';

// Components
import CreateEventForm from '../CreateEventForm';
import { TemplateSelectionModal, SaveTemplateModal } from '../templates';

// Hooks
import { useSuggestions } from '../hooks/useSuggestions';
import useDateTimePickers from '../hooks/useDateTimePickers';
import useEventFormState from '../hooks/useEventFormState';
import useSmartAutoComplete, {
  autoCompleteConfigs,
} from '../hooks/useSmartAutoComplete';
import { useEventTips } from '../EventTipsModal';
import useEventForm from '../hooks/useEventForm';
import useTemplateManager from '../templates';
// Utils and Context
import { useAuth } from '../../../auth/AuthContext';

export default function CreateEventScreen({ navigation }) {
  const { currentUserId, userData } = useAuth();
  const { showTips, closeTips, showTipsManually } = useEventTips('create');
  const { suggestions, isLoading, loadSuggestions } = useSuggestions();

  // Event form hook (handles all creation logic)
  const { isSubmitting, submitEvent } = useEventForm();

  // Template system (handles all template operations)
  const {
    // Data
    templates,
    loading: templatesLoading,

    // Modal state
    showSelectionModal,
    showSaveModal,
    templateName,
    setTemplateName,

    // Actions
    saveAsTemplate,
    applyTemplate,
    deleteTemplate,
    getTemplatePreview,

    // Modal controls
    openSelectionModal,
    closeSelectionModal,
    openSaveModal,
    closeSaveModal,
  } = useTemplateManager(currentUserId);

  // Form state management
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
  } = useEventFormState({}, { enableDirtyTracking: true });

  // Date/time picker configuration
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

  // Date/time picker management
  const {
    values: dateTimeValues,
    PickerRow,
    DateTimePickerModals,
    validateAll: validateDateTime,
    updateFromData: updateDateTimeFromTemplate,
    resetAll: resetDateTime,
  } = useDateTimePickers(dateTimeConfig);

  // Smart auto-complete configuration
  const autoCompleteConfig = React.useMemo(
    () => ({
      location: autoCompleteConfigs.eventLocation,
      title: autoCompleteConfigs.eventTitle,
      details: autoCompleteConfigs.eventDetails,
    }),
    []
  );

  // Smart auto-complete management
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

  // Load suggestions on mount and integrate with auto-complete
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

  const handleSaveAsTemplate = useCallback(async () => {
    try {
      const combinedFormData = {
        ...formData,
        date: dateTimeValues.event.value,
        dateSelected: dateTimeValues.event.selected,
        time: dateTimeValues.event.value,
        timeSelected: dateTimeValues.event.selected,
        rsvpDeadline: dateTimeValues.rsvpDeadline.value,
        rsvpDeadlineSelected: dateTimeValues.rsvpDeadline.selected,
      };

      await saveAsTemplate(combinedFormData, templateName);
      Alert.alert('Success', `Template "${templateName}" saved successfully!`);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save template');
    }
  }, [formData, dateTimeValues, saveAsTemplate, templateName]);

  const handleApplyTemplate = useCallback(
    (template) => {
      try {
        const templateFormData = applyTemplate(template);

        // Apply form data
        replaceFormData({
          title: templateFormData.title || '',
          location: templateFormData.location || '',
          address: templateFormData.address || '',
          details: templateFormData.details || '',
          maxGuests: templateFormData.maxGuests || '',
          hasFee: templateFormData.hasFee || false,
          entryFee: templateFormData.entryFee || '',
          isPrivate: templateFormData.isPrivate || false,
          additionalHosts: templateFormData.additionalHosts || [],
          showHostContact:
            templateFormData.showHostContact !== undefined
              ? templateFormData.showHostContact
              : true,
          hasRsvpDeadline: templateFormData.hasRsvpDeadline || false,
          whatsProvided: templateFormData.whatsProvided || '',
          whatToBring: templateFormData.whatToBring || '',
          parkingInstructions: templateFormData.parkingInstructions || '',
          dressCode: templateFormData.dressCode || '',
          ageRestrictions: templateFormData.ageRestrictions || '',
        });

        // Apply date/time if present in template
        if (templateFormData.date || templateFormData.time) {
          updateDateTimeFromTemplate({
            event: {
              value: templateFormData.date || new Date(),
              selected: templateFormData.dateSelected || false,
            },
            rsvpDeadline: {
              value: templateFormData.rsvpDeadline || new Date(),
              selected: templateFormData.rsvpDeadlineSelected || false,
            },
          });
        }

        closeSelectionModal();
        Alert.alert(
          'Template Applied',
          `"${template.name}" has been loaded successfully.`
        );
      } catch (error) {
        Alert.alert('Error', error.message || 'Failed to apply template');
      }
    },
    [
      applyTemplate,
      replaceFormData,
      updateDateTimeFromTemplate,
      closeSelectionModal,
    ]
  );

  const handleDeleteTemplate = useCallback(
    async (templateId) => {
      try {
        await deleteTemplate(templateId);
        Alert.alert('Success', 'Template deleted successfully');
      } catch (error) {
        Alert.alert('Error', error.message || 'Failed to delete template');
      }
    },
    [deleteTemplate]
  );

  const handleSuccess = useCallback(() => {
    loadSuggestions();
    resetForm();
    resetDateTime();

    Alert.alert(
      'Success!',
      'Event created successfully! You are automatically subscribed to your event.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  }, [loadSuggestions, resetForm, resetDateTime, navigation]);

  const handleSubmit = useCallback(async () => {
    try {
      await submitEvent({
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
        isEditing: false,
        eventId: null,
        onSuccess: handleSuccess,
      });
    } catch (error) {
      if (error.message !== 'User cancelled creation') {
        Alert.alert('Error', error.message || 'Failed to create event');
      }
    }
  }, [
    submitEvent,
    currentUserId,
    userData,
    formData,
    dateTimeValues,
    validateForm,
    validateDateTime,
    handleSuccess,
  ]);

  return (
    <>
      <CreateEventForm
        // Data
        formData={formData}
        userData={userData}
        isLoading={isLoading}
        templatesLoading={templatesLoading}
        isCreating={isSubmitting}
        showTips={showTips}
        templates={templates}
        // Input handlers
        onInputChange={handleInputChange}
        onInputFocus={handleInputFocus}
        onSuggestionSelect={handleSuggestionSelect}
        hideSuggestions={hideSuggestions}
        getFieldData={getFieldData}
        updateField={updateField}
        updateInputHeight={updateInputHeight}
        // Form controls
        togglePrivacy={togglePrivacy}
        toggleRsvpDeadline={toggleRsvpDeadline}
        toggleHostContact={toggleHostContact}
        toggleFee={toggleFee}
        // Actions
        onShowTipsManually={showTipsManually}
        onCloseTips={closeTips}
        onShowTemplateModal={openSelectionModal}
        onShowSaveTemplate={() => openSaveModal(formData.title)}
        onCreate={handleSubmit}
        // DateTime
        PickerRow={PickerRow}
        DateTimePickerModals={DateTimePickerModals}
        dateTimeValues={dateTimeValues}
      />

      {/* Template Selection Modal */}
      <TemplateSelectionModal
        visible={showSelectionModal}
        onClose={closeSelectionModal}
        templates={templates.map((template) => ({
          ...template,
          preview: getTemplatePreview(template),
        }))}
        onSelectTemplate={handleApplyTemplate}
        onDeleteTemplate={handleDeleteTemplate}
      />

      {/* Save Template Modal */}
      <SaveTemplateModal
        visible={showSaveModal}
        onClose={closeSaveModal}
        templateName={templateName}
        setTemplateName={setTemplateName}
        onSave={handleSaveAsTemplate}
      />
    </>
  );
}
