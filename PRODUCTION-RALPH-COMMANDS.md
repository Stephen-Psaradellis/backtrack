# Backtrack Production Release - Ralph Loop Commands

This document contains autonomous Ralph loop commands for each phase of the production release plan. Run these sequentially or in parallel as appropriate.

**Important**: Some phases require manual intervention (e.g., uploading screenshots to app stores, filling in business addresses). Those are marked with `[MANUAL]`.

---

## Phase 1: Critical Infrastructure

### 1.1 Sentry Integration

```
/ralph-loop "Integrate Sentry error tracking into the Backtrack app.

## Goal
Add crash reporting and error tracking using Sentry SDK for React Native/Expo.

## Tasks
1. Install Sentry: Run `npx expo install @sentry/react-native`
2. Create `lib/sentry.ts` with Sentry initialization:
   - DSN should come from `process.env.EXPO_PUBLIC_SENTRY_DSN`
   - Enable in production only (check `__DEV__`)
   - Configure release and dist from app version
   - Set up beforeSend hook to filter sensitive data
3. Update `app.config.js`:
   - Add @sentry/react-native plugin
   - Configure source maps organization/project
4. Initialize Sentry in app entry point (App.tsx or _layout.tsx)
5. Update `eas.json` to include Sentry source map upload hook
6. Wrap ErrorBoundary to report errors to Sentry
7. Add Sentry.captureException calls to existing try/catch blocks in:
   - lib/supabase/client.ts
   - lib/conversations.ts
   - lib/photoSharing.ts
   - services/notifications.ts
8. Update .env.example with EXPO_PUBLIC_SENTRY_DSN placeholder
9. Test by triggering a test error and verifying it appears in Sentry dashboard (manual verification)

## Verification
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] App builds without errors: `npx expo prebuild --clean`
- [ ] Sentry SDK imported and initialized
- [ ] ErrorBoundary reports to Sentry
- [ ] No hardcoded DSN in code

## Completion Criteria
ALL must pass:
- TypeScript compiles with no errors
- All tests pass
- Sentry is initialized in production mode
- ErrorBoundary integrates with Sentry

When ALL criteria are met, output: <promise>SENTRY_INTEGRATED</promise>" --max-iterations 20 --completion-promise "SENTRY_INTEGRATED"
```

### 1.2 Analytics Implementation

```
/ralph-loop "Implement analytics tracking for Backtrack using a privacy-focused provider.

## Goal
Add user behavior and funnel analytics without compromising user privacy.

## Research Phase
1. Evaluate analytics options for Expo/React Native:
   - Mixpanel (good mobile support)
   - Amplitude (strong funnel analysis)
   - PostHog (open source, self-hostable)
   - expo-analytics (simple but limited)
2. Choose based on: ease of integration, privacy compliance, cost, features

## Implementation
1. Install chosen analytics SDK
2. Create `lib/analytics.ts` with:
   - Initialization function
   - Type-safe event tracking function
   - User identification (anonymous until opted in)
   - Screen tracking helper
3. Define core events enum:
   ```typescript
   enum AnalyticsEvent {
     SIGN_UP = 'sign_up',
     LOGIN = 'login',
     POST_CREATED = 'post_created',
     MATCH_MADE = 'match_made',
     MESSAGE_SENT = 'message_sent',
     PHOTO_SHARED = 'photo_shared',
     ACCOUNT_DELETED = 'account_deleted',
     ONBOARDING_COMPLETED = 'onboarding_completed',
     LOCATION_PERMISSION_GRANTED = 'location_permission_granted',
   }
   ```
4. Add tracking calls to:
   - Auth flows (screens/AuthScreen.tsx)
   - Post creation (screens/CreatePost/)
   - Matching (when conversation created)
   - Messaging (lib/conversations.ts)
   - Photo sharing (lib/photoSharing.ts)
   - Account deletion (lib/accountDeletion.ts)
5. Add screen view tracking to navigation
6. Update .env.example with analytics API key placeholder
7. Write tests for analytics module

## Privacy Requirements
- No PII in events (no email, name, phone)
- User ID should be anonymous UUID
- Respect user opt-out preferences
- GDPR/CCPA compliant

## Verification
- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] Core events are tracked
- [ ] No PII leakage in events
- [ ] Screen views tracked

When ALL criteria are met, output: <promise>ANALYTICS_DONE</promise>" --max-iterations 25 --completion-promise "ANALYTICS_DONE"
```

