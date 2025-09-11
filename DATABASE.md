# DATABASE.md

This document defines the Firestore database schema for the Big Vibe Studios notification system.

## Notification System Database Schema

### User Device Information
**Collection**: `users/{userId}/deviceInfo`

```javascript
{
  fcmToken: string,              // Firebase Cloud Messaging token
  platform: string,             // "ios" | "android"
  lastTokenUpdate: timestamp,    // When token was last updated
  notificationsEnabled: boolean  // Whether notifications are enabled for this device
}
```

**Indexes Required**:
- Single field: `fcmToken` (for efficient token lookups)

### User Notification Preferences
**Collection**: `users/{userId}/userdata/settings/notifications`

```javascript
{
  app: {
    pushNotifications: boolean,    // Master push notification toggle
    emailNotifications: boolean,   // Email notifications toggle
    friendAdded: boolean,          // Friend request notifications
    friendFollowed: boolean,       // Friend acceptance notifications
    systemUpdates: boolean,        // System/app update notifications
    quietHours: boolean           // Respect quiet hours
  },
  hosting: {
    enabled: boolean,             // Host notifications enabled
    notifyOnJoin: boolean,        // New attendee notifications
    notifyOnLeave: boolean,       // Attendee leaving notifications
    newComments: boolean,         // Comment notifications
    reminderTiming: string        // "1hour" | "4hours" | "1day" | "custom"
  },
  attending: {
    enabled: boolean,             // Attendee notifications enabled
    hostChanges: boolean,         // Host change notifications
    eventReminders: boolean,      // Event reminder notifications
    reminderTiming: string        // "15min" | "1hour" | "1day" | "custom"
  }
}
```

### User Notifications
**Collection**: `users/{userId}/notifications/{notificationId}`

```javascript
{
  id: string,                    // Auto-generated notification ID
  type: string,                  // Notification type (see NOTIFICATION_TYPES)
  title: string,                 // Notification title
  message: string,               // Notification body text
  read: boolean,                 // Read status (default: false)
  createdAt: timestamp,          // Creation timestamp
  data: object,                  // Additional data payload
  priority: string,              // "low" | "normal" | "high"
  channels: string[],            // ["push", "email", "sms"]
  deliveryStatus: {
    push: "pending" | "sent" | "failed",
    email: "pending" | "sent" | "failed",
    sms: "pending" | "sent" | "failed"
  },
  expirationDate?: timestamp,    // Optional expiration
  actionButtons?: object[]       // Optional action buttons
}
```

**Indexes Required**:
- Composite: `(read, createdAt desc)` for efficient unread queries
- Single field: `createdAt desc` for timeline queries
- Single field: `type` for filtering by notification type

### Scheduled Notifications
**Collection**: `scheduledNotifications/{scheduleId}`

```javascript
{
  id: string,                    // Auto-generated schedule ID
  userId: string,                // Target user ID
  eventId?: string,              // Related event ID (optional)
  type: string,                  // Notification type
  title: string,                 // Notification title
  message: string,               // Notification message
  data: object,                  // Additional data payload
  scheduledFor: timestamp,       // When to send the notification
  createdAt: timestamp,          // When scheduled was created
  status: string,                // "pending" | "sent" | "cancelled" | "failed"
  attempts: number,              // Number of delivery attempts
  lastAttemptAt?: timestamp,     // Last attempt timestamp
  sentAt?: timestamp,            // When successfully sent
  cancelledAt?: timestamp,       // When cancelled
  cancelReason?: string,         // Reason for cancellation
  failureReason?: string,        // Reason for failure
  priority: string,              // "low" | "normal" | "high"
  channels: string[]             // Delivery channels
}
```

**Indexes Required**:
- Composite: `(status, scheduledFor asc)` for processing pending notifications
- Single field: `userId` for user-specific queries
- Single field: `eventId` for event-specific queries
- Single field: `createdAt desc` for cleanup operations

### Notification Triggers (Cloud Functions)
**Collection**: `notificationTriggers/{triggerId}`

```javascript
{
  id: string,                    // Auto-generated trigger ID
  type: string,                  // "comment" | "admin_notification" | "client_push_notification" | etc.
  processed: boolean,            // Processing status
  processedAt?: timestamp,       // When processed
  createdAt: timestamp,          // Creation timestamp
  
  // Type-specific data
  // For comment triggers:
  hostId?: string,
  eventId?: string,
  comment?: object,
  commenter?: object,
  eventTitle?: string,
  isFirstComment?: boolean,
  
  // For admin/push triggers:
  userId?: string,
  title?: string,
  message?: string,
  data?: object,
  priority?: string,
  fcmToken?: string
}
```

