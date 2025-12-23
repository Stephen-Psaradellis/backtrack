# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Love Ledger is a location-based anonymous matchmaking app built with **Expo/React Native** for mobile and **Next.js** for web. Users can create "missed connection" posts at physical locations using customizable avatars, and others can browse posts at those locations to find matches.

## Essential Commands

### Development

```bash
# Start development server (supports iOS, Android, and web)
npx expo start

# Start with cleared cache
npx expo start --clear

# Run on specific platform
npx expo run:ios
npx expo run:android

# Type checking
npm run typecheck
# OR
npx tsc --noEmit
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests once (CI mode)
npm run test:run

# Run with coverage
npm run test:coverage
```

### Code Quality

```bash
# Lint code
npm run lint

# Auto-fix lint issues
npm run lint -- --fix
```

### Build

```bash
# Next.js build (web)
npm run build

# Production build with EAS
npx eas build --platform all
```

## Architecture Overview

### Tech Stack

- **Mobile**: Expo SDK 52, React Native 0.76.5, React 18.3
- **Web**: Next.js 15 with App Router, React 18.3
- **Backend**: Supabase (PostgreSQL with PostGIS, Auth, Realtime, Storage)
- **Maps**: Google Maps API (Places, Geocoding) via `@vis.gl/react-google-maps`
- **State**: Zustand (lightweight state management)
- **Styling**: Tailwind CSS
- **Testing**: Vitest with React Testing Library
- **TypeScript**: Strict mode enabled

### Hybrid Expo + Next.js Architecture

This is a **dual-target monorepo**:
- Native mobile apps (iOS/Android) use Expo/React Native
- Web version uses Next.js with App Router
- Shared code lives in `lib/`, `types/`, `hooks/`, `components/`

**Important**: When working with environment variables:
- Mobile (Expo): Use `EXPO_PUBLIC_*` prefix
- Web (Next.js): Use `NEXT_PUBLIC_*` prefix
- Both are defined in `.env.example` for compatibility

### Directory Structure

```
love-ledger/
├── app/                      # Next.js App Router (web routes)
│   ├── demo/                 # Demo pages
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Homepage
├── screens/                  # React Native screens (mobile)
│   ├── CreatePost/           # Multi-step post creation flow
│   │   ├── steps/            # Individual step components
│   │   └── components/       # Shared step components
│   ├── AuthScreen.tsx
│   ├── HomeScreen.tsx
│   ├── LedgerScreen.tsx
│   ├── PostDetailScreen.tsx
│   ├── ChatScreen.tsx
│   ├── ChatListScreen.tsx
│   └── ProfileScreen.tsx
├── components/               # Shared React components
│   ├── ui/                   # Generic UI components
│   ├── chat/                 # Chat-specific components
│   ├── character-builder/    # Avatar builder components
│   ├── AvatarBuilder.tsx
│   ├── AvatarPreview.tsx
│   ├── MapView.tsx
│   ├── LocationPicker.tsx
│   ├── PostCard.tsx
│   └── SelfieCamera.tsx
├── lib/                      # Core business logic
│   ├── supabase/             # Supabase client setup
│   │   ├── client.ts         # Browser/mobile client
│   │   ├── server.ts         # Server-side client
│   │   └── middleware.ts     # Auth middleware
│   ├── matching.ts           # Avatar matching algorithm
│   ├── conversations.ts      # Chat/messaging logic
│   ├── moderation.ts         # Content moderation
│   ├── storage.ts            # Supabase storage helpers
│   ├── haptics.ts            # Haptic feedback
│   ├── types.ts              # Shared types
│   └── utils/                # Utility functions
│       ├── avatar.ts
│       └── geo.ts
├── hooks/                    # Custom React hooks
│   ├── useLocation.ts
│   ├── useUserLocation.ts
│   ├── useNearbyLocations.ts
│   ├── useInViewport.ts
│   └── useNetworkStatus.ts
├── types/                    # TypeScript type definitions
│   ├── database.ts           # Database schema types
│   ├── avatar.ts             # Avatar configuration types
│   └── chat.ts               # Chat/messaging types
├── supabase/migrations/      # Database migrations (SQL)
│   ├── 001_initial_schema.sql
│   ├── 002_messaging_schema.sql
│   ├── 003_moderation_schema.sql
│   ├── 003_geospatial_functions.sql
│   ├── 004_rls_policies.sql
│   └── 005_storage_policies.sql
└── vitest.config.ts          # Test configuration
```

