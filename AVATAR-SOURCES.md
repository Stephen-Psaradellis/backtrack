# Avatar Sources Research

## Current Status

**Current System**: ~425 validated avatars from VALID Project CDN
**Goal**: 1000+ avatars (500+ male, 500+ female)
**Gap**: ~575+ additional avatars needed

---

## Source 1: VALID Project CDN (Current - Primary)

**URL**: https://cdn.jsdelivr.net/gh/c-frame/valid-avatars-glb@c539a28/
**Manifest**: https://cdn.jsdelivr.net/gh/c-frame/valid-avatars-glb@c539a28/avatars.json
**License**: CC0
**Format**: GLB (optimized, ready to use)
**Thumbnails**: Available via CDN

### Inventory
| Category | Count | Notes |
|----------|-------|-------|
| Total | 470 | Including X_ non-validated |
| Validated | ~425 | Excluding X_ prefix avatars |
| Male | 235 | Even gender split |
| Female | 235 | Even gender split |

### Ethnicity Breakdown
- AIAN: 20 (10M, 10F)
- Asian: 50 (25M, 25F)
- Black: 65 (32M, 33F)
- Hispanic: 65 (32M, 33F)
- MENA: 35 (17M, 18F)
- NHPI: 15 (7M, 8F)
- White: 75 (37M, 38F)

### Outfit Types
5 outfits per ethnicity-gender combo: Casual, Business, Medical, Military, Utility

### Integration Status: ACTIVE
Already integrated in `lib/avatar/defaults.ts`

---

## Source 2: Polygonal Mind 100Avatars (Primary Addition)

**GitHub**: https://github.com/PolygonalMind/100Avatars
**Releases**: https://github.com/PolygonalMind/100Avatars/releases
**License**: CC0
**Format**: VRM, FBX (requires conversion to GLB)

### Inventory
| Round | Count | Status |
|-------|-------|--------|
| Round 1 | 100 | Released |
| Round 2 | 100 | Released |
| Round 3 | 100 | Announced |
| **Total** | **300** | 200 available now |

### Pros
- Large collection (300 avatars)
- CC0 license (no attribution required)
- Professional quality, diverse styles
- VRM format (standard for virtual avatars)

### Cons
- Requires VRM to GLB conversion
- No gender metadata in manifest
- No CDN hosting (GitHub releases only)
- Need to host converted GLBs ourselves

### Integration Plan
1. Download VRM files from releases
2. Convert to GLB using Blender script
3. Extract thumbnails during conversion
4. Host on jsDelivr via GitHub repo
5. Create manifest with gender/style metadata

---

## Source 3: Open Source Avatars (Secondary)

**GitHub**: https://github.com/ToxSam/open-source-avatars
**Manifest**: https://raw.githubusercontent.com/ToxSam/open-source-avatars/main/data/avatars.json
**License**: Mixed (CC0 and CC-BY per avatar)
**Format**: VRM (stored on Arweave)

### Inventory
| Category | Count |
|----------|-------|
| Total | 100 |

### Pros
- JSON manifest available
- Model URLs in manifest
- Permanent Arweave storage

### Cons
- VRM format only (needs conversion)
- Mixed licenses (must filter CC0 only)
- No gender metadata
- Requires Arweave fetch integration

### Integration Priority: LOW
Complex due to mixed licensing and conversion needs.

---

## Source 4: Quaternius Characters (Secondary)

**Website**: https://quaternius.com/
**License**: CC0
**Format**: FBX, OBJ, GLTF, Blend

### Available Packs
| Pack Name | Est. Characters |
|-----------|-----------------|
| Universal Base Characters | 10+ |
| Ultimate Modular Women | 50+ |
| Ultimate Modular Men | 50+ |
| Animated Women Pack | 5+ |
| Animated Men Pack | 5+ |
| RPG Character Pack | 10+ |
| **Total Est.** | **130+** |

### Pros
- CC0 license
- GLTF format available
- Professional quality
- Well-organized packs

### Cons
- Stylized/game-oriented (may not fit app aesthetic)
- No CDN (Google Drive downloads)
- Would need custom hosting
- Manual categorization required

### Integration Priority: LOW
Style mismatch with realistic avatar aesthetic.

---

## Source 5: Poly.Pizza (Research Only)

**URL**: https://poly.pizza/search/humanoid
**License**: Mixed (CC0 and CC-BY)

### Inventory
- ~35 humanoid results
- ~10-15 CC0 models

### Integration Priority: NOT VIABLE
- Too few CC0 humanoids
- Manual download only (no API)
- Inconsistent quality

---

## Source 6: Sketchfab CC0 (Research Only)

