# BVS App Component Inventory

> **Quick Reference Guide** - Check here before creating new components to avoid duplicates!

This document provides a comprehensive inventory of all existing components in the BVS app, organized by type and purpose. Always consult this before creating new components.

---

## 🎨 Core UI Components

### Buttons
- **VibeButton** (`src/components/ui/VibeButton.js`)
  - Primary gradient button with default/toggle variants
  - Props: `label`, `onPress`, `variant`, `color`, `style`, `textStyle`
  - Supports multiple color themes (blue, green, orange, purple, etc.)

- **VibeButtonPlain** (`src/components/ui/VibeButtonPlain.js`)
  - Plain button variant without gradients
  - Props: Similar to VibeButton but without gradients

- **CloseButton** (`src/components/ui/CloseButton.js`)
  - Reusable close/back button for modals
  - Props: `onPress`, `style`, `textStyle`, `children` (default: "✕")

- **FollowButton** (`src/components/ui/FollowButton.js`)
  - Follow/unfollow button with loading states
  - Props: `isFollowing`, `isLoading`, `onFollow`, `onUnfollow`, `disabled`
  - Features: Automatic state management, consistent styling

- **BlockButton** (`src/components/ui/BlockButton.js`)
  - Reusable block button with dark red gradient aesthetic
  - Props: `onPress`, `isLoading`, `disabled`, `style`, `label`
  - Features: LinearGradient styling, loading state with ActivityIndicator, BVS theme compliance
  - Colors: Dark red gradient ['#CC0022', '#FF0844', '#AA001B']

- **MessageBoardButton** (`src/components/ui/buttons/MessageBoardButton.js`)
  - Navigation button to event message board with preview (131 lines)
  - Props: `eventId`, `eventTitle`, `navigation`
  - Features: Message count display, last message preview, loading states, useComments integration
  - **Used By**: EventDetailScreen, HomeScreen (for event cards)

### Inputs & Forms
- **VibeInput** (`src/components/ui/VibeInput.js`)
  - Styled text input with completion states
  - Props: `placeholder`, `value`, `onChangeText`, `isCompleted`, `multiline`, etc.
  - Supports all standard TextInput props

- **VibeDropdown** (`src/components/ui/VibeDropdown.js`)
  - Custom dropdown with styling
  - Props: `options`, `selectedValue`, `onSelect`, `placeholder`, `isCompleted`, `hideSelectedFromList`

- **VibeSegmentedControl** (`src/components/ui/VibeSegmentedControl.js`)
  - Multi-segment selection control
  - Props: `options`, `selectedValue`, `onSelect`, `style`
  - Supports icons in segments

- **AutoCompleteInput** (`src/components/ui/AutoCompleteInput.js`)
  - Input with contextual suggestions dropdown
  - Props: `value`, `onChangeText`, `context`, `maxSuggestions`, `showEmojis`

- **VibeAutoComplete** (`src/components/ui/VibeAutoComplete.js`)
  - Advanced autocomplete with emoji support
  - Props: `suggestions`, `onSelect`, `visible`, `inputValue`, `context`, `showCount`

### Layout & Containers
- **VibeScreen** (`src/components/ui/VibeScreen.js`)
  - **⚠️ GLOBAL WRAPPER - USE ONLY AT APP LEVEL**
  - Provides background gradient, status bar, safe area
  - Props: `children`, `edges`

- **VibeModal** (`src/components/ui/VibeModal.js`)
  - Styled modal wrapper with gradient background
  - Props: `visible`, `onClose`, `title`, `children`, `showCloseButton`, `scrollable`

- **VibeCarousel** (`src/components/ui/VibeCarousel.js`)
  - Horizontal scrolling carousel
  - Props: `data`, `renderItem`
  - Handles scroll states and gesture recognition

### Visual Elements
- **VibeSeparator** (`src/components/ui/VibeSeparator.js`)
  - Visual separator line
  - Props: `style`, `color`, `height`

- **VibeAnalogClock** (`src/components/ui/VibeAnalogClock.js`)
  - Interactive analog clock time picker
  - Props: `visible`, `onClose`, `onConfirm`, `initialTime`, `isFromTemplate`

- **VibeCalendar** (`src/components/ui/VibeCalendar.jsx`)
  - Custom calendar date picker with punk/cyberpunk theme
  - Props: `visible`, `onClose`, `onConfirm`, `initialDate`, `minimumDate`, `maximumDate`
  - Features: Replaces native iOS wheel picker, visual month/year navigation, punk-themed styling
  - Uses: `react-native-calendars` library with custom theme

- **VibeLoadingScreen** (`src/components/ui/VibeLoadingScreen.js`)
  - Loading screen with BVS branding
  - Props: `loadingText`, `showBranding`, `size`, `color`

- **ScreenHeader** (`src/components/ui/ScreenHeader.js`)
  - Standardized screen header with title and close button
  - Props: `title`, `count`, `onClose`, `showBorder`, `showCloseButton`
  - Features: Consistent header layout, optional count display

- **EmptyState** (`src/components/ui/EmptyState.js`)
  - Empty state display component
  - Props: `message`, `style`
  - Features: Consistent empty state styling across screens

### Feedback Components
- **StarRating** (`src/components/ui/feedback/StarRating.js`)
  - Reusable star rating component for user feedback
  - Props: `rating`, `maxStars`, `onRatingChange`, `disabled`, `size`, `style`
  - Features: Interactive star selection, configurable star count, size variants
  - Sizes: 'small', 'medium', 'large'

---

## 👤 User & Profile Components

### Avatars
- **UserAvatar** (`src/components/ui/UserAvatar.js`)
  - Avatar that fetches user data by userId
  - Props: `userId`, `size`, `style`
  - Auto-fetches user data from Firestore

- **ProfileAvatar** (`src/components/ui/ProfileAvatar.js`)
  - Avatar using existing userData
  - Props: `userData`, `size`, `showBorder`, `isLoading`
  - Supports profile pictures and initials fallback

### Profile Elements
- **UserProfileCard** (`src/components/ui/UserProfileCard.js`)
  - Complete user profile display card
  - Props: User profile data

- **ReliabilityBadge** (`src/components/ui/ReliabilityBadge.js`)
  - Displays user reliability score/tier
  - Props: `userData`, `onPress`, `size`, `showLabel`
  - Sizes: 'small', 'medium', 'large'

- **ReliabilityDetail** (`src/components/ui/ReliabilityDetail.js`)
  - Detailed reliability information display

- **ReliabilityWarning** (`src/components/ui/ReliabilityWarning.js`)
  - Warning component for reliability issues

- **ProfileSectionCard** (`src/components/ui/ProfileSectionCard.js`)
  - Reusable section container for profile screens
  - Props: `title`, `children`, `style`, `containerStyle`, `titleStyle`
  - Features: Consistent BVS styling with vibeBackgroundBlue container and vibeBlue border

- **ContactItem** (`src/components/ui/ContactItem.js`)
  - Individual contact field display component
  - Props: `icon`, `children`, `text`, `textStyle`, `style`, `isLast`
  - Features: Icon + text/children layout, automatic last item margin handling

- **UserStatsGrid** (`src/components/ui/UserStatsGrid.js`)
  - Reusable stats display grid for profile metrics
  - Props: `stats`, `onStatPress`, `isOwnProfile`
  - Features: Support for clickable stats on own profile, automatic TouchableOpacity wrapping

