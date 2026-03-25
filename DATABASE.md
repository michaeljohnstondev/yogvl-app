# DATABASE.md

This document defines the actual Firestore database schema for Big Vibe Studios based on the real implementation.

## User Collection Structure

**Collection**: `users/{userId}`

Based on actual user data from your system:

```javascript
{
  // Firebase Auth fields (automatically managed)
  email: string,              // From Firebase Auth
  phoneNumber: string,        // From Firebase Auth

  // NOTE: NO ROOT-LEVEL displayName FIELD
  // All display name data is stored in userdata.contactInfo.displayName

  // Custom user data
  userdata: {
    contactInfo: {
      displayName: string,    // Full display name (firstName + lastName)
      firstName: string,      // User's first name
      lastName: string,       // User's last name
      email: string,          // User's email address
      phone: string,          // Phone number in +18648887717 format
      phoneNumber: string,    // Also stored as phoneNumber
      profilePicture: string  // Firebase Storage URL for profile picture
    },

    // Onboarding tracking
    onboarding: {
      hasCompletedInterests: boolean,  // Whether user completed interest selection
      interestsCompletedAt: timestamp  // When interests were completed
    },

    // User metrics and activity tracking
    followerCount: number,    // Number of followers

    // System metadata
    lastUpdated: timestamp,   // When user data was last updated
    metadata: {
      createdAt: timestamp,   // Account creation timestamp
      updatedAt: timestamp    // Last update timestamp
    },

    // User metrics for reliability tracking
    metrics: {
      events: object,         // Event participation metrics
      social: object,         // Social interaction metrics
      hostRating: {           // Host rating data (guest ratings of this user as host)
        stars: array,         // Array of rating values (1-5)
        timeRated: array,     // Array of timestamps (Firestore Timestamp objects)
        totalRatings: number, // Total count of ratings received
        lastRated: timestamp, // When last rating was received
        averageRating: number // Cached average (optional, for performance)
      },
      engagement: {           // User engagement metrics (non-rating related)
        commentsPosted: number,
        likesReceived: number,
        sharesReceived: number
      }
    },

    // User settings and preferences
    settings: {
      accessibility: object,  // Accessibility preferences
      display: object,        // Display preferences
      preferences: object,    // General preferences

      // Notification settings (detailed schema)
      notifications: {
        app: {                // App-level notification preferences
          pushNotifications: boolean,    // Enable push notifications
          newFollowers: boolean,         // Notify when someone follows user
          eventInvitations: boolean,     // Notify when invited to events
          suggestedEvents: boolean,      // Notify when new events match user interests
          friendEventActivity: boolean,  // Notify when friends join/create public events
          officialEvents: boolean,       // Notify when studio posts official events
        },

        // Per-friend notification muting (separate from main settings to avoid cascade complexity)
        mutedFriendsEvents: string[],    // Array of friend user IDs whose event activity should NOT trigger notifications
        hosting: {            // Default notification settings when hosting events
          enabled: boolean,                    // Enable hosting notifications
          hostComments: boolean,               // Notify about host comments
          newComments: boolean,                // Notify about all comments
          notifyOnJoin: boolean,               // Notify when someone joins
          notifyOnLeave: boolean,              // Notify when someone leaves
          eventRecap: boolean,                 // Send post-event recap notification
          reminderTemplates: {                 // Reminder template preferences
            '15m': boolean,                  // 15 minutes before event
            '30m': boolean,                  // 30 minutes before event
            '1h': boolean,                  // 1 hour before event
            '2h': boolean,                  // 2 hours before event
            '1d': boolean,                   // 1 day before event
            '1w': boolean,                  // 1 week before event
            // Custom templates can be added: '5min': boolean, '3hour': boolean, etc.
          }
        },
        attending: {          // Default notification settings when attending events
          enabled: boolean,                    // Enable attending notifications
          hostChanges: boolean,                // Notify about host-made changes
          hostComments: boolean,               // Notify about host comments
          newComments: boolean,                // Notify about all comments
          reminderTemplates: {                 // Reminder template preferences
            '15m': boolean,                  // 15 minutes before event
            '30m': boolean,                  // 30 minutes before event
            '1h': boolean,                  // 1 hour before event
            '2h': boolean,                  // 2 hours before event
            '1d': boolean,                   // 1 day before event
            '1w': boolean,                  // 1 week before event
            // Custom templates can be added: '5min': boolean, '3hour': boolean, etc.
          }
        }
      },

      privacy: {              // Privacy settings (actual schema)
        // Contact Information Visibility
        emailVisibility: string,         // 'never', 'friends', 'followers', 'always'
        phoneVisibility: string,         // 'never', 'friends', 'followers', 'always'
        locationVisibility: string,      // 'never', 'friends', 'followers', 'always'

        // Profile Visibility
        profileVisibility: boolean,      // Whether profile is accessible to others
        bioVisibility: string,           // 'never', 'friends', 'followers', 'always'
        profilePictureVisibility: string, // 'never', 'friends', 'followers', 'always'

        // Event Privacy
        requireFollowForEvents: boolean  // Whether friends-only events are required
      }
    },

    // Studio associations
    studios: {
      additional: array,      // Additional studios user belongs to
      default: object         // Default studio information
    }
  }
}
```

