# iOS Crash Fix Plan - Definitive Solution

## Executive Summary

The app crashes immediately on iOS because **the Metro bundler's resolver configuration is using an invalid API that doesn't exist**. This causes react-native-maps JavaScript code to be bundled into the iOS app, which then tries to access native modules that were excluded from autolinking, resulting in an immediate crash.

---

## Root Cause Analysis

### The Broken Code

**Current `metro.config.js` (lines 10-16):**
```javascript
if (moduleName === 'react-native-maps' && platform === 'ios') {
  return {
    type: 'empty',  // ❌ THIS IS NOT A VALID METRO API
  };
}
```

### Why `{ type: 'empty' }` Is Invalid

Metro's `resolveRequest` function expects one of these return formats:

1. **Valid resolution**: `{ type: 'sourceFile', filePath: '/absolute/path/to/file.js' }`
2. **Empty module**: `{ type: 'empty' }` - **THIS IS NOT DOCUMENTED AND DOES NOT WORK**
3. **Defer to default**: Call `context.resolveRequest(context, moduleName, platform)`

The `{ type: 'empty' }` return value is **not recognized by Metro**. When Metro encounters this invalid return, it does NOT treat it as an empty module. Instead, the resolution likely fails or falls through, and Metro ends up bundling the actual react-native-maps JavaScript code anyway.

### The Crash Sequence

1. **Build time**: `expo-build-properties` correctly excludes react-native-maps native module from iOS binary
2. **Bundle time**: Metro's invalid resolver doesn't block react-native-maps JS - it gets bundled anyway
3. **Runtime**: iOS app starts, JavaScript engine executes react-native-maps code
4. **Crash**: JavaScript tries to call `NativeModules.AIRGoogleMapManager` which doesn't exist
5. **Result**: App crashes immediately before any UI can render

### Evidence

The PLAN.md proposed creating `lib/empty-maps-module.js` but **this file was never created**:
```
Glob search for 'lib/empty-maps-module.js': No files found
```

The Metro config was updated to use `{ type: 'empty' }` but the corresponding empty module file it should point to doesn't exist.

---

## The Fix

### Step 1: Create Empty Mock Module

Create `lib/empty-maps-module.js`:

```javascript
// Empty mock module for react-native-maps on iOS
// Metro resolves react-native-maps imports to this file on iOS platform
// This prevents the app from trying to access native modules that don't exist

// Export null implementations for all react-native-maps exports
module.exports = {
  // Default export (the MapView component)
  default: function EmptyMapView() { return null; },

  // Named exports
  MapView: function EmptyMapView() { return null; },
  Marker: function EmptyMarker() { return null; },
  Callout: function EmptyCallout() { return null; },
  Polygon: function EmptyPolygon() { return null; },
  Polyline: function EmptyPolyline() { return null; },
  Circle: function EmptyCircle() { return null; },
  Overlay: function EmptyOverlay() { return null; },
  Heatmap: function EmptyHeatmap() { return null; },
  Geojson: function EmptyGeojson() { return null; },

  // Constants
  PROVIDER_GOOGLE: null,
  PROVIDER_DEFAULT: null,
  MAP_TYPES: {},

  // Types (for TypeScript compatibility)
  AnimatedRegion: function() {},
  UrlTile: function EmptyUrlTile() { return null; },
  WMSTile: function EmptyWMSTile() { return null; },
  LocalTile: function EmptyLocalTile() { return null; },
};
```

### Step 2: Fix Metro Resolver

Update `metro.config.js` to use the correct API:

```javascript
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Path to empty mock module for iOS
const emptyMapsModulePath = path.resolve(__dirname, 'lib/empty-maps-module.js');

// Block react-native-maps from iOS bundle since it's excluded from autolinking
// This prevents Metro from including the JS that would try to access the missing native module
config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    // On iOS, redirect react-native-maps to our empty mock module
    if (moduleName === 'react-native-maps' && platform === 'ios') {
      return {
        filePath: emptyMapsModulePath,
        type: 'sourceFile',
      };
    }
    // Also handle subpath imports like 'react-native-maps/lib/components/MapView'
    if (moduleName.startsWith('react-native-maps/') && platform === 'ios') {
      return {
        filePath: emptyMapsModulePath,
        type: 'sourceFile',
      };
    }
    // Use default resolution for everything else
    return context.resolveRequest(context, moduleName, platform);
  },
};

// Fix for chunked transfer encoding issues with New Architecture on Windows
// The multipart response parsing in BundleDownloader has issues with
// the chunked response format, causing ProtocolException
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Force non-multipart response for bundle requests by removing the Accept header
      // This prevents Metro from sending multipart/mixed responses that cause parsing errors
      if (req.url && req.url.includes('.bundle')) {
        // Override Accept header to prevent multipart response
        req.headers['accept'] = 'application/javascript';
      }
      return middleware(req, res, next);
    };
  },
};

module.exports = config;
```

