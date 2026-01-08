# Avatar 3D Upgrade Plan: From SVG to Three.js

> **Inspired by**: [r3f-ultimate-character-configurator](https://github.com/wass08/r3f-ultimate-character-configurator)
>
> **Goal**: Replace 2D SVG avatars with realistic 3D avatars using Three.js/React Three Fiber

---

## Executive Summary

**Problem**: The current 2D SVG avatar system produces cartoonish, flat results that don't allow users to recognize themselves or others, regardless of shading improvements.

**Solution**: Migrate to a 3D avatar system using:
- **Three.js/React Three Fiber** for rendering
- **WebView-based 3D renderer** for React Native compatibility
- **Modular GLTF assets** for customization
- **Static snapshot export** for performance-critical views

**Key Insight from r3f-ultimate-character-configurator**:
- Uses GLTF models with shared skeleton for consistent rigging
- Asset-based part swapping (not shader-based)
- Zustand for state management (we already use this)
- Post-processing effects for polish (bloom, etc.)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Avatar System v3                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │   Avatar    │    │   WebView    │    │    Static     │  │
│  │   Config    │───▶│   3D Render  │───▶│   Snapshot    │  │
│  │   (Zustand) │    │   (R3F)      │    │   (PNG)       │  │
│  └─────────────┘    └──────────────┘    └───────────────┘  │
│         │                  │                    │           │
│         ▼                  ▼                    ▼           │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │   Matching  │    │   Avatar     │    │   Post/Chat   │  │
│  │   Algorithm │    │   Creator    │    │   Display     │  │
│  └─────────────┘    └──────────────┘    └───────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Rendering Modes:
1. INTERACTIVE (Creator): Full 3D WebView with camera controls
2. STATIC (Posts/Chat): Pre-rendered PNG snapshots from Supabase
3. FALLBACK (Low-end): Enhanced 2D SVG (existing system)
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **3D Engine** | Three.js | WebGL rendering |
| **React Integration** | React Three Fiber (R3F) | Declarative 3D |
| **Model Format** | GLTF/GLB | Modular 3D assets |
| **Mobile Rendering** | react-native-webview | Host R3F in WebView |
| **Asset Hosting** | Supabase Storage | GLTF models + textures |
| **Snapshot Storage** | Supabase Storage | Pre-rendered PNGs |
| **State Management** | Zustand | Avatar config state |

---

## Phase Breakdown

### Phase 1: Infrastructure Setup
**Tasks 1-3** | Foundation for 3D rendering

### Phase 2: 3D Asset Pipeline
**Tasks 4-7** | Model sourcing, processing, hosting

### Phase 3: WebView 3D Renderer
**Tasks 8-11** | R3F integration in React Native

### Phase 4: Avatar Creator Integration
**Tasks 12-14** | Replace creator UI with 3D preview

### Phase 5: Snapshot System
**Tasks 15-17** | Static image generation and caching

### Phase 6: Cleanup & Final Integration
**Tasks 18-20** | Replace legacy code, E2E testing, performance monitoring

---

## Detailed Task Breakdown

---

## PHASE 1: INFRASTRUCTURE SETUP

### Task 1: WebView 3D Proof of Concept

**Goal**: Prove Three.js can render in a React Native WebView

**Files to Create**:
- `components/avatar3d/WebGL3DView.tsx` - WebView wrapper component
- `assets/webgl/index.html` - Minimal HTML host for Three.js
- `assets/webgl/avatar-renderer.js` - Basic Three.js scene setup

**Acceptance Criteria**:
- [ ] WebView renders a spinning 3D cube
- [ ] Works on both iOS and Android
- [ ] Communication bridge: RN → WebView (postMessage)
- [ ] Communication bridge: WebView → RN (onMessage)
- [ ] Frame rate ≥30fps on mid-tier devices

**Technical Notes**:
```typescript
// WebGL3DView.tsx structure
interface WebGL3DViewProps {
  config: AvatarConfig;
  onReady?: () => void;
  onSnapshot?: (base64: string) => void;
}

// Message protocol: RN ↔ WebView
type WebViewMessage =
  | { type: 'SET_CONFIG'; config: AvatarConfig }
  | { type: 'TAKE_SNAPSHOT' }
  | { type: 'READY' }
  | { type: 'SNAPSHOT_RESULT'; base64: string };
```

**Prompt for Agent**:
```
Create a proof-of-concept for rendering Three.js in a React Native WebView.

1. Create `components/avatar3d/WebGL3DView.tsx`:
   - Use react-native-webview
   - Load a bundled HTML file with Three.js
   - Implement postMessage/onMessage bridge
   - Render a simple spinning cube as test

2. Create `assets/webgl/index.html`:
   - Include Three.js from CDN
   - Set up basic scene with camera and lighting
   - Handle messages from React Native
   - Send 'READY' message when loaded

3. Test on Android emulator and verify:
   - Cube renders and spins
   - Message bridge works both directions
   - No WebGL errors in console

Do NOT implement avatar rendering yet - just prove the WebView approach works.
```

---

### Task 2: R3F WebView Bundle Setup

**Goal**: Set up React Three Fiber to run inside WebView

**Dependencies**: Task 1 complete

**Files to Create**:
- `webgl-avatar/` - Separate mini-project for WebView bundle
- `webgl-avatar/package.json` - R3F dependencies
- `webgl-avatar/src/App.jsx` - R3F application
- `webgl-avatar/vite.config.js` - Build config for single HTML output
- `scripts/build-webgl-bundle.sh` - Build script

**Acceptance Criteria**:
- [ ] R3F app builds to single HTML file (inlined JS/CSS)
- [ ] Bundle size <500KB gzipped
- [ ] Renders in WebView with same perf as Task 1
- [ ] Hot reload works in development mode

**Technical Notes**:
```javascript
// vite.config.js - inline everything into single HTML
export default {
  build: {
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  plugins: [
    viteSingleFile(), // Inline all assets
  ],
};
```

**Prompt for Agent**:
```
Set up a React Three Fiber mini-project that builds to a single HTML file for WebView embedding.

1. Create `webgl-avatar/` directory with:
   - package.json with: react, react-dom, three, @react-three/fiber, @react-three/drei
   - vite.config.js configured to output single HTML file
   - src/App.jsx with basic R3F scene (OrbitControls, lighting, test mesh)

2. Create build script `scripts/build-webgl-bundle.sh` that:
   - Builds the webgl-avatar project
   - Copies output to assets/webgl/avatar-bundle.html
   - Verifies file size <500KB gzipped

3. Update WebGL3DView.tsx to load the new R3F bundle

4. Verify in Android emulator:
   - R3F scene renders
   - OrbitControls work (drag to rotate)
   - Performance is acceptable

Keep dependencies minimal - we only need core R3F functionality.
```

---

### Task 3: Message Bridge Protocol

**Goal**: Define robust RN ↔ WebView communication

**Dependencies**: Task 2 complete

**Files to Create/Modify**:
- `components/avatar3d/types.ts` - Message type definitions
- `components/avatar3d/useBridge.ts` - React hook for communication
- `webgl-avatar/src/hooks/useBridge.ts` - WebView side hook

**Acceptance Criteria**:
- [ ] TypeScript types shared between RN and WebView
- [ ] Reliable message delivery with acknowledgment
- [ ] Config updates reflect in 3D scene within 100ms
- [ ] Error handling for malformed messages

**Technical Notes**:
```typescript
// components/avatar3d/types.ts
export type RNToWebViewMessage =
  | { type: 'INIT'; config: AvatarConfig }
  | { type: 'UPDATE_CONFIG'; changes: Partial<AvatarConfig> }
  | { type: 'SET_POSE'; pose: string }
  | { type: 'SET_CAMERA'; position: [number, number, number] }
  | { type: 'TAKE_SNAPSHOT'; format: 'png' | 'jpeg'; quality?: number }
  | { type: 'LOAD_ASSET'; category: string; url: string };

export type WebViewToRNMessage =
  | { type: 'READY' }
  | { type: 'LOADING_PROGRESS'; percent: number }
  | { type: 'ASSET_LOADED'; category: string }
  | { type: 'SNAPSHOT_READY'; base64: string }
  | { type: 'ERROR'; message: string; code: string };
```

**Prompt for Agent**:
```
Create the message bridge protocol for RN ↔ WebView communication.

1. Create `components/avatar3d/types.ts` with:
   - RNToWebViewMessage union type (all commands RN can send)
   - WebViewToRNMessage union type (all responses WebView can send)
   - Shared types for AvatarConfig, poses, camera settings

2. Create `components/avatar3d/useBridge.ts` hook:
   - sendMessage(msg) - sends to WebView with retry logic
   - onMessage callback handler
   - isReady state
   - Error state handling

3. Create `webgl-avatar/src/hooks/useBridge.ts`:
   - Listen for postMessage from RN
   - sendToRN(msg) function
   - Parse and validate incoming messages

4. Test by sending config changes and verifying round-trip works.

Focus on reliability - messages should never be lost.
```

---

## PHASE 2: 3D ASSET PIPELINE

### Task 4: Base Character Model

**Goal**: Source/create base humanoid model with modular parts

**Files to Create**:
- `docs/ASSET_REQUIREMENTS.md` - Spec for all 3D assets
- `webgl-avatar/public/models/base/Armature.glb` - Base skeleton
- `webgl-avatar/public/models/base/Head_Base.glb` - Default head

**Asset Sources (in order of preference)**:
1. **Ready Player Me GLB export** - If licensing allows
2. **Mixamo base character** - Free, rigged, customizable
3. **Synty Studios** - Low-poly stylized (paid)
4. **Custom Blender model** - Full control but time-intensive

**Acceptance Criteria**:
- [ ] Base skeleton with standard bone names
- [ ] Head geometry separable from body
- [ ] <100KB per model file
- [ ] Renders correctly in R3F scene

**Technical Notes**:
```
Bone structure (matching Mixamo naming):
- Hips
  - Spine → Spine1 → Spine2 → Neck → Head
  - LeftUpLeg → LeftLeg → LeftFoot
  - RightUpLeg → RightLeg → RightFoot
  - LeftArm → LeftForeArm → LeftHand
  - RightArm → RightForeArm → RightHand
```

**Prompt for Agent**:
```
Research and document requirements for base 3D character model.

1. Create `docs/ASSET_REQUIREMENTS.md` documenting:
   - Required bone/skeleton structure (Mixamo-compatible)
   - Polygon budget per part (head: 2K, body: 3K, hair: 1K)
   - Texture requirements (diffuse, normal optional)
   - File format (GLB with Draco compression)
   - Licensing requirements for each source option

2. Evaluate these asset sources:
   - Ready Player Me (check if GLB export is usable)
   - Mixamo (free Fuse characters)
   - Open source models (Sketchfab CC0)
   - Cost of commissioning custom model

3. If a suitable free model exists, download and place in:
   webgl-avatar/public/models/base/

4. Document the chosen approach and rationale.

DO NOT create 3D models yourself - focus on sourcing and documentation.
```

---

### Task 5: Head Variants (6 shapes)

**Goal**: Create/source 6 head shape variants

**Dependencies**: Task 4 complete

**Files to Create**:
- `webgl-avatar/public/models/heads/oval.glb`
- `webgl-avatar/public/models/heads/round.glb`
- `webgl-avatar/public/models/heads/square.glb`
- `webgl-avatar/public/models/heads/heart.glb`
- `webgl-avatar/public/models/heads/oblong.glb`
- `webgl-avatar/public/models/heads/diamond.glb`

**Acceptance Criteria**:
- [ ] 6 distinct head shapes
- [ ] All share same UV layout (for texture swapping)
- [ ] All fit same skeleton attachment point
- [ ] <50KB per head model

**Prompt for Agent**:
```
Source or create 6 head shape variants that work with the base skeleton.

1. Review docs/ASSET_REQUIREMENTS.md for specifications

2. For each head shape (oval, round, square, heart, oblong, diamond):
   - Source from asset library OR
   - Document Blender shape key approach if modifying base
   - Ensure UV layout matches for consistent texturing
   - Export as GLB with Draco compression

3. Place files in webgl-avatar/public/models/heads/

4. Create test scene in R3F that swaps between heads

5. Document any issues or limitations found.

If sourcing proves difficult, document a plan for commissioning custom models.
```

---

### Task 6: Hair Assets (10 priority styles)

**Goal**: Source/create 10 most common hair styles

**Dependencies**: Task 4 complete

**Files to Create**:
- `webgl-avatar/public/models/hair/short.glb`
- `webgl-avatar/public/models/hair/medium.glb`
- `webgl-avatar/public/models/hair/long.glb`
- `webgl-avatar/public/models/hair/curly.glb`
- `webgl-avatar/public/models/hair/wavy.glb`
- `webgl-avatar/public/models/hair/ponytail.glb`
- `webgl-avatar/public/models/hair/bun.glb`
- `webgl-avatar/public/models/hair/afro.glb`
- `webgl-avatar/public/models/hair/buzz.glb`
- `webgl-avatar/public/models/hair/bald.glb` (empty/scalp only)

**Acceptance Criteria**:
- [ ] 10 hair styles covering major categories
- [ ] Color-tintable via material color
- [ ] Proper head attachment
- [ ] <30KB per hair model

**Prompt for Agent**:
```
Source 10 priority hair style 3D models.

1. Hair styles needed (in priority order):
   short, medium, long, curly, wavy, ponytail, bun, afro, buzz, bald

2. For each style:
   - Source from asset libraries (Sketchfab, Turbosquid free)
   - Ensure mesh can be color-tinted via material
   - Optimize to <30KB per model
   - Test attachment to head model

3. Place files in webgl-avatar/public/models/hair/

4. Create manifest file listing all hair assets:
   webgl-avatar/public/models/hair/manifest.json

5. Test in R3F scene with head model.

Document sources and any licensing notes.
```

---

### Task 7: Facial Feature Assets

**Goal**: Eyes, noses, mouths, eyebrows, facial hair

**Dependencies**: Task 5 complete

**Files to Create**:
- `webgl-avatar/public/models/eyes/` - 4 eye shapes
- `webgl-avatar/public/models/noses/` - 4 nose shapes
- `webgl-avatar/public/models/mouths/` - 4 expressions
- `webgl-avatar/public/models/eyebrows/` - 4 styles
- `webgl-avatar/public/models/facial-hair/` - 4 types

**Acceptance Criteria**:
- [ ] 4 variants per facial feature category
- [ ] Eyes support color tinting for iris
- [ ] Features align with head UV coordinates
- [ ] <10KB per feature model

**Note**: Facial features can be:
- Separate geometry pieces (most flexible)
- Texture swaps on head model (simpler but less 3D)
- Blend shapes/morph targets (most realistic)

**Prompt for Agent**:
```
Source facial feature 3D assets: eyes, noses, mouths, eyebrows, facial hair.

1. Determine best approach for facial features:
   - Option A: Separate geometry pieces
   - Option B: Blend shapes on head model
   - Option C: Texture swaps
   Document pros/cons and recommend approach.

2. Source 4 variants of each:
   - Eyes: almond, round, monolid, hooded
   - Noses: straight, roman, button, wide
   - Mouths: neutral, smile, slight, serious
   - Eyebrows: natural, arched, thick, thin
   - Facial hair: none, stubble, goatee, beard

3. Ensure eye meshes support iris color tinting

4. Place in webgl-avatar/public/models/[category]/

5. Create manifest.json for each category

6. Test assembly in R3F with head model.
```

---

## PHASE 3: WEBVIEW 3D RENDERER

### Task 8: Asset Loader System

**Goal**: Dynamic GLTF loading with caching

**Dependencies**: Tasks 2, 4-7 complete

**Files to Create/Modify**:
- `webgl-avatar/src/hooks/useAssetLoader.ts`
- `webgl-avatar/src/components/Asset.jsx`
- `webgl-avatar/src/utils/cache.ts`

**Acceptance Criteria**:
- [ ] Load GLTF from URL with progress callback
- [ ] Cache loaded models in memory
- [ ] Preload common assets on init
- [ ] Handle load failures gracefully

**Technical Notes** (from r3f-ultimate-character-configurator):
```jsx
// Asset component pattern
function Asset({ url, skeleton, ...props }) {
  const { scene } = useGLTF(url);
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);

  // Apply shared skeleton
  useEffect(() => {
    clone.traverse((child) => {
      if (child.isSkinnedMesh) {
        child.skeleton = skeleton;
      }
    });
  }, [clone, skeleton]);

  return <primitive object={clone} {...props} />;
}
```

**Prompt for Agent**:
```
Create the asset loading system for the R3F avatar renderer.

1. Create `webgl-avatar/src/hooks/useAssetLoader.ts`:
   - useGLTF wrapper with progress tracking
   - In-memory cache for loaded models
   - Preload function for critical assets
   - Error handling with retry logic

2. Create `webgl-avatar/src/components/Asset.jsx`:
   - Load GLTF model from URL
   - Apply shared skeleton (pattern from r3f-ultimate-character-configurator)
   - Handle loading state with suspense
   - Support material color override

3. Create `webgl-avatar/src/utils/cache.ts`:
   - LRU cache for model data
   - Cache size limits (max 50 models)
   - Clear cache function

4. Test loading multiple assets and swapping them.

Reference: https://github.com/wass08/r3f-ultimate-character-configurator/blob/main/src/components/Avatar.jsx
```

---

### Task 9: Avatar Composer Component

**Goal**: Compose full avatar from config

**Dependencies**: Task 8 complete

**Files to Create**:
- `webgl-avatar/src/components/Avatar.jsx`
- `webgl-avatar/src/hooks/useAvatarConfig.ts`
- `webgl-avatar/src/constants/assetMap.ts`

**Acceptance Criteria**:
- [ ] Renders complete avatar from AvatarConfig
- [ ] Swaps parts when config changes
- [ ] Applies correct colors to skin, hair, eyes
- [ ] Smooth transitions between states

**Technical Notes**:
```jsx
// Avatar.jsx structure
function Avatar({ config }) {
  const { nodes } = useGLTF('/models/base/Armature.glb');

  return (
    <group>
      <Suspense fallback={<LoadingAvatar />}>
        {/* Head */}
        <Asset
          url={getAssetUrl('head', config.faceShape)}
          skeleton={nodes.Armature.skeleton}
          material-color={SKIN_COLORS[config.skinTone]}
        />

        {/* Hair */}
        {config.hairStyle !== 'bald' && (
          <Asset
            url={getAssetUrl('hair', config.hairStyle)}
            skeleton={nodes.Armature.skeleton}
            material-color={HAIR_COLORS[config.hairColor]}
          />
        )}

        {/* Eyes, nose, mouth, etc. */}
      </Suspense>
    </group>
  );
}
```

**Prompt for Agent**:
```
Create the Avatar composer component that assembles all parts.

1. Create `webgl-avatar/src/constants/assetMap.ts`:
   - Map AvatarConfig values to asset URLs
   - Color constants for skin, hair, eyes
   - Default values for missing config

2. Create `webgl-avatar/src/hooks/useAvatarConfig.ts`:
   - Receive config from RN bridge
   - Validate and normalize config
   - Provide derived values (asset URLs, colors)

3. Create `webgl-avatar/src/components/Avatar.jsx`:
   - Load base armature/skeleton
   - Render each customizable part as Asset
   - Apply colors via material overrides
   - Handle missing/loading assets gracefully

4. Test with sample configs to verify correct assembly.

Follow patterns from r3f-ultimate-character-configurator.
```

---

### Task 10: Lighting & Post-Processing

**Goal**: Professional lighting and visual polish

**Dependencies**: Task 9 complete

**Files to Create/Modify**:
- `webgl-avatar/src/components/Experience.jsx`
- `webgl-avatar/src/components/Lighting.jsx`

**Acceptance Criteria**:
- [ ] Three-point lighting (key, fill, rim)
- [ ] Soft shadows enabled
- [ ] Subtle bloom effect on highlights
- [ ] Environment reflection on eyes/skin
- [ ] Consistent look across all avatar combos

**Technical Notes**:
```jsx
// Lighting setup (from r3f-ultimate-character-configurator)
<>
  {/* Key light - main illumination */}
  <directionalLight
    position={[5, 5, 5]}
    intensity={0.8}
    castShadow
    shadow-mapSize={[1024, 1024]}
  />

  {/* Fill light - soften shadows */}
  <directionalLight
    position={[-3, 3, -3]}
    intensity={0.3}
    color="#b9d5ff"
  />

  {/* Rim light - separation from background */}
  <directionalLight
    position={[0, 5, -5]}
    intensity={0.5}
    color="#ffd9b4"
  />

  {/* Ambient for base illumination */}
  <ambientLight intensity={0.4} />

  {/* Environment for reflections */}
  <Environment preset="sunset" />
</>
```

**Prompt for Agent**:
```
Set up professional lighting and post-processing for the avatar scene.

1. Create `webgl-avatar/src/components/Lighting.jsx`:
   - Three-point lighting setup (key, fill, rim)
   - Soft shadows via directionalLight
   - Environment map for subtle reflections
   - Configurable intensity for different moods

2. Update `webgl-avatar/src/components/Experience.jsx`:
   - Add Lighting component
   - Add EffectComposer with subtle Bloom
   - Add soft background gradient
   - Configure camera FOV and position

3. Ensure lighting works well with:
   - All skin tone ranges (light to dark)
   - Different hair colors
   - Various face shapes

4. Optimize for mobile (reduce shadow map size if needed).

Reference r3f-ultimate-character-configurator for setup.
```

---

### Task 11: Camera & Controls

**Goal**: Smooth camera for creator and snapshot modes

**Dependencies**: Task 10 complete

**Files to Create**:
- `webgl-avatar/src/components/CameraManager.jsx`
- `webgl-avatar/src/hooks/useCameraControls.ts`

**Acceptance Criteria**:
- [ ] Portrait framing for face focus
- [ ] Full body framing option
- [ ] Smooth animated transitions between views
- [ ] Disable controls for snapshot mode
- [ ] Zoom limits to prevent clipping

**Technical Notes**:
```jsx
// Camera presets
const CAMERA_PRESETS = {
  portrait: { position: [0, 1.5, 2], target: [0, 1.5, 0] },
  fullBody: { position: [0, 1, 4], target: [0, 1, 0] },
  closeUp: { position: [0, 1.6, 1], target: [0, 1.6, 0] },
};

// Smooth transition
function CameraManager({ preset, interactive }) {
  const { camera } = useThree();

  useEffect(() => {
    const target = CAMERA_PRESETS[preset];
    // Animate camera to new position
    gsap.to(camera.position, {
      ...target.position,
      duration: 0.8,
      ease: 'power2.out',
    });
  }, [preset]);

  return interactive ? <OrbitControls /> : null;
}
```

**Prompt for Agent**:
```
Create camera management for avatar viewing.

1. Create `webgl-avatar/src/components/CameraManager.jsx`:
   - Camera presets: portrait, fullBody, closeUp
   - Smooth animated transitions between presets
   - OrbitControls for interactive mode
   - Disable controls for snapshot mode

2. Create `webgl-avatar/src/hooks/useCameraControls.ts`:
   - setPreset(name) function
   - setInteractive(boolean) function
   - Current camera state

3. Integrate with message bridge:
   - SET_CAMERA message triggers preset change
   - TAKE_SNAPSHOT disables controls, sets preset

4. Add zoom limits to prevent:
   - Zooming inside head geometry
   - Zooming too far out

Test camera transitions are smooth (no jerky movement).
```

---

## PHASE 4: AVATAR CREATOR INTEGRATION

### Task 12: Creator UI Wrapper

**Goal**: Wrap WebView in Avatar Creator screen

**Dependencies**: Task 11 complete

**Files to Modify**:
- `screens/AvatarCreatorScreen.tsx`
- `components/avatar/AvatarCreator/index.tsx`

**Files to Create**:
- `components/avatar3d/Avatar3DCreator.tsx`

**Acceptance Criteria**:
- [ ] 3D preview replaces 2D SVG in creator
- [ ] Category selection updates 3D model
- [ ] Color pickers update materials
- [ ] Performance acceptable on mid-tier devices

**Prompt for Agent**:
```
Integrate the 3D WebView renderer into the Avatar Creator screen.

1. Create `components/avatar3d/Avatar3DCreator.tsx`:
   - Wrap WebGL3DView with creator UI
   - Pass config changes to WebView
   - Show loading state while assets load
   - Handle WebView errors gracefully

2. Update `screens/AvatarCreatorScreen.tsx`:
   - Import Avatar3DCreator
   - Replace 2D preview with 3D preview
   - Keep existing category/option selectors
   - Maintain save/cancel functionality

3. Update `components/avatar/AvatarCreator/index.tsx`:
   - Option to switch between 2D and 3D modes
   - Feature flag for gradual rollout

4. Test the full flow:
   - Open creator
   - Change options (face, hair, colors)
   - Verify 3D updates
   - Save avatar

Maintain backward compatibility with 2D mode as fallback.
```

---

### Task 13: Customization Category UI

**Goal**: Update UI for 3D-optimized categories

**Dependencies**: Task 12 complete

**Files to Modify**:
- `components/avatar/AvatarCreator/CategorySelector.tsx`
- `components/avatar/AvatarCreator/OptionGrid.tsx`

**Acceptance Criteria**:
- [ ] Categories match available 3D assets
- [ ] Thumbnail previews for each option
- [ ] Color picker for applicable categories
- [ ] Locked options for unavailable assets

**Prompt for Agent**:
```
Update the Avatar Creator UI for 3D asset categories.

1. Update `CategorySelector.tsx`:
   - Categories: Face, Hair, Eyes, Nose, Mouth, Eyebrows, Facial Hair, Skin, Body
   - Show asset availability (some assets may not exist yet)
   - Highlight current selection

2. Update `OptionGrid.tsx`:
   - Show 3D thumbnail renders for each option (if available)
   - Fallback to icon/text for missing thumbnails
   - Color swatch for color-based categories
   - Loading state for options

3. Create thumbnail generation script (optional):
   - Render each asset option as small PNG
   - Store in assets/thumbnails/

4. Ensure smooth scrolling and selection performance.
```

---

### Task 14: Real-time Config Sync

**Goal**: Instant updates as user customizes

**Dependencies**: Task 12, 13 complete

**Files to Create/Modify**:
- `components/avatar3d/useConfigSync.ts`
- `stores/avatarStore.ts`

**Acceptance Criteria**:
- [ ] Config changes reflect in 3D within 100ms
- [ ] Debounced updates for rapid changes
- [ ] Optimistic UI (show change immediately)
- [ ] Handle WebView reload gracefully

**Prompt for Agent**:
```
Implement real-time config synchronization between UI and 3D WebView.

1. Create `components/avatar3d/useConfigSync.ts`:
   - Subscribe to Zustand store changes
   - Debounce rapid updates (50ms)
   - Send UPDATE_CONFIG to WebView
   - Track pending updates

2. Update `stores/avatarStore.ts`:
   - Add pending3DUpdate state
   - Add setConfigField action for granular updates
   - Maintain full config for save operation

3. Handle edge cases:
   - WebView not ready yet (queue updates)
   - WebView crashes (reinitialize)
   - Config reset (send full INIT)

4. Test rapid clicking through options - should be smooth.
```

---

## PHASE 5: SNAPSHOT SYSTEM

### Task 15: Snapshot Generation

**Goal**: Generate static PNG from 3D scene

**Dependencies**: Task 11 complete

**Files to Create**:
- `webgl-avatar/src/utils/snapshot.ts`
- `components/avatar3d/useSnapshot.ts`

**Acceptance Criteria**:
- [ ] Generate PNG at specified resolution
- [ ] Transparent background option
- [ ] Consistent framing (portrait/fullBody)
- [ ] Quality setting (draft/final)

**Technical Notes**:
```javascript
// In WebView
function takeSnapshot(options = {}) {
  const { width = 512, height = 512, format = 'png' } = options;

  // Disable controls, set camera
  controls.enabled = false;
  camera.position.set(...PORTRAIT_POSITION);

  // Render to canvas
  renderer.setSize(width, height);
  renderer.render(scene, camera);

  // Get base64
  const base64 = renderer.domElement.toDataURL(`image/${format}`);

  // Send to RN
  sendToRN({ type: 'SNAPSHOT_READY', base64 });
}
```

**Prompt for Agent**:
```
Implement snapshot generation in the 3D WebView.

1. Create `webgl-avatar/src/utils/snapshot.ts`:
   - takeSnapshot(options) function
   - Resize renderer for snapshot resolution
   - Set camera to preset position
   - Render single frame to canvas
   - Export as base64 PNG/JPEG

2. Create `components/avatar3d/useSnapshot.ts`:
   - requestSnapshot(options) function
   - Handle SNAPSHOT_READY message
   - Return Promise<string> with base64

3. Add snapshot handling to message bridge

4. Test snapshot generation:
   - 256x256 for thumbnails
   - 512x512 for posts
   - 1024x1024 for profile

Ensure transparent background works correctly.
```

---

### Task 16: Snapshot Storage Service

**Goal**: Upload and cache snapshots in Supabase

**Dependencies**: Task 15 complete

**Files to Create**:
- `lib/avatar/snapshotService.ts`
- `hooks/useAvatarSnapshot.ts`

**Acceptance Criteria**:
- [ ] Upload snapshot to Supabase Storage
- [ ] Generate unique URL per config hash
- [ ] Cache URLs to avoid re-rendering
- [ ] Cleanup old snapshots periodically

**Technical Notes**:
```typescript
// snapshotService.ts
async function getOrCreateSnapshot(config: AvatarConfig): Promise<string> {
  const hash = hashConfig(config);
  const path = `avatars/${hash}.png`;

  // Check if exists
  const { data: existing } = await supabase.storage
    .from('avatar-snapshots')
    .getPublicUrl(path);

  if (existing) return existing.publicUrl;

  // Generate and upload
  const base64 = await generate3DSnapshot(config);
  const buffer = Buffer.from(base64, 'base64');

  await supabase.storage
    .from('avatar-snapshots')
    .upload(path, buffer, { contentType: 'image/png' });

  return getPublicUrl(path);
}
```

**Prompt for Agent**:
```
Create snapshot storage service for avatar images.

1. Create `lib/avatar/snapshotService.ts`:
   - hashConfig(config) - deterministic hash of avatar config
   - getOrCreateSnapshot(config) - return cached or generate new
   - uploadSnapshot(hash, base64) - upload to Supabase
   - getSnapshotUrl(hash) - get public URL

2. Create `hooks/useAvatarSnapshot.ts`:
   - useAvatarSnapshot(config) hook
   - Returns { url, isLoading, error }
   - Handles generation if not cached

3. Create Supabase storage bucket:
   - Bucket name: avatar-snapshots
   - Public read access
   - RLS for write (authenticated only)

4. Test the full flow:
   - New config → generate → upload → return URL
   - Same config → return cached URL
```

---

### Task 17: Snapshot Display Component

**Goal**: Display snapshots in posts/chat

**Dependencies**: Task 16 complete

**Files to Create/Modify**:
- `components/avatar3d/AvatarSnapshot.tsx`
- Update: `components/PostCard.tsx`
- Update: `components/chat/MessageBubble.tsx`

**Acceptance Criteria**:
- [ ] Display snapshot image from URL
- [ ] Fallback to 2D SVG if snapshot unavailable
- [ ] Loading placeholder while generating
- [ ] Proper sizing for different contexts

**Prompt for Agent**:
```
Create component to display avatar snapshots throughout the app.

1. Create `components/avatar3d/AvatarSnapshot.tsx`:
   - Props: config, size, fallbackTo2D
   - Use useAvatarSnapshot hook
   - Show loading spinner while generating
   - Fallback to 2D AvatarDisplay if snapshot fails

2. Update `components/PostCard.tsx`:
   - Replace AvatarDisplay with AvatarSnapshot
   - Use appropriate size for card context
   - Maintain existing layout

3. Update `components/chat/MessageBubble.tsx`:
   - Use AvatarSnapshot for sender avatar
   - Smaller size for chat context

4. Test in app:
   - Posts show 3D avatar snapshots
   - Chat shows smaller snapshots
   - Fallback works if snapshot fails

Ensure no visual regression from current 2D avatars.
```

---

## PHASE 6: CLEANUP & FINAL INTEGRATION

### Task 18: Remove Legacy 2D Avatar Code

**Goal**: Replace old SVG avatar implementation with 3D system

**Dependencies**: Phase 5 complete

**Files to Modify**:
- `components/avatar/AvatarDisplay/` - Remove or deprecate
- `components/avatar/` - Update exports
- Any remaining 2D avatar references

**Acceptance Criteria**:
- [ ] All avatar displays use 3D snapshots
- [ ] Avatar creator uses 3D WebView preview
- [ ] Old SVG rendering code removed or marked deprecated
- [ ] No visual regressions in app

**Prompt for Agent**:
```
Replace old 2D SVG avatar system with 3D implementation.

1. Update all avatar display usages:
   - Replace AvatarDisplay with AvatarSnapshot
   - Ensure all PostCard, chat, profile views use snapshots
   - Remove any remaining 2D avatar rendering

2. Update AvatarCreator:
   - Use Avatar3DCreator as the only option
   - Remove 2D preview components
   - Ensure save flow generates snapshot

3. Clean up legacy code:
   - Mark old SVG components as deprecated (don't delete yet)
   - Update exports in components/avatar/index.ts
   - Remove unused 2D-specific utilities

4. Test full app flow:
   - Create new avatar
   - View in posts
   - View in chat
   - View on profile

No migration needed - there are no existing avatars to preserve.
```

---

### Task 19: End-to-End Testing

**Goal**: Verify complete 3D avatar system works

**Dependencies**: Task 18 complete

**Files to Create**:
- `__tests__/avatar3d/integration.test.ts` (optional)

**Acceptance Criteria**:
- [ ] Avatar creation flow works end-to-end
- [ ] Snapshots display correctly in all contexts
- [ ] WebView renders without crashes
- [ ] Performance acceptable on target devices

**Prompt for Agent**:
```
Test the complete 3D avatar system end-to-end.

1. Manual testing checklist:
   - [ ] Open avatar creator
   - [ ] Customize all attributes (face, hair, colors, etc.)
   - [ ] Verify 3D preview updates in real-time
   - [ ] Save avatar
   - [ ] Verify snapshot generated and uploaded
   - [ ] Create a post with avatar
   - [ ] View post in feed - avatar displays
   - [ ] Open chat - avatar displays
   - [ ] View profile - avatar displays

2. Edge cases to test:
   - [ ] Poor network - graceful degradation
   - [ ] WebView crash recovery
   - [ ] Large number of avatars in feed
   - [ ] Device rotation during creator

3. Performance validation:
   - [ ] Creator loads in <2s
   - [ ] Snapshot generation <1s
   - [ ] No jank when scrolling posts

4. Document any issues found.

Focus on testing, not code changes.
```

---

### Task 20: Performance Monitoring

**Goal**: Track 3D rendering performance

**Dependencies**: Task 18 complete

**Files to Create**:
- `lib/avatar/performance.ts`
- `components/avatar3d/PerformanceMonitor.tsx`

**Acceptance Criteria**:
- [ ] Track WebView load time
- [ ] Track asset load times
- [ ] Track snapshot generation time
- [ ] Report to analytics
- [ ] Auto-fallback if performance poor

**Prompt for Agent**:
```
Create performance monitoring for 3D avatar system.

1. Create `lib/avatar/performance.ts`:
   - trackMetric(name, value) function
   - Metrics: webviewLoadTime, assetLoadTime, snapshotTime, fps
   - Report to analytics service
   - Threshold detection for auto-fallback

2. Create `components/avatar3d/PerformanceMonitor.tsx`:
   - Invisible component that tracks metrics
   - Sends FPS updates from WebView
   - Triggers fallback if FPS < 20

3. Add performance messages to bridge:
   - PERF_REPORT { fps, memory, loadTime }

4. Set up thresholds:
   - WebView load > 5s → warn
   - FPS < 20 → suggest fallback
   - Memory > 200MB → reduce quality

5. Create dashboard/logging for metrics.
```

---

## Appendix A: Asset Checklist

### Phase 2 Assets Needed

| Category | Count | Status |
|----------|-------|--------|
| Base skeleton | 1 | |
| Head shapes | 6 | |
| Hair styles | 10 | |
| Eye shapes | 4 | |
| Nose shapes | 4 | |
| Mouth expressions | 4 | |
| Eyebrow styles | 4 | |
| Facial hair | 4 | |
| **Total** | **37** | |

### Asset Sources

1. **Ready Player Me** - Check licensing for GLB export
2. **Mixamo/Adobe Fuse** - Free rigged characters
3. **Sketchfab CC0** - Search for compatible assets
4. **TurboSquid Free** - Limited selection
5. **Custom Commission** - $50-200 per model

---

## Appendix B: Fallback Strategy

If 3D proves too complex or slow:

### Enhanced 2D Approach

Instead of full 3D, use **pre-rendered 3D frames**:

1. Render all asset combinations in Blender
2. Export as PNG sprite sheets
3. Composite in app using Image layers
4. Tint colors via image manipulation

**Pros**: Consistent quality, no WebGL needed
**Cons**: Large asset bundle, less dynamic

### Hybrid Approach

1. Use 3D for Avatar Creator (full WebView)
2. Use pre-rendered snapshots everywhere else
3. No real-time 3D in posts/chat

This is essentially what Phase 5 achieves.

---

## Appendix C: r3f-ultimate-character-configurator Patterns

Key patterns to adopt:

### 1. Skeleton Sharing
```jsx
// All assets share one skeleton
<Asset url="/hair.glb" skeleton={nodes.Armature.skeleton} />
```

### 2. Suspense Boundaries
```jsx
<Suspense fallback={<LoadingAvatar />}>
  <Avatar config={config} />
</Suspense>
```

### 3. Asset-Based Customization
```jsx
// Not shader-based, but model-based
customization.hair?.asset?.url && <Asset url={url} />
```

### 4. Material Color Override
```jsx
<mesh material-color={HAIR_COLORS[config.hairColor]} />
```

### 5. Export Pipeline
```jsx
// gltf-transform for optimized GLB export
await optimizeMesh(scene);
await compressDraco(scene);
```

---

## Success Metrics

### Quantitative
- [ ] 3D renders in <2s on iPhone 11 / Pixel 4
- [ ] Snapshot generation <1s
- [ ] WebView crash rate <1%
- [ ] 95% of users prefer 3D over 2D

### Qualitative
- [ ] Users recognize themselves in avatar
- [ ] Professional appearance suitable for app store
- [ ] Consistent style across all combinations
- [ ] Smooth, polished interactions

---

## Getting Started

1. **Start with Task 1** - Prove WebView approach works
2. **Parallel**: Source assets (Tasks 4-7) while building renderer
3. **Checkpoint**: After Task 11, evaluate if approach is viable
4. **Integrate**: Tasks 12-17 connect to existing app
5. **Ship**: Tasks 18-20 enable gradual rollout

Each task is designed for a single Claude agent session. Complete one before starting the next in sequence (except parallel asset sourcing).
