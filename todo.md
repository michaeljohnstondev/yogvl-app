# TODO: Replace notificationTriggers with Direct Database Triggers

## 🚨 Why We're Fixing This (Critical Context for Future Claudes)

### The Problem
The `notificationTriggers` collection was an **architectural mistake** that needs to be eliminated:

- **Infinite Scale Problem**: Every notification creates a permanent document that never gets cleaned up
- **Unnecessary Complexity**: Immediate notifications don't need intermediate storage
- **Performance Degradation**: Hot collection that grows infinitely affects query performance
- **Storage Bloat**: Costs increase linearly with no benefit

### The Root Cause
Previous Claude incorrectly applied the `scheduledNotifications` pattern to ALL notifications. However:
- **scheduledNotifications is CORRECT** - needed for batch processing efficiency (query one global collection vs. thousands of user subcollections)
- **notificationTriggers is WRONG** - immediate notifications should use direct Firestore triggers

### The Solution
**Immediate Notifications**: Database Change → Direct Cloud Function → FCM → Done
**Scheduled Notifications**: Keep existing scheduledNotifications system (it's perfect for batch processing)

---

## 📋 Implementation Priority List

### 1. User Follows Me
**Trigger Location**: `users/{userId}/followers/{followerId}` (document created)
**Cloud Function**: `onUserFollowed`
**Notification**: "{{followerName}} started following you"
**Authorization**: Public action, anyone can follow anyone

### 2. Joined Event
**Trigger Location**: `studios/{studioId}/events/{eventId}/subscribers/{userId}` (document created)
**Cloud Function**: `onEventSubscribed`
**Notification**: "{{subscriberName}} joined your event '{{eventTitle}}'"
**Authorization**: Send to event host/cohosts only

### 3. Left Event
**Trigger Location**: `studios/{studioId}/events/{eventId}/subscribers/{userId}` (document deleted)
**Cloud Function**: `onEventUnsubscribed`
**Notification**: "{{unsubscriberName}} left your event '{{eventTitle}}'"
**Authorization**: Send to event host/cohosts only

### 4. Host Comments
**Trigger Location**: `studios/{studioId}/events/{eventId}/comments/{commentId}` (document created, where comment.userId === event.createdBy)
**Cloud Function**: `onHostComment`
**Notification**: "{{hostName}} commented on '{{eventTitle}}': {{commentPreview}}"
**Authorization**: Send to all event subscribers except the host

### 5. Guest Comments
**Trigger Location**: `studios/{studioId}/events/{eventId}/comments/{commentId}` (document created, where comment.userId !== event.createdBy)
**Cloud Function**: `onGuestComment`
**Notification**: "{{guestName}} commented on '{{eventTitle}}': {{commentPreview}}"
**Authorization**: Send to event host/cohosts and other subscribers

### 6. Event I'm Subscribed To Gets Edited/Cancelled/Deleted
**Trigger Location**: `studios/{studioId}/events/{eventId}` (document updated/deleted)
**Cloud Function**: `onEventChanged`
**Notification**:
- Updated: "Event '{{eventTitle}}' has been updated"
- Cancelled: "Event '{{eventTitle}}' has been cancelled"
- Deleted: "Event '{{eventTitle}}' has been deleted"
**Authorization**: Send to all subscribers except host/cohosts

### 7. Host Invites a Guest
**Trigger Location**: `studios/{studioId}/events/{eventId}/invitations/{userId}` (document created)
**Cloud Function**: `onEventInvitation`
**Notification**: "{{hostName}} invited you to '{{eventTitle}}'"
**Authorization**: Send to invited user only

### 8. Host Invites Cohost
**Trigger Location**: `studios/{studioId}/events/{eventId}/cohosts/{userId}` (document created)
**Cloud Function**: `onCohostInvitation`
**Notification**: "{{hostName}} invited you to co-host '{{eventTitle}}'"
**Authorization**: Send to invited cohost only

### 9. Cohost Joins Event
**Trigger Location**: `studios/{studioId}/events/{eventId}/cohosts/{userId}` (document created/accepted)
**Cloud Function**: `onCohostJoined`
**Notification**: "{{cohostName}} accepted co-hosting '{{eventTitle}}'"
**Authorization**: Send to event host only

### 10. Cohost Leaves Event
**Trigger Location**: `studios/{studioId}/events/{eventId}/cohosts/{userId}` (document deleted)
**Cloud Function**: `onCohostLeft`
**Notification**: "{{cohostName}} is no longer co-hosting '{{eventTitle}}'"
**Authorization**: Send to event host and remaining cohosts

### 11. Managing Attendance
**Trigger Location**: `studios/{studioId}/events/{eventId}/attendance/{userId}` (document created/updated)
**Cloud Function**: `onAttendanceMarked`
**Notification**:
- Self-report: "Thank you for confirming your attendance at '{{eventTitle}}'"
- Host marks guest: "{{hostName}} marked you as {{attended ? 'attended' : 'no-show'}} for '{{eventTitle}}'"
- Guest marked by host: "{{guestName}} was marked as {{attended ? 'attended' : 'no-show'}} for '{{eventTitle}}'" (to host/cohosts)
**Authorization**:
- Self-report confirmation: Send to the user who reported
- Host marking guest: Send to the guest being marked
- Notify host/cohosts when guest attendance is updated

### 12. Event Recap
**Trigger Location**: `studios/{studioId}/events/{eventId}` (document updated with status: 'completed')
**Cloud Function**: `onEventCompleted`
**Notification**: "Event recap for '{{eventTitle}}' is now available! {{attendedCount}} attended, {{noShowCount}} no-shows."
**Authorization**: Send to all subscribers (attendees and no-shows) and host/cohosts

### 13. Interest-Based Event Notifications
**Trigger Location**: `studios/{studioId}/events/{eventId}` (document created)
**Cloud Function**: `onEventCreatedInterestMatch`
**Notification**: "New event '{{eventTitle}}' matches your interests!"
**Authorization**: Send to users who have matching interests in `users/{userId}/preferences/interests[]`

---

## 🏗️ Implementation Phases

### Phase 1: Simple Cases (Start Here)
- **User Follows Me** - Simplest trigger, no complex auth
- **Joined/Left Event** - Basic event triggers

### Phase 2: Event Changes
- **Event Edited/Cancelled/Deleted** - Document update triggers
- **Host/Guest Comments** - More complex authorization logic

### Phase 3: Invitation System
- **Host Invites Guest/Cohost** - Invitation triggers
- **Cohost Joins/Leaves** - Cohost management triggers

### Phase 4: Advanced Features
- **Interest-Based Event Notifications** - Query matching logic and scaling considerations

---

## 🛠️ Technical Implementation Notes

### Cloud Function Pattern
```javascript
exports.onUserFollowed = functions.firestore.onDocumentCreated(
  'users/{userId}/followers/{followerId}',
  async (snap, context) => {
    const { userId, followerId } = context.params;

    // Get follower details
    const followerDoc = await admin.firestore().doc(`users/${followerId}`).get();
    const followerName = followerDoc.data().userdata.contactInfo.displayName;

    // Get user's FCM token
    const userDoc = await admin.firestore().doc(`users/${userId}`).get();
    const fcmToken = userDoc.data().deviceInfo?.fcmToken;

    if (fcmToken) {
      // Send FCM directly
      await admin.messaging().send({
        token: fcmToken,
        notification: {
          title: 'New Follower!',
          body: `${followerName} started following you`
        },
        data: {
          type: 'follow_notification',
          followerId: followerId,
          followerName: followerName
        }
      });
    }
  }
);
```

### Key Differences from Current System
1. **No notificationTriggers documents** - Direct FCM from database changes
2. **Keep scheduledNotifications** - Still needed for time-based reminders
3. **Authorization in Cloud Functions** - Check permissions before sending
4. **Error handling** - Log failures, don't create retry documents

### Database Schema Requirements
- Ensure all collections have proper Firestore rules
- Add indexes for any new queries needed
- Consider denormalizing data for faster Cloud Function execution

---

## ✅ Success Criteria

### For Each Notification Type:
- [ ] Cloud Function deploys successfully
- [ ] Database change triggers function execution
- [ ] FCM notification received on device
- [ ] No notificationTriggers documents created
- [ ] Proper error logging in Cloud Function logs

### Overall System:
- [ ] All 13 notification types implemented
- [ ] notificationTriggers collection empty/deleted
- [ ] scheduledNotifications system unchanged
- [ ] No performance degradation
- [ ] Clean Cloud Function logs with proper error handling

---

## 🧹 Cleanup Tasks

### After Implementation:
1. **Delete notificationTriggers collection** entirely
2. **Remove NotificationEngine calls** for immediate notifications
3. **Update documentation** to reflect new architecture
4. **Remove old Cloud Functions** that processed notificationTriggers
5. **Clean up imports** and unused notification code

### Keep Unchanged:
- **scheduledNotifications collection** and processing
- **Event reminder system** (24h, 1h, 15m before events)
- **ScheduledNotificationCore** and related services

---

## 🚨 Critical Reminders for Future Development

1. **NEVER recreate notificationTriggers collection** - it was a scaling mistake
2. **Direct Firestore triggers for immediate notifications** - this is the correct pattern
3. **scheduledNotifications is different** - it's for batch processing and should remain
4. **Document any new notification types** in this file to maintain architectural consistency

---

*This architectural change eliminates a major scaling bottleneck and simplifies the notification system. The key insight: immediate notifications don't need intermediate storage - they should be triggered directly by database changes.*