// FILE: services/defaultUserSettings.js - Default User Settings Configuration

/**
 * Default notification settings for new users
 */
export const getDefaultNotificationSettings = () => ({
  app: {
    pushNotifications: true,
    emailNotifications: true,
    friendAdded: true,
    friendFollowed: true,
    systemUpdates: true,
    promotionalEmails: false,
    quietHours: false,
    weekendNotifications: true,
  },
  hosting: {
    enabled: true,
    hostChanges: true,
    eventReminders: true,
    reminderTiming: '1hour',
    dayBeforeReminder: true,
    hostComments: true,
    newComments: true,
    notifyOnJoin: true,
    notifyOnLeave: true,
    reminderTemplates: [
      {
        id: '15min',
        amount: 15,
        unit: 'minutes',
        enabled: true,
        label: '15 min',
      },
      { id: '1hour', amount: 1, unit: 'hours', enabled: true, label: '1 hour' },
      { id: '1day', amount: 1, unit: 'days', enabled: false, label: '1 day' },
      {
        id: '2hours',
        amount: 2,
        unit: 'hours',
        enabled: false,
        label: '2 hours',
      },
      {
        id: '30min',
        amount: 30,
        unit: 'minutes',
        enabled: false,
        label: '30 min',
      },
    ],
  },
  attending: {
    hostChanges: true,
    eventReminders: true,
    reminderTiming: '1hour',
    dayBeforeReminder: true,
    hostComments: true,
    newComments: false,
    reminderTemplates: [
      {
        id: '15min',
        amount: 15,
        unit: 'minutes',
        enabled: true,
        label: '15 min',
      },
      { id: '1hour', amount: 1, unit: 'hours', enabled: true, label: '1 hour' },
      { id: '1day', amount: 1, unit: 'days', enabled: false, label: '1 day' },
      {
        id: '2hours',
        amount: 2,
        unit: 'hours',
        enabled: false,
        label: '2 hours',
      },
      {
        id: '30min',
        amount: 30,
        unit: 'minutes',
        enabled: false,
        label: '30 min',
      },
    ],
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
