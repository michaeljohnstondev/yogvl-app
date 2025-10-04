# NOTIFICATION SYSTEM STATUS - NOTICE

## ⚠️ IMPORTANT: notificationTriggers Collection Eliminated

As of the latest deployment, the **`notificationTriggers` collection has been permanently eliminated** to prevent zombie resurrection. This collection was identified as an architectural mistake that caused scaling issues.

## 🟢 AVAILABLE NOTIFICATIONS (Modern Direct Triggers)

These notifications are **working** and use the modern direct Firebase trigger architecture:

### Event-Related Notifications ✅
- **Event Subscriptions** - When users join/leave events
- **Event Comments** - Host and guest comments on events
- **Event Changes** - When events are updated or deleted
- **Event Invitations** - When users are invited to events
- **Event Interest Matching** - When new events match user interests 🆕
- **Cohost Invitations** - When users are invited as cohosts
- **Cohost Joined** - When cohost invitations are accepted

### User-Related Notifications ✅
- **User Follows** - When someone follows a user

## 🔴 MISSING NOTIFICATIONS (Require Migration)

These notifications are **temporarily disabled** because they relied on the eliminated `notificationTriggers` collection:

### Admin/Moderation Notifications ❌
- **Admin Announcements** - System-wide announcements
- **Warning Notifications** - Moderation warnings to users
- **Strike Notifications** - Community guideline strikes
- **Ban Notifications** - Temporary and permanent ban alerts
- **Policy Updates** - Terms of service changes
- **Custom Admin Messages** - Direct admin-to-user notifications

### System Notifications ❌
- **Scheduled Notifications** - Time-based reminders and alerts
- **Event Reminders** - Upcoming event notifications
- **Attendance Reminders** - Post-event attendance tracking
- **Follow Request** - Friend/follow request notifications
- **Mutual Follow** - When mutual following occurs

### General Engine Notifications ❌
- **Generic Push Notifications** - From NotificationEngine service
- **Cross-platform Notifications** - Multi-channel delivery

## 📋 DISABLED SERVICES

The following services have been disabled to prevent `notificationTriggers` recreation:

### Client-Side Services (React Native App)
- `src/services/shared/NotificationEngine.js` - Main notification creation
- `src/services/adminNotificationService.js` - Admin notifications
- `src/services/banEnforcementService.js` - Ban notifications
- `src/services/moderationService.js` - Moderation notifications

### Firebase Functions
- `functions/notifications/adminPushNotifications.js` - Admin notification triggers
- `functions/notifications/commentNotifications.js` - Legacy comment triggers
- `functions/notifications/socialNotifications.js` - Social notification triggers
- `functions/notifications/scheduledNotificationProcessor.js` - Scheduled notification processing

## 🚀 MIGRATION STRATEGY

To restore missing notifications, each notification type needs to be migrated to the **modern direct trigger architecture**:

### Modern Pattern (✅ Working Examples)
```javascript
// Event creation triggers interest notifications directly
exports.onEventCreated = functions.firestore
  .document('studios/{studioId}/events/{eventId}')
  .onCreate(async (snap, context) => {
    // Direct FCM notification logic here
  });
```

### Old Pattern (❌ Eliminated)
```javascript
// DON'T DO THIS - Creates zombie collection
await setDoc(doc(db, 'notificationTriggers', triggerId), {...});
```

## 🔧 IMPLEMENTATION NEEDED

Each missing notification type needs:

1. **Direct Firebase Function Trigger** - Listen to specific database changes
2. **FCM Integration** - Send push notifications via Firebase Cloud Messaging
3. **User Preference Checking** - Honor notification settings
4. **Error Handling** - Proper logging and failure management

## 📝 CURRENT STATUS

- ✅ **Interest-based notifications working** (just implemented)
- ✅ **Event-related notifications working** (existing)
- ❌ **Admin/moderation notifications offline** (needs migration)
- ❌ **Scheduled notifications offline** (needs migration)
- ❌ **General engine notifications offline** (needs migration)

## 🚨 ACTION REQUIRED

**For app administrators**: Admin and moderation notifications are currently offline. Users will not receive notifications for:
- Account warnings or strikes
- Temporary or permanent bans
- System announcements
- Policy updates

**For developers**: Migrate notification types one by one to the modern direct trigger architecture following the interest-based notification example.

---

**Last Updated**: 2025-09-29
**Status**: notificationTriggers permanently eliminated, partial notification system operational