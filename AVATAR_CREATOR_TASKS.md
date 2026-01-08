# Avatar Creator - Actionable Task Breakdown

**Source:** AVATAR_CREATOR_ISSUES.md
**Purpose:** Break down issues into small, focused tasks that a single Claude instance can complete with high quality.

---

## Task Organization

Tasks are organized by:
- **Priority:** P0 (Critical), P1 (High), P2 (Medium), P3 (Low)
- **Estimated Scope:** Each task is sized for a single Claude session (~30-60 min of focused work)
- **Dependencies:** Listed where tasks must be completed in order

---

## P0: Critical Issues (Showstoppers)

### Issue 1: 3D Preview is Completely Broken

#### Task 1.1: Diagnose WebGL Preview Loading Failure
**Goal:** Identify why the 3D preview shows a red octahedron indefinitely and never loads the avatar.

**Files to investigate:**
- `components/avatar/AvatarCreator/PreviewPanel.tsx`
- `components/avatar3d/` (entire directory)
- `webgl-avatar/src/` (WebGL bundle source)

**Deliverable:** Written diagnosis report explaining:
1. What is supposed to happen in the loading flow
2. Where the failure occurs (network, WebView bridge, R3F rendering, asset loading)
3. Console/error logs if accessible
4. Root cause identification

**Acceptance criteria:**
- Clear explanation of the loading failure
- Specific file(s) and line(s) where the issue originates
- Recommended fix approach

---

#### Task 1.2: Add Error Handling and Timeout to 3D Preview
**Goal:** Prevent infinite loading state by adding timeout and error handling.

**Prerequisite:** Task 1.1 (need to understand the loading flow)

**Files to modify:**
- `components/avatar/AvatarCreator/PreviewPanel.tsx`

**Implementation:**
1. Add a loading timeout (e.g., 15 seconds)
2. Add error state and error message display
3. Add a "Retry" button when loading fails
4. Log errors for debugging

**Acceptance criteria:**
- Preview shows error message if loading takes >15 seconds
- Error message is user-friendly (not technical jargon)
- Retry button triggers new load attempt
- Console logs capture error details

---

#### Task 1.3: Implement 2D Fallback for Failed 3D Preview
**Goal:** Show a static 2D avatar image when 3D preview fails to load.

**Prerequisite:** Task 1.2 (need error detection)

**Files to modify:**
- `components/avatar/AvatarCreator/PreviewPanel.tsx`
- May need to create static avatar images/thumbnails

**Implementation:**
1. After 3D load failure, render a 2D placeholder image of the selected avatar
2. Use avatar preset thumbnails or generate simple 2D representations
3. Show a small indicator that 3D preview failed

**Acceptance criteria:**
- Users see their selected avatar visually (even if not 3D)
- Fallback triggers automatically after timeout/error
- User understands 3D failed but can still proceed

---

#### Task 1.4: Fix WebGL Bundle Loading (if issue is bundle-related)
**Goal:** Ensure the WebGL bundle loads correctly in the WebView.

**Prerequisite:** Task 1.1 diagnosis must indicate bundle loading issue

**Files to investigate:**
- `webgl-avatar/` build configuration
- `components/avatar3d/r3fBundle.ts` (generated bundle)
- WebView component that loads the bundle

**Implementation:**
1. Verify bundle is correctly generated (`npm run build:webgl`)
2. Check WebView correctly injects/loads the bundle
3. Verify asset paths (GLB models) resolve correctly
4. Fix any path or loading issues found

**Acceptance criteria:**
- WebGL bundle loads without errors
- 3D preview shows avatar instead of red octahedron

---

### Issue 2: Avatar Output is Useless for Recognition

#### Task 2.1: Audit AvatarDisplay Rendering Logic
**Goal:** Understand why saved avatars render as primitive shapes instead of detailed avatars.

**Files to investigate:**
- `components/avatar/AvatarDisplay/index.tsx`
- `components/avatar/AvatarDisplay/AvatarSvg.tsx`
- `components/avatar/AvatarDisplay/AvatarPlaceholder.tsx`

