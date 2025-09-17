# scheduledNotifications Collection Documentation

## Overview
The `scheduledNotifications` collection serves as a **time-based notification scheduling system**. Unlike `notificationTriggers` which send immediate notifications, this collection stores notifications that should be sent at specific future times (like event reminders). A Cloud Function runs every minute to check for due notifications and converts them into immediate notification triggers.

## Collection Path
```
scheduledNotifications/{scheduleId}
```

## Document Schema
```javascript
{
  // Identification
  id: string,                      // Schedule ID (same as document ID)
  userId: string,                  // Target user ID for notification

  // Event relationship (optional)
  eventId: string,                 // Related event ID (for event reminders)
  studioId: string,                // Studio context (optional)
  eventTitle: string,              // Cached event title (sanitized)
  eventDateTime: timestamp,        // Original event time (for attendee notifications)

  // Notification classification
  type: string,                    // 'event_reminder', 'event_starting_soon', etc.
  priority: string,                // 'low' | 'normal' | 'high' | 'urgent'
  channels: string[],              // ['push', 'email', etc.]

  // Scheduling
  scheduledFor: timestamp,         // CRITICAL: When to send notification

  // Notification content
  title: string,                   // Notification title (max 100 chars)
  message: string,                 // Notification message (max 200 chars)
  data: object,                    // Additional notification data

  // Status tracking
  status: string,                  // 'pending' | 'sent' | 'failed' | 'cancelled' | 'expired'
  attempts: number,                // Failed delivery attempts (max 3)
  lastAttemptAt: timestamp,        // Last attempt timestamp
  sentAt: timestamp,               // When notification was sent
  error: string,                   // Last error message

  // Metadata
  createdAt: timestamp,            // When scheduled notification was created
  updatedAt: timestamp             // Last update timestamp
}
```

## What Posts to scheduledNotifications

### 1. ScheduledNotificationCore (Primary Scheduler)
**File**: `src/services/scheduled/scheduledNotificationCore.js`
**Purpose**: Core scheduling service for all time-based notifications
**Method**: `scheduleNotification()` at line 38

```javascript
// Creates scheduled notification documents
const scheduleId = `sched_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const scheduledNotificationRef = doc(db, 'scheduledNotifications', scheduleId);

await setDoc(scheduledNotificationRef, {
  id: scheduleId,
  userId,
  eventId,
  type,
  title,
  message,
  data,
  scheduledFor: Timestamp.fromDate(scheduledFor),
  createdAt: Timestamp.now(),
  status: 'pending',
  attempts: 0,
  priority,
  channels,
});
```

### 2. Event Subscription Service
**File**: `src/events/services/shared/eventSubscriptionService.js`
**Purpose**: Schedules event reminder notifications when users subscribe to events
**Triggers**: When users join events or when events are created

### 3. ScheduledNotificationService
**File**: `src/services/scheduledNotifications.js`
**Purpose**: High-level service wrapper for event-related notification scheduling
**Key Methods**:
- `scheduleEventRemindersWithCustomTemplates()`
- `scheduleDefaultEventReminders()`

```javascript
// Example: Schedule 24h, 1h, and 15m reminders
const reminderTimes = [
  { hours: 24, type: '24h' },
  { hours: 1, type: '1h' },
  { minutes: 15, type: '15m' }
];
```

### 4. Event Notification Scheduler
**File**: `src/services/eventNotificationScheduler.js`
**Purpose**: Event-driven notification scheduling (create/update/cancel events)
**Methods**:
- `scheduleEventReminders()` - When events are created
- `rescheduleEventReminders()` - When event times change
- `cancelEventReminders()` - When events are cancelled

## What Reads scheduledNotifications

### Cloud Function: Scheduled Notification Processor
**File**: `functions/notifications/scheduledNotificationProcessor.js`
**Trigger**: Runs **every 1 minute** via Cloud Scheduler
**Purpose**: Processes pending notifications that are due for delivery

#### Processing Logic:
```javascript
// 1. Query for due notifications
const scheduledNotificationsSnapshot = await admin
  .firestore()
  .collection('scheduledNotifications')
  .where('status', '==', 'pending')
  .where('scheduledFor', '<=', admin.firestore.Timestamp.fromDate(now))
  .limit(100) // Process max 100 per run
  .get();

