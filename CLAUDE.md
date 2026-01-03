# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**Backtrack** is a location-based anonymous matchmaking app. Users create "missed connection" posts at physical locations using customizable avatars, and others can browse posts to find matches.

- **Mobile**: Expo SDK 52, React Native 0.76.5
- **Web**: Next.js 15 with App Router
- **Backend**: Supabase (PostgreSQL + PostGIS, Auth, Realtime, Storage)
- **Maps**: Google Maps API via `@vis.gl/react-google-maps` (web) and `react-native-maps` (native)
- **State**: Zustand
- **Testing**: Vitest + React Testing Library

## Essential Commands

```bash
# Development
npx expo start              # Start dev server (iOS, Android, web)
npx expo start --clear      # Start with cleared cache

# Testing
npm test                    # Run all tests
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage

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
  └── LocationSearch/  # Location search components
lib/               # Core business logic
  ├── supabase/    # Supabase client setup
  ├── dev/         # Dev mode utilities and mocks
  ├── matching.ts  # Avatar matching algorithm
  └── utils/       # Utility functions (geo, avatar)
hooks/             # Custom React hooks
services/          # External service integrations
types/             # TypeScript type definitions
supabase/migrations/  # Database migrations (001-010)
```

### Environment Variables

This project needs both Expo and Next.js prefixes (same values):

```bash
EXPO_PUBLIC_SUPABASE_URL=...      # Mobile
NEXT_PUBLIC_SUPABASE_URL=...      # Web (same value)
EXPO_PUBLIC_SUPABASE_ANON_KEY=... # Mobile
NEXT_PUBLIC_SUPABASE_ANON_KEY=... # Web (same value)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
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

### Avatar Matching Algorithm (`lib/matching.ts`)

Matches users based on avatar descriptions with weighted attributes:

- **Primary (60%)**: `skinColor`, `hairColor`, `topType`, `facialHairType`, `facialHairColor`
- **Secondary (40%)**: `eyeType`, `eyebrowType`, `mouthType`, `clotheType`, `clotheColor`, `accessoriesType`, `graphicType`

Thresholds: Excellent (≥85), Good (≥70), Fair (≥50), Poor (<50)

Key functions:
```typescript
compareAvatars(targetAvatar, consumerAvatar, threshold = 60): MatchResult
quickMatch(target, consumer): boolean  // Fast primary-attribute check
filterMatchingPosts(consumerAvatar, posts[], threshold): Post[]
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
- Ensure both avatars have all required fields
- Use `DEFAULT_AVATAR_CONFIG` as fallback
- Verify weights sum to 1.0

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

### Test Account

Use this verified test account for E2E testing:
- **Email**: `s.n.psaradellis@gmail.com`
- **Password**: `Test1234!`

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
