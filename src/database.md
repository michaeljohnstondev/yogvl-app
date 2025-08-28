# Big Vibe Studios - Database Structure

This document outlines the Firebase Firestore database structure for the Big Vibe Studios app.

## Collections Overview

**Main Collections:**

```
/users/{userId}                              # User profiles and settings
/studios/{studioId}                          # Studio information with stats
```

**User Subcollections:**

```
/users/{userId}/notifications/{notificationId}   # User-specific notifications
/users/{userId}/following/{targetUserId}         # Users this user follows
/users/{userId}/followers/{followerId}           # Users following this user
```

**Studio Subcollections:**

```
/studios/{studioId}/events/{eventId}             # Events in this studio
/studios/{studioId}/events/{eventId}/attendance/{userId}  # Event attendance records
/studios/{studioId}/templates/{templateId}       # Event templates
/studios/{studioId}/admin/{reportId}             # Reports submitted in this studio
```

## User Object Structure

**Collection**: `/users/{userId}`

```javascript
{
  // === BASIC USER FIELDS ===
  uid: string,              // Firebase Auth UID
  email: string,            // User's email address
  displayName?: string,     // Optional display name

  // === NESTED USERDATA OBJECT ===
  userdata: {

    // CONTACT INFORMATION
    contactInfo: {
      firstName: string,
      lastName: string,
      email: string,           // Copy of main email
      phoneNumber?: string,
      profilePicture?: string, // Storage URL
    },

    // METADATA
    metadata: {
      createdAt: Timestamp,    // Account creation
      updatedAt: Timestamp,    // Last profile update
    },

    // STUDIO MEMBERSHIP
    studios: {
      default: {
        studioId: string,      // e.g., "greenville_sc"
        studioName: string,    // e.g., "Greenville Studio"
        studioCity: string,    // e.g., "Greenville"
        studioState: string,   // e.g., "SC"
        joinedAt: Timestamp,
      }
    },

    // EVENT METRICS
    metrics: {
      events: {
        created: number,                    // Events hosted
        joined: number,                     // Events subscribed to
        attended: number,                   // Events actually attended
        noShows: number,                    // Events missed
        subscribedEvents: string[],         // Array of event IDs
        attendedEvents: string[],           // Array of attended event IDs
        noShowEvents: string[],             // Array of missed event IDs
        lastEventCreated?: Timestamp,
        lastEventAttended?: Timestamp,
        lastNoShow?: Timestamp,
        lastActivity: Timestamp,
      },

      reliability: {
        score: number,                      // 0-100 reliability score
        tier: string,                       // "Excellent", "Good", "Fair", "Poor", "Unreliable"
        metrics: {
          totalRSVPs: number,
          totalAttended: number,
          totalNoShows: number,
          lastMinuteCancellations: number,
          recentEvents: number,             // Recent events count
          recentAttended: number,           // Recent attendance count
          attendanceRate: number,           // Overall % rate
          recentAttendanceRate: number,     // Recent % rate
        },
        streaks: {
          currentAttendanceStreak: number,
          longestAttendanceStreak: number,
          currentNoShowStreak: number,
        },
        lastUpdated: Timestamp,
      },

      engagement: {
        totalRatings: number,               // Number of times rated as host
        lastRated?: Timestamp,
      }
    },

    // USER SETTINGS
    settings: {
      privacy: {
        // CONTACT PRIVACY (3-level system: never, friends, always)
        emailVisibility: string,          // "never", "friends", "always"
        phoneVisibility: string,          // "never", "friends", "always"
        locationVisibility: string,       // "never", "friends", "always" [default: always]

        // ACTIVITY PRIVACY (3-level system: never, friends, always)
        shareEventHistory: string,        // "never", "friends", "always" [default: always]
        eventJoinVisibility: string,      // "never", "friends", "always" [default: always]
        showActivityStatus: string,       // "never", "friends", "always" [default: always]
        shareRecentActivity: string,      // "never", "friends", "always" [default: always]
        // FEATURE TOGGLES (boolean)
        allowFollowRequests: boolean,     // Allow follow requests [default: true]
        showFollowerCounts: boolean,      // Display follower/following counts [default: true]
        allowEventDiscovery: boolean,     // Show events in discovery [default: true]
        requireFollowForEvents: boolean,  // Require following to see events [default: false]
        showAttendanceStats: boolean,     // Show reliability stats [default: true]

        // DATA & ANALYTICS (boolean)
        dataCollectionConsent: boolean,   // Analytics consent [default: true]
        shareLocation: boolean,          // Location sharing [default: false]
        personalizedAds: boolean,        // Personalized content [default: true]

        // DEPRECATED FIELDS
        // whoCanFollowMe: removed - anyone can follow anyone
        // profileVisibility: removed - all profiles discoverable
      },
      notifications: {
        app: {
          eventInvitations: boolean,
          eventUpdates: boolean,
          eventReminders: boolean,
          socialActivity: boolean,
        },
        hosting: {
          guestJoined: boolean,
          guestLeft: boolean,
          eventFull: boolean,
          attendanceUpdates: boolean,
        },
        attending: {
          hostChanges: boolean,
          eventReminders: boolean,
          eventCancelled: boolean,
          lastMinuteChanges: boolean,
        }
      },
      lastUpdated?: Timestamp,
    },

    // SOCIAL FEATURES (stored as subcollections now)
    followingCount?: number,              // Count of users this user follows
    followerCount?: number,              // Count of users following this user
  },

  // === HOST RATING SYSTEM ===
  ratings?: {
    stars: number[],                      // Array of star ratings (last 50)
    timeRated: Timestamp[],               // Array of rating timestamps (last 50)
  },

  // === USER BLOCKING SYSTEM ===
  blockedUsers?: string[],               // Array of user IDs this user has blocked
  blockedBy?: string[],                  // Array of user IDs who have blocked this user

  // === MODERATION SYSTEM ===
  moderation?: {
    strikes: Array<{
      id: string,                         // Unique strike ID
      issuedAt: Timestamp,               // When strike was issued
      issuedBy: string,                  // Admin user ID who issued strike
      reason: string,                    // Reason from original report
      reportId: string,                  // Original report ID
      type: string,                      // 'user' or 'event' (what was reported)
      active: boolean,                   // Whether strike is still active
      expiresAt?: Timestamp,             // When strike expires (6 months)
    }>,
    warnings: Array<{
      id: string,                        // Unique warning ID
      issuedAt: Timestamp,               // When warning was issued
      issuedBy: string,                  // Admin user ID who issued warning
      reason: string,                    // Reason from original report
      reportId: string,                  // Original report ID
      type: string,                      // 'user' or 'event' (what was reported)
    }>,
    bans: {
      tempBans: Array<{
        id: string,                      // Unique temp ban ID
        issuedAt: Timestamp,             // When ban was issued
        issuedBy: string,                // Admin user ID who issued ban
        reason: string,                  // Reason for ban
        reportId: string,                // Original report ID (if any)
        expiresAt: Timestamp,            // When ban expires
        active: boolean,                 // Whether ban is currently active
        days: number,                    // Number of days for the ban
      }>,
      permBan?: {
        issuedAt: Timestamp,             // When permanent ban was issued
        issuedBy: string,                // Admin user ID who issued ban
        reason: string,                  // Reason for permanent ban
        reportId: string,                // Original report ID (if any)
        active: boolean,                 // Whether ban is active (always true)
      }
    },
    stats: {
      totalStrikes: number,              // Total strikes ever received
      activeStrikes: number,             // Current active strikes
      totalWarnings: number,             // Total warnings ever received
      lastStrikeDate?: Timestamp,        // Most recent strike date
      lastWarningDate?: Timestamp,       // Most recent warning date
      lastBanDate?: Timestamp,           // Most recent ban date
    },
    updatedAt?: Timestamp,               // Last time moderation record was updated
  }
}
```