## Database Architecture

### Core Tables

1. **profiles** - User profiles extending `auth.users`
   - `id` → references `auth.users(id)`
   - `username`, `display_name`
   - `own_avatar` (JSONB) - User's self-description for matching
   - `avatar_config` (JSONB) - User's avatar appearance

2. **locations** - Physical venues (Google Places integration)
   - `google_place_id` (unique)
   - `name`, `address`, `latitude`, `longitude`
   - `place_types` (array of Google place types)
   - `post_count` - Cached count of posts
   - PostGIS geospatial index on `(longitude, latitude)` for proximity queries

3. **posts** - "Missed connection" posts
   - `author_id` → `profiles.id`
   - `location_id` → `locations.id`
   - `target_avatar` (JSONB) - Description of person seen
   - `note` - Message to the person
   - `selfie_url` - Verification photo (Supabase Storage)
   - `match_count` - Cached count of matches

4. **conversations** - 1:1 chats between post author and matcher
   - `post_id` → `posts.id`
   - `producer_id`, `consumer_id` → `profiles.id`
   - Indexes on both participants for efficient querying

5. **messages** - Individual chat messages
   - `conversation_id` → `conversations.id`
   - `sender_id` → `profiles.id`
   - `content`, `message_type` ('text', 'image', 'system')
   - `read_at` - For read receipts

6. **notifications** - In-app notifications
   - `user_id` → `profiles.id`
   - `type`, `title`, `message`, `data` (JSONB)
   - `read` boolean flag

### PostGIS Integration

**CRITICAL**: The database uses PostGIS for geospatial queries:
- Extension: `postgis` (must be enabled before running migrations)
- Functions: `ST_SetSRID`, `ST_MakePoint`, `ST_DWithin`, `ST_Distance`
- Coordinate system: SRID 4326 (WGS 84)
- **Important**: PostGIS uses `(longitude, latitude)` order (not lat, lng)

Example proximity query:
```sql
-- Find locations within 5km of a point
SELECT * FROM locations
WHERE ST_DWithin(
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326),
  ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
  5000 -- 5km in meters
);
```

### Row Level Security (RLS)

All tables have RLS enabled with policies for:
- Users can read their own profile
- Users can read posts at locations
- Users can only see conversations they're part of
- Message reads/writes restricted to conversation participants

## Avatar Matching Algorithm

### Overview

The core feature of Love Ledger is matching users based on avatar descriptions. The algorithm is in `lib/matching.ts`.

### How It Works

1. **Attributes**: 12 matchable avatar attributes
   - **Primary** (60% weight): `skinColor`, `hairColor`, `topType`, `facialHairType`, `facialHairColor`
   - **Secondary** (40% weight): `eyeType`, `eyebrowType`, `mouthType`, `clotheType`, `clotheColor`, `accessoriesType`, `graphicType`

2. **Similarity Calculation**: Each attribute gets a score (0-1)
   - 1.0 = exact match
   - 0.7 = similar (e.g., similar skin tones)
   - 0.5 = same category (e.g., both short hair)
   - 0.0 = no match

3. **Weighted Score**: Final score = sum of (similarity × weight) normalized to 0-100

4. **Match Thresholds**:
   - Excellent: ≥85
   - Good: ≥70
   - Fair: ≥50
   - Poor: <50

### Key Functions

```typescript
// lib/matching.ts
compareAvatars(targetAvatar, consumerAvatar, threshold = 60): MatchResult
compareAvatarsDetailed(target, consumer, threshold): DetailedMatchResult
quickMatch(target, consumer): boolean  // Fast primary-attribute check
calculateBatchMatches(consumerAvatar, posts[]): MatchResult[]
filterMatchingPosts(consumerAvatar, posts[], threshold): Post[]
```

### Testing Avatar Matching

When modifying the matching algorithm:
- Run tests: `npm test lib/__tests__/matching.test.ts`
- Check that primary attributes have higher impact than secondary
- Ensure fuzzy matching works (similar skin tones, hair categories)
- Validate thresholds classify correctly

