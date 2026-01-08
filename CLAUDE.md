# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Backtrack** is a location-based anonymous matchmaking app. Users create "missed connection" posts at physical locations using customizable avatars, and others can browse posts to find matches.

- **Mobile**: Expo SDK 54, React Native 0.81.5
- **Web**: Next.js 15 with App Router
- **Backend**: Supabase (PostgreSQL + PostGIS, Auth, Realtime, Storage)
- **Maps**: Google Maps API via `@vis.gl/react-google-maps` (web) and `react-native-maps` (native)
- **State**: Zustand
- **Testing**: Vitest + React Testing Library

## CRITICAL: Security Rules (READ FIRST)

**NEVER commit secrets, API keys, or credentials to the repository.** This includes:

### Forbidden in Committed Code
- API keys (Google Maps, Firebase, etc.)
- Supabase URLs or keys (even anon keys)
- Passwords or auth tokens
- Private keys or certificates
- Any string that looks like `AIza...`, `sk-...`, `pk_...`, `eyJ...` (JWT tokens)

### Before Every Commit - Mandatory Checks
1. **Verify no native directories are staged:**
   ```bash
   git diff --cached --name-only | grep -E "^(android|ios)/"
   # If this returns ANY files, DO NOT COMMIT. Run: git reset HEAD android/ ios/
   ```
2. **Check staged files for secrets:**
   ```bash
   git diff --cached | grep -iE "(AIza[0-9A-Za-z_-]{35}|sk-[a-zA-Z0-9]{20,}|pk_live|eyJ[a-zA-Z0-9_-]+\.eyJ)"
   ```
3. **Never commit these files:**
   - `android/` or `ios/` directories (EVER - they contain embedded secrets)
   - `*.keystore`, `*.jks`, `*.p12`, `*.pem`, `*.key`
   - `.env`, `.env.*` (except `.env.example` with placeholder values)
   - `credentials.json`, `google-services.json`, `GoogleService-Info.plist`

### Where Secrets Should Live
- **Development**: Doppler CLI (`doppler run -- npx expo start`)
- **CI/CD**: GitHub Secrets or Doppler integration
- **Native builds**: EAS Secrets (`eas secret:create`)
- **Generated files**: Use placeholders like `GOOGLE_MAPS_API_KEY_PLACEHOLDER`

### If a Secret is Accidentally Committed
1. **Immediately rotate the exposed credential** (generate a new key/secret)
2. Remove from code and commit the fix
3. The old secret is compromised forever (git history) - rotation is mandatory

### CNG (Continuous Native Generation) - CRITICAL
This project uses **CNG**: the `android/` and `ios/` directories are **NOT committed to git**.

**Why CNG prevents secret leaks:**
1. `app.config.js` reads secrets from `process.env` (e.g., `EXPO_PUBLIC_GCP_MAPS_API_KEY`)
2. `expo prebuild` or `expo run:android` generates native files with actual secret values embedded
3. Since `android/` and `ios/` are gitignored, these secrets never enter version control

**NEVER do these things:**
- `git add android/` - This would commit secrets!
- `git add ios/` - This would commit secrets!
- `git add -A` without checking - Might include native files if .gitignore is broken
- Remove android/ or ios/ from .gitignore

**Build workflow:**
```bash
# Development (native files auto-generated)
doppler run -- npx expo run:android
doppler run -- npx expo run:ios

# Production (EAS Build regenerates native files in cloud)
eas build --platform all
```

**If you see android/ or ios/ in `git status`:**
1. STOP - Do not commit
2. Verify .gitignore includes `android/` and `ios/`
3. Run: `git rm --cached -r android/ ios/`

### Security Hooks in Place
Two layers of protection prevent accidental secret commits:
1. **Git pre-commit hook** (`.git/hooks/pre-commit`) - Scans staged files for API key patterns
2. **Claude Code hook** (`.claude/settings.json`) - Blocks Claude from running git commit if secrets detected

If a commit is blocked, follow the instructions in the error message.

## Essential Commands

```bash
# Development
npx expo start              # Start dev server (iOS, Android, web)
npx expo start --clear      # Start with cleared cache

# Testing
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage
npm test -- path/to/file.test.ts  # Run single test file
npm test -- -t "pattern"    # Run tests matching pattern

# Code quality
npm run typecheck           # TypeScript check
npm run lint -- --fix       # Lint and auto-fix

# Build
npm run build               # Next.js web build
npx eas build --platform all  # Production mobile build
```

## Architecture

### Directory Structure