- **ProfileActionButtons** (`src/components/ui/ProfileActionButtons.js`)
  - Consolidated button logic for profile screens
  - Returns: `{ topButtons, bottomButtons }` for flexible placement
  - Features: Smart rendering based on profile ownership, report button safety checks, consistent styling
  - Props: `isOwnProfile`, `targetUserId`, `currentUserId`, `isEditing`, follow/block state, action handlers

---

## 🎉 Event-Related Components

### Event Forms (Event Creation Flow)
- **What** (`src/events/components/what/What.js`)
  - Event name and privacy settings
  - Uses VibeInput, VibeSegmentedControl, VibeAutoComplete

- **When** (`src/events/components/when/When.js`)
  - Date and time selection
  - Uses PickerRow component

- **Where** (`src/events/components/where/Where.js`)
  - Location and address input with Google Places
  - Uses VibeInput, VibeAutoComplete

- **Who** (`src/events/components/who/Who.js`)
  - Guest management and RSVP settings
  - Uses VibeInput, VibeDropdown, GuestListViewer

### Event Display & Management
- **EventCard** (`src/events/components/EventCard.js`)
  - Event card with gradient styling
  - Props: `title`, `eventTimestamp`, `location`, `onPress`, `isHostedByUser`
  - Different gradients for hosted vs regular events

- **EventTips** (`src/events/components/EventTips.js`)
  - Tips and guidance for event creation

- **CreateEventForm** (`src/events/components/CreateEventForm.js`)
  - Main event creation form container

### Event Detail Components (NEW)
- **EventActionButtons** (`src/events/components/detail/EventActionButtons.jsx`)
  - Comprehensive action buttons for event detail screen (215 lines)
  - Props: `event`, `isEventPast`, `isSubscribed`, `isLoading`, `permissions`, `joinConstraints`, action handlers, `navigation`
  - Features: Subscribe/unsubscribe, invite guests, edit/delete, manage attendance, save as template, event recap
  - **Dependencies**: VibeButton, permission system, navigation integration
  - **REUSE PRIORITY**: HIGH - Use for all event detail action logic

- **EventInfoSection** (`src/events/components/detail/EventInfoSection.jsx`)
  - Event information display with interactive elements (300+ lines)
  - Props: `event`, `currentUserId`, creator/cohost data, friend attendees, interests, event handlers
  - Features: Event details, privacy indicators, interest toggling, host profile, attendee modal
  - **Dependencies**: EventCreatorInfo, FormatDate, textUtils, mapUtils
  - **REUSE PRIORITY**: HIGH - Complete event info display logic

- **EventStatusBadges** (`src/events/components/detail/EventStatusBadges.jsx`)
  - Event status badges and notification settings (130 lines)
  - Props: `event`, `isSubscribed`, `onNotificationSettings`, `onReportEvent`
  - Features: Dynamic status badges, notification bell, report functionality, memoized calculations
  - **Dependencies**: eventUtils, theme system
  - **REUSE PRIORITY**: MEDIUM - Status display with notification integration

- **AttendeeSection** (`src/events/components/detail/AttendeeSection.jsx`)
  - Event detail attendee list modal (180+ lines)
  - Props: `visible`, `onClose`, `attendees`, `eventData`, `currentUserId`, `isHost`, `onKickAttendee`, `navigation`
  - Features: Virtualized attendee list, profile navigation, host management actions, kick functionality
  - **Dependencies**: ProfileAvatar, CloseButton, FlatList virtualization
  - **REUSE PRIORITY**: HIGH - Complete attendee management modal

### Attendee & Guest Management
- **GuestListViewer** (`src/events/components/guests/GuestListViewer.js`)
  - Displays current guests and hosts

- **GuestManager** (`src/events/components/guests/GuestManager.js`)
  - Manages guest list operations

- **InvitationCard** (`src/events/components/guests/InvitationCard.js`)
  - Individual invitation display card

### Attendance Components
- **AttendanceCard** (`src/components/ui/events/AttendanceCard.js`)
  - Individual user attendance management card (169 lines)
  - Props: `user`, `attendanceStatus`, `onMarkAttended`, `onMarkNoShow`, `disabled`
  - Features: User avatar, status display, attend/no-show buttons, reliability integration
  - **Dependencies**: ProfileAvatar, ReliabilityBadge, ReliabilityWarning
  - **REUSE PRIORITY**: HIGH - Use instead of custom participant cards

- **AttendanceStats** (`src/components/ui/events/AttendanceStats.js`)
  - Attendance statistics overview display (149 lines)
  - Props: `stats` object with rsvpCount, attendedCount, noShowCount, pendingCount, attendanceRate
  - Features: Professional stats grid with icons, attendance rate progress bar, gradient styling
  - **REUSE PRIORITY**: MEDIUM - Use instead of custom stats displays

- **AttendanceTracker** (`src/events/post-event/components/AttendanceTracker.js`)
  - **⚠️ REFACTOR NEEDED**: Post-event attendance tracking component (327 lines)
  - Props: `participants`, `attendanceTracking`, `eventType`, `onComplete`, `submitting`
  - Features: Toggle attendance, bulk actions, completion validation, custom participant list
  - **DUPLICATION ISSUE**: Custom participant rendering should use AttendanceCard instead
  - **MISSING**: Reliability integration, should use existing ProfileAvatar components

- **AttendeeSection** (`src/events/components/detail/AttendeeSection.jsx`)
  - Event detail attendee list modal
  - Props: `visible`, `onClose`, `attendees`, `eventData`, `currentUserId`, `isHost`, `onKickAttendee`, `navigation`
  - Features: Virtualized attendee list, profile navigation, host management actions

### Host Management
- **EventCreatorInfo** (`src/events/components/hosts/EventCreatorInfo.js`)
  - Displays event creator information

- **InviteHosts** (`src/events/components/invitations/InviteHosts.js`)
  - Host invitation interface

- **AdditionalHostsSelector** (`src/components/ui/AdditionalHostsSelector.js`)
  - Interface for selecting additional hosts

### Event Settings
- **AdditionalSettings** (`src/events/components/additionalSettings/AdditionalSettings.js`)
  - Additional event configuration options

- **Details** (`src/events/components/details/Details.js`)
  - Event detail display/editing

### Post-Event & Completion Components
- **EventWrapUpScreen** (`src/events/post-event/screens/EventWrapUpScreen.js`)
  - Unified event wrap-up screen for both hosts and guests (678 lines)
  - Props: Navigation with `eventId`, `studioId` params
  - Features: Dual-flow design, attendance tracking, host rating, self-reporting, event completion
  - **Components Used**: AttendanceTracker, PostEventActions, VibeScreen, VibeButton
  - **EXCELLENT REUSE**: Properly uses existing UI components and contexts

- **PostEventActions** (`src/events/post-event/components/PostEventActions.js`)
  - Post-event social actions and event management (426 lines)
  - Props: `participants`, `userStatus`, `eventData`, `onDeleteEvent`, `submitting`
  - Features: Follow/unfollow participants, event deletion, future features preview
  - **Dependencies**: followService, VibeButton, useAuth, useVibeAlert
  - **EXCELLENT REUSE**: Uses existing follow service infrastructure

- **useEventCompletion** (`src/events/post-event/hooks/useEventCompletion.js`)
  - Event completion state management hook (210 lines)
  - Functions: `completeEvent`, `reportAttendance`, `submitHostRating`, `deleteEvent`
  - Features: Host/guest flow management, validation, loading states
  - **Dependencies**: PostEventService, useVibeAlert

