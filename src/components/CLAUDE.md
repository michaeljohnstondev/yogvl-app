# COMPONENTS FOLDER - CLAUDE.md

## MANDATORY AGENT WORKFLOW
**⚠️ CRITICAL: ALWAYS use these agents when modifying ANY component file in this folder**

### PRIMARY COMPONENT AGENTS
When ANY component is modified, Claude MUST automatically use these agents:

1. **component-inventory-moderator**
   - Check COMPONENT_INVENTORY.md before creating new components
   - Prevent duplicate component creation
   - Update inventory when new components are created
   - Suggest existing components for reuse

2. **duplicate-code-guardian**
   - Prevent component duplication across the codebase
   - Identify similar components that should be consolidated
   - Check for repeated UI patterns
   - Suggest component composition over duplication

3. **code-organization-monitor**
   - Monitor component file sizes (keep under 300 lines)
   - Suggest breaking large components into smaller ones
   - Ensure proper component structure and organization
   - Track component complexity

4. **code-cleanup-auditor**
   - Remove unused props, functions, and imports
   - Clean up legacy component code
   - Audit for dead JSX and unused state
   - **REQUEST APPROVAL** for component file deletions

5. **missing-dependencies-guardian**
   - Validate component imports and prop dependencies
   - Prevent runtime errors from missing component functions
   - Check that all imported components are properly exported
   - Detect undefined props or missing context providers
   - Ensure component dependencies are correctly wired

6. **security-privacy-guardian**
   - Review input sanitization in form components
   - Audit data binding security patterns
   - Check component prop validation for security
   - Ensure sensitive data isn't exposed in component props
   - Review component access controls and permissions
   - Validate data flow security between components

## COMPONENT ARCHITECTURE PRINCIPLES

### What Components SHOULD Contain:
- Reusable UI logic and JSX
- Component-specific state (useState, useRef)
- Prop validation and default values
- Component-specific event handlers
- Component-specific styling
- Presentation logic

### What Components SHOULD NOT Contain:
- ❌ Direct Firebase/Firestore operations (use services)
- ❌ Complex business logic (extract to services)
- ❌ Navigation logic (belongs in screens)
- ❌ Utility functions (extract to lib)
- ❌ Global state management (use context)

## COMPONENT PATTERNS

### Standard Component Structure:
```javascript
// src/components/ComponentName.js
import React, { useState, useRef } from 'react'
import { View, Text } from 'react-native'

// UI components
import { VibeButton } from './ui/VibeButton'

// Styles
import { styles } from './ComponentName.styles'

const ComponentName = ({ 
  prop1, 
  prop2, 
  onAction,
  style,
  ...otherProps 
}) => {
  // Component state
  const [localState, setLocalState] = useState(false)
  
  // Event handlers
  const handleAction = () => {
    onAction?.(localState)
  }
  
  return (
    <View style={[styles.container, style]} {...otherProps}>
      <Text>{prop1}</Text>
      <VibeButton onPress={handleAction} label={prop2} />
    </View>
  )
}

export default ComponentName
```

### Component Categories:

#### Domain Components (`src/components/`):
- General reusable components
- Cross-domain UI elements
- Notification components
- Media components

#### UI Components (`src/components/ui/`):
- Core design system components
- Buttons, inputs, modals
- Layout components
- Theme-consistent elements

#### Event Components (`src/events/components/`):
- Event-specific components
- Event forms and displays
- Event management UI

## COMPONENT COMPOSITION GUIDELINES

### Favor Composition Over Inheritance:
```javascript
// Good: Compose smaller components
const EventCard = ({ event }) => (
  <VibeCard>
    <UserAvatar userId={event.hostId} />
    <EventDetails event={event} />
    <EventActions eventId={event.id} />
  </VibeCard>
)

// Avoid: Large monolithic components
```

### Prop Patterns:
- Use object destructuring for props
- Provide default values
- Use TypeScript or PropTypes for validation
- Support style and ...otherProps spreading

## MANDATORY CHECKS

### Pre-Creation:
1. **component-inventory-moderator**: Check existing components
2. **duplicate-code-guardian**: Scan for similar functionality
3. Review design system for existing patterns

### During Development:
1. **code-organization-monitor**: Track component size and complexity
2. Monitor for proper separation of concerns
3. Ensure component reusability

### Post-Creation:
1. **component-inventory-moderator**: Update inventory
2. **code-cleanup-auditor**: Remove unused code
3. Test component in isolation

## COMPONENT SIZE LIMITS

### File Size Guidelines:
- **Simple Components**: < 100 lines
- **Complex Components**: < 300 lines
- **Mandatory Refactor**: 300+ lines

### Complexity Indicators:
- Multiple useState hooks (consider custom hook)
- Complex event handlers (extract to functions)
- Large JSX blocks (break into sub-components)
- Conditional rendering logic (extract to components)

## STYLING STANDARDS

### Component Styling Patterns:
```javascript
// Internal styles file
import { styles } from './ComponentName.styles'

// Or inline for simple components
const styles = StyleSheet.create({
  container: {
    // BVS theme values
  }
})
```

### Theme Integration:
- Use theme values from `src/theme/themes.js`
- Follow BVS design system
- Maintain consistency with existing components

## REUSABILITY GUIDELINES

### High Reusability Components:
- Should be in `src/components/ui/`
- Minimal dependencies
- Configurable through props
- Theme-compliant

### Domain-Specific Components:
- Can be in domain folders
- May have domain-specific logic
- Should still be reusable within domain

## TESTING CONSIDERATIONS

### Component Testing:
- Test prop handling
- Test event handlers
- Test rendering states
- Test accessibility

### Integration Testing:
- Test with parent components
- Test with real data
- Test responsive behavior

## SUCCESS CRITERIA

A component modification is complete when:
- ✅ Checked against component inventory
- ✅ No duplicate functionality exists
- ✅ File size under 300 lines
- ✅ Proper component structure followed
- ✅ No unused code remains
- ✅ Reusable and well-composed
- ✅ Follows BVS design patterns
- ✅ Updated in component inventory

**Remember**: Components are reusable UI building blocks. Keep them focused, composable, and free from business logic.