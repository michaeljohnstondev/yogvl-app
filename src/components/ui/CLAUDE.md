# UI COMPONENTS FOLDER - CLAUDE.md

## MANDATORY AGENT WORKFLOW
**⚠️ CRITICAL: ALWAYS use these agents when modifying ANY UI component file in this folder**

### PRIMARY UI COMPONENT AGENTS
When ANY UI component is modified, Claude MUST automatically use these agents:

1. **component-inventory-moderator**
   - Check COMPONENT_INVENTORY.md for existing UI components
   - Prevent duplicate UI component creation
   - Update inventory when new UI components are created
   - Suggest existing components for composition

2. **duplicate-code-guardian**
   - Prevent UI component duplication across the design system
   - Identify similar UI patterns that should be unified
   - Check for repeated styling patterns
   - Suggest component variants over separate components

3. **code-organization-monitor**
   - Monitor UI component file sizes (keep under 250 lines)
   - Suggest breaking complex UI components into smaller ones
   - Ensure proper component structure and organization
   - Track component API complexity

4. **code-cleanup-auditor**
   - Remove unused props, styles, and imports
   - Clean up legacy UI component code
   - Audit for unused styling and dead JSX

## UI COMPONENT ARCHITECTURE PRINCIPLES

### What UI Components SHOULD Contain:
- Pure presentation logic
- Reusable UI patterns
- Design system implementation
- Theme-consistent styling
- Accessibility features
- Prop-driven configuration
- Visual state management

### What UI Components SHOULD NOT Contain:
- ❌ Business logic or data fetching
- ❌ Direct Firebase/API operations
- ❌ Navigation logic
- ❌ Complex state management (use hooks)
- ❌ Domain-specific logic
- ❌ Hardcoded data or content

## UI COMPONENT PATTERNS

### Standard UI Component Structure:
```javascript
// src/components/ui/VibeComponentName.js
import React, { forwardRef } from 'react'
import { View, Text, StyleSheet } from 'react-native'

// Theme
import { themes } from '../../theme/themes'

const VibeComponentName = forwardRef(({ 
  variant = 'primary',
  size = 'medium',
  disabled = false,
  children,
  style,
  onPress,
  ...otherProps 
}, ref) => {
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary': return styles.secondary
      case 'ghost': return styles.ghost
      default: return styles.primary
    }
  }
  
  const getSizeStyles = () => {
    switch (size) {
      case 'small': return styles.small
      case 'large': return styles.large
      default: return styles.medium
    }
  }
  
  return (
    <View 
      ref={ref}
      style={[
        styles.base,
        getVariantStyles(),
        getSizeStyles(),
        disabled && styles.disabled,
        style
      ]}
      onPress={disabled ? undefined : onPress}
      {...otherProps}
    >
      {children}
    </View>
  )
})

VibeComponentName.displayName = 'VibeComponentName'

const styles = StyleSheet.create({
  base: {
    // Base styling using theme values
    borderRadius: 8,
  },
  primary: {
    backgroundColor: themes.vibeBlue,
  },
  secondary: {
    backgroundColor: themes.vibeGreen,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: themes.vibeBlue,
  },
  small: {
    padding: 8,
  },
  medium: {
    padding: 12,
  },
  large: {
    padding: 16,
  },
  disabled: {
    opacity: 0.5,
  }
})

export default VibeComponentName
```

### UI Component Categories:

#### Core Controls:
- **VibeButton** - Primary button component
- **VibeInput** - Text input component
- **VibeDropdown** - Selection dropdown
- **VibeSegmentedControl** - Multi-option selector

#### Layout Components:
- **VibeScreen** - Screen wrapper (GLOBAL USE ONLY)
- **VibeModal** - Modal wrapper
- **VibeCarousel** - Horizontal scroller
- **VibeSeparator** - Visual divider

