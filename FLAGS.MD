# Code Cleanup Audit - Unused Imports and Dead Code

## High Priority Cleanup Items (High Confidence)

### 1. Unused Firebase Imports in userService.js
**File**: `/c/dev/bvs-app/src/services/userService.js`
**Lines**: 3-16
**Confidence**: **HIGH**

**Unused Imports**:
- `collection` - Used 0 times
- `query` - Used 0 times
- `where` - Used 0 times
- `getDocs` - Used 0 times
- `orderBy` - Used 0 times
- `limit as firestoreLimit` - Used 0 times

**Used Imports** (keep these):
- `getDoc` - Used 2 times
- `doc` - Used 4 times
- `updateDoc` - Used 2 times
- `setDoc` - Used 1 time
- `arrayUnion` - Used 1 time
- `arrayRemove` - Used 1 time

**Recommendation**: Remove unused imports to clean up import statement.

### 2. Unused writeBatch in studioStatsService.js
**File**: `/c/dev/bvs-app/src/services/studioStatsService.js`
**Lines**: 2-14
**Confidence**: **HIGH**

**Unused Import**: `writeBatch` - Used 0 times

**Recommendation**: Remove `writeBatch` from import statement.

### 3. Unused deleteDoc in userDeletionService.js
**File**: `/c/dev/bvs-app/src/services/userDeletionService.js`
**Lines**: 3-13
**Confidence**: **MEDIUM** (Suspicious - deletion service without deleteDoc?)

**Unused Import**: `deleteDoc` - Used 0 times

**Recommendation**: Investigate why deletion service doesn't use deleteDoc. May indicate incomplete implementation or refactored logic.

### 4. Multiple Unused Imports in fcmService.js
**File**: `/c/dev/bvs-app/src/services/fcmService.js`
**Lines**: 8-9
**Confidence**: **HIGH**

**Unused Imports**:
- `Constants` from 'expo-constants' - Used 0 times
- `doc` - Used 0 times
- `updateDoc` - Used 0 times
- `getDoc` - Used 0 times
- `db` from firebase - Used 0 times

**Recommendation**: Remove all Firebase imports and Constants import.

### 5. Backup Files for Removal
**File**: Multiple backup files
**Confidence**: **HIGH**

**Files to Remove**:
- `/c/dev/bvs-app/functions/index.js.backup`
- `/c/dev/bvs-app/src/screens/HostProfileScreen.js.backup`
- `/c/dev/bvs-app/src/services/followService.js.backup`

**Recommendation**: These backup files can be safely deleted as version control handles backup needs.

## Medium Priority Items (Medium Confidence)

### 6. Legacy Comment Indicating Removed Methods
**File**: `/c/dev/bvs-app/src/services/AttendanceService.js`
**Lines**: 233, 260
**Confidence**: **MEDIUM**

**Comments Found**:
- "getUserEventAttendance method removed - use getAttendanceStatus from attendanceUtils.js instead"
- "markHostAttendance method removed - hosts are automatically included in post-event flow"

**Recommendation**: These comments can be removed as they reference old implementation details.

### 7. TODO Comment in emailService.js
**File**: `/c/dev/bvs-app/src/services/emailService.js`
**Line**: 202
**Confidence**: **LOW**

**Comment**: "TODO: Implement SendGrid API integration"

**Recommendation**: Evaluate if SendGrid integration is still needed or if this TODO can be removed.

## Low Priority Items (Investigate Further)

### 8. Function Usage Analysis
Based on usage analysis, some exported functions may be underutilized:

**File**: `/c/dev/bvs-app/src/services/userService.js`
- Most functions are used in 1-2 files, which is normal
- No functions appear completely unused based on grep search

**Recommendation**: All functions appear to be in use, no removal needed.

## File Size Analysis
Largest service files that may benefit from review:
1. `privacyService.js` - 791 lines
2. `ReliabilityService.js` - 750 lines
3. `moderationService.js` - 740 lines
4. `StudioRequestService.js` - 700 lines
5. `NotificationEngine.js` - 643 lines

**Recommendation**: These files are large but appear to be actively used. Consider refactoring into smaller modules if they contain distinct responsibilities.

## Code Quality Issues Flagged

### Naming Convention Issues

## 🔧 RESOLVED: Deleted Redundant Service Files

#### ✅ friendService.js - DELETED
**Former File**: `/c/dev/bvs-app/src/services/friendService.js`
**Resolution Date**: 2025-10-04

**Issue**: File was a misleading compatibility layer that just re-exported from three other services.