```
screens/           # React Native mobile screens
app/               # Next.js web routes (App Router)
components/        # Shared React components
  ├── ui/          # Generic UI components
  ├── chat/        # Chat components + photo sharing
  ├── onboarding/  # Onboarding flow components
  ├── avatar/      # Avatar UI components
  │   ├── AvatarCreator/  # Avatar selection interface
  │   │   ├── AvatarBrowser.tsx    # Grid view for selecting presets
  │   │   ├── PreviewPanel.tsx     # 3D preview panel
  │   │   └── index.tsx            # Main creator component
  │   └── types.ts                 # Avatar type definitions
  ├── avatar3d/    # WebView bridge for 3D rendering
  └── LocationSearch/  # Location search components
lib/               # Core business logic
  ├── supabase/    # Supabase client setup
  ├── dev/         # Dev mode utilities and mocks
  ├── avatar/      # Avatar system utilities
  │   ├── matching.ts   # Avatar matching algorithm
  │   └── defaults.ts   # Default configs and presets
  └── utils/       # Utility functions (geo)
hooks/             # Custom React hooks
services/          # External service integrations
types/             # TypeScript type definitions
supabase/migrations/  # Database migrations
webgl-avatar/      # React Three Fiber WebGL bundle
  ├── src/
  │   ├── components/   # R3F components (CompleteAvatar, CameraManager)
  │   └── constants/    # Avatar registry, asset maps
  └── public/models/bodies/  # GLB avatar models
```

### Environment Variables

This project needs both Expo and Next.js prefixes (same values):

```bash
EXPO_PUBLIC_SUPABASE_URL=...              # Mobile
NEXT_PUBLIC_SUPABASE_URL=...              # Web (same value)
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...  # Mobile
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...  # Web (same value)
EXPO_PUBLIC_GCP_MAPS_API_KEY=...          # Mobile (Google Maps)
NEXT_PUBLIC_GCP_MAPS_API_KEY=...          # Web (same value)
```

**Always set both prefixes** when adding new environment variables.

### Dev Mode / Mock Data

The `lib/dev/` directory contains utilities for development without a real Supabase connection:
- `mock-supabase.ts` - Mock Supabase client
- `mock-profile-photos.ts` - Mock profile photo data
- Use `lib/dev/index.ts` to check if running in dev mode

## Database Architecture

### Core Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles with `avatar_config` (appearance) and `own_avatar` (self-description for matching) |
| `locations` | Physical venues from Google Places with PostGIS geospatial index |
| `posts` | "Missed connection" posts with `target_avatar`, `note`, `selfie_url`, optional `time` fields |
| `conversations` | 1:1 chats between post author (`producer`) and matcher (`consumer`) |
| `messages` | Chat messages with read receipts, supports text/image/system types |
| `photo_shares` | Shared photos in conversations |
| `favorite_locations` | User's saved locations |
| `push_tokens` | Push notification tokens |
| `notification_preferences` | User notification settings |

### PostGIS Integration

**CRITICAL**: The database uses PostGIS for geospatial queries.

- **Coordinate order**: PostGIS uses `(longitude, latitude)` - NOT `(lat, lng)`
- **SRID**: 4326 (WGS 84)
- **Key functions**: `ST_SetSRID`, `ST_MakePoint`, `ST_DWithin`, `ST_Distance`

```sql
-- Find locations within 5km of a point
SELECT * FROM locations
WHERE ST_DWithin(
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326),
  ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography,
  5000  -- meters
);
```