## Event Collection Structure

**Collection**: `studios/{studioId}/events/{eventId}`

Based on actual implementation:

```javascript
{
  // Basic event information
  title: string,              // Event title
  description: string,        // Event description
  createdBy: string,          // Host user ID (NOT hostId - that was wrong in docs)

  // Timing
  dateTime: timestamp,        // Event start date/time
  endDateTime: timestamp,     // Event end date/time
  createdAt: timestamp,       // When event was created

  // Location information
  location: object,           // Location data structure
  address: string,            // Event address

  // Participation tracking
  subscribers: string[],      // Array of user IDs subscribed to event
  cohosts: string[],         // Array of cohost user IDs
  subscriberCount: number,    // Cached count of subscribers

  // Message Board tracking
  messageBoardSubscribers: string[],  // Array of user IDs subscribed to message board notifications
  messageBoardMuted: string[],        // Array of user IDs who muted message board notifications

  // Invitation tracking
  invitations: string[],      // Array of user IDs with pending invitations

  // Event settings
  maxGuests: number,          // Maximum number of guests allowed
  isPrivate: boolean,         // Whether event is private
  active: boolean,            // Whether event is active

  // Official/Community Events
  isOfficialEvent: boolean,   // Whether this is an official community event (created by admin on behalf of organization)
  // NOTE: Organization name (e.g., "YoGVL", "YoATL") is NOT stored in the event document.
  // It is dynamically generated from the studio's nickname field when displaying the event.
  // Lookup: studios/{studioId}.nickname -> format as "Yo{nickname}"

  // Event Completion and Attendance Tracking
  status: string,             // 'active', 'completed', 'cancelled'
  trackAttendance: boolean,   // Whether to track attendance
  attendanceType: string,     // 'casual' or 'strict' (affects reliability scoring)

  // Post-Event Analytics
  views: number,              // Number of times event was viewed
  attended: number,           // Number who actually attended (post-event)
  noShows: number,           // Number of no-shows (post-event)

  // Completion metadata
  completedAt: timestamp,     // When event was marked as completed
  completedBy: string,        // User ID who completed the event (typically host)

  // Attendance tracking array (detailed attendance records)
  attendance: [
    {
      userId: string,         // User ID of attendee
      attended: boolean,      // True if attended, false if no-show
      isHost: boolean,        // Whether this user was the host
      markedBy: string,       // User ID who marked this attendance
      markedAt: timestamp,    // When attendance was marked
      selfReported: boolean,  // Whether user self-reported attendance
      isSoloEvent: boolean,   // Whether this was a solo event (only host)
      eventType: string       // 'casual' or 'strict' for this attendance record
    }
  ]
}
```

## Invitation System - Dual Storage Architecture

**CRITICAL**: The invitation system uses DUAL STORAGE for optimal performance and user experience.

### Event-Level Invitation Tracking

Event documents track invitation state for filtering:

```javascript
// In studios/{studioId}/events/{eventId}
{
  // Invitation state arrays (unified for guest and cohost)
  invitations: [
    {
      userId: string,           // User ID being invited
      type: 'guest' | 'cohost'  // Type of invitation
    }
  ],
  subscribers: string[],     // User IDs who accepted guest invitations or joined directly
  cohosts: string[],        // User IDs who accepted cohost invitations

  // Host is tracked separately
  createdBy: string         // User ID of event host
}
```

### User-Level Invitation Tracking

User documents track invitation state for user experience:

```javascript
// In users/{userId}
{
  userdata: {
    // Pending invitations (minimal metadata)
    pendingInvitations: [
      {
        eventId: string,           // Event ID
        type: 'guest' | 'cohost',  // Type of invitation
        studioId: string           // Studio context for event lookup
      }
    ],

    // Accepted invitations and event participation
    subscribedEvents: string[],    // Event IDs user is attending (guest)
    cohostEvents: string[],        // Event IDs user is co-hosting (NEW)

    // Existing user data...
    contactInfo: { ... },
    studios: { ... }
  }
}
```

### Invitation State Transitions (Atomic Batch Operations)

#### 1. **Send Guest Invitation**:
   - Add invitation object to `event.invitations[]`:
     ```javascript
     { userId, type: 'guest' }
     ```
   - Add invitation object to `user.userdata.pendingInvitations[]`:
     ```javascript
     { eventId, type: 'guest', studioId }
     ```

#### 2. **Send Cohost Invitation**:
   - Add invitation object to `event.invitations[]`:
     ```javascript
     { userId, type: 'cohost' }
     ```
   - Add invitation object to `user.userdata.pendingInvitations[]`:
     ```javascript
     { eventId, type: 'cohost', studioId }
     ```

