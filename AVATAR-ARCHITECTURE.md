# Avatar System Architecture (Multi-Source)

## Overview

The avatar system supports 1000+ avatars from multiple sources while maintaining:
- Initial load time <1.5 seconds
- Smooth 60fps scrolling
- Memory usage <150MB for avatar data
- Backward compatibility with existing configs

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Avatar Sources                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ VALID CDN   │  │ Polygonal   │  │ Future Sources      │ │
│  │ 470 avatars │  │ Mind 200+   │  │ (extensible)        │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                     │            │
│         ▼                ▼                     ▼            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Source Registry                          │  │
│  │   • Prioritized source list                          │  │
│  │   • Manifest URL per source                          │  │
│  │   • CDN base URL per source                          │  │
│  └───────────────────────┬──────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Avatar Aggregator                        │  │
│  │   • Fetch manifests in parallel                      │  │
│  │   • Merge and dedupe by ID                           │  │
│  │   • Apply source priority                            │  │
│  │   • Cache merged result                              │  │
│  └───────────────────────┬──────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Paginated API                            │  │
│  │   • getAvatarsByPage(page, pageSize, filters)        │  │
│  │   • getTotalCount(filters)                           │  │
│  │   • getGenderCounts()                                │  │
│  └───────────────────────┬──────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              AvatarBrowser UI                         │  │
│  │   • Infinite scroll FlatList                         │  │
│  │   • Thumbnail LRU cache (200 items)                  │  │
│  │   • Gender count display                             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Type Definitions

### AvatarSource

```typescript
/**
 * Configuration for an avatar source (CDN)
 */
interface AvatarSource {
  /** Unique source identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Base URL for avatar GLB files */
  cdnBaseUrl: string;

  /** URL to fetch avatar manifest JSON */
  manifestUrl: string;

  /** Base URL for thumbnail images (optional) */
  thumbnailBaseUrl?: string;

  /** Load priority (lower = higher priority) */
  priority: number;

  /** Whether source is enabled */
  enabled: boolean;

  /** Source license */
  license: 'CC0' | 'CC-BY' | 'CC-BY-NC';
}
```

### Extended AvatarPreset

```typescript
/**
 * Extended preset with source tracking
 */
interface AvatarPreset {
  // ... existing fields ...

  /** Source identifier */
  source: string;

  /** CDN base URL for this avatar */
  cdnBaseUrl?: string;
}
```

---

## Source Registry

```typescript
// lib/avatar/sources.ts

export const AVATAR_SOURCES: AvatarSource[] = [
  {
    id: 'valid',
    name: 'VALID Project',
    cdnBaseUrl: 'https://cdn.jsdelivr.net/gh/c-frame/valid-avatars-glb@c539a28/',
    manifestUrl: 'https://cdn.jsdelivr.net/gh/c-frame/valid-avatars-glb@c539a28/avatars.json',
    thumbnailBaseUrl: 'https://cdn.jsdelivr.net/gh/c-frame/valid-avatars-glb@c539a28/images/',
    priority: 1,
    enabled: true,
    license: 'CC0',
  },
  {
    id: 'polygonal-mind',
    name: 'Polygonal Mind 100Avatars',
    cdnBaseUrl: 'https://cdn.jsdelivr.net/gh/backtrack-app/avatars-pm@v1.0.0/',
    manifestUrl: 'https://cdn.jsdelivr.net/gh/backtrack-app/avatars-pm@v1.0.0/avatars.json',
    thumbnailBaseUrl: 'https://cdn.jsdelivr.net/gh/backtrack-app/avatars-pm@v1.0.0/thumbnails/',
    priority: 2,
    enabled: true, // Enable when ready
    license: 'CC0',
  },
];
```

---

## Pagination Strategy

### Page-Based Loading

```typescript
interface PaginationState {
  /** Current page (0-indexed) */
  page: number;

  /** Items per page */
  pageSize: number;

  /** Total items available */
  totalCount: number;

  /** Whether more pages are available */
  hasMore: boolean;

  /** Currently loaded items */
  items: AvatarPreset[];
}

// Default page size optimized for initial load
const DEFAULT_PAGE_SIZE = 50;
```

### Infinite Scroll Implementation

```typescript
// In AvatarBrowser

const [page, setPage] = useState(0);
const [hasMore, setHasMore] = useState(true);
const [avatars, setAvatars] = useState<AvatarPreset[]>([]);

const loadMore = async () => {
  if (!hasMore || isLoading) return;

  const newAvatars = await getAvatarsByPage(page + 1, PAGE_SIZE, filters);

  if (newAvatars.length < PAGE_SIZE) {
    setHasMore(false);
  }

  setAvatars(prev => [...prev, ...newAvatars]);
  setPage(prev => prev + 1);
};

// FlatList
<FlatList
  data={avatars}
  onEndReached={loadMore}
  onEndReachedThreshold={0.5}
  // ...
/>
```

---

## Memory Optimization

### Thumbnail LRU Cache

