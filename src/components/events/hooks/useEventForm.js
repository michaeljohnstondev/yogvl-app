// FILE: hooks/useEventForm.js

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { Timestamp, collection, addDoc } from 'firebase/firestore';
import { db } from '../../../auth/firebase';
import {
  validateEventForm,
  formatEventForStorage,
} from '../utils/eventFormValidation';
import { validateUserCanCreateEvent } from '../utils/eventValidation';
import { updateEventCreationMetrics } from '../attendees/utils/userMetrics';
import { eventFormValidators } from './useEventFormState';

export const useEventForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper function to validate user permissions
  const validateUserPermissions = useCallback(
    async (currentUserId, userData) => {
      if (!currentUserId) {
        throw new Error('You must be logged in to create events.');
      }

      const canCreateValidation = validateUserCanCreateEvent(userData);

      if (!canCreateValidation.canCreate) {
        throw new Error(canCreateValidation.reason);
      }

      if (canCreateValidation.warning) {
        const proceed = await new Promise((resolve) => {
          Alert.alert('Attendance Notice', canCreateValidation.warning, [
            { text: 'Cancel', onPress: () => resolve(false) },
            { text: 'Create Anyway', onPress: () => resolve(true) },
          ]);
        });

        if (!proceed) {
          throw new Error('User cancelled creation');
        }
      }
    },
    []
  );

  // Helper function to validate form data
  const validateFormData = useCallback((validateForm, validateDateTime) => {
    // Validate form fields
    const fieldValidation = validateForm(eventFormValidators);
    if (!fieldValidation.isValid) {
      const firstError = Object.values(fieldValidation.errors)[0];
      throw new Error(firstError);
    }

    // Validate date/time
    const dateTimeValidation = validateDateTime();
    if (!dateTimeValidation.isValid) {
      throw new Error(dateTimeValidation.message);
    }
  }, []);

  // Helper function to prepare event data
  const prepareEventData = useCallback(
    (formData, dateTimeValues, currentUserId) => {
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

      // Legacy validation
      const legacyValidation = validateEventForm(combinedFormData);
      if (!legacyValidation.isValid) {
        throw new Error(legacyValidation.message);
      }

      // Format for storage
      const eventData = formatEventForStorage(combinedFormData, currentUserId);

      // Add timestamps
      eventData.createdAt = Timestamp.now();
      eventData.eventTimestamp = Timestamp.fromDate(eventData.eventTimestamp);

      if (eventData.rsvpDeadlineTimestamp) {
        eventData.rsvpDeadlineTimestamp = Timestamp.fromDate(
          eventData.rsvpDeadlineTimestamp
        );
      }

      return eventData;
    },
    []
  );

  // Helper function to save event to database
  const saveEventToDatabase = useCallback(async (eventData, currentUserId) => {
    const eventRef = await addDoc(collection(db, 'events'), eventData);
    await updateEventCreationMetrics(currentUserId, eventRef.id);
    return eventRef;
  }, []);

  // Main submit event function
  const submitEvent = useCallback(
    async ({
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
      isEditing = false,
      eventId = null,
      onSuccess = null,
    }) => {
      setIsSubmitting(true);

      try {
        // Step 1: Validate user permissions
        await validateUserPermissions(currentUserId, userData);

        // Step 2: Validate form data
        validateFormData(validateForm, validateDateTime);

        // Step 3: Prepare event data
        const eventData = prepareEventData(
          formData,
          dateTimeValues,
          currentUserId
        );

        // Step 4: Save to database (create or update)
        if (isEditing && eventId) {
          await updateEventInDatabase(eventData, eventId, currentUserId);
        } else {
          await saveEventToDatabase(eventData, currentUserId);
        }

        // Step 5: Handle success
        if (onSuccess) {
          onSuccess();
        } else {
          handleSuccessfulSubmission({
            loadSuggestions,
            resetForm,
            resetDateTime,
            navigation,
            isEditing,
          });
        }
      } catch (error) {
        // Handle all errors uniformly
        const isUserCancellation = error.message === 'User cancelled creation';

        if (!isUserCancellation) {
          console.error('Error creating event:', error);
          // Move Alert back to component level
          throw error; // Re-throw so component can handle the Alert
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      validateUserPermissions,
      validateFormData,
      prepareEventData,
      saveEventToDatabase,
      handleSuccessfulSubmission,
    ]
  );

  // Helper function to update event in database (for editing)
  const updateEventInDatabase = useCallback(
    async (eventData, eventId, currentUserId) => {
      const { doc, updateDoc } = await import('firebase/firestore');
      const eventRef = doc(db, 'events', eventId);
      await updateDoc(eventRef, eventData);
      // Note: You might not want to update metrics for edits, or handle differently
      return eventRef;
    },
    []
  );

  // Updated success handler
  const handleSuccessfulSubmission = useCallback((callbacks) => {
    const { loadSuggestions, resetForm, resetDateTime, navigation, isEditing } =
      callbacks;

    if (loadSuggestions) loadSuggestions();
    if (resetForm && !isEditing) resetForm();
    if (resetDateTime && !isEditing) resetDateTime();

    const message = isEditing
      ? 'Event updated successfully!'
      : 'Event created successfully! You are automatically subscribed to your event.';

    Alert.alert('Success!', message, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  }, []);

  return {
    isSubmitting,
    submitEvent,
  };
};

export default useEventForm;