If you see `function st_point does not exist`, enable PostGIS:
```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Row Level Security (RLS)

All tables have RLS enabled:
- Users read/write their own profile
- Users read posts at any location
- Conversation access restricted to participants
- Message access restricted to conversation participants

## Key Features

### Avatar System Architecture

The app uses a **preset-based avatar system** with complete 3D GLB models. Users select from professionally-made, diverse avatar presets rather than building avatars part-by-part.

**Key Components:**
- `webgl-avatar/` - React Three Fiber (R3F) WebGL bundle for 3D avatar rendering
- `components/avatar/AvatarCreator/` - React Native avatar selection UI
- `components/avatar3d/` - WebView bridge for 3D preview in React Native
- `lib/avatar/` - Avatar utilities, matching, and defaults

**Local Avatar Presets (6 bundled):**
| ID | Name | Ethnicity | Gender |
|----|------|-----------|--------|
| `avatar_asian_m` | Asian Male | Asian | M |
| `avatar_asian_f` | Asian Female | Asian | F |
| `avatar_black_m` | Black Male | Black | M |
| `avatar_white_f` | White Female | White | F |
| `avatar_hispanic_m` | Hispanic Male | Hispanic | M |
| `avatar_mena_f` | MENA Female | MENA | F |

**CDN Avatars:** 100+ additional avatars available from VALID Project CDN (`cdn.jsdelivr.net/gh/c-frame/valid-avatars-glb`).

**Avatar Configuration:**
```typescript
interface AvatarConfig {
  avatarId: string;       // e.g., 'avatar_asian_m'
  ethnicity?: string;     // Cached for matching
  gender?: 'M' | 'F';     // Cached for matching
  outfit?: string;        // Cached for reference
}
```

### Avatar Matching Algorithm (`lib/avatar/matching.ts`)

Matches users based on avatar appearance attributes with weighted matching:

- **Ethnicity (40%)**: Most visible distinguishing feature
- **Gender (30%)**: Very visible attribute
- **Outfit (30%)**: Clothing style category

Thresholds: Excellent (≥85), Good (≥70), Fair (≥50), Poor (<50)

Key functions:
```typescript
// New preset-based matching (primary)
comparePresetAvatars(targetAvatar, consumerAvatar, threshold = 60): MatchResult
quickPresetMatch(target, consumer): boolean
filterMatchingPresetPosts(consumerAvatar, posts[], threshold): Post[]

// Universal matching (auto-detects avatar type)
compareAnyAvatars(target, consumer, threshold): MatchResult
filterMatchingAnyPosts(consumerAvatar, posts[], threshold): Post[]

// Legacy part-based (deprecated, still supported)
compareAvatars(targetAvatar, consumerAvatar, threshold = 60): MatchResult
```

### CreatePost Flow (`screens/CreatePost/`)

Multi-step wizard with consistent step interface:
1. **LocationStep** - Select venue via Google Places
2. **TimeStep** - Optional time specification
3. **SelfieStep** - Verification photo
4. **AvatarStep** - Build avatar describing person seen
5. **NoteStep** - Write message
6. **ReviewStep** - Confirm and submit

### Onboarding Flow (`components/onboarding/`)

New user onboarding with:
- Welcome screen
- Avatar creation
- Location permissions
- Consumer/Producer demo screens
- Terms acceptance

### Photo Sharing (`components/chat/`, `lib/photoSharing.ts`)

In-chat photo sharing between matched users:
- `SharePhotoModal` - UI for sharing
- `SharedPhotoDisplay` - Displaying shared photos
- `usePhotoSharing` hook for state management

## Common Gotchas

### Avatar Matching Returns 0
- Ensure avatar has `avatarId` field (new system) or all config fields (legacy)
- Use `DEFAULT_AVATAR_CONFIG_NEW` for preset system, `DEFAULT_AVATAR_CONFIG` for legacy
- Check avatar type compatibility - new and legacy avatars don't match each other

### Avatar Not Rendering in 3D Preview
- Verify GLB model exists in `webgl-avatar/public/models/bodies/`
- Check WebView console for loading errors
- Ensure avatar ID matches a preset in `LOCAL_AVATAR_PRESETS`
- If CDN avatar, verify network connectivity

### Avatar WebView Shows Blank Screen
- Clear Metro cache: `npx expo start --clear`
- Rebuild WebGL bundle: `cd webgl-avatar && npm run build`
- Run bundle updater: `npm run build:webgl`
- Check r3fBundle.ts was generated correctly

### Realtime Subscriptions Not Working
- Check RLS policies allow user to read the table
- Verify subscription filter matches data format exactly
- Ensure channel is subscribed before data is inserted

### Build/Cache Issues
```bash
npx expo start --clear      # Clear Expo cache
rm -rf .next                # Clear Next.js cache
rm -rf node_modules && npm install  # Full reinstall
```

### TypeScript Strict Mode
This project uses `strict: true`. Always:
- Define explicit types for function parameters
- Avoid `any` (use `unknown` if needed)
- Handle null/undefined cases

## Anti-patterns to Avoid

- Don't import from `@supabase/supabase-js` directly in components - use `lib/supabase/client.ts`
- Don't use `(lat, lng)` order with PostGIS - always `(longitude, latitude)`
- Don't create Supabase subscriptions without cleanup in useEffect return
- Don't store sensitive data in AsyncStorage - use SecureStore for tokens

## E2E Testing

### Test Accounts

Use these verified test accounts for E2E testing:

**User 1 (Primary):**
- **Email**: `s.n.psaradellis@gmail.com`
- **Password**: `Test1234!`

**User 2 (Secondary):**
- **Email**: `spsaradellis@gmail.com`
- **Password**: `Test1234!`

User 2 has pre-seeded data for user-to-user testing:
- Posts with target avatars matching User 1
- Active conversation with User 1
- Favorite locations

### Android MCP Testing

The project has Mobile MCP configured (`.mcp.json`) for Android emulator testing:

```bash
# Start the Android emulator first
emulator -avd Pixel_9_Pro  # Or use Android Studio

