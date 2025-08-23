// FILE: screens/CreateEventScreen.js (Complete Rewritten Version)

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useVibeAlert } from '../../components/ui/VibeAlertContext';

// Components
import CreateEventForm from '../components/CreateEventForm';
import { TemplateSelectionModal, SaveTemplateModal } from '../templates';

// Hooks
import useDateTimePickers from '../hooks/useDateTimePickers';
import useEventFormState from '../hooks/useEventFormState';
import useEventForm from '../hooks/useEventForm';
import { useTemplateManager } from '../hooks/templates/useTemplateManager';
import { useSuggestionsManager } from '../hooks/useSuggestionsManager';
import { usePastEventsManager } from '../hooks/usePastEventsManager';

// Utils and Context
import { useAuth } from '../../auth/AuthContext';

export default function CreateEventScreen({ navigation, route }) {
  const { currentUserId, userData } = useAuth();
  const vibeAlert = useVibeAlert();

  // Check if we have preserved form state from template save
  const preservedFormState = route?.params?.preservedFormState;

  // Use ref to prevent re-initialization (componentDidMount behavior)
  const hasInitialized = useRef(false);
  const stableFormRef = useRef(null);
  const stableSelectedContacts = useRef(
    preservedFormState?.selectedTextContacts || []
  );

  if (!hasInitialized.current) {
    hasInitialized.current = true;

    // Merge user default notification settings with preserved form state
    const userNotificationDefaults =
      userData?.userdata?.preferences?.notifications || {};
    const baseFormData = preservedFormState?.formData || {};

    // Merge notification settings with user defaults
    stableFormRef.current = {
      ...baseFormData,
      notificationSettings: {
        enabled: userNotificationDefaults.eventReminders ?? true,
        reminderTiming: userNotificationDefaults.reminderTiming ?? '1hour',
        notifyOnJoin: userNotificationDefaults.notifyOnJoin ?? true,
        notifyOnLeave: userNotificationDefaults.notifyOnLeave ?? true,
        sendReminders: userNotificationDefaults.eventReminders ?? true,
        sendDayBefore: userNotificationDefaults.sendDayBefore ?? true,
        newComments: userNotificationDefaults.newComments ?? true,
        customMessage: '',
        ...baseFormData.notificationSettings, // Preserve any existing notification settings
      },
    };
  }

  const [selectedTextContacts, setSelectedTextContacts] = useState(
    stableSelectedContacts.current
  );


  // Handle selected text contacts change
  const handleSelectedTextContactsChange = useCallback((contacts) => {
    setSelectedTextContacts(contacts);
  }, []);


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

  // Form state management - use stable ref that never changes after first init
  const formStateRef = React.useRef(stableFormRef.current);

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
    toggleAttendanceTracking,
    appendToDetails,
    updateInputHeight,
    validateForm,
  } = useEventFormState(formStateRef.current, { enableDirtyTracking: true });

  // Suggestions and autocomplete management
  const {
    suggestions,
    isLoading,
    handleInputChange,
    handleInputFocus,
    handleSuggestionSelect,
    hideSuggestions,
    getFieldData,
    loadSuggestions,
  } = useSuggestionsManager(
    updateField, 
    appendToDetails, 
    userData?.userdata?.studios?.default?.studioId || 'greenville_sc'
  );

  // Date/time picker configuration - use stable preserved values that don't change
  const stableDateTimeValues = hasInitialized.current
    ? preservedFormState?.dateTimeValues
    : null;
  const dateTimeConfig = {
    event: {
      label: 'Event Date & Time',
      required: true,
      futureOnly: true,
      minMinutesFromNow: 30,
      initialValue: stableDateTimeValues?.event?.value || new Date(),
      initialSelected: stableDateTimeValues?.event?.selected || false,
      initialDateSelected: stableDateTimeValues?.event?.dateSelected || false,
      initialTimeSelected: stableDateTimeValues?.event?.timeSelected || false,
    },
    rsvpDeadline: {
      label: 'RSVP Deadline',
      required: false,
      futureOnly: true,
      maxDate: 'event',
      initialValue: stableDateTimeValues?.rsvpDeadline?.value || new Date(),
      initialSelected: stableDateTimeValues?.rsvpDeadline?.selected || false,
      initialDateSelected:
        stableDateTimeValues?.rsvpDeadline?.dateSelected || false,
      initialTimeSelected:
        stableDateTimeValues?.rsvpDeadline?.timeSelected || false,
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

  // Past events management
  const { pastEvents, handleCreateTemplateFromPastEvent } =
    usePastEventsManager(
      currentUserId,
      applyTemplate,
      replaceFormData,
      closeSelectionModal,
      vibeAlert
    );

  // Clear preserved state from navigation params to prevent issues
  useEffect(() => {
    if (preservedFormState) {
      navigation.setParams({ preservedFormState: null });
    }
  }, [preservedFormState, navigation]);

  const handleSaveAsTemplate = useCallback(async () => {
    closeSaveModal();

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

      const { addDoc, collection, serverTimestamp } = await import(
        'firebase/firestore'
      );
      const { db } = await import('../../auth/services/firebase');

      const template = {
        name: templateName,
        payload: combinedFormData,
        createdAt: serverTimestamp(),
        version: 1,
      };

      await addDoc(
        collection(db, `users/${currentUserId}/eventTemplates`),
        template
      );

      vibeAlert.cyan(
        'Template Saved',
        `"${templateName}" locked and loaded! 🚀`
      );
    } catch (error) {
      vibeAlert.error('Error', error.message || 'Failed to save template');
    }
  }, [formData, dateTimeValues, templateName, closeSaveModal, currentUserId]);

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
          trackAttendance:
            templateFormData.trackAttendance !== undefined
              ? templateFormData.trackAttendance
              : false,
        });

        // Apply date/time if present in template
        if (templateFormData.date || templateFormData.time) {
          const templateDateTime =
            templateFormData.date || templateFormData.time || new Date();
          const now = new Date();

          // If template date is in the past, adjust it to be in the future
          // Keep the same time but move to tomorrow (or later if needed)
          let eventDateTime = new Date(templateDateTime);
          if (eventDateTime <= now) {
            // Move to tomorrow at the same time
            eventDateTime = new Date(now);
            eventDateTime.setDate(eventDateTime.getDate() + 1);
            eventDateTime.setHours(templateDateTime.getHours());
            eventDateTime.setMinutes(templateDateTime.getMinutes());
            eventDateTime.setSeconds(0);
            eventDateTime.setMilliseconds(0);
          }

          const hasRsvpDeadline =
            templateFormData.hasRsvpDeadline && templateFormData.rsvpDeadline;

          updateDateTimeFromTemplate({
            event: {
              value: eventDateTime,
              selected: true, // Overall picker is selected
              dateSelected: true, // Date component is selected
              timeSelected: true, // Time component is selected
            },
            rsvpDeadline: {
              value: hasRsvpDeadline
                ? templateFormData.rsvpDeadline
                : new Date(),
              selected: hasRsvpDeadline, // Only selected if template actually has RSVP deadline
              dateSelected: hasRsvpDeadline, // Only if RSVP deadline exists
              timeSelected: hasRsvpDeadline, // Only if RSVP deadline exists
            },
          });
        }

        closeSelectionModal();
        vibeAlert.turquoise(
          'Template Applied',
          `"${template.name}" has been loaded successfully! 💎`
        );
      } catch (error) {
        vibeAlert.error('Error', error.message || 'Failed to apply template');
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
        vibeAlert.success('Success', 'Template deleted successfully');
      } catch (error) {
        vibeAlert.error('Error', error.message || 'Failed to delete template');
      }
    },
    [deleteTemplate]
  );

  const handleSuccess = useCallback(() => {
    loadSuggestions();
    resetDateTime();

    vibeAlert.aqua(
      'Event Created!',
      'Your event is live! You are automatically subscribed. 🌊',
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
        selectedTextContacts, // Pass selected text contacts for SMS invites
        vibeAlert, // Pass vibeAlert to the hook
      });
    } catch (error) {
      if (error.message !== 'User cancelled creation') {
        vibeAlert.error('Error', error.message || 'Failed to create event');
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
    selectedTextContacts, // Include in dependencies
    vibeAlert, // Include vibeAlert in dependencies
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
        templates={templates}
        // Input handlers
        onInputChange={handleInputChange}
        onInputFocus={(field) => handleInputFocus(field, formData)}
        onSuggestionSelect={(field, suggestion) =>
          handleSuggestionSelect(field, suggestion, formData)
        }
        hideSuggestions={hideSuggestions}
        getFieldData={getFieldData}
        updateField={updateField}
        updateInputHeight={updateInputHeight}
        // Form controls
        togglePrivacy={togglePrivacy}
        toggleRsvpDeadline={toggleRsvpDeadline}
        toggleHostContact={toggleHostContact}
        toggleFee={toggleFee}
        toggleAttendanceTracking={toggleAttendanceTracking}
        // Actions
        onShowTemplateModal={openSelectionModal}
        onShowSaveTemplate={() => openSaveModal(formData.title)}
        onCreate={handleSubmit}
        // DateTime
        PickerRow={PickerRow}
        DateTimePickerModals={DateTimePickerModals}
        dateTimeValues={dateTimeValues}
        // Text invite tracking
        onSelectedTextContactsChange={handleSelectedTextContactsChange}
      />
      
      {/* Template Selection Modal */}
      <TemplateSelectionModal
        visible={showSelectionModal}
        onClose={closeSelectionModal}
        templates={templates.map((template) => ({
          ...template,
          preview: getTemplatePreview(template),
        }))}
        pastEvents={pastEvents}
        onSelectTemplate={handleApplyTemplate}
        onDeleteTemplate={handleDeleteTemplate}
        onCreateTemplateFromPastEvent={handleCreateTemplateFromPastEvent}
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