---

## Event Object Structure

**Collection**: `/studios/{studioId}/events/{eventId}`

```javascript
{
  // === CORE EVENT FIELDS ===
  title: string,                        // Event title
  location: string,                     // Venue/location name
  description: string,                  // Event description/details
  address?: string,                     // Full address

  // === TIMESTAMPS ===
  eventTimestamp: Timestamp,            // When event occurs
  createdAt: Timestamp,                 // When event was created
  rsvpDeadline?: Timestamp,             // Optional RSVP cutoff

  // === PEOPLE ===
  createdBy: string,                    // User ID of creator
  subscribers: string[],                // Array of subscribed user IDs
  cohosts?: string[],                   // Array of cohost user IDs

  // === STATS ===
  subscriberCount?: number,             // Count of subscribers
  views: number,                        // View count
  attended: number,                     // Final attendance count
  noShows: number,                      // No-show count
  attendanceCount?: number,             // Live attendance tracking
  attendanceRate?: number,              // Percentage attendance rate
  lastAttendanceUpdate?: Timestamp,

  // === EVENT SETTINGS ===
  maxGuests?: number,                   // Max attendee limit
  hasFee: boolean,                      // Whether event has entry fee
  entryFee: number,                     // Entry fee amount (0 if free)
  isPrivate: boolean,                   // Private vs public event
  trackAttendance: boolean,             // Whether to track attendance
  attendanceType: string,               // "casual" or "strict"
  showHostContact: boolean,             // Show host contact info
  active: boolean,                      // Event is active/cancelled

  // === STUDIO RELATIONSHIP ===
  studioId?: string,                    // Parent studio ID
  studioName?: string,                  // Studio name for display
  studioCity?: string,                  // Studio city
  studioState?: string,                 // Studio state

  // === GUEST RATINGS ===
  guestRatings?: {
    [userId]: {
      rated: boolean,
      timestamp: Timestamp,
      ratingValue?: number,             // The actual star rating given
    }
  },

  // === INVITATION TRACKING ===
  pendingInvites?: number,              // Count of pending invitations
}
```

