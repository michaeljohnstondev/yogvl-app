# AUTH FOLDER - CLAUDE.md

## MANDATORY AGENT WORKFLOW

**⚠️ CRITICAL: ALWAYS use these agents when modifying ANY authentication file in this folder**

### PRIMARY AUTH AGENTS

When ANY auth file is modified, Claude MUST automatically use these agents:

1. **database-guardian**
   - Validate user data operations against DATABASE.md schema
   - Ensure proper user data structure usage
   - Check authentication state management
   - Validate user profile operations

2. **firebase-efficiency-guardian**
   - Review Firebase Auth usage patterns
   - Audit authentication operations for efficiency
   - Check for unnecessary auth state listeners
   - Optimize user data fetching

3. **duplicate-code-guardian**
   - Prevent auth logic duplication
   - Identify similar authentication patterns
   - Check for repeated validation logic
   - Suggest auth utility extraction

4. **component-inventory-moderator**
   - Check COMPONENT_INVENTORY.md for existing auth components
   - Prevent duplicate auth component creation
   - Update inventory when new auth components are created
   - Suggest existing auth patterns

5. **code-organization-monitor**
   - Monitor auth file sizes and complexity
   - Suggest breaking large auth components
   - Ensure proper auth folder organization
   - Track authentication flow complexity

6. **code-cleanup-auditor**
   - Remove unused auth functions and imports
   - Clean up legacy authentication code
   - Audit for dead auth logic

7. **missing-dependencies-guardian**
   - Validate authentication imports and exports
   - Prevent runtime errors from missing auth functions
   - Check Firebase Auth service dependencies
   - Detect broken auth context functions
   - Ensure auth validation functions are properly exported

8. **security-privacy-guardian**
   - Audit password handling and storage practices
   - Review authentication flow security vulnerabilities
   - Validate session management and token security
   - Check personal data collection compliance
   - Ensure secure user profile data handling
   - Review Firebase Auth rule security

9. **orchestration-reporter**
   - Coordinate findings from all auth-related agents
   - Consolidate agent reports into unified ZFINAL.md
   - Detect conflicts between agent recommendations
   - Prevent duplicate agent work on auth files
   - Route auth tasks to appropriate specialized agents

## AUTH ARCHITECTURE PRINCIPLES

### What Auth Files SHOULD Contain:

- User authentication operations
- Auth state management
- User profile operations
- Authentication validation
- Onboarding flow logic
- Security and permission checks

### What Auth Files SHOULD NOT Contain:

- ❌ Generic UI components (extract to components/ui)
- ❌ Generic utility functions (extract to lib)
- ❌ Event-specific logic (belongs in events)
- ❌ Business logic unrelated to auth
- ❌ Direct database operations (use services)

## AUTH FOLDER STRUCTURE

### Current Auth Organization:

```
src/auth/
├── screens/            # Authentication screens
│   ├── LoginScreen.js
│   ├── SignUpScreen.js
│   ├── ContactInfoScreen.js
│   └── LocationScreen.js
├── services/           # Auth services
│   ├── firebase.js     # Firebase config
│   └── FirebaseAuthService.js
├── hooks/              # Auth-specific hooks
├── lib/                # Auth utilities
└── store/              # Auth context/state
    └── AuthContext.js
```

### Auth Component Categories:

#### Authentication Screens:

- **LoginScreen** - Email/password login
- **SignUpScreen** - Account creation
- **ContactInfoScreen** - Profile setup
- **LocationScreen** - Studio selection

#### Auth Services:

- **FirebaseAuthService** - Core auth operations
- **firebase** - Firebase configuration

#### Auth State:

- **AuthContext** - Global auth state management

## DATABASE SCHEMA COMPLIANCE

### User Data Structure:

```javascript
// User profile data
const userData = {
  // Core user fields (see DATABASE.md)
  email: string,
  displayName: string,
  phoneNumber: string,
  studioId: string,

  // Profile information
  profilePicture?: string,
  interests?: string[],

  // Onboarding state
  hasCompletedOnboarding: boolean,

  // Metrics and reliability data
  metrics: {
    events: { /* event metrics */ },
    reliability: { /* reliability data */ },
    hosting: { /* hosting metrics */ }
  }
}
```