- **useAttendanceTracking** (`src/events/post-event/hooks/useAttendanceTracking.js`)
  - Attendance tracking state management hook (211 lines)
  - Functions: `toggleAttendance`, `markAllAttended`, `getAttendanceStats`, `validateAttendance`
  - Features: Bulk operations, validation, existing data loading
  - **Dependencies**: AttendanceService, useVibeAlert

- **GuestView** (`src/events/post-event/components/GuestView.js`)
  - Guest-specific post-event completion interface
  - Props: `eventData`, `onComplete`, `submitting`
  - Features: Host rating with StarRating, self-attendance reporting, completion validation
  - **Dependencies**: StarRating, VibeButton, theme

- **HostView** (`src/events/post-event/components/HostView.js`)
  - Host-specific post-event completion interface
  - Props: `participants`, `attendanceTracking`, `eventType`, `onComplete`, `submitting`
  - Features: Attendance tracking delegation to AttendanceTracker, completion validation
  - **Dependencies**: AttendanceTracker, VibeButton, theme

---

## 📱 Notification Components

### Core Notification UI
- **NotificationItem** (`src/components/notifications/NotificationItem.js`)
  - Individual notification with swipe-to-delete
  - Props: Comprehensive notification handling with actions
  - Supports multiple notification types and actions

- **NotificationButton** (`src/components/notifications/NotificationButton.js`)
  - Button for notification actions

- **NotificationBadge** (`src/components/notifications/NotificationBadge.js`)
  - Badge showing notification count

### Notification Forms
- **NotificationSettingsForm** (`src/components/notifications/NotificationSettingsForm.js`)
  - General notification preferences

- **HostNotificationSettingsForm** (`src/components/notifications/HostNotificationSettingsForm.js`)
  - Host-specific notification settings

- **GuestNotificationSettingsForm** (`src/components/notifications/GuestNotificationSettingsForm.js`)
  - Guest-specific notification settings

- **PersonalNotifications** (`src/components/notifications/PersonalNotifications.js`)
  - Personal notification management

- **ReminderListSection** (`src/components/notifications/ReminderListSection.js`)
  - Google Calendar-style reminder list with add/remove modal
  - Props: `settings`, `onUpdateSettings`, `isLoadingTemplates`, `currentUserId`, `userContext`, `sectionStyle`
  - Features: Vertical list of active reminders, preset picker modal, custom time input, backward-compatible template ID parsing
  - **Used By**: HostNotificationSettingsForm, GuestNotificationSettingsForm
  - **REUSE PRIORITY**: HIGH - Single source for all reminder UI logic

---

## 💬 Comments & Discussion (Message Board System)

### Core Comment/Message Components
- **CommentSection** (`src/components/ui/comments/CommentSection.js`)
  - Complete commenting system for events and message boards
  - Props: `eventId`
  - Features: Full comment management with real-time updates

- **CommentList** (`src/components/ui/comments/CommentList.js`)
  - List container for comments/messages
  - Props: Comment data array, rendering configuration
  - Features: Scroll management, performance optimization

- **CommentItem** (`src/components/ui/comments/CommentItem.js`)
  - **⚠️ REUSE FOR MESSAGE DISPLAY**: Individual comment/message item component
  - Props: `comment`, `onDelete`
  - Features: User avatar, timestamp, content display, owner actions, user data fetching
  - **USE INSTEAD OF**: Creating separate MessageItem component

- **AddCommentInput** (`src/components/ui/comments/AddCommentInput.js`)
  - **⚠️ REUSE FOR MESSAGE INPUT**: Comment/message input with validation
  - Props: `onAddComment`, `submitting`, `disabled`
  - Features: Content validation, submission handling, keyboard management, error handling
  - **USE INSTEAD OF**: Creating separate MessageInput component

### Message Board Specific
- **MessageBoardButton** (`src/components/ui/buttons/MessageBoardButton.js`)
  - Navigation button to message board with preview
  - Props: `eventId`, `eventTitle`, `navigation`
  - Features: Message count display, last message preview, loading states

### Future Threading Support
- **ThreadView** (`src/components/ui/comments/ThreadView.js`) - **PLANNED COMPONENT**
  - Threading display component for nested conversations
  - Props: `threadId`, `parentComment`, `replies`, `onReply`, `maxDepth`
  - Features: Nested reply rendering, thread collapse/expand, depth limiting
  - **STATUS**: Not yet implemented - safe to create when needed

### Supporting Infrastructure
- **useComments** (`src/components/ui/comments/hooks/useComments.js`)
  - Comment/message data management hook
  - Functions: Real-time comment loading, submission, deletion, error handling
  - **USED BY**: MessageBoardScreen, CommentSection

- **commentUtils** (`src/components/ui/comments/utils/commentUtils.js`)
  - Comment validation and formatting utilities
  - Functions: `validateComment`, `formatTimestamp`, content processing
  - Features: Length validation, content sanitization, timestamp formatting

- **attendanceUtils** (`src/lib/attendanceUtils.js`)
  - Attendance calculation and display utilities
  - Functions: `getAttendanceStatus`, `calculateAttendanceStats`, `getAttendanceStatusColor`, `getAttendanceStatusText`, `canMarkAttendance`, `isSoloEvent`
  - Features: Status calculations, display formatting, validation, completion tracking

---

## 🔧 Utility & Helper Components

### State & Context
- **VibeAlertContext** (`src/components/ui/VibeAlertContext.js`)
  - Global alert/notification system
  - Methods: `alert`, `info`, `success`, `error`, `warning`, `confirm`
  - Colored variants: `cyan`, `turquoise`, `aqua`, `teal`

## 📚 UTILITY LIBRARIES INVENTORY (NEW SECTION)

> **Critical Support Libraries** - Use these instead of implementing custom solutions!

### Array & Data Operations
- **arrayOperationUtils** (`src/lib/arrayOperationUtils.js`)
  - Safe array operations with comprehensive validation (150+ lines)
  - Functions: `safeArrayIncludes`, `safeArrayPush`, `safeArrayRemove`, `deduplicateArray`, `safeArrayMap`
  - Features: Null/undefined handling, error recovery, performance optimization
  - **REUSE PRIORITY**: HIGH - Use for all array operations to prevent bugs

- **attendanceUtils** (`src/lib/attendanceUtils.js`)
  - Attendance calculation and display utilities
  - Functions: Status calculations, display formatting, validation, completion tracking
  - **Already documented above in infrastructure section**

### Text & Display Utilities
- **textUtils** (`src/lib/textUtils.js`)
  - Text processing and emoji handling utilities (100+ lines)
  - Functions: `extractEmoji`, `parseEmojiAndTitle`, `formatDisplayName`, text processing
  - Features: Emoji extraction, title cleaning, display name formatting
  - **REUSE PRIORITY**: HIGH - Use for all text processing needs

- **userDisplayUtils** (`src/lib/userDisplayUtils.js`)
  - User display name and data utilities (80+ lines)
  - Functions: `extractDisplayName`, display name extraction with proper fallback logic
  - Features: Database structure awareness, consistent display logic, "Unknown Host" fixes
  - **REUSE PRIORITY**: HIGH - Solves "Unknown Host" issues across app