#### 3. **Accept Guest Invitation**:
   - Remove invitation object from `event.invitations[]` (where userId matches)
   - Add user ID to `event.subscribers[]`
   - Remove invitation object from `user.userdata.pendingInvitations[]` (where eventId matches)
   - Add event ID to `user.userdata.subscribedEvents[]`

#### 4. **Accept Cohost Invitation**:
   - Remove invitation object from `event.invitations[]` (where userId matches)
   - Add user ID to `event.cohosts[]`
   - Remove invitation object from `user.userdata.pendingInvitations[]` (where eventId matches)
   - Add event ID to `user.userdata.cohostEvents[]`

#### 5. **Decline Invitation** (guest or cohost):
   - Remove invitation object from `event.invitations[]` (where userId matches)
   - Remove invitation object from `user.userdata.pendingInvitations[]` (where eventId matches)

### Invitation Filtering Logic

```javascript
// To filter users for invitations:
const eventData = await getDoc(eventRef);
const invitations = eventData.invitations || [];
const subscribed = eventData.subscribers || [];
const cohosts = eventData.cohosts || [];
const hostId = eventData.createdBy;

// Extract user IDs from invitation objects
const invitedUserIds = invitations.map(inv => inv.userId);

const availableUsers = allUsers.filter(
  (user) =>
    user.id !== hostId &&
    !invitedUserIds.includes(user.id) &&
    !subscribed.includes(user.id) &&
    !cohosts.includes(user.id)
);
```

### Checking Invitation Type

```javascript
// Check if user has pending invitation and what type
const userInvitation = event.invitations?.find(inv => inv.userId === currentUserId);
if (userInvitation) {
  console.log(`User has pending ${userInvitation.type} invitation`);
  // userInvitation.type === 'guest' or 'cohost'
}

// Get all user's pending invitations by type
const userDoc = await getDoc(doc(db, 'users', userId));
const pendingInvites = userDoc.data()?.userdata?.pendingInvitations || [];

const guestInvites = pendingInvites.filter(inv => inv.type === 'guest');
const cohostInvites = pendingInvites.filter(inv => inv.type === 'cohost');
```

### Why Dual Storage Architecture

**Event-Side Benefits:**

1. **Fast filtering**: O(1) array lookups when creating invitations
2. **Host visibility**: Hosts can see all invitations across all inviters
3. **Efficient duplicate prevention**: Quick checks against existing arrays

**User-Side Benefits:**

1. **Invitation inbox**: Users can see all pending invitations
2. **Event history**: Users can track their subscribed events
3. **Better UX**: No need to scan all events to find user invitations

**System Benefits:**

1. **Atomic operations**: Batch operations ensure both sides stay in sync
2. **Data consistency**: Single source of truth for each use case
3. **Performance**: Optimized for both event creation and user management

## Key Schema Notes

1. **User display names** are stored ONLY in `userdata.contactInfo.displayName` - NO root-level displayName field exists or should be used
2. **Event hosts** are tracked with `createdBy` field - NOT `hostId`
3. **Dual storage architecture** - Both event and user documents track invitation state
4. **Atomic batch operations** - All invitation operations use writeBatch for consistency
5. **Studio-scoped events** - All events are stored in `studios/{studioId}/events/{eventId}` collections

## Data Validation Rules

### Required Fields

- User documents must have `userdata.contactInfo` with `displayName`, `firstName`, `lastName`
- Event documents must have `createdBy`, `title`, `dateTime`
- All timestamps must be valid Firestore Timestamp objects

### Dual Storage Array Management

- Use `writeBatch()` for ALL invitation operations to maintain consistency
- Event arrays: `invitations[]`, `subscribers[]`, `cohosts[]`
- User arrays: `pendingInvitations[]`, `subscribedEvents[]`
- Use `arrayUnion()` and `arrayRemove()` for atomic array operations
- Always update BOTH event and user documents in the same batch

### Invitation Business Rules

- Host (`createdBy`) cannot be in any invitation arrays
- Users can only be in ONE of: invitations, subscribers, or cohosts arrays (event-side)
- Event IDs can only be in ONE of: pendingInvitations, subscribedEvents arrays (user-side)
- Filtering uses event arrays for performance (existing logic works unchanged)
- User inbox queries use user arrays for fast user experience

### Data Consistency Requirements

- **Batch operations mandatory**: All invitation state changes MUST use writeBatch
- **Dual storage sync**: Event and user arrays must stay synchronized
- **Atomic transitions**: Moving between states (invite→accept→subscribe) must be atomic
- **Rollback safety**: If batch fails, no partial state changes occur

This schema reflects the NEW dual storage implementation optimized for both event filtering and user experience.

## Host Rating System

### Event Host Ratings

**Collection**: `users/{hostId}/hostRatings/{ratingId}`

