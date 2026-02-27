# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

`react-native-bitmoji` is a self-contained SVG avatar system for React Native. It renders fully customizable Bitmoji-style avatars using `react-native-svg` — no raster assets, no network requests. It's consumed as a local package by the parent Love-Ledger (Backtrack) Expo app.

## Commands

```bash
# Run tests (visual QA suite)
npm test
npm run test:watch
npm run test:coverage

# Render avatar to PNG (headless, uses @resvg/resvg-js)
npm run render-avatar
```

Jest config is at `scripts/qa/jest.config.js`. Tests live in `scripts/qa/__tests__/` and `avatar/qa/__tests__/`.

## Architecture

### Rendering Pipeline

The `Avatar` component (`avatar/Avatar.tsx`) composes SVG parts in strict z-order:

1. Background → 2. HairBehind (long styles) → 3. Clothing → 4. Face → 4.5. FaceDetails → 4.6. Blush → 5. Nose → 5.5. Eye Makeup → 6. Mouth → 6.5. Lipstick → 7. Eyes → 8. Eyebrows → 9. Facial Hair → 9.5. Face Tattoos → 10. Hair (front) → 11. Accessories

All rendering happens inside a 100×100 SVG viewBox clipped to a circle. `FullBodyAvatar` extends this to full-body rendering with legs, arms, shoes.

### Key Directories

- `avatar/types.ts` — All enums (105+ hair styles, 25+ face shapes, etc.), color palettes, `AvatarConfig` interface, defaults
- `avatar/parts/` — Individual SVG part components (Face, Eyes, Hair, Mouth, Nose, Eyebrows, Arms, Legs, etc.)
- `avatar/renderers/` — Composite renderers (ClothingRenderer, AccessoryRenderer, FacialHairRenderer)
- `avatar/editor/` — Editor UI components (CategoryTabs, ColorPicker, OptionGrid, PreviewPanel, ProportionSlider)
- `avatar/hooks/` — `useAvatarEditor` (editor state management), `useFavorites`
- `avatar/expressions/` — Expression presets and ExpressionPicker
- `avatar/stickers/` — Sticker packs (emotions, greetings, celebrations, activities, reactions) with StickerRenderer
- `avatar/storage.ts` — AsyncStorage-based avatar persistence (save/load/favorites)
- `avatar/presets.ts` — Pre-built avatar presets
- `avatar/constants/` — Proportion constants and anchor points
- `avatar/qa/` — QA test harness, integration tests, layer validation
- `screens/` — AvatarEditorScreen, AvatarGalleryScreen, OnboardingScreen, StickerPickerScreen, QATestScreen
- `components/` — ExportableAvatar, PresetPicker, StickerGrid, PreviewThumbnail
- `services/` — export (PNG/share), sharing, stickerHistory, qaTracking

### Data Flow

`AvatarConfig` (plain object with ~50 fields) is the single source of truth. Every part component receives only the enum/color values it needs. `useAvatarEditor` hook manages editor state and provides update functions. `FacialProportions` (-1 to 1 sliders) are converted to SVG transforms in `getProportionTransforms()`.

### Conventions

- All SVG parts use a 100×100 coordinate system
- Part components are pure/memoized — they receive typed props, return SVG elements
- Color palettes are defined as const arrays in `types.ts` (SKIN_TONES, HAIR_COLORS, EYE_COLORS, etc.)
- Enums are extensive (e.g., 105 HairStyle variants across short/medium/long/protective/special/headwear)
- Package entry point is `avatar/index.ts` (barrel export), not `index.ts` (which is the Expo app entry)
- Peer dependencies on react-native-svg, expo, react-navigation — installed by parent app
