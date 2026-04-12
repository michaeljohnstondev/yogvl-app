// FILE: screens/EditEventScreen.js

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { BackHandler, View, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useVibeAlert } from '../../components/ui/base/VibeAlertContext';

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
import { StudioService } from '../../services/StudioService';

export default function EditEventScreen({ navigation, route }) {
  const { currentUserId, userData } = useAuth();
  const vibeAlert = useVibeAlert();

  // Get event data from route params
  const { eventId, eventData: routeEventData, studioId } = route.params || {};

  // State for loaded event data (if not provided via params)
  const [loadedEventData, setLoadedEventData] = useState(null);
  const [isLoadingEventData, setIsLoadingEventData] = useState(false);

  // Use event data from route params or loaded data
  const eventData = routeEventData || loadedEventData;

  // Track if event was successfully updated to allow navigation
  const [eventUpdatedSuccessfully, setEventUpdatedSuccessfully] =
    useState(false);

  // Studio timezone for correct date/time conversion
  const [studioTimezone, setStudioTimezone] = useState(null);

  // Ref to bypass navigation blocking when user confirms discard
  const shouldAllowNavigation = useRef(false);

  // Load event data if not provided via params
  useEffect(() => {
    if (!routeEventData && eventId && !isLoadingEventData) {
      setIsLoadingEventData(true);

      const loadEventData = async () => {
        try {
          const { doc, getDoc } = await import('../../lib/firebase/firestore');
          const { db } = await import('../../auth/services/firebase');

          const userStudioId =
            studioId ||
            userData?.userdata?.studios?.default?.studioId ||
            'greenville_sc';
          const eventRef = doc(db, `studios/${userStudioId}/events`, eventId);
          const eventSnap = await getDoc(eventRef);

          if (eventSnap.exists()) {
            const data = eventSnap.data();
            setLoadedEventData(data);
          } else {
            vibeAlert.error('Error', 'Event not found');
            navigation.goBack();
          }
        } catch (error) {
          console.error('[EditEventScreen] Failed to load event:', error);
          vibeAlert.error('Error', 'Failed to load event data');
          navigation.goBack();
        } finally {
          setIsLoadingEventData(false);
        }
      };

      loadEventData();
    }
  }, [
    routeEventData,
    eventId,
    isLoadingEventData,
    studioId,
    userData,
    vibeAlert,
    navigation,
  ]);

  // Fetch studio timezone for correct date/time handling
  useEffect(() => {
    const userStudioId =
      studioId ||
      userData?.userdata?.studios?.default?.studioId ||
      'greenville_sc';
    StudioService.getStudioById(userStudioId)
      .then((studio) => setStudioTimezone(studio?.timezone || 'America/New_York'))
      .catch(() => setStudioTimezone('America/New_York'));
  }, [studioId, userData]);

  // Load current attendees and cohosts when event data is available
  useEffect(() => {
    if (eventData && !loadingCurrentUsers) {
      setLoadingCurrentUsers(true);

      const loadCurrentUsers = async () => {
        try {
          const { doc, getDoc } = await import('../../lib/firebase/firestore');
          const { db } = await import('../../auth/services/firebase');

          const subscriberUserIds = eventData.subscribers || [];
          const cohostUserIds = eventData.cohosts || [];
          const pendingInvitations = eventData.invitations || [];

          // Extract user IDs from invitations (handle both object and string formats)
          const invitedUserIds = pendingInvitations.map(inv =>
            typeof inv === 'object' ? inv.userId : inv
          );

          // Make attendees and cohosts mutually exclusive
          // Attendees are subscribers + pending invitations who are NOT cohosts AND NOT the event creator
          const creatorId = eventData.createdBy;

          // Combine subscribers and invited users, then filter
          const allAttendeeIds = [...new Set([...subscriberUserIds, ...invitedUserIds])];
          const attendeeUserIds = allAttendeeIds.filter(
            (userId) => !cohostUserIds.includes(userId) && userId !== creatorId
          );

          // Load attendee user data (excluding cohosts)
          const attendeePromises = attendeeUserIds.map(async (userId) => {
            const userDoc = await getDoc(doc(db, 'users', userId));
            return userDoc.exists() ? { id: userId, ...userDoc.data() } : null;
          });

          // Load cohost user data
          const cohostPromises = cohostUserIds.map(async (userId) => {
            const userDoc = await getDoc(doc(db, 'users', userId));
            return userDoc.exists() ? { id: userId, ...userDoc.data() } : null;
          });

          const [attendeeUsers, cohostUsers] = await Promise.all([
            Promise.all(attendeePromises),
            Promise.all(cohostPromises),
          ]);

          // Filter out null values
          setCurrentAttendees(attendeeUsers.filter(Boolean));
          setCurrentCohosts(cohostUsers.filter(Boolean));

          console.log(
            `[EditEventScreen] Loaded ${attendeeUsers.filter(Boolean).length} attendees (including ${invitedUserIds.length} pending invitations) and ${cohostUsers.filter(Boolean).length} cohosts`
          );
        } catch (error) {
          console.error(
            '[EditEventScreen] Failed to load current users:',
            error
          );
        } finally {
          setLoadingCurrentUsers(false);
        }
      };

      loadCurrentUsers();
    }
  }, [eventData, loadingCurrentUsers]);

  // Use ref to prevent re-initialization (componentDidMount behavior)
  const hasInitialized = useRef(false);
  const stableFormRef = useRef(null);
  const stableSelectedContacts = useRef([]);
  const stableDateTimeRef = useRef(null);

  if (!hasInitialized.current && eventData && studioTimezone) {
    hasInitialized.current = true;

    // Initialize form with existing event data
    stableFormRef.current = {
      title: eventData.title || '',
      location: eventData.location || '',
      address: eventData.address || '',
      details: eventData.details || '',
      maxGuests: eventData.maxGuests?.toString() || '',
      hasFee: eventData.hasFee || false,
      entryFee: eventData.entryFee || '',
      isPrivate: eventData.isPrivate || false,
      allowGuestInvites: eventData.allowGuestInvites || false,
      showHostContact:
        eventData.showHostContact !== undefined
          ? eventData.showHostContact
          : true,
      hasRsvpDeadline: !!eventData.rsvpDeadline,
      whatsProvided: eventData.whatsProvided || '',
      whatToBring: eventData.whatToBring || '',
      parkingInstructions: eventData.parkingInstructions || '',
      dressCode: eventData.dressCode || '',
      ageRestrictions: eventData.ageRestrictions || '',
      trackAttendance: eventData.trackAttendance || false,
      notificationSettings: {
        enabled: eventData.notificationSettings?.enabled ?? true,
        notifyOnJoin: eventData.notificationSettings?.notifyOnJoin ?? true,
        notifyOnLeave: eventData.notificationSettings?.notifyOnLeave ?? true,
        sendReminders: eventData.notificationSettings?.sendReminders ?? true,
        newComments: eventData.notificationSettings?.newComments ?? true,
        customMessage: eventData.notificationSettings?.customMessage || '',
      },
    };

    // Initialize selected contacts from existing event data
    stableSelectedContacts.current = eventData.invitedContacts || [];

    // Helper: convert a UTC Date to a "fake" local Date with wall-clock values in the studio timezone
    // so the date/time pickers display the correct studio-local time
    const toStudioWallClock = (utcDate) => {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: studioTimezone,
        hourCycle: 'h23',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }).formatToParts(utcDate);
      const get = (type) => Number(parts.find((p) => p.type === type)?.value || 0);
      return new Date(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), 0, 0);
    };

    // Convert UTC timestamps to studio wall-clock time for the pickers
    const rawEventDate = eventData.eventTimestamp
      ? eventData.eventTimestamp.toDate
        ? eventData.eventTimestamp.toDate()
        : new Date(eventData.eventTimestamp)
      : eventData.utcDateTime
        ? new Date(eventData.utcDateTime)
        : null;

    const rawRsvpDate = eventData.rsvpDeadline
      ? eventData.rsvpDeadline.toDate
        ? eventData.rsvpDeadline.toDate()
        : new Date(eventData.rsvpDeadline)
      : null;

    // Initialize stable date/time values using studio timezone
    stableDateTimeRef.current = {
      event: {
        value: rawEventDate ? toStudioWallClock(rawEventDate) : new Date(),
        selected: !!rawEventDate,
        dateSelected: !!rawEventDate,
        timeSelected: !!rawEventDate,
      },
      rsvpDeadline: {
        value: rawRsvpDate ? toStudioWallClock(rawRsvpDate) : new Date(),
        selected: !!rawRsvpDate,
        dateSelected: !!rawRsvpDate,
        timeSelected: !!rawRsvpDate,
      },
    };
  }

  // Invitation state management - initialize with existing event data
  const [selectedTextContacts, setSelectedTextContacts] = useState(
    stableSelectedContacts.current
  );

  // NEW invitation selections (for sending new invites) - start empty
  const [selectedGuestUsers, setSelectedGuestUsers] = useState([]);
  const [selectedGuestContacts, setSelectedGuestContacts] = useState([]);
  const [selectedGuestPhoneContacts, setSelectedGuestPhoneContacts] = useState(
    []
  );

  // NEW co-host invitation selections (for sending new invites) - start empty
  const [selectedCohostUsers, setSelectedCohostUsers] = useState([]);
  const [selectedCohostContacts, setSelectedCohostContacts] = useState([]);

  // Current event attendees and cohosts (loaded from event data)
  const [currentAttendees, setCurrentAttendees] = useState([]);
  const [currentCohosts, setCurrentCohosts] = useState([]);
  const [loadingCurrentUsers, setLoadingCurrentUsers] = useState(false);

  // Handle selected text contacts change
  const handleSelectedTextContactsChange = useCallback((contacts) => {
    setSelectedTextContacts(contacts);
  }, []);

  // Handle guest invitation selections from InviteScreen
  const handleGuestInvitationChange = useCallback((selections) => {
    console.log(
      '[EditEventScreen] Guest invitation selections received:',
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
      '[EditEventScreen] Co-host invitation selections received:',
      selections
    );
    if (selections.users) setSelectedCohostUsers(selections.users);
    if (selections.contacts) setSelectedCohostContacts(selections.contacts);
  }, []);

  // Event form hook (handles all update logic)
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

  // Date/time picker configuration - use stable values that don't change
  const stableDateTimeValues = stableDateTimeRef.current;

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
      studioId,
      applyTemplate,
      replaceFormData,
      closeSelectionModal,
      vibeAlert
    );

  // Check if form has meaningful changes from original event data
  const hasActualChanges = useCallback(() => {
    if (!eventData) return false;

    // Check for changes in main fields
    const hasTextChanges =
      formData.title.trim() !== (eventData.title || '').trim() ||
      formData.location.trim() !== (eventData.location || '').trim() ||
      formData.address.trim() !== (eventData.address || '').trim() ||
      formData.details.trim() !== (eventData.details || '').trim() ||
      (formData.maxGuests ? formData.maxGuests.toString().trim() : '') !==
        (eventData.maxGuests?.toString() || '').trim();

    // Check for configuration changes
    const hasConfigChanges =
      formData.hasFee !== (eventData.hasFee || false) ||
      formData.isPrivate !== (eventData.isPrivate || false) ||
      formData.allowGuestInvites !== (eventData.allowGuestInvites || false) ||
      formData.showHostContact !==
        (eventData.showHostContact !== undefined
          ? eventData.showHostContact
          : true) ||
      formData.hasRsvpDeadline !== !!eventData.rsvpDeadline ||
      formData.trackAttendance !== (eventData.trackAttendance || false) ||
      String(formData.entryFee || '').trim() !==
        String(eventData.entryFee || '').trim();

    // Check for invitation changes - only NEW invitations count as changes
    // (current attendees/cohosts are already saved, we only care about new invites)
    const hasNewGuestInvitations =
      selectedGuestUsers.length > 0 ||
      selectedGuestContacts.length > 0 ||
      selectedGuestPhoneContacts.length > 0;
    const hasNewCohostInvitations =
      selectedCohostUsers.length > 0 || selectedCohostContacts.length > 0;

    const hasInvitationChanges =
      hasNewGuestInvitations || hasNewCohostInvitations;

    // Check for date/time changes
    const originalEventDate = eventData.eventTimestamp
      ? eventData.eventTimestamp.toDate
        ? eventData.eventTimestamp.toDate().getTime()
        : new Date(eventData.eventTimestamp).getTime()
      : eventData.utcDateTime
        ? new Date(eventData.utcDateTime).getTime()
        : null;
    const currentEventDate = dateTimeValues?.event?.value
      ? dateTimeValues.event.value.getTime()
      : null;
    const hasDateTimeChanges = originalEventDate !== currentEventDate;

    return (
      hasTextChanges ||
      hasConfigChanges ||
      hasInvitationChanges ||
      hasDateTimeChanges
    );
  }, [
    formData,
    selectedGuestUsers,
    selectedGuestContacts,
    selectedGuestPhoneContacts,
    selectedCohostUsers,
    selectedCohostContacts,
    dateTimeValues,
    eventData,
  ]);

  // Handle back navigation confirmation logic
  const handleBackNavigation = useCallback(
    (onConfirm) => {
      // Allow navigation if event was successfully updated or already navigating
      if (eventUpdatedSuccessfully || shouldAllowNavigation.current) {
        if (onConfirm) onConfirm();
        return false;
      }

      // Only show confirmation if user has made actual changes
      if (hasActualChanges()) {
        // Show confirmation dialog when form has changes
        vibeAlert.confirm(
          'Discard Changes?',
          'You have unsaved changes. Are you sure you want to go back?',
          () => {
            // Set flag to prevent re-triggering and execute navigation
            shouldAllowNavigation.current = true;
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

      // Allow navigation when no meaningful changes
      if (onConfirm) onConfirm();
      return false;
    },
    [eventUpdatedSuccessfully, hasActualChanges, vibeAlert]
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
        if (shouldAllowNavigation.current || eventUpdatedSuccessfully) {
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
    }, [navigation, handleBackNavigation, eventUpdatedSuccessfully])
  );

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
          maxGuests: templateFormData.maxGuests ? templateFormData.maxGuests.toString() : '',
          hasFee: templateFormData.hasFee || false,
          entryFee: templateFormData.entryFee || '',
          isPrivate: templateFormData.isPrivate || false,
          allowGuestInvites: templateFormData.allowGuestInvites || false,
          showHostContact:
            templateFormData.showHostContact !== undefined
              ? templateFormData.showHostContact
              : true,
          hasRsvpDeadline: !!templateFormData.rsvpDeadline,
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
          let eventDateTime = new Date(validTemplateDate);
          if (eventDateTime <= now) {
            eventDateTime = new Date(now);
            eventDateTime.setDate(eventDateTime.getDate() + 1);
            eventDateTime.setHours(validTemplateDate.getHours());
            eventDateTime.setMinutes(validTemplateDate.getMinutes());
            eventDateTime.setSeconds(0);
            eventDateTime.setMilliseconds(0);
          }

          const hasRsvpDeadline = !!templateFormData.rsvpDeadline;

          updateDateTimeFromTemplate({
            event: {
              value: eventDateTime,
              selected: true,
              dateSelected: true,
              timeSelected: true,
            },
            rsvpDeadline: {
              value: hasRsvpDeadline
                ? templateFormData.rsvpDeadline
                : new Date(),
              selected: hasRsvpDeadline,
              dateSelected: hasRsvpDeadline,
              timeSelected: hasRsvpDeadline,
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

    // Set flag to allow navigation
    setEventUpdatedSuccessfully(true);

    vibeAlert.aqua('Event Updated!', 'Your changes have been saved! 🌊', [
      {
        text: 'OK',
        onPress: () => {
          // Navigation should now work because eventUpdatedSuccessfully is true
          navigation.goBack();
        },
      },
    ]);
  }, [loadSuggestions, navigation]);

  const handleSubmit = useCallback(async () => {
    try {
      // Prepare all invitation selections
      const selectedInvitations = {
        users: selectedGuestUsers,
        contacts: selectedGuestContacts,
        phoneContacts: selectedGuestPhoneContacts,
        cohosts: selectedCohostUsers,
        textContacts: selectedTextContacts,
        defaultMessage: formData.invitationMessage || '',
      };

      console.log(`[EditEventScreen] Selected invitations:`, {
        guestUsers: selectedGuestUsers.length,
        guestContacts: selectedGuestContacts.length,
        phoneContacts: selectedGuestPhoneContacts.length,
        cohostUsers: selectedCohostUsers.length,
        textContacts: selectedTextContacts.length,
        totalInvitations:
          selectedGuestUsers.length +
          selectedGuestContacts.length +
          selectedGuestPhoneContacts.length +
          selectedCohostUsers.length +
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
        isEditing: true,
        eventId: eventId,
        onSuccess: handleSuccess,
        selectedInvitations,
        vibeAlert,
        studioTimezone,
      });
    } catch (error) {
      if (error.message !== 'User cancelled update') {
        vibeAlert.error('Error', error.message || 'Failed to update event');
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
    selectedTextContacts,
    eventId,
    vibeAlert,
    studioTimezone,
  ]);

  // Show loading while event data is being loaded
  if (isLoadingEventData || (!eventData && eventId)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, marginBottom: 20 }}>
          Loading event data...
        </Text>
      </View>
    );
  }

  // Show error if no event data provided and not loading
  if (!eventId || !eventData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red', fontSize: 18 }}>
          Error: No event data provided
        </Text>
      </View>
    );
  }

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
        // Current event attendees/cohosts (for edit mode)
        currentAttendees={currentAttendees}
        currentCohosts={currentCohosts}
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
        // Current invitation counts for UI display (current + new)
        selectedGuestCount={
          currentAttendees.length +
          selectedGuestUsers.length +
          selectedGuestContacts.length +
          selectedGuestPhoneContacts.length
        }
        selectedCohostCount={
          currentCohosts.length +
          selectedCohostUsers.length +
          selectedCohostContacts.length
        }
        // Edit mode props
        isEditMode={true}
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