---

## Event Attendance Subcollection

**Collection**: `/studios/{studioId}/events/{eventId}/attendance/{userId}`

```javascript
{
  userId: string,                       // User who attended/didn't attend
  eventId: string,                      // Event ID
  attended: boolean,                    // True = attended, False = no-show
  markedBy: string,                     // User ID who marked attendance
  markedAt: Timestamp,                  // When attendance was marked
  checkInTime?: Timestamp,              // When they checked in
  isHost?: boolean,                     // True if this person was a host
  autoMarked?: boolean,                 // True if automatically marked (e.g., host)
}
```

---

## Studio Object Structure

**Collection**: `/studios/{studioId}`

```javascript
{
  id: string,                           // Studio ID (e.g., "greenville_sc")
  name: string,                         // Studio name
  city: string,                         // City name
  state: string,                        // State abbreviation
  active: boolean,                      // Studio is active
  createdAt: Timestamp,

  // STATS (automatically calculated)
  memberCount: number,                 // Number of members (calculated)
  eventCount: number,                  // Total events created (calculated)
  lastStatsUpdate?: Timestamp,         // When stats were last updated
}
```

---

## Template Object Structure

**Collection**: `/studios/{studioId}/templates/{templateId}`

```javascript
{
  name: string,                         // Template name
  description?: string,                 // Template description
  createdBy: string,                    // Creator user ID
  createdAt: Timestamp,
  isPublic: boolean,                    // Available to all studio members
  usageCount: number,                   // How many times used

  // Template payload - matches event form data structure
  payload: {
    title: string,
    location: string,
    details: string,
    maxGuests?: string,
    hasFee?: boolean,
    entryFee?: string,
    isPrivate?: boolean,
    trackAttendance?: boolean,
    attendanceType?: string,
    // ... other event form fields
  }
}
```

---

## Notification Object Structure

**Collection**: `/notifications/{notificationId}`

```javascript
{
  id: string,                           // Notification ID
  userId: string,                       // Recipient user ID
  type: string,                         // Notification type
  title: string,                        // Notification title
  message: string,                      // Notification message
  read: boolean,                        // Whether notification was read
  createdAt: Timestamp,

  // Type-specific data
  data?: {
    eventId?: string,
    invitationId?: string,
    studioId?: string,
    // ... other contextual data
  },

  // Action buttons for rich notifications
  actions?: Array<{
    id: string,
    title: string,
    action: string,
    params?: Object,
  }>
}
```

---

## Invitation Object Structure