### Interest & Social Utilities
- **interestUtils** (`src/lib/interestUtils.js`)
  - Interest utility functions for user interest operations (100+ lines)
  - Functions: `compareInterestsIgnoreCase`, `hasInterest`, `toggleInterestInArray`, `addInterestToArray`, `removeInterestFromArray`
  - Features: Case-insensitive comparison, array manipulation, interest validation
  - **REUSE PRIORITY**: HIGH - Use for all interest-related operations

- **socialUtils** (`src/lib/socialUtils.js`)
  - Social interaction and relationship utilities
  - Functions: Social relationship management, friend operations
  - Features: Relationship validation, social graph operations

### Location & Map Utilities
- **mapUtils** (`src/lib/mapUtils.js`)
  - Map and location utilities for cross-platform navigation (75 lines)
  - Functions: `openMapsWithLocation`, `formatLocationQuery`, platform-specific map opening
  - Features: iOS/Android map app integration, location formatting, error handling
  - **REUSE PRIORITY**: MEDIUM - Use for all map navigation features

- **locationUtils** (`src/lib/locationUtils.js`)
  - Location processing and geolocation utilities
  - Functions: Location validation, coordinate processing, distance calculation
  - Features: Geographic operations, location validation

### Validation & Processing
- **validationUtils** (`src/lib/validationUtils.js`)
  - General validation utilities for forms and data
  - Functions: Input validation, data sanitization, format checking
  - Features: Comprehensive validation patterns, error handling

- **transactionUtils** (`src/lib/transactionUtils.js`)
  - Transaction and atomic operation utilities
  - Functions: Database transaction helpers, atomic operations
  - Features: Safe database operations, rollback handling

### Performance & Search
- **searchUtils** (`src/lib/searchUtils.js`)
  - Search and filtering utilities
  - Functions: Search algorithms, filtering logic, query processing
  - Features: Optimized search patterns, case-insensitive matching

### Specialized Utilities
- **emojiUtils** (`src/lib/emojiUtils.js`)
  - Emoji processing and validation utilities
  - Functions: Emoji detection, validation, formatting
  - Features: Unicode emoji handling, emoji validation

- **indexOfErrorFix** (`src/lib/indexOfErrorFix.js`)
  - Fixes for common indexOf errors and edge cases
  - Functions: Safe indexOf operations, error prevention
  - Features: Edge case handling, error recovery

### Data Display
- **EmptyStateView** (`src/components/ui/EmptyStateView.js`)
  - Empty state for when no content is available
  - Props: `navigation`

- **QRCodeGenerator** (`src/components/ui/QRCodeGenerator.jsx`)
  - QR code generation for users/events/app downloads
  - Props: `type`, `data`, `size`, `showShareButton`, `onShare`
  - Types: 'user', 'event', 'app-download'

### Lists & Selection
- **SocialUserItem** (`src/components/ui/SocialUserItem.js`)
  - Individual user item for social lists
  - Props: `user`, `currentUserId`, `onUserPress`, `onFollow`, `onUnfollow`, `isLoading`
  - Features: User avatar, display name, location, follow/unfollow actions

- **FriendsList** (`src/components/ui/FriendsList.js`)
  - Friends list display

- **FriendItem** (`src/components/ui/FriendItem.js`)
  - Individual friend list item

- **FriendsBucket** (`src/components/ui/FriendsBucket.js`)
  - Container for friend groupings

### Contact & Invite Management
- **InviteFriendsSelector** (`src/components/ui/InviteFriendsSelector.js`)
  - Interface for selecting friends to invite

- **InviteCodeInput** (`src/components/ui/InviteCodeInput.js`)
  - Input component for invite codes

- **PhoneInviteList** (`src/components/ui/PhoneInviteList.js`)
  - List for phone contact invitations

### Invite Screen Components (Screen-Specific)
- **InviteScreenHeader** (`src/screens/invite/components/InviteScreenHeader.js`)
  - **⚠️ DUPLICATE FUNCTIONALITY**: Similar to ScreenHeader - consider consolidation
  - Header component for InviteScreen with title and close button
  - Props: `title`, `onClose`

- **TabSelector** (`src/screens/invite/components/TabSelector.js`)
  - **⚠️ DUPLICATE FUNCTIONALITY**: Custom tab selector - VibeSegmentedControl could be used instead
  - Three-tab selector for App Users, Phone Contacts, and QR Code tabs
  - Props: `activeTab`, `setActiveTab`

- **AppUsersTab** (`src/screens/invite/components/tabs/AppUsersTab.js`)
  - Tab for selecting app users with filtering and group management
  - Features: Search, favorite/friend filters, interest-based filtering, group selection

- **PhoneContactsTab** (`src/screens/invite/components/tabs/PhoneContactsTab.js`)
  - Tab for selecting device phone contacts
  - Features: Contact permission handling, search, selection management

- **QRCodeTab** (`src/screens/invite/components/tabs/QRCodeTab.js`)
  - Tab for QR code invitation sharing
  - Features: QR code generation for events and app downloads

- **SelectedItemsList** (`src/screens/invite/components/lists/SelectedItemsList.js`)
  - Displays selected users and contacts with removal capability
  - Features: Mixed user/contact display, remove actions

- **UserListItem** (`src/screens/invite/components/lists/UserListItem.js`)
  - **⚠️ SIMILAR TO EXISTING**: Compare with SocialUserItem for potential consolidation
  - Individual user item for selection with avatars and checkmarks
  - Props: `item`, `isSelected`, `canSelect`, `themeColor`, `onPress`, `onAvatarPress`

- **ContactListItem** (`src/screens/invite/components/lists/ContactListItem.js`)
  - Individual phone contact item for selection
  - Features: Contact info display, selection indicators

- **GroupManagementModal** (`src/screens/invite/components/groups/GroupManagementModal.js`)
  - Modal for managing custom user groups
  - Features: Group CRUD operations, member management

- **CreateGroupModal** (`src/screens/invite/components/groups/CreateGroupModal.js`)
  - Modal for creating new custom groups
  - Features: Group name input, validation

- **GroupFilterSection** (`src/screens/invite/components/groups/GroupFilterSection.js`)
  - Filter section for group-based user filtering
  - Features: Group selection, filter management

- **FilterSection** (`src/screens/invite/components/tabs/FilterSection.js`)
  - General filter section for various user filtering options
  - Features: Favorites, friends, interests, location filters

### Admin & Moderation
- **AdminNotificationModal** (`src/components/ui/AdminNotificationModal.js`)
  - Modal for admin notifications

- **AdminNotificationTool** (`src/components/ui/AdminNotificationTool.js`)
  - Admin notification management tool

- **BannedUserModal** (`src/components/ui/BannedUserModal.js`)
  - Modal for banned user information

- **ModerationInfo** (`src/components/ui/ModerationInfo.js`)
  - Moderation information display

- **ModerationActionModal** (`src/components/ui/ModerationActionModal.js`)
  - Modal for moderation actions

### Settings & Account
- **AccountSettingsModal** (`src/components/ui/AccountSettingsModal.js`)
  - User account settings interface

---

## 🚨 Potential Duplicates & Issues Found

### Similar Components (Review for Consolidation)
1. **Header Components** - ⚠️ NEWLY IDENTIFIED:
   - `InviteScreenHeader` vs `ScreenHeader` - Nearly identical functionality
   - **RECOMMENDATION**: Replace InviteScreenHeader with ScreenHeader (supports title, onClose, optional count)
   - **IMPACT**: Remove duplicate component, improve consistency