**Deliverable:** Written analysis explaining:
1. Current rendering logic flow
2. Why detailed avatar features are not rendering
3. Whether the issue is data (missing config), rendering (wrong component), or assets (missing)

**Acceptance criteria:**
- Clear explanation of current rendering behavior
- Identification of what component/logic needs to change
- Recommended fix approach

---

#### Task 2.2: Implement Detailed Avatar Rendering in AvatarDisplay
**Goal:** Make AvatarDisplay render avatars with distinguishing features (face, hair, clothing).

**Prerequisite:** Task 2.1 (need to understand current logic)

**Files to modify:**
- `components/avatar/AvatarDisplay/AvatarSvg.tsx`
- `components/avatar/AvatarDisplay/index.tsx`

**Implementation options (choose based on Task 2.1 findings):**
1. **If SVG-based:** Create detailed SVG representations for each avatar preset
2. **If image-based:** Generate/use static images of each avatar preset
3. **If 3D snapshot:** Capture 3D renders as static images for display

**Acceptance criteria:**
- Each avatar preset has a visually distinct appearance
- Users can differentiate between avatars by ethnicity, gender, and clothing
- Avatars display correctly in profile, posts, and chat contexts

---

#### Task 2.3: Generate Avatar Thumbnail Assets
**Goal:** Create thumbnail images for each avatar preset.

**Prerequisite:** Task 2.2 (need to know what format/style is needed)

**Implementation:**
1. For each avatar in `LOCAL_AVATAR_PRESETS` (6 bundled) and CDN avatars:
   - Generate a thumbnail image (PNG, 200x200 or similar)
   - Store in appropriate assets directory
2. Create an asset mapping file that links avatar IDs to thumbnails

**Acceptance criteria:**
- All 6 local avatars have thumbnail images
- Thumbnails are visually distinct and match the 3D models
- Asset mapping allows easy lookup by avatar ID

---

### Issue 3: Misleading Marketing Copy

#### Task 3.1: Update Avatar Creator Copy to Match Reality
**Goal:** Change UI text to accurately describe the preset-based system.

**Files to modify:**
- `screens/AvatarCreatorScreen.tsx`
- `components/avatar/AvatarCreator/index.tsx`
- `components/onboarding/AvatarCreationStep.tsx` (if applicable)

**Current copy (inaccurate):**
> "Create your personalized avatar. Customize your face, body, hair, and clothing!"

**Replacement copy (accurate for preset system):**
> "Choose an avatar that represents you. Select from our diverse collection of professionally designed avatars."

**Implementation:**
1. Find all instances of misleading copy
2. Replace with accurate descriptions
3. Ensure consistency across all screens

**Acceptance criteria:**
- No references to "customization" if only preset selection exists
- Copy accurately describes the preset selection experience
- Tone remains positive and inviting

---

## P1: Major UX Issues

### Issue 4: Unnecessary Intermediate Screen

#### Task 4.1: Remove Redundant "No Avatar Yet" Screen
**Goal:** Navigate directly to avatar creator from the first "Create Avatar" button.

**Files to investigate:**
- `screens/ProfileScreen.tsx` (likely contains navigation)
- `screens/AvatarCreatorScreen.tsx`
- `navigation/AppNavigator.tsx`
- `components/avatar/AvatarCreator/index.tsx`

**Implementation:**
1. Identify the "No Avatar Yet" intermediate screen
2. Modify navigation to skip it and go directly to creator
3. Remove or repurpose the intermediate screen component

**Acceptance criteria:**
- Single tap from "Create Avatar" reaches the creator
- No regression in avatar creation flow
- Clean removal of unused code

---

### Issue 5: Screen Real Estate Disaster

#### Task 5.1: Redesign Avatar Creator Layout for Better Space Usage
**Goal:** Give more screen space to avatar selection, less to the (broken) 3D preview.