---

## Phase 2: Security & Compliance

### 2.1 Security Audit

```
/ralph-loop "Perform a comprehensive security audit of the Backtrack codebase.

## Goal
Identify and fix security vulnerabilities before production launch.

## Audit Checklist

### 1. Dependency Vulnerabilities
- Run `npm audit` and document findings
- Run `npx audit-ci --high` to fail on high severity
- Update vulnerable packages where possible
- Document any unfixable vulnerabilities with risk assessment

### 2. API Key & Secret Exposure
- Grep for hardcoded secrets: API keys, tokens, passwords
- Verify all secrets come from environment variables
- Check that .env files are gitignored
- Verify no secrets in committed code history (recent commits)

### 3. Input Validation Review
- Review lib/validation.ts for completeness
- Check all user inputs are validated before use:
  - Email, password, username
  - Post content, messages
  - Location coordinates
  - File uploads
- Verify XSS prevention in text sanitization

### 4. Authentication & Authorization
- Review Supabase RLS policies in supabase/migrations/
- Test that users cannot access other users' data
- Verify session handling is secure
- Check token refresh logic

### 5. Data Privacy
- Verify account deletion removes all user data
- Check that blocked users cannot see each other
- Verify signed URLs expire appropriately
- Check photo storage is private

### 6. Rate Limiting
- Review lib/rateLimit.ts configuration
- Verify rate limits are applied to sensitive endpoints
- Check for bypass vulnerabilities

### 7. Content Moderation
- Verify image moderation is working
- Check report system is functional
- Verify blocking system works

## Output
Create SECURITY-AUDIT-REPORT.md with:
- Findings categorized by severity (Critical, High, Medium, Low)
- Remediation status for each finding
- Remaining risks and mitigations

## Verification
- [ ] `npm audit` shows no high/critical vulnerabilities (or documented exceptions)
- [ ] No hardcoded secrets found
- [ ] All inputs validated
- [ ] RLS policies reviewed and tested
- [ ] Security report generated

When audit is complete and critical/high issues resolved, output: <promise>AUDIT_COMPLETE</promise>" --max-iterations 30 --completion-promise "AUDIT_COMPLETE"
```

### 2.2 Legal Document Web Pages

```
/ralph-loop "Create web pages to host Terms of Service and Privacy Policy.

## Goal
Make legal documents accessible at backtrack.social/terms and backtrack.social/privacy.

## Tasks
1. Create Next.js pages:
   - `app/terms/page.tsx` - Terms of Service
   - `app/privacy/page.tsx` - Privacy Policy

2. Read content from `legal/terms-of-service.md` and `legal/privacy-policy.md`

3. Create a shared LegalPageLayout component:
   - Clean, readable typography
   - Navigation header with back button
   - Table of contents sidebar (optional)
   - Mobile responsive
   - Print-friendly styles

4. Convert markdown to React components:
   - Use a markdown renderer or manually convert
   - Style tables, lists, headers appropriately
   - Add anchor links for sections

5. Add metadata for SEO:
   - Title, description
   - Open Graph tags
   - noindex (optional - legal pages don't need SEO)

6. Update navigation/footer to link to legal pages

7. Test pages render correctly on web

## Verification
- [ ] /terms page renders full Terms of Service
- [ ] /privacy page renders full Privacy Policy
- [ ] Pages are mobile responsive
- [ ] Links from TermsModal work
- [ ] `npm run build` succeeds (Next.js build)

When pages are created and working, output: <promise>LEGAL_PAGES_DONE</promise>" --max-iterations 15 --completion-promise "LEGAL_PAGES_DONE"
```

### 2.3 [MANUAL] Legal Document Completion

This requires manual business information. The Ralph loop can identify what needs to be filled in:

```
/ralph-loop "Identify all placeholder text in legal documents that needs manual completion.

## Goal
Create a checklist of all placeholders in Terms of Service and Privacy Policy that need real business information.

## Tasks
1. Read `legal/terms-of-service.md`
2. Read `legal/privacy-policy.md`
3. Find all placeholders like:
   - [Your Company Address]
   - [City, State, ZIP Code]
   - [Country]
   - [Your State/Country]
   - [Your Jurisdiction]
   - Any TBD or TODO markers

4. Create LEGAL-PLACEHOLDERS-CHECKLIST.md with:
   - File path and line number for each placeholder
   - What information is needed
   - Who should provide it (legal team, business owner)

5. Verify email addresses mentioned are valid domains:
   - legal@backtrack.social
   - privacy@backtrack.social
   - dpo@backtrack.social
   - support@backtrack.social

## Output
A clear checklist someone can follow to complete the legal documents.

When checklist is created, output: <promise>LEGAL_CHECKLIST_DONE</promise>" --max-iterations 5 --completion-promise "LEGAL_CHECKLIST_DONE"
```

---

## Phase 3: Quality Assurance

### 3.1 Full Test Suite Verification

```
/ralph-loop "Run and verify the complete test suite passes with no failures.

## Goal
Ensure all tests pass and coverage is at acceptable levels.

## Tasks
1. Run full test suite: `npm test`
2. If any tests fail:
   - Analyze failure reason
   - Fix the test or the underlying code
   - Re-run until all pass

3. Run typecheck: `npm run typecheck`
4. If any type errors:
   - Fix each error
   - Re-run until clean

5. Run linter: `npm run lint`
6. If any lint errors:
   - Fix with `npm run lint -- --fix`
   - Manually fix remaining

7. Run coverage: `npm run test:coverage`
8. Document current coverage levels

9. Check for skipped tests:
   - Search for .skip, .todo, xit, xdescribe
   - Either unskip and fix, or document why skipped

## Verification
- [ ] `npm test` exits with code 0
- [ ] `npm run typecheck` exits with code 0
- [ ] `npm run lint` exits with code 0 (or only warnings)
- [ ] No unexplained skipped tests

When all tests pass, output: <promise>TESTS_PASSING</promise>" --max-iterations 30 --completion-promise "TESTS_PASSING"
```

### 3.2 E2E Test Execution

```
/ralph-loop "Execute Maestro E2E tests and document results.

## Goal
Run end-to-end tests to verify critical user flows work.

## Prerequisites
- Android emulator or iOS simulator running
- Maestro CLI installed (`curl -Ls https://get.maestro.mobile.dev | bash`)
- App running on device

## Tasks
1. Run E2E tests:
   ```bash
   maestro test .maestro/flows/
   ```

2. If tests fail:
   - Use `maestro studio` to debug selectors
   - Analyze test output
   - Determine if app bug or test bug
   - Fix and re-run

3. Document test results:
   - Number of tests passed/failed
   - Any flaky tests identified
   - Screenshots of failures

## Test Flows Covered
- [ ] auth/login.yaml - User authentication
- [ ] auth/logout.yaml - Logout flow
- [ ] navigation/tabs.yaml - Tab navigation
- [ ] home/map-view.yaml - Map functionality
- [ ] posts/create-post-flow.yaml - Post creation
- [ ] avatar/avatar-selection.yaml - Avatar system
- [ ] chat/send-message.yaml - Messaging

## Verification
- [ ] All E2E tests pass (or failures documented)
- [ ] Critical flows verified working

When E2E tests are executed and documented, output: <promise>E2E_COMPLETE</promise>" --max-iterations 20 --completion-promise "E2E_COMPLETE"
```

### 3.3 Manual Testing Checklist Generator

```
/ralph-loop "Generate a comprehensive manual testing checklist for Backtrack.

## Goal
Create a document that QA testers can follow to manually verify all app functionality.

## Tasks
1. Analyze all screens in screens/ directory
2. Analyze all user-facing components
3. Create MANUAL-TEST-CHECKLIST.md with sections:

### Authentication
- [ ] Sign up with new email
- [ ] Sign up with existing email (error expected)
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (error expected)
- [ ] Password reset flow
- [ ] Logout

### Onboarding
- [ ] Complete onboarding as new user
- [ ] Skip optional steps
- [ ] Accept terms and privacy
- [ ] Age verification (must be 18+)

