# Test Utilities (QA-006)

Shared test factories and mock utilities for the Backtrack React Native app.

## Files

### `factories.ts`
Type-safe factory functions for creating mock database entities.

**Features:**
- Counter-based UUID generation (no crypto dependency)
- Sensible defaults for all entity types
- Full type safety against `types/database.ts`
- Partial overrides via spread operator

**Available Factories:**
- `createMockProfile()` - User profile
- `createMockConversation()` - Chat conversation
- `createMockMessage()` - Chat message
- `createMockLocation()` - Physical venue
- `createMockPost()` - Missed connection post
- `createMockCheckin()` - User check-in
- `createMockLocationVisit()` - Location visit
- `createMockPostResponse()` - Post response
- `createMockNotification()` - User notification
- `createMockProfilePhoto()` - Profile photo
- `createMockBlock()` - User block
- `createMockFavoriteLocation()` - Favorite location
- `createMockVenueStory()` - Venue story
- `createMockReport()` - Content report
- `createMockHangout()` - Group hangout
- `createMockHangoutAttendee()` - Hangout attendee
- `createMockAvatar()` - 2D avatar
- `createMockSafeSearchResult()` - SafeSearch result

**Utility Functions:**
- `generateTestUUID()` - Generate deterministic test UUID
- `resetUUIDCounter()` - Reset UUID counter (for test isolation)
- `getCurrentTimestamp()` - Get current ISO timestamp
- `getTimestampOffset(hours)` - Get timestamp N hours from now

### `supabase-mock.ts`
Reusable Supabase mock client with chainable query builder.

**Features:**
- Chainable query builder (`.from().select().eq().single()`)
- Configurable return data per table
- Configurable errors
- Auth mock with all methods
- Realtime channel mock with subscriptions
- Storage bucket mock with upload/download

**Usage:**
```typescript
import { createMockSupabaseClient } from '__tests__/utils'

const supabase = createMockSupabaseClient({
  defaultData: {
    profiles: [createMockProfile()],
    messages: [createMockMessage()],
  },
  rpcData: {
    get_active_checkin: { success: true, checkin: null },
  },
})
```

### `auth-mock.ts`
Mock AuthContext for testing components that require authentication.

**Features:**
- Complete AuthContext interface
- Default authenticated user
- Helper functions for common states

**Available Functions:**
- `createMockAuthContext()` - Default authenticated user
- `createMockUnauthenticatedAuthContext()` - Unauthenticated state
- `createMockLoadingAuthContext()` - Loading state

### `render-with-providers.tsx`
Custom render function that wraps components with all required providers.

**Providers included:**
- `QueryClientProvider` (with retry disabled)
- `AuthStateContext` & `ProfileContext` (mocked)
- `ToastProvider`
- `ThemeProvider`
- `SafeAreaProvider`
- `GestureHandlerRootView`

**Usage:**
```typescript
import { renderWithProviders } from '__tests__/utils'

// Render with default authenticated user
const { getByText } = renderWithProviders(<MyComponent />)

// Render with custom auth context
const { getByText } = renderWithProviders(<MyComponent />, {
  authContext: { isAuthenticated: false }
})

// Render with unauthenticated user
const { getByText } = renderWithUnauthenticatedUser(<MyComponent />)

// Render with loading auth state
const { getByText } = renderWithLoadingAuth(<MyComponent />)
```

## Example Usage

### Testing a Hook

```typescript
import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { createMockSupabaseClient, createMockProfile } from '__tests__/utils'
import { useProfile } from '../hooks/useProfile'

describe('useProfile', () => {
  it('should fetch user profile', async () => {
    const mockProfile = createMockProfile({ display_name: 'Test User' })
    const mockSupabase = createMockSupabaseClient({
      defaultData: { profiles: [mockProfile] }
    })

    const { result } = renderHook(() => useProfile(), {
      wrapper: createQueryWrapper(mockSupabase)
    })

    await waitFor(() => {
      expect(result.current.profile?.display_name).toBe('Test User')
    })
  })
})
```

### Testing a Component

```typescript
import { describe, it, expect } from 'vitest'
import { renderWithProviders, createMockMessage } from '__tests__/utils'
import { MessageList } from '../components/MessageList'

describe('MessageList', () => {
  it('should render messages', () => {
    const messages = [
      createMockMessage({ content: 'Hello' }),
      createMockMessage({ content: 'World' })
    ]

    const { getByText } = renderWithProviders(
      <MessageList messages={messages} />
    )

    expect(getByText('Hello')).toBeTruthy()
    expect(getByText('World')).toBeTruthy()
  })
})
```

### Factory Overrides

```typescript
import { createMockProfile, createMockCheckin } from '__tests__/utils'

// Create profile with specific ID
const profile = createMockProfile({
  id: 'user-123',
  display_name: 'John Doe',
  is_verified: true
})

// Create check-in for that user
const checkin = createMockCheckin({
  user_id: profile.id,
  verified: true
})

// Create related entities
const location = createMockLocation()
const post = createMockPost({
  producer_id: profile.id,
  location_id: location.id
})
```

## Benefits

1. **Type Safety** - All factories are fully typed against database schema
2. **Consistency** - Reusable mocks eliminate hand-written object literals
3. **Maintainability** - Schema changes only need updates in one place
4. **Productivity** - Write tests faster with pre-built utilities
5. **Reliability** - Realistic default values reduce test flakiness

## Migration Guide

### Before (hand-written mocks)
```typescript
const mockProfile = {
  id: '123',
  username: 'test',
  display_name: 'Test',
  avatar: null,
  // ... 15 more fields
}
```

### After (using factories)
```typescript
import { createMockProfile } from '__tests__/utils'

const mockProfile = createMockProfile({
  username: 'test'
})
// All other fields have sensible defaults
```

## Related

- See existing test files for patterns: `hooks/__tests__/useCheckin.test.ts`
- Main types: `types/database.ts`, `types/chat.ts`
- Auth context: `contexts/AuthContext.tsx`