2. **Tab/Segmented Controls** - ⚠️ NEWLY IDENTIFIED:
   - `TabSelector` (invite screen) vs `VibeSegmentedControl` - Similar tab selection functionality
   - **RECOMMENDATION**: Refactor InviteScreen to use VibeSegmentedControl instead of custom TabSelector
   - **IMPACT**: Remove custom tab implementation, standardize UI patterns

3. **User List Components** - ⚠️ NEWLY IDENTIFIED:
   - `UserListItem` (invite) vs `SocialUserItem` - Both display users with avatars and actions
   - **DIFFERENCES**: UserListItem has selection checkmarks, SocialUserItem has follow actions
   - **RECOMMENDATION**: Consider creating unified UserItem component with configurable action types

4. **Avatar Components**:
   - `UserAvatar` vs `ProfileAvatar` - Different data sources but similar purpose
   - Consider: Could be unified with a single flexible avatar component

5. **Notification Buttons**:
   - `NotificationButton` (notifications/) vs `NotificationButton` (events/components/notificationSettings/)
   - **Location conflict detected** - same name, different paths

6. **Reliability Components**:
   - `ReliabilityWarning` (ui/) vs `ReliabilityWarning` (events/components/attendees/)
   - **Potential duplicate** - need to verify if functionality differs

7. **AutoComplete Components**:
   - `AutoCompleteInput` vs `VibeAutoComplete` - Similar functionality
   - Consider: `AutoCompleteInput` uses `VibeAutoComplete` internally, may be redundant wrapper

8. **Event Completion Components** - ⚠️ NEWLY IDENTIFIED:
   - `AttendanceTracker` (post-event) vs `AttendanceCard` - Major functionality overlap
   - **ISSUE**: AttendanceTracker reimplements participant display instead of using AttendanceCard
   - **RECOMMENDATION**: Refactor AttendanceTracker to use AttendanceCard components
   - **IMPACT**: Would add reliability integration, reduce 150+ lines of duplicate code
   - **MISSING**: StarRating component (inline in EventWrapUpScreen), StatusBadge components

### Missing Common Patterns
Based on usage analysis, consider creating:
1. **VibeListItem** - Standardized list item component
2. **VibeCard** - Generic card wrapper (EventCard is very specific)
3. **VibeIconButton** - Icon-only button variant
4. **VibeSearchInput** - Search-specific input with clear functionality
5. **StarRating** - Reusable star rating component (currently inline in EventWrapUpScreen)
6. **StatusBadge** - Generic status indicator (attendance, completion states)
7. **ParticipantListItem** - Standardized participant display with actions

---

## 🎯 Usage Guidelines

### Before Creating New Components:
1. **Search this document** for existing functionality
2. **Check similar components** that might be extended
3. **Consider composition** over creating new components
4. **Follow naming convention**: `Vibe[ComponentName]` for UI, descriptive names for domain components

### Component Reuse Priority:
1. **Core UI components** (`VibeButton`, `VibeInput`, etc.) - Always reuse
2. **Domain components** (Event, User, etc.) - Extend or compose when possible
3. **Utility components** - Reuse and enhance rather than duplicate

### File Organization:
- **Global UI**: `src/components/ui/`
- **Domain-specific**: `src/[domain]/components/`
- **Feature-specific**: `src/[domain]/components/[feature]/`

---

## 📱 SCREENS INVENTORY

> **Quick Reference Guide** - Check here before creating new screens to see what already exists!

### Authentication Flow Screens
- **LandingScreen** (`src/screens/LandingScreen.js`) - Route: `Landing`
  - App introduction and unified authentication entry point
  - Features: Combined login/signup with toggle, modern auth UX
  - **✅ OPTIMIZED**: Perfect component reuse, no duplications detected



- **ContactInfoScreen** (`src/auth/screens/ContactInfoScreen.js`) - Route: `ContactInfo`
  - Collects user's contact information during onboarding
  - Features: Phone/email input, profile setup, validation

- **LocationScreen** (`src/auth/screens/LocationScreen.js`) - Route: `Location`
  - Studio location selection during onboarding
  - Features: Studio picker, location-based services, onboarding completion

### Main App Screens
- **HomeScreen** (`src/screens/HomeScreen.js`) - Route: `Home`
  - Main dashboard showing user's events and feed
  - Features: Event carousels, user profile, navigation hub, ban enforcement

- **UserProfileScreen** (`src/screens/UserProfileScreen.js`) - Route: `UserProfile`
  - Individual user profile display and management
  - Features: Profile viewing, friend management, reliability scores

- **HostProfileScreen** (`src/screens/HostProfileScreen.js`) - Route: `HostProfile`
  - Host-specific profile view and management
  - Features: Host stats, event management, host-specific settings

- **AdminScreen** (`src/screens/AdminScreen.js`) - Route: `Admin`
  - Administrative interface for app management
  - Features: User moderation, studio management, admin tools

### Event Management Screens
- **CreateEventScreen** (`src/events/screens/CreateEventScreen.js`) - Route: `CreateEvent`
  - Event creation interface with form validation
  - Features: Event form, template system, date/time pickers, guest management

- **EventDetailScreen** (`src/events/screens/EventDetailScreen.js`) - Route: `EventDetail`
  - Event details view and management
  - Features: Event info, RSVP controls, attendance tracking, comments

- **EditEventScreen** (`src/events/screens/EditEventScreen.js`) - Route: `EditEvent`
  - Event editing interface for existing events
  - Features: Form prefilling, validation, update handling

- **InviteGuestsScreen** (`src/events/screens/InviteGuestsScreen.js`) - Route: `InviteGuests`
  - Guest invitation interface for events
  - Features: User selection, contact integration, invitation sending

- **InvitationsScreen** (`src/events/screens/InvitationsScreen.js`) - Route: `Invitations`
  - Manage event invitations sent to users
  - Features: Invitation status, resending, cancellation

- **AttendanceScreen** (`src/events/screens/AttendanceScreen.js`) - Route: `EventAttendance`
  - Event attendance tracking and management
  - Features: Check-in/out, attendance stats, host tools

- **EventWrapUpScreen** (`src/events/post-event/screens/EventWrapUpScreen.js`) - Route: `EventWrapUp`
  - Post-event completion and wrap-up flow
  - Features: Dual-flow (host/guest), attendance finalization, host rating, self-reporting
  - Components: AttendanceTracker, host rating system, completion validation

### Social & Communication Screens
- **InviteScreen** (`src/screens/InviteScreen.js`) - Route: `Invite`
  - Comprehensive user invitation interface with complex state management
  - Features: Multi-tab user selection (App Users, Phone Contacts, QR Codes), group management, interest-based filtering
  - Components: Uses InviteScreenHeader, TabSelector, AppUsersTab, PhoneContactsTab, QRCodeTab, SelectedItemsList
  - Hooks: useInviteScreenState, useContactManagement, useGroupManagement, useSelectionHandlers, useUserInterests

- **SocialListScreen** (`src/screens/SocialListScreen.js`) - Route: `SocialList`
  - Social connections and friends list
  - Features: Friend management, social interactions

