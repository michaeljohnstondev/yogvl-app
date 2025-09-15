// FILE: services/friendService.js - Main Friend System Orchestrator
// This file now coordinates between specialized user relationship services

// Import all user relationship services
import {
  acceptFriendRequest,
  declineFriendRequest,
  getFriendRequestStatus,
  addToFavorites,
  removeFromFavorites,
  checkIfFavorite,
  removeFriend,
  clearFriendshipData,
} from './shared/userRelationshipsService';

import {
  sendCohostInvitation,
  acceptCohostInvitation,
  declineCohostInvitation,
  leaveCohostRole,
  removeCohostFromEvent,
  getCohostInvitationStatus,
} from './shared/cohostInvitationsService';

import {
  sendGuestInvitation,
  acceptGuestInvitation,
  declineGuestInvitation,
  getGuestInvitationStatus,
  getUserGuestInvitations,
} from './shared/guestInvitationsService';

/**
 * COMPATIBILITY LAYER: This maintains backward compatibility with existing code
 * that imports from friendService.js. All functions are re-exported from the
 * specialized services to avoid breaking changes.
 */

// User relationship functions
export {
  acceptFriendRequest,
  declineFriendRequest,
  getFriendRequestStatus,
  addToFavorites,
  removeFromFavorites,
  checkIfFavorite,
  removeFriend,
  clearFriendshipData,
};

// Cohost invitation functions
export {
  sendCohostInvitation,
  acceptCohostInvitation,
  declineCohostInvitation,
  leaveCohostRole,
  removeCohostFromEvent,
  getCohostInvitationStatus,
};

// Guest invitation functions
export {
  sendGuestInvitation,
  acceptGuestInvitation,
  declineGuestInvitation,
  getGuestInvitationStatus,
  getUserGuestInvitations,
};

/**
 * DEFAULT EXPORT: Combined friend service for backward compatibility
 * This allows existing code using `import friendService from './friendService'`
 * to continue working without changes.
 */
export default {
  // User relationships
  acceptFriendRequest,
  declineFriendRequest,
  getFriendRequestStatus,
  addToFavorites,
  removeFromFavorites,
  checkIfFavorite,
  removeFriend,
  clearFriendshipData,

  // Cohost invitations
  sendCohostInvitation,
  acceptCohostInvitation,
  declineCohostInvitation,
  leaveCohostRole,
  removeCohostFromEvent,
  getCohostInvitationStatus,

  // Guest invitations
  sendGuestInvitation,
  acceptGuestInvitation,
  declineGuestInvitation,
  getGuestInvitationStatus,
  getUserGuestInvitations,
};