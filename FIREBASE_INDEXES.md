# Required Firebase Composite Indexes

This file documents the Firebase Firestore composite indexes required for optimal performance of the invitation system.

## Critical Indexes for Invitation System

### 1. Invitations Collection

**Collection ID:** `invitations`

**Required Indexes:**

#### Index 1: Event + Status + Created Date
- **Fields:**
  - `eventId` (Ascending)
  - `status` (Ascending)
  - `createdAt` (Descending)
- **Purpose:** Query pending invitations for events, sorted by creation date
- **Query Pattern:** `where('eventId', '==', eventId).where('status', '==', 'pending').orderBy('createdAt', 'desc')`

#### Index 2: Guest ID + Status
- **Fields:**
  - `guestId` (Ascending)
  - `status` (Ascending)
- **Purpose:** Check user's invitation status across all events
- **Query Pattern:** `where('guestId', '==', userId).where('status', '==', 'pending')`

#### Index 3: Event + Guest (Unique Constraint)
- **Fields:**
  - `eventId` (Ascending)
  - `guestId` (Ascending)
- **Purpose:** Prevent duplicate invitations to same user for same event
- **Query Pattern:** `where('eventId', '==', eventId).where('guestId', '==', userId)`

#### Index 4: Guest Phone + Status
- **Fields:**
  - `guestPhone` (Ascending)
  - `status` (Ascending)
- **Purpose:** Check phone invitation status
- **Query Pattern:** `where('guestPhone', '==', normalizedPhone).where('status', '==', 'pending')`

#### Index 5: Guest Email + Status
- **Fields:**
  - `guestEmail` (Ascending)
  - `status` (Ascending)
- **Purpose:** Check email invitation status
- **Query Pattern:** `where('guestEmail', '==', email.toLowerCase()).where('status', '==', 'pending')`

#### Index 6: Sender + Created Date
- **Fields:**
  - `inviterId` (Ascending)
  - `createdAt` (Descending)
- **Purpose:** Track invitations sent by user (for rate limiting)
- **Query Pattern:** `where('inviterId', '==', senderId).orderBy('createdAt', 'desc')`

### 2. User Guest Invitations Subcollection

**Collection Path:** `users/{userId}/guestInvitations`

**Required Indexes:**

#### Index 1: Event + Status
- **Fields:**
  - `eventId` (Ascending)
  - `status` (Ascending)
- **Purpose:** Check guest invitation status for specific event
- **Query Pattern:** `where('eventId', '==', eventId).where('status', 'in', ['pending', 'accepted'])`

#### Index 2: Status + Created Date
- **Fields:**
  - `status` (Ascending)
  - `createdAt` (Descending)
- **Purpose:** List user's invitations by status
- **Query Pattern:** `where('status', '==', 'pending').orderBy('createdAt', 'desc')`

### 3. Studio Events Collection

**Collection Path:** `studios/{studioId}/events`

**Required Indexes:**

#### Index 1: Studio + Created By + Date
- **Fields:**
  - `createdBy` (Ascending)
  - `dateTime` (Descending)
- **Purpose:** List user's events in studio
- **Query Pattern:** `where('createdBy', '==', userId).orderBy('dateTime', 'desc')`

#### Index 2: Studio + Date + Status
- **Fields:**
  - `dateTime` (Ascending)
  - `status` (Ascending)
- **Purpose:** List upcoming events in studio
- **Query Pattern:** `where('dateTime', '>=', now).where('status', '==', 'active')`

## Array-Based Invitation System Indexes

### 4. Events Collection Array Queries

**Collection Path**: `studios/{studioId}/events`

**Required Indexes for Array-Contains Queries:**

#### Index 1: Invitations Array Contains + Status
- **Fields:**
  - `invitations` (Array)
  - `status` (Ascending)
- **Purpose:** Find events where user is invited and event is active
- **Query Pattern:** `where('invitations', 'array-contains', userId).where('status', '==', 'active')`

#### Index 2: Subscribers Array Contains + Event Date
- **Fields:**
  - `subscribers` (Array)
  - `eventTimestamp` (Ascending)
- **Purpose:** Find upcoming events user is subscribed to
- **Query Pattern:** `where('subscribers', 'array-contains', userId).where('eventTimestamp', '>=', now).orderBy('eventTimestamp', 'asc')`

#### Index 3: Subscribers Array Contains + Past Events
- **Fields:**
  - `subscribers` (Array)
  - `eventTimestamp` (Descending)
- **Purpose:** Find past events user attended
- **Query Pattern:** `where('subscribers', 'array-contains', userId).where('eventTimestamp', '<', now).orderBy('eventTimestamp', 'desc')`

#### Index 4: Invited Phones Array Contains
- **Fields:**
  - `invitedPhones` (Array)
- **Purpose:** Find events where phone number was invited
- **Query Pattern:** `where('invitedPhones', 'array-contains', normalizedPhone)`

### 5. User Collection Array Queries

**Collection Path**: `users/{userId}`

**Required Indexes for User Event Arrays:**

