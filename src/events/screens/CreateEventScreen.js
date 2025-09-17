// FILE: screens/CreateEventScreen.js (Complete Rewritten Version)

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useVibeAlert } from '../../components/ui/base/VibeAlertContext';
import { BannedUserModal } from '../../components/ui';

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
import { banEnforcementService } from '../../services/banEnforcementService';

export default function CreateEventScreen({ navigation, route }) {
  const { currentUserId, userData } = useAuth();
  const vibeAlert = useVibeAlert();

  // Track if event was successfully created to allow navigation
  const [eventCreatedSuccessfully, setEventCreatedSuccessfully] =
    useState(false);
  const isNavigatingBackRef = useRef(false);

  // Ban enforcement state
  const [banStatus, setBanStatus] = useState(null);
  const [showBannedModal, setShowBannedModal] = useState(false);

  // Check if we have preserved form state from template save or template from event
  const preservedFormState = route?.params?.preservedFormState;
  const templateFromEvent = route?.params?.templateFromEvent;

  // Use ref to prevent re-initialization (componentDidMount behavior)
  const hasInitialized = useRef(false);
  const stableFormRef = useRef(null);
  const stableSelectedContacts = useRef(
    preservedFormState?.selectedTextContacts || []
  );

  if (!hasInitialized.current) {
    hasInitialized.current = true;

    // Get user hosting defaults - they always exist because defaultUserSettings initializes them
    const hostingDefaults =
      userData?.userdata?.settings?.notifications?.hosting;
    const baseFormData =
      preservedFormState?.formData || templateFromEvent || {};

    // Use user's hosting defaults directly (deep copy)
    stableFormRef.current = {
      ...baseFormData,
      notificationSettings: JSON.parse(JSON.stringify(hostingDefaults)),
    };
  }

  // Invitation state management
  const [selectedTextContacts, setSelectedTextContacts] = useState(
    stableSelectedContacts.current
  );

  // Guest invitation selections
  const [selectedGuestUsers, setSelectedGuestUsers] = useState([]);
  const [selectedGuestContacts, setSelectedGuestContacts] = useState([]);
  const [selectedGuestPhoneContacts, setSelectedGuestPhoneContacts] = useState(
    []
  );

  // Co-host invitation selections
  const [selectedCohostUsers, setSelectedCohostUsers] = useState([]);
  const [selectedCohostContacts, setSelectedCohostContacts] = useState([]);
  const [selectedCohostPhoneContacts, setSelectedCohostPhoneContacts] =
    useState([]);

  // Handle selected text contacts change
  const handleSelectedTextContactsChange = useCallback((contacts) => {
    setSelectedTextContacts(contacts);
  }, []);

  // Handle guest invitation selections from InviteScreen
  const handleGuestInvitationChange = useCallback((selections) => {
    console.log(
      '[CreateEventScreen] Guest invitation selections received:',
      selections
    );
    if (selections.users) setSelectedGuestUsers(selections.users);
    if (selections.contacts) setSelectedGuestContacts(selections.contacts);
    if (selections.phoneContacts)
      setSelectedGuestPhoneContacts(selections.phoneContacts);
  }, []);

  // Handle co-host invitation selections from InviteScreen
  const handleCohostInvitationChange = useCallback((selections) => {
    console.log(
      '[CreateEventScreen] Co-host invitation selections received:',
      selections
    );
    if (selections.users) setSelectedCohostUsers(selections.users);
    if (selections.contacts) setSelectedCohostContacts(selections.contacts);
    if (selections.phoneContacts)
      setSelectedCohostPhoneContacts(selections.phoneContacts);
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
      userData?.userdata?.studios?.default?.studioId || 'greenville_sc',
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
    if (templateFromEvent) {
      navigation.setParams({ templateFromEvent: null });
    }
  }, [preservedFormState, templateFromEvent, navigation]);

  // Check if form has meaningful user input (not just default/empty values)
  const hasActualChanges = useCallback(() => {
    // Check for any text content in main fields
    const hasTextContent =
      formData.title.trim() ||
      formData.location.trim() ||
      formData.address.trim() ||
      formData.details.trim() ||
      (formData.maxGuests ? formData.maxGuests.toString().trim() : '');

    // Check for any configuration changes from defaults (compare against DEFAULT values)
    const hasConfigChanges =
      formData.hasFee !== false ||
      formData.isPrivate !== false ||
      formData.showHostContact !== false ||
      formData.hasRsvpDeadline !== false ||
      formData.trackAttendance !== true ||
      (formData.entryFee && String(formData.entryFee).trim());

    // Check for any invitations/guests
    const hasInvitations =
      selectedGuestUsers.length > 0 ||
      selectedGuestContacts.length > 0 ||
      selectedGuestPhoneContacts.length > 0 ||
      selectedCohostUsers.length > 0 ||
      selectedCohostContacts.length > 0 ||
      selectedCohostPhoneContacts.length > 0 ||
      selectedTextContacts.length > 0;

    // Check for date/time changes (if they exist and differ from defaults)
    const hasDateTimeChanges =
      dateTimeValues &&
      (dateTimeValues.startDate ||
        dateTimeValues.startTime ||
        dateTimeValues.endDate ||
        dateTimeValues.endTime);

    return (
      hasTextContent || hasConfigChanges || hasInvitations || hasDateTimeChanges
    );
  }, [
    formData,
    selectedGuestUsers,
    selectedGuestContacts,
    selectedGuestPhoneContacts,
    selectedCohostUsers,
    selectedCohostContacts,
    selectedCohostPhoneContacts,
    selectedTextContacts,
    dateTimeValues,
  ]);

  // Handle back navigation confirmation logic
  const handleBackNavigation = useCallback(
    (onConfirm) => {
      // Allow navigation if event was successfully created or already navigating
      if (eventCreatedSuccessfully || isNavigatingBackRef.current) {
        if (onConfirm) onConfirm();
        return false;
      }

      // Only show confirmation if user has made actual meaningful changes
      if (hasActualChanges()) {
        // Show confirmation dialog when form has changes
        vibeAlert.confirm(
          'Discard Changes?',
          'You have unsaved changes. Are you sure you want to go back?',
          () => {
            // Set flag to prevent re-triggering and execute navigation
            isNavigatingBackRef.current = true;
            if (onConfirm) {
              onConfirm();
            }
          },
          () => {
            // Do nothing - stay on screen
          }
        );
        return true; // Prevent navigation
      }

      // Allow navigation when form is empty/default
      if (onConfirm) onConfirm();
      return false;
    },
    [eventCreatedSuccessfully, hasActualChanges, vibeAlert]
  );

  // Handle hardware back button
  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          // Always handle the back press ourselves and prevent default behavior
          handleBackNavigation(() => navigation.goBack());
          return true; // Always prevent default back behavior
        }
      );
      return () => backHandler.remove();
    }, [handleBackNavigation, navigation])
  );

  // Handle header back button and navigation away
  useFocusEffect(
    useCallback(() => {
      const unsubscribe = navigation.addListener('beforeRemove', (e) => {
        // If we're already navigating back (user confirmed), allow it
        if (isNavigatingBackRef.current || eventCreatedSuccessfully) {
          return;
        }

        const shouldPrevent = handleBackNavigation(() => {
          navigation.dispatch(e.data.action);
        });

        if (shouldPrevent) {
          e.preventDefault();
        }
      });

      return unsubscribe;
    }, [navigation, handleBackNavigation, eventCreatedSuccessfully])
  );

  const handleSaveAsTemplate = useCallback(async () => {
    closeSaveModal();

    try {
      const combinedFormData = {
        ...formData,
        // Only include date/time in templates if actually selected
        ...(dateTimeValues.event.selected
          ? {
              date: dateTimeValues.event.value,
              dateSelected: dateTimeValues.event.selected,
              time: dateTimeValues.event.value,
              timeSelected: dateTimeValues.event.selected,
            }
          : {}),
        ...(dateTimeValues.rsvpDeadline.selected
          ? {
              rsvpDeadline: dateTimeValues.rsvpDeadline.value,
              rsvpDeadlineSelected: dateTimeValues.rsvpDeadline.selected,
            }
          : {}),

        // Include all invitation data in the template
        selectedGuestUsers,
        selectedGuestContacts,
        selectedGuestPhoneContacts,
        selectedCohostUsers,
        selectedCohostContacts,
        selectedCohostPhoneContacts,
        selectedTextContacts,
      };

      // Use the template service which handles undefined value cleaning
      const { saveEventTemplate } = await import('../services/templates');

      await saveEventTemplate(currentUserId, {
        name: templateName,
        payload: combinedFormData,
      });

      vibeAlert.cyan(
        'Template Saved',
        `"${templateName}" locked and loaded! 🚀`
      );
    } catch (error) {
      console.error('[CreateEventScreen] Template save error:', error);
      vibeAlert.error('Error', error.message || 'Failed to save template');
    }
  }, [
    formData,
    dateTimeValues,
    templateName,
    closeSaveModal,
    currentUserId,
    selectedGuestUsers,
    selectedGuestContacts,
    selectedGuestPhoneContacts,
    selectedCohostUsers,
    selectedCohostContacts,
    selectedCohostPhoneContacts,
    selectedTextContacts,
  ]);

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
          maxGuests: templateFormData.maxGuests ? templateFormData.maxGuests.toString() : '',
          hasFee: templateFormData.hasFee || false,
          entryFee: templateFormData.entryFee || '',
          isPrivate: templateFormData.isPrivate || false,
          showHostContact:
            templateFormData.showHostContact !== undefined
              ? templateFormData.showHostContact
              : true,
          hasRsvpDeadline: !!templateFormData.rsvpDeadline,
          rsvpDeadlineType: templateFormData.rsvpDeadlineType || 'none',
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

        // Apply invitation selections from template
        if (templateFormData.selectedGuestUsers) {
          setSelectedGuestUsers(templateFormData.selectedGuestUsers);
        }
        if (templateFormData.selectedGuestContacts) {
          setSelectedGuestContacts(templateFormData.selectedGuestContacts);
        }
        if (templateFormData.selectedGuestPhoneContacts) {
          setSelectedGuestPhoneContacts(
            templateFormData.selectedGuestPhoneContacts
          );
        }
        if (templateFormData.selectedCohostUsers) {
          setSelectedCohostUsers(templateFormData.selectedCohostUsers);
        }
        if (templateFormData.selectedCohostContacts) {
          setSelectedCohostContacts(templateFormData.selectedCohostContacts);
        }
        if (templateFormData.selectedCohostPhoneContacts) {
          setSelectedCohostPhoneContacts(
            templateFormData.selectedCohostPhoneContacts
          );
        }
        if (templateFormData.selectedTextContacts) {
          setSelectedTextContacts(templateFormData.selectedTextContacts);
        }

        // Apply date/time if present in template and valid
        if (
          (templateFormData.date && templateFormData.date !== null) ||
          (templateFormData.time && templateFormData.time !== null)
        ) {
          const templateDateTime =
            templateFormData.date || templateFormData.time;

          // Ensure templateDateTime is a valid Date object
          const validTemplateDate =
            templateDateTime instanceof Date && !isNaN(templateDateTime)
              ? templateDateTime
              : new Date(templateDateTime);

          // If still invalid, skip template date/time
          if (isNaN(validTemplateDate)) {
            console.warn(
              'Invalid template date/time, skipping:',
              templateDateTime
            );
            return;
          }

          const now = new Date();

          // If template date is in the past, adjust it to be in the future
          // Keep the same time but move to tomorrow (or later if needed)
          let eventDateTime = new Date(validTemplateDate);
          if (eventDateTime <= now) {
            // Move to tomorrow at the same time
            eventDateTime = new Date(now);
            eventDateTime.setDate(eventDateTime.getDate() + 1);
            eventDateTime.setHours(validTemplateDate.getHours());
            eventDateTime.setMinutes(validTemplateDate.getMinutes());
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
      setSelectedGuestUsers,
      setSelectedGuestContacts,
      setSelectedGuestPhoneContacts,
      setSelectedCohostUsers,
      setSelectedCohostContacts,
      setSelectedCohostPhoneContacts,
      setSelectedTextContacts,
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

    // Set flag to allow navigation
    setEventCreatedSuccessfully(true);

    vibeAlert.aqua(
      'Event Created!',
      'Your event is live! You are automatically subscribed. 🌊',
      [
        {
          text: 'OK',
          onPress: () => {
            // Navigation should now work because eventCreatedSuccessfully is true
            navigation.goBack();
          },
        },
      ]
    );
  }, [loadSuggestions, resetForm, resetDateTime, navigation]);

  const handleSubmit = useCallback(async () => {
    try {
      // Prepare all invitation selections
      const selectedInvitations = {
        users: selectedGuestUsers,
        contacts: selectedGuestContacts,
        phoneContacts: selectedGuestPhoneContacts,
        cohosts: selectedCohostUsers,
        cohostContacts: selectedCohostContacts,
        cohostPhoneContacts: selectedCohostPhoneContacts,
        textContacts: [...selectedTextContacts, ...selectedCohostPhoneContacts],
        defaultMessage: formData.invitationMessage || '', // Optional custom invitation message
      };

      console.log(`[CreateEventScreen] Selected invitations:`, {
        guestUsers: selectedGuestUsers.length,
        guestContacts: selectedGuestContacts.length,
        phoneContacts: selectedGuestPhoneContacts.length,
        cohostUsers: selectedCohostUsers.length,
        cohostPhoneContacts: selectedCohostPhoneContacts.length,
        textContacts: selectedTextContacts.length,
        totalInvitations:
          selectedGuestUsers.length +
          selectedGuestContacts.length +
          selectedGuestPhoneContacts.length +
          selectedCohostUsers.length +
          selectedCohostPhoneContacts.length +
          selectedTextContacts.length,
      });

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
        selectedInvitations, // Pass all invitation selections
        vibeAlert,
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
    selectedGuestUsers,
    selectedGuestContacts,
    selectedGuestPhoneContacts,
    selectedCohostUsers,
    selectedCohostPhoneContacts,
    selectedTextContacts,
    vibeAlert,
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
        vibeAlert={vibeAlert}
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
        // Actions
        onShowTemplateModal={openSelectionModal}
        onShowSaveTemplate={() => openSaveModal(formData.title)}
        onCreate={handleSubmit}
        // DateTime
        PickerRow={PickerRow}
        DateTimePickerModals={DateTimePickerModals}
        dateTimeValues={dateTimeValues}
        // Invitation tracking
        onSelectedTextContactsChange={handleSelectedTextContactsChange}
        onGuestInvitationChange={handleGuestInvitationChange}
        onCohostInvitationChange={handleCohostInvitationChange}
        // Current invitation counts for UI display
        selectedGuestCount={
          selectedGuestUsers.length +
          selectedGuestContacts.length +
          selectedGuestPhoneContacts.length
        }
        selectedCohostCount={
          selectedCohostUsers.length +
          selectedCohostContacts.length +
          selectedCohostPhoneContacts.length
        }
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
