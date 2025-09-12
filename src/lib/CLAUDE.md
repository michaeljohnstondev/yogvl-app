# LIB FOLDER - CLAUDE.md

## MANDATORY AGENT WORKFLOW
**⚠️ CRITICAL: ALWAYS use these agents when modifying ANY utility file in this folder**

### PRIMARY UTILITY AGENTS
When ANY lib/utility file is modified, Claude MUST automatically use these agents:

1. **duplicate-code-guardian**
   - Prevent utility function duplication across the codebase
   - Identify similar utility patterns that should be consolidated
   - Check for repeated helper functions
   - Suggest utility composition and reuse

2. **code-organization-monitor**
   - Monitor utility file sizes and organization
   - Suggest breaking large utility files into modules
   - Ensure proper utility categorization
   - Track utility complexity and dependencies

3. **code-cleanup-auditor**
   - Remove unused utility functions and imports
   - Clean up legacy utility code
   - Audit for dead utility functions
   - Optimize utility performance

4. **component-inventory-moderator**
   - Update utility inventory in documentation
   - Prevent duplicate utility creation
   - Track utility usage across components

5. **missing-dependencies-guardian**
   - Validate utility function dependencies and imports
   - Prevent runtime errors from missing utility functions
   - Check that all external dependencies are properly imported
   - Detect missing exports for utility functions
   - Ensure utility functions are properly accessible

6. **security-privacy-guardian**
   - Review utility functions for security vulnerabilities
   - Audit data transformation functions for safe handling
   - Check validation utilities for injection protection
   - Ensure crypto/hashing utilities use secure algorithms
   - Review file handling utilities for path traversal safety

## UTILITY ARCHITECTURE PRINCIPLES

### What Lib/Utils SHOULD Contain:
- Pure helper functions
- Data transformation utilities
- Validation functions
- Formatting utilities
- Mathematical calculations
- String/array/object manipulation
- Constants and configurations
- Type definitions and schemas

### What Lib/Utils SHOULD NOT Contain:
- ❌ React components or JSX
- ❌ React hooks (useState, useEffect)
- ❌ Firebase/API operations (use services)
- ❌ Business logic (use services)
- ❌ UI state management
- ❌ Side effects or mutations

## UTILITY ORGANIZATION PATTERNS

### Standard Utility Structure:
```javascript
// src/lib/utilityName.js

/**
 * Pure utility functions for [specific purpose]
 * No side effects, no external dependencies
 */

// Core utility function
export const mainUtilityFunction = (input, options = {}) => {
  // Pure transformation logic
  return result
}

// Helper functions (can be private)
const helperFunction = (data) => {
  return transformedData
}

// Named exports for multiple utilities
export const relatedUtilityFunction = (input) => {
  return helperFunction(input)
}

// Default export for main utility
export default {
  mainUtilityFunction,
  relatedUtilityFunction
}
```

### Utility Categories:

#### Data Manipulation (`src/lib/`):
- **formatters** - Date, time, number formatting
- **validators** - Input validation functions
- **transformers** - Data transformation utilities
- **parsers** - String/data parsing functions

#### Event Utilities (`src/events/lib/`):
- Event-specific validation
- Event data transformation
- Event formatting utilities

#### Auth Utilities (`src/auth/lib/`):
- Authentication validation
- User data formatting
- Auth-specific helpers

## PURE FUNCTION REQUIREMENTS

### Utility Function Standards:
```javascript
// Good: Pure function
export const formatEventDate = (timestamp, format = 'short') => {
  if (!timestamp) return ''
  
  const date = new Date(timestamp.seconds * 1000)
  
  switch (format) {
    case 'short':
      return date.toLocaleDateString()
    case 'long':
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    default:
      return date.toISOString()
  }
}

// Avoid: Functions with side effects
const badUtility = (data) => {
  console.log(data) // Side effect
  setState(data)    // Side effect
  return data
}
```

### Function Characteristics:
- **Pure**: Same input always produces same output
- **No Side Effects**: No mutations, no I/O operations
- **Testable**: Easy to unit test
- **Reusable**: Works in any context
- **Documented**: Clear purpose and parameters

