// FILE: hooks/useEventForm.js

import { useState, useCallback } from 'react';
import { Linking, Platform } from 'react-native';
// VibeAlert will be passed from component
import { Timestamp, collection, addDoc } from '../../lib/firebase/firestore';
import { db } from '../../auth/services/firebase';
import {
  validateEventForm,
  formatEventForStorage,
} from '../lib/eventFormValidation';
import { validateUserCanCreateEvent } from '../lib/eventValidation';
import { updateEventCreationMetrics } from '../lib/userMetrics';
import { eventFormValidators } from './useEventFormState';
import { StudioStatsService } from '../../services/studioStatsService';
import EventNotificationScheduler from '../../services/eventNotificationScheduler';

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
            () => resolve(true), // onConfirm (Create Anyway)
            () => resolve(false) // onCancel
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
      const eventData = formatEventForStorage(
        combinedFormData,
        currentUserId,
        isEditing
      );

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
  const generateInviteMessage = useCallback((eventData, inviteCode = null) => {
    const appStoreUrl = 'https://apps.apple.com/app/your-app-name/id123456789';
    const playStoreUrl =
      'https://play.google.com/store/apps/details?id=com.yourapp.name';

    const eventTitle = eventData.title || 'my upcoming event';
    const eventLocation = eventData.location || 'an awesome location';
    const eventDate = eventData.datetime
      ? eventData.datetime.toDate().toLocaleDateString()
      : 'soon';

    let message = `Hey! I just created "${eventTitle}" and would love you to join!

📅 When: ${eventDate}
📍 Where: ${eventLocation}

Download Big Vibe Studios app:
iPhone: ${appStoreUrl}
Android: ${playStoreUrl}`;

    if (inviteCode) {
      message += `

🎟️ Use invite code: ${inviteCode}`;
    }

    message += `

Hope to see you there! 🎉`;

    return message;
  }, []);

  // Helper function to send text invites after event creation
  const sendTextInvites = useCallback(
    async (selectedContacts, eventData, vibeAlert, currentUserId, userData) => {
      if (!selectedContacts || selectedContacts.length === 0) {
        return;
      }

      try {
        // Import services
        const { sendPhoneInvitation } = await import('../services/invitations');
        const { enableInviteCodeForEvent } = await import(
          '../../services/inviteCodeService'
        );

        // Get user's studio info
        const userStudio =
          userData?.studioId ||
          userData?.userdata?.studios?.default?.studioId ||
          'greenville_sc';

        // Ensure event has invite code for SMS invites
        let inviteCode = eventData.inviteCode;
        if (!inviteCode) {
          try {
            inviteCode = await enableInviteCodeForEvent(
              userStudio,
              eventData.id
            );
          } catch (error) {
            console.warn('Could not generate invite code:', error);
          }
        }

        // Create phone invitation records for tracking
        const invitationPromises = selectedContacts.map(async (contact) => {
          try {
            console.log('[sendTextInvites] Processing contact:', {
              contactId: contact.id,
              contactPhone: contact.phone,
              contactName: contact.name,
              eventId: eventData.id,
              hostId: currentUserId,
              studioId: userStudio,
            });

            // Validate required fields before sending
            const inviteParams = {
              eventId: eventData.id,
              hostId: currentUserId,
              guestPhone: contact.phone,
              message: `You're invited to ${eventData.title}!`,
              studioId: userStudio,
              inviteCode: inviteCode,
            };

            console.log(
              '[sendTextInvites] Sending invitation with params:',
              inviteParams
            );

            if (
              !inviteParams.eventId ||
              !inviteParams.hostId ||
              !inviteParams.guestPhone ||
              !inviteParams.studioId
            ) {
              console.error('[sendTextInvites] Missing required fields:', {
                hasEventId: !!inviteParams.eventId,
                hasHostId: !!inviteParams.hostId,
                hasGuestPhone: !!inviteParams.guestPhone,
                hasStudioId: !!inviteParams.studioId,
              });
              return null;
            }

            return await sendPhoneInvitation(inviteParams);
          } catch (error) {
            console.warn(
              `Failed to create invitation record for ${contact.phone}:`,
              error
            );
            return null;
          }
        });

        // Wait for all invitation records to be created
        await Promise.all(invitationPromises);

        // Add phone numbers to event's invitedPhones array for fast access checking
        try {
          const { addPhonesToEventAccess } = await import(
            '../../services/phoneAccessService'
          );
          const phoneNumbers = selectedContacts.map((contact) => contact.phone);
          await addPhonesToEventAccess(userStudio, eventData.id, phoneNumbers);
        } catch (error) {
          console.warn('Failed to add phones to event access list:', error);
          // Don't fail SMS invite if this fails
        }

        // Generate SMS message with invite code
        const inviteMessage = generateInviteMessage(eventData, inviteCode);
        const phoneNumbers = selectedContacts
          .map((contact) => contact.phone)
          .join(',');

        const smsUrl =
          Platform.OS === 'ios'
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
    },
    [generateInviteMessage]
  );

  // Helper function to save event to database
  const saveEventToDatabase = useCallback(
    async (
      eventData,
      currentUserId,
      selectedInvitations = {},
      vibeAlert,
      userData
    ) => {
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
        subscribers: [currentUserId], // Initialize with host as subscriber
        subscriberCount: 1, // Initialize subscriber count with host
        attendance: [
          {
            // Auto-add host to attendance
            userId: currentUserId,
            attended: true,
            isHost: true,
            markedBy: currentUserId,
            markedAt: new Date(),
          },
        ],
        attendanceCount: 1, // Start with 1 (the host)
      };

      // Save to studio-specific events collection: /studios/{studioId}/events
      const studioEventsRef = collection(db, 'studios', userStudio, 'events');
      const eventRef = await addDoc(studioEventsRef, eventDataWithStudio);

      await updateEventCreationMetrics(currentUserId, eventRef.id, userStudio);

      // Update studio event count
      try {
        await StudioStatsService.incrementEventCount(userStudio);
      } catch (error) {
        console.warn('Failed to update studio event count:', error);
        // Don't fail event creation if stats update fails
      }

      // Schedule server-side FCM notifications for the event
      try {
        // Use host's actual notification settings instead of empty array
        const hostReminderTemplates = userData?.userdata?.settings?.notifications?.hosting?.reminderTemplates || {};
        console.log('[EventForm] Using host reminder templates:', hostReminderTemplates);

        await EventNotificationScheduler.scheduleEventReminders(
          eventRef.id,
          {
            title: eventDataWithStudio.title,
            startTime: eventDataWithStudio.eventTimestamp,
            eventTimestamp: eventDataWithStudio.eventTimestamp, // Also include as eventTimestamp for compatibility
            location: eventDataWithStudio.location,
            studioId: userStudio,
            subscribers: [currentUserId], // Initially just the creator
            createdBy: currentUserId,
          },
          currentUserId,
          hostReminderTemplates
        );
        console.log(
          '[EventForm] Scheduled server-side FCM notifications for event:',
          eventRef.id,
          `(${Object.keys(hostReminderTemplates).length} reminder settings)`
        );
      } catch (notificationError) {
        console.warn(
          '[EventForm] Failed to schedule server-side notifications:',
          notificationError
        );
        // Don't fail event creation if notification scheduling fails
      }

      // Attendance reminder removed - attendance management available 3hrs before event instead

      // Schedule event recap notification 1 hour after event starts
      try {
        const { ScheduledNotificationService } = await import(
          '../../services/scheduledNotifications'
        );

        const eventRecapData = {
          id: eventRef.id,
          title: eventDataWithStudio.title,
          date: eventDataWithStudio.eventTimestamp,
          createdBy: currentUserId,
          studioId: userStudio,
          notificationSettings: eventDataWithStudio.notificationSettings,
        };

        await ScheduledNotificationService.scheduleEventRecap(eventRecapData);
        console.log(
          '[EventForm] Scheduled event recap for event:',
          eventRef.id
        );
      } catch (eventRecapError) {
        console.warn(
          '[EventForm] Failed to schedule event recap:',
          eventRecapError
        );
        // Don't fail event creation if event recap scheduling fails
      }

      // Legacy reminder system replaced with server-side FCM scheduling above

      // Send all invitations using batch service
      try {
        const { sendEventInvitations } = await import(
          '../services/invitations'
        );

        // Prepare guest invitations
        const guestInvitations = [];

        // Add selected users
        if (selectedInvitations.users) {
          selectedInvitations.users.forEach((user) => {
            guestInvitations.push({
              type: 'user',
              guestId: user.id,
              message: selectedInvitations.defaultMessage || '',
            });
          });
        }

        // Add selected contacts (email invitations)
        if (selectedInvitations.contacts) {
          selectedInvitations.contacts.forEach((contact) => {
            if (contact.email) {
              guestInvitations.push({
                type: 'email',
                guestEmail: contact.email,
                message:
                  contact.message || selectedInvitations.defaultMessage || '',
              });
            }
          });
        }

        // Prepare co-host invitations
        const cohostInvitations = [];

        // Add selected co-host users
        if (selectedInvitations.cohosts) {
          selectedInvitations.cohosts.forEach((user) => {
            cohostInvitations.push({
              type: 'user',
              guestId: user.id,
              message: selectedInvitations.defaultMessage || '',
            });
          });
        }

        // Add selected co-host contacts (email invitations)
        if (selectedInvitations.cohostContacts) {
          selectedInvitations.cohostContacts.forEach((contact) => {
            if (contact.email) {
              cohostInvitations.push({
                type: 'email',
                guestEmail: contact.email,
                message:
                  contact.message || selectedInvitations.defaultMessage || '',
              });
            }
          });
        }

        // Send batch invitations
        if (guestInvitations.length > 0 || cohostInvitations.length > 0) {
          console.log(`[useEventForm] Sending invitations:`, {
            guestInvitations: guestInvitations.length,
            cohostInvitations: cohostInvitations.length,
            eventId: eventRef.id,
            hostId: currentUserId,
            studioId: userStudio,
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
            source: 'create_event',
          });

          console.log(
            `[useEventForm] Invitation results:`,
            invitationResults.summary
          );

          // Show success message with invite counts
          const { guestCount, cohostCount, totalFailed } =
            invitationResults.summary;
          let successMessage = 'Event created successfully!';

          if (guestCount > 0 || cohostCount > 0) {
            const inviteDetails = [];
            if (guestCount > 0)
              inviteDetails.push(
                `${guestCount} guest invite${guestCount > 1 ? 's' : ''}`
              );
            if (cohostCount > 0)
              inviteDetails.push(
                `${cohostCount} co-host invite${cohostCount > 1 ? 's' : ''}`
              );

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
      if (
        selectedInvitations.textContacts &&
        selectedInvitations.textContacts.length > 0
      ) {
        console.log(
          `[useEventForm] Sending text invites to ${selectedInvitations.textContacts.length} contacts:`,
          selectedInvitations.textContacts.map((c) => c.phone)
        );
        // Add the eventRef.id to eventData for sendTextInvites
        const eventDataForSMS = { ...eventDataWithStudio, id: eventRef.id };
        await sendTextInvites(
          selectedInvitations.textContacts,
          eventDataForSMS,
          vibeAlert,
          currentUserId,
          userData
        );
      }

      return eventRef;
    },
    [sendTextInvites]
  );

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
          await updateEventInDatabase(
            eventData,
            eventId,
            currentUserId,
            userData,
            selectedInvitations,
            vibeAlert
          );
        } else {
          const eventRef = await saveEventToDatabase(
            eventData,
            currentUserId,
            selectedInvitations,
            vibeAlert,
            userData
          );
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
    async (
      eventData,
      eventId,
      currentUserId,
      userData,
      selectedInvitations = {},
      vibeAlert
    ) => {
      const { doc, updateDoc, getDoc } = await import('../../lib/firebase/firestore');
      const userStudio = userData?.studioId || 'greenville_sc';

      // Remove subscriber/cohost arrays from eventData for editing - we don't want to overwrite existing attendees
      const { subscribers, cohosts, ...eventDataWithoutArrays } = eventData;

      const eventRef = doc(db, 'studios', userStudio, 'events', eventId);

      // Fetch existing event data before updating
      const existingEventDoc = await getDoc(eventRef);
      if (!existingEventDoc.exists()) {
        throw new Error('Event not found');
      }
      const existingEvent = existingEventDoc.data();

      // Update only the event metadata, not the attendee/cohost arrays
      await updateDoc(eventRef, eventDataWithoutArrays);

      // NOTE: Notification rescheduling is handled automatically by Cloud Functions
      // when the event document is updated. No client-side reschedule needed.
      console.log('[EventForm] Event updated - Cloud Functions will handle notification updates automatically');

      // Send invitations for new cohosts/guests if any were selected
      if (
        selectedInvitations &&
        ((selectedInvitations.users && selectedInvitations.users.length > 0) ||
          (selectedInvitations.contacts &&
            selectedInvitations.contacts.length > 0) ||
          (selectedInvitations.phoneContacts &&
            selectedInvitations.phoneContacts.length > 0) ||
          (selectedInvitations.cohosts &&
            selectedInvitations.cohosts.length > 0))
      ) {
        try {
          const { sendEventInvitations } = await import(
            '../services/invitations'
          );

          // Prepare guest invitations
          const guestInvitations = [];

          // Add selected users
          if (selectedInvitations.users) {
            selectedInvitations.users.forEach((user) => {
              guestInvitations.push({
                type: 'user',
                guestId: user.id,
                message: selectedInvitations.defaultMessage || '',
              });
            });
          }

          // Add selected contacts
          if (selectedInvitations.contacts) {
            selectedInvitations.contacts.forEach((contact) => {
              guestInvitations.push({
                type: 'contact',
                guestId: contact.id,
                message: selectedInvitations.defaultMessage || '',
              });
            });
          }

          // Add selected phone contacts
          if (selectedInvitations.phoneContacts) {
            selectedInvitations.phoneContacts.forEach((contact) => {
              guestInvitations.push({
                type: 'phoneContact',
                guestId: contact.id,
                message: selectedInvitations.defaultMessage || '',
              });
            });
          }

          // Prepare cohost invitations
          const cohostInvitations = [];
          if (selectedInvitations.cohosts) {
            selectedInvitations.cohosts.forEach((cohost) => {
              cohostInvitations.push({
                type: 'user',
                guestId: cohost.id, // Use guestId for compatibility with invitation system
                message: selectedInvitations.defaultMessage || '',
              });
            });
          }

          // Send all invitations
          if (guestInvitations.length > 0 || cohostInvitations.length > 0) {
            // Get event and host data for proper notification context
            const { getDoc, doc } = await import(
              '../../lib/firebase/firestore'
            );
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
              source: 'edit_event',
            });

            console.log(
              `[EditEventScreen] Sent ${guestInvitations.length} guest invitations and ${cohostInvitations.length} cohost invitations`
            );
          }

          // Send text invites if any
          if (
            selectedInvitations.textContacts &&
            selectedInvitations.textContacts.length > 0
          ) {
            // Get updated event data for text invitations
            const { getDoc } = await import('../../lib/firebase/firestore');
            const updatedEventDoc = await getDoc(eventRef);
            if (updatedEventDoc.exists()) {
              const updatedEventData = updatedEventDoc.data();
              await sendTextInvites(
                selectedInvitations.textContacts,
                updatedEventData,
                vibeAlert,
                currentUserId,
                userData
              );
            }
          }
        } catch (error) {
          console.error('Error sending invitations during event edit:', error);
          // Don't fail the entire edit if invitations fail
          if (vibeAlert) {
            vibeAlert.warning(
              'Event Updated',
              'Event was updated but there was an issue sending some invitations.'
            );
          }
        }
      }

      return eventRef;
    },
    [sendTextInvites]
  );

  // Updated success handler
  const handleSuccessfulSubmission = useCallback((callbacks) => {
    const {
      loadSuggestions,
      resetForm,
      resetDateTime,
      navigation,
      isEditing,
      vibeAlert,
      invitationSummary,
    } = callbacks;

    if (loadSuggestions) loadSuggestions();
    if (resetForm && !isEditing) resetForm();
    if (resetDateTime && !isEditing) resetDateTime();

    const message = isEditing
      ? 'Event updated successfully!'
      : invitationSummary ||
        'Event created successfully! You are automatically subscribed to your event.';

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
