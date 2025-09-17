// FILE: invitations/index.js - Main invitation service re-exports
// This maintains backward compatibility while organizing the service into modules

// Core constants and types
export {
  INVITATION_STATUS,
  INVITATION_TYPE,
  validateInvitationData,
  generateInvitationId,
} from './invitationCore.js';

// Re-export all functions from the original file for now
// We'll gradually move them to their specific modules
export * from '../invitations.js';

export default {
  // Core
  INVITATION_STATUS: require('./invitationCore.js').INVITATION_STATUS,
  INVITATION_TYPE: require('./invitationCore.js').INVITATION_TYPE,

  // Functions will be organized by module as we refactor
  // userInvitations: require('./userInvitations.js'),
  // emailInvitations: require('./emailInvitations.js'),
  // phoneInvitations: require('./phoneInvitations.js'),
  // invitationQueries: require('./invitationQueries.js'),
};
