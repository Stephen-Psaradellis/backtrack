# Avatar System Migration Plan: 3D → 2D Component-Based

## Overview

Complete migration from the current 3D GLB-based avatar system to a 2D component-based system using `rn-customize-avatar` with Avataaars style.

**Key Decisions:**
- Fresh start for all users (no migration of existing avatars)
- Simplified matching (gender + skin tone only)
- Avataaars style (30+ hair styles, 12 eye types, clothing, accessories)

---

## Phase 1: Install Dependencies & Configure

### 1.1 Install New Packages
```bash
npm install rn-customize-avatar @shopify/react-native-skia react-native-reanimated
```

### 1.2 Update Metro Config
**File:** `metro.config.js`
- Add WASM support for Skia: `config.resolver.assetExts.push('wasm')`

### 1.3 Create Development Build
- Skia requires native modules, so Expo Go won't work
- Run: `npx expo prebuild` if not already done

---

## Phase 2: Create New 2D Avatar Types

### 2.1 New Type Definitions
**Create:** `components/avatar2d/types.ts`

```typescript
// Core 2D avatar configuration
export interface Avatar2DConfig {
  // Identity
  gender: 'male' | 'female';
  skinTone: string;  // hex color

  // Appearance
  hairStyle: string;
  hairColor: string;
  eyeType: string;
  eyebrowType: string;
  mouthType: string;

  // Optional
  facialHair?: string;
  facialHairColor?: string;
  accessories?: string;
  accessoriesColor?: string;
  clothing?: string;
  clothingColor?: string;
  clothingGraphic?: string;
}

// Stored format (replaces StoredAvatar)
export interface StoredAvatar2D {
  id: string;
  type: '2d';
  config: Avatar2DConfig;
  base64?: string;  // Cached render
  createdAt: string;
  updatedAt: string;
}

// For matching
export interface AvatarMatchCriteria {
  gender: 'male' | 'female';
  skinTone: 'light' | 'medium' | 'dark';  // Simplified for matching
}
```

---

## Phase 3: Create New 2D Avatar Components

### 3.1 Avatar Editor Component
**Create:** `components/avatar2d/Avatar2DCreator.tsx`
- Wraps `rn-customize-avatar/avataaars`
- Full-screen editor with all customization options
- Returns `StoredAvatar2D` on completion

### 3.2 Avatar Display Component
**Create:** `components/avatar2d/Avatar2DDisplay.tsx`
- Renders saved avatar from config
- Size variants: `sm` (32px), `md` (64px), `lg` (120px), `xl` (200px)
- Uses `createOwnAvatar()` + `SkSvgView` for rendering

### 3.3 Avatar Matching Utilities
**Create:** `lib/avatar2d/matching.ts`
- `extractMatchCriteria(config: Avatar2DConfig): AvatarMatchCriteria`
- `compareAvatars(a: AvatarMatchCriteria, b: AvatarMatchCriteria): number`
- Simplified: 50% gender match, 50% skin tone match

### 3.4 Avatar Storage
**Create:** `lib/avatar2d/storage.ts`
- `saveUserAvatar(userId, avatar: StoredAvatar2D)`
- `loadUserAvatar(userId): StoredAvatar2D | null`
- `saveCurrentUserAvatar(avatar: StoredAvatar2D)`
- `updatePostTargetAvatar(postId, avatar: StoredAvatar2D)`

### 3.5 Component Index
**Create:** `components/avatar2d/index.ts`
- Export all new components and types

---

## Phase 4: Update Database Schema

### 4.1 Create Migration
**Create:** `supabase/migrations/20260118000000_avatar2d_migration.sql`

```sql
-- Reset avatar columns to new 2D format
-- Note: Fresh start - existing avatars will be null

-- Update profiles table
ALTER TABLE profiles
  ALTER COLUMN avatar SET DEFAULT NULL;

UPDATE profiles SET avatar = NULL, avatar_version = 2;

-- Update posts table
UPDATE posts SET target_avatar_v2 = NULL;

-- Drop snapshot cache table (no longer needed)
DROP TABLE IF EXISTS avatar_snapshot_cache;

-- Drop storage buckets (handled via Supabase dashboard)
-- - avatar-snapshots
-- - avatar-models
```

### 4.2 Update Database Types
**File:** `types/database.ts`
- Update `Profile.avatar` type to `StoredAvatar2D | null`
- Update `Post.target_avatar_v2` type to `StoredAvatar2D | null`

---

## Phase 5: Update All Avatar Usage Sites

### 5.1 Screens to Update

