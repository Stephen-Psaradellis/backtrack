# Avatar Library Expansion - Blockers

This document describes the blockers preventing the avatar library from reaching 1000+ avatars.

## Current State

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| Total avatars | 470 | 1000+ | 530+ |
| Male avatars | 235 | 500+ | 265+ |
| Female avatars | 235 | 500+ | 265+ |

## What Was Accomplished

### Phase 1: Research (COMPLETE)
- Audited VALID Project CDN: 470 avatars available
- Researched alternative sources:
  - Polygonal Mind 100Avatars: 200-300 CC0 avatars (VRM format)
  - Open Source Avatars: 100 VRM avatars (mixed licenses)
  - Quaternius: 130+ characters (stylized, not realistic)

### Phase 2: Architecture (COMPLETE)
- Designed and documented multi-source architecture
- Created `lib/avatar/sources.ts` with source registry pattern
- Extensible design ready to add new sources

### Phase 3: Implementation (COMPLETE)
- Multi-source fetching with Promise.allSettled
- Pagination with infinite scroll (50 items/page)
- LRU cache for thumbnails (200 max)
- Gender counts display in filter bar
- Optimized FlatList for performance

### Phase 4: Testing (COMPLETE)
- TypeScript compiles (avatar code passes)
- Tests pass (3949/3967, failures unrelated to avatar code)
- Lint passes for avatar code

## Blockers Preventing 1000+ Goal

### 1. VRM to GLB Conversion Required
**Impact**: Cannot use Polygonal Mind 200+ avatars without conversion

**Why it's blocked**:
- Polygonal Mind avatars are in VRM format
- VRM is based on GLB but uses VRM extensions
- While VRM can sometimes be loaded as GLB, reliability varies
- Proper conversion requires Blender or Node.js gltf-transform

**Work required**:
1. Install Blender with VRM addon OR set up gltf-transform pipeline
2. Download all VRM files from Polygonal Mind releases
3. Batch convert VRM to GLB
4. Generate thumbnails for each avatar
5. Create manifest.json with metadata

**Estimated effort**: 4-8 hours

### 2. Asset Hosting Required
**Impact**: Cannot serve converted avatars without hosting

**Why it's blocked**:
- Converted GLB files need CDN hosting
- jsDelivr requires GitHub repository
- Need to create and maintain separate repo

**Work required**:
1. Create GitHub repo (e.g., `backtrack-app/avatars-pm`)
2. Upload converted GLB files and thumbnails
3. Create manifest.json with avatar metadata
4. Tag release for jsDelivr caching
5. Update sources.ts to enable new source

**Estimated effort**: 2-4 hours

### 3. Gender Categorization Required
**Impact**: Cannot filter/match avatars without gender metadata

**Why it's blocked**:
- Polygonal Mind avatars have no gender metadata
- Need manual classification or name-based inference
- Required for matching algorithm

**Work required**:
1. Review each avatar visually or by name
2. Assign gender ('M' or 'F')
3. Add to manifest.json

**Estimated effort**: 2-4 hours

### 4. Limited CC0 Sources
**Impact**: Cannot reach 1000+ with available CC0 avatars

**Available CC0 sources**:
- VALID CDN: 470
- Polygonal Mind: 200-300
- **Total available**: 670-770

**Gap to 1000**: 230-330 avatars

**Options to close gap**:
1. Wait for VALID R3 release (may add 100+)
2. Commission custom avatars ($10-50 each)
3. Generate with MakeHuman (requires manual work)
4. Accept 770 as the practical limit

## Recommendation

The practical maximum with available CC0 sources is ~770 avatars (VALID + Polygonal Mind).

**Short-term**: The architecture is complete. Enable X_ prefixed VALID avatars for 470 → ~515.

**Medium-term**: Complete VRM conversion pipeline to add Polygonal Mind (~715 total).

**Long-term**: Monitor VALID project for R3 release or commission custom avatars if 1000+ is required.

## Files Delivered

| File | Description |
|------|-------------|
| `lib/avatar/sources.ts` | Multi-source registry |
| `lib/avatar/defaults.ts` | Updated with pagination, gender counts |
| `components/avatar/types.ts` | Extended types for multi-source |
| `components/avatar/AvatarCreator/AvatarBrowser.tsx` | Infinite scroll, LRU cache |
| `AVATAR-SOURCES.md` | Research documentation |
| `AVATAR-ARCHITECTURE.md` | System design |

## Completion Status

- [x] Architecture ready for 1000+ avatars
- [x] Code supports multiple sources
- [x] Pagination implemented
- [x] Performance optimizations in place
- [ ] 1000+ avatars available (**BLOCKED** - needs external work)