Post-event guest ratings of event hosts for quality tracking.

```javascript
{
  // Event relationship
  eventId: string,              // Related event ID
  studioId: string,             // Studio context
  eventTitle: string,           // Cached event title

  // Rating information
  rating: number,               // 1-5 star rating
  raterId: string,              // User ID who gave the rating
  raterName: string,            // Display name of rater (cached)

  // Metadata
  createdAt: timestamp,         // When rating was submitted
  eventDate: timestamp,         // Original event date
  attendanceType: string        // 'casual' or 'strict' (affects weight)
}
```

### Host Rating Aggregates

Host rating data is aggregated in the user document for performance:

```javascript
// In users/{hostId}
{
  userdata: {
    hostMetrics: {
      averageRating: number,      // Weighted average of all ratings
      totalRatings: number,       // Total number of ratings received
      ratingDistribution: {       // Rating breakdown
        1: number,                // Count of 1-star ratings
        2: number,                // Count of 2-star ratings
        3: number,                // Count of 3-star ratings
        4: number,                // Count of 4-star ratings
        5: number                 // Count of 5-star ratings
      },
      lastRatingAt: timestamp     // When last rating was received
    }
  }
}
```

### Rating Business Rules

- Only attendees who reported attendance can rate hosts
- One rating per guest per event
- Ratings from 'strict' events have higher weight in aggregation
- Host cannot rate themselves
- Ratings are anonymous in the UI but tracked for spam prevention
- **Display average uses 6-month rolling window**: Host profiles show average rating calculated from ratings submitted in the last 6 months only (industry standard)

## User Subcollections

### Favorites

**Collection**: `users/{userId}/favorites/{targetUserId}`

User's favorited users (cross-studio favorites allowed).

```javascript
{
  userId: string,          // ID of favorited user
  favoritedAt: timestamp,  // When user was favorited
  userData: {              // Cached user data for quick display
    firstName: string,
    lastName: string,
    displayName: string,
    email: string
  }
}
```

### Following

**Collection**: `users/{userId}/following/{followedUserId}`

Users that this user follows (cross-studio following allowed).

```javascript
{
  userId: string,          // ID of followed user
  createdAt: timestamp,    // When user started following
  // Additional user data cached here
}
```

### Scheduled Notifications

**Collection**: `users/{userId}/scheduledNotifications/{notificationId}`

User-scoped notification storage for efficient, secure notification management.

```javascript
{
  // Event relationship
  eventId: string,              // Reference to event
  studioId: string,             // Studio context (optional)
  eventTitle: string,           // Cached event title (sanitized)
  eventDateTime: timestamp,     // Original event time (for attendee notifications)

  // Notification classification
  type: string,                 // Notification type (event_reminder, etc.)
  priority: 'low' | 'normal' | 'high' | 'urgent',
  channels: string[],           // ['push', 'email', etc.]

  // Scheduling
  scheduledFor: timestamp,      // When to send notification

  // Notification content
  title: string,                // Notification title (max 100 chars)
  message: string,              // Notification message (max 200 chars)
  data: object,                 // Additional notification data

  // Status tracking
  status: 'pending' | 'sent' | 'failed' | 'cancelled' | 'expired',
  attempts: number,             // Failed delivery attempts (max 5)
  lastAttemptAt: timestamp,     // Last attempt timestamp
  sentAt: timestamp,            // When notification was sent
  failureReason: string,        // Last error message

  // Metadata
  createdAt: timestamp,
  updatedAt: timestamp,
  actualNotificationId: string  // ID of sent notification (if successful)
}
```

### Scheduled Notifications (User-Scoped)

**Collection**: `users/{userId}/scheduledNotifications/{notificationId}`

User-scoped scheduled notification storage for optimal performance and security.

````javascript
{
  // Core notification data
  id: string,                    // Notification ID
  eventId: string,               // Related event (if applicable)
  type: string,                  // Notification type (event_reminder, etc.)
  title: string,                 // Notification title (max 100 chars)
  message: string,               // Notification message (max 200 chars)

  // Scheduling
  scheduledFor: timestamp,       // When to send notification
  status: 'pending' | 'sent' | 'cancelled' | 'failed' | 'expired',
  priority: 'low' | 'normal' | 'high' | 'urgent',
  channels: string[],            // ['push', 'email', etc.]

  // Metadata
  createdAt: timestamp,
  attempts: number,              // Retry attempts (max 5)
  lastAttemptAt: timestamp,      // Last attempt timestamp
  sentAt: timestamp,             // When successfully sent
  data: object                   // Additional notification data
}

### Data Retention Policy

- **Sent notifications**: Retained for 30 days
- **Failed notifications**: Retained for 30 days with retry logic (max 5 attempts)
- **Cancelled notifications**: Immediate deletion
- **Expired notifications**: Automatic cleanup after event passes

### Rate Limiting

