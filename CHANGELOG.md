# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Performance
- **Critical**: Optimized InviteScreen loading from 6-8 seconds to <1 second
  - Changed from per-user follow/favorite checks (27 sequential reads for 9 users) to bulk loading (2 reads total)
  - InviteScreen now loads follows/favorites once, then does instant Set lookups
  - Scales perfectly: 20,000 users would take <1 second instead of timing out
- Fixed iOS lockup when creating groups by memoizing expensive emoji calculations

### Fixed
- **CRITICAL**: Fixed ALL notification types completely broken for users without push notifications
  - **Root cause**: All Cloud Functions were checking for FCM token BEFORE creating any notifications
  - **Impact**: Users with push disabled, no APNs configured, or failed token registration got ZERO notifications (not even in-app)
  - **Solution**: Rewrote all 8 active Cloud Functions (13 notification types) to:
    1. ALWAYS create in-app notification in Firestore (`users/{userId}/notifications`)
    2. THEN check for FCM token
    3. If token exists, ALSO send push notification
    4. If no token, log warning but in-app notification was already created
  - **Fixed notification types**:
    - Event invitations (guest + cohost)
    - Host comments & guest comments on events
    - Event updates & deletions/cancellations
    - Cohost acceptance
    - New followers & mutual follows
    - Interest-based event suggestions
    - Someone joins/leaves your event
  - **App-side fix**: `acceptGuestInvitation()` now creates per-event notification settings automatically
  - **Backward compatibility**: Cloud Functions fall back to default notification templates if per-event settings don't exist
  - **Code cleanup**: Deleted legacy `commentNotifications.js` and `adminPushNotifications.js` (replaced by direct triggers)
- Fixed random InviteScreen causing Home screen to reload
  - Changed userData dependencies to only track specific fields (studioId, interests)
  - Prevents unnecessary reloads when unrelated userData fields change (timestamps, notifications, etc.)
- Fixed MessageBoard keyboard covering input on iOS
  - Added iOS-specific KeyboardAvoidingView to MessageBoard screen
  - Android continues to use root-level keyboard handling
- Fixed CreateGroupModal not opening on iOS
  - Changed Modal presentationStyle from "pageSheet" to "formSheet"
- Fixed HostEventNotificationsScreen causing unwanted navigation to CreateEvent
  - Removed debounced auto-save that was navigating on every settings change
  - Settings now only pass back to CreateEvent when explicitly clicking "UPDATE SETTINGS" or close button
  - Users can now edit notification settings without being kicked to CreateEvent screen

### Changed
- **iOS navigation**: Made all screen transitions faster and more opaque
  - Changed `presentation` to 'card' (solid screens, no transparency during transitions)
  - Reduced `animationDuration` from 350ms to 150ms (2.3x faster)
  - Applied to all navigation stacks for consistent feel
  - Maintains swipe-back gesture on iOS
- MessageBoard cards now have matching border and background tints based on user role:
  - Your messages: Green
  - Admins: Orange (swapped from purple)
  - Hosts: Purple (swapped from orange)
  - Other users: Blue
- Event cards for hosted events now use vibeBlue to vibePurple gradient (changed from yellow/orange)
- CreateEventScreen now has back button (X) in header that navigates to Home
  - Uses navigation.reset() to clear stack (prevents Android back button confusion)

### Added
- Admin banner on EventDetailScreen is now dismissible (tap X to hide)
- Private event banner on EventDetailScreen (purple with pink border, dismissible)

## [1.0.0] - Build 4

### Fixed
- **Critical**: Fixed scheduled notifications not being deleted when events are deleted
  - Added Cloud Function cleanup to delete all scheduled notifications for deleted events
  - Notifications now properly cleaned up from global `scheduledNotifications` collection
  - Added host user data cleanup (decrement `metrics.events.created` counter)
- Fixed event deletion to clean up all user references (subscribers, invitations, cohosts, host)

### Changed
- Event deletion cleanup now handled by Firebase Cloud Function (`onEventDeleted`) for guaranteed server-side execution
- Scheduled notifications cleanup moved from app-side to Cloud Function for reliability

## [1.0.0] - Build 3

### Fixed
- Fixed studio switching to properly update all studio fields (studioName, studioCity, studioState)
- Fixed event name input height to match other form inputs (removed extra padding)
- Fixed empty state vertical alignment with sticky button (now uses responsive percentage-based offset)

### Changed
- Empty state now centers properly between header and sticky "CREATE AN EVENT" button
- Empty state uses 15% screen height offset for better iPad/tablet support

## [1.0.0] - Build 2

### Fixed
- Fixed signup screen jumping/flashing on iOS when typing
- Fixed iOS text invites showing URL encoding (`%20`, `%3A`) instead of readable text
- Fixed iOS layout issues with compressed/overlapping content on notification screens
- Fixed transparent background flash on screen mount for iOS
- Fixed studio switching - events now created in correct studio after switching
- Fixed studio ID casing inconsistency (now all lowercase: `city_state`)

### Changed
- Simplified SMS invite message format to be less spammy
- Updated app name from "Big Vibe Studios" to "The Yo"
- InviteScreen now shows favorites and following from ALL studios, not just local studio
- "Local" filter now actually works (filters to local studio users only)
- Removed "CREATE EVENT" button from empty state (using sticky button instead)
- KeyboardAvoidingView now only active on Android (iOS uses per-screen handling)
- Studio requests now deleted from database after approval/rejection (cleanup)

### Added
- Initial TestFlight release
- Event creation and management
- User authentication and profiles
- Notification settings (with duplicate notification fix)
- Message boards
- Event subscriptions
- Host and guest features
- Past events sorting (most recent first)
