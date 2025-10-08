# CLAUDE.md - Firebase Cloud Functions

This file provides guidance to Claude Code when working with Firebase Cloud Functions in this repository.

## Overview

This directory contains Firebase Cloud Functions for the Big Vibe Studios notification system. All functions are written in Node.js and deployed to Firebase Cloud Functions.

## Tech Stack

- **Runtime**: Node.js 18
- **Framework**: Firebase Functions v5.1.1 (gcfv2)
- **Admin SDK**: Firebase Admin v12.0.0
- **Deployment**: Firebase CLI

## Key Data Structures

### User Document Structure

**Location**: `users/{userId}`

```javascript
{
  uid: string,
  userdata: {
    contactInfo: {
      displayName: string,
      // ...
    },
    settings: {
      notifications: {
        hosting: {
          reminderTemplates: {} // Object format: {'15m': true, '1h': false, '1d': true}
        },
        attending: {
          reminderTemplates: {} // Object format: {'15m': true, '1h': false, '1d': true}
        }
      }
    }
  },
  deviceInfo: {
    fcmToken: string,           // ⚠️ IMPORTANT: FCM token stored HERE (singular, nested)
    platform: 'ios' | 'android',
    lastTokenUpdate: Timestamp,
    notificationsEnabled: boolean
  },
  fcmTokens: string[]  // ⚠️ LEGACY: Old format (array at root) - still supported for backwards compatibility
}
```

**Critical Notes:**
- **FCM tokens** are stored at `deviceInfo.fcmToken` (singular, nested object)
- Legacy format `fcmTokens` (plural, root-level array) is still supported for backwards compatibility
- Cloud Functions must check BOTH locations to support old and new users

### Scheduled Notification Document

**Location**: `scheduledNotifications/{notificationId}`

```javascript
{
  id: string,                    // Format: "sched_{timestamp}_{random}"
  userId: string,
  eventId: string (optional),
  type: 'event_reminder' | 'attendance_reminder' | 'event_recap',
  title: string,
  message: string,
  reminderType: string,          // ⚠️ IMPORTANT: Template ID at ROOT level (e.g., '55m', '15m', '1h')
  data: {
    eventId: string,
    eventTitle: string,
    eventTime: string,
    isHost: boolean,
    customTemplate: object | null
  },
  scheduledFor: Timestamp,       // When to send the notification
  status: 'pending' | 'sent' | 'failed' | 'cancelled',
  attempts: number,
  lastAttemptAt: Timestamp (optional),
  priority: 'high' | 'normal',
  channels: ['push']
}
```

**Critical Notes:**
- `reminderType` MUST be at root level for Cloud Function validation
- Format: `{amount}{unit}` where unit is m/h/d/w/x/y (e.g., '55m', '2h', '1d')
- Validated by `functions/utils/reminderUtils.js`

## Important Functions

### processScheduledNotifications (Scheduled)

**Trigger**: Runs every 1 minute via Cloud Scheduler

**Purpose**: Sends push notifications via FCM when `scheduledFor` time arrives

**Flow**:
1. Query `scheduledNotifications` where `status == 'pending'` AND `scheduledFor <= now`
2. For each notification:
   - Validate `reminderType` format (if type is 'event_reminder')
   - Get user's FCM token from `deviceInfo.fcmToken` OR legacy `fcmTokens[]`
   - Send push notification via FCM
   - Update status to 'sent' or 'failed'

**Key Code Locations**:
- Main processor: `functions/notifications/scheduledNotificationProcessor.js`
- Reminder validation: `functions/utils/reminderUtils.js`

### FCM Token Handling

**CRITICAL**: Always check BOTH token locations for backwards compatibility:

```javascript
let fcmTokens = [];
if (userData?.fcmTokens && Array.isArray(userData.fcmTokens)) {
  // Old format: fcmTokens array at root
  fcmTokens = userData.fcmTokens;
} else if (userData?.deviceInfo?.fcmToken) {
  // New format: single token in deviceInfo.fcmToken
  fcmTokens = [userData.deviceInfo.fcmToken];
}
```

## Reminder Template Format

Templates are stored as objects (NOT arrays):

