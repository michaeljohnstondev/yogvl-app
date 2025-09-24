// FILE: services/defaultUserSettings.js - Default User Settings Configuration

/**
 * Default notification settings for new users
 */
export const getDefaultNotificationSettings = () => ({
  app: {
    pushNotifications: true,
    newFollowers: true,
    eventInvitations: true,
    suggestedEvents: true,
  },
  hosting: {
    enabled: true,
    hostComments: true,
    newComments: true,
    notifyOnJoin: true,
    notifyOnLeave: true,
    eventRecap: false,
    attendanceReminders: 'none',
    reminderTemplates: {
      '15min': false,
      '30min': false,
      '1hour': true,
      '2hour': false,
      '1day': true,
      '1week': false,
    },
  },
  attending: {
    enabled: true,
    hostChanges: true,
    hostComments: true,
    newComments: false,
    reminderTemplates: {
      '15min': false,
      '30min': false,
      '1hour': true,
      '2hour': false,
      '1day': true,
      '1week': false,
    },
  },
});

/**
 * Default privacy settings for new users
 */
export const getDefaultPrivacySettings = () => ({
  // Contact Information Visibility
  emailVisibility: 'friends', // 'never', 'friends', 'followers', 'always'
  phoneVisibility: 'friends',
  locationVisibility: 'followers',

  // Profile Visibility
  profileVisibility: true,
  bioVisibility: 'always', // Bio is typically more open
  profilePictureVisibility: 'always', // Profile pictures typically public

  // Event Privacy
  requireFollowForEvents: false,
});

/**
 * Complete default settings object for new users
 */
export const getDefaultUserSettings = () => ({
  notifications: getDefaultNotificationSettings(),
  privacy: getDefaultPrivacySettings(),
  preferences: {
    theme: 'dark',
    language: 'en',
    timezone:
      Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    dateFormat: 'MM/dd/yyyy',
    timeFormat: '12hour',
    firstDayOfWeek: 'sunday',
  },
  display: {
    showProfilePicture: true,
    showRealName: true,
    compactMode: false,
    animations: true,
    soundEffects: true,
  },
  accessibility: {
    highContrast: false,
    largeText: false,
    reduceMotion: false,
    screenReaderOptimized: false,
  },
});

/**
 * Get default metrics structure for new users
 */
export const getDefaultUserMetrics = () => ({
  events: {
    created: 0,
    joined: 0,
    attended: 0,
    noShows: 0,
    subscribedEvents: [],
    attendedEvents: [],
    noShowEvents: [],
    lastActivity: new Date(),
  },
  social: {
    followersCount: 0,
    followingCount: 0,
    mutualFriendsCount: 0,
    profileViews: 0,
    lastProfileView: null,
  },
  engagement: {
    commentsPosted: 0,
    likesReceived: 0,
    sharesReceived: 0,
    averageEventRating: 0,
    totalRatings: 0,
  },
});