- **MessageBoardScreen** (`src/screens/MessageBoardScreen.js`) - Route: `MessageBoard`
  - Event-specific message board and real-time discussions (497 lines)
  - Features: Real-time messaging using existing comment infrastructure, message list management, auto-scroll to bottom
  - **Components Used**: CommentItem (for messages), AddCommentInput (for message input), useComments hook
  - **Refactoring Status**: ⚠️ Uses existing comment components - no new MessageItem/MessageInput needed
  - **Future Enhancement**: ThreadView component for threading support (not yet implemented)

### Notification & Settings Screens
- **NotificationsScreen** (`src/screens/NotificationsScreen.js`) - Route: `Notifications`
  - User notification center and management
  - Features: Notification list, actions, mark as read, filtering

- **NotificationSettingsScreen** (`src/screens/NotificationSettingsScreen.js`) - Route: `NotificationSettings`
  - General notification preferences
  - Features: Global notification toggles, delivery preferences

- **EventNotificationSettingsScreen** (`src/events/screens/EventNotificationSettingsScreen.js`) - Route: `EventNotificationSettings`
  - Event-specific notification preferences
  - Features: Per-event notification controls, reminder settings
  - **Recently Updated**: Moved to correct location, removed dead code, fixed memory leak

- **PrivacySettingsScreen** (`src/screens/PrivacySettingsScreen.js`) - Route: `Privacy`
  - Privacy controls and data management
  - Features: Privacy toggles, data controls, account settings

- **InterestsScreen** (`src/screens/InterestsScreen.js`) - Route: `Interests`
  - User interests management and selection
  - Features: Interest tagging, preference management

### Post-Event Screens
- **HostEventWrapUpScreen** (`src/screens/HostEventWrapUpScreen.js`) - Route: `HostEventWrapUp`
  - Post-event summary and actions for hosts
  - Features: Event summary, attendee feedback, metrics

- **GuestEventWrapUpScreen** (`src/screens/GuestEventWrapUpScreen.js`) - Route: `GuestEventWrapUp`
  - Post-event feedback and actions for guests
  - Features: Event rating, feedback, follow-up actions

---

## 🔧 HOOKS & SERVICES INVENTORY

> **Quick Reference Guide** - Check existing hooks and services before creating new ones!

### Form Management Hooks
- **useEventFormState** (`src/events/hooks/useEventFormState.js`)
  - Core event form state management with dirty tracking
  - Functions: `updateFormField`, `resetForm`, `setFormData`, `isDirty`
  - Features: Default form structure, validation integration

- **useEventForm** (`src/events/hooks/useEventForm.js`)
  - High-level event form logic and submission
  - Functions: Form validation, submission handling, error management
  - Dependencies: Firebase Firestore, AuthContext

- **useDateTimePickers** (`src/events/hooks/useDateTimePickers.js`)
  - Date and time picker state management
  - Functions: Date/time selection, validation, formatting
  - Features: Multi-picker coordination, timezone handling

### Data Management Hooks
- **useSuggestions** (`src/events/hooks/useSuggestions.js`)
  - Basic autocomplete suggestion handling
  - Functions: Suggestion fetching, filtering, selection
  - Features: Context-aware suggestions

- **useSmartAutoComplete** (`src/events/hooks/useSmartAutoComplete.js`)
  - Enhanced autocomplete with smart suggestions
  - Functions: Advanced suggestion logic, learning, context analysis
  - Features: Past event learning, user preference integration

- **useSuggestionsManager** (`src/events/hooks/useSuggestionsManager.js`)
  - Centralized suggestion state management
  - Functions: Multiple suggestion contexts, caching, performance optimization
  - Features: Cross-component suggestion sharing

- **usePastEventsManager** (`src/events/hooks/usePastEventsManager.js`)
  - Past event data handling and learning
  - Functions: Event history analysis, suggestion generation
  - Dependencies: Firestore, user event history

### Attendance Management Hooks
- **useAttendanceTracking** (`src/events/post-event/hooks/useAttendanceTracking.js`)
  - Post-event attendance tracking state management
  - Functions: `toggleAttendance`, `markAllAttended`, `clearAllAttendance`, `getAttendanceStatus`, `getAttendanceStats`
  - Features: Bulk operations, attendance validation, completion tracking
  - Dependencies: AttendanceService, event data

### Template System Hooks
- **useTemplateManager** (`src/events/hooks/templates/useTemplateManager.js`)
  - Template creation, storage, and application
  - Functions: Save/load templates, template application, management
  - Features: Custom templates, template sharing

- **useTemplateStorage** (`src/events/hooks/templates/useTemplateStorage.js`)
  - Template persistence and storage management
  - Functions: Local storage, cloud sync, template caching
  - Dependencies: AsyncStorage, Firestore

### Event Management Hooks (NEW)
- **useEventPermissions** (`src/events/hooks/useEventPermissions.js`)
  - Event permission calculation with memoization (45 lines)
  - Functions: `permissions`, `joinConstraints` calculation based on user role and event state
  - Features: Creator/cohost/admin permissions, join validation, memoized calculations
  - **Dependencies**: eventUtils.getUserEventPermissions, eventUtils.validateEventJoinConstraints
  - **REUSE PRIORITY**: HIGH - Use for all event permission logic

- **useEventStatus** (`src/events/hooks/useEventStatus.js`)
  - Event status information with memoized calculations (55 lines)
  - Functions: `eventStatus`, `statusColor`, `isEventPast`, `isEventFull` calculation
  - Features: Status calculations, color mapping, memoized performance optimization
  - **Dependencies**: eventUtils status functions
  - **REUSE PRIORITY**: HIGH - Use instead of inline status calculations

- **useInterestToggle** (`src/events/hooks/useInterestToggle.js`)
  - Interest toggle functionality with optimistic updates (65 lines)
  - Functions: `handleInterestToggle`, loading state management
  - Features: Optimistic UI updates, error recovery, concurrent operation prevention
  - **Dependencies**: interestUtils, interestService
  - **REUSE PRIORITY**: MEDIUM - Interest toggling across multiple screens

### Notification Hooks
- **useRealtimeNotifications** (`src/hooks/useRealtimeNotifications.js`)
  - Real-time notification listening and handling
  - Functions: Live notification updates, badge management
  - Dependencies: Firestore listeners, FCM

- **useScheduledNotifications** (`src/hooks/useScheduledNotifications.js`)
  - Scheduled notification management
  - Functions: Schedule/cancel notifications, reminder management
  - Features: Event reminders, deadline notifications

- **useEventEndNotifications** (`src/hooks/useEventEndNotifications.js`)
  - Post-event notification handling
  - Functions: Event completion notifications, wrap-up triggers
  - Features: Automatic post-event flows

### User & Social Hooks
- **useReliability** (`src/hooks/useReliability.js`)
  - User reliability score management
  - Functions: Score calculation, tier determination, history tracking
  - Features: Reliability analytics, improvement suggestions

- **useSocialList** (`src/hooks/useSocialList.js`)
  - Social list data management (friends, followers, following)
  - Functions: `loadUsers`, data loading, error handling
  - Features: Automatic data loading, error recovery

- **useUserSearch** (`src/hooks/useUserSearch.js`)
  - User search and filtering functionality
  - Functions: Search query management, real-time filtering
  - Features: Memoized filtering, search state management

- **useFollowActions** (`src/hooks/useFollowActions.js`)
  - Follow/unfollow action handling with loading states
  - Functions: `handleFollow`, `handleUnfollow`, loading management
  - Features: Individual user loading states, error handling

