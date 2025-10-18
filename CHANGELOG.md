# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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