**Indexes Required**:
- Composite: `(type, processed, createdAt asc)` for efficient processing
- Single field: `processed` for querying unprocessed triggers

### Event Reminders
**Collection**: `reminders/{reminderId}`

```javascript
{
  id: string,                    // Auto-generated reminder ID
  userId: string,                // Target user ID
  eventId: string,               // Related event ID
  eventTitle: string,            // Event title (cached)
  eventDateTime: timestamp,      // Event start time
  reminderTime: timestamp,       // When to send reminder
  reminderType: string,          // "15min" | "1hour" | "1day" | "custom"
  customAmount?: number,         // Custom reminder amount
  customUnit?: string,           // "minutes" | "hours" | "days"
  isHost: boolean,               // Whether user is the host
  sent: boolean,                 // Whether reminder was sent
  sentAt?: timestamp,            // When reminder was sent
  createdAt: timestamp           // Creation timestamp
}
```

**Indexes Required**:
- Composite: `(sent, reminderTime asc)` for processing due reminders
- Single field: `userId` for user-specific reminders
- Single field: `eventId` for event cleanup
- Composite: `(eventDateTime, sent)` for cleanup operations

### Admin Notifications
**Collection**: `users/{userId}/adminNotifications`

```javascript
{
  notifications: [
    {
      id: string,
      type: string,              // "warning" | "strike" | "message" | etc.
      title: string,
      message: string,
      severity: string,          // "low" | "medium" | "high" | "urgent"
      read: boolean,
      createdAt: timestamp,
      data: object
    }
  ],
  stats: {
    totalNotifications: number,
    unreadCount: number,
    lastUpdated: timestamp
  }
}
```

## Notification Types

### Core Notification Types
```javascript
const NOTIFICATION_TYPES = {
  // Event-related
  EVENT_REMINDER: 'event_reminder',
  EVENT_JOIN: 'event_join',
  EVENT_LEAVE: 'event_leave',
  EVENT_UPDATE: 'event_update',
  EVENT_CANCELLED: 'event_cancelled',
  
  // Comments
  NEW_COMMENT: 'new_comment',
  COMMENT_REPLY: 'comment_reply',
  
  // Social
  FRIEND_REQUEST: 'friend_request',
  FRIEND_ACCEPTED: 'friend_accepted',
  
  // Admin
  ADMIN_WARNING: 'admin_warning',
  ADMIN_STRIKE: 'admin_strike',
  ADMIN_MESSAGE: 'admin_message',
  USER_BANNED: 'user_banned',
  
  // System
  SYSTEM_UPDATE: 'system_update',
  MAINTENANCE: 'maintenance'
};
```

### Notification Priorities
```javascript
const NOTIFICATION_PRIORITY = {
  LOW: 'low',        // Background processing, no sound
  NORMAL: 'normal',  // Standard notifications
  HIGH: 'high'       // Urgent notifications with sound
};
```

### Delivery Channels
```javascript
const DELIVERY_CHANNELS = {
  PUSH: 'push',      // Firebase Cloud Messaging
  EMAIL: 'email',    // Email notifications (future)
  SMS: 'sms'         // SMS notifications (future)
};
```

## Data Validation Rules

### Required Fields
- All notification documents must have: `id`, `type`, `title`, `message`, `createdAt`
- FCM tokens must be non-empty strings
- User IDs must follow Firebase Auth UID format
- Timestamps must be valid Firestore Timestamp objects

### Field Constraints
- `title`: max 100 characters
- `message`: max 500 characters
- `type`: must be from NOTIFICATION_TYPES enum
- `priority`: must be from NOTIFICATION_PRIORITY enum
- `channels`: array of DELIVERY_CHANNELS values

### Data Integrity
- Scheduled notifications with `eventId` must reference valid events
- User notifications must belong to existing users
- Reminder notifications must have future `reminderTime`
- Processed triggers should be cleaned up within 24 hours

## Performance Guidelines

### Query Optimization
- Always use limits when querying notification collections
- Use composite indexes for complex queries
- Avoid real-time listeners on large collections
- Implement pagination for notification lists

### Storage Efficiency
- Clean up old notifications (>30 days) regularly
- Remove processed triggers within 1 hour
- Archive old admin notifications
- Compress large notification data payloads

### Background Processing
- Use Cloud Functions for all scheduled processing
- Batch notification operations when possible
- Implement retry logic for failed deliveries
- Monitor Cloud Function execution times and costs

## Security Rules