**Collection**: `/invitations/{invitationId}`

```javascript
{
  id: string,                           // Invitation ID
  type: string,                         // "guest" or "cohost"
  status: string,                       // "pending", "accepted", "declined", "expired"

  // Event context
  eventId: string,                      // Event being invited to
  studioId: string,                     // Studio containing the event

  // People involved
  hostId: string,                       // User who sent invitation
  guestId?: string,                     // User being invited (if app user)
  guestEmail?: string,                  // Email being invited (if external)

  // Invitation details
  message?: string,                     // Custom invitation message
  createdAt: Timestamp,
  expiresAt?: Timestamp,
  respondedAt?: Timestamp,

  // Metadata
  source: string,                       // "create_event", "edit_event", "manual"
}
```

---

## Key Relationships

### User ↔ Events

- `events.createdBy` → `users/{userId}`
- `events.subscribers[]` → `users/{userId}`
- `events.cohosts[]` → `users/{userId}`
- `userdata.metrics.events.subscribedEvents[]` → `events/{eventId}`

### Studio ↔ Events

- `studios/{studioId}/events/` contains all studio events
- `events.studioId` → `studios/{studioId}`

### User ↔ Studio

- `userdata.studios.default.studioId` → `studios/{studioId}`

### Events ↔ Attendance

- `/studios/{studioId}/events/{eventId}/attendance/` contains attendance records
- `attendance.userId` → `users/{userId}`
- `attendance.eventId` → `events/{eventId}`

---

## Data Flow Examples

### Creating an Event

1. Event document created in `/studios/{studioId}/events/`
2. Creator added to `subscribers` array
3. Creator's metrics updated in `userdata.metrics.events`
4. Host auto-marked as attended in attendance subcollection
5. Invitations sent create documents in `/invitations/`

### Rating a Host

1. Rating added to host's `ratings.stars[]` array
2. Rating timestamp added to `ratings.timeRated[]` array
3. Event's `guestRatings.{userId}` updated
4. Host's `userdata.metrics.engagement.totalRatings` incremented

### Joining an Event

1. User ID added to event's `subscribers` array
2. Event ID added to user's `userdata.metrics.events.subscribedEvents`
3. User metrics counters updated
4. Invitation status updated to "accepted"

---

## Field Types Reference

- **Timestamp**: Firebase Firestore Timestamp object
- **string**: Text data
- **number**: Numeric data (integers or floats)
- **boolean**: true/false values
- **string[]**: Array of strings
- **Object**: Nested object/map structure
- **?**: Optional field (may not exist)

---

---

## Following/Follower Subcollections

### User Following Subcollection

**Collection**: `/users/{userId}/following/{targetUserId}`

```javascript
{
  id: string,                           // Target user ID
  userId: string,                       // User who is following
  targetUserId: string,                 // User being followed
  createdAt: Timestamp,                 // When follow relationship started
  targetData: {                         // Cached data for display
    firstName: string,
    lastName: string,
    displayName: string,
    avatar?: string
  }
}
```

### User Followers Subcollection

**Collection**: `/users/{userId}/followers/{followerId}`

```javascript
{
  id: string,                           // Follower user ID
  followerId: string,                   // User who is following this user
  userId: string,                       // User being followed
  createdAt: Timestamp,                 // When follow relationship started
  followerData: {                       // Cached data for display
    firstName: string,
    lastName: string,
    displayName: string,
    avatar?: string
  }
}
```

---

## Notifications Subcollection

**Collection**: `/users/{userId}/notifications/{notificationId}`

```javascript
{
  id: string,                           // Notification ID
  type: string,                         // Notification type
  title: string,                        // Notification title
  message: string,                      // Notification message
  read: boolean,                        // Whether notification was read
  createdAt: Timestamp,

  // Type-specific data
  data?: {
    eventId?: string,
    invitationId?: string,
    studioId?: string,
    senderId?: string,                  // User who triggered the notification
    // ... other contextual data
  },

  // Action buttons for rich notifications
  actions?: Array<{
    id: string,
    title: string,
    action: string,
    params?: Object,
  }>
}
```

---

---

## Key Database Improvements (2025)

### **Social System Enhancement**