### Invite Screen Specific Hooks
- **useInviteScreenState** (`src/screens/invite/hooks/useInviteScreenState.js`)
  - Complex invite screen state management with 20+ state variables
  - Functions: Tab management, selection state, filtering, form state, group modals
  - Features: Multi-tab coordination, local selection tracking, filter toggles
  - State: activeTab, searchQuery, form fields, filter flags, group states, selection arrays

- **useContactManagement** (`src/screens/invite/hooks/useContactManagement.js`)
  - Phone contact integration and app user data management
  - Functions: Contact fetching, permission handling, app user loading, event subscriber handling
  - Dependencies: Phone contacts API, permissions, Firestore
  - Features: Device contact sync, app user filtering, event-based user loading

- **useGroupManagement** (`src/screens/invite/hooks/useGroupManagement.js`)
  - User group creation and management
  - Functions: Group CRUD operations, member management, group selection logic
  - Features: Custom user groupings, group persistence, bulk user operations

- **useSelectionHandlers** (`src/screens/invite/hooks/useSelectionHandlers.js`)
  - User selection logic with limit enforcement and multi-type handling
  - Functions: toggleUserSelection, togglePhoneContactSelection, remove operations
  - Features: Max limit validation, selection constraints, multi-selection types (users, contacts, phone contacts)

- **useUserInterests** (`src/screens/invite/hooks/useUserInterests.js`)
  - User interest matching and filtering for smart recommendations
  - Functions: Interest-based filtering, user interest mapping
  - Features: Interest-based user suggestions, filtering optimization

### Performance & Optimization Hooks (NEW)
- **useInterestLookup** (`src/hooks/useInterestLookup.js`)
  - Optimized interest lookup for performance-critical components (50 lines)
  - Functions: `isUserInterested`, `getOriginalInterest`, `interestCount`
  - Features: Map-based O(1) lookups, case-insensitive matching, memoized performance
  - **REUSE PRIORITY**: HIGH - Use instead of Array.includes for interest checks
  - **PERFORMANCE**: Prevents expensive O(n) array searches in render loops

### Post-Event Management Hooks (NEW)
- **useEventCompletionManager** (`src/events/post-event/hooks/useEventCompletionManager.js`)
  - Composite hook for complete event completion management (150+ lines)
  - Functions: Combines useEventWrapUpData, useAttendanceTracking, useHostActions, useGuestActions
  - Features: Unified event completion interface, proper hook composition pattern
  - **Dependencies**: Multiple focused hooks following composition pattern
  - **REUSE PRIORITY**: HIGH - Example of proper hook composition

- **useEventWrapUpData** (`src/events/post-event/hooks/useEventWrapUpData.js`)
  - Event wrap-up data loading and management
  - Functions: Data loading, event information, participant management
  - Features: Comprehensive event wrap-up data coordination

- **useHostActions** (`src/events/post-event/hooks/useHostActions.js`)
  - Host-specific post-event actions and state management
  - Functions: Host completion actions, attendance management, event finalization
  - Features: Host-specific workflows, validation

- **useGuestActions** (`src/events/post-event/hooks/useGuestActions.js`)
  - Guest-specific post-event actions and state management
  - Functions: Guest completion actions, host rating, self-reporting
  - Features: Guest-specific workflows, rating submission

---

## 🔥 Firebase Services

### Authentication Services
- **FirebaseAuthService** (`src/auth/services/FirebaseAuthService.js`)
  - Core authentication operations
  - Functions: `signup`, `login`, `logout`, `useAuthState`
  - Features: Email/password auth, auth state management

- **firebase** (`src/auth/services/firebase.js`)
  - Firebase configuration and initialization
  - Exports: `auth`, `db`, `app` instances
  - Features: Firebase app setup, service configuration

### User & Profile Services
- **userService** (`src/services/userService.js`)
  - User data management and friend operations
  - Functions: `getStudioUsers`, user CRUD operations, friend management
  - Dependencies: Firestore, StudioStatsService

- **profilePictureService** (`src/services/profilePictureService.js`)
  - Profile picture upload and management
  - Functions: Image upload, avatar management, cloud storage
  - Features: Image optimization, fallback handling

- **userDeletionService** (`src/services/userDeletionService.js`)
  - User account deletion and cleanup
  - Functions: Account deletion, data cleanup, cascade operations
  - Features: GDPR compliance, complete data removal

### Event & Studio Services
- **StudioService** (`src/services/StudioService.js`)
  - Studio management and operations
  - Functions: Studio CRUD, member management, studio stats
  - Features: Multi-studio support, analytics

- **studioStatsService** (`src/services/studioStatsService.js`)
  - Studio analytics and metrics
  - Functions: Event analytics, member stats, performance metrics
  - Features: Real-time stats, trend analysis

- **AttendanceService** (`src/services/AttendanceService.js`)
  - Event attendance tracking
  - Functions: Check-in/out, attendance validation, reporting
  - Features: Real-time tracking, attendance analytics

- **VenueService** (`src/services/VenueService.js`)
  - Venue management and location services
  - Functions: Venue CRUD, location validation, mapping
  - Dependencies: Google Places API

### Notification Services
- **notificationService** (`src/services/notificationService.js`)
  - Core notification operations and batching
  - Functions: Smart comment batching, notification creation
  - Features: First comment instant, subsequent batched

- **fcmService** (`src/services/fcmService.js`)
  - Firebase Cloud Messaging integration
  - Functions: Token management, push notifications, device registration
  - Features: Cross-platform notifications

- **fcmServiceWrapper** (`src/services/fcmServiceWrapper.js`)
  - FCM service wrapper and initialization
  - Functions: Service initialization, cleanup, error handling
  - Features: Service lifecycle management

- **reminderService** (`src/services/reminderService.js`)
  - Event reminder scheduling and management
  - Functions: Reminder scheduling, cancellation, custom reminders
  - Features: Multiple reminder types, smart scheduling

- **eventNotificationScheduler** (`src/services/eventNotificationScheduler.js`)
  - Event-specific notification scheduling
  - Functions: Event lifecycle notifications, deadline reminders
  - Features: Automated event notification flows

### Location & Integration Services
- **LocationService** (`src/services/LocationService.js`)
  - Location and geolocation services
  - Functions: Location detection, address validation, distance calculation
  - Features: GPS integration, location history

- **GooglePlacesService** (`src/services/GooglePlacesService.js`)
  - Google Places API integration
  - Functions: Place search, autocomplete, place details
  - Features: Location suggestions, venue validation

- **emailService** (`src/services/emailService.js`)
  - Email communication and templates
  - Functions: Email sending, template management, notifications
  - Features: Transactional emails, email validation

### Social & Community Services
- **friendService** (`src/services/friendService.js`)
  - Friend relationship management
  - Functions: Friend requests, connections, social graph
  - Features: Mutual connections, friend suggestions

- **followService** (`src/services/followService.js`)
  - User following and social connections
  - Functions: Follow/unfollow, follower management
  - Features: Social feed generation, connection analytics

- **groupService** (`src/services/groupService.js`)
  - User group management
  - Functions: Group creation, member management, group operations
  - Features: Custom groups, group permissions

- **interestService** (`src/services/interestService.js`)
  - User interests and preference management
  - Functions: Interest tracking, suggestions, matching
  - Features: Interest-based recommendations

