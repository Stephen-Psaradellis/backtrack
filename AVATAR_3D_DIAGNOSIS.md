# Task 1.1: WebGL 3D Preview Loading Failure Diagnosis

## Problem Statement

The 3D avatar preview in the Avatar Creator shows a **red wireframe octahedron** indefinitely instead of loading the actual avatar model.

## Root Cause Identified

**The GLB model files cannot be accessed by the WebView because the HTML is loaded as an inline string, not from a server.**

### Technical Explanation

1. **HTML Loading Method**: The WebView loads HTML from a string (`source={{ html: R3F_BUNDLE_HTML }}` in `WebGL3DView.tsx:467-469`)

2. **Model URL Resolution**: The R3F bundle tries to load avatar models from paths like `/models/bodies/avatar_asian_m.glb` (`avatarRegistry.ts:206`)

3. **No Origin/Base URL**: When loading HTML from a string, the WebView has no origin or base URL to resolve relative paths against

4. **File System Inaccessible**: The GLB files exist in `webgl-avatar/dist/models/bodies/` but:
   - WebView cannot access the local file system
   - There's no HTTP server serving these files
   - The models are NOT embedded in the HTML string

5. **Error Fallback Triggered**: When the GLB fetch fails, the `Avatar` component catches the error and renders `AvatarErrorFallback` - a red wireframe octahedron (`Avatar.jsx:128-137`)

## Loading Flow Analysis

```
PreviewPanel3D.tsx
    └── Avatar3DCreator.tsx (line 247)
        └── WebGL3DView.tsx (line 303)
            └── source={{ html: R3F_BUNDLE_HTML }}
                └── React Three Fiber App.jsx
                    └── Scene → Avatar component (line 390-401)
                        └── CompleteAvatar (line 193-227)
                            └── useGLTF(url) fails to load GLB
                                └── AvatarErrorFallback rendered (red octahedron)
```

## Evidence

### 1. WebView Source Configuration (`WebGL3DView.tsx:307-309`)
```typescript
const webViewSource = mode === 'dev'
  ? { uri: devServerUrl }      // This WOULD work (URL-based)
  : { html: getHtmlSource(mode) };  // This DOESN'T work for external files
```

### 2. Avatar URL Generation (`avatarRegistry.ts:204-206`)
```typescript
if (avatar && avatar.isLocal) {
  // Local avatar - use local path
  return `${LOCAL_BASE_PATH}/${avatar.file}`;  // Returns "/models/bodies/avatar_asian_m.glb"
}
```

### 3. Error Fallback Component (`Avatar.jsx:128-137`)
```jsx
function AvatarErrorFallback({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}>
        <octahedronGeometry args={[0.4]} />
        <meshBasicMaterial color="#ef4444" wireframe />  // RED octahedron
      </mesh>
    </group>
  );
}
```

### 4. Files Do Exist
```
webgl-avatar/dist/models/bodies/
├── avatar_asian_f.glb (1.7 MB)
├── avatar_asian_m.glb (1.8 MB)
├── avatar_black_m.glb (1.9 MB)
├── avatar_hispanic_m.glb (1.9 MB)
├── avatar_mena_f.glb (1.8 MB)
├── avatar_white_f.glb (2.1 MB)
├── default.glb (438 KB)
└── simple.glb (50 KB)
```

## Why Dev Mode Works

In `mode='dev'`, the WebView loads from a URL (`devServerUrl = 'http://localhost:3001'`). The Vite dev server can serve the model files because:
- The WebView has an origin to resolve relative paths
- The dev server serves static files from `webgl-avatar/public/`

## Recommended Fix Approaches

### Option A: Embed Models in HTML Bundle (Not Recommended)
- Embed GLB files as base64 data URLs in the HTML
- **Con**: Would increase bundle size by ~15MB+, making the app much larger

### Option B: Local HTTP Server (Complex)
- Run a local HTTP server in React Native to serve model files
- Use `react-native-static-server` or similar
- **Con**: Adds complexity and potential security concerns

### Option C: CDN-Based Loading (Recommended for Production)
- Host GLB models on a CDN (already partially supported via `CDN_SOURCE`)
- Modify `getAvatarUrl()` to always return CDN URLs
- **Pro**: Works reliably, assets are cached
- **Con**: Requires network connectivity

### Option D: Use Expo Asset System (Recommended for Bundled)
- Load models through Expo's asset system
- Serve from `expo-file-system` with a local URL
- Use `Asset.loadAsync()` to download models to device cache
- Create a local file URL that WebView can access

### Option E: Replace 3D with 2D Fallback (Quickest)
- Use static 2D avatar images instead of 3D
- Generate preview images for each avatar preset
- **Pro**: Simplest, most reliable
- **Con**: Loses 3D interactivity

## Immediate Mitigation

For Task 1.2 and 1.3, implement:
1. **Timeout**: Add a 15-second timeout for 3D loading
2. **Error Handling**: Show user-friendly error message when loading fails
3. **2D Fallback**: Fall back to static avatar images when 3D fails

## Files Requiring Modification

| File | Change |
|------|--------|
| `components/avatar3d/WebGL3DView.tsx` | Modify source loading strategy |
| `webgl-avatar/src/constants/avatarRegistry.ts` | Use CDN URLs for all models |
| `components/avatar/AvatarCreator/PreviewPanel3D.tsx` | Add timeout and fallback logic |

## Console Errors to Expect

When running, the WebView would show errors like:
```
Failed to load resource: net::ERR_FILE_NOT_FOUND /models/bodies/avatar_asian_m.glb
```

Or in React Native logs:
```
[Avatar] Load error: Error loading GLB model
```

## Conclusion

The 3D preview failure is a **fundamental architecture issue**, not a bug. The WebView-based approach cannot load external files when HTML is injected as a string. The fix requires either:
1. Serving models from a URL (CDN or local server)
2. Embedding models in the bundle (large size impact)
3. Falling back to 2D rendering (simplest)

**Recommended**: Implement Option C (CDN) for production with Option E (2D fallback) as the safety net.