### Auth State Requirements:

- Track authentication status
- Manage user profile data
- Handle onboarding state
- Support studio selection

## AUTHENTICATION FLOW PATTERNS

### Standard Auth Flow:

1. **Unauthenticated** → Landing Screen
2. **Login/SignUp** → Authentication
3. **No Profile** → ContactInfo Screen
4. **No Studio** → Location Screen
5. **Authenticated** → Home Screen

### Auth State Management:

```javascript
// AuthContext pattern
const authState = {
  user: null, // Firebase user
  userData: null, // Firestore profile
  loading: true, // Auth loading state
  hasProfile: false, // Profile completion
  hasStudio: false, // Studio selection
  isOnboarded: false, // Onboarding status
};
```

## FIREBASE AUTH SECURITY

### Security Best Practices:

- Validate user input before auth operations
- Implement proper error handling
- Use secure password requirements
- Handle auth state changes properly
- Implement session management

### Auth Error Handling:

```javascript
// Standard auth error pattern
try {
  const result = await authOperation();
  return { success: true, user: result.user };
} catch (error) {
  console.error('[Auth] Operation failed:', error);
  return {
    success: false,
    error: getAuthErrorMessage(error.code),
  };
}
```

## AUTH STATE MANAGEMENT

### AuthContext Requirements:

- Provide current user state
- Handle authentication operations
- Manage onboarding flow
- Support logout and cleanup

### Auth Hook Patterns:

```javascript
// useAuth hook
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

## MANDATORY CHECKS

### Pre-Modification:

1. **database-guardian**: Review user data schema
2. **duplicate-code-guardian**: Check for similar auth logic
3. **firebase-efficiency-guardian**: Review current auth patterns

### During Development:

1. Monitor Firebase Auth usage
2. **code-organization-monitor**: Track complexity
3. Ensure security best practices

### Post-Modification:

1. **code-cleanup-auditor**: Remove unused code
2. Test authentication flows
3. Verify security measures

## AUTH FILE SIZE LIMITS

### File Size Guidelines:

- **Auth Components**: < 300 lines
- **Auth Services**: < 500 lines
- **Auth Hooks**: < 200 lines
- **Auth Screens**: < 500 lines

### Complexity Indicators:

- Large auth forms (break into components)
- Complex validation logic (extract to lib)
- Multiple Firebase operations (extract to services)
- Repeated auth patterns (extract to hooks)

## ONBOARDING FLOW MANAGEMENT

### Onboarding Steps:

1. Account creation/login
2. Contact information collection
3. Studio location selection
4. Profile completion
5. App introduction

### Onboarding State Tracking:

- Track completion status
- Support flow navigation
- Handle interruption/resumption
- Validate required information

## AUTH SERVICE PATTERNS

### Auth Service Structure:

```javascript
// FirebaseAuthService.js
class FirebaseAuthService {
  async signup(email, password) {
    // Account creation logic
  }

  async login(email, password) {
    // Login logic
  }

  async logout() {
    // Logout and cleanup
  }

  onAuthStateChanged(callback) {
    // Auth state listener
  }
}
```

### User Profile Operations:

- Create user profile
- Update profile information
- Handle profile pictures
- Manage user preferences

## TESTING REQUIREMENTS

### Auth Testing Strategy:

- Test authentication flows
- Test onboarding progression
- Test error handling
- Test auth state management
- Test security measures

### Integration Testing:

- Test auth with real Firebase
- Test onboarding completion
- Test auth state persistence

## SUCCESS CRITERIA

An auth modification is complete when:

- ✅ User data operations validated against schema
- ✅ Firebase Auth usage optimized
- ✅ No duplicate auth logic exists
- ✅ File sizes within limits
- ✅ Security best practices followed
- ✅ No unused code remains
- ✅ Auth flows work end-to-end
- ✅ Onboarding state properly managed
- ✅ Error handling implemented
- ✅ Component inventory updated

**Remember**: Authentication is the foundation of user experience. Keep auth logic secure, efficient, and user-friendly.