- ✅ **Open Follow System**: Anyone can follow anyone (no approval needed)
- ✅ **Follow/Follower Subcollections**: Moved from arrays to proper subcollections for better performance
- ✅ **Mutual Friends Support**: System tracks mutual follows for social features
- ✅ **Cached User Data**: Follow relationships include cached display data for performance

### **Privacy System Simplification**

- ✅ **3-Level Privacy**: Simplified from 4 levels (never/friends/always)
- ✅ **No Profile Hiding**: All profiles are discoverable (removed profileVisibility)
- ✅ **Open Defaults**: Most activity defaults to "everyone can see" for better social engagement
- ✅ **Contact Protection**: Email/phone still default to friends-only for security

### **Studio Statistics**

- ✅ **Auto-calculated Stats**: memberCount and eventCount automatically maintained
- ✅ **Real-time Updates**: Stats update when users join/leave or create/delete events
- ✅ **Background Sync**: Service can recalculate all studio stats if needed

### **Database Security & Performance**

- ✅ **User-scoped Collections**: Notifications moved from root to user subcollections
- ✅ **Better Security Rules**: User data properly scoped and secured
- ✅ **Removed Legacy Fields**: Cleaned up unused attendees arrays and deprecated fields
- ✅ **Optimized Queries**: Better indexing with subcollection structure

### **System Architecture**

- ✅ **Privacy Service**: Centralized privacy checking with async support
- ✅ **Follow Service**: Complete social relationship management
- ✅ **Studio Stats Service**: Automated statistics calculation and maintenance
- ✅ **Clean Documentation**: Updated database.md with current structure and defaults

---

## Report Object Structure

**Collection**: `/studios/{studioId}/admin/{reportId}`

```javascript
{
  // BASIC REPORT INFO
  id: string,                            // Report ID
  type: string,                          // 'user' | 'event'
  reportedBy: string,                    // User ID of reporter
  reportedAt: Timestamp,                 // When report was submitted
  reason: string,                        // Reason for report
  status: string,                        // 'pending' | 'resolved_warning' | 'resolved_strike' | 'resolved_temp_ban' | 'resolved_perm_ban'
  studioId: string,                      // Studio where report was filed
  
  // REPORTER INFORMATION
  reporterInfo: {
    name: string,                        // Reporter's display name
    email: string,                       // Reporter's email
  },

  // FOR USER REPORTS
  reportedUser?: {
    id: string,                          // Reported user ID
    userData: object,                    // Full user data snapshot at time of report
    reportedInfo: {
      name: string,                      // Reported user's display name
      email: string,                     // Reported user's email
    }
  },

  // FOR EVENT REPORTS
  reportedEvent?: {
    id: string,                          // Reported event ID
    eventData: object,                   // Full event data snapshot at time of report
    creatorInfo: {
      id: string,                        // Event creator ID
      name: string,                      // Event creator's display name
      email: string,                     // Event creator's email
    }
  },

  // ADMIN RESOLUTION (if resolved)
  resolvedAt?: Timestamp,                // When report was resolved
  adminNotes?: string,                   // Admin notes about resolution
  lastUpdated: Timestamp,                // Last modification time
}
```

---

## Moderation System Rules

### **Strike System:**
- **Warning**: No penalty, just notification to user
- **Strike**: Formal violation recorded, expires after 6 months of good behavior
- **3 Active Strikes**: Automatic 30-day temporary ban
- **5 Active Strikes**: Automatic permanent ban

### **Ban Types:**
- **Temporary Ban**: User cannot create events or join events for specified duration
- **Permanent Ban**: User is permanently restricted from platform activities

### **Strike Expiration:**
- Strikes automatically become inactive after 6 months
- Only active strikes count toward automatic ban thresholds
- Strike history is preserved for admin reference

### **Report Resolution Status:**
- `pending`: Awaiting admin action
- `resolved_warning`: Resolved with warning issued
- `resolved_strike`: Resolved with strike issued  
- `resolved_temp_ban`: Resolved with temporary ban
- `resolved_perm_ban`: Resolved with permanent ban
- `dismissed`: Report dismissed as unfounded (deleted)

---

_Last Updated: August 28, 2025_