```javascript
// Example Firestore security rules for notifications
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User notifications - users can only access their own
    match /users/{userId}/notifications/{notificationId} {
      allow read, write: if request.auth != null 
        && request.auth.uid == userId;
    }
    
    // Scheduled notifications - read-only for users
    match /scheduledNotifications/{scheduleId} {
      allow read: if request.auth != null 
        && resource.data.userId == request.auth.uid;
      allow write: if false; // Only Cloud Functions can write
    }
    
    // Notification triggers - Cloud Functions only
    match /notificationTriggers/{triggerId} {
      allow read, write: if false; // Cloud Functions only
    }
  }
}
```

## Cloud Function Integration

### Scheduled Functions
- `processScheduledNotifications`: Runs every 2 minutes
- `sendEventReminders`: Runs every 5 minutes  
- `cleanupReminders`: Runs daily at 2 AM UTC
- `cleanupOldNotifications`: Runs weekly

### Trigger Functions
- `onCommentNotificationTrigger`: Comment notifications
- `onClientPushNotificationTrigger`: Client-side push notifications
- `onAdminNotificationTrigger`: Admin notifications
- `onBanNotificationTrigger`: Ban notifications

### Processing Guidelines
- Mark triggers as processed immediately
- Clean up processed triggers after 1 minute
- Batch operations when possible
- Implement proper error handling and logging

## User Reliability and Metrics Schema

### User Event Metrics
**Collection**: `users/{userId}/userdata/metrics/events`

```javascript
{
  created: number,                 // Number of events created by user
  joined: number,                  // Number of events joined/subscribed to
  attended: number,                // Number of events actually attended
  noShows: number,                 // Number of no-shows
  subscribedEvents: string[],      // Array of event IDs user is subscribed to
  attendedEvents: string[],        // Array of event IDs user attended
  noShowEvents: string[],          // Array of event IDs user no-showed
  lastEventCreated: timestamp,     // When user last created an event
  lastEventAttended: timestamp,    // When user last attended an event
  lastActivity: timestamp          // Last event-related activity
}
```

### User Reliability Data
**Collection**: `users/{userId}/userdata/metrics/reliability`

```javascript
{
  score: number,                   // Reliability score (0-100)
  tier: string,                    // "Excellent" | "Good" | "Fair" | "Poor" | "Unreliable"
  metrics: {
    totalRSVPs: number,           // Total events RSVP'd to
    totalAttended: number,        // Total events attended
    totalNoShows: number,         // Total no-shows
    lastMinuteCancellations: number, // Last-minute cancellations
    recentEvents: number,         // Recent events (last 30 days)
    recentAttended: number,       // Recent events attended
    attendanceRate: number,       // Overall attendance rate (0-100)
    recentAttendanceRate: number  // Recent attendance rate (0-100)
  },
  streaks: {
    currentAttendanceStreak: number,    // Current consecutive attendance streak
    longestAttendanceStreak: number,    // Longest attendance streak achieved
    currentNoShowStreak: number         // Current consecutive no-show streak
  },
  lastUpdated: timestamp          // When reliability was last calculated
}
```

### User Hosting Metrics
**Collection**: `users/{userId}/userdata/metrics/hosting`

```javascript
{
  eventsCompleted: number,        // Number of events hosted and completed
  averageAttendees: number,       // Average number of attendees per event
  totalAttendees: number,         // Total attendees across all hosted events
  lastEventCompleted: timestamp   // When last event was completed
}
```

### Event Attendance Records
**Collection**: `studios/{studioId}/events/{eventId}` - attendance field

**Note**: Event data is stored in studio-specific collections (`studios/{studioId}/events`), not in a root-level `events` collection. All reliability calculations and queries must use the studio-specific path.

```javascript
{
  attendance: [
    {
      userId: string,             // User ID
      attended: boolean,          // Whether user attended
      isHost: boolean,           // Whether this user was the host
      markedBy: string,          // User ID who marked attendance
      markedAt: timestamp,       // When attendance was marked
      selfReported?: boolean,    // If user self-reported attendance
      isSoloEvent?: boolean      // If this was a solo event (no metrics impact)
    }
  ],
  attendanceCount: number       // Count of users who attended
}
```

**Indexes Required for Reliability Data**:
- Single field: `lastUpdated` for cache management
- Single field: `score` for reliability queries
- Composite: `(tier, score desc)` for ranking queries

**Data Validation Rules for Reliability**:
- `score`: must be number between 0-100
- `tier`: must be one of valid tier labels
- `streaks`: all streak values must be non-negative integers
- `metrics.attendanceRate` and `metrics.recentAttendanceRate`: must be 0-100
- `lastUpdated`: must be valid Firestore timestamp

**Performance Guidelines for Reliability**:
- Cache reliability calculations for 1 hour to avoid excessive recalculation
- Update reliability scores after event completion, not in real-time
- Use fallback values for new users without event history
- Clean up old reliability data periodically (>6 months)

---

*This schema is maintained by the notification system cleanup and should be updated when notification data structures change.*