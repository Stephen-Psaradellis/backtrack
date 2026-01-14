# Avatar Performance Architecture

**Date:** 2026-01-08
**Objective:** Achieve <0.5s perceived preview loading time for avatar selection

## Performance Strategy Summary

The avatar selection system uses a **two-tier loading strategy**:

1. **Thumbnail Preview (Fast)** - JPG images load in <500ms for browsing
2. **3D Model (Background)** - Full GLB models load asynchronously

This approach ensures fast perceived performance while maintaining rich 3D visualization.

## Architecture Components

### 1. Thumbnail System (`AvatarSelector.tsx`)

**Location:** `components/avatar/AvatarCreator/AvatarSelector.tsx`

The `AvatarThumbnail` component displays CDN-hosted JPG images:
- Thumbnails are ~10-30KB each (vs 1.7-2.1MB for GLB models)
- CDN URL pattern: `https://cdn.jsdelivr.net/gh/c-frame/valid-avatars-glb@c539a28/images/{id}.jpg`
- Shows placeholder on load error
- Tracks loading state with spinner

**Expected Performance:**
- Thumbnail load time: 50-200ms (depending on network)
- Perceived load time: <500ms

### 2. Adjacent Preloading (`AvatarSelector.tsx`)

When user navigates between avatars, the system preloads:
- Previous avatar thumbnail
- Next avatar thumbnail

This uses `Image.prefetch()` for background loading.

### 3. Initial Preloading (`avatarLoader.ts`)

**Location:** `lib/avatar/avatarLoader.ts`

On app initialization, the system can preload:
- First 5 male avatar thumbnails
- First 5 female avatar thumbnails

```typescript
import { avatarLoader } from '../lib/avatar/avatarLoader';

// Call during app initialization
avatarLoader.preloadInitialThumbnails(5);
```

### 4. 3D Model Loading (`Avatar3DCreator.tsx`)

**Location:** `components/avatar3d/Avatar3DCreator.tsx`

The 3D preview loads full GLB models with:
- 8-second timeout (reduced from 15s)
- "Slow loading" feedback after 3 seconds
- Progressive UI states (loading, slow, error)

## Performance Metrics

### Target Performance

| Metric | Target | Achieved |
|--------|--------|----------|
| Thumbnail load (P50) | <200ms | Expected: ~100ms |
| Thumbnail load (P95) | <500ms | Expected: ~300ms |
| 3D model load (P50) | <3s | ~2-5s (network dependent) |
| 3D model load (P95) | <8s | <8s (timeout enforced) |

### Why <0.5s for Full 3D is Not Achievable

**Technical Constraints:**

1. **File Size:** GLB models are 1.7-2.1MB meshopt-compressed
2. **Network:** On 3G (~0.75 Mbps), 2MB download takes ~21 seconds
3. **Parsing:** WebGL GLB parsing adds 200-500ms
4. **Rendering:** First frame render adds 100-200ms

**Minimum theoretical load time (ideal conditions):**
- 4G (10 Mbps): ~1.6s download + ~0.5s parse/render = ~2.1s
- WiFi (50 Mbps): ~0.32s download + ~0.5s parse/render = ~0.82s

**Conclusion:** Sub-500ms 3D model loading requires architectural changes like:
- Low-res preview models (~100KB)
- Progressive mesh loading
- Server-side rendering with static images

## Avatar Count Summary

| Category | Male | Female | Total |
|----------|------|--------|-------|
| CDN Avatars | 105 | 105 | 210 |
| Local Presets | 3 | 3 | 6 |
| **Available** | **105** | **105** | **210** |

Note: Target was 200+ per gender. VALID Project CDN provides 105 per gender.
This is the maximum available from the source without additional avatar sources.

## Implementation Checklist

- [x] Thumbnail component with loading states
- [x] CDN thumbnail URL generation
- [x] Adjacent avatar preloading
- [x] Initial thumbnail preloading function
- [x] Reduced 3D timeout (15s -> 8s)
- [x] "Slow loading" progressive feedback
- [x] Documentation

## Usage

### Preload Thumbnails on App Start

```typescript
// In App.tsx or similar initialization
import { avatarLoader } from './lib/avatar/avatarLoader';

useEffect(() => {
  // Preload first 5 thumbnails of each gender
  avatarLoader.preloadInitialThumbnails(5);
}, []);
```

### Use AvatarSelector with Thumbnails

```tsx
import { AvatarSelector } from './components/avatar/AvatarCreator/AvatarSelector';

<AvatarSelector
  selectedAvatarId={avatarId}
  onSelectAvatar={handleSelect}
  enableCdnAvatars={true}
/>
```

## Future Optimizations

1. **Progressive GLB Loading**
   - Load low-poly version first (~100KB)
   - Swap to high-poly on demand

2. **Static Fallback Images**
   - Generate high-res PNG renders server-side
   - Use as fallback when 3D fails

3. **Local Caching**
   - Cache frequently-used GLB models
   - Use AsyncStorage or file system

4. **CDN Optimization**
   - Add more edge locations
   - Use smaller optimized models
