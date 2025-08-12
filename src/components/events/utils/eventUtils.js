// utils/eventUtils.js
// Central export file for all event-related utilities

// Export all event status utilities
export {
  getEventStatus,
  getStatusColor,
  isPastEvent,
  isEventFull,
  isEventStartingSoon,
  getTimeUntilEvent,
  formatTimeUntilEvent,
} from './eventStatus';

// Export all event validation utilities
export {
  validateUserCanJoinEvent,
  getReliabilityWarning,
  getUserEventPermissions,
  validateEventJoinConstraints,
  validateUserCanCreateEvent,
} from './eventValidation';

// Export all event form utilities
export {
  validateEventDateTime,
  validateEventForm,
  formatEventForStorage,
} from './eventFormValidation';

// Export user metrics utilities
export {
  updateEventAttendance,
  updateNoShow,
  updateEventSubscription,
  updateEventCreationMetrics,
  getUserEventStats,
  getUserReliabilityScore,
  getUserReliabilityStatus,
  completeEvent,
  autoDetectNoShows,
  initializeUserMetrics,
  cleanupEventDeletion,
} from '../attendees/utils/userMetrics';

// Export notification utilities
export {
  getEventsWithPendingNotifications,
  markNotificationProcessed,
  generateChangeNotificationContent,
  getUserNotificationPreferences,
  processPendingNotifications,
  triggerNotificationProcessing,
} from '../../../utils/notificationUtils';
