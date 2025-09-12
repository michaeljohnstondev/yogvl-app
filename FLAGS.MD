# BVS Code Organization Issues - Critical Violations Found

## CRITICAL FILE SIZE VIOLATIONS

### EventDetailScreen.js - 2050 lines (EXCEEDS 500 line limit by 1550 lines)
**Location**: `C:\dev\bvs-app\src\events\screens\EventDetailScreen.js`
**Status**: EMERGENCY REFACTORING REQUIRED - HIGHEST PRIORITY
**Violation Severity**: 4x over limit (310% violation)

This is the most critical architectural violation in the codebase. The file is a monolithic giant that violates every CLAUDE.md principle:
- Single responsibility violation (handles 10+ concerns)
- Mixed business logic with UI rendering
- Direct Firebase operations in screen component
- No separation between containers and presentation
- Unmaintainable complexity

### UserProfileScreen.js - 955 lines (EXCEEDS 500 line limit by 455 lines)
**Location**: `C:\dev\bvs-app\src\screens\UserProfileScreen.js`
**Status**: IMMEDIATE REFACTORING REQUIRED

This screen violates the BVS 500-line limit by nearly double, making it difficult to maintain and test. The file contains multiple concerns that should be extracted into separate components and services.

## DETAILED BREAKDOWN OF EXTRACTION OPPORTUNITIES

### 1. PROFILE PICTURE MANAGEMENT (150+ lines)
**Lines 159-287**: Complex profile picture handling logic
**Extract to**: `src/components/ui/ProfilePictureManager.js`
**Includes**:
- Image picker action sheet logic (handleProfilePicturePress)
- Camera/library access functions (openCamera, openImageLibrary)  
- Upload/remove photo handlers (handleImageUpload, handleRemovePhoto)
- Permission handling and error management

### 2. CONTACT INFO SECTION (75+ lines)
**Lines 684-759**: Large inline contact display/edit section
**Extract to**: `src/components/ui/ContactInfoSection.js`
**Includes**:
- Contact item rendering (name, location, phone, email)
- Edit mode switching between display and input
- Form validation and formatting logic
- Icon and styling patterns that could be reusable

### 3. STATS SECTIONS (120+ lines)
**Lines 763-844**: Activity and Social statistics sections
**Extract to**: Multiple components:
- `src/components/ui/ActivityStatsSection.js` (Events hosted/attended/no-shows)
- `src/components/ui/SocialStatsSection.js` (Friends/Following/Followers with navigation)

### 4. USER REPORTING SYSTEM (50+ lines) 
**Lines 299-348**: Report user functionality
**Extract to**: `src/hooks/useUserReporting.js`
**Includes**:
- Report category selection logic
- Report submission handling
- Alert menu creation

### 5. ACCOUNT DELETION FLOW (100+ lines)
**Lines 350-448**: Complex account deletion preview and confirmation
**Extract to**: `src/hooks/useAccountDeletion.js`
**Includes**:
- Multi-step confirmation process
- Deletion preview data fetching  
- Account deletion execution

### 6. RELATIONSHIP STATUS MANAGEMENT (90+ lines)
**Lines 522-551**: Complex relationship status checking
**Extract to**: `src/hooks/useUserRelationshipStatus.js`
**Includes**:
- Follow/block status checking
- Relationship state management
- Navigation handling for blocked users

### 7. TOP BUTTON ROW (30+ lines)
**Lines 604-629**: Top buttons with conditional rendering
**Extract to**: `src/components/ui/ProfileTopButtons.js`
**Includes**:
- Close button, report button, edit button
- Conditional rendering logic for own vs other profiles

### 8. BIO SECTION (25+ lines)
**Lines 661-682**: About Me section with edit capability
**Extract to**: `src/components/ui/BioSection.js`

### 9. QR CODE SECTION (20+ lines)
**Lines 847-859**: QR code display for profile sharing
**Extract to**: `src/components/ui/ProfileQRSection.js`

### 10. ACTION BUTTONS (50+ lines)
**Lines 871-936**: Different button sets for own vs other profiles
**Extract to**: 
- `src/components/ui/ProfileActionButtons.js` (own profile)
- `src/components/ui/SocialActionButtons.js` (other profiles)

## BUSINESS LOGIC EXTRACTION OPPORTUNITIES

