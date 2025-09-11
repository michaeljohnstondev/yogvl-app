# HOOKS FOLDER - CLAUDE.md

## MANDATORY AGENT WORKFLOW
**⚠️ CRITICAL: ALWAYS use these agents when modifying ANY hook file in this folder**

### PRIMARY HOOK AGENTS
When ANY hook is modified, Claude MUST automatically use these agents:

1. **component-inventory-moderator**
   - Check COMPONENT_INVENTORY.md for existing hooks
   - Prevent duplicate hook creation
   - Update inventory when new hooks are created
   - Suggest existing hooks for reuse

2. **duplicate-code-guardian**
   - Prevent hook duplication across the codebase
   - Identify similar state logic that should be consolidated
   - Check for repeated patterns in components
   - Suggest hook composition over duplication

3. **code-organization-monitor**
   - Monitor hook file sizes (keep under 200 lines)
   - Suggest breaking complex hooks into smaller ones
   - Ensure proper hook structure and organization
   - Track hook complexity and dependencies

4. **code-cleanup-auditor**
   - Remove unused hook functions and dependencies
   - Clean up legacy hook code
   - Audit for unused state and effects

## HOOK ARCHITECTURE PRINCIPLES

### What Hooks SHOULD Contain:
- Reusable state logic
- Complex state management patterns
- Shared side effects (useEffect)
- Custom business logic abstraction
- Data fetching patterns
- State synchronization

### What Hooks SHOULD NOT Contain:
- ❌ Direct JSX rendering
- ❌ Component-specific UI logic
- ❌ Firebase operations (use services instead)
- ❌ Navigation logic (belongs in screens)
- ❌ Utility functions (extract to lib)

## HOOK PATTERNS

### Standard Hook Structure:
```javascript
// src/hooks/useCustomHook.js
import { useState, useEffect, useCallback, useMemo } from 'react'

// Import services if needed
import serviceFunction from '../services/ServiceName'

const useCustomHook = (initialValue, options = {}) => {
  // State management
  const [state, setState] = useState(initialValue)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Memoized values
  const computedValue = useMemo(() => {
    return state.map(item => item.processed)
  }, [state])
  
  // Callbacks
  const handleAction = useCallback(async (params) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await serviceFunction(params)
      setState(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])
  
  // Effects
  useEffect(() => {
    if (options.autoLoad) {
      handleAction()
    }
  }, [options.autoLoad, handleAction])
  
  // Cleanup effects
  useEffect(() => {
    return () => {
      // Cleanup logic
    }
  }, [])
  
  return {
    state,
    loading,
    error,
    computedValue,
    actions: {
      handleAction,
      setState
    }
  }
}

export default useCustomHook
```

### Hook Categories:

#### Form Hooks (`src/events/hooks/`):
- `useEventFormState` - Form state management
- `useDateTimePickers` - Date/time selection
- `useEventForm` - Complete form logic

#### Data Hooks (`src/hooks/`):
- Data fetching patterns
- State synchronization
- Cache management

#### UI Hooks:
- Component state abstractions
- Animation state
- Interaction patterns

## HOOK OPTIMIZATION GUIDELINES

### Performance Optimization:
- Use `useMemo` for expensive calculations
- Use `useCallback` for stable function references
- Minimize re-renders with proper dependencies
- Implement cleanup in effects

### Dependency Management:
```javascript
// Good: Stable dependencies
const useOptimizedHook = (id) => {
  const [data, setData] = useState(null)
  
  const fetchData = useCallback(async () => {
    const result = await service.getData(id)
    setData(result)
  }, [id]) // Only re-create when id changes
  
  useEffect(() => {
    fetchData()
  }, [fetchData])
  
  return { data, refetch: fetchData }
}
```

### Memory Management:
- Clean up listeners and timers
- Cancel pending requests
- Clear intervals and timeouts
- Remove event listeners

## HOOK COMPOSITION PATTERNS

### Composing Multiple Hooks:
```javascript
const useEventScreen = (eventId) => {
  const { event, loading } = useEvent(eventId)
  const { attendance } = useAttendance(eventId)
  const { comments } = useComments(eventId)
  const formState = useEventFormState(event)
  
  return {
    event,
    loading,
    attendance,
    comments,
    formState
  }
}
```

### Hook with Service Integration:
```javascript
const useServiceHook = () => {
  const [data, setData] = useState([])
  
  const loadData = useCallback(async () => {
    try {
      const result = await MyService.fetchData()
      setData(result)
    } catch (error) {
      console.error('[useServiceHook] Error:', error)
    }
  }, [])
  
  return { data, loadData }
}
```

## MANDATORY CHECKS

### Pre-Creation:
1. **component-inventory-moderator**: Check existing hooks inventory
2. **duplicate-code-guardian**: Scan for similar state logic
3. Review existing hook patterns for reuse

### During Development:
1. **code-organization-monitor**: Track hook complexity
2. Monitor for proper React hooks rules
3. Ensure hook reusability

### Post-Creation:
1. **component-inventory-moderator**: Update hooks inventory
2. **code-cleanup-auditor**: Remove unused code
3. Test hook in multiple components

## HOOK SIZE LIMITS

### File Size Guidelines:
- **Simple Hooks**: < 50 lines
- **Complex Hooks**: < 200 lines
- **Mandatory Refactor**: 200+ lines

### Complexity Indicators:
- Multiple useState calls (consider useReducer)
- Complex useEffect dependencies
- Large amounts of derived state
- Multiple API calls in one hook

## REACT HOOKS RULES COMPLIANCE

### Rules of Hooks:
- Always call hooks at the top level
- Don't call hooks inside loops, conditions, or nested functions
- Only call hooks from React functions
- Use ESLint plugin to enforce rules

### Custom Hook Naming:
- Always start with "use"
- Use descriptive names
- Follow camelCase convention

## ERROR HANDLING IN HOOKS

### Standard Error Pattern:
```javascript
const useAsyncHook = () => {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  
  const execute = useCallback(async (params) => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await asyncOperation(params)
      setData(result)
    } catch (err) {
      setError(err)
      console.error('[useAsyncHook] Error:', err)
    } finally {
      setLoading(false)
    }
  }, [])
  
  return { data, error, loading, execute }
}
```

## TESTING HOOKS

### Hook Testing Strategy:
- Use @testing-library/react-hooks
- Test state changes
- Test side effects
- Test cleanup functions

## SUCCESS CRITERIA

A hook modification is complete when:
- ✅ Checked against hooks inventory
- ✅ No duplicate state logic exists
- ✅ File size under 200 lines
- ✅ Follows React hooks rules
- ✅ Proper error handling implemented
- ✅ No unused code remains
- ✅ Optimized for performance
- ✅ Reusable across components
- ✅ Updated in component inventory

**Remember**: Hooks abstract reusable state logic. Keep them focused, optimized, and free from UI concerns.