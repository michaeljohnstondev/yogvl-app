# Event Creation Notifications — Architecture Notes

Working document. Not shipped. Captures the current state of the
`onEventCreated` / `onEventInvitation` notification flow, the problems
we've identified, the proposed clean architecture, and open cases we
haven't fully thought through yet.

Do not treat this as a spec — treat it as a whiteboard we can iterate
on before writing code.

---

## The functions involved

| Function | Trigger | File | Purpose |
|---|---|---|---|
| `onEventCreated` | Firestore `.onCreate` on `studios/{studioId}/events/{eventId}` | `eventInterestNotifications.js` | Fanout to studio (official), interests, and follows |
| `onEventInvitation` | Firestore `.onUpdate` on the same doc | `eventInvitationNotifications.js` | Notify newly-added invitees (diffs before/after `invitations` array) |

## Rules we've agreed on

1. **Privacy is structural, not disciplined.** A private event's recipient set = its invitees. Full stop. No fanout can leak past that.
2. **One notification per user per event creation.** If a user qualifies via multiple channels, they get ONE push whose body reflects all reasons.
3. **Respect in-app settings.** Master `pushNotifications` toggle gates everything. Each channel has its own toggle:
   - `officialEvents`
   - `suggestedEvents`
   - `friendEventActivity`
4. **Per-creator mute is honored.** If a follower muted the creator specifically, they don't get the follow-activity notification even if their toggle is on.
5. **Host, cohosts, and invitees are always excluded** from the create-fanout — they get their own dedicated notifications through other paths.

## Channels ("reasons" to fire)

- **`official`** — event is `isOfficialEvent === true`, recipient is a studio member
- **`follow`** — recipient follows the creator, event is public
- **`interest`** — event's title, location, or tags match a studio-level interest the recipient has, event is public
- **`invitation`** — recipient is in the `invitations` array (only source: initial-create or later add via EventDetail)

## Current problem: the race

Today's create flow is two writes back-to-back:

```
t=0.0s   addDoc(event with invitations=[])
t=0.1s   onEventCreated triggers (reads snap.data() → sees invitations=[])
t=0.2-0.5s   Client's sendEventInvitations updates invitations array
t=~0.6s   onEventInvitation triggers on the update
```

Because `onEventCreated` reads `snap.data()`, it sees an empty
`invitations` array — so it doesn't know to exclude invitees. In the
overlap case (invited + follower, or invited + interest-match), the
same user can get:

1. Interest/follow push from `onEventCreated` (before invitations are set)
2. Invitation push from `onEventInvitation` (moments later)

**= two notifications for one event.**

## Proposed architecture

**Client change**: bundle invitations into the initial `addDoc` write.
Same doc, one write, complete state.

**Server change**: `onEventCreated` reads `snap.data()` and sees
invitations from the start. One pass:

```
                  ┌─────────────────────┐
                  │ onEventCreated fires│
                  └──────────┬──────────┘
                             │
              ┌──────────────▼───────────────┐
              │ Read event, extract:         │
              │  invitees, host, cohosts,    │
              │  isPrivate, isOfficialEvent  │
              └──────────────┬───────────────┘
                             │
                    ┌────────▼────────┐
                    │  isPrivate?     │
                    └───┬─────────┬───┘
                   YES  │         │  NO
                        │         │
      ┌─────────────────▼──┐   ┌──▼────────────────────────┐
      │ Recipients =       │   │ Recipients =              │
      │ invitees only      │   │ union(invitees, studio*,  │
      │ (invitation reason)│   │  followers, interest-users)│
      └──────────┬─────────┘   │   * only if isOfficial    │
                 │             └──────────┬────────────────┘
                 │                        │
                 └────────┬───────────────┘
                          │
              ┌───────────▼────────────┐
              │ For each recipient:    │
              │   reasons = []         │
              │   if invitee:          │
              │     reasons.push       │
              │     ('invitation')     │
              │   if follows creator:  │
              │     reasons.push       │
              │     ('follow')         │
              │   if has interest:     │
              │     reasons.push       │
              │     ('interest', tag)  │
              │   if in studio and     │
              │      official:         │
              │     reasons.push       │
              │     ('official')       │
              └──────────┬─────────────┘
                         │
              ┌──────────▼─────────────┐
              │ Filter by settings:    │
              │  ANY reason enabled?   │
              └──────────┬─────────────┘
                         │
              ┌──────────▼─────────────┐
              │ Compose body from      │
              │ reasons (table below)  │
              └──────────┬─────────────┘
                         │
              ┌──────────▼─────────────┐
              │ Send push;             │
              │ fallback in-app on     │
              │ FCM failure            │
              └────────────────────────┘
```

**`onEventInvitation`** stays unchanged. It diffs
`beforeInvitations` vs `afterInvitations`. Post-create invitations are
new relative to the previous state; initial-create invitations are
already in the "before" of any later update, so they're never
re-notified. The diff naturally separates the two paths.

## Body composition table