**Actions Taken**:
1. ✅ Updated `userService.js` to import `checkIfFavorite` from `shared/userRelationshipsService`
2. ✅ Updated `events/services/invitations.js` to import `sendCohostInvitation` from `shared/cohostInvitationsService`
3. ✅ Deleted `friendService.js`

**Impact**: Cleaner imports, no more misleading file names, direct access to actual services.

#### ✅ invitationService.js - DELETED
**Former File**: `/c/dev/bvs-app/src/services/invitationService.js`
**Resolution Date**: 2025-10-04

**Issue**: Redundant file that wrapped `sendGuestInvitation` and contained UI formatting logic in a service.

**Actions Taken**:
1. ✅ Refactored `InviteScreen.js` to import `sendGuestInvitation` directly from `shared/guestInvitationsService`
2. ✅ Moved UI formatting logic inline into InviteScreen component
3. ✅ Deleted `invitationService.js`

**Impact**: Removed name collision with `events/services/invitations.js`, proper separation of concerns, cleaner architecture.

### File/Folder Structure Issues

## 🔧 RESOLVED: Duplicate Invitation Services

**Former Files**:
- `/c/dev/bvs-app/src/events/services/invitations.js` (1328 lines) - KEPT
- `/c/dev/bvs-app/src/services/invitationService.js` (164 lines) - DELETED
**Resolution Date**: 2025-10-04

**Resolution**: Deleted redundant `invitationService.js`. All invitation logic now consolidated in `events/services/invitations.js`.

### Spaghetti Code Patterns
**File**: `/c/dev/bvs-app/src/services/shared/NotificationEngine.js`
**Confidence**: **LOW**

**Issue**: Large file (643 lines) consolidating multiple notification responsibilities. While functionally organized, it's approaching complexity that might benefit from decomposition.

**Recommendation**: Monitor for further growth. Consider breaking into smaller, focused services if it continues to expand.

## Summary

**High Priority Actions**:
1. Remove unused Firebase imports from `userService.js` (6 imports)
2. Remove unused `writeBatch` from `studioStatsService.js`
3. Remove unused Firebase imports from `fcmService.js` (5 imports)
4. Delete 3 backup files
5. Investigate missing `deleteDoc` usage in `userDeletionService.js`

**Estimated Impact**:
- Cleaner import statements
- Reduced bundle size (minimal)
- Better code maintainability
- Removal of ~3 unnecessary backup files

**Safety Notes**:
- All recommended removals are unused imports with high confidence
- No functional code removal recommended without further investigation
- Backup file removal is safe due to version control

## Notification System Cleanup Audit (Post-Foreground Banner Fix)

### High Priority Notification Cleanup Items

### 9. Legacy Method Name in fcmService.js
**File**: `C:\dev\bvs-app\src\services\fcmService.js`
**Lines**: 300-302
**Confidence**: **HIGH**

**Legacy Method**:
```javascript
async getExpoPushToken() {
  return this.getFCMToken();
}
```

**Issue**: This method exists for backward compatibility but is now redundant since the system has been fully migrated to Firebase Cloud Messaging. The method name references "Expo" which is misleading.

**Recommendation**:
- Update all callers to use `getFCMToken()` directly
- Remove the legacy `getExpoPushToken()` method
- Files using this method: NotificationTester.js, testNotificationFunctions.js

### 10. Commented-out Authorization Logic
**File**: `C:\dev\bvs-app\src\services\shared\NotificationEngine.js`
**Lines**: 608-611
**Confidence**: **MEDIUM**

**Commented Code**:
```javascript
// Temporarily disabled for full FCM testing
// if (senderId === recipientId && type !== NOTIFICATION_TYPES.ADMIN_NOTIFICATION) {
//   return { authorized: false, reason: 'Cannot send notification to self' };
// }
```

**Issue**: Authorization check for self-notifications is commented out with a "temporary" note for testing, but this creates a security gap in production.

**Recommendation**: Re-enable this authorization check once testing is complete.

### 11. Unused DELIVERY_CHANNELS Constant
**File**: `C:\dev\bvs-app\src\services\shared\NotificationEngine.js`
**Lines**: 39-43
**Confidence**: **HIGH**

**Unused Export**: `DELIVERY_CHANNELS` constant is defined and exported but never used in implementation. All notifications currently use FCM push notifications only.

**Constants Defined**:
- `PUSH: 'push'`
- `IN_APP: 'in_app'`
- `EMAIL: 'email'`

**Recommendation**: Remove unused `DELIVERY_CHANNELS` constant or implement the planned multi-channel delivery system.

### 12. Redundant Import in NotificationTester.js
**File**: `C:\dev\bvs-app\src\components\ui\admin\NotificationTester.js`
**Line**: 4
**Confidence**: **HIGH**

