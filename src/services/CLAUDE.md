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

## SERVICE PATTERNS

### Standard Service Structure:
```javascript
// src/services/ServiceName.js

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

### During Modification:
1. `firebase-efficiency-guardian` monitors queries
2. `database-guardian` validates schema compliance
3. `code-organization-monitor` tracks complexity

### Post-Modification:
1. `code-cleanup-auditor` removes unused code
2. Test all Firebase operations
3. Verify error handling works properly

## SERVICE CATEGORIES

### Authentication Services (`src/auth/services/`):
- User authentication operations
- Profile management
- Session handling

### Core Services (`src/services/`):
- User management
- Notifications
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

**Remember**: Services are the data layer. Keep them focused on external operations and business logic, not UI concerns.