```javascript
// CORRECT ✅
reminderTemplates: {
  '15m': true,   // 15 minutes before
  '1h': false,   // 1 hour before (disabled)
  '1d': true,    // 1 day before
  '55m': true,   // 55 minutes before
  '2h': false    // 2 hours before (disabled)
}

// WRONG ❌
reminderTemplates: []  // Array format is incorrect
```

**Template ID Format**: `{amount}{unit}`
- `m` = minutes
- `h` = hours
- `d` = days
- `w` = weeks
- `x` = months (legacy)
- `y` = months

**Examples**: `5m`, `15m`, `1h`, `2h`, `1d`, `1w`

## Common Issues

### 1. "No FCM tokens available" Error

**Cause**: Cloud Function looking in wrong location for FCM token

**Fix**: Ensure function checks both `deviceInfo.fcmToken` AND `fcmTokens[]`

**Location**: `functions/notifications/scheduledNotificationProcessor.js:128-137`

### 2. Invalid Reminder Template Format

**Cause**: Template ID doesn't match regex `/^(\d+)([mhdwxy])$/`

**Fix**: Ensure template IDs follow format: `{amount}{unit}` (e.g., '55m', not '55 min')

**Location**: `functions/utils/reminderUtils.js`

### 3. Deployment Timeout

**Cause**: Functions taking too long to analyze during deployment

**Fix**:
- Ensure all dependencies are in `package.json`
- Run `npm install` in functions directory before deploying
- Check for circular dependencies in imports

## Development Commands

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy single function
firebase deploy --only functions:processScheduledNotifications

# View logs
firebase functions:log

# View logs for specific function
firebase functions:log --only processScheduledNotifications

# Test locally with emulator
cd functions && npm run serve
```

## Testing

### Test Scheduled Notifications

1. Create test event in app with notification settings
2. Check `scheduledNotifications` collection in Firestore
3. Verify `scheduledFor` time is correct
4. Wait for scheduled time (or manually trigger Cloud Function)
5. Check Firebase Functions logs for processing output
6. Verify notification appears on device

### Check FCM Token

```javascript
// In Firebase Console > Firestore
users/{userId}/deviceInfo/fcmToken  // Should have a token string
```

## Error Handling

All Cloud Functions should:
1. Log errors with context (userId, eventId, etc.)
2. Update notification status to 'failed' with error message
3. Increment `attempts` counter
4. Set `lastAttemptAt` timestamp
5. Retry up to 3 times before permanent failure

## Architecture Notes

- **Global Collection**: `scheduledNotifications` is a global collection (not user subcollection) for efficient querying
- **Scalability**: Query by `status` and `scheduledFor` with composite index
- **Atomic Operations**: Use transactions for subscription changes to prevent race conditions
- **Background Processing**: Run expensive operations async to avoid blocking user actions

## Important Files

- `index.js` - Main exports for all Cloud Functions
- `notifications/scheduledNotificationProcessor.js` - Scheduled notification processor
- `notifications/eventSubscriptionNotifications.js` - Event join/leave notifications
- `notifications/eventCommentNotifications.js` - Comment notifications
- `utils/reminderUtils.js` - Reminder template validation
- `package.json` - Dependencies and Node version

## Migration Notes

### FCM Token Migration (October 2025)

Migrated from:
- Old: `fcmTokens` (array at root)
- New: `deviceInfo.fcmToken` (string, nested)

**Backwards Compatibility**: Cloud Functions check both locations

### Reminder Templates Migration (October 2025)

Migrated from:
- Old: Array format `[]`
- New: Object format `{'15m': true, '1h': false}`

**Client-side**: `src/services/scheduled/eventReminderTemplates.js` handles parsing

## Security

- Cloud Functions run with Admin SDK privileges
- User data access controlled by Firestore Security Rules
- FCM tokens stored securely in user documents
- No sensitive data in notification payloads (use data field for IDs only)

## Performance

- Scheduled processor limited to 100 notifications per run (prevents timeouts)
- Failed notifications retry up to 3 times with exponential backoff
- Old notifications cleaned up after 30 days
- Composite indexes required for efficient querying

## Contact

For questions about Cloud Functions architecture, check:
- Main app CLAUDE.md in root directory
- DATABASE.md for Firestore schema
- TASKS.md for pending function updates