// 2. For each due notification:
//    a. Create trigger in notificationTriggers collection
//    b. Mark scheduled notification as 'sent'
//    c. Handle errors with retry logic (max 3 attempts)
```

#### Conversion Process:
1. **Finds due notifications**: `scheduledFor <= current_time`
2. **Creates trigger document**: In `notificationTriggers` collection
3. **Updates status**: Marks as `'sent'` or `'failed'`
4. **Error handling**: Retries up to 3 times before marking as failed

### Admin Tools and Debugging
**File**: `src\hooks\useScheduledNotifications.js`
**Purpose**: Hook for viewing/managing scheduled notifications in admin interfaces

## What It's Used For

### Event Reminder System
The primary use case is **automatic event reminder notifications**:

#### Default Event Reminder Schedule:
1. **24 hours before event**: "Reminder: [Event Title] is tomorrow at [time]"
2. **1 hour before event**: "Reminder: [Event Title] starts in 1 hour"
3. **15 minutes before event**: "Reminder: [Event Title] starts in 15 minutes"

#### Custom Reminder Templates:
Users can create custom reminder schedules with different timing and messages.

### Event Lifecycle Notifications
- **Event Updates**: When event details change, reschedule reminders
- **Event Cancellation**: Cancel all pending reminders
- **New Subscriptions**: Schedule reminders for newly subscribed users

### Future Use Cases
The system is designed to support:
- **Social notifications**: Follow-up messages, friend anniversary reminders
- **System notifications**: Account expiration warnings, feature announcements
- **Marketing notifications**: Promotional campaigns, re-engagement messages

## What Cleans Up scheduledNotifications

### Automatic Status Updates (Primary Cleanup)
**Mechanism**: Cloud Function updates document status instead of deleting
**Process**:
1. **Successful delivery**: Status changed to `'sent'` with `sentAt` timestamp
2. **Failed delivery**: Status changed to `'failed'` after 3 attempts with error message
3. **Event cancellation**: Status changed to `'cancelled'`
4. **Past due**: Status changed to `'expired'` for very old notifications

### Retention Policy (Implementation Needed)
**Current State**: Documents remain indefinitely with status updates
**Recommended**: Implement cleanup for old documents (30+ days old)

```javascript
// Future cleanup logic (not implemented):
collection(db, 'scheduledNotifications')
  .where('status', 'in', ['sent', 'failed', 'cancelled', 'expired'])
  .where('createdAt', '<', thirtyDaysAgo)
  .limit(100)
// Batch delete these documents
```

### Manual Cleanup Methods
Available through service methods:

#### Cancel Event Notifications:
```javascript
// In ScheduledNotificationService
async cancelEventNotifications(eventId, reason) {
  // Updates all pending notifications for an event to 'cancelled'
}
```

#### Bulk Cancellation:
```javascript
// Updates multiple notifications to cancelled status
// Does not delete documents, just changes status
```

## Data Flow Diagram

```
Event Created/User Subscribes
    ↓
ScheduledNotificationCore.scheduleNotification()
    ↓
Document created in scheduledNotifications/ (status: 'pending')
    ↓
Time passes...
    ↓
Cloud Scheduler runs scheduledNotificationProcessor (every minute)
    ↓
Query for due notifications (scheduledFor <= now)
    ↓
Create trigger in notificationTriggers/ collection
    ↓
Update scheduled notification (status: 'sent')
    ↓
notificationTriggers/ processed by FCM Cloud Functions
    ↓
User receives push notification
```

## Scheduling Examples

### Basic Event Reminder:
```javascript
await ScheduledNotificationCore.scheduleNotification({
  userId: 'user123',
  eventId: 'event456',
  type: 'event_reminder',
  title: 'Event Reminder',
  message: 'Your event "Beach Volleyball" starts in 1 hour',
  scheduledFor: new Date('2024-01-15T14:00:00Z'), // 1 hour before event
  data: {
    eventId: 'event456',
    reminderType: '1h',
    eventTitle: 'Beach Volleyball'
  }
});
```

### Multiple Reminders for Event:
```javascript
const eventTime = new Date('2024-01-15T15:00:00Z');
const reminders = [
  { offset: 24 * 60 * 60 * 1000, type: '24h' }, // 24 hours
  { offset: 60 * 60 * 1000, type: '1h' },       // 1 hour
  { offset: 15 * 60 * 1000, type: '15m' }       // 15 minutes
];

