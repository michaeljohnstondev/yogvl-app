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
      engagement: object,     // User engagement metrics
      events: object,         // Event participation metrics
      social: object          // Social interaction metrics
    },

    // User settings and preferences
    settings: {
      accessibility: object,  // Accessibility preferences
      display: object,        // Display preferences
      notifications: object,  // Notification settings
      preferences: object,    // General preferences
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

  // NEW: Invitation tracking (from recent implementation)
  invitations: string[],      // Array of user IDs with pending invitations

  // Event settings
  maxGuests: number,          // Maximum number of guests allowed
  isPrivate: boolean,         // Whether event is private
  active: boolean,            // Whether event is active

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
  // Invitation state arrays (user IDs only)
  invitations: string[],     // User IDs with pending invitations
  subscribers: string[],     // User IDs who accepted invitations or subscribed directly
  cohosts: string[],        // User IDs who are event cohosts

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
    // Event participation arrays
    pendingInvitations: string[],    // Event IDs user has pending invitations for
    subscribedEvents: string[],      // Event IDs user is subscribed to

    // Existing user data...
    contactInfo: { ... },
    studios: { ... }
  }
}
```

### Invitation State Transitions (Atomic Batch Operations)

1. **Send Invitation**:
   - Add user ID to `event.invitations[]`
   - Add event ID to `user.userdata.pendingInvitations[]`

2. **Accept Invitation**:
   - Move user ID from `event.invitations[]` to `event.subscribers[]`
   - Move event ID from `user.userdata.pendingInvitations[]` to `user.userdata.subscribedEvents[]`

3. **Decline Invitation**:
   - Remove user ID from `event.invitations[]`
   - Remove event ID from `user.userdata.pendingInvitations[]`

### Invitation Filtering Logic

```javascript
// To filter users for invitations:
const eventData = await getDoc(eventRef);
const invited = eventData.invitations || [];
const subscribed = eventData.subscribers || [];
const cohosts = eventData.cohosts || [];
const hostId = eventData.createdBy;

const availableUsers = allUsers.filter(user =>
  user.id !== hostId &&
  !invited.includes(user.id) &&
  !subscribed.includes(user.id) &&
  !cohosts.includes(user.id)
);
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

1. **User display names** are stored in `userdata.contactInfo.displayName` - NOT at the top level
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

## User Subcollections

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

```javascript
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
```

### Notification Templates
**Collection**: `users/{userId}/notificationTemplates/{templateId}`

User-customizable notification templates and preferences.

## Unified Notification System Architecture

### Host Notifications
**Purpose**: Real-time notifications FOR hosts ABOUT their events
**Triggers**:
- Attendee joins event (`NOTIFICATION_TYPES.EVENT_JOIN`)
- Attendee leaves event (`NOTIFICATION_TYPES.EVENT_LEAVE`)
- Event details updated (`NOTIFICATION_TYPES.EVENT_UPDATE`)
- Event cancelled (`NOTIFICATION_TYPES.EVENT_CANCELLED`)

**Processing**: Immediate notification via NotificationEngine
**Storage**: `users/{hostId}/notifications/{notificationId}`

### Scheduled Event Notifications (formerly "Attendee Reminders")
**Purpose**: Time-based notifications FOR attendees ABOUT upcoming events
**Triggers**:
- 24 hours before event
- 1 hour before event
- 15 minutes before event

**Processing**: Scheduled via Cloud Functions with time-based triggers

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

### Migration Strategy
- **Dual-write period**: Write to both old and new systems during transition
- **Background migration**: Move existing notifications to user subcollections
- **Validation period**: Ensure data consistency
- **Cutover**: Switch to new user-scoped system exclusively
- **Cleanup**: Remove old global collections

### Query Patterns

**Get user's pending notifications**:
```javascript
collection(db, 'users', userId, 'scheduledNotifications')
  .where('status', '==', 'pending')
  .orderBy('scheduledFor', 'asc')
```

**Get notifications for specific event**:
```javascript
collection(db, 'users', userId, 'scheduledNotifications')
  .where('eventId', '==', eventId)
  .orderBy('createdAt', 'desc')
```

**Get due notifications for processing**:
```javascript
collection(db, 'users', userId, 'scheduledNotifications')
  .where('status', '==', 'pending')
  .where('scheduledFor', '<=', now)
  .limit(50)
```

### Indexes Required

```javascript
scheduledNotifications: {
  compound_indexes: [
    ['status', 'scheduledFor'],            // Process pending notifications
    ['eventId', 'type'],                   // Event-specific notifications
    ['type', 'status'],                    // Process by notification type
    ['createdAt']                          // Cleanup operations
  ]
}
```