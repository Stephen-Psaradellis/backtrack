# Backtrack Production Roadmap

## Current State to App Store Release

**Document Version**: 2.0
**Last Updated**: December 31, 2025
**Target Platforms**: Google Play Store & Apple App Store

---

## Executive Summary

Backtrack is a location-based anonymous matchmaking app at **advanced development stage** with comprehensive architecture, core features implemented, and excellent test coverage. This roadmap outlines the remaining tasks for production release on both app stores.

### Current State Snapshot (Updated Dec 31, 2025)

| Category | Status | Notes |
|----------|--------|-------|
| **Core Features** | 95% Complete | All major screens working, full CRUD operations |
| **Authentication** | Complete | Email/password via Supabase with terms acceptance |
| **Real-time Messaging** | Complete | Chat with read receipts, photo sharing |
| **Avatar System** | Complete | Full matching algorithm (primary/secondary attributes) |
| **Push Notifications** | Infrastructure Ready | Token registration, preferences, edge functions configured |
| **Testing** | Excellent | **2,094 tests passing**, 36 test files |
| **App Store Assets** | Not Started | Placeholder icons (69 bytes), no screenshots |
| **Legal/Compliance** | Complete | Privacy policy, terms, age verification (18+), report/block |
| **Build Pipeline** | Configured | EAS profiles exist, needs real credentials |
| **Security** | Complete | Input validation, error handling, network resilience, RLS |
| **Database** | Complete | 42+ migrations, comprehensive schema with indexes |

### Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Mobile Framework | Expo SDK | 54.0.0 |
| React Native | - | 0.81.5 |
| Web Framework | Next.js | 15.5.9 |
| React | - | 19.1.0 |
| Backend | Supabase | PostgreSQL + PostGIS |
| State Management | Zustand | - |
| Testing | Vitest + Jest | 2.1.8 / 29.7.0 |

---

## Completed Items (No Action Required)

### Core Features - ALL COMPLETE

- [x] **Authentication Flow** - Email/password signup/login with Supabase Auth
- [x] **Terms & Age Verification** - TermsModal with 18+ age gate, checkbox confirmation
- [x] **Avatar Matching Algorithm** - Weighted primary (60%) / secondary (40%) attribute matching
- [x] **Post Creation Flow** - 6-step wizard (Location, Time, Selfie, Avatar, Note, Review)
- [x] **Post Browsing** - Location-based ledger with avatar matching
- [x] **Real-time Chat** - Messages with read receipts, photo sharing, system messages
- [x] **Chat List** - Conversation list with unread counts, last message preview
- [x] **Profile Management** - Avatar editor, notification preferences, account deletion
- [x] **Location Discovery** - Google Maps integration with geospatial queries
- [x] **Report/Block System** - ReportModal with categories, block with conversation deactivation

### Security & Compliance - ALL COMPLETE

- [x] **Row Level Security** - RLS policies on all tables (profiles, posts, conversations, messages)
- [x] **Input Validation** - `lib/validation.ts` with sanitization
- [x] **Error Handling** - ErrorBoundary component, network retry logic
- [x] **Offline Support** - OfflineIndicator, network status detection
- [x] **Privacy Policy** - `legal/privacy-policy.md` (needs hosting)
- [x] **Terms of Service** - `legal/terms-of-service.md` (needs hosting)

### Testing Infrastructure - COMPLETE

- [x] **Unit Tests** - 2,094 tests passing
- [x] **Component Tests** - React Testing Library + Jest
- [x] **Mock System** - Comprehensive Supabase mocks in `__tests__/mocks/`
- [x] **E2E Framework** - Maestro tests configured (`.maestro/`)

### Database - COMPLETE

- [x] **Schema** - 42+ migrations covering all features
- [x] **PostGIS** - Geospatial indexes and functions
- [x] **Performance Indexes** - Latest migrations add comprehensive indexes
- [x] **Edge Functions** - Notification webhooks configured
- [x] **Account Deletion** - Full GDPR-compliant data deletion flow

---

## Phase 1: Pre-Submission Critical Tasks

**Priority: BLOCKING - Must Complete Before Submission**

### 1.1 Fix TypeScript Errors (MEDIUM)

**Status**: In Progress
**Issue**: E2E test files have React 19 JSX component type compatibility errors

**Action Required**:
- [ ] Fix TestWrapper/Screen component type definitions for React 19
- [ ] Alternative: Exclude e2e tests from typecheck in tsconfig.json
- [ ] Run `npm run typecheck` and verify 0 errors in source code

