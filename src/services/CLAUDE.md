# SERVICES FOLDER - CLAUDE.md

## MANDATORY AGENT WORKFLOW
**⚠️ CRITICAL: ALWAYS use these agents when modifying ANY service file in this folder**

### PRIMARY SERVICE AGENTS
When ANY service is modified, Claude MUST automatically use these agents:

1. **firebase-efficiency-guardian**
   - Review Firebase usage patterns and queries
   - Audit for resource-draining background processes
   - Optimize database operations and listeners
   - Check for unnecessary real-time listeners

2. **database-guardian**
   - Validate all operations against DATABASE.md schema
   - Ensure proper data structure usage
   - Verify Firestore collection paths and queries
   - Check for data integrity issues

3. **duplicate-code-guardian**
   - Prevent service duplication
   - Identify similar functionality across services
   - Suggest service consolidation opportunities
   - Check for redundant API calls

4. **code-organization-monitor**
   - Monitor service file sizes (keep under 500 lines)
   - Suggest breaking large services into modules
   - Ensure proper function organization

5. **code-cleanup-auditor**
   - Remove unused functions and imports
   - Clean up legacy service code
   - Audit for dead API endpoints
   - **REQUEST APPROVAL** for service file deletions

6. **missing-dependencies-guardian**
   - Validate all service method calls and exports
   - Prevent runtime errors from missing service functions
   - Check service import/export chains for completeness
   - Detect undefined methods on service classes
   - Suggest fixes for broken service dependencies

7. **security-privacy-guardian**
   - Review Firebase operations for security vulnerabilities
   - Audit API key exposure and credential handling
   - Validate authentication token management
   - Check database security rules compliance
   - Ensure data encryption and secure transmission
   - Review service access patterns for privacy compliance

## NOTIFICATION ARCHITECTURE RULES

**⚠️ CRITICAL: These notification rules are ABSOLUTE and must NEVER be violated**

### ❌ FORBIDDEN NOTIFICATION TECHNOLOGIES
- **expo-notifications** - NEVER import or use in any capacity
- **@expo/notifications** - NEVER import or use
- **react-native-push-notification** - NEVER import or use
- **@react-native-community/push-notification-ios** - NEVER import or use
- **Any third-party notification libraries** - NEVER import or use

### ✅ APPROVED NOTIFICATION TECHNOLOGY STACK
- **@react-native-firebase/messaging** - ONLY approved push notification system
- **Firebase Cloud Functions** - ONLY approved backend notification processing
- **FCM (Firebase Cloud Messaging)** - ONLY approved notification delivery method

### Notification System Architecture
```
User Action → NotificationEngine → Cloud Functions → FCM → Device
```
**NO OTHER NOTIFICATION PATHS ARE PERMITTED**

### Notification Flow Requirements:
1. **Client Side**: Use NotificationEngine.createNotification()
2. **Backend**: Cloud Functions process FCM triggers
3. **Delivery**: FCM handles all notification display (foreground + background)
4. **Handling**: @react-native-firebase/messaging handles received notifications

### Forbidden Notification Patterns:
```javascript
// ❌ NEVER DO THIS
import * as Notifications from 'expo-notifications'
await Notifications.scheduleNotificationAsync(...)

// ✅ ONLY DO THIS
import messaging from '@react-native-firebase/messaging'
await notificationEngine.createNotification(...)
```

## SERVICE ARCHITECTURE PRINCIPLES

### What Services SHOULD Contain:
- Firebase/Firestore operations
- API calls and external integrations
- Data transformation for external sources
- Business logic for data operations
- Error handling for external operations
- Caching and optimization logic

### What Services SHOULD NOT Contain:
- ❌ UI components or JSX
- ❌ React hooks (useState, useEffect)
- ❌ Screen navigation logic
- ❌ UI state management
- ❌ Component-specific logic
- ❌ expo-notifications imports or usage

## SERVICE PATTERNS

### Standard Service Structure:
```javascript
// src/services/ServiceName.js

// ⚠️  WARNING: DO NOT USE expo-notifications IN THIS PROJECT
// ⚠️  Use Firebase Cloud Messaging (@react-native-firebase/messaging) ONLY
// ⚠️  All push notifications must go through FCM Cloud Functions

// External dependencies
import { db } from '../auth/services/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

// Internal utilities
import { validateData } from '../lib/validators'

class ServiceName {
  // Core CRUD operations
  async create(data) { }
  async read(id) { }
  async update(id, data) { }
  async delete(id) { }

  // Business logic methods
  async businessOperation(params) { }

  // Helper methods (private)
  _validateInput(data) { }
  _transformData(data) { }
}

export default new ServiceName()
```

