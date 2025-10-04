// FILE: src/events/services/eventDataService.js
// Unified service for event data operations with proper array management

import { eventService } from './eventService';
import {
  sendUserInvitation,
  acceptInvitation,
  declineInvitation,
} from './invitations';
import {
  getEventParticipants,
  checkUserInvitationEligibility,
} from '../../services/invitationEligibilityService';
import { doc, getDoc } from '../../lib/firebase';
import { db } from '../../auth/services/firebase';

/**
 * Comprehensive event data service that manages the complete invitation lifecycle
 * This service ensures proper separation of concerns and maintains data consistency
 */
export const eventDataService = {
  /**
   * Fetch comprehensive event data for EventDetailScreen
   * This consolidates all the data the screen needs in one call
   */
  async fetchEventData(studioId, eventId, currentUserId) {
    try {

      // Get the main event document
      const event = await eventService.fetchEventDetails(studioId, eventId);

      if (!event) {
        throw new Error('Event not found');
      }

      // Check if current user is subscribed
      // Handle both array format (legacy) and object format (new)
      const subscribers = event.subscribers || [];
      const isSubscribed = Array.isArray(subscribers)
        ? subscribers.includes(currentUserId)
        : subscribers[currentUserId] !== undefined;

      // Get creator data
      let creatorData = null;
      if (event.createdBy) {
        try {
          const creatorRef = doc(db, 'users', event.createdBy);
          const creatorSnap = await getDoc(creatorRef);

          if (creatorSnap.exists()) {
            const userData = creatorSnap.data();
            creatorData = {
              id: event.createdBy,
              uid: event.createdBy,
              displayName:
                userData.userdata?.contactInfo?.displayName ||
                `${userData.userdata?.contactInfo?.firstName || ''} ${userData.userdata?.contactInfo?.lastName || ''}`.trim() ||
                'Unknown Host',
              profilePicture:
                userData.profilePicture ||
                userData.userdata?.profile?.profilePicture ||
                userData.userdata?.contactInfo?.profilePicture ||
                null,
              userdata: userData.userdata || {},
            };
          } else {
            console.warn(
              '[EventDataService] Creator document not found for user:',
              event.createdBy
            );
          }
        } catch (error) {
          console.error(
            '[EventDataService] Error fetching creator data:',
            error
          );
          // Continue with null creator data rather than failing entirely
        }
      } else {
        console.warn('[EventDataService] No createdBy field found in event');
      }

      // Get cohost data
      let cohostData = [];
      if (event.cohosts && event.cohosts.length > 0) {
        try {
          const cohostPromises = event.cohosts.map(async (cohostId) => {
            try {
              const cohostRef = doc(db, 'users', cohostId);
              const cohostSnap = await getDoc(cohostRef);

              if (cohostSnap.exists()) {
                const userData = cohostSnap.data();
                return {
                  id: cohostId,
                  uid: cohostId,
                  displayName:
                    userData.userdata?.contactInfo?.displayName ||
                    `${userData.userdata?.contactInfo?.firstName || ''} ${userData.userdata?.contactInfo?.lastName || ''}`.trim() ||
                    'Unknown Cohost',
                  profilePicture:
                    userData.profilePicture ||
                    userData.userdata?.profile?.profilePicture ||
                    userData.userdata?.contactInfo?.profilePicture ||
                    null,
                  userdata: userData.userdata || {},
                };
              }
              return null;
            } catch (error) {
              console.error(
                '[EventDataService] Error fetching cohost data for:',
                cohostId,
                error
              );
              return null;
            }
          });

          const cohostResults = await Promise.all(cohostPromises);
          cohostData = cohostResults.filter((cohost) => cohost !== null);
        } catch (error) {
          console.error(
            '[EventDataService] Error fetching cohosts data:',
            error
          );
          // Continue with empty cohost data
        }
      }

      // Get basic attendee data (subscribers who have user documents)
      let attendeesList = [];
      if (subscribers.length > 0) {
        try {
          // Limit to first 20 attendees for performance
          const attendeeIds = subscribers.slice(0, 20);
          const attendeePromises = attendeeIds.map(async (attendeeId) => {
            try {
              const attendeeRef = doc(db, 'users', attendeeId);
              const attendeeSnap = await getDoc(attendeeRef);

              if (attendeeSnap.exists()) {
                const userData = attendeeSnap.data();
                return {
                  id: attendeeId,
                  uid: attendeeId,
                  displayName:
                    userData.userdata?.contactInfo?.displayName ||
                    `${userData.userdata?.contactInfo?.firstName || ''} ${userData.userdata?.contactInfo?.lastName || ''}`.trim() ||
                    'Anonymous',
                  profilePicture:
                    userData.profilePicture ||
                    userData.userdata?.profile?.profilePicture ||
                    userData.userdata?.contactInfo?.profilePicture ||
                    null,
                  userdata: userData.userdata || {},
                };
              }
              return null;
            } catch (error) {
              console.error(
                '[EventDataService] Error fetching attendee data for:',
                attendeeId,
                error
              );
              return null;
            }
          });

          const attendeeResults = await Promise.all(attendeePromises);
          attendeesList = attendeeResults.filter(
            (attendee) => attendee !== null
          );
        } catch (error) {
          console.error(
            '[EventDataService] Error fetching attendees data:',
            error
          );
          // Continue with empty attendees list
        }
      }

      const result = {
        event,
        isSubscribed,
        creatorData,
        cohostData,
        attendeesList,
      };

      return result;
    } catch (error) {
      console.error('[EventDataService] Error fetching event data:', error);
      throw error;
    }
  },

  /**
   * Send invitation with proper array management
   */
  async sendInvitation(
    hostId,
    guestId,
    eventId,
    studioId,
    message = '',
    source = 'manual'
  ) {
    try {

      // Check eligibility first
      const eligibility = await checkUserInvitationEligibility(
        guestId,
        eventId,
        studioId
      );
      if (!eligibility.isEligible) {
        throw new Error(
          `User ineligible for invitation: ${eligibility.reason} - ${eligibility.details}`
        );
      }

      // Send invitation using existing service
      const result = await sendUserInvitation({
        eventId,
        hostId,
        guestId,
        message,
        studioId,
        source,
      });


      return {
        success: true,
        invitationId: result.invitationId,
        message: 'Invitation sent successfully',
      };
    } catch (error) {
      console.error('[EventDataService] Error sending invitation:', error);
      throw error;
    }
  },

  /**
   * Accept invitation with atomic state transition
   */
  async acceptInvitation(invitationId, userId, studioId = null) {
    try {

      const result = await acceptInvitation(invitationId, userId, studioId);


      return {
        success: true,
        eventId: result.eventId,
        message: 'Invitation accepted and subscribed to event',
      };
    } catch (error) {
      console.error('[EventDataService] Error accepting invitation:', error);
      throw error;
    }
  },

  /**
   * Decline invitation with proper cleanup
   */
  async declineInvitation(invitationId, userId) {
    try {

      const result = await declineInvitation(invitationId, userId);


      return {
        success: true,
        eventId: result.eventId,
        message: 'Invitation declined',
      };
    } catch (error) {
      console.error('[EventDataService] Error declining invitation:', error);
      throw error;
    }
  },

  /**
   * Get comprehensive event participation status
   */
  async getEventStatus(eventId, studioId) {
    try {
      const [participantData, eventStatus] = await Promise.all([
        getEventParticipants(eventId, studioId),
        eventService.getEventInvitationStatus(eventId, studioId),
      ]);

      return {
        success: true,
        participants: participantData,
        status: eventStatus,
        summary: {
          totalSubscribers: eventStatus.subscribers.length,
          totalInvitations: eventStatus.invitations.length,
          totalCohosts: eventStatus.cohosts.length,
          hostId: eventStatus.hostId,
        },
      };
    } catch (error) {
      console.error('[EventDataService] Error getting event status:', error);
      throw error;
    }
  },

  /**
   * Bulk invite users with eligibility checking
   */
  async bulkInviteUsers(
    hostId,
    userIds,
    eventId,
    studioId,
    message = '',
    source = 'bulk'
  ) {
    try {

      const results = {
        successful: [],
        failed: [],
        totalAttempted: userIds.length,
      };

      // Process invitations sequentially to avoid overwhelming the service
      for (const userId of userIds) {
        try {
          const result = await this.sendInvitation(
            hostId,
            userId,
            eventId,
            studioId,
            message,
            source
          );
          results.successful.push({
            userId,
            invitationId: result.invitationId,
          });
        } catch (error) {
          results.failed.push({
            userId,
            error: error.message,
          });
        }
      }


      return {
        success: true,
        results,
        summary: {
          sent: results.successful.length,
          failed: results.failed.length,
          total: results.totalAttempted,
        },
      };
    } catch (error) {
      console.error('[EventDataService] Error bulk inviting users:', error);
      throw error;
    }
  },

  /**
   * Validate invitation flow consistency
   * This is a helper function for debugging and testing
   */
  async validateEventArrays(eventId, studioId) {
    try {
      const eventStatus = await eventService.getEventInvitationStatus(
        eventId,
        studioId
      );

      // Check for duplicates
      const subscriberSet = new Set(eventStatus.subscribers);
      const invitationSet = new Set(eventStatus.invitations);

      // Check for overlap (should be none)
      const overlap = eventStatus.subscribers.filter((userId) =>
        eventStatus.invitations.includes(userId)
      );

      // Check counts
      const countConsistency = {
        subscriberCountMatch:
          subscriberSet.size === eventStatus.subscriberCount,
        noDuplicateSubscribers:
          subscriberSet.size === eventStatus.subscribers.length,
        noDuplicateInvitations:
          invitationSet.size === eventStatus.invitations.length,
        noOverlap: overlap.length === 0,
      };

      return {
        success: true,
        validation: {
          ...countConsistency,
          overlap,
          subscriberCount: subscriberSet.size,
          invitationCount: invitationSet.size,
          isValid: Object.values(countConsistency).every(Boolean),
        },
      };
    } catch (error) {
      console.error('[EventDataService] Error validating arrays:', error);
      throw error;
    }
  },
};

export default eventDataService;