- **Max notifications per user per day**: 50
- **Max retry attempts**: 5 per notification
- **Content limits**: Title 100 chars, body 200 chars
- **Batch operations**: Preferred for multiple notification updates

### Query Patterns

**Get user's pending notifications**:

```javascript
collection(db, 'users', userId, 'scheduledNotifications')
  .where('status', '==', 'pending')
  .orderBy('scheduledFor', 'asc');
````

**Get notifications for specific event**:

```javascript
collection(db, 'users', userId, 'scheduledNotifications')
  .where('eventId', '==', eventId)
  .orderBy('createdAt', 'desc');
```

**Get due notifications for processing**:

```javascript
collection(db, 'users', userId, 'scheduledNotifications')
  .where('status', '==', 'pending')
  .where('scheduledFor', '<=', now)
  .limit(50);
```

### Indexes Required

```javascript
scheduledNotifications: {
  compound_indexes: [
    ['status', 'scheduledFor'], // Process pending notifications
    ['eventId', 'type'], // Event-specific notifications
    ['type', 'status'], // Process by notification type
    ['createdAt'], // Cleanup operations
  ];
}
```

## Interest Optimization System

### Interest Index Subcollections

**Collection**: `studios/{studioId}/interests/{interest}/users/{userId}`

Optimized interest tracking for efficient event-interest matching notifications.

```javascript
{
  // User identification
  userId: string,               // User ID (redundant but useful for queries)
  addedAt: timestamp,           // When user added this interest

  // Optional metadata
  source: string,               // 'event_detail' | 'interests_screen'
  studioId: string              // Studio context (redundant but useful)
}
```

### Interest Index Business Rules

**Dual Storage Architecture**: Interests are stored in BOTH locations for optimal performance:

1. **User Preferences**: `users/{userId}/preferences/interests[]` (existing)
2. **Interest Index**: `studios/{studioId}/interests/{interest}/users/{userId}` (new)

**Atomic Operations**: All interest additions/removals MUST update both locations atomically using writeBatch.

**Interest Normalization**: Interest names are normalized to lowercase for consistent indexing:
- User adds "Basketball" → Index key: "basketball"
- User adds "TENNIS" → Index key: "tennis"

### Interest-Based Event Notifications

When new events are created, the system:

1. **Extract interests** from event title and location (venue name) using `extractInterestsFromEvent()`
2. **Query interest index**: `studios/{studioId}/interests/{interest}/users`
3. **Filter recipients**: Exclude event creator, cohosts, and invited users
4. **Check preferences**: Honor user notification setting `settings.notifications.app.suggestedEvents`
5. **Send notifications**: Use FCM to notify interested users

### Query Patterns

**Find users with specific interest**:
```javascript
collection(db, 'studios', studioId, 'interests', 'basketball', 'users')
```

**Add user to interest index**:
```javascript
doc(db, 'studios', studioId, 'interests', 'basketball', 'users', userId)
```

**Remove user from interest index**:
```javascript
deleteDoc(doc(db, 'studios', studioId, 'interests', 'basketball', 'users', userId))
```

### Performance Benefits

- **O(1) interest lookup** instead of O(n) user scan
- **Direct user lists** for each interest
- **Efficient event notifications** without scanning all studio users
- **Scalable architecture** supporting unlimited users per interest

### Data Consistency Requirements

- **Batch operations mandatory**: All interest changes MUST use writeBatch
- **Dual storage sync**: User preferences and interest index must stay synchronized
- **Atomic transitions**: Adding/removing interests must update both locations atomically
- **Rollback safety**: If batch fails, no partial state changes occur

### Interest Index Indexes Required

```javascript
interestUsers: {
  compound_indexes: [
    ['addedAt'], // Chronological interest additions
    ['source'], // Track interest addition sources
  ];
}
```

## Admin Notification System

### Admin Notifications Collection

**Collection**: `adminNotifications/{notificationId}`

Direct trigger collection for admin and moderation notifications using modern architecture.

```javascript
{
  // Target and identification
  targetUserId: string,             // User to receive notification
  notificationId: string,           // Unique notification ID

  // Notification classification
  type: string,                     // 'ban' | 'warning' | 'strike' | 'announcement' | 'policy' | 'custom'
  subType: string,                  // More specific classification ('temp_ban', 'perm_ban', 'system_announcement', etc.)
  priority: string,                 // 'normal' | 'high' | 'urgent'

  // Content
  title: string,                    // Notification title (max 100 chars)
  message: string,                  // Notification message (max 500 chars)
  additionalInfo: string,           // Optional detailed information

  // Admin metadata
  issuedBy: string,                 // Admin user ID who issued notification
  issuedByName: string,             // Admin display name (cached)
  relatedReport: string,            // Related report ID if applicable

  // Timestamps
  createdAt: timestamp,             // When notification was created
  scheduledFor: timestamp,          // When to send (default: immediate)
  expiresAt: timestamp,             // Optional expiration time

  // Processing status
  processed: boolean,               // Whether notification has been processed
  processedAt: timestamp,           // When notification was processed
  attempts: number,                 // Number of delivery attempts

  // Additional data
  data: {
    // Type-specific data
    banType: string,                // For ban notifications: 'temporary' | 'permanent'
    banDuration: number,            // For temp bans: days
    banReason: string,              // Reason for ban
    strikeCount: number,            // For strike notifications: current strike count
    announcementId: string,         // For announcements: reference ID

    // Navigation data
    screen: string,                 // Screen to navigate to
    params: object,                 // Navigation parameters

    // Notification preferences
    channels: string[],             // ['push', 'in_app']
    requiresAck: boolean,           // Whether user must acknowledge
  }
}
```

### Admin Announcements Collection

**Collection**: `adminAnnouncements/{announcementId}`

Collection for broadcasting announcements to all users.

```javascript
{
  // Announcement content
  title: string,                    // Announcement title
  message: string,                  // Announcement message
  priority: string,                 // 'normal' | 'high' | 'urgent'

  // Admin metadata
  createdBy: string,                // Admin user ID
  createdByName: string,            // Admin display name (cached)
  createdAt: timestamp,             // When announcement was created

  // Broadcasting settings
  targetAudience: string,           // 'all_users' | 'active_users' | 'specific_users'
  targetUserIds: string[],          // If specific users, array of user IDs
  scheduledFor: timestamp,          // When to broadcast (default: immediate)
  expiresAt: timestamp,             // When announcement expires

  // Processing status
  processed: boolean,               // Whether announcement has been processed
  processedAt: timestamp,           // When processing started
  notificationsSent: number,        // Number of notifications sent
  notificationsFailed: number,      // Number of failed notifications

  // Content data
  data: {
    type: 'system' | 'maintenance' | 'feature' | 'policy' | 'emergency',
    actionRequired: boolean,        // Whether users must take action
    actionUrl: string,              // Optional URL for action
    actionLabel: string,            // Label for action button
  }
}
```

### Ban Notification Triggers

Admin notifications are triggered by **moderation record changes**, not separate collections:

**Direct Trigger**: `users/{userId}/moderation` (onUpdate)
- **Detects**: Changes to `bans.tempBans[]` or `bans.permBan`
- **Creates**: Document in `adminNotifications` collection
- **Benefits**: Immediate notification when bans are issued

### Admin Notification Business Rules

**Processing Flow**:
1. **Admin action** → Creates document in `adminNotifications/{notificationId}`
2. **Firebase function** → Triggered by document creation
3. **User validation** → Check notification preferences and user status
4. **FCM delivery** → Send push notification directly
5. **User storage** → Create notification in user's `scheduledNotifications` subcollection
6. **Cleanup** → Mark trigger document as processed or delete

**Notification Preferences**:
- Honors user settings: `users/{userId}/userdata/settings/notifications/app`
- Types: `adminMessages`, `moderationActions`, `systemAnnouncements`
- Banned users still receive ban notifications (cannot be disabled)

**Error Handling**:
- Failed notifications are retried up to 3 times
- Failed delivery logged with reason
- System continues processing other notifications

**Rate Limiting**:
- Max 50 admin notifications per user per day
- Announcement broadcasts processed in batches of 100 users
- Automatic throttling for large broadcasts

### Query Patterns

**Create admin notification**:
```javascript
doc(db, 'adminNotifications', notificationId)
```

**Create announcement broadcast**:
```javascript
doc(db, 'adminAnnouncements', announcementId)
```

**Get user's admin notifications** (existing pattern):
```javascript
doc(db, 'users', userId).adminNotifications
```

### Indexes Required

```javascript
adminNotifications: {
  compound_indexes: [
    ['targetUserId', 'createdAt'],    // User-specific notifications
    ['processed', 'scheduledFor'],    // Processing queue
    ['type', 'priority'],             // Notification management
    ['issuedBy', 'createdAt'],        // Admin audit trail
  ];
}