### Required Service Exports:
- Default export of service instance
- Named exports for specific functions (if needed)
- Proper error handling and validation

## FIREBASE EFFICIENCY REQUIREMENTS

### Query Optimization:
- Use composite indexes for complex queries
- Limit query results with `.limit()`
- Use pagination for large datasets
- Cache frequently accessed data

### Listener Management:
- Clean up listeners in service cleanup methods
- Avoid unnecessary real-time listeners
- Use `.get()` instead of `.onSnapshot()` when possible
- Implement listener reference tracking

### Data Structure Validation:
- Validate against DATABASE.md schema
- Use proper collection paths: `studios/{studioId}/events`
- Handle subcollection queries correctly
- Ensure data integrity across operations

## MANDATORY CHECKS

### Pre-Modification:
1. Check DATABASE.md for schema requirements
2. Run `duplicate-code-guardian` for similar services
3. Review existing service patterns
4. **SCAN FOR EXPO-NOTIFICATIONS IMPORTS** - Automatic rejection if found

### During Modification:
1. `firebase-efficiency-guardian` monitors queries
2. `database-guardian` validates schema compliance
3. `code-organization-monitor` tracks complexity
4. **VALIDATE FCM-ONLY NOTIFICATION USAGE**

### Post-Modification:
1. `code-cleanup-auditor` removes unused code
2. Test all Firebase operations
3. Verify error handling works properly
4. **CONFIRM NO EXPO-NOTIFICATIONS IMPORTS**

## SERVICE CATEGORIES

### Authentication Services (`src/auth/services/`):
- User authentication operations
- Profile management
- Session handling

### Core Services (`src/services/`):
- User management
- **Notifications (FCM-ONLY)**
- Admin operations
- Shared business logic

### Event Services (`src/events/services/`):
- Event CRUD operations
- Invitation management
- Template operations

## ERROR HANDLING STANDARDS

### Required Error Patterns:
```javascript
try {
  const result = await firebaseOperation()
  return { success: true, data: result }
} catch (error) {
  console.error(`[ServiceName] Operation failed:`, error)
  return { success: false, error: error.message }
}
```

### Error Categories:
- Network errors
- Permission errors
- Validation errors
- Database constraint errors

## NOTIFICATION-SPECIFIC REQUIREMENTS

### Notification Service Rules:
1. **ONLY use @react-native-firebase/messaging**
2. **ALL notifications must go through NotificationEngine**
3. **NO direct FCM calls - use Cloud Functions**
4. **NO expo-notifications imports or usage**
5. **NO manual notification display code**

### Approved Notification Flow:
```javascript
// ✅ CORRECT: Client creates notification trigger
await notificationEngine.createNotification({
  userId,
  type: 'admin_notification',
  title,
  message,
  data
})

// ✅ CORRECT: Cloud Function processes and sends FCM
// (Happens automatically in Cloud Functions)

// ✅ CORRECT: FCM handles display
messaging().onMessage(async (remoteMessage) => {
  console.log('Message received:', remoteMessage)
  // FCM automatically displays notification
})
```

## PERFORMANCE GUIDELINES

### Caching Strategy:
- Cache static data locally
- Implement proper cache invalidation
- Use memory-efficient caching

### Batch Operations:
- Use Firestore batch writes when possible
- Combine related operations
- Minimize round trips to Firebase

## INTEGRATION REQUIREMENTS

### Required Documentation:
- **DATABASE.md**: Schema validation
- **COMPONENT_INVENTORY.md**: Service inventory tracking

### Service Dependencies:
- Import from proper service locations
- Avoid circular dependencies
- Use dependency injection when needed

## AGENT ENFORCEMENT FOR NOTIFICATIONS

When ANY notification-related code is detected, agents MUST:

1. **Scan for Forbidden Imports**: Auto-reject expo-notifications
2. **Enforce FCM-Only**: Ensure @react-native-firebase/messaging usage
3. **Validate Architecture**: Confirm NotificationEngine → Cloud Functions → FCM flow
4. **Block Non-FCM Patterns**: Reject direct notification display code

## SUCCESS CRITERIA

A service modification is complete when:
- ✅ All Firebase operations follow efficiency guidelines
- ✅ Database operations validated against schema
- ✅ No duplicate functionality exists
- ✅ File size under reasonable limits
- ✅ Proper error handling implemented
- ✅ No unused code remains
- ✅ Performance optimized
- ✅ Follows BVS service patterns
- ✅ **NO expo-notifications imports anywhere**
- ✅ **ONLY FCM-based notification architecture**

**Remember**: Services are the data layer. Keep them focused on external operations and business logic, not UI concerns. For notifications: FCM-ONLY, NO EXCEPTIONS.