# If screenshots cause Claude API errors (too large), reduce resolution:
adb -s emulator-5554 shell wm size 1080x1920

# Reset to default resolution:
adb -s emulator-5554 shell wm size reset
```

**MCP Tools Available:**
- `mobile_take_screenshot` - Capture current screen
- `mobile_list_elements_on_screen` - Get element coordinates for clicking
- `mobile_click_on_screen_at_coordinates` - Tap at x,y coordinates
- `mobile_type_keys` - Type text into focused field
- `mobile_swipe_on_screen` - Scroll/swipe gestures
- `mobile_press_button` - Press BACK, HOME, etc.

**Tips:**
- Always use `mobile_list_elements_on_screen` to get accurate coordinates before clicking
- Use `mobile_press_button BACK` to dismiss keyboards
- Clear text fields with ADB: `adb shell input keyevent KEYCODE_MOVE_END` then multiple `KEYCODE_DEL`

### ADB Login Procedure (Recommended)

**IMPORTANT**: When logging into the app via ADB/emulator, tapping on input fields is unreliable and often causes text to be entered into the wrong field. Use Tab key navigation instead:

```bash
# 1. Start Expo dev server with Doppler secrets
cd C:/Users/snpsa/love-ledger
doppler run -- npx expo start --android

# 2. Set up port forwarding (required for emulator to reach Metro)
adb -s emulator-5554 reverse tcp:8081 tcp:8081

# 3. Launch the app via deep link
adb -s emulator-5554 shell am start -a android.intent.action.VIEW \
  -d "exp+backtrack://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081"

# 4. Wait for app to load (~10 seconds), then dismiss developer menu modal
# Tap the X button (coordinates may vary, approximately x=714, y=856)
adb -s emulator-5554 shell input tap 714 856

# 5. Login using Tab navigation (KEY: use keyevent 61 for Tab, 66 for Enter)
# This sequence: tap email field → type email → Tab to password → type password → Tab → Enter
adb -s emulator-5554 shell input tap 412 565 && \
sleep 1 && \
adb -s emulator-5554 shell input text "s.n.psaradellis@gmail.com" && \
sleep 0.5 && \
adb -s emulator-5554 shell input keyevent 61 && \
sleep 0.5 && \
adb -s emulator-5554 shell input text "Test1234!" && \
sleep 0.5 && \
adb -s emulator-5554 shell input keyevent 61 && \
sleep 0.5 && \
adb -s emulator-5554 shell input keyevent 66
```

**Key ADB Input Keycodes:**
- `keyevent 61` = Tab (move to next field)
- `keyevent 66` = Enter (submit form)
- `keyevent 4` = Back
- `keyevent 67` = Delete/Backspace

**Why Tab navigation works better:**
- Tapping coordinates can miss or hit adjacent elements
- The keyboard overlay shifts element positions
- Tab navigation follows the form's natural focus order
- Enter key reliably submits the focused form

**If login fails with "Invalid Refresh Token" error:**
This is normal on fresh app starts. The error toast can be dismissed and login will work normally.

### Secrets Management with Doppler

Environment variables are managed via Doppler CLI:

```bash
# Install Doppler CLI (if not installed)
# See: https://docs.doppler.com/docs/install-cli

# Run commands with Doppler secrets injected:
doppler run -- npx expo start

# View configured secrets:
doppler secrets

# Available secrets include:
# - EXPO_PUBLIC_SUPABASE_URL
# - EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
# - EXPO_PUBLIC_GCP_MAPS_API_KEY
# - And corresponding NEXT_PUBLIC_* variants
```

### Supabase CLI

```bash
# Login to Supabase
npx supabase login

# Link to project (get project ref from Supabase dashboard)
npx supabase link --project-ref <project-ref>

# Run migrations
npx supabase db push

# Generate TypeScript types from database schema
npx supabase gen types typescript --linked > types/database.ts

# Start local Supabase (for offline development)
npx supabase start
```

### Known Issues & Fixes

**TermsModal Scroll Bug**: Fixed by moving footer outside ScrollView. If checkboxes or buttons are inaccessible in modals, check that action buttons are not inside ScrollView.

**Email Verification Redirect**: Supabase email verification redirects to `localhost:3000` (web app), not mobile. The verification still works - users can sign in on mobile after clicking the link.