**URL**: https://sketchfab.com/tags/cc0
**API**: https://sketchfab.com/developers/download-api

### Relevant Packs
- CC0 Block Man Auto Rigged Humanoid
- Various individual CC0 characters

### Integration Priority: NOT VIABLE
- Requires per-model download
- API requires authentication
- Inconsistent quality/style

---

## Recommended Integration Strategy

### Phase 1: Quick Win (Current Iteration)
**Maximize existing VALID CDN**
- Already have 425 validated avatars
- Add support for X_ prefix avatars (adds ~45 more)
- Total after Phase 1: **470 avatars**

### Phase 2: Polygonal Mind Integration
**Convert and host 100Avatars collection**
1. Create GitHub repo: `backtrack-avatars-pm`
2. Download VRM files from releases (R1 + R2 = 200)
3. Batch convert VRM to GLB using Blender/gltf-transform
4. Generate thumbnails during conversion
5. Create manifest.json with inferred gender from names
6. Host on jsDelivr CDN
7. Total after Phase 2: **~670 avatars**

### Phase 3: Expand VALID Collection
**Check VALID project for updates**
- Monitor c-frame/valid-avatars-glb for new releases
- R3 if released could add 100+ more
- Total after Phase 3: **~770+ avatars**

### Phase 4: Fill Gender Gap
**Ensure 500+ M and 500+ F**
- Current: 235M / 235F from VALID
- From PM: Estimate 100M / 100F (need to verify)
- If gap remains, selectively add from Quaternius
- Target: **500+ M / 500+ F**

---

## Technical Requirements for New Sources

### Required Metadata Per Avatar
```typescript
interface AvatarManifestEntry {
  id: string;          // Unique identifier
  name: string;        // Display name
  model: string;       // GLB file path
  image: string;       // Thumbnail path
  gender: 'M' | 'F';   // Required for matching
  style?: string;      // Visual style category
  outfit?: string;     // Clothing type
  source: string;      // Source identifier
}
```

### CDN Requirements
- Use jsDelivr for GitHub-hosted assets
- URL pattern: `https://cdn.jsdelivr.net/gh/{owner}/{repo}@{tag}/{path}`
- Ensure cache-friendly versioning with git tags

### Thumbnail Requirements
- Format: PNG or WebP
- Size: 256x256 or 512x512
- Background: Transparent or solid color

---

## Estimated Final Avatar Count

| Source | Male | Female | Total |
|--------|------|--------|-------|
| VALID CDN | 235 | 235 | 470 |
| Polygonal Mind | ~100 | ~100 | 200 |
| Future VALID R3 | ~50 | ~50 | ~100 |
| **Total** | **~385** | **~385** | **~770** |

### Shortfall Analysis
- Goal: 1000+ (500M, 500F)
- Projected: ~770 (~385M, ~385F)
- Gap: ~230 avatars (115M, 115F)

### Options to Close Gap
1. **Wait for VALID R3**: May add 100+ more
2. **Add Quaternius selectively**: Style-appropriate ones only
3. **Generate with MakeHuman**: Create custom avatars
4. **Commission**: Create new avatars (cost: $10-50 per avatar)

---

## Next Steps

1. [x] Audit VALID CDN inventory
2. [x] Research alternative sources
3. [x] Implement multi-source architecture (lib/avatar/sources.ts)
4. [x] Update AvatarBrowser for pagination with infinite scroll
5. [x] Add gender counts display
6. [x] Add LRU cache for thumbnails
7. [ ] Convert Polygonal Mind avatars to GLB (requires Blender or gltf-transform)
8. [ ] Create hosting repo and manifest
9. [ ] Device performance testing

## VRM to GLB Conversion Note

VRM files are technically GLB files with VRM-specific extensions. To convert:

**Option 1: Simple rename** (may work for Three.js)
- VRM files can often be loaded as GLB directly
- Just rename `.vrm` to `.glb`

**Option 2: Using gltf-transform** (Node.js)
```javascript
import { Document, NodeIO } from '@gltf-transform/core';

const io = new NodeIO();
io.registerExtensions([/* VRM extensions if needed */]);

const document = await io.read('avatar.vrm');
await io.write('avatar.glb', document);
```

**Option 3: Using Blender**
1. Install VRM addon for Blender
2. Import VRM file
3. Export as GLB with embedded textures

---

## References

- VALID Project: https://github.com/c-frame/valid-avatars-glb
- Polygonal Mind: https://github.com/PolygonalMind/100Avatars
- Open Source Avatars: https://github.com/ToxSam/open-source-avatars
- Quaternius: https://quaternius.com/
- Poly.Pizza: https://poly.pizza/
- Sketchfab: https://sketchfab.com/