### 1. PROFILE DATA MANAGEMENT
**Extract to**: `src/hooks/useProfileData.js`
- User data fetching and management
- Visible contact info logic
- Profile data state management

### 2. PROFILE EDITING LOGIC  
**Extract to**: `src/hooks/useProfileEditing.js`
- Edit mode state management
- Form data handling and validation
- Save functionality with error handling

### 3. UTILITY FUNCTIONS
**Extract to**: `src/lib/profileUtils.js`
- Phone number formatting (formatPhoneNumber - lines 553-571)
- Join date formatting (formatJoinDate - lines 573-583)
- Other pure utility functions

## DUPLICATE/SIMILAR PATTERNS FOUND

### 1. SECTION CONTAINERS
Multiple similar section containers that could use a single `ProfileSection` component:
- contactSection, aboutSection, activitySection, socialSection, qrSection
- All follow same pattern: outer section, inner container, title, content

### 2. STAT ITEMS
Repeated stat item pattern in both activity and social sections could use single `StatItem` component

### 3. CONTACT ITEMS
Contact info items follow identical pattern - could be single `ContactInfoItem` component

## RECOMMENDED REFACTORING STRATEGY

### Phase 1: Extract Pure Components (No Business Logic)
1. `ProfileTopButtons.js`
2. `ContactInfoSection.js` 
3. `BioSection.js`
4. `ActivityStatsSection.js`
5. `SocialStatsSection.js`
6. `ProfileQRSection.js`
7. `ProfileActionButtons.js`
8. `SocialActionButtons.js`

### Phase 2: Extract Business Logic
1. `useProfileData.js`
2. `useProfileEditing.js`
3. `useUserReporting.js`
4. `useAccountDeletion.js`
5. `useUserRelationshipStatus.js`
6. `ProfilePictureManager.js` (combines UI + logic)

### Phase 3: Extract Utilities
1. `profileUtils.js` (formatPhoneNumber, formatJoinDate)
2. Create generic `ProfileSection.js` wrapper component

### Phase 4: Consolidate Screen
Final screen should be ~150 lines - just composition of components and hooks

## EXPECTED OUTCOME

**Before**: 955 lines in single file
**After**: ~150 line screen + 8-10 focused components/hooks averaging 50-80 lines each

This refactoring will:
- Improve testability (smaller, focused units)
- Increase reusability (components usable in other screens)  
- Reduce cognitive load (each file has single responsibility)
- Follow BVS architecture patterns (screens as containers, components as UI)
- Enable easier debugging and maintenance

## MIXED CONCERNS IDENTIFIED

The current UserProfileScreen violates single responsibility by handling:
- UI Layout and Styling ✓ (Screen responsibility)
- User Data Fetching ✗ (Should be hook)
- Image Upload/Management ✗ (Should be service/component)
- Form Validation ✗ (Should be hook/utility)
- Navigation Logic ✗ (Should be hook)
- Business Rules (reporting, blocking, etc.) ✗ (Should be hooks/services)

**Recommendation**: Follow BVS pattern where screens are containers that compose smaller, single-purpose components and hooks.

---

## EVENTDETAILSCREEN ARCHITECTURAL VIOLATIONS

### 1. MIXED CONCERNS VIOLATION (Lines 1-2050)
The EventDetailScreen handles 10+ distinct responsibilities that should be separated:

#### UI Rendering Concerns ✓ (Screen responsibility)
- Event information display
- Action button layout
- Modal rendering

#### Business Logic Concerns ✗ (Should be hooks/services)  
- Event subscription/unsubscription (Lines 478-682)
- Attendee management and kicking (Lines 684-780)
- Event deletion with cleanup (Lines 830-923)
- Interest toggle functionality (Lines 428-462)
- Event reporting logic (Lines 154-219)
- Notification settings management (Lines 94-152)

#### Data Layer Concerns ✗ (Should be services)
- Direct Firebase Firestore operations throughout
- Complex data fetching in useEffect (Lines 254-425)
- User metrics updates
- Notification creation and management

### 2. COMPONENT EXTRACTION OPPORTUNITIES (2050 → ~150 lines)