adminAnnouncements: {
  compound_indexes: [
    ['processed', 'scheduledFor'],    // Processing queue
    ['createdBy', 'createdAt'],       // Admin audit trail
    ['targetAudience', 'priority'],   // Broadcast management
  ];
}
```

### Performance Benefits

- **O(1) notification delivery** - Direct document triggers
- **Batch processing** - Announcements sent in optimized batches
- **Fail-safe operation** - Individual notification failures don't break system
- **Automatic cleanup** - Processed notifications can be auto-deleted
- **Audit trail** - Complete tracking of admin actions

---

## Invite Groups (User Data)

**Location**: `users/{userId}/userdata/inviteGroups`

User-created groups for organizing contacts and quickly inviting multiple people to events. Groups are stored as an array within the user's document.

```javascript
inviteGroups: [
  {
    id: string,           // Client-generated unique ID (e.g., "group_1234567890_abc123")
    name: string,         // Group name (may include emoji at start, e.g., "⛳ Golf Buddies")
    emoji: string,        // Separate emoji field (empty string if emoji is in name)
    description: string,  // Optional group description
    members: string[]     // Array of user IDs who are members of this group
  }
]
```

### Group Structure Notes

- **Storage**: Groups are stored in the user's document, not a separate collection
- **Ownership**: All groups belong to the user who created them
- **Emoji Handling**: Groups can store emoji in two ways:
  1. Separate `emoji` field + plain text `name` (e.g., `emoji: "⛳", name: "Golf Buddies"`)
  2. Emoji in `name` + empty `emoji` field (e.g., `emoji: "", name: "⛳ Golf Buddies"`)
  - This dual approach allows for backward compatibility and user flexibility

### Accessing Groups

**Get User's Groups**:
```javascript
const userRef = doc(db, 'users', userId);
const userDoc = await getDoc(userRef);
const groups = userDoc.data()?.userdata?.inviteGroups || [];
```

### Group Operations

All operations modify the `userdata.inviteGroups` array in the user's document:

- **Create**: Generate client-side ID, append new group to array
- **Update**: Find group by ID, update fields, write back to array
- **Add Member**: Find group, append userId to `members` array
- **Remove Member**: Find group, filter userId from `members` array
- **Delete**: Filter out group from array by ID

### Use Cases

1. **Quick Event Invites**: Select a group to invite all members at once
2. **Contact Organization**: Organize app users into logical groups
3. **Recurring Events**: Maintain consistent invite lists across multiple events
4. **Personal Management**: Groups are private and belong only to the creating user

---

## Venue Database (Studio-Scoped)

**Collection**: `studios/{studioId}/venues/{venueKey}`

Studio-specific venue cache to reduce Google Places API costs. Each studio maintains its own venue database for city-specific locations.

```javascript
{
  // Venue identification
  name: string,              // Official venue name (e.g., "Unity Park")
  address: string,           // Full formatted address from Google Places

  // Verification and source tracking
  source: 'google_place',    // MUST be 'google_place' - only Google Places results are saved
  verified: boolean,         // Always true for Google Places results

  // Usage tracking
  isPublicVenue: boolean,    // Whether venue is public (always true)
  usageCount: number,        // Number of times venue has been used in events

  // Metadata
  createdAt: timestamp       // When venue was first saved to database
}
```

### Venue Safety Rules

**CRITICAL**: Only venues from Google Places API are saved automatically to prevent bad data:

- ✅ **Allowed**: Google Places API results with verified addresses
- ❌ **Rejected**: Manual user input, past event locations without Google verification
- ✅ **Benefit**: All venues in database have Google-verified addresses
- ✅ **Cost Savings**: First event at a venue costs 1 Google API call, all future events are free

### Venue Key Format

Venue keys are normalized for consistent lookups:
- Original: "Unity Park"
- Key: "unity park" (lowercase, trimmed)

### Query Patterns

**Check if venue exists**:
```javascript
const venueDoc = await getDoc(doc(db, 'studios', studioId, 'venues', venueKey));
if (venueDoc.exists()) {
  const address = venueDoc.data().address;
}
```

**Get venue suggestions** (autocomplete):
```javascript
const venuesRef = collection(db, 'studios', studioId, 'venues');
const q = query(
  venuesRef,
  where('name', '>=', searchText),
  where('name', '<=', searchText + '\uf8ff'),
  orderBy('name'),
  limit(5)
);
```

**Increment usage count**:
```javascript
const venueRef = doc(db, 'studios', studioId, 'venues', venueKey);
await updateDoc(venueRef, {
  usageCount: increment(1)
});
```

### Data Flow

1. **User types location** → Check venue database first
2. **Venue not in database** → Call Google Places API
3. **Google Places returns result** → Save to `studios/{studioId}/venues/`
4. **Future users at same location** → Free lookup from venue database

### Performance Benefits

- **O(1) venue lookup** by normalized name
- **Zero API cost** for cached venues
- **Studio-scoped** for city-relevant results
- **Verified addresses only** prevents bad data

---

## Friends' Events Feed & Notifications

### Friends' Events Feed Architecture

**Purpose**: Show users public events their friends are attending or hosting, even if the user isn't invited.

**Feed Logic**:
1. Query all user's friends from `users/{userId}/friends/{friendId}`
2. Find public events where friends are in `subscribers[]` or `cohosts[]` arrays
3. Exclude events the current user is already attending
4. Filter out events with past RSVP deadlines
5. Sort by event date (ascending)

**Query Pattern**:
```javascript
// Get friend IDs
const friendsSnapshot = await getDocs(collection(db, 'users', userId, 'friends'));
const friendIds = friendsSnapshot.docs.map(doc => doc.id);