### Profile & Avatar
- [ ] View profile
- [ ] Edit avatar
- [ ] Change avatar preset
- [ ] Save avatar changes

### Post Creation
- [ ] Select location from map
- [ ] Search for location
- [ ] Add time specification
- [ ] Take selfie verification photo
- [ ] Create target avatar
- [ ] Write note
- [ ] Submit post
- [ ] Edit own post
- [ ] Delete own post

### Browsing & Matching
- [ ] View posts on map
- [ ] View posts in list
- [ ] Filter posts by time
- [ ] View post details
- [ ] Match with post (start conversation)

### Messaging
- [ ] View conversation list
- [ ] Open conversation
- [ ] Send text message
- [ ] Receive message (realtime)
- [ ] Share photo
- [ ] View shared photo

### Safety Features
- [ ] Block user
- [ ] Unblock user
- [ ] Report post
- [ ] Report user

### Settings
- [ ] View settings
- [ ] Change notification preferences
- [ ] Delete account (with confirmation)

### Edge Cases
- [ ] Offline behavior
- [ ] Poor network
- [ ] Background/foreground transitions
- [ ] Push notification receipt
- [ ] Deep link handling

4. Add testing notes:
   - Test account credentials
   - How to reset test state
   - Known issues to ignore

When checklist is created, output: <promise>CHECKLIST_DONE</promise>" --max-iterations 10 --completion-promise "CHECKLIST_DONE"
```

---

## Phase 4: App Store Assets

### 4.1 [MANUAL] Screenshots

Screenshots must be created manually using device simulators or actual devices. This command prepares the specification:

```
/ralph-loop "Create screenshot specifications and helper scripts for app store submissions.

## Goal
Document exact screenshot requirements and create helper tooling.

## Tasks
1. Create SCREENSHOT-SPECS.md with exact requirements:

### iOS Screenshot Sizes
| Device | Resolution | Display Size |
|--------|------------|--------------|
| iPhone 15 Pro Max | 1290 x 2796 | 6.7 inch |
| iPhone 15 Pro | 1179 x 2556 | 6.1 inch |
| iPhone 8 Plus | 1242 x 2208 | 5.5 inch |
| iPad Pro 12.9 | 2048 x 2732 | 12.9 inch |

### Android Screenshot Sizes
| Device | Resolution | Notes |
|--------|------------|-------|
| Phone | 1080 x 1920+ | Minimum |
| 7-inch Tablet | 1200 x 1920 | |
| 10-inch Tablet | 1920 x 1200 | Landscape |

2. Document screenshot scenes (8-10):
   - Scene 1: Map overview with posts
   - Scene 2: Avatar creation
   - Scene 3: Post creation flow
   - Scene 4: Match notification
   - Scene 5: Chat conversation
   - Scene 6: Photo sharing
   - Scene 7: Profile screen
   - Scene 8: Onboarding welcome

3. Create scripts to help capture screenshots:
   - ADB commands for Android
   - xcrun commands for iOS simulator

4. Document text overlays for marketing:
   - Taglines for each scene
   - Font recommendations
   - Brand colors

When specs are documented, output: <promise>SCREENSHOT_SPECS_DONE</promise>" --max-iterations 8 --completion-promise "SCREENSHOT_SPECS_DONE"
```

### 4.2 App Store Metadata

```
/ralph-loop "Prepare all app store metadata content for Backtrack.

## Goal
Create all text content needed for App Store and Play Store listings.

## Tasks
1. Create APP-STORE-METADATA.md with:

### App Identity
- App Name: Backtrack
- Subtitle (30 chars iOS): 'Find your missed connections'
- Developer Name: [To be filled]

### Descriptions
Write compelling descriptions:

**Short Description (80 chars - Android):**
'Anonymous location-based matchmaking. Find people you've crossed paths with.'

**Full Description (4000 chars):**
Write engaging copy covering:
- What the app does
- Key features (avatar anonymity, location-based, messaging)
- How it works (create post, match, chat)
- Privacy focus
- Safety features
- Call to action

### Keywords (100 chars - iOS)
Research and list optimal keywords:
- missed connections
- anonymous dating
- location social
- avatar matching
- etc.

