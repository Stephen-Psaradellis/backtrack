# iOS App Hang Debugging Context

This document contains all context needed to continue debugging the iOS app hang issue. Pass this to a new Claude agent to continue.

---

## CRITICAL: Build Cost Constraints

**DO NOT run unnecessary EAS builds.** We've already used 20+ builds debugging this issue and are near our Expo usage limit.

### Build Strategy (in order of preference):

1. **Zero-build solutions** - Code analysis, renaming files, checking configs
2. **EAS Update** - JS-only changes pushed to existing native build (~30 sec, FREE/cheap)
3. **Local development** - `npx expo start` for quick iteration (no build cost)
4. **Full EAS build** - LAST RESORT, only after confirming fix via other methods

### To use EAS Update (instead of full builds):
```bash
# Use the last working build as base, push JS changes only:
eas update --branch preview --message "test: rename MapView"
```

This requires NO new native build and tests JS changes instantly.

---

## Problem Summary

The iOS app hangs on the "Loading..." screen (auth initialization never completes) when importing from certain files in the `components/` directory. The app does NOT crash - it just hangs indefinitely.

---

## Key Test Results

| Test | Import Path | Result |
|------|-------------|--------|
| Placeholder HomeScreen (no imports) | N/A | ✅ WORKS |
| TestMapView from root | `./TestMapView` | ✅ WORKS |
| TestComponent from components/ | `./components/TestComponent` | ✅ WORKS |
| MapView from components/ | `./components/MapView` | ❌ HANGS |
| Super minimal MapView.tsx (only React+RN) | `./components/MapView` | ❌ HANGS |
| Single MapView.tsx (no platform files) | `./components/MapView` | ❌ HANGS |

**Critical Finding:** The issue is SPECIFIC to files named "MapView" in the components directory. Other files in components/ work fine.

---

## Current File State

```
components/
├── MapView.tsx                 # Super minimal (only React + View/Text/StyleSheet)
├── MapView.android.tsx.bak     # Backed up original Android version
├── TestComponent.tsx           # Test file that WORKS
├── index.ts                    # Barrel export (exports MapView)
└── ... other components

root/
├── TestMapView.tsx             # Test file that WORKS (identical content to MapView.tsx)
```

---

## What We've Ruled Out

1. **File content** - MapView.tsx is super minimal (only React + basic RN imports). Same content as TestMapView.tsx which works.

2. **Platform-specific files** - Removed .ios.tsx and .android.tsx, using single MapView.tsx. Still hangs.

3. **react-native-maps native module** - Added autolinking exclusion in app.json. Native module not compiled into iOS binary.

4. **Barrel export (components/index.ts)** - Direct imports like `./components/MapView` should NOT trigger the barrel. TestComponent in same directory works.

5. **components/ directory itself** - TestComponent.tsx in components/ works fine.

---

## Root Cause Hypothesis

The issue appears to be **Metro bundler caching or resolution specifically for "MapView"**. Possible causes:

1. **Metro cache** - Old MapView files (with react-native-maps imports) may be cached
2. **Name collision** - "MapView" might conflict with react-native-maps internal naming
3. **Fingerprint/hash collision** - EAS might be reusing old bundles based on filename

---

## App.json Autolinking Config

```json
{
  "expo": {
    "autolinking": {
      "ios": {
        "exclude": ["react-native-maps"]
      }
    },
    ...
  }
}
```

---

## Current App.tsx State

The app is currently configured to test TestComponent (which works). To test MapView, change:

```tsx
// Current (working):
import { TestComponent } from './components/TestComponent'

// Test MapView (hangs):
import { MapView } from './components/MapView'
```

---

## Debugging Plan (Prioritized by Build Cost)

### Phase 1: Zero-Build Fix (TRY THIS FIRST)

The most likely fix based on our findings - **rename MapView to avoid name collision**:

```bash
# 1. Rename the file
cd components
mv MapView.tsx AppMap.tsx
rm MapView.android.tsx.bak  # Remove backup that might confuse Metro

# 2. Update the barrel export in components/index.ts
# Change: export { MapView, ... } from './MapView'
# To:     export { AppMap as MapView, ... } from './AppMap'

# 3. Update App.tsx to use real HomeScreen (which imports MapView)
# The barrel re-export means HomeScreen doesn't need changes
```

Then test with **EAS Update** (not a full build):
```bash
eas update --branch preview --message "fix: rename MapView to AppMap"
```

### Phase 2: Verify with EAS Update

Use the working build `74850297-d84d-43c1-a4b0-b54c4ca1e107` as base:

1. Make JS-only changes (rename files, update imports)
2. Push via `eas update --branch preview`
3. Test on device (~30 seconds, no build cost)
4. Iterate quickly until fixed

### Phase 3: Local Development Testing

If EAS Update doesn't work for some reason:

```bash
# Start local dev server
npx expo start --clear

# Connect via Expo Go or dev client
# Test changes instantly without any builds
```

Note: Issue may not reproduce in dev mode, but worth trying for fast iteration.

### Phase 4: Full Build (LAST RESORT)

Only after confirming fix works via EAS Update:

```bash
# Clean up all MapView-related files first
rm components/MapView.android.tsx.bak

# Single final build with cache clear
eas build --profile preview --platform ios --clear-cache --non-interactive
```

### Phase 5: Nuclear Option (If All Else Fails)

Remove react-native-maps from the project entirely:

```bash
# Remove from package.json
npm uninstall react-native-maps

# Update package-lock
npm install

# Now full rebuild is required, but should definitely fix the issue
eas build --profile preview --platform ios --clear-cache
```

---

## Files to Read

- `components/MapView.tsx` - Current minimal placeholder
- `components/index.ts` - Barrel export (lines 42-57 export MapView)
- `App.tsx` - Current test configuration
- `contexts/AuthContext.tsx` - Where the hang occurs (isLoading stays true)
- `app.json` - Has autolinking exclusion config

---

## Commands

```bash
# EAS Update (fast, JS-only):
eas update --branch preview --message "test X"

# Full rebuild with cache clear:
eas build --profile preview --platform ios --clear-cache --non-interactive

# Check build status:
eas build:list --platform ios --limit 1
```

---

## Next Immediate Step (NO FULL BUILD REQUIRED)

**Rename MapView.tsx and test via EAS Update:**

```bash
# 1. Rename the file
mv components/MapView.tsx components/AppMap.tsx
rm components/MapView.android.tsx.bak

# 2. Update components/index.ts barrel export (lines 42-57):
#    Change: export { MapView, ... } from './MapView'
#    To:     export { AppMap as MapView, ... } from './AppMap'
#    This re-exports AppMap as MapView so existing imports still work

# 3. Restore real HomeScreen import in App.tsx:
#    import { HomeScreen } from './screens/HomeScreen'

# 4. Test with EAS Update (NOT a full build):
eas update --branch preview --message "fix: rename MapView to AppMap"
```

**Expected result:** If naming is the issue, the app will work. HomeScreen imports `MapView` from the barrel, which now points to `AppMap.tsx`.

**If EAS Update fails:** You may need ONE final build, but try the update first.

---

## Contact/Build Info

- EAS Project: @spsaradellis/backtrack
- Bundle ID: app.backtrack.social
- Last working build (TestComponent): `74850297-d84d-43c1-a4b0-b54c4ca1e107`
- Platform: iOS (internal distribution/preview profile)