**Files to modify:**
- `components/avatar/AvatarCreator/index.tsx`
- `components/avatar/AvatarCreator/PreviewPanel.tsx`

**Implementation options:**
1. **Collapsible preview:** Add expand/collapse toggle for 3D preview
2. **Reduced preview:** Make preview 30% instead of 60%
3. **On-selection preview:** Show preview only when an avatar is tapped
4. **Bottom sheet preview:** Move preview to a bottom sheet overlay

**Acceptance criteria:**
- Avatar selection grid shows at least 4-6 cards without scrolling
- Users can still preview selected avatar
- Layout works on various screen sizes

---

#### Task 5.2: Implement Collapsible Preview Panel
**Goal:** Allow users to collapse the 3D preview to see more avatar options.

**Prerequisite:** Decision from Task 5.1 on which approach to take

**Files to modify:**
- `components/avatar/AvatarCreator/PreviewPanel.tsx`
- `components/avatar/AvatarCreator/index.tsx`

**Implementation:**
1. Add collapse/expand button to preview panel
2. Animate collapse transition
3. Remember collapse state during session
4. When collapsed, show a small avatar thumbnail instead

**Acceptance criteria:**
- Preview collapses to ~50px when collapsed
- Expand button is easily discoverable
- Collapse animation is smooth (~200ms)

---

### Issue 6: Avatar Cards Show No Preview

#### Task 6.1: Add Avatar Thumbnails to Selection Cards
**Goal:** Display avatar preview images on each selection card.

**Prerequisite:** Task 2.3 (need thumbnail assets)

**Files to modify:**
- `components/avatar/AvatarCreator/AvatarBrowser.tsx`

**Implementation:**
1. Load thumbnail image for each avatar preset
2. Display thumbnail in card (fill or centered)
3. Handle loading states for thumbnails
4. Style cards to showcase the thumbnail prominently

**Acceptance criteria:**
- Each card shows a recognizable avatar image
- Cards load quickly (images are appropriately sized)
- Selected card has distinct visual treatment

---

### Issue 7: Ethnicity Filtering is Problematic

#### Task 7.1: Research Alternative Filtering Approaches
**Goal:** Propose alternative filtering UX that avoids forced racial self-identification.

**Deliverable:** Written proposal with 2-3 alternative approaches:
1. **Skin tone slider:** Let users adjust a skin tone spectrum
2. **Style preferences:** Filter by clothing style, hair style, etc.
3. **Smart sorting:** Show all avatars, but sort by visual similarity to selections
4. **No filters:** Just show all avatars in a scrollable grid

**For each approach:**
- Pros and cons
- Implementation complexity
- User experience impact

**Acceptance criteria:**
- At least 2 viable alternatives proposed
- Clear recommendation with rationale
- Implementation notes for chosen approach

---

#### Task 7.2: Implement New Filtering UX (Based on Task 7.1)
**Goal:** Replace ethnicity-based filtering with a less problematic approach.

**Prerequisite:** Task 7.1 (need to choose approach)

**Files to modify:**
- `components/avatar/AvatarCreator/index.tsx`
- Filter-related components

**Acceptance criteria:**
- New filtering approach implemented
- Users can find avatars without explicit ethnicity selection
- Filtering is intuitive and usable

---

### Issue 8: Filter Toggle Behavior is Broken

#### Task 8.1: Fix Filter Chip Toggle Behavior
**Goal:** Make filter chips toggle on/off correctly.

**Files to investigate:**
- `components/avatar/AvatarCreator/index.tsx`
- Filter chip component (may be inline or separate)

**Bugs to fix:**
1. Tapping selected filter should deselect it
2. Selecting one filter should not unexpectedly change others
3. Clear (X) button should reliably clear all filters

**Implementation:**
1. Review filter state management logic
2. Implement proper toggle behavior (tap to toggle)
3. Fix any state management bugs causing unexpected changes
4. Ensure clear button resets all filter state

