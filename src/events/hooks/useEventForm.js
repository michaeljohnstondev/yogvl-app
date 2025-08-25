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
    (formData, dateTimeValues, currentUserId, isEditing = false) => {
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
      const eventData = formatEventForStorage(combinedFormData, currentUserId, isEditing);

      // Add timestamps (only for new events)
      if (!isEditing) {
        eventData.createdAt = Timestamp.now();
      }
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
  const saveEventToDatabase = useCallback(async (eventData, currentUserId, selectedInvitations = {}, vibeAlert, userData) => {
    // Get user's studio info for event storage
    const userStudio = userData?.studioId || 'greenville_sc'; // Default to Greenville for now
    const studioName = userData?.studioName || 'Greenville Studio';
    const studioCity = userData?.studioCity || 'Greenville';
    const studioState = userData?.studioState || 'SC';
    
    // Remove invitations from event data - they should be invited, not auto-added
    const { 
      invitedUsers, 
      invitedContacts, 
      invitedPhoneContacts,
      additionalHostUsers,
      additionalHostContacts,
      ...eventDataWithoutInvitations 
    } = eventData;
    
    // Add studio info to event data (cleaner without redundant fields)
    const eventDataWithStudio = {
      ...eventDataWithoutInvitations,
      studioName: studioName,
      studioCity: studioCity,
      studioState: studioState,
      cohosts: [], // Initialize empty cohosts array (will be populated when invitations are accepted)
    };
    
    // Save to studio-specific events collection: /studios/{studioId}/events
    const studioEventsRef = collection(db, 'studios', userStudio, 'events');
    const eventRef = await addDoc(studioEventsRef, eventDataWithStudio);
    
    await updateEventCreationMetrics(currentUserId, eventRef.id);
    
    // Send all invitations using batch service
    try {
      const { sendEventInvitations } = await import('../services/invitations');
      
      // Prepare guest invitations
      const guestInvitations = [];
      
      // Add selected users
      if (selectedInvitations.users) {
        selectedInvitations.users.forEach(user => {
          guestInvitations.push({
            type: 'user',
            guestId: user.id,
            message: selectedInvitations.defaultMessage || ''
          });
        });
      }
      
      // Add selected contacts (email invitations)
      if (selectedInvitations.contacts) {
        selectedInvitations.contacts.forEach(contact => {
          if (contact.email) {
            guestInvitations.push({
              type: 'email',
              guestEmail: contact.email,
              message: contact.message || selectedInvitations.defaultMessage || ''
            });
          }
        });
      }
      
      // Prepare co-host invitations
      const cohostInvitations = [];
      
      // Add selected co-host users
      if (selectedInvitations.cohosts) {
        selectedInvitations.cohosts.forEach(user => {
          cohostInvitations.push({
            type: 'user',
            guestId: user.id,
            message: selectedInvitations.defaultMessage || ''
          });
        });
      }
      
      // Send batch invitations
      if (guestInvitations.length > 0 || cohostInvitations.length > 0) {
        console.log(`[useEventForm] Sending invitations:`, {
          guestInvitations: guestInvitations.length,
          cohostInvitations: cohostInvitations.length,
          eventId: eventRef.id,
          hostId: currentUserId,
          studioId: userStudio
        });
        
        const invitationResults = await sendEventInvitations({
          eventId: eventRef.id,
          hostId: currentUserId,
          guestInvitations,
          cohostInvitations,
          defaultMessage: selectedInvitations.defaultMessage || '',
          studioId: userStudio,
          eventData: eventDataWithStudio,
          hostData: userData,
          source: 'create_event'
        });
        
        console.log(`[useEventForm] Invitation results:`, invitationResults.summary);
        
        // Show success message with invite counts
        const { guestCount, cohostCount, totalFailed } = invitationResults.summary;
        let successMessage = 'Event created successfully!';
        
        if (guestCount > 0 || cohostCount > 0) {
          const inviteDetails = [];
          if (guestCount > 0) inviteDetails.push(`${guestCount} guest invite${guestCount > 1 ? 's' : ''}`);
          if (cohostCount > 0) inviteDetails.push(`${cohostCount} co-host invite${cohostCount > 1 ? 's' : ''}`);
          
          successMessage += ` Sent ${inviteDetails.join(' and ')}.`;
          
          if (totalFailed > 0) {
            successMessage += ` ${totalFailed} invitation${totalFailed > 1 ? 's' : ''} failed to send.`;
          }
        }
        
        // Store success message for later display
        eventDataWithStudio._invitationSummary = successMessage;
      }
      
    } catch (error) {
      console.error('Error sending event invitations:', error);
      // Don't fail event creation if invitations fail
    }
    
    // Send text invites after successful event creation
    if (selectedInvitations.textContacts && selectedInvitations.textContacts.length > 0) {
      await sendTextInvites(selectedInvitations.textContacts, eventDataWithStudio, vibeAlert);
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
      selectedInvitations = {}, // Updated to handle all invitation types
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
          currentUserId,
          isEditing
        );

        // Step 4: Save to database (create or update)
        if (isEditing && eventId) {
          await updateEventInDatabase(eventData, eventId, currentUserId, userData, selectedInvitations, vibeAlert);
        } else {
          const eventRef = await saveEventToDatabase(eventData, currentUserId, selectedInvitations, vibeAlert, userData);
          // Store the invitation summary for success message
          if (eventData._invitationSummary) {
            eventRef._invitationSummary = eventData._invitationSummary;
          }
        }

        // Step 5: Handle success
        if (onSuccess) {
          onSuccess(eventData._invitationSummary);
        } else {
          handleSuccessfulSubmission({
            loadSuggestions,
            resetForm,
            resetDateTime,
            navigation,
            isEditing,
            vibeAlert,
            invitationSummary: eventData._invitationSummary,
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
    async (eventData, eventId, currentUserId, userData, selectedInvitations = {}, vibeAlert) => {
      const { doc, updateDoc } = await import('firebase/firestore');
      const userStudio = userData?.studioId || 'greenville_sc';
      
      // Remove subscriber/cohost arrays from eventData for editing - we don't want to overwrite existing attendees
      const {
        subscribers,
        cohosts,
        ...eventDataWithoutArrays
      } = eventData;
      
      const eventRef = doc(db, 'studios', userStudio, 'events', eventId);
      
      // Update only the event metadata, not the attendee/cohost arrays
      await updateDoc(eventRef, eventDataWithoutArrays);
      
      // Send invitations for new cohosts/guests if any were selected
      if (selectedInvitations && (
        (selectedInvitations.users && selectedInvitations.users.length > 0) ||
        (selectedInvitations.contacts && selectedInvitations.contacts.length > 0) ||
        (selectedInvitations.phoneContacts && selectedInvitations.phoneContacts.length > 0) ||
        (selectedInvitations.cohosts && selectedInvitations.cohosts.length > 0)
      )) {
        try {
          const { sendEventInvitations } = await import('../services/invitations');
          
          // Prepare guest invitations
          const guestInvitations = [];
          
          // Add selected users
          if (selectedInvitations.users) {
            selectedInvitations.users.forEach(user => {
              guestInvitations.push({
                type: 'user',
                guestId: user.id,
                message: selectedInvitations.defaultMessage || ''
              });
            });
          }
          
          // Add selected contacts  
          if (selectedInvitations.contacts) {
            selectedInvitations.contacts.forEach(contact => {
              guestInvitations.push({
                type: 'contact',
                guestId: contact.id,
                message: selectedInvitations.defaultMessage || ''
              });
            });
          }
          
          // Add selected phone contacts
          if (selectedInvitations.phoneContacts) {
            selectedInvitations.phoneContacts.forEach(contact => {
              guestInvitations.push({
                type: 'phoneContact',
                guestId: contact.id,
                message: selectedInvitations.defaultMessage || ''
              });
            });
          }
          
          // Prepare cohost invitations
          const cohostInvitations = [];
          if (selectedInvitations.cohosts) {
            selectedInvitations.cohosts.forEach(cohost => {
              cohostInvitations.push({
                type: 'user',
                guestId: cohost.id, // Use guestId for compatibility with invitation system
                message: selectedInvitations.defaultMessage || ''
              });
            });
          }
          
          // Send all invitations
          if (guestInvitations.length > 0 || cohostInvitations.length > 0) {
            // Get event and host data for proper notification context
            const { getDoc, doc } = await import('firebase/firestore');
            const eventDoc = await getDoc(eventRef);
            const hostDoc = await getDoc(doc(db, 'users', currentUserId));
            
            await sendEventInvitations({
              eventId,
              hostId: currentUserId,
              guestInvitations,
              cohostInvitations,
              defaultMessage: selectedInvitations.defaultMessage || '',
              studioId: userStudio,
              eventData: eventDoc.exists() ? eventDoc.data() : null,
              hostData: hostDoc.exists() ? hostDoc.data() : null,
              source: 'edit_event'
            });
            
            console.log(`[EditEventScreen] Sent ${guestInvitations.length} guest invitations and ${cohostInvitations.length} cohost invitations`);
          }
          
          // Send text invites if any
          if (selectedInvitations.textContacts && selectedInvitations.textContacts.length > 0) {
            // Get updated event data for text invitations
            const { getDoc } = await import('firebase/firestore');
            const updatedEventDoc = await getDoc(eventRef);
            if (updatedEventDoc.exists()) {
              const updatedEventData = updatedEventDoc.data();
              await sendTextInvites(selectedInvitations.textContacts, updatedEventData, vibeAlert);
            }
          }
        } catch (error) {
          console.error('Error sending invitations during event edit:', error);
          // Don't fail the entire edit if invitations fail
          if (vibeAlert) {
            vibeAlert.warning('Event Updated', 'Event was updated but there was an issue sending some invitations.');
          }
        }
      }
      
      return eventRef;
    },
    [sendTextInvites]
  );

  // Updated success handler
  const handleSuccessfulSubmission = useCallback((callbacks) => {
    const { loadSuggestions, resetForm, resetDateTime, navigation, isEditing, vibeAlert, invitationSummary } =
      callbacks;

    if (loadSuggestions) loadSuggestions();
    if (resetForm && !isEditing) resetForm();
    if (resetDateTime && !isEditing) resetDateTime();

    const message = isEditing
      ? 'Event updated successfully!'
      : invitationSummary || 'Event created successfully! You are automatically subscribed to your event.';

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