## State Management

### Zustand Pattern

This app uses **Zustand** for lightweight state management (no Redux). Stores are located in `store/` directory (if created).

Pattern for creating a store:
```typescript
import { create } from 'zustand'

interface MyStore {
  value: string
  setValue: (value: string) => void
}

export const useMyStore = create<MyStore>((set) => ({
  value: '',
  setValue: (value) => set({ value }),
}))
```

Usage in components:
```typescript
const { value, setValue } = useMyStore()
```

## Supabase Integration

### Client Initialization

**Mobile (Expo)**:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
)
```

**Web (Next.js)**:
- Client components: Use `lib/supabase/client.ts`
- Server components/actions: Use `lib/supabase/server.ts`
- Middleware: Use `lib/supabase/middleware.ts` for auth

### Common Operations

```typescript
// Auth
const { data, error } = await supabase.auth.signUp({ email, password })
const { data: { user } } = await supabase.auth.getUser()

// Database queries
const { data, error } = await supabase
  .from('posts')
  .select('*, location:locations(*)')
  .eq('location_id', locationId)

// Realtime subscriptions
supabase
  .channel('messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`
  }, (payload) => {
    // Handle new message
  })
  .subscribe()

// Storage
const { data, error } = await supabase.storage
  .from('selfies')
  .upload(`${userId}/${filename}`, file)
```

## Location Services

### Google Maps Integration

The app uses `@vis.gl/react-google-maps` for Maps on web and `react-native-maps` for native.

**Environment variables**:
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (mobile)
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (web)

**Required APIs**:
- Maps JavaScript API
- Maps SDK for iOS
- Maps SDK for Android
- Places API
- Geocoding API

### Location Hooks

```typescript
// hooks/useUserLocation.ts - Get user's current location
const { location, error } = useUserLocation()

// hooks/useNearbyLocations.ts - Find nearby venues
const { locations, loading } = useNearbyLocations(latitude, longitude, radiusKm)

// hooks/useLocation.ts - Generic location utilities
```

### Geospatial Queries

When querying nearby locations, always use PostGIS functions:
```typescript
// lib/utils/geo.ts
export async function findNearbyLocations(
  latitude: number,
  longitude: number,
  radiusMeters: number = 5000
) {
  const { data, error } = await supabase.rpc('nearby_locations', {
    lat: latitude,
    lng: longitude,
    radius_meters: radiusMeters
  })
  return data
}
```

## Performance Optimizations

### Avatar Builder Virtualization

The avatar builder uses virtualization for rendering option lists (`components/character-builder/VirtualizedOptionList.tsx`). This was implemented to handle 50+ options per category without performance degradation.

**Key implementation**:
- Uses `@tanstack/react-virtual` for native
- Only renders visible items + buffer
- Lazy loads avatar previews with `LazyAvatarPreview.tsx`

### Haptic Feedback

Haptic feedback is implemented for key interactions (`lib/haptics.ts`):
```typescript
import { triggerHaptic } from '@/lib/haptics'

// On button press
triggerHaptic('light')

// On success
triggerHaptic('success')

// On error
triggerHaptic('error')
```

Types: `'light'`, `'medium'`, `'heavy'`, `'success'`, `'warning'`, `'error'`

## Testing

### Testing Setup

- **Framework**: Vitest (faster than Jest)
- **React testing**: `@testing-library/react` (web), `@testing-library/react-native` (mobile)
- **Config**: `vitest.config.ts`

### Running Tests

```bash
# Watch mode (recommended during development)
npm run test:watch

# Run once
npm run test:run

# With coverage
npm run test:coverage

# Specific file
npm test -- matching.test.ts
```

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('Component', () => {
  it('should render correctly', () => {
    render(<Component />)
    expect(screen.getByText('Hello')).toBeDefined()
  })
})
```

## Important Implementation Notes

### Environment Variables

This project supports both Expo and Next.js, so environment variables are duplicated:

```bash
# .env.local
EXPO_PUBLIC_SUPABASE_URL=...      # For mobile
NEXT_PUBLIC_SUPABASE_URL=...      # For web (same value)
EXPO_PUBLIC_SUPABASE_ANON_KEY=... # For mobile
NEXT_PUBLIC_SUPABASE_ANON_KEY=... # For web (same value)
```

