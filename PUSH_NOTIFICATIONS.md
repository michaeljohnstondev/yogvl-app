# Push Notifications Setup & Testing Guide

## ✅ What's Configured

### 1. **Expo Notifications Package**
- `expo-notifications` - Core notification functionality
- `expo-device` - Device detection
- `expo-constants` - App configuration access

### 2. **App Configuration (app.json)**
- ✅ Android notification permissions
- ✅ iOS background modes for notifications
- ✅ Notification channels (default, event-reminders, social)
- ✅ Firebase integration with google-services.json
- ✅ Notification icon and color theming

### 3. **EAS Build Configuration (eas.json)**
- ✅ Build profiles for development, preview, and production
- ✅ APK generation for Android testing

### 4. **FCM Service (fcmService.js)**
- ✅ Real Expo push token generation
- ✅ Permission handling
- ✅ Notification listeners (foreground & tap)
- ✅ Deep linking from notifications
- ✅ Firebase user token storage
- ✅ Multiple notification channels

## 🚀 How to Test

### Step 1: Build the APK
```bash
eas build --platform android --profile preview
```

### Step 2: Install APK on Android Device
1. Download the APK from the EAS build link
2. Install on your Android device
3. Enable "Install from Unknown Sources" if prompted

### Step 3: Get Your Push Token
1. Open the app on your device
2. Allow notification permissions when prompted
3. Check the console logs or Firebase console for your Expo push token
4. It looks like: `ExponentPushToken[XXXXXXXXXXXXXXXXXXXXXX]`

### Step 4: Send Test Notifications
```bash
# Replace YOUR_TOKEN with your actual token
node scripts/testNotification.js ExponentPushToken[YOUR_TOKEN_HERE]
```

## 📱 Notification Types Configured

### **Default Channel**
- General app notifications
- Importance: MAX
- Sound: ✅
- Vibration: ✅

### **Event Reminders**
- Event start notifications
- Event updates
- Importance: HIGH
- Color: Orange (#FF6B35)

### **Social Updates**  
- New followers
- Friend requests
- Importance: DEFAULT
- Sound: ❌ (Silent)

## 🔧 Deep Link Navigation

Notifications automatically navigate to appropriate screens:

| Notification Type | Navigation Target |
|------------------|------------------|
| `event_reminder` | EventDetail screen |
| `event_updated` | EventDetail screen |
| `event_comment` | EventDetail screen |
| `friend_request` | UserProfile screen |
| `follow_notification` | SocialListScreen |
| `invitation_received` | InvitationsScreen |

## 🎯 QR Code Integration

With EAS Build, QR codes will now work properly:
- `bvs-app://user/123` → Opens app to user profile
- `bvs-app://invite/abc` → Opens app to event details
- `https://bigvibestudios.com/join` → Universal link (needs backend setup)

## 🐛 Troubleshooting

### **No Push Token Generated**
- Ensure you're on a physical device (not simulator)
- Check that notification permissions are granted
- Verify `google-services.json` is in the correct location

### **Notifications Not Received**
- Check that the app has notification permissions
- Verify the Expo push token is correct
- Make sure the app is in background/closed when testing
- Check Firebase console for delivery errors

### **Deep Links Not Working**
- Verify the app is built with EAS (not Expo Go)
- Check that URL schemes match in app.json
- Test with different notification payloads

### **Build Failures**
- Ensure `google-services.json` exists and is valid
- Check that all dependencies are compatible
- Verify EAS CLI is up to date: `npm install -g eas-cli`

## 📄 Files Modified

- ✅ `app.json` - Notification configuration
- ✅ `eas.json` - Build profiles
- ✅ `src/services/fcmService.js` - Real notification implementation
- ✅ `scripts/testNotification.js` - Testing script
- ✅ `package.json` - Added expo-notifications dependencies

## 🔮 Next Steps

### **For iOS Testing:**
1. Get Apple Developer Account ($99/year)
2. Add `GoogleService-Info.plist` to project
3. Configure APNs certificates in Firebase
4. Build iOS version: `eas build --platform ios --profile preview`

### **For Production:**
1. Set up Firebase Cloud Functions for sending notifications
2. Implement server-side notification triggers
3. Add notification preference screens
4. Set up analytics tracking
5. Configure universal links with backend

## 🎉 You're Ready!

Your app now has full push notification support. The build should be ready soon - check your EAS build link and install the APK to start testing!