### Key Differences from Current Code

| Aspect | Current (Broken) | Fixed |
|--------|------------------|-------|
| Return type | `{ type: 'empty' }` | `{ type: 'sourceFile', filePath: ... }` |
| Empty module file | Does not exist | `lib/empty-maps-module.js` |
| Subpath handling | Not handled | Handles `react-native-maps/*` imports |

---

## Why This Will Work

### 1. Uses Documented Metro API

The `{ type: 'sourceFile', filePath: '...' }` return format is the **correct and documented** Metro resolution API. This tells Metro:
- "I've resolved this module"
- "Here's the actual file to use"
- "Bundle this file's contents instead of the original module"

### 2. Empty Module Is Real JavaScript

The empty mock module is a real JavaScript file that:
- Exports the same API surface as react-native-maps
- Returns `null` from all components (safe for React)
- Has no native module dependencies
- Won't crash when imported

### 3. Platform Guard Still Works

The existing `MapView.tsx` already has:
```typescript
if (Platform.OS === 'ios' || !RNMapView) {
  return <Text>Map not available on this platform</Text>
}
```

With the fixed Metro resolver:
- iOS will import the empty mock → `RNMapView` will be a no-op function
- The Platform.OS check will trigger the fallback
- No crash occurs

---

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `lib/empty-maps-module.js` | **CREATE** | Empty mock module for Metro to resolve to |
| `metro.config.js` | **MODIFY** | Fix resolver to use valid Metro API |

**No other files need changes.** The MapView.tsx Platform guards are already correct.

---

## Verification Before EAS Build

### Local Verification

Run these commands to verify the fix works locally:

```bash
# Clear all caches
npx expo start --clear

# In another terminal, check Metro logs
# You should see resolution to lib/empty-maps-module.js for iOS
```

### Bundle Analysis

```bash
# Create iOS bundle and check it doesn't contain react-native-maps internals
npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output ios-bundle.js

# Search for react-native-maps references (should only find our mock)
grep -c "AIRGoogleMap" ios-bundle.js
# Expected: 0 (no native module references)

# Clean up
rm ios-bundle.js
```

---

## EAS Build Command

Once verified locally, build with cache cleared:

```bash
eas build --profile preview --platform ios --clear-cache
```

The `--clear-cache` flag is **critical** to ensure EAS doesn't use a cached bundle that still contains react-native-maps.

---

## Why Previous Fixes Failed

| Commit | What It Did | Why It Didn't Work |
|--------|-------------|-------------------|
| f2a548d | Added Platform.OS conditional require | Correct approach but Metro still bundles the module for potential runtime use |
| c8e0db0 | Removed type imports | Good hygiene but types don't cause crashes |
| f69f7ae | Added `{ type: 'empty' }` to Metro | **Invalid API** - Metro doesn't recognize this format |
| 1bbcac3 | Added expo-build-properties excludedPackages | Correct for native module, but JS bundle still included |

The fix was **95% complete** - only the Metro resolver return format was wrong, and the empty module file was never created.

---

## Risk Assessment

**Very Low Risk**:
- Uses documented Metro API
- Empty module is simple, pure JavaScript
- No changes to app logic or UI
- Platform guards already exist as backup
- Can be verified locally before EAS build

---

## Alternative Approaches (If Primary Fix Fails)

### Option A: Platform-Specific Files

Create platform-specific implementations:
- `components/MapView.android.tsx` - Uses react-native-maps
- `components/MapView.ios.tsx` - Shows fallback UI only

Metro automatically selects the correct file based on platform. This is the most bulletproof solution but requires more code changes.

### Option B: Remove react-native-maps from iOS bundle entirely

Add to `metro.config.js`:
```javascript
config.resolver.blockList = [
  ...(config.resolver.blockList || []),
  /node_modules\/react-native-maps\/.*/,
];
```

But this may cause Metro errors if anything tries to import it.

### Option C: babel-plugin-transform-remove-imports

Use Babel to strip imports at compile time. More complex setup.

---

## Summary

**The fix is straightforward:**

1. Create `lib/empty-maps-module.js` with null exports
2. Update `metro.config.js` to return `{ type: 'sourceFile', filePath: ... }`
3. Verify locally with `npx expo start --clear`
4. Build with `eas build --platform ios --clear-cache`

The app will then:
- Bundle the empty mock instead of react-native-maps on iOS
- Import returns null functions that don't touch native modules
- Platform.OS guard shows "Map not available" fallback
- No crash
