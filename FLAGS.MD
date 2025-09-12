# BVS Code Organization Issues - UserProfileScreen Analysis

## CRITICAL FILE SIZE VIOLATION

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