```typescript
class LRUCache<T> {
  private cache: Map<string, T>;
  private maxSize: number;

  constructor(maxSize: number = 200) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const value = this.cache.get(key);
    if (value) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: string, value: T): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Delete oldest (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}

// Usage
const thumbnailCache = new LRUCache<boolean>(200);

function prefetchThumbnail(url: string): void {
  if (thumbnailCache.get(url)) return;

  Image.prefetch(url).then(() => {
    thumbnailCache.set(url, true);
  });
}
```

### GLB Preload Queue

```typescript
const MAX_CONCURRENT_LOADS = 5;
const loadQueue: string[] = [];
let activeLoads = 0;

async function queueGLBLoad(url: string): Promise<void> {
  if (activeLoads >= MAX_CONCURRENT_LOADS) {
    loadQueue.push(url);
    return;
  }

  activeLoads++;
  try {
    await preloadGLB(url);
  } finally {
    activeLoads--;
    if (loadQueue.length > 0) {
      const next = loadQueue.shift()!;
      queueGLBLoad(next);
    }
  }
}
```

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Initial load (first 50) | <1.5s | `performance.now()` |
| Page load (50 items) | <500ms | `performance.now()` |
| Filter response | <100ms | `performance.now()` |
| Scroll FPS | 60fps | React Native Perf Monitor |
| Memory (avatar data) | <150MB | `performance.memory` |
| Thumbnail cache | 200 max | LRU eviction |

---

## Backward Compatibility

### Existing AvatarConfig Support

```typescript
function resolveAvatarUrl(config: AvatarConfig): string {
  const avatarId = config.avatarId;

  // Check all sources for the avatar
  for (const source of AVATAR_SOURCES) {
    const preset = getPresetFromSource(source.id, avatarId);
    if (preset) {
      return getFullAvatarUrl(preset);
    }
  }

  // Fallback to VALID CDN format for unknown IDs
  return `${AVATAR_SOURCES[0].cdnBaseUrl}avatars/${avatarId}.glb`;
}
```

### Migration from Single Source

The multi-source system is fully backward compatible:
- Existing avatar IDs continue to work
- VALID source has priority 1 (loaded first)
- URL generation falls back to VALID format

---

## Loading Sequence

```
1. App Launch
   │
   ├─> prefetchCdnAvatars() called
   │   │
   │   ├─> Fetch VALID manifest (priority 1)
   │   │   └─> Cache result (1 hour TTL)
   │   │
   │   └─> Fetch other sources in parallel (priority 2+)
   │       └─> Cache results (1 hour TTL)
   │
2. AvatarBrowser Mounted
   │
   ├─> Check cache for manifests
   │   │
   │   ├─> Cache hit: Use cached avatars
   │   │
   │   └─> Cache miss: Wait for fetch
   │
   ├─> Display first page (50 items)
   │   │
   │   └─> Prefetch thumbnails for visible + next page
   │
3. User Scrolls
   │
   ├─> onEndReached at 50% threshold
   │   │
   │   └─> Load next page (50 items)
   │
   └─> Prefetch thumbnails for next page
```

---

## Error Handling

### Source Failure Isolation

```typescript
async function fetchAllSources(): Promise<AvatarPreset[]> {
  const results = await Promise.allSettled(
    AVATAR_SOURCES
      .filter(s => s.enabled)
      .map(source => fetchSourceManifest(source))
  );

  const avatars: AvatarPreset[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      avatars.push(...result.value);
    } else {
      // Log error but continue with other sources
      console.warn('Source fetch failed:', result.reason);
    }
  }

  return avatars;
}
```

### Graceful Degradation

- If all CDN sources fail: Use bundled LOCAL_AVATAR_PRESETS (6 avatars)
- If thumbnail fails: Show placeholder with icon
- If GLB fails: Show fallback avatar

---

## File Changes Required

### New Files
- `lib/avatar/sources.ts` - Source registry and configuration

### Modified Files
- `lib/avatar/defaults.ts` - Multi-source aggregation, pagination
- `components/avatar/types.ts` - Add `source` field to AvatarPreset
- `components/avatar/AvatarCreator/AvatarBrowser.tsx` - Infinite scroll
- `webgl-avatar/src/constants/avatarRegistry.ts` - Multi-CDN URL support

---

## Testing Plan

### Unit Tests
- Source registry configuration validation
- Manifest parsing for each source format
- Pagination logic (page bounds, filtering)
- LRU cache eviction

### Integration Tests
- Multi-source manifest fetching
- Avatar URL resolution across sources
- Matching algorithm with multi-source avatars

### Performance Tests
- Initial load time measurement
- Scroll performance profiling
- Memory usage tracking

---

## Implementation Order

1. **Phase 1**: Update types with `source` field (backward compatible)
2. **Phase 2**: Implement source registry (`lib/avatar/sources.ts`)
3. **Phase 3**: Update `defaults.ts` with multi-source fetching
4. **Phase 4**: Add pagination API
5. **Phase 5**: Update AvatarBrowser with infinite scroll
6. **Phase 6**: Add gender counts display
7. **Phase 7**: Performance testing and optimization
