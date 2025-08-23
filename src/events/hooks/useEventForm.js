// FILE: hooks/useEventForm.js

import { useState, useCallback } from 'react';
import { Linking, Platform } from 'react-native';
// VibeAlert will be passed from component
import { Timestamp, collection, addDoc } from 'firebase/firestore';
import { db } from '../../auth/services/firebase';
import {
  validateEventForm,
  formatEventForStorage,
} from '../lib/eventFormValidation';
import { validateUserCanCreateEvent } from '../lib/eventValidation';
import { updateEventCreationMetrics } from '../lib/userMetrics';
import { eventFormValidators } from './useEventFormState';

export const useEventForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper function to validate user permissions
  const validateUserPermissions = useCallback(
    async (currentUserId, userData, vibeAlert) => {
      if (!currentUserId) {
        throw new Error('You must be logged in to create events.');
      }

      const canCreateValidation = validateUserCanCreateEvent(userData);

      if (!canCreateValidation.canCreate) {
        throw new Error(canCreateValidation.reason);
      }

      if (canCreateValidation.warning) {
        const proceed = await new Promise((resolve) => {
          vibeAlert.confirm(
            'Attendance Notice',
            canCreateValidation.warning,
            () => resolve(true),  // onConfirm (Create Anyway)
            () => resolve(false)  // onCancel
          );
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

      if (eventData.rsvpDeadline) {
        eventData.rsvpDeadline = Timestamp.fromDate(eventData.rsvpDeadline);
      }

      return eventData;
    },
    []
  );

  // Helper function to generate invite message
  const generateInviteMessage = useCallback((eventData) => {
    const appStoreUrl = 'https://apps.apple.com/app/your-app-name/id123456789';
    const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.yourapp.name';

    const eventTitle = eventData.title || 'my upcoming event';
    const eventLocation = eventData.location || 'an awesome location';
    const eventDate = eventData.datetime
      ? eventData.datetime.toDate().toLocaleDateString()
      : 'soon';

    return `Hey! I just created "${eventTitle}" and would love you to join!

📅 When: ${eventDate}
📍 Where: ${eventLocation}

Join via our app:
iPhone: ${appStoreUrl}
Android: ${playStoreUrl}

Hope to see you there! 🎉`;
  }, []);

  // Helper function to send text invites after event creation
  const sendTextInvites = useCallback(async (selectedContacts, eventData, vibeAlert) => {
    if (!selectedContacts || selectedContacts.length === 0) {
      return;
    }

    try {
      const inviteMessage = generateInviteMessage(eventData);
      const phoneNumbers = selectedContacts.map(contact => contact.phone).join(',');
      
      const smsUrl = Platform.OS === 'ios'
        ? `sms:${phoneNumbers}&body=${encodeURIComponent(inviteMessage)}`
        : `sms:${phoneNumbers}?body=${encodeURIComponent(inviteMessage)}`;

      await Linking.openURL(smsUrl);
      
      vibeAlert.success(
        'Invites Ready!',
        `Opened SMS to invite ${selectedContacts.length} ${selectedContacts.length === 1 ? 'person' : 'people'} to your event.`
      );
    } catch (error) {
      console.error('Failed to send text invites:', error);
      vibeAlert.error('Error', 'Unable to open SMS app for invites.');
    }
  }, [generateInviteMessage]);

  // Helper function to save event to database
  const saveEventToDatabase = useCallback(async (eventData, currentUserId, selectedTextContacts = [], vibeAlert, userData) => {
    // Get user's studio info for event storage
    const userStudio = userData?.studioId || 'greenville_sc'; // Default to Greenville for now
    const studioName = userData?.studioName || 'Greenville Studio';
    const studioCity = userData?.studioCity || 'Greenville';
    const studioState = userData?.studioState || 'SC';
    
    // Remove additionalHosts from event data - they should be invited, not auto-added
    const { additionalHosts, ...eventDataWithoutHosts } = eventData;
    
    // Add studio info to event data (cleaner without redundant fields)
    const eventDataWithStudio = {
      ...eventDataWithoutHosts,
      studioName: studioName,
      studioCity: studioCity,
      studioState: studioState,
      // Reset hosts to just the creator
      hosts: [currentUserId],
      additionalHosts: [], // Clear this since we'll send invitations instead
    };
    
    // Save to studio-specific events collection: /studios/{studioId}/events
    const studioEventsRef = collection(db, 'studios', userStudio, 'events');
    const eventRef = await addDoc(studioEventsRef, eventDataWithStudio);
    
    await updateEventCreationMetrics(currentUserId, eventRef.id);
    
    // Send cohost invitations after successful event creation
    if (additionalHosts && additionalHosts.length > 0) {
      try {
        const { sendCohostInvitation } = await import('../../services/friendService');
        
        const invitationPromises = additionalHosts.map(async (cohostId) => {
          try {
            await sendCohostInvitation(
              currentUserId,
              cohostId,
              eventRef.id,
              userData,
              eventDataWithStudio
            );
          } catch (error) {
            console.error(`Failed to send cohost invitation to ${cohostId}:`, error);
          }
        });
        
        await Promise.all(invitationPromises);
        console.log(`Sent ${additionalHosts.length} cohost invitations`);
      } catch (error) {
        console.error('Error sending cohost invitations:', error);
      }
    }
    
    // Send guest invitations after successful event creation
    const invitedUsers = eventData.invitedUsers || [];
    if (invitedUsers.length > 0) {
      try {
        const { sendGuestInvitation } = await import('../../services/friendService');
        
        const guestInvitationPromises = invitedUsers.map(async (guestId) => {
          try {
            await sendGuestInvitation(
              currentUserId,
              guestId,
              eventRef.id,
              userData,
              eventDataWithStudio
            );
          } catch (error) {
            console.error(`Failed to send guest invitation to ${guestId}:`, error);
          }
        });
        
        await Promise.all(guestInvitationPromises);
        console.log(`Sent ${invitedUsers.length} guest invitations`);
      } catch (error) {
        console.error('Error sending guest invitations:', error);
      }
    }
    
    // Send text invites after successful event creation
    if (selectedTextContacts.length > 0) {
      await sendTextInvites(selectedTextContacts, eventDataWithStudio, vibeAlert);
    }
    
    return eventRef;
  }, [sendTextInvites]);

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
      selectedTextContacts = [], // Add selected text contacts parameter
      vibeAlert, // Add vibeAlert parameter
    }) => {
      setIsSubmitting(true);

      try {
        // Step 1: Validate user permissions
        await validateUserPermissions(currentUserId, userData, vibeAlert);

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
          await updateEventInDatabase(eventData, eventId, currentUserId, userData);
        } else {
          await saveEventToDatabase(eventData, currentUserId, selectedTextContacts, vibeAlert, userData);
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
            vibeAlert,
          });
        }
      } catch (error) {
        // Handle all errors uniformly
        const isUserCancellation = error.message === 'User cancelled creation';

        if (!isUserCancellation) {
          // Only log validation errors, let component handle display
          if (error.message && !error.message.includes('Firebase')) {
            console.log('Validation error:', error.message);
          } else {
            console.error('Database error creating event:', error);
          }
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
    async (eventData, eventId, currentUserId, userData) => {
      const { doc, updateDoc } = await import('firebase/firestore');
      const userStudio = userData?.studioId || 'greenville_sc';
      const eventRef = doc(db, 'studios', userStudio, 'events', eventId);
      await updateDoc(eventRef, eventData);
      // Note: You might not want to update metrics for edits, or handle differently
      return eventRef;
    },
    []
  );

  // Updated success handler
  const handleSuccessfulSubmission = useCallback((callbacks) => {
    const { loadSuggestions, resetForm, resetDateTime, navigation, isEditing, vibeAlert } =
      callbacks;

    if (loadSuggestions) loadSuggestions();
    if (resetForm && !isEditing) resetForm();
    if (resetDateTime && !isEditing) resetDateTime();

    const message = isEditing
      ? 'Event updated successfully!'
      : 'Event created successfully! You are automatically subscribed to your event.';

    vibeAlert.success('Success!', message, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  }, []);

  return {
    isSubmitting,
    submitEvent,
  };
};

export default useEventForm;