| Screen | File | Changes |
|--------|------|---------|
| ProfileScreen | `screens/ProfileScreen.tsx` | Replace `LgAvatarSnapshot` → `Avatar2DDisplay` |
| AvatarCreatorScreen | `screens/AvatarCreatorScreen.tsx` | Replace `AvatarCreator` → `Avatar2DCreator` |
| ChatListScreen | `screens/ChatListScreen.tsx` | Replace `MdAvatarSnapshot` → `Avatar2DDisplay` |
| PostDetailScreen | `screens/PostDetailScreen.tsx` | Replace `LgAvatarSnapshot` → `Avatar2DDisplay` |
| CreatePost/AvatarStep | `screens/CreatePost/steps/AvatarStep.tsx` | Use `Avatar2DCreator` |
| CreatePost/MomentStep | `screens/CreatePost/steps/MomentStep.tsx` | Use `Avatar2DDisplay` |
| CreatePost/ReviewStep | `screens/CreatePost/steps/ReviewStep.tsx` | Use `Avatar2DDisplay` |
| CreatePost/SealStep | `screens/CreatePost/steps/SealStep.tsx` | Use `Avatar2DDisplay` |
| CreatePost/NoteStep | `screens/CreatePost/steps/NoteStep.tsx` | Use `Avatar2DDisplay` |

### 5.2 Components to Update

| Component | File | Changes |
|-----------|------|---------|
| PostCard | `components/PostCard.tsx` | Replace snapshot → `Avatar2DDisplay` |
| LocationCard | `components/LocationCard.tsx` | Replace snapshot → `Avatar2DDisplay` |
| RegularCard | `components/regulars/RegularCard.tsx` | Replace snapshot → `Avatar2DDisplay` |
| GlobalHeader | `components/navigation/GlobalHeader.tsx` | Replace snapshot → `Avatar2DDisplay` |
| LiveCheckinView | `components/checkin/LiveCheckinView.tsx` | Replace snapshot → `Avatar2DDisplay` |
| LiveViewModal | `components/modals/LiveViewModal.tsx` | Replace snapshot → `Avatar2DDisplay` |
| AppNavigator | `navigation/AppNavigator.tsx` | Replace snapshot → `Avatar2DDisplay` |

### 5.3 Hooks to Update

| Hook | File | Changes |
|------|------|---------|
| useOnboardingState | `hooks/useOnboardingState.ts` | Update avatar type |
| useTieredPosts | `hooks/useTieredPosts.ts` | Update `target_avatar_v2` type |
| useEventPosts | `hooks/useEventPosts.ts` | Update avatar type |

### 5.4 Onboarding Flow
**File:** `components/onboarding/AvatarCreationStep.tsx`
- Replace with `Avatar2DCreator`

---

## Phase 6: Delete Old 3D System

### 6.1 Delete Component Directories
```
DELETE: components/avatar/           (entire directory)
DELETE: components/avatar3d/         (entire directory)
```

### 6.2 Delete Library Files
```
DELETE: lib/avatar/                  (entire directory)
```

### 6.3 Delete WebGL Project
```
DELETE: webgl-avatar/                (entire directory - 50+ files)
```

### 6.4 Delete Asset Files
```
DELETE: assets/webgl/                (entire directory)
DELETE: assets/downloads/            (VRM/GLB test files)
```

### 6.5 Delete Test Files
```
DELETE: lib/avatar/__tests__/        (7 test files)
DELETE: hooks/__tests__/useAvatarSnapshot.test.ts
DELETE: components/ui/__tests__/Avatar.test.tsx
```

### 6.6 Delete Screens
```
DELETE: screens/WebGL3DTestScreen.tsx
```

### 6.7 Delete Hooks
```
DELETE: hooks/useAvatarSnapshot.ts
```

### 6.8 Delete Type Files
```
DELETE: types/avatar.ts             (old re-exports)
```

### 6.9 Delete Maestro Flows
```
DELETE: .maestro/flows/avatar/      (avatar E2E tests)
```

### 6.10 Delete Documentation
```
DELETE: docs/avatar-matching.md
DELETE: docs/avatar-body-verification.md
DELETE: docs/AVATAR_SYSTEM_GUIDE.md
DELETE: AVATAR-ARCHITECTURE.md
DELETE: AVATAR-AUDIT.md
DELETE: AVATAR-EXPANSION-BLOCKERS.md
DELETE: AVATAR-PERFORMANCE.md
DELETE: AVATAR-SOURCES.md
```

---

## Phase 7: Update Navigation

**File:** `navigation/types.ts`
- Update `AvatarCreator` route params if needed

**File:** `navigation/AppNavigator.tsx`
- Update imports to use new avatar components

**File:** `navigation/index.ts`
- Clean up any avatar-related exports

---

## Phase 8: Remove Unused Dependencies

### 8.1 Uninstall Packages
```bash
npm uninstall three @react-three/fiber @react-three/drei
npm uninstall react-native-webview  # If only used for avatars
```

### 8.2 Update package.json
- Remove any avatar-related build scripts
- Remove webgl-avatar workspace references if any