#### Extract to src/events/components/display/
- **EventBadges.js** (Lines 948-983) - Status badges and action buttons
- **EventInfoCard.js** (Lines 985-1178) - Main event information display  
- **EventDetailsSections.js** (Lines 1180-1288) - Description and additional info

#### Extract to src/events/components/attendees/
- **AttendeeModal.js** (Lines 1494-1556) - Friends/attendees modal with kick functionality

#### Extract to src/events/components/actions/
- **EventActionButtons.js** (Lines 1290-1481) - All event action buttons
- **PostEventActions.js** (Lines 1402-1481) - Past event specific actions

#### Extract to src/events/hooks/
- **useEventSubscription.js** (Lines 478-682) - Subscription logic
- **useAttendeeManagement.js** (Lines 684-780) - Attendee operations
- **useEventPermissions.js** - Permission calculations  
- **useEventReporting.js** (Lines 154-219) - Reporting functionality
- **useEventDeletion.js** (Lines 830-923) - Deletion logic
- **useEventInterests.js** (Lines 428-462) - Interest management

#### Extract to src/events/services/
- **eventSubscriptionService.js** - Firebase subscription operations
- **attendeeService.js** - Attendee management operations

#### Extract to src/events/lib/
- **eventDisplayUtils.js** (Lines 221-249) - Pure utility functions

### 3. ARCHITECTURAL ANTI-PATTERNS IDENTIFIED

#### Service Layer Bypass
- Direct Firebase imports in screen component (Lines 13-23)
- Inline Firestore operations instead of service abstraction
- Business logic mixed with UI concerns

#### Component Reuse Violations  
- Custom modal implementation instead of existing VibeModal
- Duplicate notification settings instead of using SubscriptionNotificationSettings
- Custom buttons instead of leveraging VibeButton variants

#### State Management Issues
- 20+ useState hooks in single component
- Complex interdependent state that should be managed by hooks
- No separation between UI state and business state

### 4. RECOMMENDED REFACTORING PRIORITY

**Phase 1 (Critical)**: Extract business logic hooks
- Move all Firebase operations to services
- Create focused hooks for each business concern
- Separate UI state from business state

**Phase 2 (High)**: Extract UI components
- Create presentation components with props-only interfaces
- Leverage existing components from COMPONENT_INVENTORY.md
- Ensure single responsibility for each component

**Phase 3 (Medium)**: Extract utilities and finalize
- Move pure functions to lib/
- Consolidate final screen to composition only
- Verify CLAUDE.md compliance

### 5. SUCCESS METRICS

**Before Refactoring**:
- 1 monolithic file (2050 lines)
- 10+ mixed concerns
- Untestable complexity
- CLAUDE.md violations

**After Refactoring**:
- 16 focused files (<500 lines each)
- Single responsibility per file
- Testable, maintainable units
- Full CLAUDE.md compliance

This refactoring is ESSENTIAL for maintaining code quality and team productivity. The current state violates every architectural principle and will become increasingly difficult to maintain.

---

## ADDITIONAL FILE SIZE VIOLATIONS DISCOVERED

### Codebase File Size Analysis - Multiple Critical Issues

After scanning the entire codebase, multiple files exceed or approach the 500-line CLAUDE.md limit:

#### CRITICAL VIOLATIONS (Over 500 lines)
1. **EventDetailScreen.js** - 2059 lines (EMERGENCY - 312% over limit)
2. **invitations.js** - 1261 lines (SERVICE - 152% over limit) 
3. **notifications.js** - 1245 lines (SERVICE - 149% over limit)
4. **LocationScreen.js** - 1167 lines (SCREEN - 133% over limit)
5. **AdminScreen.js** - 1004 lines (SCREEN - 100% over limit)
6. **CreateEventForm.js** - 980 lines (COMPONENT - 96% over limit)
7. **HostProfileScreen.js** - 917 lines (SCREEN - 83% over limit)
8. **UserProfileScreen.js** - 878 lines (SCREEN - 75% over limit)
9. **friendService.js** - 768 lines (SERVICE - 53% over limit)
10. **EditEventScreen.js** - 766 lines (SCREEN - 53% over limit)
11. **ReliabilityService.js** - 750 lines (SERVICE - 50% over limit)
12. **useEventForm.js** - 688 lines (HOOK - 37% over limit)
13. **CreateEventScreen.js** - 673 lines (SCREEN - 34% over limit)
14. **followService.js** - 652 lines (SERVICE - 30% over limit)
15. **EventWrapUpScreen.js** - 649 lines (SCREEN - 29% over limit)
16. **inviteScreenStyles.js** - 632 lines (STYLES - 26% over limit)
17. **InterestsScreen.js** - 616 lines (SCREEN - 23% over limit)
18. **LocationService.js** - 600 lines (SERVICE - 20% over limit)