### Category
- Primary: Social Networking
- Secondary: Lifestyle

### Age Rating
- 17+ (dating-adjacent, user-generated content)

### What's New (Release Notes)
Template for v1.0.0:
'Welcome to Backtrack! Create missed connection posts, match with people you've seen, and start conversations - all while staying anonymous with custom avatars.'

2. Create PLAY-STORE-METADATA.md with Android-specific content

3. Verify all text fits character limits

When metadata is prepared, output: <promise>METADATA_DONE</promise>" --max-iterations 10 --completion-promise "METADATA_DONE"
```

---

## Phase 5: CI/CD Pipeline

### 5.1 Automated Build & Deploy Workflow

```
/ralph-loop "Create GitHub Actions workflow for automated builds and store submissions.

## Goal
Automate the build and submission process for production releases.

## Tasks
1. Create `.github/workflows/release.yml`:

```yaml
name: Release to App Stores

on:
  push:
    tags:
      - 'v*'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test

  build-and-submit:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - name: Build iOS
        run: eas build --platform ios --profile production --non-interactive
      - name: Build Android
        run: eas build --platform android --profile production --non-interactive
      - name: Submit iOS
        run: eas submit --platform ios --non-interactive
        env:
          APPLE_ID: ${{ secrets.APPLE_ID }}
          ASC_APP_ID: ${{ secrets.ASC_APP_ID }}
      - name: Submit Android
        run: eas submit --platform android --non-interactive
```

2. Document required GitHub secrets:
   - EXPO_TOKEN
   - APPLE_ID
   - ASC_APP_ID
   - APPLE_TEAM_ID
   - Google Play service account (as file or secret)

3. Create release process documentation in docs/RELEASE-PROCESS.md

4. Add version bump script to package.json

5. Test workflow syntax: `npx yaml-lint .github/workflows/release.yml`

## Verification
- [ ] Workflow file is valid YAML
- [ ] All secrets documented
- [ ] Release process documented
- [ ] Existing CI still works

When workflow is created, output: <promise>CICD_DONE</promise>" --max-iterations 15 --completion-promise "CICD_DONE"
```

### 5.2 Dependency Scanning

```
/ralph-loop "Set up automated dependency vulnerability scanning.

## Goal
Add Dependabot or similar to catch vulnerable dependencies.

## Tasks
1. Create `.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
    open-pull-requests-limit: 10
    labels:
      - 'dependencies'
    ignore:
      - dependency-name: '*'
        update-types: ['version-update:semver-major']
```

2. Add security scanning to CI:
   - Add `npm audit --audit-level=high` step
   - Fail build on high/critical vulnerabilities

3. Create DEPENDENCY-POLICY.md documenting:
   - How to handle vulnerability alerts
   - Exceptions process
   - Update cadence

4. Run initial audit and document findings

## Verification
- [ ] Dependabot config is valid
- [ ] CI includes audit step
- [ ] Policy documented

When scanning is set up, output: <promise>DEPS_SCANNING_DONE</promise>" --max-iterations 10 --completion-promise "DEPS_SCANNING_DONE"
```

---

## Phase 6: Backend & Infrastructure

### 6.1 Supabase Production Setup

```
/ralph-loop "Verify and document Supabase production configuration.

## Goal
Ensure Supabase is properly configured for production use.

## Tasks
1. Verify all migrations are documented:
   - List all files in supabase/migrations/
   - Ensure they're in correct order
   - No duplicate timestamps

2. Create migration verification script:
   ```bash
   # Script to verify migrations can be applied cleanly
   npx supabase db reset --dry-run
   ```

3. Document production Supabase checklist:
   - [ ] Separate production project from development
   - [ ] Point-in-Time Recovery enabled
   - [ ] Database backups configured
   - [ ] Connection pooling enabled (if needed)
   - [ ] Rate limiting on auth endpoints
   - [ ] Email templates customized
   - [ ] Redirect URLs configured for auth

4. Create SUPABASE-PRODUCTION-SETUP.md with:
   - Step-by-step production setup guide
   - Environment variables needed
   - RLS verification queries
   - Backup/restore procedures

