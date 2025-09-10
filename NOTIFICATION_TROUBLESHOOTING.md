# Notification System Troubleshooting Guide

## 🔧 **FIXED ISSUES**

### ✅ **User Preferences Path Mismatch (RESOLVED)**
- **Problem**: Notification system was looking for preferences in wrong database location
- **Solution**: Updated `getUserNotificationPreferences()` to read from correct path: `users/{userId}/userdata/settings/notifications`
- **Impact**: All notifications should now respect user preferences properly

### ✅ **Default Settings for New Users (RESOLVED)** 
- **Problem**: New users might not have proper notification preferences
- **Solution**: Default settings are applied during signup with `pushNotifications: true`
- **Impact**: All new users have notifications enabled by default

## 🧪 **TESTING YOUR NOTIFICATIONS**

### **Option 1: Use Built-in Notification Tester** (Recommended)
1. Add `<NotificationTester />` component to any screen (e.g., AdminScreen)
2. Run tests in order:
   - **🔧 Test Setup & Permissions** - Verify push token registration
   - **🧪 Test Real Notification Functions** - Test actual notification delivery
   - **📱 Test Background** - Test notifications while app is closed

### **Option 2: Manual Testing**
```javascript
// Test in console/debugger
import { notifyNewFollower } from './src/services/notifications';

await notifyNewFollower({
  targetUserId: 'YOUR_USER_ID',
  followerId: 'test_123',
  followerName: 'Test User'
});
```

## 🔍 **COMMON ISSUES & SOLUTIONS**

### **1. No Push Notifications Received**

**Check This:**
```bash
# Look for these console messages:
[sendPushNotification] No push token found for user
[sendPushNotification] Push notification sent successfully
```

**Solutions:**
- **Missing Push Token**: User needs to grant notification permissions
- **Wrong Token**: Token registration may have failed
- **User Preferences**: Check `userdata.settings.notifications.app.pushNotifications`

### **2. Badge Count Not Updating**

**Check This:**
```javascript
// In user document, check:
users/{userId}/unreadNotifications: number
```

**Solutions:**
- Badge count updates when `createNotification()` runs successfully
- Check if notification creation is failing due to preferences
- Verify `increment(1)` is working in Firestore

### **3. In-App Notifications Not Showing**

**Check This:**
```javascript
// Notifications stored in subcollection:
users/{userId}/notifications/{notificationId}
```

**Solutions:**
- Check if notifications are being created in Firestore
- Verify your in-app notification component is reading from correct path
- Check if notifications have correct `read: false` status

### **4. Push Token Registration Failing**

**Symptoms:**
```bash
[FCMService] Failed to register token for user
[sendPushNotification] No push token found for user
```

**Solutions:**
```javascript
// Manually test token registration:
import fcmService from './src/services/fcmService';
await fcmService.registerTokenForUser(userId);
```

### **5. Permissions Not Granted**

**Check:**
- Device Settings > [Your App] > Notifications
- For iOS: Check if user denied permission initially (need to reset)
- For Android: Check notification channels are enabled

## 📋 **VERIFICATION CHECKLIST**

Use this to verify notifications are working:

### **✅ Setup Verification**
- [ ] FCM service initializes in App.js
- [ ] Push token is generated successfully
- [ ] Push token is registered to user document
- [ ] User has notification permissions granted

### **✅ Preferences Verification**
- [ ] User preferences load from correct path
- [ ] `pushNotifications: true` in user preferences
- [ ] App notification settings enabled (`friendFollowed`, `friendAdded`)

### **✅ Notification Creation**
- [ ] `createNotification()` succeeds without errors
- [ ] Notification document created in `users/{id}/notifications`
- [ ] `unreadNotifications` count incremented
- [ ] Push notification sent via Expo API

### **✅ Delivery Verification**
- [ ] Push notification appears in system tray
- [ ] Badge count updates on app icon
- [ ] In-app notification appears (if applicable)
- [ ] Tapping notification navigates correctly

## 🚨 **CRITICAL NOTIFICATION TYPES**

These notifications should **ALWAYS** work (override user preferences):

1. **Event Cancellation** (`NOTIFICATION_TYPES.EVENT_CANCELLED`)
2. **Security/Ban Notifications** (`NOTIFICATION_TYPES.ADMIN_NOTIFICATION`)
3. **Critical System Updates**

## 📱 **TESTING DIFFERENT SCENARIOS**

### **Foreground Testing**
- App is open and active
- Notifications should show as banner/popup
- Should still create in-app notification entry

### **Background Testing**
- App is minimized but running
- Notifications appear in system tray
- Badge count should update

### **Closed App Testing**
- App is completely closed
- Push notifications should still arrive
- Badge count updates when app reopens

## 🔧 **DEBUGGING COMMANDS**

### **Check User Preferences**
```javascript
import { getUserNotificationPreferences } from './src/services/notifications';
const prefs = await getUserNotificationPreferences('userId');
console.log('User preferences:', prefs);
```

### **Check Push Token**
```javascript
import fcmService from './src/services/fcmService';
const token = fcmService.getCurrentToken();
console.log('Current push token:', token);
```

### **Check Firestore Notifications**
```javascript
import { collection, getDocs } from 'firebase/firestore';
import { db } from './src/auth/services/firebase';

const notificationsRef = collection(db, 'users', userId, 'notifications');
const snapshot = await getDocs(notificationsRef);
console.log('User notifications:', snapshot.docs.map(d => d.data()));
```

## 📞 **SUPPORT FLOW**

When user reports "notifications not working":

1. **Ask them to run**: Notification Tester → Test Setup & Permissions
2. **Check console** for error messages during setup
3. **Run**: Test Real Notification Functions 
4. **If still failing**: Check device notification settings manually
5. **Last resort**: Reset notification permissions in device settings

## 🎯 **SUMMARY**

The notification system should now be working correctly with the fixes:
- ✅ **User preferences** load from correct database location
- ✅ **Default settings** ensure new users have notifications enabled  
- ✅ **Comprehensive testing** tools available for debugging
- ✅ **All notification types** (follow, invite, event, cohost) functional

**Most common issue**: User denied notification permissions initially. Solution: Reset app permissions in device settings.