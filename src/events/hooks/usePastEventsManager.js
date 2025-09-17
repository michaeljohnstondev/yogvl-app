import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../auth/services/firebase';
import { pastEventToTemplate } from '../lib/templateTransforms';

export const usePastEventsManager = (
  currentUserId,
  studioId,
  applyTemplate,
  replaceFormData,
  closeSelectionModal,
  vibeAlert
) => {
  const [pastEvents, setPastEvents] = useState([]);

  // Load past events for template creation
  useEffect(() => {
    const loadPastEvents = async () => {
      if (!currentUserId || !studioId) return;

      try {
        // Query studio-specific events collection
        const q = query(
          collection(db, 'studios', studioId, 'events'),
          where('createdBy', '==', currentUserId),
          limit(50) // Get more events and filter client-side
        );

        const snapshot = await getDocs(q);
        const now = new Date();

        const pastEvents = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((event) => {
            // Client-side filter for past events
            const eventDate = event.eventTimestamp
              ? event.eventTimestamp.toDate()
              : new Date(event.utcDateTime || 0);
            return eventDate < now;
          })
          .sort((a, b) => {
            // Client-side sort by event date (most recent first)
            const dateA = a.eventTimestamp
              ? a.eventTimestamp.toDate()
              : new Date(a.utcDateTime || 0);
            const dateB = b.eventTimestamp
              ? b.eventTimestamp.toDate()
              : new Date(b.utcDateTime || 0);
            return dateB - dateA;
          })
          .slice(0, 10); // Take only the 10 most recent

        setPastEvents(pastEvents);
      } catch (error) {
        console.error('Failed to load past events:', error);
      }
    };

    loadPastEvents();
  }, [currentUserId, studioId]);

  // Handler for creating template from past event
  const handleCreateTemplateFromPastEvent = useCallback(
    (pastEvent) => {
      try {
        // Convert past event to template format
        const template = pastEventToTemplate(pastEvent);

        // Apply the template directly to the form
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
          hasRsvpDeadline: templateFormData.hasRsvpDeadline || false,
          whatsProvided: templateFormData.whatsProvided || '',
          whatToBring: templateFormData.whatToBring || '',
          parkingInstructions: templateFormData.parkingInstructions || '',
          dressCode: templateFormData.dressCode || '',
          ageRestrictions: templateFormData.ageRestrictions || '',
        });

        closeSelectionModal();
        vibeAlert.turquoise(
          'Past Event Loaded',
          `"${pastEvent.title}" has been loaded as a template! 🔄`
        );
      } catch (error) {
        vibeAlert.error('Error', error.message || 'Failed to load past event');
      }
    },
    [applyTemplate, replaceFormData, closeSelectionModal, vibeAlert]
  );

  return {
    pastEvents,
    handleCreateTemplateFromPastEvent,
  };
};