**Acceptance criteria:**
- Filters toggle on/off with single tap
- Multiple filters can be selected independently
- Clear button resets all filters to unselected
- Filter state accurately reflects selected avatar

---

### Issue 9: Filter Selected State is Invisible

#### Task 9.1: Improve Filter Chip Selected State Styling
**Goal:** Make selected filter state visually obvious.

**Files to modify:**
- Filter chip styling (inline or in component file)
- `components/avatar/AvatarCreator/index.tsx`

**Implementation:**
1. Change selected state to use filled background (not just outline)
2. Use contrasting text color on selected chips
3. Optional: Add checkmark icon to selected chips
4. Ensure sufficient color contrast for accessibility

**Acceptance criteria:**
- Selected filters are immediately recognizable
- Unselected filters are clearly different from selected
- Color contrast meets WCAG AA standards

---

### Issue 10: Touch Target Confusion

#### Task 10.1: Fix Touch Target Boundaries
**Goal:** Prevent misfires between filter chips and avatar grid.

**Files to modify:**
- `components/avatar/AvatarCreator/index.tsx`
- Layout/spacing between filter section and grid

**Implementation:**
1. Add vertical spacing/margin between filter section and avatar grid
2. Ensure touch targets don't overlap
3. Add visual separator if needed (line, background change)
4. Test on device to verify no misfires

**Acceptance criteria:**
- Minimum 16px gap between filter area and avatar grid
- No accidental filter activations when selecting avatars
- Clear visual separation between sections

---

## P2: Medium Issues

### Issue 12: Selection/Save Mismatch

#### Task 12.1: Audit Avatar Selection State Management
**Goal:** Understand and fix the mismatch between filter state and saved avatar.

**Files to investigate:**
- `components/avatar/AvatarCreator/index.tsx`
- `components/avatar/AvatarCreator/AvatarCreatorContext.tsx`

**Bugs observed:**
- Filter showed "White" but saved avatar was "Asian Male"

**Implementation:**
1. Trace state management for filters and selected avatar
2. Identify where state becomes inconsistent
3. Fix the bug causing mismatch
4. Ensure UI always reflects actual selected avatar

**Acceptance criteria:**
- Filter display matches selected avatar's attributes
- Saved avatar matches what user selected
- No confusing state discrepancies

---

## P3: Low Priority Issues

### Issue 11: No Loading Progress Indicators

#### Task 11.1: Add Loading Indicators Throughout Avatar Creator
**Goal:** Add contextual loading indicators so users know what's loading.

**Files to modify:**
- `components/avatar/AvatarCreator/PreviewPanel.tsx`
- `components/avatar/AvatarCreator/AvatarBrowser.tsx`
- `components/avatar/AvatarCreator/index.tsx`

**Implementation:**
1. Add "Loading avatar preview..." text with spinner to 3D preview
2. Add loading state for avatar thumbnail grid
3. Add loading state for save operation
4. Show progress if possible, otherwise indeterminate spinner

**Acceptance criteria:**
- Users see loading indicators during all async operations
- Loading text provides context (what is loading)
- Indicators disappear when loading completes or fails

---

### Issue 13: Undo/Redo Always Disabled

#### Task 13.1: Remove Non-Functional Undo/Redo Buttons
**Goal:** Remove undo/redo buttons that don't work rather than showing broken UI.

**Files to modify:**
- `components/avatar/AvatarCreator/index.tsx`
- Toolbar component (if separate)

**Implementation:**
1. Locate undo/redo button components
2. Remove them from the UI
3. Clean up any related unused code/state

**Alternative:** If undo/redo is desired, implement it properly:
1. Track avatar selection history in state
2. Enable undo when history.length > 1
3. Enable redo when forward history exists

**Acceptance criteria (removal):**
- No undo/redo buttons visible
- No console errors from removed components
- Clean removal of related code

---

### Issue 14: Randomize Button Does Nothing Visible

#### Task 14.1: Fix or Remove Randomize Button
**Goal:** Make randomize button work or remove it.

