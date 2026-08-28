# The Yo

A community event app for iOS and Android — create an event, invite people by QR
or link, and let the guest list, the comments and the reminders take care of
themselves.

Live on the [App Store](https://apps.apple.com) and [Google Play](https://play.google.com).

**Stack** — React Native 0.83 · Expo 55 · React 19 · Firebase (Auth, Firestore,
Cloud Functions, Storage, FCM) · Reanimated 4 · EAS Build & Update

## What it does

- **Events end to end** — create, edit, cancel, duplicate from templates,
  recurrence rules, co-hosts, private events, and a live guest list with RSVP
  states.
- **Notifications** — 26 Cloud Functions (~6.2k lines) sit behind every push:
  invites, RSVP changes, comments, new followers, scheduled reminders, and
  expiry cleanup.
- **QR invite deep links** — verified universal links (iOS) and App Links
  (Android), served from `.well-known` on bigvibestudios.com, so a scanned code
  opens the event directly in the app or falls back to the web.
- **Social graph** — follows, host profiles, interest matching, and a per-event
  message board.

## Layout

```
app/          screens and navigation
components/   shared UI
functions/    Firebase Cloud Functions (auth/, notifications/, utils/)
android/      native Android project
assets/       icons, splash, fonts
```

Firestore access is governed by security rules with composite indexes documented
in `FIREBASE_INDEXES.md`; the data model is written up in `DATABASE.md`.

## Running it

```bash
npm install
npx expo start
```

The app expects Firebase config (`google-services.json`,
`GoogleService-Info.plist`) and, for release builds, an EAS `credentials.json`.
Both are excluded from version control — see `.gitignore`.

```bash
eas build --platform android --profile production
eas update --branch production
```