#### Display Components:
- **UserAvatar** - User profile pictures
- **ProfileAvatar** - Profile display
- **ReliabilityBadge** - User reliability indicator
- **EventCard** - Event display card

## DESIGN SYSTEM COMPLIANCE

### Theme Integration Requirements:
```javascript
// Always import and use theme values
import { themes } from '../../theme/themes'

const styles = StyleSheet.create({
  container: {
    backgroundColor: themes.vibeBlue,     // Use theme colors
    borderColor: themes.vibeGreen,       // Not hardcoded values
    fontFamily: themes.fontFamily,       // Use theme typography
  }
})
```

### BVS Design Standards:
- **Colors**: Use vibeBlue, vibeGreen, vibePink palette
- **Typography**: Graffiti-inspired but clean
- **Gradients**: Dark gradients with glow edges
- **Spacing**: Consistent spacing system
- **Borders**: Rounded corners and neon effects

## COMPONENT API DESIGN

### Prop Standards:
- **variant**: Style variations ('primary', 'secondary', 'ghost')
- **size**: Size variations ('small', 'medium', 'large')
- **disabled**: Disabled state
- **style**: Style override prop
- **children**: Content prop
- **...otherProps**: Spread remaining props

### Accessibility Requirements:
- Include accessible labels
- Support keyboard navigation
- Proper contrast ratios
- Screen reader compatibility

## MANDATORY CHECKS

### Pre-Creation:
1. **component-inventory-moderator**: Check existing UI components
2. **duplicate-code-guardian**: Scan for similar UI patterns
3. Review design system for existing solutions

### During Development:
1. **code-organization-monitor**: Track component complexity
2. Monitor theme compliance
3. Ensure accessibility standards

### Post-Creation:
1. **component-inventory-moderator**: Update UI inventory
2. **code-cleanup-auditor**: Remove unused code
3. Test component variants and states

## UI COMPONENT SIZE LIMITS

### File Size Guidelines:
- **Simple UI Components**: < 100 lines
- **Complex UI Components**: < 250 lines
- **Mandatory Refactor**: 250+ lines

### Complexity Indicators:
- Too many variant options (consider splitting)
- Complex conditional styling (extract to functions)
- Multiple responsibilities (break into sub-components)
- Large style objects (consider theme extraction)

## STYLING BEST PRACTICES

### StyleSheet Organization:
```javascript
const styles = StyleSheet.create({
  // Base styles first
  base: { },
  
  // Variants
  primary: { },
  secondary: { },
  
  // Sizes
  small: { },
  medium: { },
  large: { },
  
  // States
  disabled: { },
  focused: { },
  
  // Sub-elements
  container: { },
  content: { },
  label: { }
})
```

### Theme Value Usage:
- Always import theme constants
- Use semantic color names
- Maintain consistent spacing
- Follow typography hierarchy

## COMPONENT TESTING STANDARDS

### Required Tests:
- Render all variants correctly
- Handle props properly
- Apply styles correctly
- Support accessibility features
- Forward refs properly

### Visual Testing:
- Test all variant combinations
- Test responsive behavior
- Test theme consistency
- Test accessibility features

## REUSABILITY REQUIREMENTS

### High Reusability Standards:
- Zero business logic dependencies
- Configurable through props only
- Theme-compliant styling
- Minimal external dependencies
- Clear component API

### Documentation Requirements:
- Clear prop definitions
- Usage examples
- Variant demonstrations
- Accessibility notes

## SUCCESS CRITERIA

A UI component modification is complete when:
- ✅ Checked against UI component inventory
- ✅ No duplicate UI patterns exist
- ✅ File size under 250 lines
- ✅ Follows BVS design system
- ✅ Theme-compliant styling
- ✅ Accessibility features included
- ✅ No unused code remains
- ✅ Proper component API design
- ✅ Forward refs implemented
- ✅ Updated in component inventory

**Remember**: UI components are the foundation of the design system. Keep them pure, reusable, and theme-compliant.