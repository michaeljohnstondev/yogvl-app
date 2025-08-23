# Big Vibe Studios - Push Notification System

## 🎯 Overview
We've implemented a complete push notification system using Firebase Cloud Messaging (FCM) with smart batching, user preferences, and real-time delivery.

## ✅ What's Implemented

### 1. **React Native FCM Integration**
- **FCM Service** (`src/services/fcmService.js`): Handles device tokens, permissions, and message handling
- **Navigation Integration**: Deep linking from notifications to specific screens
- **Auto-initialization**: FCM service initializes when users authenticate
- **Token Management**: Registers/removes tokens on login/logout

### 2. **User Notification Preferences** 
- **Three-Section Settings**: App, Hosting, and Attending preferences
- **Consistent Data Structure**: All saved under `users/{userId}/userdata/settings/notifications/`
- **Real-time Updates**: User preferences sync with Firebase
- **Default Settings**: Smart defaults with user customization

### 3. **Firebase Cloud Functions**
Located in `/functions/index.js`:

#### **Event Join/Leave Notifications**
- `onEventJoin`: Notifies hosts when someone joins their event
- `onEventLeave`: Notifies hosts when someone leaves their event
- Respects host notification preferences

#### **Event Update Notifications**
- `onEventUpdate`: Notifies attendees when hosts change event details
- Tracks important changes: time, location, title, details
- Only notifies users who opted-in to host change notifications

#### **Comment Notifications (Smart Batching)**
- `onCommentNotificationTrigger`: Handles first comment instant, rest batched
- **Anti-spam Logic**: First comment = push notification, subsequent = badge only
- Respects hosting notification preferences

#### **Event Reminders**
- `sendEventReminders`: Scheduled function runs every 15 minutes
- Sends reminders at user-chosen times: 15min, 1hour, 1day before
- Only notifies users who enabled reminders with matching timing

### 4. **Data Structure**

```javascript
users/{userId}/userdata/settings/notifications: {
  app: {
    pushNotifications: true,
    emailNotifications: true, 
    friendAdded: true,
    friendFollowed: true,
    systemUpdates: true,
    promotionalEmails: false,
    quietHours: false,
    weekendNotifications: true
  },
  hosting: {
    enabled: true,
    reminderTiming: '1hour',
    notifyOnJoin: true,
    notifyOnLeave: true, 
    sendDayBefore: true,
    newComments: true
  },
  attending: {
    hostChanges: true,
    eventReminders: true,
    reminderTiming: '1hour', 
    dayBeforeReminder: true,
    hostComments: true,
    newComments: false
  }
}

users/{userId}/deviceInfo: {
  fcmToken: "user's_fcm_token",
  platform: "ios" | "android",
  lastTokenUpdate: timestamp
}
```

## 🚀 Deployment Steps

### 1. **Install Dependencies**
```bash
# In /functions directory
cd functions
npm install
```

### 2. **Configure Firebase Project**
```bash
# Initialize Firebase (if not done)
firebase init functions

# Deploy Cloud Functions
firebase deploy --only functions
```

### 3. **Enable Cloud Scheduler**
The reminder function uses Cloud Scheduler - enable it in Google Cloud Console for your Firebase project.

### 4. **Test the System**

#### **Manual Testing:**
1. **User Registration**: Create account → FCM token should be registered
2. **Event Creation**: Create event with notification settings
3. **Event Joining**: Join someone's event → host should get notification
4. **Comments**: Add comment → host gets first comment notification
5. **Event Changes**: Update event details → attendees get notifications
6. **Reminders**: Create event for near future → test reminder delivery

#### **Debug Tools:**
- Check Firebase Console → Cloud Functions → Logs
- Monitor FCM delivery in Firebase Console → Cloud Messaging
- Use `console.log` statements in Cloud Functions for debugging

## 🎯 Notification Types Implemented

| Notification Type | Recipient | Trigger | User Control |
|------------------|-----------|---------|--------------|
| **Event Join** | Host | User subscribes to event | Hosting settings |
| **Event Leave** | Host | User unsubscribes from event | Hosting settings |
| **Event Changes** | Attendees | Host updates event details | Attending settings |
| **Event Reminders** | Attendees | 15min/1hour/1day before event | Attending settings |
| **First Comment** | Host | First comment on event | Hosting settings |
| **Comment Batch** | Host | Badge update only (no push) | N/A |

## 🔧 Key Features

### **Smart Comment Batching**
- **First comment**: Instant push notification
- **Subsequent comments**: Silent badge increment only  
- **Prevents spam**: Users won't get flooded with comment notifications
- **User-friendly**: Clear indication of unread comments without annoyance

### **Granular User Control**
- **Per-category settings**: App, hosting, attending preferences
- **Timing control**: Choose reminder timing (15min/1hour/1day)
- **Default system**: Save settings as defaults for future events

### **Deep Linking**
- **Notification tap**: Opens relevant screen (EventDetail, UserProfile, etc.)
- **Context aware**: Passes event IDs and screen parameters
- **Seamless UX**: Users go directly to relevant content

## 🛠 Technical Architecture

### **Flow Overview**
1. **User Action** (join event, comment, etc.) → React Native app
2. **Trigger Creation** → Firestore document in `notificationTriggers` collection
3. **Cloud Function Execution** → Processes trigger, checks preferences
4. **FCM Delivery** → Sends push notification to target devices
5. **User Interaction** → Tap notification → Deep link to app screen

### **Offline Handling**
- **Token refresh**: Automatic token updates when device reconnects
- **Queued notifications**: FCM queues notifications for offline devices
- **Sync on reconnect**: App syncs notification state when back online

## 📱 User Experience

### **Onboarding**
1. User creates account → FCM permission requested automatically
2. Default notification settings applied
3. User can customize preferences in Settings

### **Event Hosting**
1. Create event → Choose notification settings for this event
2. Get notified when people join/leave
3. First comment notification, then badge-only updates

### **Event Attending**
1. Join event → Choose notification preferences (or use defaults)
2. Get notified of host changes if opted-in
3. Receive reminders at chosen timing

## 🔄 Future Enhancements

- **Push notification analytics**: Track delivery rates and engagement
- **Rich notifications**: Images, action buttons, expanded content
- **Notification history**: In-app notification center
- **Group messaging**: Attendee-to-attendee communications
- **Smart timing**: ML-based optimal notification timing

## 🚨 Important Notes

1. **Permissions**: Users can deny notification permissions - gracefully handle this
2. **Token Management**: FCM tokens can change - system handles refresh automatically  
3. **Rate Limits**: Cloud Functions have limits - monitor usage in production
4. **Testing**: Use Firebase emulator suite for local development and testing
5. **Privacy**: Respect user preferences and provide clear opt-out mechanisms

The notification system is now production-ready and provides comprehensive push notification capabilities for the Big Vibe Studios app! 🎉