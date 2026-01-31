# Big Vibe Studios - Testing Instructions

## What We're Testing
This is a community + event management app where users can create and attend events. We're focused on core functionality, notifications, and app stability.

## Setup
1. Install the APK on your Android device
2. Create an account (email + password)
3. Complete onboarding (contact info + location)

## Critical Test Areas

### 1. Event Creation & Management
- **Create an event**: Tap the "+" button on Home screen
  - Fill in: Title, Description, Date/Time, Location
  - Try adding: Cover photo, additional settings
- **Edit an event**: Open your event → Edit button
- **Delete an event**: Open your event → Delete option

### 2. Event Discovery & Joining
- **Browse events**: Home screen feed
- **Join an event**: Tap "Join" button on any event
- **Leave an event**: Tap "Leave" button on joined event
- **View event details**: Tap any event card

### 3. Notifications (IMPORTANT)
- **Enable notifications**: When prompted, allow notifications
- **Test in-app notifications**:
  - Tap bell icon (top right on Home)
  - Click on notifications - should navigate to relevant screens
- **Test push notifications**:
  - Join/leave events created by others
  - Click on notification banners - should open app to correct screen
- **Official events**: Look for events marked "YoStudioName" - these are studio-hosted

### 4. Profile & Settings
- **View your profile**: Profile tab
- **Edit profile info**: Update nickname, bio, profile picture
- **Notification settings**: Check on/off toggles work

### 5. Social Features
- **Follow users**: Visit user profiles
- **View other profiles**: Tap usernames/avatars
- **Event comments**: Post/view comments on events

## What to Report

### Bugs to Flag
- App crashes or freezes
- Features that don't work as expected
- Navigation errors (wrong screen, back button issues)
- Notifications not appearing or not clickable
- UI elements overlapping or cut off
- Slow performance or lag

### Important Details
- Android version: _______
- Device model: _______
- Steps to reproduce any issues
- Screenshots/screen recordings help!

## Focus Areas for This Build
1. **Notifications**: Do they appear? Do they navigate correctly when clicked?
2. **Event creation flow**: Can you complete all steps smoothly?
3. **Overall stability**: Does the app feel stable during normal use?

## Notes
- This is a BETA build - bugs are expected
- Dark/neon punk theme is intentional
- Some features may be limited during testing phase

Thank you for testing! 🎪