## UTILITY TESTING STANDARDS

### Required Tests:
- Test all input/output combinations
- Test edge cases and error conditions
- Test performance for data processing utilities
- Test type safety and validation

### Testing Pattern:
```javascript
// utilityName.test.js
import { utilityFunction } from './utilityName'

describe('utilityFunction', () => {
  test('handles normal input correctly', () => {
    expect(utilityFunction('input')).toBe('expected')
  })
  
  test('handles edge cases', () => {
    expect(utilityFunction(null)).toBe('')
    expect(utilityFunction(undefined)).toBe('')
  })
  
  test('handles invalid input', () => {
    expect(() => utilityFunction({})).toThrow()
  })
})
```

## MANDATORY CHECKS

### Pre-Creation:
1. **duplicate-code-guardian**: Check for existing similar utilities
2. Search codebase for repeated patterns
3. Review existing lib structure

### During Development:
1. **code-organization-monitor**: Track file organization
2. Ensure pure function principles
3. Maintain utility performance

### Post-Creation:
1. **code-cleanup-auditor**: Remove unused code
2. **component-inventory-moderator**: Update documentation
3. Test utility in multiple contexts

## UTILITY FILE SIZE LIMITS

### File Size Guidelines:
- **Simple Utilities**: < 100 lines
- **Complex Utilities**: < 300 lines
- **Mandatory Refactor**: 300+ lines

### Complexity Indicators:
- Multiple unrelated functions (split into modules)
- Complex conditional logic (simplify or extract)
- External dependencies (evaluate necessity)
- Performance bottlenecks (optimize algorithms)

## COMMON UTILITY PATTERNS

### Validation Utilities:
```javascript
// src/lib/validators.js
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validateRequired = (value) => {
  return value !== null && value !== undefined && value !== ''
}

export const validateLength = (value, min, max) => {
  if (!value) return false
  return value.length >= min && value.length <= max
}
```

### Formatting Utilities:
```javascript
// src/lib/formatters.js
export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount)
}

export const formatPhoneNumber = (phone) => {
  const cleaned = phone.replace(/\D/g, '')
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : phone
}
```

### Data Transformation Utilities:
```javascript
// src/lib/transformers.js
export const groupBy = (array, key) => {
  return array.reduce((groups, item) => {
    const group = item[key]
    groups[group] = groups[group] || []
    groups[group].push(item)
    return groups
  }, {})
}

export const sortBy = (array, key, direction = 'asc') => {
  return [...array].sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]
    
    if (direction === 'desc') {
      return bVal - aVal
    }
    return aVal - bVal
  })
}
```

## PERFORMANCE CONSIDERATIONS

### Optimization Guidelines:
- Use efficient algorithms for data processing
- Avoid unnecessary computations
- Implement memoization for expensive operations
- Consider lazy evaluation for large datasets

### Memory Management:
- Avoid memory leaks in utility functions
- Clean up temporary data structures
- Use efficient data structures

## DOCUMENTATION REQUIREMENTS

### Function Documentation:
```javascript
/**
 * Formats a timestamp into a human-readable date string
 * @param {Object} timestamp - Firestore timestamp object
 * @param {string} format - Format type ('short', 'long', 'iso')
 * @returns {string} Formatted date string
 * @example
 * formatEventDate(firestoreTimestamp, 'short') // "12/25/2023"
 */
export const formatEventDate = (timestamp, format = 'short') => {
  // Implementation
}
```

### Utility Categories Documentation:
- Document utility purpose and usage
- Provide examples for complex utilities
- List dependencies and requirements
- Include performance characteristics

## SUCCESS CRITERIA

A utility modification is complete when:
- ✅ No duplicate utility functions exist
- ✅ File size and organization optimized
- ✅ Functions are pure with no side effects
- ✅ No unused code remains
- ✅ Proper documentation provided
- ✅ Unit tests implemented
- ✅ Performance optimized
- ✅ Reusable across contexts
- ✅ Component inventory updated
- ✅ Follows BVS coding standards

**Remember**: Utilities are the building blocks of the application. Keep them pure, efficient, and well-tested.