#### APPROACHING LIMIT (400-500 lines) - Refactor Soon
19. **moderationService.js** - 593 lines (18% over limit)

### ARCHITECTURAL PATTERN VIOLATIONS

#### Services Exceeding Limits
- **invitations.js** (1261 lines) - Should be broken into focused services
- **notifications.js** (1245 lines) - Monolithic notification system
- **friendService.js** (768 lines) - Complex social operations
- **ReliabilityService.js** (750 lines) - Complex scoring system
- **followService.js** (652 lines) - Complex follow operations
- **LocationService.js** (600 lines) - Multiple location concerns

#### Screens Violating Container Pattern
- **LocationScreen.js** (1167 lines) - Complex onboarding with mixed concerns
- **AdminScreen.js** (1004 lines) - Multiple admin functions in one screen
- **HostProfileScreen.js** (917 lines) - Similar to UserProfileScreen issues
- **CreateEventScreen.js** (673 lines) - Complex event creation logic
- **EditEventScreen.js** (766 lines) - Similar to create but with edit complexity
- **InterestsScreen.js** (616 lines) - Complex interest management

#### Components Breaking Single Responsibility
- **CreateEventForm.js** (980 lines) - Massive form component with business logic
- **useEventForm.js** (688 lines) - Hook doing too much

#### Style Files Growing Too Large
- **inviteScreenStyles.js** (632 lines) - Styles should be co-located with components

### REFACTORING PRIORITY MATRIX

#### EMERGENCY (Immediate Action Required)
1. **EventDetailScreen.js** (2059 lines) - Blocks all event-related development
2. **invitations.js** (1261 lines) - Blocks invitation system development
3. **notifications.js** (1245 lines) - Blocks notification development

#### HIGH PRIORITY (Next Sprint)
4. **LocationScreen.js** (1167 lines) - Blocks onboarding improvements
5. **AdminScreen.js** (1004 lines) - Blocks admin feature development
6. **CreateEventForm.js** (980 lines) - Blocks event creation improvements

#### MEDIUM PRIORITY (Following Sprint)
7. **HostProfileScreen.js** (917 lines) - Profile system consistency
8. **UserProfileScreen.js** (878 lines) - Profile system consistency
9. **EditEventScreen.js** (766 lines) - Event editing improvements

#### LOW PRIORITY (Technical Debt Cleanup)
10. Remaining services and screens over 500 lines

### SYSTEMIC ISSUES IDENTIFIED

#### 1. Service Layer Bloat
Multiple services exceed limits due to handling multiple concerns:
- Notification service handling creation + delivery + scheduling + batching
- Friend service handling follows + friends + blocking + social features
- Location service handling GPS + places + validation + storage

#### 2. Screen Complexity Explosion  
Screens are becoming application logic containers instead of UI composition:
- Business logic embedded in screens
- Data fetching mixed with rendering
- No hook extraction for reusable logic

#### 3. Component Monoliths
Large components trying to handle entire feature areas:
- CreateEventForm handling all event creation logic
- Form hooks handling all validation and submission

#### 4. Style File Growth
Style files growing too large due to lack of component co-location

### RECOMMENDED ARCHITECTURAL CHANGES

#### Service Decomposition Strategy
- Break large services into focused micro-services
- Extract common operations to shared utilities
- Implement service composition patterns

#### Screen Refactoring Strategy  
- Extract business logic to custom hooks
- Extract UI sections to focused components
- Use composition over monolithic screens

#### Component Strategy
- Break large components into smaller focused ones
- Extract reusable UI patterns to component library
- Implement component composition patterns

#### Style Strategy
- Co-locate styles with components
- Use style composition over large style files
- Implement consistent naming patterns

This systemic analysis reveals that the codebase has grown beyond maintainable limits across multiple layers. Immediate architectural intervention is required to prevent further technical debt accumulation.