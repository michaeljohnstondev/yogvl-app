# TASKS

## Light theme ("Pro" white) — in progress
Flip: long-press the Yo logo in the Home header (temporary until Settings toggle).
- [x] Batch 1: ThemeProvider, app background, status bar, Home header/search/sections/sticky bar
- [x] Retire Big Vibe Studios splash (in-app loader now; native splash on next EAS build)
- [x] Batch 2: matte palette, EventCard, default VibeButton, avatar ring, pro section headers
- [x] Admin swipe: CREATE AN EVENT ↔ ADMIN TOOLS
- [x] Fix: Android sticky-bar gap (root KeyboardAvoidingView now iOS-only) — verify on device
- [ ] Verify keyboard doesn't cover inputs on Android (Create Event, Login, Message Board)
- [ ] Batch 3: VibeCard, VibeInput, ScreenHeader, VibeModal
- [ ] Settings toggle (replace the logo long-press)
- [ ] Remaining screens, one at a time
- [ ] theyo-web: CSS-variable light theme to match

## Flyer ingestion pipeline (Part 2) — parked
Goal: venues send flyers/calendars, AI drafts events, admin approves.
Blocked on: DB approval for new collections, Anthropic API key, domain + email provider.
- [ ] DATABASE.md: add `studios/{studioId}/ingestQueue` + `studios/{studioId}/venueContacts`
- [ ] Cloud Function: flyer/text → Claude → structured event draft (title, venue, date, times, price, category)
- [ ] Duplicate check (same venue + same date) and venue matching against `venues`
- [ ] Admin-only Ingest screen: upload/paste, review queue, edit, Approve → normal event
- [ ] Batch mode (multiple screenshots → queue)
- [ ] Inbound email (Postmark/SendGrid/Resend) with per-venue reply address `events+<venue>@domain`
- [ ] Monday reminder email to venue managers (CAN-SPAM unsubscribe; skip venues with iCal feed)
- [ ] Confirmation reply to venue ("Got it! N events posted" + link)
- [ ] iCal (.ics) feed polling for venues that have one
- [ ] Twilio MMS: text a flyer to a number
