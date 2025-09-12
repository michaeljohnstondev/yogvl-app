# SCREENS FOLDER - CLAUDE.md

## MANDATORY AGENT WORKFLOW

**⚠️ CRITICAL: ALWAYS use ALL these agents when modifying ANY screen file in this folder**

### PRIMARY CODE ORGANIZATION AGENTS

When ANY screen is modified, Claude MUST automatically use these agents:

1. **component-inventory-moderator**
   - Check COMPONENT_INVENTORY.md before creating new components
   - Prevent duplicate screen creation
   - Update inventory when new screens are created

2. **code-organization-monitor**
   - Monitor screen file sizes (keep under 400 lines)
   - Suggest refactoring when screens become too large
   - Break down complex screens into smaller components

3. **database-guardian**
   - Validate any database operations against DATABASE.md schema
   - Ensure proper data structure usage
   - Check Firebase queries for efficiency

4. **duplicate-code-guardian**
   - Prevent code duplication across screens
   - Identify reusable patterns that should be extracted
   - Check for similar functionality in existing screens

5. **firebase-efficiency-guardian**
   - Review Firebase usage patterns in screens
   - Audit for resource-draining operations
   - Optimize database queries and listeners

6. **code-placement-validator**
   - Ensure screens are placed in correct directories
   - Validate naming conventions
   - Check imports and dependencies

7. **troubleshooting-coordinator**
   - Handle any technical issues during modifications
   - Debug problems systematically
   - Prevent repeated failed attempts

8. **code-cleanup-auditor**
   - Remove unused functions, variables, and imports
   - Clean up legacy code after modifications
   - Audit for dead code
   - **REQUEST APPROVAL** for file deletions before removing entire files

9. **missing-dependencies-guardian**
   - Detect missing function exports and undefined imports
   - Prevent runtime ReferenceError crashes before they happen
   - Validate all function calls have corresponding exports
   - Check import/export chains for broken dependencies
   - Suggest fixes for common typos and missing functions

10. **security-privacy-guardian**
    - Validate user input sanitization and validation
    - Review data display for potential exposure risks
    - Check navigation security (deep links, parameters)
    - Audit screen access controls and permissions
    - Ensure sensitive data isn't logged or exposed
    - Review data sharing patterns between screens

### SPECIALTY MONITORING AGENTS

**These agents monitor screens to ensure proper architecture separation:**

9. **Services Monitoring Agent**
   - **Purpose**: Scan screens for Firebase/API logic that belongs in `src/services/`
   - **Action**: Extract service calls to appropriate service files
   - **Rule**: Screens should import and use services, not contain service logic

10. **UI Components Monitoring Agent**
    - **Purpose**: Scan screens for reusable UI elements that belong in `src/components/ui/`
    - **Action**: Extract reusable UI to components and import them
    - **Rule**: Screens should compose UI components, not define them inline

11. **Hooks Monitoring Agent**
    - **Purpose**: Scan screens for reusable state logic that belongs in `src/hooks/`
    - **Action**: Extract reusable logic to custom hooks
    - **Rule**: Screens should use hooks, not contain complex state logic

12. **Utils Monitoring Agent**
    - **Purpose**: Scan screens for utility functions that belong in `src/lib/`
    - **Action**: Extract utility functions to appropriate lib files
    - **Rule**: Screens should import utils, not define utility functions

## SCREEN ARCHITECTURE PRINCIPLES

### What Screens SHOULD Contain:

- Screen-level navigation logic
- Composition of components, hooks, and services
- Screen-specific state management
- Event handlers that coordinate between services/components
- Screen-specific styling (not reusable styles)

### What Screens SHOULD NOT Contain:

- ❌ Firebase/Firestore direct operations (use services)
- ❌ Reusable UI components (extract to components/ui)
- ❌ Complex state logic (extract to hooks)
- ❌ Utility functions (extract to lib)
- ❌ Business logic (extract to services)
- ❌ Data transformation logic (extract to lib)

## MANDATORY CHECKS BEFORE ANY SCREEN MODIFICATION

1. **Pre-Modification Check**:
   - Run `component-inventory-moderator` to check existing inventory
   - Run `duplicate-code-guardian` to scan for similar screens

2. **During Modification**:
   - `code-organization-monitor` tracks file size and complexity
   - Specialty monitoring agents scan for misplaced code

3. **Post-Modification Check**:
   - `code-cleanup-auditor` removes unused code
   - `firebase-efficiency-guardian` audits performance
   - `troubleshooting-coordinator` if any issues arise

## REFACTORING TRIGGERS

### File Size Limits:

- **Warning**: 300+ lines
- **Mandatory Refactor**: 400+ lines
- **Action**: Use `code-organization-monitor` to suggest breakdown

### Complexity Indicators:

- Multiple useState hooks (extract to custom hook)
- Direct Firebase calls (extract to service)
- Inline complex components (extract to components)
- Utility functions (extract to lib)

## INTEGRATION REQUIREMENTS

### Required Documentation Checks:

- **COMPONENT_INVENTORY.md**: Check before creating components
- **DATABASE.md**: Validate any data operations
- **Main CLAUDE.md**: Follow project-wide conventions

### Required Imports Pattern:

```javascript
// Services first
import { serviceFunction } from '../services/ServiceName';

// Hooks second
import { useCustomHook } from '../hooks/useCustomHook';

// Components last
import { VibeComponent } from '../components/ui/VibeComponent';
```

## AGENT EXECUTION ORDER

1. **Pre-checks**: `component-inventory-moderator`, `duplicate-code-guardian`
2. **Monitoring**: All specialty monitoring agents (services, UI, hooks, utils)
3. **Organization**: `code-organization-monitor`, `code-placement-validator`
4. **Database**: `database-guardian` (if data operations involved)
5. **Performance**: `firebase-efficiency-guardian`
6. **Dependencies**: `missing-dependencies-guardian` (validate imports/exports)
7. **Security**: `security-privacy-guardian` (security and privacy audit)
8. **Cleanup**: `code-cleanup-auditor`
9. **Troubleshooting**: `troubleshooting-coordinator` (if needed)

## FILE DELETION APPROVAL WORKFLOW

When agents identify entire files for removal:

### **Automatic Actions (No Approval Needed):**
- Remove unused functions, variables, imports
- Fix code formatting and style issues
- Move files to correct directories
- Update documentation and inventories
- Refactor code within existing files

### **Requires User Approval:**
- Delete entire screen files (.js/.jsx)
- Delete entire component files
- Delete entire service files
- Remove directories
- Any destructive file system operations

### **Approval Request Format:**
```
🚨 FILE DELETION REQUEST
File: [path/to/file.js] ([X] lines)
Reason: [Why it should be deleted]
Impact: [What changes when removed]
Confidence: [High/Medium/Low]
REQUEST APPROVAL: Delete this file? (y/n)
```

## SUCCESS CRITERIA

A screen modification is complete when:

- ✅ File size under 400 lines
- ✅ No service logic in screen (extracted to services)
- ✅ No reusable UI components inline (extracted to components)
- ✅ No complex state logic (extracted to hooks)
- ✅ No utility functions (extracted to lib)
- ✅ All agents have completed their checks
- ✅ No unused imports or dead code
- ✅ All imports/exports validated and functional
- ✅ No missing dependencies or broken function calls
- ✅ Security and privacy compliance validated
- ✅ No sensitive data exposure or security vulnerabilities
- ✅ Follows BVS coding conventions

**Remember**: Screens are containers that orchestrate, not implement. Keep them clean, focused, and well-organized.
