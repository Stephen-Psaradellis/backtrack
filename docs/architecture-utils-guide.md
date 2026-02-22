# Architecture Utilities Guide

Quick reference for the new performance utilities added in 2026-02-12.

## 1. Realtime Manager (P-029)

**Purpose**: Prevent duplicate Realtime subscriptions, manage channel lifecycle

**Location**: `services/realtimeManager.ts`

### Basic Usage

```typescript
import { realtimeManager } from '../services/realtimeManager'

// In a component or hook
function useChatMessages(conversationId: string) {
  useEffect(() => {
    if (!conversationId) return

    // Subscribe
    const channelId = realtimeManager.subscribe({
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
      event: 'INSERT',
      callback: (payload) => {
        console.log('New message:', payload.new)
        // Update state...
      }
    })

    // Cleanup
    return () => {
      realtimeManager.unsubscribe(channelId)
    }
  }, [conversationId])
}
```

### Multiple Events

```typescript
// Subscribe to all events
const channelId = realtimeManager.subscribe({
  table: 'messages',
  filter: `conversation_id=eq.${conversationId}`,
  event: '*', // INSERT, UPDATE, DELETE
  callback: (payload) => {
    switch (payload.eventType) {
      case 'INSERT':
        // Handle new message
        break
      case 'UPDATE':
        // Handle updated message
        break
      case 'DELETE':
        // Handle deleted message
        break
    }
  }
})
```

### Cleanup on Logout

```typescript
// In AuthContext or logout handler
import { realtimeManager } from '../services/realtimeManager'

async function signOut() {
  await supabase.auth.signOut()
  realtimeManager.cleanup() // Remove all channels
}
```

## 2. CachedImage (P-030)

**Purpose**: Disk-persistent image caching with expo-image

**Location**: `components/CachedImage.tsx`

### Installation

```bash
npx expo install expo-image
```

### Basic Usage

```typescript
import { CachedImage } from '../components/ui'

// Replace this:
<Image
  source={{ uri: user.avatar_url }}
  style={styles.avatar}
/>

// With this:
<CachedImage
  source={{ uri: user.avatar_url }}
  style={styles.avatar}
/>
```

### Advanced Usage

```typescript
<CachedImage
  source={{ uri: imageUrl }}
  style={{ width: 300, height: 200 }}
  placeholder={{ uri: placeholderUrl }}
  transition={300}
  contentFit="cover"
  priority="high"
  testID="profile-image"
/>
```

### Props

- `source`: Image source (local or remote)
- `style`: StyleSheet (same as Image)
- `placeholder`: Low-res placeholder while loading
- `transition`: Fade-in duration in ms (default: 200)
- `contentFit`: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
- `priority`: 'low' | 'normal' | 'high' (loading priority)

### Fallback Behavior

If expo-image is not installed, CachedImage automatically falls back to standard React Native Image (no caching).

## 3. Network Singleton (P-041)

**Purpose**: Deduplicate NetInfo subscriptions across components

**Location**: `lib/network/singleton.ts`

### Usage (via useNetworkStatus)

```typescript
import { useNetworkStatus } from '../hooks/useNetworkStatus'

function MyComponent() {
  const { isConnected, isInternetReachable } = useNetworkStatus()

  if (!isConnected) {
    return <OfflineIndicator />
  }

  return <Content />
}
```

**Note**: You don't need to use the singleton directly. The `useNetworkStatus` hook automatically uses it. Multiple components can call `useNetworkStatus()` without creating duplicate subscriptions.

### Debug Logging

In development mode, you'll see:
```
[useNetworkStatus] Subscribed via singleton (3 total listeners)
```

This shows how many components are sharing the single NetInfo subscription.

## 4. LRU Cache (P-035)

**Purpose**: Bound cache size with automatic eviction

**Location**: `hooks/useEvents.ts`, `hooks/useEventPosts.ts`

### How It Works

- Max cache size: 10 entries
- Eviction strategy: Least Recently Used (LRU)
- Automatic cleanup when cache is full

### Usage

No changes needed! The hooks automatically use LRU eviction:

```typescript
// This automatically uses LRU cache
const { events, searchEvents } = useEvents({
  initialParams: { coordinates: userLocation }
})

// If you search for 15+ different locations,
// the oldest 5 will be evicted from cache
```

### Debug Logging

In development mode, you'll see:
```
[useEvents] Evicted oldest cache entry: {"lat":"40.7128","lng":"-74.0060",...}
```

## 5. Staleness Check (P-034)

**Purpose**: Prevent unnecessary refetches on rapid tab switching