**Files to modify:**
- `components/avatar/AvatarCreator/index.tsx`
- Toolbar component (if separate)

**Implementation (fix):**
1. Identify why randomize doesn't work (likely not connected to state)
2. Implement: randomly select from available avatars
3. Trigger animation/feedback when randomizing
4. Update 3D preview with random selection

**Implementation (remove):**
1. Remove button from UI
2. Remove related handler code

**Acceptance criteria (fix):**
- Tapping randomize selects a random avatar
- Selection visually updates (card highlight, preview)
- Works with current filter selections (random within filtered set)

---

## Task Dependencies

```
Task 1.1 ─────► Task 1.2 ─────► Task 1.3
                  │
                  └─────────────► Task 1.4 (if needed)

Task 2.1 ─────► Task 2.2 ─────► Task 2.3

Task 5.1 ─────► Task 5.2

Task 7.1 ─────► Task 7.2

Task 2.3 ─────► Task 6.1 (needs thumbnails)
```

---

## Recommended Execution Order

### Phase 1: Stabilization (Critical Fixes)
1. Task 1.1 - Diagnose 3D preview failure
2. Task 1.2 - Add error handling/timeout
3. Task 1.3 - Implement 2D fallback
4. Task 3.1 - Fix misleading copy
5. Task 2.1 - Audit AvatarDisplay rendering

### Phase 2: Core Functionality
6. Task 2.2 - Implement detailed avatar rendering
7. Task 2.3 - Generate avatar thumbnails
8. Task 6.1 - Add thumbnails to selection cards
9. Task 1.4 - Fix WebGL bundle (if still needed)

### Phase 3: UX Improvements
10. Task 4.1 - Remove intermediate screen
11. Task 5.1 - Redesign layout
12. Task 5.2 - Implement collapsible preview
13. Task 8.1 - Fix filter toggle behavior
14. Task 9.1 - Improve filter selected state
15. Task 10.1 - Fix touch target boundaries

### Phase 4: Polish
16. Task 7.1 - Research filtering alternatives
17. Task 7.2 - Implement new filtering
18. Task 11.1 - Add loading indicators
19. Task 12.1 - Fix selection/save mismatch
20. Task 13.1 - Remove undo/redo buttons
21. Task 14.1 - Fix or remove randomize

---

## Notes for Claude Instances

1. **Read related files first** before making changes
2. **Check CLAUDE.md** for project conventions and security rules
3. **Run tests** after making changes: `npm test`
4. **Run typecheck** after TypeScript changes: `npm run typecheck`
5. **Test on device** using MCP tools when possible for UI changes
6. **Keep changes focused** - complete one task fully before starting another
7. **Document findings** if investigation reveals unexpected complexity

---

## Task 2.1 Analysis: AvatarDisplay Rendering Logic

**Status:** ✅ COMPLETED
**Date:** 2026-01-06

### Executive Summary

The AvatarDisplay component intentionally renders **primitive placeholder shapes** (circles/ellipses) for new-style preset avatars because no 2D rendering implementation exists for them. The system was designed around two avatar types with different rendering paths, but only the legacy path has complete 2D rendering.

### Current Rendering Logic Flow

```
User's avatar → AvatarDisplay (index.tsx)
                    │
                    ├─ Is new-style avatar? (has avatarId, no skinTone)
                    │   │
                    │   └─ YES → AvatarPlaceholder (circles/ellipses)
                    │            [NO DETAILED RENDERING]
                    │
                    └─ Is legacy avatar? (has skinTone)
                        │
                        └─ YES → AvatarSvg → composeAvatar() → Detailed SVG
                                 [FULL FACE, HAIR, CLOTHING RENDERING]
```

**Key files and their roles:**