### 1.2 Create Production App Icons (CRITICAL)

**Status**: Not Started
**Current**: Placeholder icons (69 bytes each - effectively empty)

**Required Assets**:
- [ ] **iOS App Icon**: 1024x1024 PNG (no alpha, no transparency)
- [ ] **Android Adaptive Icon**:
  - Foreground: 432x432 PNG (108dp at xxxhdpi)
  - Background: Solid color or 432x432 PNG
- [ ] **Favicon**: 32x32 and 16x16 for web

**Files to Replace**:
- `assets/icon.png` (currently 69 bytes)
- `assets/adaptive-icon.png` (currently 69 bytes)
- `assets/splash-icon.png` (currently 69 bytes)
- `assets/favicon.png` (currently 69 bytes)

### 1.3 Create Splash Screen (HIGH)

**Status**: Not Started

**Required**:
- [ ] Design branded splash screen matching app theme
- [ ] iOS: Export at 3x resolution (e.g., 1242x2688)
- [ ] Android: Use same asset or separate branded version
- [ ] Update `app.json` splash configuration if needed

### 1.4 Configure Real EAS Project (CRITICAL)

**Status**: Partially Configured
**Current**: Placeholder project ID (`your-eas-project-id`) in `app.json`

**Actions**:
- [ ] Create EAS project: `npx eas init`
- [ ] Update `app.json` with real `eas.projectId`
- [ ] Configure EAS secrets in dashboard:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- [ ] Test development build: `npx eas build --profile development --platform android`
- [ ] Test preview build: `npx eas build --profile preview --platform android`

---

## Phase 2: App Store Account Setup

### 2.1 Apple Developer Account

**Status**: Unknown (verify if already set up)
**Required**: Apple Developer Program ($99/year)

**Actions**:
- [ ] Enroll in Apple Developer Program (if not already)
- [ ] Create App ID with bundle identifier `com.backtrack.app`
- [ ] Configure push notification capability (APNs)
- [ ] Generate App Store Connect API key for EAS
- [ ] Update `eas.json` with:
  - `APPLE_ID` (your Apple ID email)
  - `ASC_APP_ID` (App Store Connect app ID)
  - `APPLE_TEAM_ID` (from Apple Developer Portal)

### 2.2 Google Play Developer Account

**Status**: Unknown (verify if already set up)
**Required**: Google Play Console ($25 one-time)

**Actions**:
- [ ] Create Google Play Developer account (if not already)
- [ ] Create app in Google Play Console
- [ ] Generate service account with Play Console API access
- [ ] Download `google-services-key.json` and place in project root
  - **Currently Missing**: File does not exist in project
- [ ] Configure FCM (Firebase Cloud Messaging) for push notifications

---

## Phase 3: App Store Assets & Metadata

### 3.1 Screenshots (REQUIRED - Both Stores)

**Status**: Not Started

**Google Play Store Requirements**:
| Device Type | Size | Count |
|-------------|------|-------|
| Phone | 16:9 or 9:16 (min 320px, max 3840px) | 2-8 |
| 7" Tablet | 16:9 or 9:16 | Recommended |
| 10" Tablet | 16:9 or 9:16 | Recommended |

**Apple App Store Requirements**:
| Device Type | Size | Count |
|-------------|------|-------|
| 6.7" iPhone | 1290 x 2796 | 3-10 |
| 6.5" iPhone | 1242 x 2688 | 3-10 |
| 5.5" iPhone | 1242 x 2208 | Optional |
| 12.9" iPad Pro | 2048 x 2732 | 3-10 (if supporting iPad) |

**Recommended Screenshot Content** (aim for 5-8):
1. [ ] Home screen with map discovery
2. [ ] Location ledger with posts
3. [ ] Post detail with avatar match
4. [ ] Create post wizard (avatar builder)
5. [ ] Chat conversation
6. [ ] Profile screen
7. [ ] Onboarding/value proposition
8. [ ] Avatar customization

### 3.2 Feature Graphic (Google Play)

- [ ] Create 1024 x 500 PNG/JPEG promotional banner

### 3.3 App Store Metadata

**Both Stores**:
- [ ] **App Name**: "Backtrack" (30 chars max iOS)
- [ ] **Short Description**: ~80 chars
  - Suggested: "Anonymous missed connections at real locations. Find who you noticed."