5. Generate fresh TypeScript types:
   ```bash
   npx supabase gen types typescript --linked > types/database.ts.new
   ```
   Compare with existing and update if different.

## Verification
- [ ] All migrations documented
- [ ] Production checklist created
- [ ] Types are up to date
- [ ] Setup guide complete

When setup is documented, output: <promise>SUPABASE_SETUP_DONE</promise>" --max-iterations 12 --completion-promise "SUPABASE_SETUP_DONE"
```

### 6.2 Edge Functions Deployment

```
/ralph-loop "Verify and test all Supabase Edge Functions for production.

## Goal
Ensure edge functions are working correctly and ready for deployment.

## Tasks
1. List all edge functions in supabase/functions/:
   - send-notification
   - send-match-notification
   - send-spark-notification
   - moderate-image

2. For each function:
   - Read the code and understand what it does
   - Verify required environment variables are documented
   - Check error handling is robust
   - Verify CORS is properly configured
   - Check for any hardcoded values

3. Create test payloads for each function:
   ```typescript
   // send-notification test
   {
     user_id: 'test-uuid',
     title: 'Test',
     body: 'Test notification'
   }
   ```

4. Document deployment process:
   ```bash
   # Deploy all functions
   npx supabase functions deploy send-notification
   npx supabase functions deploy send-match-notification
   npx supabase functions deploy send-spark-notification
   npx supabase functions deploy moderate-image
   ```

5. Document required secrets:
   - GOOGLE_CLOUD_VISION_API_KEY (for moderate-image)
   - EXPO_ACCESS_TOKEN (for push notifications)

6. Create EDGE-FUNCTIONS-DEPLOYMENT.md with complete guide

## Verification
- [ ] All functions documented
- [ ] Test payloads created
- [ ] Deployment commands documented
- [ ] Secrets documented
- [ ] Functions have proper error handling

When functions are verified, output: <promise>EDGE_FUNCTIONS_DONE</promise>" --max-iterations 15 --completion-promise "EDGE_FUNCTIONS_DONE"
```

---

## Phase 7: Store Submissions

### 7.1 App Store Connect Preparation

```
/ralph-loop "Create comprehensive App Store Connect submission documentation.

## Goal
Document everything needed to submit to the Apple App Store.

## Tasks
1. Create IOS-SUBMISSION-GUIDE.md with:

### Prerequisites
- Apple Developer account ($99/year)
- App Store Connect access
- EAS CLI configured with Apple credentials

### App Store Connect Setup
1. Create new app
2. Fill in:
   - App name: Backtrack
   - Primary language: English (US)
   - Bundle ID: app.backtrack.social
   - SKU: backtrack-v1

### Required Information
- Privacy Policy URL: https://backtrack.social/privacy
- Terms of Service URL: https://backtrack.social/terms
- Support URL: https://backtrack.social/support
- Marketing URL: https://backtrack.social

### App Review Information
```
Demo Account:
Email: s.n.psaradellis@gmail.com
Password: Test1234!

Notes for Reviewer:
- This app requires location services to function properly
- Users must be 18+ to create an account
- The app uses avatar-based anonymity - users don't see real photos by default
- To test the full flow:
  1. Login with demo account
  2. Allow location permissions
  3. View posts on the map (demo data available)
  4. Create a new post at any location
  5. Use secondary account to test matching
```

### App Privacy (Nutrition Labels)
Document what data is collected and why:
- Contact Info: Email (for account)
- Location: Precise (for posting/browsing)
- User Content: Photos, Messages
- Identifiers: Device ID (for push notifications)
- Diagnostics: Crash data (if Sentry enabled)

### Export Compliance
- Uses encryption: Yes (HTTPS)
- Exempt from export compliance: Yes (standard HTTPS only)

2. Create submission command documentation:
```bash
# Build and submit
eas build --platform ios --profile production
eas submit --platform ios
```

When guide is complete, output: <promise>IOS_GUIDE_DONE</promise>" --max-iterations 12 --completion-promise "IOS_GUIDE_DONE"
```

### 7.2 Google Play Console Preparation

```
/ralph-loop "Create comprehensive Google Play Console submission documentation.