| File | Purpose |
|------|---------|
| `components/avatar/AvatarDisplay/index.tsx:143-158` | **Decision point** - routes new-style avatars to placeholder |
| `components/avatar/AvatarDisplay/AvatarSvg.tsx` | Renders detailed SVG for **legacy avatars only** |
| `components/avatar/AvatarDisplay/AvatarPlaceholder.tsx` | Renders primitive shapes (circle for head, ellipse for body) |
| `components/avatar/parts/composer.ts` | Composes detailed multi-layer SVG from legacy config |

### Why Detailed Avatar Features Are Not Rendering

**Root Cause:** The `AvatarDisplay` component explicitly checks if an avatar is a "new-style" preset avatar (has `avatarId` field, lacks `skinTone` field). If true, it **deliberately bypasses** the detailed SVG renderer and shows the placeholder instead.

**Code Evidence (index.tsx lines 143-158):**
```typescript
// New-style avatar (preset-based) - show placeholder since we can't render 2D SVG for these
// Note: This component is deprecated - use AvatarSnapshot or Avatar3D for new avatars
if (isNewAvatar) {
  if (fallback) {
    return <>{fallback}</>;
  }
  return (
    <AvatarPlaceholder
      size={size}
      view={view}
      style={style}
      testID={testID}
      isNewStyle // Mark as new style for potential different styling
    />
  );
}
```

The comment admits: **"show placeholder since we can't render 2D SVG for these"**

### The Broken Chain

The system has three potential display paths:

| Path | Avatar Type | Status | Result |
|------|------------|--------|--------|
| **2D SVG** (AvatarDisplay) | Legacy | ✅ Works | Detailed face, hair, clothing |
| **2D SVG** (AvatarDisplay) | New-style | ❌ Not implemented | Primitive shapes only |
| **3D Snapshot** (AvatarSnapshot) | New-style | ❌ Broken (per Task 1.1) | Placeholder fallback |
| **3D Snapshot** (AvatarSnapshot) | Legacy | ⚠️ Depends on cache | Falls back to 2D SVG |

**PostCard and ProfileScreen use `AvatarSnapshot`**, which:
1. Tries to load a 3D snapshot from Supabase Storage
2. On failure, falls back to `AvatarDisplay`
3. `AvatarDisplay` then shows placeholder for new-style avatars

Since 3D preview is broken (Task 1.1) and no snapshots are being generated, **all new-style avatars render as placeholders everywhere**.

### Issue Classification

**This is an IMPLEMENTATION issue, not data or assets:**

- ❌ **Not a data issue**: Avatars have valid `avatarId`, `ethnicity`, `gender`, `outfit` fields
- ❌ **Not an assets issue**: 3D GLB models exist in `webgl-avatar/public/models/bodies/`
- ✅ **Implementation gap**: No 2D rendering path was created for new-style avatars

### What the Legacy System Has (That New System Lacks)

The legacy `composeAvatar()` function in `parts/composer.ts`:
- Layers 14 SVG parts (head, eyes, nose, mouth, hair, eyebrows, etc.)
- Applies skin tone colorization from `SkinToneV2` definitions
- Supports portrait and full-body views
- Caches composed SVGs for performance

The new preset system has:
- ✅ Complete 3D GLB models (designed to render in WebGL)
- ❌ No 2D SVG representations of those models
- ❌ No thumbnail/preview images for each preset
- ❌ No fallback when 3D fails

### Recommended Fix Approach

**Option A: Generate Static Thumbnails (RECOMMENDED)**
- Complexity: Low
- For each of the 6 local avatar presets + CDN avatars:
  1. Render 3D model to image in development environment
  2. Export as PNG thumbnails (e.g., 200x200, 400x400)
  3. Bundle with app or host on CDN
  4. Modify `AvatarDisplay` to load thumbnail by `avatarId`

**Option B: Create 2D SVG Representations**
- Complexity: High
- Create hand-drawn or programmatic SVG versions of each preset
- Similar to legacy system but mapping presets to pre-made SVGs
- Requires significant art/design effort

**Option C: Fix 3D Rendering + Snapshot Generation**
- Complexity: Medium-High
- Fix Task 1.1 (WebGL loading)
- Implement automatic snapshot generation on avatar save
- Store snapshots in Supabase for display
- Requires 3D/WebGL debugging + backend integration