---

## Phase 9: Update Tests

### 9.1 Create New Tests
**Create:** `components/avatar2d/__tests__/Avatar2DDisplay.test.tsx`
**Create:** `components/avatar2d/__tests__/Avatar2DCreator.test.tsx`
**Create:** `lib/avatar2d/__tests__/matching.test.ts`
**Create:** `lib/avatar2d/__tests__/storage.test.ts`

### 9.2 Update Existing Tests
- Update any tests that import from old avatar paths
- Update mock data with new avatar format

---

## Phase 10: Cleanup & Verification

### 10.1 Find Remaining References
```bash
# Search for any remaining old imports
grep -r "components/avatar" --include="*.ts" --include="*.tsx"
grep -r "lib/avatar" --include="*.ts" --include="*.tsx"
grep -r "avatar3d" --include="*.ts" --include="*.tsx"
grep -r "AvatarSnapshot" --include="*.ts" --include="*.tsx"
grep -r "useAvatarSnapshot" --include="*.ts" --include="*.tsx"
```

### 10.2 Run Type Check
```bash
npm run typecheck
```

### 10.3 Run Tests
```bash
npm test
```

### 10.4 Manual Testing Checklist
- [ ] Create new 2D avatar in onboarding
- [ ] Edit avatar from profile screen
- [ ] Create post with target avatar
- [ ] View posts in feed with avatars
- [ ] View post detail with avatar
- [ ] Chat list shows avatars
- [ ] Avatar matching works (shows match scores)

---

## File Summary

### New Files (Create)
```
components/avatar2d/
├── index.ts
├── types.ts
├── Avatar2DCreator.tsx
├── Avatar2DDisplay.tsx
└── __tests__/
    ├── Avatar2DCreator.test.tsx
    └── Avatar2DDisplay.test.tsx

lib/avatar2d/
├── index.ts
├── matching.ts
├── storage.ts
└── __tests__/
    ├── matching.test.ts
    └── storage.test.ts

supabase/migrations/
└── 20260118000000_avatar2d_migration.sql
```

### Files to Modify
```
metro.config.js
package.json
types/database.ts
navigation/types.ts
navigation/AppNavigator.tsx
navigation/index.ts
screens/ProfileScreen.tsx
screens/AvatarCreatorScreen.tsx
screens/ChatListScreen.tsx
screens/PostDetailScreen.tsx
screens/CreatePost/steps/AvatarStep.tsx
screens/CreatePost/steps/MomentStep.tsx
screens/CreatePost/steps/ReviewStep.tsx
screens/CreatePost/steps/SealStep.tsx
screens/CreatePost/steps/NoteStep.tsx
components/PostCard.tsx
components/LocationCard.tsx
components/regulars/RegularCard.tsx
components/navigation/GlobalHeader.tsx
components/checkin/LiveCheckinView.tsx
components/modals/LiveViewModal.tsx
components/onboarding/AvatarCreationStep.tsx
hooks/useOnboardingState.ts
hooks/useTieredPosts.ts
hooks/useEventPosts.ts
hooks/index.ts
components/index.ts
```

### Files to Delete (~100+ files)
```
components/avatar/           (entire directory - 8 files)
components/avatar3d/         (entire directory - 7 files)
lib/avatar/                  (entire directory - 14 files)
webgl-avatar/                (entire directory - 50+ files)
assets/webgl/                (entire directory)
screens/WebGL3DTestScreen.tsx
hooks/useAvatarSnapshot.ts
types/avatar.ts
.maestro/flows/avatar/
docs/avatar-*.md
AVATAR-*.md (root level)
```

---

## Estimated Effort

| Phase | Effort |
|-------|--------|
| Phase 1: Install & Configure | 30 min |
| Phase 2: Create Types | 30 min |
| Phase 3: Create Components | 2-3 hours |
| Phase 4: Database Migration | 30 min |
| Phase 5: Update Usage Sites | 2-3 hours |
| Phase 6: Delete Old System | 30 min |
| Phase 7: Update Navigation | 15 min |
| Phase 8: Remove Dependencies | 15 min |
| Phase 9: Update Tests | 1-2 hours |
| Phase 10: Cleanup & Verify | 1 hour |
| **Total** | **8-11 hours** |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Skia compatibility issues with Expo | Test early in Phase 1, have DiceBear HTTP API as fallback |
| Users confused by avatar reset | Add in-app messaging explaining new avatar system |
| Matching less accurate | Simplified matching is intentional per user request |
| Performance regression | 2D SVG rendering is faster than 3D WebGL |

---

## Rollback Plan

If issues arise:
1. Keep git branch with old system
2. Database migration is reversible (set avatar = NULL is safe)
3. No data is permanently deleted (just nullified)
4. Old 3D assets remain in CDN (not deleted)
