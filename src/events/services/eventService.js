// FILE: events/services/eventService.js - Main Event System Orchestrator
// This file now coordinates between specialized event services

// Import all event services
import {
  fetchEventDetails,
  deleteEvent,
  kickAttendee,
  getEventInvitationStatus,
  updateEventDetails,
} from './shared/eventCoreService';

import {
  addUserToInvitations,
  removeUserFromInvitations,
  acceptInvitationAndSubscribe,
  declineInvitation,
  bulkAddUsersToInvitations,
} from './shared/eventInvitationService';

import {
  subscribeToEvent,
  unsubscribeFromEvent,
  addEventNotificationSubscription,
  removeEventNotificationSubscription,
  isUserSubscribedToEvent,
  getEventSubscriptionStats,
} from './shared/eventSubscriptionService';

/**
 * MAIN EVENT SERVICE OBJECT: Maintains backward compatibility with existing code
 * All functions are organized by domain but accessible through the main service object.
 */
export const eventService = {
  // Core event operations
  fetchEventDetails,
  deleteEvent,
  kickAttendee,
  updateEventDetails,

  // Invitation management
  addUserToInvitations,
  removeUserFromInvitations,
  acceptInvitationAndSubscribe,
  declineInvitation,
  bulkAddUsersToInvitations,
  getEventInvitationStatus,

  // Subscription management
  subscribeToEvent,
  unsubscribeFromEvent,
  addEventNotificationSubscription,
  removeEventNotificationSubscription,
  isUserSubscribedToEvent,
  getEventSubscriptionStats,
};

/**
 * NAMED EXPORTS: For modern import patterns
 * Allows importing specific functions: import { subscribeToEvent } from './eventService'
 */

// Core operations
export { fetchEventDetails, deleteEvent, kickAttendee, updateEventDetails };

// Invitation operations
export {
  addUserToInvitations,
  removeUserFromInvitations,
  acceptInvitationAndSubscribe,
  declineInvitation,
  bulkAddUsersToInvitations,
  getEventInvitationStatus,
};

// Subscription operations
export {
  subscribeToEvent,
  unsubscribeFromEvent,
  addEventNotificationSubscription,
  removeEventNotificationSubscription,
  isUserSubscribedToEvent,
  getEventSubscriptionStats,
};

/**
 * DEFAULT EXPORT: Complete service object for backward compatibility
 * This allows existing code using `import { eventService } from './eventService'`
 * or `eventService.functionName()` to continue working without changes.
 */
export default eventService;
