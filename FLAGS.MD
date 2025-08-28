# BVS App Flags

## InviteScreen Contact Integration (2025-01-22)
- Replaced dummy friend data with real Firebase user queries
- Created userService.js to fetch studio users from Firestore
- App now loads real users from the same studio as current user
- Phone contacts integration already working via expo-contacts
- Added loading states for app users tab
- Users are filtered by same studio membership for privacy
- Updated EventDetailScreen to use enhanced InviteScreen instead of old InviteGuestsScreen

## InviteScreen Refactoring (2025-01-22)
- Successfully refactored 1639-line InviteScreen.js into modular architecture
- Created `src/screens/invite/` directory with organized structure:
  - 4 custom hooks for state management and business logic
  - 9 UI components for better reusability and maintainability
  - Utilities for filtering, sorting, and calculations
  - Separate styles file
- Main InviteScreen.js reduced from 1639 lines to ~250 lines
- Each component/hook is under 500 lines (following BVS guidelines)
- Improved separation of concerns and testability
- Original file backed up as InviteScreen.js.backup

## Dead Code Cleanup (2025-01-27)

### Successfully Deleted Files ✅
- src/screens/BigVibeCelebration.js (completely unused)
- src/services/Studios.js (replaced by StudioService.js)  
- src/components/admin/DataCleanupPanel.js (never imported)
- src/components/ui/VibeTimePicker.js (unused component)
- src/events/components/EventTipsModal.js (unused modal)
- src/screens/InviteScreen.js.backup (backup file)
- src/screens/InterestsScreen_backup.js (backup file)
- src/components/admin/ (empty directory removed)
- src/events/components/hosts/HostProfileModal.js (obsolete, replaced by HostProfileScreen)

### Potentially Unused Functions/Components 🔍
- **src/lib/emojiUtils.js**: Check if `detectEmojiCategory()` and `EMOJI_INTENSITY` are fully utilized
- **src/services/emailService.js**: Template service - verify if all EMAIL_TEMPLATES are implemented
- **src/components/ui/InviteFriendsSelector.js**: Only used in AdditionalHostsSelector - consider consolidation
- **src/services/UserDataCleanupService.js**: May be admin-only feature without admin panel

### Variable/Function Naming Issues 📝
- Look for overly generic names like `data`, `info`, `temp`
- Review function names that don't clearly indicate purpose

### Spaghetti Code Locations 🍝  
- Functions >50 lines that could be broken down
- Files with multiple responsibilities
- Deeply nested conditional logic

## Redundant Files (Consider Removal)
- InviteGuestsScreen.js - Now redundant, EventDetailScreen uses enhanced InviteScreen