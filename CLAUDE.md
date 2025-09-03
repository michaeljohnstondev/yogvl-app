# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Keep code tight, modular, and stylish — graffiti-level clean.

## Development Commands

### Core Commands
- `npm start` - Start Expo development server
- `npm run android` - Run on Android device/emulator  
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run in web browser
- `npm run lint` - Run ESLint code linting

### Build Commands
- `eas build --platform android --profile development` - Development APK build
- `eas build --platform android --profile preview` - Preview APK build  
- `eas build --platform android --profile production` - Production APK build

## Project Architecture

This is a React Native / Expo community + event management app powered by Firebase.
The core flow:

Unauthenticated → Landing → Login / Signup

Authenticated (no profile) → ContactInfo

Full User → Home → CreateEvent → EventDetail → EditEvent

## Tech Stack

- **Framework**: React Native (Expo SDK ~53.0.11)
- **Navigation**: React Navigation v7 (native stack)  
- **Backend**: Firebase (Auth + Firestore)
- **State Management**: React Context API (AuthContext)
- **Styling**: Punk/cyberpunk neon theme from src/theme/themes.js
- **Build Tool**: EAS Build for APK generation
- **Metro Config**: Custom config for Firebase bundling fixes

## Core Patterns

### Event Form System
Hook: `useEventFormState` in `src/events/hooks/`

Handles:
- Form state + dirty tracking
- Validation (eventFormValidators)  
- Reset + template support

### Auth Context
File: `src/auth/AuthContext.js`

Provides:
- Current user + Firestore profile
- Onboarding state (contact info, location selection)
- Authentication status

Component Design

Screens = containers (logic + services)

Components = dumb UI (props only, no data calls)

Hooks = reusable state logic

Services = Firebase/API logic

Examples:

VibeButton, VibeInput, VibeCarousel = UI parts

Who, What, When, Where = event form blocks

VibeWrappedScreen = screen wrapper for consistent style

Theme System

Defined in src/themes/themes.js:

Neon palette: vibeBlue, vibeGreen, vibePink

Dark gradients + glow edges

Typography = graffiti-inspired but clean

Spacing consistent across UI

1. Development Rules

Size & Style

Files < 500 lines

Functions < 50 lines

Line length ≈ 100 chars

Components → PascalCase.jsx

Utils/hooks → camelCase.js

2. One Screen at a Time

Work only on one screen + its reusable parts.

Allowed edits:

route in app/

screen container in src/screens/<Name>

reusable parts under src/components/

service/helper for that screen

Forbidden: unrelated refactors, deps, global state edits (log in TASKS.md if truly needed).

Steps:

Add/confirm TASKS.md entry

Build screen skeleton

Connect UI → services

Extract reusable parts → src/components/

Run checklist

Mark complete in TASKS.md

3. Manual Checklist

✅ Screen renders without warnings
✅ Happy path works (main flow)
✅ Edge case works (empty input/list)
✅ Failure shows error state
✅ Navigation back/forward works (no red screens)
✅ Errors/warnings are logged as [Screen:<Name>]

4. Code Organization

components = dumb UI only

screens = containers (hooks + services)

services = Firebase/API

hooks = reusable logic

utils/lib = pure helpers

5. Tasks, Docs & Commits

Check TASKS.md + TASKLIST.MD before starting

Completed tasks → TASKS.md (I’ll tell you what goes into TASKLIST.MD)

Commits = atomic, small:

feat: new functionality

fix: bug fix

refactor: code reorg

chore: cleanup

Comment why, not just what.

6. AI Behavior

Never assume missing context → ask first

Confirm paths exist before referencing

Don’t add dependencies unless:

Checked package.json

Logged justification in TASKS.md

7. UI Vibe

Punk aesthetic: neon, dark, sharp lines, graffiti-clean

Keep it consistent, sharp, bold — no messy layouts

Every component should feel like Big Vibe Studios

8. Project Stucture

## Repo Layout (BVS Standard)

root
├─ App.js
├─ Navigation.js
└─ src/
│
├─ auth/
│ ├─ screens/
│ │ ├─ LoginScreen.jsx
│ │ ├─ SignUpScreen.jsx
│ │ └─ ContactInfoScreen.jsx
│ ├─ store/
│ │ └─ AuthContext.js
│ ├─ services/
│ │ └─ firebase.js
│ ├─ hooks/
│ │ └─ useAuth.js
│ └─ lib/
│ └─ validators.js
│
├─ events/
│ ├─ screens/
│ │ ├─ CreateEventScreen.js
│ │ ├─ EditEventScreen.js
│ │ └─ EventDetailScreen.js
│ ├─ components/ # event-only reusable UI
│ ├─ hooks/ # event-only reusable hooks
│ ├─ services/ # event Firestore/API calls
│ ├─ lib/ # event-specific utils (validators, transforms)
│ └─ templates/ # template modals, hooks, services
│
├─ components/
│ ├─ ui/ # global reusable UI (no fetch)
│ │ └─ PrimaryButton.jsx
│ └─ media/ # global media-related components
│
├─ hooks/ # global reusable hooks
│ ├─ dates/
│ ├─ templates/
│ └─ autocomplete/
│
├─ services/ # global Firebase/API only
│
├─ lib/ # pure utils (formatters, helpers)
│
├─ store/ # global contexts/reducers
│
├─ theme/ # tokens, styles
│
└─ config/ # env, routes, constants

Right now we are just building the event creating portion of the app for Production. we will implement other portions of app in later versions.

9.

look for functions or variables that arent used,
and make note of them in flags.md

i want you to look for functionnames and variablenames that dont make sense in flags.md

look for file/folder names that dont make sense for the code they have and make note of it in flags.md

look for extreme places of spaghetti code and make note of it in flags.md

dont change flagged items til i give permission

10

**ALWAYS LOOK AT DATABASE.MD TO UNDERSTAND MY DATASTRUCTURE.** Ask before changing how things are structured or adding to it. If we change or add to it, update DATABASE.md

## Key Event Form Hooks
Available in `src/events/hooks/`:
- `useEventFormState` - Core form state management
- `useEventForm` - Event form logic  
- `useDateTimePickers` - Date/time picker management
- `useSuggestions` - Autocomplete suggestions
- `useSmartAutoComplete` - Enhanced autocomplete  
- `useSuggestionsManager` - Suggestion state management
- `usePastEventsManager` - Past event data handling
