# notificationTriggers Collection Documentation

## Overview
The `notificationTriggers` collection serves as a **trigger system for immediate FCM push notifications**. When documents are created in this collection, they automatically trigger Cloud Functions that send Firebase Cloud Messaging (FCM) push notifications to specific users.

## Collection Path
```
notificationTriggers/{triggerId}
```

## Document Schema
```javascript
{
  // Trigger identification
  type: string,                    // 'admin_notification' | 'engine_notification' | 'follow_notification' | 'friend_request'
  subType: string,                 // Additional categorization (e.g., 'general', 'event_join', 'ban_notification')

  // Target user
  userId: string,                  // Target user ID for notification

  // Notification content
  title: string,                   // Notification title (max 100 chars)
  message: string,                 // Notification body/message
  data: object,                    // Additional data payload (all values must be strings for FCM)

  // Delivery settings
  priority: string,                // 'normal' | 'high' (maps to FCM priority)

  // Processing status
  processed: boolean,              // false initially, set to true after processing
  sentAt: timestamp,               // When notification was sent (set by Cloud Function)
  error: string,                   // Error message if processing failed

  // Metadata
  createdAt: timestamp             // When trigger was created
}
```

## What Posts to notificationTriggers

### 1. NotificationEngine (Primary System)
**File**: `src/services/shared/NotificationEngine.js`
**Purpose**: Unified notification system for all app notifications
**Trigger Creation**: `sendPushNotification()` method at line 252

```javascript
// Creates triggers for all notification types
const triggerId = `engine_${data.type || 'general'}_${userId}_${Date.now()}`;
await setDoc(notificationTriggerRef, {
  type: 'engine_notification',
  subType: data.type || 'general',
  userId: userId,
  priority: this.mapPriorityToFCM(priority),
  title: title,
  message: message,
  data: { ...data, timestamp: new Date().toISOString() },
  createdAt: new Date(),
  processed: false,
});
```

**Notification Types Created**:
- Event notifications (join, leave, update, cancelled)
- Social notifications (follow, friend requests)
- Admin notifications
- Invitation notifications

### 2. Admin Notification Service
**Files**:
- `src/services/adminNotificationService.js`
- `src/services/banEnforcementService.js`
- `src/services/moderationService.js`

**Purpose**: Administrative notifications (bans, warnings, system messages)

### 3. Scheduled Notification Processor
**File**: `functions/notifications/scheduledNotificationProcessor.js`
**Purpose**: Converts scheduled notifications into immediate triggers
**Trigger Creation**: Line 41-60

```javascript
// Converts scheduled notifications into immediate triggers
const triggerId = `scheduled_${notificationData.type}_${userId}_${Date.now()}`;
await notificationTriggerRef.set({
  type: 'engine_notification',
  subType: notificationData.type,
  userId: userId,
  // ... other notification data
});
```

## What Reads notificationTriggers

### Cloud Functions (Firebase Functions)
All readers are Firebase Cloud Functions that automatically trigger when documents are created:

#### 1. Admin Push Notifications
**File**: `functions/notifications/adminPushNotifications.js`
**Triggers on**: Document creation in `notificationTriggers/{triggerId}`
**Handles**: `admin_notification` and `engine_notification` types
**Process**:
1. Gets user's FCM token from `users/{userId}.deviceInfo.fcmToken`
2. Constructs FCM payload with notification title/body and data
3. Sends via `admin.messaging().send()`
4. Marks trigger as `processed: true`

#### 2. Social Notifications
**File**: `functions/notifications/socialNotifications.js`
**Triggers on**: Document creation in `notificationTriggers/{triggerId}`
**Handles**: Follow notifications and friend requests
**Process**: Similar FCM sending flow

#### 3. Comment Notifications
**File**: `functions/notifications/commentNotifications.js`
**Triggers on**: Document creation in `notificationTriggers/{triggerId}`
**Handles**: Comment-related notifications

## What It's Used For

### Immediate Notification Delivery
The collection serves as a **bridge between app actions and FCM delivery**:

1. **User Action** → App creates trigger document
2. **Cloud Function** → Automatically detects new trigger
3. **FCM Service** → Sends push notification to device
4. **Status Update** → Marks trigger as processed

