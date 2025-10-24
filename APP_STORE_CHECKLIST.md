# App Store Submission Checklist

## Phase 1: Legal & Marketing Materials (Do First)

### 📄 Privacy Policy & Terms
- [ ] **Create Privacy Policy** (REQUIRED for both stores)
  - Cover: data collection (email, phone, location, contacts, photos)
  - Firebase usage, push notifications, analytics
  - User rights (delete account, data export)
  - COPPA compliance if under-13 allowed
  - Tools: [Termly](https://termly.io/), [PrivacyPolicies.com](https://www.privacypolicies.com/)
- [ ] **Host Privacy Policy**
  - Option 1: Your domain (e.g., bigvibestudios.com/privacy)
  - Option 2: GitHub Pages (free)
  - Get the URL ready
- [ ] **Create Terms of Service** (Recommended)
  - User conduct rules
  - Content ownership
  - Liability disclaimers

### 🎨 App Store Assets
- [ ] **App Icon** (1024x1024px PNG, no transparency, no rounded corners)
- [ ] **Screenshots** (at least 3-5 per device size)
  - iPhone 6.7" (iPhone 14 Pro Max, 15 Pro Max)
  - iPhone 6.5" (iPhone 11 Pro Max, XS Max)
  - iPhone 5.5" (older devices)
  - Android: Phone + 7" tablet (optional but recommended)
- [ ] **Feature Graphic** (Android only: 1024x500px)
- [ ] **Promo Video** (Optional but increases conversions)

### ✍️ Store Listing Copy
- [ ] **App Name**: "The Yo" or "Big Vibe Studios"
- [ ] **Subtitle** (iOS, 30 chars): E.g., "Community Event Management"
- [ ] **Short Description** (Android, 80 chars)
- [ ] **Full Description** (4000 chars max)
  - What is it?
  - Key features
  - Who is it for?
  - Call to action
- [ ] **Keywords** (iOS, 100 chars): event, community, local, studio, meetup, rsvp
- [ ] **Category**: Social Networking or Lifestyle
- [ ] **Age Rating**: Determine based on content (likely 12+ or 17+)

## Phase 2: Developer Accounts & Setup

### 🍎 Apple Developer Program
- [ ] **Enroll** ($99/year) at [developer.apple.com](https://developer.apple.com)
- [ ] **Two-Factor Authentication** enabled on Apple ID
- [ ] **App Store Connect** access
- [ ] **Create App Record** in App Store Connect
  - Use bundle ID: `com.bigvibestudios.bvs`
  - Set primary language
  - Choose availability (countries)
- [ ] **Banking & Tax Info** (if monetizing or using in-app purchases)
- [ ] **TestFlight** setup for beta testing

### 🤖 Google Play Console
- [ ] **Create Account** ($25 one-time) at [play.google.com/console](https://play.google.com/console)
- [ ] **Payment Profile** setup
- [ ] **Create App** in Play Console
  - App name: "The Yo"
  - Default language: English
  - App or Game: App
  - Free or Paid: Free
- [ ] **Content Rating Questionnaire**
  - Be honest about user-generated content
  - Mentions of violence, drugs, etc.
- [ ] **Target Audience** declaration
- [ ] **Data Safety** form (what data you collect)

## Phase 3: Technical Requirements

### ✅ Already Done (in app.json)
- [x] Bundle identifiers configured
- [x] Build numbers set
- [x] Firebase integration
- [x] Push notification setup
- [x] iOS permission descriptions added
- [x] App description added

### 🔧 Still Need to Verify/Add

#### Assets Check
- [ ] Verify `./assets/logo.png` is 1024x1024px
- [ ] Verify `./assets/splash.png` looks good
- [ ] Create app store screenshots (use simulator/device)

#### iOS Specific
- [ ] **App Store Connect** listing complete
  - App Preview/Screenshots uploaded
  - Description filled
  - Keywords added
  - Support URL: Need a website or support email
  - Marketing URL (optional)
- [ ] **Build for Submission**
  ```bash
  eas build --platform ios --profile production
  ```
- [ ] **Upload to TestFlight** for internal testing first
- [ ] **Submit for Review**

#### Android Specific
- [ ] **Play Console** listing complete
  - Screenshots uploaded
  - Feature graphic uploaded
  - Description filled
  - Short description filled
- [ ] **Content Rating**
  - Complete IARC questionnaire
- [ ] **Build for Submission**
  ```bash
  eas build --platform android --profile production
  ```
- [ ] **Create Internal Test Track** (alpha/beta testing)
- [ ] **Submit for Review**

## Phase 4: Pre-Launch Testing

### 🧪 Testing Checklist
- [ ] Test on real iOS device (not just simulator)
- [ ] Test on real Android device (not just emulator)
- [ ] Test all user flows:
  - [ ] Sign up / Login
  - [ ] Create event
  - [ ] Join event
  - [ ] Show interest in event
  - [ ] Follow user
  - [ ] Receive notifications (test all types)
  - [ ] Upload photos
  - [ ] Access contacts
  - [ ] Location permissions
- [ ] Test with slow/no internet connection
- [ ] Test notification permissions (allow, deny, later)
- [ ] Test on different iOS versions (13.4+)
- [ ] Test on different Android versions (API 21+)

### 🐛 Common Rejection Reasons to Avoid
- [ ] **Crashes on launch** - Test thoroughly!
- [ ] **Broken features** - Make sure everything works
- [ ] **Missing privacy policy** - Must be accessible in app
- [ ] **Permissions not explained** - iOS descriptions added ✓
- [ ] **Placeholder content** - Remove "Lorem ipsum", test data
- [ ] **Login issues** - Provide test account for reviewers
- [ ] **Missing contact info** - Support email required

## Phase 5: App Store Review Submission

### 📝 Review Information
- [ ] **Demo Account** (if app requires login)
  - Username: (create a test account)
  - Password: (simple password for reviewers)
  - Special instructions if needed
- [ ] **App Review Notes**
  - Explain any unusual permissions
  - Note if location/studio specific
  - Provide context for reviewers
- [ ] **Contact Information**
  - First name, Last name
  - Phone number
  - Email address

### 🚀 Submission
- [ ] **iOS: Submit to App Store Connect**
  - Upload build via EAS
  - Complete all metadata
  - Submit for review
  - **Typical review time: 24-48 hours**
- [ ] **Android: Submit to Play Console**
  - Upload AAB file
  - Complete all metadata
  - Submit for review (to Production or Internal Test first)
  - **Typical review time: 1-7 days** (first submission takes longer)

## Phase 6: Post-Submission

### 📊 After Approval
- [ ] Set up **App Analytics** (App Store Connect + Play Console)
- [ ] Monitor **crash reports**
- [ ] Set up **customer reviews** monitoring
- [ ] Plan **marketing/launch strategy**
- [ ] Set up **ASO** (App Store Optimization)
  - Keywords optimization
  - Screenshot A/B testing
  - Description improvements

### 🔄 Updates & Maintenance
- [ ] Plan regular updates (bug fixes, features)
- [ ] Monitor user feedback
- [ ] Keep privacy policy updated
- [ ] Comply with new platform requirements

## Critical URLs You Need

Before submission, have these ready:
- **Privacy Policy URL**: ____________________________
- **Support URL**: ____________________________
- **Marketing URL** (optional): ____________________________
- **Terms of Service URL** (optional): ____________________________

## Estimated Timeline

1. **Legal/Marketing Prep**: 1-2 weeks (create privacy policy, screenshots, copy)
2. **Developer Account Setup**: 1-3 days (waiting for approval)
3. **Technical Prep**: 3-5 days (testing, builds, fixes)
4. **First Submission**:
   - iOS: 1-3 days review
   - Android: 1-7 days review (first time longer)
5. **Launch**: If approved on first try, ~2 weeks total

## Quick Start Commands

### Build Production iOS:
```bash
eas build --platform ios --profile production
```

### Build Production Android:
```bash
eas build --platform android --profile production
```

### Upload to App Stores:
```bash
eas submit --platform ios
eas submit --platform android
```

## Resources

- [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policy Center](https://play.google.com/about/developer-content-policy/)
- [Expo EAS Submit Docs](https://docs.expo.dev/submit/introduction/)
- [App Store Connect Help](https://developer.apple.com/help/app-store-connect/)
- [Privacy Policy Generator](https://www.termsfeed.com/privacy-policy-generator/)

## Notes

- **First submission always takes longer** - be patient
- **Have a test account ready** for reviewers
- **Beta test with TestFlight/Internal Testing first**
- **Read rejection reasons carefully** if rejected
- **Most apps get approved within 48 hours** (iOS) after 1-2 tries
