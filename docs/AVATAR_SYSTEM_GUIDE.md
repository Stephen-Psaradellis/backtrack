# Avatar System Guide

This document describes the avatar system architecture, available presets, and how to extend the system with new avatars.

## Overview

Backtrack uses a **preset-based avatar system** where users select from complete, professionally-made 3D avatar models. This approach provides:

- **High visual quality**: Complete GLB models with proper rigging and textures
- **Diverse representation**: Avatars covering multiple ethnicities, genders, and outfit styles
- **Simpler implementation**: No complex part-by-part composition
- **Fast loading**: Single GLB file instead of multiple parts
- **Easy expansion**: Add new avatars via local files or CDN without code changes

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     React Native App                            │
├─────────────────────────────────────────────────────────────────┤
│  components/avatar/                                              │
│  ├── AvatarCreator/     ← Avatar selection UI                   │
│  │   ├── AvatarBrowser  ← Grid view with filters                │
│  │   └── PreviewPanel   ← 3D preview via WebView                │
│  └── types.ts           ← Type definitions                      │
├─────────────────────────────────────────────────────────────────┤
│  components/avatar3d/                                            │
│  └── WebView Bridge     ← Posts messages to R3F bundle          │
├─────────────────────────────────────────────────────────────────┤
│  lib/avatar/                                                     │
│  ├── defaults.ts        ← Preset registry, default configs      │
│  └── matching.ts        ← Avatar matching algorithm             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     WebGL Bundle (webgl-avatar/)                │
├─────────────────────────────────────────────────────────────────┤
│  src/components/                                                 │
│  ├── CompleteAvatar.jsx  ← Loads and displays GLB models        │
│  ├── Avatar.jsx          ← Main avatar component                │
│  ├── CameraManager.jsx   ← Camera controls                      │
│  └── Experience.jsx      ← Scene setup, lighting                │
├─────────────────────────────────────────────────────────────────┤
│  src/constants/                                                  │
│  └── avatarRegistry.ts   ← URL generation, preset metadata      │
├─────────────────────────────────────────────────────────────────┤
│  public/models/bodies/   ← Local GLB files                      │
│  ├── avatar_asian_m.glb                                         │
│  ├── avatar_asian_f.glb                                         │
│  └── ...                                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Available Avatar Presets

### Local Avatars (Bundled)

These avatars are bundled with the app for instant access without network requests:

| ID | Name | Ethnicity | Gender | Outfit | Size |
|----|------|-----------|--------|--------|------|
| `avatar_asian_m` | Asian Male | Asian | M | Casual | 1.8 MB |
| `avatar_asian_f` | Asian Female | Asian | F | Casual | 1.7 MB |
| `avatar_black_m` | Black Male | Black | M | Casual | 1.9 MB |
| `avatar_white_f` | White Female | White | F | Casual | 2.1 MB |
| `avatar_hispanic_m` | Hispanic Male | Hispanic | M | Casual | 1.9 MB |
| `avatar_mena_f` | MENA Female | MENA | F | Casual | 1.8 MB |

**Default Avatar**: `avatar_asian_m`

### CDN Avatars (On-Demand)

100+ additional avatars available from the VALID Project CDN:

```
Base URL: https://cdn.jsdelivr.net/gh/c-frame/valid-avatars-glb@c539a28/
```

**Available Categories:**
- **Ethnicities**: AIAN, Asian, Black, Hispanic, MENA, NHPI, White
- **Genders**: Male (M), Female (F)
- **Outfits**: Casual, Business, Medical, Military, Utility

**Example CDN URLs:**
```
https://cdn.jsdelivr.net/gh/c-frame/valid-avatars-glb@c539a28/Asian/M/Casual/avatar.glb
https://cdn.jsdelivr.net/gh/c-frame/valid-avatars-glb@c539a28/Black/F/Business/avatar.glb
```

## Avatar Configuration

### AvatarConfig Interface

```typescript
interface AvatarConfig {
  /** Selected avatar preset ID */
  avatarId: string;

  /** Cached ethnicity from preset (for matching) */
  ethnicity?: 'AIAN' | 'Asian' | 'Black' | 'Hispanic' | 'MENA' | 'NHPI' | 'White';

  /** Cached gender from preset (for matching) */
  gender?: 'M' | 'F';

  /** Cached outfit from preset (for reference) */
  outfit?: 'Casual' | 'Business' | 'Medical' | 'Military' | 'Utility';
}
```

### AvatarPreset Interface

```typescript
interface AvatarPreset {
  id: string;           // Unique identifier
  name: string;         // Display name
  file: string;         // Filename (e.g., 'avatar_asian_m.glb')
  ethnicity: string;    // Ethnicity category
  gender: 'M' | 'F';    // Gender
  outfit: string;       // Outfit style
  isLocal: boolean;     // Whether bundled locally
  sizeKB?: number;      // File size in KB
  thumbnailUrl?: string; // Optional thumbnail
  license?: string;     // License (typically CC0)
  source?: string;      // Source attribution
  tags?: string[];      // Descriptive tags
}
```

### Creating an AvatarConfig

```typescript
import { createAvatarConfig, getAvatarPreset } from 'lib/avatar/defaults';

// From preset ID
const config = createAvatarConfig('avatar_asian_m');
// Result: { avatarId: 'avatar_asian_m', ethnicity: 'Asian', gender: 'M', outfit: 'Casual' }

// Get full preset metadata
const preset = getAvatarPreset('avatar_asian_m');
```

## Matching Algorithm

The matching algorithm compares avatar appearance attributes with weighted scoring:

### Weights

