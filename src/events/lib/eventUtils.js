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
  completeEvent,
  autoDetectNoShows,
  initializeUserMetrics,
  cleanupEventDeletion,
} from './userMetrics';

// Export notification utilities
export {
  getEventsWithPendingNotifications,
  markNotificationProcessed,
  generateChangeNotificationContent,
  getUserNotificationPreferences,
  processPendingNotifications,
  triggerNotificationProcessing,
} from '../../lib/notificationUtils';