**Always set both** when adding new environment variables.

### TypeScript Strict Mode

This project uses `strict: true` in `tsconfig.json`. Always:
- Define explicit types for function parameters
- Avoid `any` (use `unknown` if needed)
- Handle null/undefined cases
- Use type guards for runtime checks

### Avatar Configuration

Avatar configs are stored as JSONB in the database (`types/avatar.ts`):
```typescript
interface AvatarConfig {
  skinColor: SkinColor
  hairColor: HairColor
  topType: TopType
  facialHairType: FacialHairType
  facialHairColor: FacialHairColor
  eyeType: EyeType
  eyebrowType: EyebrowType
  mouthType: MouthType
  clotheType: ClotheType
  clotheColor: ClotheColor
  accessoriesType: AccessoriesType
  graphicType: GraphicType
}
```

**Two avatar configs per user**:
1. `avatar_config` - How user's avatar looks (appearance)
2. `own_avatar` - User's self-description for matching against posts

### CreatePost Multi-Step Flow

Post creation is a 5-step wizard (`screens/CreatePost/steps/`):
1. **LocationStep** - Select venue using Google Places
2. **SelfieStep** - Take verification photo
3. **AvatarStep** - Build avatar describing person seen
4. **NoteStep** - Write message
5. **ReviewStep** - Confirm and submit

Each step is a separate component with consistent interface:
```typescript
interface StepProps {
  onNext: (data: StepData) => void
  onBack: () => void
  initialData?: StepData
}
```

### Chat Implementation

Chat uses Supabase Realtime for live updates (`components/chat/`):
- Subscribe to `messages` table changes
- Filter by `conversation_id`
- Handle typing indicators with presence
- Message bubbles styled differently for sender/receiver
- Read receipts via `read_at` timestamp

### Moderation System

Content moderation is in `lib/moderation.ts`:
- Report users/posts/messages
- Block users (prevents chat and hides content)
- Admin review queue (future feature)

## Common Development Patterns

### Data Fetching Pattern

```typescript
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

function useData() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const { data, error } = await supabase.from('table').select()
        if (error) throw error
        setData(data)
      } catch (err) {
        setError(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return { data, loading, error }
}
```

### Error Handling

Always handle Supabase errors properly:
```typescript
const { data, error } = await supabase.from('posts').insert(post)

if (error) {
  console.error('Failed to create post:', error.message)
  // Show user-friendly error
  Alert.alert('Error', 'Failed to create post. Please try again.')
  return
}

// Proceed with data
```

### Navigation (Mobile)

The app uses React Navigation:
```typescript
import { useNavigation } from '@react-navigation/native'

const navigation = useNavigation()

// Navigate to screen
navigation.navigate('PostDetail', { postId: '123' })

// Go back
navigation.goBack()

// Replace current screen
navigation.replace('Home')
```

## Troubleshooting

### PostGIS Not Found
- **Error**: `function st_point does not exist`
- **Fix**: Enable PostGIS in Supabase SQL Editor:
  ```sql
  CREATE EXTENSION IF NOT EXISTS postgis;
  ```

### Avatar Matching Returns 0
- Check that both avatars have all required fields
- Verify `DEFAULT_AVATAR_CONFIG` is used as fallback
- Ensure weights sum to 1.0 in matching algorithm

### Realtime Not Working
- Verify RLS policies allow user to read messages
- Check subscription filter matches data format
- Ensure channel is subscribed before inserts occur

### Build Fails
- Clear cache: `npx expo start --clear`
- Clear Next.js: `rm -rf .next`
- Reinstall: `rm -rf node_modules && npm install`
- Check TypeScript: `npm run typecheck`

## Development Workflow

1. **Start dev server**: `npx expo start`
2. **Run tests in watch mode**: `npm run test:watch`
3. **Make changes** and verify hot reload
4. **Run linter**: `npm run lint -- --fix`
5. **Type check**: `npm run typecheck`
6. **Test build**: `npm run build` (for web)
7. **Commit with conventional commits**: `feat:`, `fix:`, `docs:`, etc.