- [ ] **Full Description**: 4000 chars max
- [ ] **Keywords/Tags**: dating, missed connections, anonymous, location, matchmaking
- [ ] **Category**: Social Networking / Dating
- [ ] **Content Rating**: Complete questionnaire (17+ for dating)
- [ ] **Support URL**: Create support page or use GitHub issues
- [ ] **Privacy Policy URL**: Host `legal/privacy-policy.md`

### 3.4 Host Legal Documents (REQUIRED)

**Status**: Documents exist locally, need public hosting

**Current Files**:
- `legal/privacy-policy.md` (10,872 bytes)
- `legal/terms-of-service.md` (12,551 bytes)

**Actions**:
- [ ] Host privacy policy at accessible URL (e.g., `backtrack.social/privacy`)
- [ ] Host terms of service at accessible URL (e.g., `backtrack.social/terms`)
- [ ] Update TermsModal links to point to hosted versions
- [ ] **Hosting Options**:
  - GitHub Pages (free)
  - Vercel/Netlify (free tier)
  - Simple S3/CloudFront static hosting

---

## Phase 4: Testing & Quality Assurance

### 4.1 Production Build Verification

- [ ] Build production APK: `npx eas build --profile production --platform android`
- [ ] Build production IPA: `npx eas build --profile production --platform ios`
- [ ] Verify app launches without crashes
- [ ] Test complete user flow:
  - [ ] Sign up with new email
  - [ ] Complete onboarding
  - [ ] Create a post
  - [ ] Browse ledger/discover posts
  - [ ] Match and start conversation
  - [ ] Send/receive messages
  - [ ] Report and block user
  - [ ] Delete account

### 4.2 Device Testing Matrix

**Android** (test on at least 2-3 devices):
- [ ] Pixel (recent model) - Android 13+
- [ ] Samsung Galaxy - Android 12+
- [ ] Budget device test (performance)

**iOS** (test on at least 2-3 devices):
- [ ] iPhone 15/14 Pro
- [ ] iPhone SE (smaller screen)
- [ ] iPad (if supporting tablets)

### 4.3 Edge Case Testing

- [ ] No network connectivity (offline mode)
- [ ] Slow network (throttled 3G)
- [ ] Permission denied (location, camera)
- [ ] Low storage
- [ ] Background/foreground transitions
- [ ] Push notification delivery (all app states)

---

## Phase 5: App Store Submission

### 5.1 Google Play Store Submission

**Pre-submission Checklist**:
- [ ] Target API level 34+ (Android 14)
- [ ] 64-bit support (EAS handles automatically)
- [ ] Play App Signing enrolled
- [ ] Data safety form completed
- [ ] Content rating questionnaire completed
- [ ] Privacy policy URL set
- [ ] `google-services-key.json` in place

**Submission Commands**:
```bash
npx eas build --profile production --platform android
npx eas submit --platform android
```

**Expected Review Time**: 1-7 days (longer for new apps)

### 5.2 Apple App Store Submission

**Pre-submission Checklist**:
- [ ] iOS Privacy Manifest (required 2024+)
- [ ] App Privacy details completed in App Store Connect
- [ ] Export compliance declaration
- [ ] Age rating: 17+ (dating app)
- [ ] Demo account credentials for review:
  - Email: `s.n.psaradellis@gmail.com`
  - Password: `Test1234!`

**Submission Commands**:
```bash
npx eas build --profile production --platform ios
npx eas submit --platform ios
```

**Expected Review Time**: 24-48 hours (up to 7 days for new apps)

### 5.3 Common Rejection Reasons to Avoid

**Apple**:
- Crashes on launch
- Placeholder content (icons, screenshots)
- Missing privacy policy
- Login issues (always provide test account)
- Missing purpose strings for permissions (already configured in app.json)

**Google**:
- Data safety form inaccuracies
- Policy violations
- Missing privacy policy
- Deceptive metadata

---

## Phase 6: Post-Launch

### 6.1 Monitoring Setup

- [ ] Sentry/Crashlytics for crash reporting
- [ ] Supabase dashboard monitoring
- [ ] App store review monitoring

### 6.2 Support Infrastructure

- [ ] Support email (support@backtrack.social or similar)
- [ ] FAQ documentation
- [ ] Response workflow for user issues

### 6.3 Version Planning

- [ ] Plan v1.1 features based on user feedback
- [ ] Establish release cadence (bi-weekly recommended)

---

## Appendix A: File Reference