## Goal
Document everything needed to submit to the Google Play Store.

## Tasks
1. Create ANDROID-SUBMISSION-GUIDE.md with:

### Prerequisites
- Google Play Developer account ($25 one-time)
- Google Play Console access
- Service account key for EAS submission

### Play Console Setup
1. Create new app
2. Fill in:
   - App name: Backtrack
   - Default language: English (US)
   - App type: App
   - Category: Social

### Store Listing
- Title: Backtrack - Missed Connections
- Short description (80 chars)
- Full description (4000 chars)
- Screenshots (min 2 per device type)
- Feature graphic (1024 x 500)

### Content Rating
Answer questionnaire honestly:
- Violence: None
- Sexual Content: None (avatar-based, no explicit)
- Profanity: User-generated (moderated)
- Drugs: None
- Gambling: None
- Ads: None

Likely rating: Teen or Mature 17+

### Data Safety
| Data Type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| Email | Yes | No | Account management |
| Location | Yes | No | App functionality |
| Photos | Yes | Limited | Profile, in-chat sharing |
| Messages | Yes | Limited | Communication |
| Device IDs | Yes | No | Push notifications |
| Crash logs | Yes | No | App stability |

### Target Audience
- App not designed for children
- Target age: 18+

### Submission
```bash
# Build and submit
eas build --platform android --profile production
eas submit --platform android
```

### Release Tracks
1. Internal testing - Immediate
2. Closed testing - Beta testers
3. Production - Full release

When guide is complete, output: <promise>ANDROID_GUIDE_DONE</promise>" --max-iterations 12 --completion-promise "ANDROID_GUIDE_DONE"
```

---

## Phase 8: Launch Preparation

### 8.1 Pre-Launch Verification

```
/ralph-loop "Run final pre-launch verification checks.

## Goal
Verify everything is ready for production launch.

## Comprehensive Checklist

### Code Quality
- [ ] Run `npm run typecheck` - must pass
- [ ] Run `npm run lint` - must pass
- [ ] Run `npm test` - must pass
- [ ] No console.log in production code (search and remove)
- [ ] No TODO/FIXME comments blocking release

### Build Verification
- [ ] `eas build --platform ios --profile production` succeeds
- [ ] `eas build --platform android --profile production` succeeds
- [ ] Download and test production builds on physical devices

### Configuration
- [ ] All environment variables documented
- [ ] Production Supabase project configured
- [ ] Sentry DSN configured
- [ ] Analytics configured
- [ ] Push notification credentials valid

### Documentation
- [ ] README is up to date
- [ ] DEPLOYMENT.md is complete
- [ ] API documentation current
- [ ] Legal documents complete

### Store Readiness
- [ ] iOS metadata complete
- [ ] Android metadata complete
- [ ] Screenshots ready
- [ ] Privacy policy accessible
- [ ] Terms of service accessible

## Execute Checks
1. Run all lint/type/test commands
2. Search for console.log: `grep -r 'console.log' --include='*.ts' --include='*.tsx' lib/ components/ hooks/ screens/`
3. Search for TODO: `grep -r 'TODO\|FIXME' --include='*.ts' --include='*.tsx' lib/ components/ hooks/ screens/`
4. Verify builds

## Output
Create LAUNCH-READINESS-REPORT.md with:
- All checks and their status
- Any blockers identified
- Remaining manual tasks

When verification complete, output: <promise>LAUNCH_READY</promise>" --max-iterations 20 --completion-promise "LAUNCH_READY"
```

### 8.2 Launch Day Runbook

```
/ralph-loop "Create a launch day operations runbook.

## Goal
Document step-by-step procedures for launch day.

## Tasks
1. Create LAUNCH-DAY-RUNBOOK.md with:

### Pre-Launch (Morning)
- [ ] Verify production services are healthy
- [ ] Check Supabase dashboard - no errors
- [ ] Verify push notifications are working
- [ ] Confirm app store listings are ready
- [ ] Team communication channel ready (Slack/Discord)

### Launch Execution
- [ ] Submit apps for release (if not auto-released)
- [ ] iOS: Release from App Store Connect
- [ ] Android: Promote from testing to production
- [ ] Monitor store propagation (can take hours)

