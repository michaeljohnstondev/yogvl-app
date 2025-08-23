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

## Redundant Files (Consider Removal)
- InviteGuestsScreen.js - Now redundant, EventDetailScreen uses enhanced InviteScreen