| Purpose | Path |
|---------|------|
| **Configuration** | |
| Expo Config | `app.json` |
| EAS Build Config | `eas.json` |
| Package Dependencies | `package.json` |
| Environment Example | `.env.example` |
| **Core Code** | |
| App Entry | `App.tsx` |
| Navigation | `navigation/AppNavigator.tsx` |
| Auth Context | `contexts/AuthContext.tsx` |
| Supabase Client | `lib/supabase/client.ts` |
| Avatar Matching | `lib/matching.ts` |
| **Screens (10 total)** | |
| Authentication | `screens/AuthScreen.tsx` |
| Home/Map | `screens/HomeScreen.tsx` |
| Chat List | `screens/ChatListScreen.tsx` |
| Chat | `screens/ChatScreen.tsx` |
| Post Detail | `screens/PostDetailScreen.tsx` |
| Create Post | `screens/CreatePostScreen.tsx` + `screens/CreatePost/*.tsx` |
| Profile | `screens/ProfileScreen.tsx` |
| Ledger | `screens/LedgerScreen.tsx` |
| Legal | `screens/LegalScreen.tsx` |
| Avatar Creator | `screens/AvatarCreatorScreen.tsx` |
| **Legal** | |
| Privacy Policy | `legal/privacy-policy.md` |
| Terms of Service | `legal/terms-of-service.md` |
| Terms Modal | `components/TermsModal.tsx` |
| **Assets (NEED REPLACEMENT)** | |
| App Icon | `assets/icon.png` (69 bytes - PLACEHOLDER) |
| Adaptive Icon | `assets/adaptive-icon.png` (69 bytes - PLACEHOLDER) |
| Splash | `assets/splash-icon.png` (69 bytes - PLACEHOLDER) |
| Favicon | `assets/favicon.png` (69 bytes - PLACEHOLDER) |

---

## Appendix B: Quick Commands

```bash
# Development
doppler run -- npx expo start          # Start with Doppler secrets
npm run typecheck                       # Check TypeScript errors

# Testing
npm test                                # Run all tests (2,094 passing)
npm run test:coverage                   # Run with coverage report

# Building
npx eas build --profile development --platform android   # Dev build
npx eas build --profile preview --platform android       # Preview
npx eas build --profile production --platform all        # Production

# Submission
npx eas submit --platform android       # Submit to Play Store
npx eas submit --platform ios           # Submit to App Store

# Database
npx supabase db push                    # Apply migrations
npx supabase gen types typescript --linked > types/database.ts

# Secrets (Doppler)
doppler secrets                         # View configured secrets
doppler run -- <command>                # Run with secrets injected
```

---

## Appendix C: Remaining Task Summary

### Critical (Blocking Submission)

| Task | Priority | Est. Effort |
|------|----------|-------------|
| Create production app icons | CRITICAL | Design work |
| Create splash screen | HIGH | Design work |
| Configure real EAS project ID | CRITICAL | 1 hour |
| Set up Apple Developer credentials | CRITICAL | 1-2 days (account approval) |
| Set up Google Play + `google-services-key.json` | CRITICAL | 1-2 days |
| Create app store screenshots (5-8 per platform) | HIGH | 2-4 hours |
| Host legal documents publicly | HIGH | 1 hour |
| Write app store descriptions | HIGH | 1-2 hours |

### High Priority (Recommended Before Launch)

| Task | Priority | Est. Effort |
|------|----------|-------------|
| Fix TypeScript errors in e2e tests | MEDIUM | 30 min |
| Production build testing on real devices | HIGH | 2-4 hours |
| Set up crash reporting (Sentry) | MEDIUM | 1-2 hours |

### Nice to Have (Can Do Post-Launch)

| Task | Priority | Est. Effort |
|------|----------|-------------|
| App preview video | LOW | 2-4 hours |
| Feature graphic for Google Play | LOW | 1 hour |
| Performance optimization | LOW | Ongoing |

---

## Appendix D: Test Account for App Review

Provide this account when submitting to Apple App Store:

- **Email**: `s.n.psaradellis@gmail.com`
- **Password**: `Test1234!`

Ensure this account:
- [ ] Has completed onboarding
- [ ] Has a profile set up
- [ ] Has some posts visible
- [ ] Can demonstrate full app functionality

---

*This roadmap was updated December 31, 2025. The app is architecturally complete with excellent test coverage (2,094 tests passing). Remaining work is primarily asset creation and store configuration.*