Copy is placeholder — refine before shipping.

| Reasons present | Example body |
|---|---|
| `[invitation]` | "`{host}` invited you to `{event}`" |
| `[invitation, official]` | "You're invited to an official `{studio}` event: `{event}`" |
| `[official]` | "New event from `{studio}`: `{event}`" |
| `[follow]` | "`{creator}` created an event: `{event}`" |
| `[interest:concert]` | "New concert near you: `{event}`" |
| `[follow, interest:concert]` | "`{creator}` created a concert: `{event}`" |
| `[official, interest:concert]` | "Official concert event: `{event}`" |
| `[official, follow]` | "`{creator}` posted an official `{studio}` event" |
| `[official, follow, interest:concert]` | "`{creator}`'s official `{studio}` concert: `{event}`" |

Priority for title / lead-with: `invitation` > `official` > `follow` >
`interest`. Not because higher wins alone — because we want the
recipient to see the most relevant framing first.

## Open cases we haven't fully thought through

Seeded from the conversation. Not exhaustive.

### Invitation edge cases
- **Cohosts vs invitees**: cohost invitations flow through their own
  path (`sendCohostInvitation`). Need to confirm a cohost-invitee also
  gets excluded from interest/follow fanout.
- **Email invitations**: what happens when the invitee is an email
  address (not a registered user)? Assume: skip, no push, they get an
  email out-of-band. But confirm.
- **Cross-blocked users**: if creator has blocked recipient (or vice
  versa), no notification of any kind. Where does the block check
  live?
- **Someone re-invited after being uninvited**: if a user was removed
  from `invitations` then re-added, `onEventInvitation` will treat
  them as new and re-notify. Is that desired?

### Signal / reason combinations
- **User who's a studio member of an official event AND has interest
  match**: they'd normally get official + interest. Merged body works.
  Do we also need a `suggestedEvents` toggle check to gate the interest
  contribution to the body?
- **Follower who muted the creator**: `follow` reason should be
  dropped from their reasons list, but `interest` should still apply
  if it matches. Confirm the mute doesn't kill *all* their reasons.
- **Interest match that's the venue name only** (not tag, not title):
  currently works because the extractor scans location. Preserve.

### Ordering / atomicity
- **`onEventCreated` failure mid-fanout**: if we crash halfway
  through, some recipients get pinged, some don't. Retry policy?
  Idempotency key so we don't re-notify on retry?
- **Event edited before notifications finish sending**: if a host
  edits the title 5 seconds after create, does the in-flight fanout
  use the old title in the body? Probably yes and it's fine, but
  worth noting.
- **Event deleted before notifications finish sending**: fanout could
  still fire. Do we need a "check event still exists" guard before
  each send?

### Scale
- **10,000-member studio getting an official event push**: one query
  loads all users into memory. Batch or paginate.
- **User who follows 20 people all creating events in the same hour**:
  they get 20 pushes. Rate limiting per user per hour?
- **Interest with a huge user list**: e.g. "concert" tag matched by
  5,000 users. Batch delivery, not one shot.

### Delivery
- **Stale FCM tokens**: FCM returns "not-registered" on dead tokens.
  Do we detect and clear? Currently we don't — we just log the error.
- **User has master push off**: entire fanout skips them. But do we
  still create the in-app notification doc so they see history?
  Currently inconsistent between fanouts.
- **App is in foreground when push arrives**: FCM behaves differently
  (foreground pushes don't display by default on iOS). Handled on
  the client side, but worth flagging.

### Client migration
- Moving `invitations` into the initial `addDoc` requires updating
  `saveEventToDatabase` in `useEventForm.js`. Existing side effects
  of `sendEventInvitations` (creating per-invitation docs in
  subcollections, sending emails for email-only invitees) still need
  to run post-create because they need the eventId. Confirm the
  split cleanly: doc-array write happens in addDoc, side-effect work
  happens after.
- **Templates**: event templates might include invitees. If we
  change how invitations are written, templates need to keep working.
- **EditEventScreen**: editing an event might change the
  `invitations` array. onEventInvitation diffing needs to still work
  for removals + re-adds.

## Migration plan (draft)

1. Write `onEventCreatedV2` in a new file, **not registered** in
   `index.js`. Structurally correct, uses `snap.data()` invitations.
2. Update `saveEventToDatabase` in `useEventForm.js` to include
   `invitations: [...]` in the initial `addDoc`. Update
   `sendEventInvitations` to skip writing the `invitations` field
   (only do side effects).
3. Test in isolation with a dev event.
4. Register `onEventCreatedV2` in `index.js` alongside the old
   `onEventCreated`. Both run. Compare logs.
5. When confident, remove old `onEventCreated` (or leave it exporting
   nothing to keep the export name available).

## Non-goals

- Not restructuring `onEventInvitation` — the diff-based approach is
  already clean.
- Not changing the message-board notification code (separate file,
  separate scope).
- Not changing `onEventDeleted` or scheduled reminders.