#### Index 1: User Invited Events Array
- **Fields:**
  - `userdata.metrics.events.invitedEvents` (Array)
- **Purpose:** Query user's invited events for membership checks
- **Query Pattern:** `where('userdata.metrics.events.invitedEvents', 'array-contains', eventId)`

#### Index 2: User Subscribed Events Array
- **Fields:**
  - `userdata.metrics.events.subscribedEvents` (Array)
- **Purpose:** Query user's subscribed events for membership checks
- **Query Pattern:** `where('userdata.metrics.events.subscribedEvents', 'array-contains', eventId)`

### 6. Combined Query Optimization Indexes

**For Complex Invitation Status Checking:**

#### Index 3: Event + User + Status (Multi-Collection Queries)
- **Collection:** `invitations`
- **Fields:**
  - `eventId` (Ascending)
  - `guestId` (Ascending)
  - `status` (Ascending)
- **Purpose:** Check specific user's invitation status for specific event
- **Query Pattern:** `where('eventId', '==', eventId).where('guestId', '==', userId).where('status', 'in', ['pending', 'accepted'])`

#### Index 4: Phone Invitation Status
- **Collection:** `invitations`
- **Fields:**
  - `guestPhone` (Ascending)
  - `status` (Ascending)
  - `eventId` (Ascending)
- **Purpose:** Check phone invitation status across events
- **Query Pattern:** `where('guestPhone', '==', normalizedPhone).where('status', '==', 'pending')`

#### Index 5: Email Invitation Status
- **Collection:** `invitations`
- **Fields:**
  - `guestEmail` (Ascending)
  - `status` (Ascending)
  - `eventId` (Ascending)
- **Purpose:** Check email invitation status across events
- **Query Pattern:** `where('guestEmail', '==', email).where('status', '==', 'pending')`

## Firebase Console Setup Commands

To create these indexes in Firebase Console:

1. **Go to Firestore Database > Indexes**
2. **Click "Create Index"**
3. **Enter the collection ID and field configurations above**

### CLI Alternative

If using Firebase CLI, add to `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "invitations",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "eventId", "order": "ASCENDING"},
        {"fieldPath": "status", "order": "ASCENDING"},
        {"fieldPath": "createdAt", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "invitations",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "guestId", "order": "ASCENDING"},
        {"fieldPath": "status", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "invitations",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "eventId", "order": "ASCENDING"},
        {"fieldPath": "guestId", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "events",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "invitations", "arrayConfig": "CONTAINS"},
        {"fieldPath": "status", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "events",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "subscribers", "arrayConfig": "CONTAINS"},
        {"fieldPath": "eventTimestamp", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "events",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "subscribers", "arrayConfig": "CONTAINS"},
        {"fieldPath": "eventTimestamp", "order": "DESCENDING"}
      ]
    },
    {
      "collectionGroup": "invitations",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "eventId", "order": "ASCENDING"},
        {"fieldPath": "guestId", "order": "ASCENDING"},
        {"fieldPath": "status", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "invitations",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "guestPhone", "order": "ASCENDING"},
        {"fieldPath": "status", "order": "ASCENDING"},
        {"fieldPath": "eventId", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "invitations",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "guestEmail", "order": "ASCENDING"},
        {"fieldPath": "status", "order": "ASCENDING"},
        {"fieldPath": "eventId", "order": "ASCENDING"}
      ]
    }
  ]
}
```

## Critical Performance Considerations for Array-Based Queries

### Array-Contains Query Limitations

⚠️ **IMPORTANT**: Array-contains queries have specific limitations that affect performance:

1. **Single Array-Contains per Query**: You can only use one `array-contains` filter per query
2. **No Range Queries with Array-Contains**: Cannot combine array-contains with `<`, `<=`, `>`, `>=` on different fields
3. **Array Size Limits**: Arrays should be kept under 1,000 elements for optimal performance

### Optimized Query Patterns

**✅ EFFICIENT:**
```javascript
// Single array-contains with equality filters
where('invitations', 'array-contains', userId)
  .where('status', '==', 'active')

// Array-contains with orderBy on same field not recommended but possible
where('subscribers', 'array-contains', userId)
  .orderBy('eventTimestamp', 'asc')
```

**❌ INEFFICIENT:**
```javascript
// Multiple array-contains (NOT SUPPORTED)
where('invitations', 'array-contains', userId)
  .where('subscribers', 'array-contains', otherUserId)

// Array-contains with range on different field (NOT SUPPORTED)
where('invitations', 'array-contains', userId)
  .where('eventTimestamp', '>=', now)
```

### Array Management Best Practices

1. **Limit Array Size**: Keep invitation and subscriber arrays under 500 elements
2. **Clean Up Arrays**: Remove expired invitations and inactive subscribers regularly
3. **Use Batch Operations**: Update arrays in batches to avoid race conditions
4. **Monitor Array Growth**: Set up alerts for arrays approaching size limits

## Performance Impact