### Post-Launch Monitoring (First Hour)
- [ ] Fresh install test on both platforms
- [ ] Monitor Sentry for crash spikes
- [ ] Monitor Supabase for error logs
- [ ] Monitor analytics for user activity
- [ ] Watch app store reviews

### Post-Launch Monitoring (First Day)
- [ ] Hourly check of error rates
- [ ] Respond to any 1-star reviews
- [ ] Monitor user feedback channels
- [ ] Track key metrics: signups, posts created, matches

### Incident Response
If critical issues arise:
1. Assess severity (P0/P1/P2)
2. For P0 (app unusable): Consider rollback
3. For P1 (major feature broken): Hotfix within 24h
4. For P2 (minor issues): Fix in next release

### Rollback Procedure
iOS:
- App Store Connect > App > App Store > Version > Remove from Sale
- Or reject pending update

Android:
- Play Console > Release > Halt rollout
- Prepare previous version for release

### Communication Templates
- User notification for known issues
- Support response templates
- Social media acknowledgment

When runbook is complete, output: <promise>RUNBOOK_DONE</promise>" --max-iterations 10 --completion-promise "RUNBOOK_DONE"
```

---

## Quick Reference: All Commands

```bash
# Phase 1: Infrastructure
/ralph-loop "Integrate Sentry..." -m 20 -p "SENTRY_INTEGRATED"
/ralph-loop "Implement analytics..." -m 25 -p "ANALYTICS_DONE"

# Phase 2: Security & Compliance
/ralph-loop "Security audit..." -m 30 -p "AUDIT_COMPLETE"
/ralph-loop "Legal web pages..." -m 15 -p "LEGAL_PAGES_DONE"
/ralph-loop "Legal placeholders..." -m 5 -p "LEGAL_CHECKLIST_DONE"

# Phase 3: QA
/ralph-loop "Test suite verification..." -m 30 -p "TESTS_PASSING"
/ralph-loop "E2E tests..." -m 20 -p "E2E_COMPLETE"
/ralph-loop "Manual test checklist..." -m 10 -p "CHECKLIST_DONE"

# Phase 4: Assets
/ralph-loop "Screenshot specs..." -m 8 -p "SCREENSHOT_SPECS_DONE"
/ralph-loop "App metadata..." -m 10 -p "METADATA_DONE"

# Phase 5: CI/CD
/ralph-loop "Release workflow..." -m 15 -p "CICD_DONE"
/ralph-loop "Dependency scanning..." -m 10 -p "DEPS_SCANNING_DONE"

# Phase 6: Backend
/ralph-loop "Supabase setup..." -m 12 -p "SUPABASE_SETUP_DONE"
/ralph-loop "Edge functions..." -m 15 -p "EDGE_FUNCTIONS_DONE"

# Phase 7: Store Submissions
/ralph-loop "iOS submission guide..." -m 12 -p "IOS_GUIDE_DONE"
/ralph-loop "Android submission guide..." -m 12 -p "ANDROID_GUIDE_DONE"

# Phase 8: Launch
/ralph-loop "Pre-launch verification..." -m 20 -p "LAUNCH_READY"
/ralph-loop "Launch runbook..." -m 10 -p "RUNBOOK_DONE"
```

---

## Execution Order Recommendations

### Parallel Execution Groups

These can run simultaneously:

**Group A (Documentation):**
- Legal placeholders checklist
- Screenshot specs
- App metadata
- iOS submission guide
- Android submission guide
- Manual test checklist
- Launch runbook

**Group B (Code Changes):**
- Sentry integration
- Analytics implementation
- Security audit
- Legal web pages

**Group C (Verification):**
- Test suite verification
- E2E tests
- Pre-launch verification

**Group D (Infrastructure):**
- CI/CD workflow
- Dependency scanning
- Supabase setup
- Edge functions

### Recommended Sequential Order

1. **First**: Security audit (identifies issues early)
2. **Then**: Sentry + Analytics (needed for monitoring)
3. **Then**: Test verification (ensure nothing broken)
4. **Then**: CI/CD setup (automate the rest)
5. **Then**: Documentation tasks (in parallel)
6. **Finally**: Pre-launch verification