// Query events where friends are participants
// Split into batches of 10 for Firestore 'array-contains-any' limit
for (const friendBatch of batches) {
  const eventsQuery = query(
    collection(db, 'studios', studioId, 'events'),
    where('isPrivate', '==', false),
    where('eventTimestamp', '>=', now),
    orderBy('eventTimestamp', 'asc')
  );
  // Filter in-memory: event.subscribers includes any friendId
  // OR event.cohosts includes any friendId
  // OR event.createdBy is a friendId
}
```

### Friend Event Activity Notifications

**Notification Type**: `FRIEND_EVENT_ACTIVITY`

**Trigger Conditions**:
- Friend joins a public event as guest (added to `subscribers[]`)
- Friend joins a public event as cohost (added to `cohosts[]`)
- Friend creates a new public event (becomes `createdBy`)

**Notification Settings Check**:
1. Check `userdata.settings.notifications.app.friendEventActivity` (global toggle)
2. Check `userdata.settings.notifications.mutedFriendsEvents[]` (per-friend muting)
3. Only send if both checks pass

**Notification Content**:
```javascript
{
  type: 'FRIEND_EVENT_ACTIVITY',
  title: '{FriendName} is going to an event',
  body: '{FriendName} joined "{EventTitle}" on {EventDate}',
  data: {
    eventId: string,
    studioId: string,
    friendId: string,
    friendName: string,
    activityType: 'joined' | 'created' | 'cohosting'
  }
}
```

**Cloud Function Implementation**:
```javascript
// Pseudo-code for Cloud Function trigger
exports.onEventParticipantAdded = functions.firestore
  .document('studios/{studioId}/events/{eventId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Detect new subscribers or cohosts
    const newSubscribers = after.subscribers.filter(id => !before.subscribers.includes(id));
    const newCohosts = after.cohosts.filter(id => !before.cohosts.includes(id));

    // For each new participant
    for (const participantId of [...newSubscribers, ...newCohosts]) {
      // Find users who have this participant as a friend
      const friendsOfParticipant = await getFriendsOf(participantId);

      // Send notifications to each friend
      for (const friendUserId of friendsOfParticipant) {
        // Check notification settings
        const friendSettings = await getUserSettings(friendUserId);

        // Skip if global toggle is off
        if (!friendSettings.notifications.app.friendEventActivity) continue;

        // Skip if friend is muted for event activity
        if (friendSettings.notifications.mutedFriendsEvents?.includes(participantId)) continue;

        // Skip if friend is already attending this event
        if (after.subscribers.includes(friendUserId) || after.cohosts.includes(friendUserId)) continue;

        // Send notification
        await sendFriendEventNotification({
          recipientId: friendUserId,
          friendId: participantId,
          eventId: context.params.eventId,
          activityType: newSubscribers.includes(participantId) ? 'joined' : 'cohosting'
        });
      }
    }
  });