**Issue**: Imports `fcmService` from `fcmServiceWrapper` when it could import directly from `fcmService.js` since the app is no longer using Expo Go.

**Current**: `import fcmService from '../../../services/fcmServiceWrapper';`
**Recommendation**: Change to `import fcmService from '../../../services/fcmService';` for clarity.

### Medium Priority Notification Items

### 13. TODO Comments in Notification System
**Files**: Multiple notification service files
**Confidence**: **MEDIUM**

**TODOs Found**:
- `src/lib/notificationUtils.js`: Contains 3 TODO comments for unimplemented push/email/in-app notification logic
- `src/events/services/invitations.js`: TODO for actual email invitation implementation
- `src/services/notificationInit.js`: TODO to replace with proper event-driven scheduling

**Recommendation**: Evaluate which TODOs are still relevant after the notification system consolidation.

### 14. Potentially Orphaned Notification Functions
**File**: `C:\dev\bvs-app\src\services\notifications.js`
**Lines**: Various
**Confidence**: **LOW**

**Functions with Limited Usage**:
- `notifyMention` - Only defined, not used elsewhere
- `notifyFriendRequest` - Only used in userRelationshipsService.js
- `notifyFriendRequestAccepted` - Re-exported but usage unclear

**Recommendation**: Cross-reference these functions to determine if they're truly needed for planned features.

### Low Priority Notification Items

### 15. Notification Engine File Size
**File**: `C:\dev\bvs-app\src\services\shared\NotificationEngine.js`
**Size**: 766 lines
**Confidence**: **LOW**

**Issue**: The NotificationEngine has grown significantly with the consolidation and now handles multiple concerns (authorization, sanitization, delivery, storage).

**Recommendation**: Consider breaking into smaller, focused modules:
- `NotificationAuthorizer.js`
- `NotificationSanitizer.js`
- `NotificationDelivery.js`
- `NotificationStorage.js`

### 16. Cloud Function Comment Consistency
**File**: `C:\dev\bvs-app\functions\notifications\adminPushNotifications.js`
**Lines**: 1-4, 15-19
**Confidence**: **LOW**

**Issue**: Function comments mention "admin notifications" in filename and initial comments, but the function handles both admin and engine notifications.

**Recommendation**: Update comments and possibly rename function to reflect its broader scope (e.g., `onPushNotificationTrigger`).

## Notification System Summary

**High Priority Actions**:
1. Remove legacy `getExpoPushToken()` method after updating callers
2. Re-enable self-notification authorization check
3. Remove unused `DELIVERY_CHANNELS` constant
4. Update import in NotificationTester.js

**Medium Priority Actions**:
1. Review and clean up notification-related TODO comments
2. Verify usage of potentially orphaned notification functions

**Safety Considerations**:
- The notification system is actively used and recently modified
- Authorization logic changes should be tested thoroughly
- Legacy method removal requires updating all callers first
- All Cloud Function changes should be tested in development environment

## 🔧 RESOLVED: Social Notifications Fix (2025-09-16)

### Issue: Missing Notification Types for Social Features
**Files**:
- `C:\dev\bvs-app\src\services\shared\NotificationEngine.js`
- `C:\dev\bvs-app\src\services\shared\socialNotificationsService.js`

**Problem**:
Social notification system was failing with error "Missing required notification parameters: userId and type" because `socialNotificationsService.js` was using notification types (`FOLLOW_REQUEST`, `FRIEND_REQUEST`, `FRIEND_ACCEPTED`) that weren't defined in `NotificationEngine.js`.

**Root Cause**:
Parameter mismatch between services - NotificationEngine only had `FOLLOW_NOTIFICATION` but SocialNotifications was using `FOLLOW_REQUEST`.

**Resolution**:
1. ✅ Added missing notification types to `NOTIFICATION_TYPES`:
   - `FOLLOW_REQUEST: 'follow_request'`
   - `FRIEND_REQUEST: 'friend_request'`
   - `FRIEND_ACCEPTED: 'friend_accepted'`

2. ✅ Added notification templates for new types:
   - Follow request: "New Follower!" + follower name message
   - Friend request: "New Friend Request" + requester name message
   - Friend accepted: "Friend Request Accepted!" + accepter name message

3. ✅ Updated authorization logic to handle new social notification types with proper permission checks

**Impact**:
- Follower notifications now work properly when someone follows a user
- Friend request system notifications are properly supported
- No more "Missing required notification parameters" errors for social features

**Testing**:
- Verified parameter mapping between services is correct
- Confirmed userId and type parameters are properly passed
- Authorization and template systems support new notification types