### Administrative Services
- **adminService** (`src/services/adminService.js`)
  - Administrative operations and permissions
  - Functions: Admin access control, user management
  - Features: Role-based permissions, admin tools

- **globalAdminService** (`src/services/globalAdminService.js`)
  - Global administrative operations
  - Functions: System-wide admin operations, global settings
  - Features: Cross-studio administration

- **moderationService** (`src/services/moderationService.js`)
  - Content and user moderation
  - Functions: Content flagging, user reports, moderation actions
  - Features: Automated moderation, review workflows

- **reportingService** (`src/services/reportingService.js`)
  - User reporting and safety features
  - Functions: Report submission, report handling, safety measures
  - Features: Multiple report types, escalation workflows

### Event-Specific Services
- **invitations** (`src/events/services/invitations.js`)
  - Event invitation management
  - Functions: Invitation sending, tracking, responses
  - Features: Multi-channel invitations, RSVP handling

- **templates** (`src/events/services/templates.js`)
  - Event template operations
  - Functions: Template storage, sharing, application
  - Features: Custom templates, template marketplace

### Enhanced Event Services (NEW)
- **eventDataService** (`src/events/services/eventDataService.js`)
  - Unified event data operations with proper array management (200+ lines)
  - Functions: `fetchEventData`, `updateEventSubscription`, comprehensive data fetching
  - Features: Consolidated data loading, invitation lifecycle management, participant tracking
  - **Dependencies**: eventService, invitations, invitationEligibilityService
  - **REUSE PRIORITY**: HIGH - Use for all event data operations

- **eventService** (`src/events/services/eventService.js`)
  - Core event operations and lifecycle management
  - Functions: Event CRUD operations, state management, validation
  - Features: Event creation, updates, deletion, state transitions
  - **Dependencies**: Firebase Firestore, event validation
  - **REUSE PRIORITY**: HIGH - Core event service

### Event Shared Services (NEW)
- **eventCoreService** (`src/events/services/shared/eventCoreService.js`)
  - Core event operations shared across features
  - Functions: Base event operations, common validation, state management
  - Features: Reusable event logic, validation patterns

- **eventInvitationService** (`src/events/services/shared/eventInvitationService.js`)
  - Invitation management shared logic
  - Functions: Invitation processing, validation, state tracking
  - Features: Multi-type invitation support, validation

- **eventSubscriptionService** (`src/events/services/shared/eventSubscriptionService.js`)
  - Event subscription management
  - Functions: Subscription handling, notification management
  - Features: Subscription state, notification coordination

### Utility & Helper Services
- **inviteCodeService** (`src/services/inviteCodeService.js`)
  - Invite code generation and validation
  - Functions: Code generation, lookup, validation
  - Features: Unique code generation, expiration handling

- **privacyService** (`src/services/privacyService.js`)
  - Privacy controls and data protection
  - Functions: Privacy settings, data access control
  - Features: GDPR compliance, user privacy controls

- **phoneVerificationService** (`src/services/phoneVerificationService.js`)
  - Phone number verification and validation
  - Functions: SMS verification, phone validation
  - Features: Multi-region support, verification flows

- **ReliabilityService** (`src/services/ReliabilityService.js`)
  - User reliability scoring and analytics
  - Functions: Score calculation, tier management, improvement tracking
  - Features: Reliability analytics, user feedback integration

- **invitationEligibilityService** (`src/services/invitationEligibilityService.js`)
  - Event invitation eligibility checking and participant management
  - Functions: Eligibility validation, participant tracking, invitation constraints
  - Features: Role-based invitation rules, participant limit enforcement
  - **REUSE PRIORITY**: MEDIUM - Used by eventDataService for invitation validation

---

## 🚨 Potential Duplicates & Service Consolidation Opportunities

### Similar Services (Review for Consolidation)
1. **Notification Services**:
   - `notificationService.js` vs `fcmService.js` vs `eventNotificationScheduler.js`
   - Consider: Unified notification management system

2. **Admin Services**:
   - `adminService.js` vs `globalAdminService.js` vs `moderationService.js`
   - Consider: Consolidated admin service with role-based modules

3. **Data Cleanup Services**:
   - `DataCleanupService.js` vs `UserDataCleanupService.js`
   - Consider: Unified cleanup service with entity-specific modules

4. **Studio Services**:
   - `StudioService.js` vs `studioStatsService.js` vs `StudioRequestService.js`
   - Consider: Single studio service with stats and request modules

### NEW Duplication Issues Identified (2025-09-15)
5. **Event Detail Logic** - ⚠️ NEWLY IDENTIFIED:
   - Multiple event detail components may duplicate permission/status logic
   - **RECOMMENDATION**: Ensure EventActionButtons and EventStatusBadges use shared permission hooks
   - **IMPACT**: Use useEventPermissions and useEventStatus hooks consistently

6. **Text Processing Utilities** - ⚠️ NEWLY IDENTIFIED:
   - `textUtils.js` and `userDisplayUtils.js` have overlapping display name logic
   - **RECOMMENDATION**: Consolidate display name functions in userDisplayUtils
   - **IMPACT**: Remove duplicate formatDisplayName functions

7. **Array Operation Patterns** - ⚠️ NEWLY IDENTIFIED:
   - Multiple services using custom array operations instead of arrayOperationUtils
   - **RECOMMENDATION**: Audit all services for array operations that should use arrayOperationUtils
   - **IMPACT**: Prevent array-related bugs across 15+ services

8. **Interest Handling** - ⚠️ NEWLY IDENTIFIED:
   - Direct Array.includes usage for interests instead of optimized useInterestLookup
   - **RECOMMENDATION**: Replace all interest checks with useInterestLookup for O(1) performance
   - **IMPACT**: Major performance improvement in interest-heavy components

### Missing Service Patterns
Based on usage analysis, consider creating:
1. **EventLifecycleService** - Centralized event state management
2. **CacheService** - Unified caching across services
3. **ValidationService** - Centralized validation logic
4. **LoggingService** - Structured logging and analytics

### Critical Reuse Enforcement (NEW)
**BEFORE CREATING ANY NEW COMPONENT, VERIFY:**
1. ✅ **Event Detail Logic**: Use EventActionButtons, EventInfoSection, EventStatusBadges
2. ✅ **Permission Checks**: Use useEventPermissions hook (never inline permission logic)
3. ✅ **Status Calculations**: Use useEventStatus hook (never inline status logic)
4. ✅ **Interest Operations**: Use interestUtils + useInterestLookup (never Array.includes)
5. ✅ **Array Operations**: Use arrayOperationUtils (never custom array handling)
6. ✅ **Text Processing**: Use textUtils + userDisplayUtils (never inline text processing)
7. ✅ **Map Navigation**: Use mapUtils.openMapsWithLocation (never custom map opening)
8. ✅ **User Display**: Use userDisplayUtils.extractDisplayName (solves "Unknown Host" issues)

---

*Last Updated: 2025-09-15 (Comprehensive Inventory Audit - Major Component Addition)*
*Total Components Inventoried: 125+*
*Total Screens Inventoried: 18*
*Total Hooks Inventoried: 35+*
*Total Services Inventoried: 50+*
*Total Utility Libraries: 15+*
*NEW Event Detail Components: 3*
*NEW Performance Hooks: 5*
*NEW Event Services: 6*
*CRITICAL Duplication Issues Identified: 8*

> **Remember**: This inventory prevents duplicate component/service creation and promotes code reuse. Always check here first! 🚀