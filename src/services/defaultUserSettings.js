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
    reminderTiming: '1hour',
    notifyOnJoin: true,
    notifyOnLeave: true,
    sendDayBefore: true,
    newComments: true,
  },
  attending: {
    hostChanges: true,
    eventReminders: true,
    reminderTiming: '1hour',
    dayBeforeReminder: true,
    newComments: true,
    eventCanceled: true,
    wrapUpReminders: true,
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
  showOnlineStatus: true,
  showLastSeen: 'friends',
  
  // Follow Privacy
  allowFollowRequests: true,
  showFollowerCounts: true,
  whoCanFollowMe: 'always',
  requireFollowApproval: false,
  
  // Event Privacy
  canSeeMyEvents: 'followers',
  canInviteMe: 'followers',
  showMyAttendance: true,
  allowDirectInvites: true,
  
  // Content Sharing
  allowEventSharing: true,
  allowProfileSharing: true,
  showInSearch: true,
  allowSuggestions: true,
  
  // Account Security
  twoFactorAuth: false,
  requirePasswordForSensitiveActions: false,
  sessionTimeout: 30, // days
  logSecurityEvents: true,
  
  // Data & Analytics
  allowAnalytics: true,
  shareUsageData: false,
  allowPersonalization: true,
  exportDataEnabled: true,
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
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
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