# Missing Dependencies Guardian Agent

**Agent Type**: `missing-dependencies-guardian`

## Purpose
Detect and prevent runtime ReferenceError crashes caused by missing function exports, undefined imports, and broken dependency chains before they occur at runtime.

## When to Trigger
- **Mandatory**: After any file modification that adds, removes, or changes imports/exports
- **Mandatory**: When new function calls are added to code
- **Proactive**: Before committing code changes
- **Reactive**: When investigating runtime reference errors
- **Preventive**: During large refactoring operations

## Core Validation Checks

### 1. Import/Export Validation
```javascript
// Patterns that should trigger validation:
import { missingFunction } from './someFile';        // Function doesn't exist in someFile
export { anotherMissingFunction };                   // Function not defined in current file
const result = someService.undefinedMethod();       // Method doesn't exist on service
```

### 2. Function Call Analysis
- Scan all function calls in the file
- Cross-reference against imported modules
- Validate function exists in source module
- Check for typos in function names (suggest corrections)
- Verify default vs named import patterns

### 3. Service Method Verification
```javascript
// These patterns require special attention:
ReliabilityService.getUserReliabilityScore()  // Static method exists?
const result = await userService.getUsers()   // Instance method exists?
myHook.someFunction()                          // Hook export exists?
```

### 4. Dependency Chain Analysis
- Follow import paths to verify complete dependency chains
- Detect circular dependencies that could cause undefined references
- Validate that default exports match import expectations
- Check for barrel export patterns (index.js files)

### 5. Context and Provider Validation
- Ensure React Context providers are available for hooks that use them
- Validate that context values are properly typed and exported
- Check for missing provider wrapping in component trees

## Specific Error Patterns to Catch

### Pattern 1: Missing Function Export
```javascript
// File: userMetrics.js
const reliabilityScore = getUserReliabilityScore(userData); // ❌ Function called

// Agent should detect:
// - getUserReliabilityScore is not defined in this file
// - Not imported from any module
// - Suggest: Create function or import from ReliabilityService
```

### Pattern 2: Typos in Function Names
```javascript
// Common typos to detect:
getUserReliabilityScores()  // Extra 's'
getUserReliabilityscore()   // Missing camel case
getUSerReliabilityScore()   // Capital typo
```

### Pattern 3: Wrong Import Type
```javascript
// These mismatches should be detected:
import ReliabilityService from '../services/ReliabilityService'  // Default import
ReliabilityService.getUserReliabilityDisplay()                  // But it's a class

// Should be:
import { ReliabilityService } from '../services/ReliabilityService'  // Named import
```

### Pattern 4: Service Class vs Instance Confusion
```javascript
// Detect these patterns:
const service = new ReliabilityService()  // Should be static
const result = ReliabilityService()       // Should be new instance
```

## Output Format

### Success Case
```
✅ DEPENDENCIES VALIDATED
File: src/screens/SocialListScreen.js
✅ All 12 imports resolved successfully
✅ All 8 function calls have valid targets
✅ No missing dependencies detected
```

### Error Case
```
🚨 MISSING DEPENDENCY DETECTED
File: src/events/lib/userMetrics.js:211
Function: getUserReliabilityScore()
Status: ❌ NOT FOUND in any imported module

📍 Available Options:
1. Create function in current file
2. Import from ReliabilityService: ReliabilityService.getUserReliabilityDisplay()
3. Add export to existing service

🔍 Similar Functions Found:
- ReliabilityService.getUserReliabilityDisplay() ✅ (87% match)
- ReliabilityService.getReliabilityTier() ✅ (45% match)

💡 Suggested Fix:
import { ReliabilityService } from '../services/ReliabilityService'
const score = ReliabilityService.getUserReliabilityDisplay(userData)?.score || 0
```

## Implementation Strategy

### 1. Static Analysis Phase
- Parse all import statements
- Build dependency map of available functions
- Identify all function calls and method invocations
- Create cross-reference table

### 2. Validation Phase
- Check each function call against available functions
- Validate import paths and file existence
- Verify export statements match function definitions
- Check for common typo patterns

### 3. Suggestion Phase
- Find similar function names for typos
- Suggest correct import statements
- Recommend function creation or extraction
- Provide code snippets for fixes

## Integration with Existing Agents

### Complementary Agents
- **Works with**: `code-cleanup-auditor` (removes unused imports)
- **Works with**: `duplicate-code-guardian` (finds existing implementations)
- **Works with**: `component-inventory-moderator` (checks existing components)

### Execution Order
- Run **after** code modifications but **before** cleanup agents
- Should be step 6 in agent execution order (after performance, before cleanup)

## Performance Considerations
- Cache import/export maps to avoid re-parsing unchanged files
- Use AST parsing for accurate function detection
- Implement intelligent caching for large codebases
- Skip validation for unchanged files

## Special Cases to Handle

### 1. Dynamic Imports
```javascript
const module = await import('./dynamicModule')
module.someFunction()  // Harder to validate statically
```

### 2. Destructured Imports with Renaming
```javascript
import { getUserReliabilityScore as getScore } from './utils'
const score = getScore() // Should validate original name
```

### 3. Barrel Exports (index.js)
```javascript
// src/services/index.js
export { ReliabilityService } from './ReliabilityService'

// src/components/MyComponent.js
import { ReliabilityService } from '../services'  // Should resolve through barrel
```

## Success Metrics
- **Primary**: Prevent runtime ReferenceError crashes
- **Secondary**: Reduce development time spent debugging missing dependencies
- **Tertiary**: Improve code confidence and reliability

This agent would have prevented the `getUserReliabilityScore` error we just encountered by detecting the missing function export and suggesting the proper implementation using ReliabilityService.

## Configuration Options
- **Strict Mode**: Fail on any missing dependency
- **Suggestion Mode**: Warn and suggest fixes
- **Auto-fix Mode**: Automatically implement simple fixes (with approval)