**Location**: `screens/MapSearchScreen.tsx`

### How It Works

- Data is considered "fresh" for 60 seconds
- On screen focus, only refetches if data is stale (older than 60s)
- Debug logs show refetch/skip decisions

### Debug Logging

In development mode, you'll see:
```
[MapSearchScreen] Refetched data (stale)
```
or
```
[MapSearchScreen] Skipped refetch (data fresh)
```

### Applying to Other Screens

```typescript
function MyScreen() {
  const lastFetchTimeRef = useRef<number>(0)

  useFocusEffect(
    useCallback(() => {
      const now = Date.now()
      const STALENESS_THRESHOLD_MS = 60000 // 60s

      if (now - lastFetchTimeRef.current > STALENESS_THRESHOLD_MS) {
        refetchData()
        lastFetchTimeRef.current = now
      }
    }, [refetchData])
  )
}
```

## Migration Checklist

### High Priority

- [ ] Replace `<Image>` with `<CachedImage>` in:
  - [ ] `components/PostCard.tsx` (selfie images)
  - [ ] `components/ChatBubble.tsx` (avatar images)
  - [ ] `components/navigation/GlobalHeader.tsx` (profile image)

- [ ] Integrate `realtimeManager` in:
  - [ ] `screens/ChatScreen.tsx`
  - [ ] `screens/ChatListScreen.tsx`

- [ ] Add staleness checks to:
  - [ ] `screens/FeedScreen.tsx`
  - [ ] `screens/ChatListScreen.tsx`

### Medium Priority

- [ ] Install expo-image: `npx expo install expo-image`
- [ ] Test realtime manager channel deduplication
- [ ] Monitor cache eviction logs

### Low Priority

- [ ] Measure startup time improvement (P-007)
- [ ] Add auth timeout UI feedback (P-006)
- [ ] Profile network subscription count (P-041)

## Common Patterns

### Pattern 1: Realtime + Cleanup

```typescript
useEffect(() => {
  if (!resourceId) return

  const channelId = realtimeManager.subscribe({
    table: 'resource',
    filter: `id=eq.${resourceId}`,
    event: 'UPDATE',
    callback: (payload) => {
      updateState(payload.new)
    }
  })

  return () => realtimeManager.unsubscribe(channelId)
}, [resourceId])
```

### Pattern 2: Cached Images in Lists

```typescript
<FlatList
  data={posts}
  renderItem={({ item }) => (
    <CachedImage
      source={{ uri: item.image_url }}
      style={styles.thumbnail}
      contentFit="cover"
    />
  )}
/>
```

### Pattern 3: Staleness Check

```typescript
const lastFetchRef = useRef<number>(0)

useFocusEffect(
  useCallback(() => {
    const now = Date.now()
    if (now - lastFetchRef.current > 60000) {
      refetch()
      lastFetchRef.current = now
    }
  }, [refetch])
)
```

## Troubleshooting

### Realtime Manager

**Problem**: "Max channels (5) reached"
**Solution**: Call `realtimeManager.unsubscribe(channelId)` in cleanup functions

**Problem**: Channels not cleaning up on logout
**Solution**: Add `realtimeManager.cleanup()` to signOut handler

### CachedImage

**Problem**: Images not caching
**Solution**: Install expo-image: `npx expo install expo-image`

**Problem**: "expo-image not found" warning
**Solution**: This is expected if expo-image isn't installed. Images will still work via fallback.

### Network Singleton

**Problem**: Network state not updating
**Solution**: Make sure you're using `useNetworkStatus()`, not directly calling NetInfo

### LRU Cache

**Problem**: Cache filling up with old data
**Solution**: This is expected! LRU eviction automatically removes oldest entries.

## Performance Monitoring

### Before Migration

```typescript
// Measure baseline
console.time('startup')
// ... app initialization
console.timeEnd('startup')

// Count NetInfo subscriptions (should be N = number of components)
```

### After Migration

```typescript
// Compare startup time (should be 25% faster)
console.time('startup')
// ... app initialization
console.timeEnd('startup')

// Count NetInfo subscriptions (should be 1)
console.log('Listeners:', networkStatusSingleton.getListenerCount())

// Check realtime channels (should be deduplicated)
console.log('Channels:', realtimeManager.getChannelCount())
```

## Further Reading

- Performance report: `docs/ideation/09-performance-ideation-report.md`
- Implementation details: `docs/ideation/architecture-optimizations-implemented.md`
- expo-image docs: https://docs.expo.dev/versions/latest/sdk/image/