```

### Per-Friend Notification Muting

**Storage**: `users/{userId}/userdata/settings/notifications/mutedFriendsEvents: string[]`

**Purpose**: Allow users to mute event activity notifications from specific friends without unfriending them.

**Usage**:
- User still sees friend's events in Friends' Events feed
- User does NOT receive push notifications when that friend joins/creates events
- Muting is one-way (doesn't affect the friend's notifications)

**Management UI** (Future Implementation):
- Toggle in friend profile: "Mute event activity notifications"
- Bulk management in notification settings: List of muted friends with unmute buttons

**Query Pattern**:
```javascript
// Check if notification should be sent
const userSettings = await getDoc(doc(db, 'users', userId));
const mutedFriends = userSettings.data()?.userdata?.settings?.notifications?.mutedFriendsEvents || [];

if (mutedFriends.includes(friendId)) {
  // Skip notification
  return;
}
```

### Business Rules

1. **Public Events Only**: Only public events (`isPrivate: false`) appear in Friends' Events feed
2. **Exclude Current User**: Don't show events the user is already attending
3. **Friend Relationship Required**: Must be mutual friends (both users have each other in friends subcollection)
4. **No Self-Notifications**: Users don't receive notifications about their own event activity
5. **RSVP Deadline Filtering**: Events with past RSVP deadlines are hidden from discovery feeds
6. **Default Settings**: New users have `friendEventActivity: true` by default (opt-out model)

### Performance Optimizations

1. **Batch Friend Queries**: Use `array-contains-any` with batches of 10 friend IDs
2. **In-Memory Filtering**: Pre-filter excluded events before returning to client
3. **Cached Friend Lists**: Consider caching friend IDs in user document for faster lookups
4. **Indexed Queries**: Ensure compound indexes on `isPrivate` + `eventTimestamp` + `subscribers`

### Privacy Considerations

1. **Respect Event Privacy**: Private events never appear in feed or trigger notifications
2. **Friend-Only Visibility**: Only mutual friends see each other's public event activity
3. **Granular Control**: Users can disable feature entirely or mute specific friends
4. **No Activity Tracking**: System doesn't track who views the feed or notifications