for (const reminder of reminders) {
  const scheduledFor = new Date(eventTime.getTime() - reminder.offset);
  await ScheduledNotificationCore.scheduleNotification({
    // ... notification details
    scheduledFor,
    data: { reminderType: reminder.type }
  });
}
```

## Status Transitions

### Normal Flow:
```
'pending' → 'sent' (successful delivery)
```

### Error Flow:
```
'pending' → 'pending' (retry attempt 1)
'pending' → 'pending' (retry attempt 2)
'pending' → 'failed' (after 3 attempts)
```

### Cancellation Flow:
```
'pending' → 'cancelled' (event cancelled or user unsubscribed)
```

### Expiration Flow:
```
'pending' → 'expired' (notification too old to be relevant)
```

## Performance Considerations

### Scalability Design
**Global Collection**: Uses single global collection instead of user subcollections
- **Pro**: Efficient querying across all users for due notifications
- **Pro**: Simple Cloud Function implementation
- **Con**: Single collection to manage (but Firebase can handle millions of documents)

### Query Optimization
**Compound Index Required**:
```javascript
// Firestore index needed for efficient queries:
{
  collection: 'scheduledNotifications',
  fields: [
    { field: 'status', order: 'asc' },
    { field: 'scheduledFor', order: 'asc' }
  ]
}
```

### Processing Limits
- **Batch Size**: 100 notifications per minute (prevents timeouts)
- **Retry Logic**: Max 3 attempts per notification
- **Rate Limiting**: Inherits from NotificationEngine (50 notifications per user per day)

## Error Handling

### Common Error Scenarios:

#### 1. User Not Found:
```javascript
{
  status: 'failed',
  error: 'User not found',
  attempts: 1
}
```

#### 2. Event No Longer Exists:
```javascript
{
  status: 'failed',
  error: 'Event not found',
  attempts: 1
}
```

#### 3. FCM Token Missing:
```javascript
{
  status: 'failed',
  error: 'No FCM token',
  attempts: 3
}
```

### Retry Logic:
- **Immediate retry**: For transient errors (network issues)
- **Progressive backoff**: Each attempt waits longer
- **Final failure**: After 3 attempts, mark as `'failed'`

## Security Considerations

### Access Control
- **User-scoped**: Each notification belongs to a specific user
- **Event validation**: Ensures user is still subscribed to event
- **Content sanitization**: All content is sanitized before storage

### Data Privacy
- **Cached titles**: Event titles are cached to avoid additional queries
- **Minimal data**: Only necessary information is stored
- **Retention**: Old notifications should be cleaned up for privacy

## Monitoring and Debugging

### Useful Queries

**Get pending notifications**:
```javascript
collection(db, 'scheduledNotifications')
  .where('status', '==', 'pending')
  .orderBy('scheduledFor', 'asc')
  .limit(50)
```

**Get due notifications (for manual testing)**:
```javascript
collection(db, 'scheduledNotifications')
  .where('status', '==', 'pending')
  .where('scheduledFor', '<=', Timestamp.now())
  .limit(10)
```

**Get failed notifications**:
```javascript
collection(db, 'scheduledNotifications')
  .where('status', '==', 'failed')
  .orderBy('createdAt', 'desc')
  .limit(20)
```

**Get notifications for specific event**:
```javascript
collection(db, 'scheduledNotifications')
  .where('eventId', '==', targetEventId)
  .orderBy('scheduledFor', 'asc')
```

**Get user's scheduled notifications**:
```javascript
collection(db, 'scheduledNotifications')
  .where('userId', '==', targetUserId)
  .where('status', '==', 'pending')
  .orderBy('scheduledFor', 'asc')
```

### Cloud Function Monitoring
**Function Name**: `processScheduledNotifications`
**Schedule**: Every 1 minute
**Logs Location**: Firebase Console → Functions → Logs
**Success Pattern**: "✅ Processed notification"
**Error Pattern**: "❌ Failed to process notification"

### Health Checks
Monitor these metrics:
- **Processing rate**: How many notifications processed per minute
- **Error rate**: Percentage of failed notifications
- **Backlog size**: Number of overdue pending notifications
- **Retry rate**: How often notifications need retries

## Maintenance Tasks

### Regular Monitoring:
1. Check for notifications stuck in `'pending'` status
2. Monitor error rates and common failure reasons
3. Verify Cloud Function is running every minute
4. Check for orphaned notifications (events that no longer exist)

### Cleanup Tasks:
1. **Old sent notifications**: Remove notifications older than 30 days
2. **Cancelled events**: Clean up notifications for deleted events
3. **Inactive users**: Remove notifications for banned/deleted users
4. **Expired notifications**: Mark very old pending notifications as expired

### Performance Optimization:
1. Monitor query performance with large datasets
2. Consider partitioning by date if collection grows very large
3. Optimize indexes based on actual query patterns
4. Consider archival strategies for long-term storage