| Attribute | Weight | Description |
|-----------|--------|-------------|
| Ethnicity | 40% | Most visible distinguishing feature |
| Gender | 30% | Very visible attribute |
| Outfit | 30% | Clothing style category |

### Quality Thresholds

| Quality | Score Range | Description |
|---------|-------------|-------------|
| Excellent | 85-100 | Strong match |
| Good | 70-84 | Good match |
| Fair | 50-69 | Partial match |
| Poor | 0-49 | Weak/no match |

### Fuzzy Matching

Similar outfits receive partial match credit:
- Casual ↔ Utility (informal clothing)
- Business ↔ Medical (professional attire)

### Usage Examples

```typescript
import {
  comparePresetAvatars,
  quickPresetMatch,
  filterMatchingPresetPosts
} from 'lib/avatar/matching';

// Full comparison with detailed breakdown
const result = comparePresetAvatars(targetAvatar, myAvatar);
console.log(result.score);      // 0-100
console.log(result.quality);    // 'excellent' | 'good' | 'fair' | 'poor'
console.log(result.isMatch);    // boolean (score >= threshold)
console.log(result.breakdown);  // Detailed attribute breakdown

// Quick boolean check
const isMatch = quickPresetMatch(targetAvatar, myAvatar, 60);

// Filter posts to only matching ones
const matchingPosts = filterMatchingPresetPosts(myAvatar, allPosts, 60);
```

## Adding New Avatars

### Adding a Local Avatar

1. **Prepare the GLB file:**
   - Must be a complete avatar model (head, body, clothing)
   - Recommend < 3 MB for mobile performance
   - Use Draco compression if needed

2. **Add to local models:**
   ```bash
   cp new_avatar.glb webgl-avatar/public/models/bodies/
   ```

3. **Register in avatar registry:**

   Edit `webgl-avatar/src/constants/avatarRegistry.ts`:
   ```typescript
   export const LOCAL_AVATARS: AvatarPreset[] = [
     // ... existing avatars
     {
       id: 'avatar_new_m',
       name: 'New Male Avatar',
       file: 'new_avatar.glb',
       ethnicity: 'Asian',
       gender: 'M',
       outfit: 'Casual',
       isLocal: true,
       sizeKB: 1800,
       license: 'CC0',
       source: 'Your Source',
       tags: ['diverse', 'casual', 'male'],
     },
   ];
   ```

4. **Also register in React Native defaults:**

   Edit `lib/avatar/defaults.ts`:
   ```typescript
   export const LOCAL_AVATAR_PRESETS: AvatarPreset[] = [
     // ... existing presets
     {
       id: 'avatar_new_m',
       name: 'New Male Avatar',
       // ... same as above
     },
   ];
   ```

5. **Rebuild WebGL bundle:**
   ```bash
   cd webgl-avatar && npm run build
   npm run build:webgl  # Updates r3fBundle.ts
   ```

### Using CDN Avatars

CDN avatars don't require code changes. They're loaded on-demand:

```typescript
// CDN avatar IDs follow pattern: {ethnicity}/{gender}/{outfit}/avatar
const cdnAvatarId = 'Asian/M/Business/avatar';

// The getAvatarUrl function handles CDN URLs automatically
const url = getAvatarUrl(cdnAvatarId);
// Result: https://cdn.jsdelivr.net/gh/c-frame/valid-avatars-glb@c539a28/Asian/M/Business/avatar.glb
```

## Database Storage

Avatar configurations are stored in Supabase in the `profiles` table:

```json
{
  "avatar_config": {
    "avatarId": "avatar_asian_m",
    "ethnicity": "Asian",
    "gender": "M",
    "outfit": "Casual"
  }
}
```

For posts, target avatars are stored similarly in the `target_avatar` column.

## Performance Considerations

### Model Size
- Keep GLB files under 3 MB for smooth mobile loading
- Use Draco compression for larger models
- Consider LOD (Level of Detail) for complex scenes

### Preloading
```typescript
import { preloadAvatars } from 'webgl-avatar/src/components/CompleteAvatar';

// Preload commonly used avatars at app start
preloadAvatars(['avatar_asian_m', 'avatar_asian_f', 'avatar_black_m']);
```

### Caching
- Local avatars are cached by the WebGL bundle
- CDN avatars are cached via jsDelivr's CDN
- Consider implementing snapshot caching for 2D previews

## Troubleshooting

### Avatar Not Loading

1. Check avatar ID is registered in both registries
2. Verify GLB file exists in correct location
3. Check WebView console for loading errors
4. Ensure network connectivity for CDN avatars

### Poor Visual Quality

1. Check lighting setup in Experience.jsx
2. Verify model has proper normals and UVs
3. Ensure materials are correctly configured
4. Check texture resolution

### Matching Not Working

1. Ensure avatars use new config format with `avatarId`
2. Check cached ethnicity/gender fields are populated
3. Verify avatar presets are registered correctly
4. Test with `comparePresetAvatars` directly

## Asset Sources & Licensing

| Source | License | Notes |
|--------|---------|-------|
| VALID Project | CC0 | Primary source for diverse avatars |
| Khronos glTF-Sample-Assets | CC0 | Reference avatars (CesiumMan, RiggedFigure) |

All bundled avatars are CC0 licensed, meaning they can be used without attribution for any purpose.

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Project overview and key features
- [MIXAMO_BONE_HIERARCHY.md](./MIXAMO_BONE_HIERARCHY.md) - Skeleton reference for animations
- [BLENDER_EXPORT_GUIDE.md](./BLENDER_EXPORT_GUIDE.md) - Creating new avatar assets
- [ASSET_REQUIREMENTS.md](./ASSET_REQUIREMENTS.md) - Asset specifications
