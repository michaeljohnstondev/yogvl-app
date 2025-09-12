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

### Attendee & Guest Management
- **GuestListViewer** (`src/events/components/guests/GuestListViewer.js`)
  - Displays current guests and hosts

- **GuestManager** (`src/events/components/guests/GuestManager.js`)
  - Manages guest list operations

- **InvitationCard** (`src/events/components/guests/InvitationCard.js`)
  - Individual invitation display card

- **EventAttendanceManager** (`src/events/components/attendees/EventAttendanceManager.js`)
  - Manages event attendance tracking

- **AttendanceCard** (`src/components/ui/AttendanceCard.js`)
  - Individual attendance display

- **AttendanceStats** (`src/components/ui/AttendanceStats.js`)
  - Attendance statistics display

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

- **AddReminderModal** (`src/components/notifications/AddReminderModal.js`)
  - Modal for adding event reminders

---

## 💬 Comments & Discussion

- **CommentSection** (`src/components/ui/comments/CommentSection.js`)
  - Complete commenting system for events
  - Props: `eventId`

- **CommentList** (`src/components/ui/comments/CommentList.js`)
  - List of comments

- **CommentItem** (`src/components/ui/comments/CommentItem.js`)
  - Individual comment display

- **AddCommentInput** (`src/components/ui/comments/AddCommentInput.js`)
  - Input for adding new comments

---

## 🔧 Utility & Helper Components

### State & Context
- **VibeAlertContext** (`src/components/ui/VibeAlertContext.js`)
  - Global alert/notification system
  - Methods: `alert`, `info`, `success`, `error`, `warning`, `confirm`
  - Colored variants: `cyan`, `turquoise`, `aqua`, `teal`

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
1. **Avatar Components**:
   - `UserAvatar` vs `ProfileAvatar` - Different data sources but similar purpose
   - Consider: Could be unified with a single flexible avatar component

2. **Notification Buttons**:
   - `NotificationButton` (notifications/) vs `NotificationButton` (events/components/notificationSettings/)
   - **Location conflict detected** - same name, different paths

3. **Reliability Components**:
   - `ReliabilityWarning` (ui/) vs `ReliabilityWarning` (events/components/attendees/)
   - **Potential duplicate** - need to verify if functionality differs

4. **AutoComplete Components**:
   - `AutoCompleteInput` vs `VibeAutoComplete` - Similar functionality
   - Consider: `AutoCompleteInput` uses `VibeAutoComplete` internally, may be redundant wrapper

### Missing Common Patterns
Based on usage analysis, consider creating:
1. **VibeListItem** - Standardized list item component
2. **VibeCard** - Generic card wrapper (EventCard is very specific)
3. **VibeIconButton** - Icon-only button variant
4. **VibeSearchInput** - Search-specific input with clear functionality

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

### Social & Communication Screens
- **InviteScreen** (`src/screens/InviteScreen.js`) - Route: `Invite`
  - Comprehensive user invitation interface
  - Features: Multi-tab user selection, phone contacts, QR codes, group management

- **SocialListScreen** (`src/screens/SocialListScreen.js`) - Route: `SocialList`
  - Social connections and friends list
  - Features: Friend management, social interactions

- **MessageBoardScreen** (`src/screens/MessageBoardScreen.js`) - Route: `MessageBoard`
  - Event-specific message board and discussions
  - Features: Comments, real-time messaging, moderation

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

### Template System Hooks
- **useTemplateManager** (`src/events/hooks/templates/useTemplateManager.js`)
  - Template creation, storage, and application
  - Functions: Save/load templates, template application, management
  - Features: Custom templates, template sharing

- **useTemplateStorage** (`src/events/hooks/templates/useTemplateStorage.js`)
  - Template persistence and storage management
  - Functions: Local storage, cloud sync, template caching
  - Dependencies: AsyncStorage, Firestore

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
  - Complex invite screen state management
  - Functions: Tab management, selection state, filtering
  - Features: Multi-tab coordination, complex selection logic

- **useContactManagement** (`src/screens/invite/hooks/useContactManagement.js`)
  - Phone contact integration and management
  - Functions: Contact fetching, permission handling, sync
  - Dependencies: Phone contacts API, permissions

- **useGroupManagement** (`src/screens/invite/hooks/useGroupManagement.js`)
  - User group creation and management
  - Functions: Group CRUD operations, member management
  - Features: Custom user groupings, group persistence

- **useSelectionHandlers** (`src/screens/invite/hooks/useSelectionHandlers.js`)
  - User selection logic for invite screens
  - Functions: Multi-select handling, validation, limits
  - Features: Selection constraints, bulk operations

- **useUserInterests** (`src/screens/invite/hooks/useUserInterests.js`)
  - User interest matching and filtering
  - Functions: Interest-based filtering, recommendation
  - Features: Smart user suggestions based on interests

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

### Missing Service Patterns
Based on usage analysis, consider creating:
1. **EventLifecycleService** - Centralized event state management
2. **CacheService** - Unified caching across services
3. **ValidationService** - Centralized validation logic
4. **LoggingService** - Structured logging and analytics

---

*Last Updated: Generated dynamically*
*Total Components Inventoried: 80+*
*Total Screens Inventoried: 18*
*Total Hooks Inventoried: 15+*
*Total Services Inventoried: 40+*

> **Remember**: This inventory prevents duplicate component/service creation and promotes code reuse. Always check here first! 🚀