### Notification Types Supported

#### Event Notifications
- **Event Join**: When someone subscribes to an event
- **Event Leave**: When someone unsubscribes from an event
- **Event Update**: When event details change
- **Event Cancelled**: When an event is cancelled

#### Social Notifications
- **Follow Request**: When someone follows you
- **Friend Request**: When someone sends a friend request
- **Friend Accepted**: When a friend request is accepted

#### System Notifications
- **Admin Notifications**: Messages from administrators
- **Ban Notifications**: Account suspension notices
- **Invitation Received**: Event invitation alerts

#### Scheduled Event Reminders
- **24 hours before**: Event reminder
- **1 hour before**: Event starting soon
- **15 minutes before**: Event starting now

## What Cleans Up notificationTriggers

### Automatic Processing Cleanup
**Mechanism**: Cloud Functions mark documents as processed rather than deleting them
**Process**:
1. Cloud Function processes trigger
2. Sends FCM notification
3. Updates document: `{ processed: true, sentAt: timestamp }`
4. Optionally adds error information if sending failed

### No Automatic Deletion
**Important**: Documents are **NOT automatically deleted** from this collection. They remain with `processed: true` for debugging and audit purposes.

### Manual Cleanup (If Needed)
For large-scale cleanup, you would need to:
1. Query for old processed documents
2. Batch delete them manually
3. Consider retention policies based on your needs

## Data Flow Diagram

```
App Action (Create Event, Send Message, etc.)
    ↓
NotificationEngine.createNotification()
    ↓
Create document in notificationTriggers/
    ↓
Cloud Function automatically triggered
    ↓
Fetch user FCM token from users/ collection
    ↓
Send FCM notification via admin.messaging()
    ↓
Mark trigger as processed: true
    ↓
User receives push notification on device
```

## Security Considerations

### Authorization
- **NotificationEngine** performs authorization checks before creating triggers
- Only authorized users can send notifications to other users
- Admin notifications require admin privileges
- Event notifications require host/cohost status

### Data Sanitization
- All notification content is sanitized to prevent XSS
- HTML tags and JavaScript are removed
- Content length limits enforced (title: 100 chars, message: 200 chars)

### FCM Token Security
- FCM tokens are stored securely in user documents
- Only Cloud Functions have access to send notifications
- Tokens are never exposed to client-side code

## Error Handling

### Failed Notifications
When notification sending fails:
```javascript
{
  processed: true,
  error: "Error message",
  errorStack: "Full error stack trace"
}
```

### Common Failure Reasons
- **No FCM Token**: User hasn't granted notification permissions
- **Invalid Token**: User uninstalled app or token expired
- **User Not Found**: Target user doesn't exist
- **Authorization Failed**: Sender lacks permission

## Performance Considerations

### Batching
- Cloud Functions can process multiple triggers simultaneously
- Each trigger is processed independently to prevent cascading failures

### Rate Limiting
- NotificationEngine enforces rate limits (50 notifications per user per day)
- Cloud Functions have built-in execution limits

### Scaling
- Collection can handle high volume of notification triggers
- Cloud Functions auto-scale based on trigger volume
- Consider archival strategies for long-term storage

## Monitoring and Debugging

### Useful Queries

**Get recent unprocessed triggers**:
```javascript
collection(db, 'notificationTriggers')
  .where('processed', '==', false)
  .orderBy('createdAt', 'desc')
  .limit(10)
```

**Get failed notifications**:
```javascript
collection(db, 'notificationTriggers')
  .where('processed', '==', true)
  .where('error', '!=', null)
  .orderBy('createdAt', 'desc')
```

**Get notifications for specific user**:
```javascript
collection(db, 'notificationTriggers')
  .where('userId', '==', targetUserId)
  .orderBy('createdAt', 'desc')
```

### Cloud Function Logs
Monitor Cloud Function execution in Firebase Console:
- **Function Name**: `onAdminNotificationTrigger`
- **Log Location**: Firebase Console → Functions → Logs
- **Success Pattern**: "Successfully sent message to user"
- **Error Pattern**: "Error sending admin push notification"