**Without Indexes:**
- Array-contains queries: 5-30+ seconds for large collections
- Complex invitation filtering: Requires client-side processing
- Firebase costs: Extremely high due to full collection scans
- User experience: Invitation screens timeout or crash

**With Proper Indexes:**
- Array-contains queries: 50-200ms
- Invitation status checks: Near-instantaneous O(1) lookups
- Firebase costs: Minimal index-based reads only
- User experience: Real-time invitation filtering

## Monitoring

Monitor index usage in Firebase Console under:
- **Firestore > Usage** - Overall read/write metrics
- **Performance > Query Performance** - Query execution times
- **Database > Indexes** - Index build status and usage

### Array-Specific Monitoring

Set up alerts for:
- Array-contains query execution time > 500ms
- Missing array index warnings
- Array size approaching 500 elements per event
- Composite query failures for invitation status checks

### Key Metrics to Track

1. **Query Performance:**
   - `where('invitations', 'array-contains', userId)` average response time
   - `where('subscribers', 'array-contains', userId)` average response time
   - Complex invitation status queries response time

2. **Array Health:**
   - Maximum array sizes across events
   - Number of events with large invitation arrays (>100 elements)
   - Rate of array growth over time

3. **Index Usage:**
   - Array index hit rates
   - Unused composite indexes
   - Index storage costs vs. query savings

## Maintenance

**Weekly Array Maintenance:**
- Clean up expired invitations from event arrays
- Remove inactive subscribers from event arrays
- Archive old invitation records (>30 days)
- Monitor array size growth trends

**Monthly Index Review:**
- Check for unused array indexes
- Monitor array-contains query performance metrics
- Update indexes as invitation query patterns evolve
- Review array size limits and optimization opportunities

**Quarterly Optimization:**
- Analyze invitation patterns for new index opportunities
- Remove unused indexes to reduce write costs
- Optimize array cleanup processes
- Review storage costs vs. query performance for array-based patterns

### Array Size Management

**Automated Cleanup Rules:**
- Remove declined invitations after 7 days
- Remove expired invitations after 24 hours
- Archive completed event arrays after 30 days
- Limit invitation arrays to 200 active elements per event

## 7. Attendance System Indexes

### Required Indexes for Attendance Performance

**Collection Path:** `studios/{studioId}/events`

#### Index 1: Attendance Array + Event Status
- **Fields:**
  - `attendance` (Array)
  - `status` (Ascending)
- **Purpose:** Query events where user attended
- **Query Pattern:** `where('attendance', 'array-contains-any', [userId]).where('status', '==', 'completed')`

#### Index 2: Event Type + Attendance Count
- **Fields:**
  - `attendanceType` (Ascending)
  - `attendanceCount` (Ascending)
- **Purpose:** Query events by attendance tracking type and participation
- **Query Pattern:** `where('attendanceType', '==', 'strict').where('attendanceCount', '>', 0)`

#### Index 3: Created By + Event Date + Attendance
- **Fields:**
  - `createdBy` (Ascending)
  - `eventTimestamp` (Descending)
  - `trackAttendance` (Ascending)
- **Purpose:** Host's events with attendance tracking enabled
- **Query Pattern:** `where('createdBy', '==', userId).where('trackAttendance', '==', true).orderBy('eventTimestamp', 'desc')`

#### Index 4: Subscribers + Attendance Status
- **Fields:**
  - `subscribers` (Array)
  - `attendanceType` (Ascending)
  - `status` (Ascending)
- **Purpose:** User's attended events by type
- **Query Pattern:** `where('subscribers', 'array-contains', userId).where('attendanceType', '==', 'casual').where('status', '==', 'completed')`

### CLI Configuration for Attendance Indexes

Add to `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "events",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "attendance", "arrayConfig": "CONTAINS"},
        {"fieldPath": "status", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "events",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "attendanceType", "order": "ASCENDING"},
        {"fieldPath": "attendanceCount", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "events",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "createdBy", "order": "ASCENDING"},
        {"fieldPath": "eventTimestamp", "order": "DESCENDING"},
        {"fieldPath": "trackAttendance", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "events",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "subscribers", "arrayConfig": "CONTAINS"},
        {"fieldPath": "attendanceType", "order": "ASCENDING"},
        {"fieldPath": "status", "order": "ASCENDING"}
      ]
    }
  ]
}
```

### Attendance Query Performance Impact

**Without Attendance Indexes:**
- Attendance queries: 10-45 seconds for large event collections
- Host attendance management: Requires full collection scans
- Post-event wrap-up: Timeouts on events with 100+ attendees
- Firebase costs: $20-50/month for attendance operations

**With Proper Attendance Indexes:**
- Attendance queries: 100-300ms
- Real-time attendance marking: Near-instantaneous updates
- Bulk attendance operations: Optimized batch processing
- Firebase costs: 90% reduction in attendance operation costs

### Attendance-Specific Monitoring

**Key Metrics for Attendance Performance:**
- Attendance array size per event (target: <500 elements)
- Bulk attendance operation response time (target: <2s)
- Post-event completion time (target: <5s)
- Host attendance management load time (target: <1s)