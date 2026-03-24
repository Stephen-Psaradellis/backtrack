---
name: svg-preview
description: Render SVG avatar components to PNG for visual verification
triggers:
  - after editing files in avatar/parts/, avatar/renderers/, avatar/Avatar.tsx, avatar/FullBodyAvatar.tsx
  - before completing any SVG-related task
  - when user asks to preview or verify avatar rendering
---

# SVG Avatar Preview Skill

## When to Use

**Automatically invoke this skill after:**
- Editing any file in `packages/react-native-bitmoji/avatar/parts/`
- Editing any file in `packages/react-native-bitmoji/avatar/renderers/`
- Editing `avatar/Avatar.tsx` or `avatar/FullBodyAvatar.tsx`
- Editing `avatar/types.ts` (enum changes affect rendering)
- Editing `avatar/presets.ts`

**Also use when:**
- The user asks to see what an avatar looks like
- Verifying visual correctness before finishing a task
- Comparing before/after for a visual change

## How to Use

### 1. Render a specific preset
```bash
npx tsx packages/react-native-bitmoji/scripts/render-avatar.ts --preset casual_alex --size 256
```

### 2. Render all presets (batch check)
```bash
npx tsx packages/react-native-bitmoji/scripts/render-avatar.ts --all-presets --size 128
```

### 3. Render a custom config
```bash
npx tsx packages/react-native-bitmoji/scripts/render-avatar.ts --config '{"hairStyle":"mohawk","eyeStyle":"round","skinTone":"#f5d7c3","hairColor":"#ff5722"}'
```

### 4. Render full-body avatar
```bash
npx tsx packages/react-native-bitmoji/scripts/render-avatar.ts --preset casual_alex --full-body
```

### 5. View the result
After rendering, use the **Read tool** to view the PNG:
```
Read tmp/avatar-preview/preview.png
```
Or for batch renders, read individual files:
```
Read tmp/avatar-preview/casual_alex.png
```

## Workflow

1. **Make your SVG edit** (e.g., change eye shape, add hair style)
2. **Run the render script** with a relevant preset
3. **Read the PNG output** to visually verify
4. If something looks wrong, fix and re-render
5. **Render all presets** as a final check before finishing

## Available Presets

- `casual_alex`, `casual_maya`, `casual_jordan`
- `pro_michael`, `pro_sophia`
- `fun_luna`, `fun_kai`, `fun_max`
- `cultural_amara`, `cultural_aisha`
- `sporty_tyler`, `sporty_emma`

## Output Location

All renders go to `packages/react-native-bitmoji/tmp/avatar-preview/`:
- `<name>.svg` — Raw SVG markup
- `<name>.png` — Rasterized PNG
- `preview.png` — Copy of the last single render (convenience)

## Troubleshooting

If rendering fails with module resolution errors:
- Ensure `@resvg/resvg-js` is installed: `npm install -D @resvg/resvg-js`
- Ensure `react-native-web` and `react-native-svg` are in the monorepo root `node_modules`
- The script patches `require` to alias `react-native` → `react-native-web`
