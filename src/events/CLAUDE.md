# EVENTS FOLDER - CLAUDE.md

## MANDATORY AGENT WORKFLOW

**⚠️ CRITICAL: ALWAYS use these agents when modifying ANY event-related file in this folder**

### PRIMARY EVENT AGENTS

When ANY event file is modified, Claude MUST automatically use these agents:

1. **database-guardian**
   - Validate all event operations against DATABASE.md schema
   - Ensure proper studio-specific collection paths (`studios/{studioId}/events`)
   - Check event data structure compliance
   - Validate attendance tracking operations

2. **component-inventory-moderator**
   - Check COMPONENT_INVENTORY.md for existing event components
   - Prevent duplicate event component creation
   - Update inventory when new event components are created
   - Suggest existing event components for reuse

3. **firebase-efficiency-guardian**
   - Review Firebase usage in event operations
   - Audit event-related database queries for efficiency
   - Check for resource-draining event listeners
   - Optimize event data fetching patterns

4. **duplicate-code-guardian**
   - Prevent event logic duplication
   - Identify similar event patterns across components
   - Check for repeated event form logic
   - Suggest event utility extraction

5. **code-organization-monitor**
   - Monitor event file sizes and complexity
   - Suggest breaking large event components
   - Ensure proper event folder organization
   - Track event form complexity

6. **code-cleanup-auditor**
   - Remove unused event functions and imports
   - Clean up legacy event code
   - Audit for dead event logic

7. **missing-dependencies-guardian**
   - Validate event-related imports and exports
   - Prevent runtime errors from missing event functions
   - Check event service dependencies
   - Detect broken event form functions and hooks
   - Ensure event template functions are properly exported

8. **security-privacy-guardian**
   - Review event data privacy (location, attendee information)
   - Audit invitation systems for data sharing vulnerabilities
   - Validate user-generated content sanitization
   - Check event visibility and access controls
   - Ensure location data is handled securely
   - Review attendee data protection measures

9. **orchestration-reporter**
   - Coordinate findings from all event-related agents
   - Consolidate agent reports into unified ZFINAL.md
   - Detect conflicts between agent recommendations
   - Prevent duplicate agent work on event files
   - Route event tasks to appropriate specialized agents

## EVENT ARCHITECTURE PRINCIPLES

### What Event Files SHOULD Contain:

- Event-specific business logic
- Event form state management
- Event data validation
- Event-specific UI components
- Event lifecycle management
- Attendance tracking logic

### What Event Files SHOULD NOT Contain:

- ❌ Generic UI components (extract to components/ui)
- ❌ Generic utility functions (extract to lib)
- ❌ Direct Firebase operations (use services)
- ❌ Navigation logic (belongs in screens)
- ❌ Non-event-related logic

## EVENT FOLDER STRUCTURE

### Current Event Organization:

```
src/events/
├── components/          # Event-specific components
│   ├── what/           # Event name/privacy components
│   ├── when/           # Date/time selection components
│   ├── where/          # Location components
│   ├── who/            # Guest management components
│   ├── details/        # Event details components
│   └── additionalSettings/ # Settings components
├── hooks/              # Event-specific hooks
├── screens/            # Event screens
├── services/           # Event services
├── lib/                # Event utilities
└── templates/          # Event templates
```

### Component Categories:

#### Form Components:

- **What** - Event name, privacy, description
- **When** - Date and time selection
- **Where** - Location and venue selection
- **Who** - Guest management and RSVP
- **Details** - Additional event information

#### Management Components:

- **CreateEventForm** - Main event creation
- **EventCard** - Event display
- **EventTips** - Creation guidance

#### Guest Components:

- **GuestListViewer** - Display guests
- **GuestManager** - Manage guest operations
- **InvitationCard** - Individual invitations

## DATABASE SCHEMA COMPLIANCE

### Required Event Data Structure:

```javascript
// Events are stored in studio-specific collections
const eventPath = `studios/${studioId}/events/${eventId}`

const eventData = {
  // Core event fields (see DATABASE.md)
  title: string,
  dateTime: timestamp,
  location: object,
  privacy: string,

  // Attendance tracking
  attendance: [
    {
      userId: string,
      attended: boolean,
      isHost: boolean,
      markedBy: string,
      markedAt: timestamp,
      selfReported?: boolean,
      isSoloEvent?: boolean
    }
  ],

  // Additional fields as per schema
}
```

### Database Operation Requirements:

- Always use studio-specific paths
- Validate event data against schema
- Handle attendance tracking properly
- Implement proper error handling

## EVENT FORM SYSTEM

### Core Event Hooks:

- **useEventFormState** - Form state management with dirty tracking
- **useEventForm** - High-level form logic and submission
- **useDateTimePickers** - Date/time selection state
- **useSuggestions** - Autocomplete and suggestions

### Form Validation Requirements:

- Use event form validators
- Implement real-time validation
- Handle form submission errors
- Support form reset and templates

## MANDATORY CHECKS

### Pre-Modification:

1. **database-guardian**: Review DATABASE.md for event schema
2. **component-inventory-moderator**: Check existing event components
3. **duplicate-code-guardian**: Scan for similar event logic

### During Development:

1. **firebase-efficiency-guardian**: Monitor Firebase usage
2. **code-organization-monitor**: Track file complexity
3. Ensure proper event data handling

### Post-Modification:

1. **code-cleanup-auditor**: Remove unused code
2. Test event operations end-to-end
3. Verify database schema compliance

## EVENT FILE SIZE LIMITS

### File Size Guidelines:

- **Event Components**: < 300 lines
- **Event Hooks**: < 200 lines
- **Event Services**: < 500 lines
- **Event Screens**: < 500 lines

### Complexity Indicators:

- Large event forms (break into sub-components)
- Complex event logic (extract to hooks)
- Multiple Firebase operations (extract to services)
- Repeated event patterns (extract to utilities)

## EVENT BUSINESS LOGIC PATTERNS

### Event Creation Flow:

1. Form state initialization
2. User input validation
3. Data transformation
4. Service layer submission
5. Success/error handling

### Event Management Operations:

- Create, read, update, delete events
- Manage guest lists and invitations
- Handle attendance tracking
- Process event templates

## FIREBASE EFFICIENCY FOR EVENTS

### Event Query Optimization:

```javascript
// Good: Studio-specific queries with limits
const eventsQuery = query(
  collection(db, `studios/${studioId}/events`),
  where('dateTime', '>=', startDate),
  orderBy('dateTime'),
  limit(20)
);

// Avoid: Root-level event queries
```

### Event Listener Management:

- Clean up event listeners on unmount
- Use pagination for event lists
- Implement proper error handling
- Cache event data appropriately

## EVENT TEMPLATE SYSTEM

### Template Requirements:

- Save user event templates
- Apply templates to new events
- Template validation and error handling
- Template sharing and management

### Template Data Structure:

- Follow event schema for template data
- Support partial templates
- Implement template versioning

## TESTING REQUIREMENTS

### Event Testing Strategy:

- Test event creation flow
- Test event data validation
- Test Firebase operations
- Test attendance tracking
- Test template system

### Integration Testing:

- Test event screens with real data
- Test event form state management
- Test event service operations

## SUCCESS CRITERIA

An event modification is complete when:

- ✅ Database operations validated against schema
- ✅ Firebase usage optimized for efficiency
- ✅ No duplicate event logic exists
- ✅ File sizes within limits
- ✅ Component inventory updated
- ✅ No unused code remains
- ✅ Event business logic properly organized
- ✅ Studio-specific data paths used
- ✅ Attendance tracking works correctly
- ✅ Event templates function properly

**Remember**: Events are the core domain of the app. Keep event logic organized, efficient, and compliant with the database schema.