**Option D: Hybrid Approach**
- Generate static thumbnails for immediate fix (Option A)
- Fix 3D in parallel for creator preview (Task 1.x)
- Use thumbnails as permanent 2D fallback

### Files That Need Modification

For **Option A** (static thumbnails):

1. **Create thumbnail assets**
   - Location: `assets/avatars/thumbnails/` or similar
   - Format: PNG, 200x200 and 400x400 sizes
   - Naming: Match `avatarId` (e.g., `avatar_asian_m.png`)

2. **Create thumbnail mapping**
   - New file: `lib/avatar/thumbnails.ts`
   - Map `avatarId` → `require('./assets/...')` or CDN URL

3. **Modify AvatarDisplay (index.tsx)**
   - When `isNewAvatar === true`: load thumbnail instead of placeholder
   - Add Image component to render thumbnail

4. **Update AvatarPlaceholder (optional)**
   - Accept thumbnail URL prop for enhanced placeholder

### Additional Findings: AvatarSnapshot Flow

The `AvatarSnapshot` component (`components/avatar3d/AvatarSnapshot.tsx`) is the **primary display component** used by `PostCard` and other screens. Its flow for new-style avatars:

```
AvatarSnapshot receives avatar config
        │
        ├─ extractConfig() checks for new-style avatar
        │   │
        │   └─ Returns NULL for new-style (avatarId present, skinTone absent)
        │
        ├─ useAvatarSnapshot(null, ...) → skipped, no URL fetched
        │
        └─ Renders AvatarPlaceholder (line 206-213)
            [PRIMITIVE SHAPES ONLY]
```

**Key code (AvatarSnapshot.tsx:118-125):**
```typescript
function isNewAvatarConfig(config: unknown): boolean {
  return (
    config !== null &&
    typeof config === 'object' &&
    'avatarId' in config &&
    !('skinTone' in config)
  );
}
```

This means even the "primary" display path immediately falls back to placeholder for new-style avatars.

### Note on AvatarFallback2D

There IS an `AvatarFallback2D` component (`components/avatar/AvatarCreator/AvatarFallback2D.tsx`) created for Task 1.3, but it only renders:
- **Color-coded silhouettes** (blue for male, pink for female)
- **Info badges** showing name, gender, ethnicity, outfit
- **NOT** the actual avatar appearance or distinguishing features

This component is used in the Avatar Creator preview panel when 3D fails, but does NOT solve the core problem of displaying what avatars actually look like in posts, profiles, and chats.

### Complete Rendering Path Summary

| Component | Usage | New-Style Result | Legacy Result |
|-----------|-------|------------------|---------------|
| `AvatarSnapshot` | PostCard, ProfileScreen | → Placeholder | → Snapshot or 2D SVG |
| `AvatarDisplay` | Fallback from AvatarSnapshot | → Placeholder | → Detailed 2D SVG |
| `AvatarFallback2D` | Avatar Creator preview only | → Silhouette + info | N/A |
| `AvatarPlaceholder` | Final fallback everywhere | → Circles/ellipses | → Circles/ellipses |

### Acceptance Criteria Verification

✅ **Clear explanation of current rendering behavior**
- New-style avatars are explicitly routed to primitive placeholder shapes
- Legacy avatars get full SVG composition with detailed features
- AvatarSnapshot also bypasses new-style avatars, never attempting snapshot fetch

✅ **Identification of what component/logic needs to change**
- Primary: `AvatarDisplay/index.tsx` lines 143-158
- Secondary: `AvatarSnapshot.tsx` extractConfig() at lines 132-154
- Secondary: Need new thumbnail assets or fixed 3D system

✅ **Recommended fix approach**
- Option A (static thumbnails) remains fastest path to visual avatars
- AvatarFallback2D pattern could be extended but requires real preview images
- Can be done independently of 3D preview fixes
