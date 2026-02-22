# Avatar QA Common Issues & Fixes Guide

This document catalogs common visual issues found during QA and their standard fixes.

---

## Issue Categories

### 1. SVG Path Issues

#### 1.1 Path Overflow Outside Clip Path

**Detection:** Visual inspection shows element extending beyond circular avatar boundary.

**Symptoms:**
- Hair, accessories, or other elements visible outside the avatar circle
- Rough edges at circular boundary

**Fix Approach:**
```typescript
// Ensure all paths are within the viewBox (0-100 coordinate system)
// Check path coordinates don't exceed boundaries
// Verify clipPath is properly applied: clipPath="url(#avatarClip)"
```

**Priority:** P1 - High

---

#### 1.2 Missing Stroke or Fill

**Detection:** Elements appear hollow or invisible.

**Symptoms:**
- Outlined shapes with no fill
- Completely invisible elements

**Fix Approach:**
```typescript
// Add missing fill attribute
<Path d="..." fill={color} />

// Or add missing stroke for outlines
<Path d="..." stroke={color} strokeWidth={1} fill="none" />
```

**Priority:** P1 - High

---

#### 1.3 Incorrect Path Coordinates

**Detection:** Elements render in wrong position or wrong shape.

**Symptoms:**
- Features displaced from expected position
- Distorted shapes

**Fix Approach:**
1. Verify path data (d attribute) is correct
2. Check transform origins
3. Validate coordinate system (viewBox is 0-100)

**Priority:** P1 - High

---

### 2. Z-Order / Layer Issues

#### 2.1 Incorrect Layer Ordering

**Detection:** Elements render behind when they should be in front.

**Expected Layer Order (back to front):**
1. Background
2. Hair behind (long hair styles)
3. Clothing/body
4. Face (head, ears, neck)
5. Nose
6. Mouth
7. Eyes
8. Eyebrows
9. Facial hair
10. Hair (top/front)
11. Accessories

**Fix Approach:**
- Reorder component render sequence in Avatar.tsx
- Verify G (group) element ordering

**Priority:** P0 - Critical

---

#### 2.2 Hair Behind Layer Missing

**Detection:** Long hair styles don't show hair behind the body.

**Symptoms:**
- Long hair appears to float in front of body
- No visible hair behind shoulders

**Fix Approach:**
1. Verify hair style is in LONG_HAIR_STYLES set
2. Check HairBehind component renders correctly
3. Ensure HairBehind receives same props as Hair

**Priority:** P2 - Medium

---

### 3. Color Issues

#### 3.1 Color Inheritance Broken

**Detection:** Elements don't inherit expected colors from config.

**Symptoms:**
- Wrong color displayed
- Default/fallback color used instead

**Fix Approach:**
```typescript
// Check prop drilling from Avatar.tsx
// Verify color prop is passed to component
// Check for null/undefined handling

const actualColor = config.hairColor || DEFAULT_HAIR_COLOR;
```

**Priority:** P1 - High

---

#### 3.2 Shadow/Highlight Not Rendering

**Detection:** Skin tones appear flat without depth.

**Symptoms:**
- No shadow areas
- No highlight areas
- Flat appearance

**Fix Approach:**
1. Verify SKIN_TONES includes shadow and highlight properties
2. Check Face component uses shadow/highlight colors
3. Ensure gradient definitions are included

**Priority:** P2 - Medium

---

#### 3.3 Low Contrast

**Detection:** Elements blend together due to similar colors.

**Symptoms:**
- Hair indistinguishable from face
- Features blend together

**Fix Approach:**
1. Add subtle stroke or border between elements
2. Adjust shadow/highlight colors for more contrast
3. Consider adding edge definition

**Priority:** P3 - Low

---

### 4. Proportion Issues

#### 4.1 Feature Clipping at Extreme Proportions

**Detection:** Features cut off at max/min proportion values.

**Symptoms:**
- Eyes clipped at maximum spacing
- Nose/mouth overlap

**Fix Approach:**
1. Add bounds checking to proportion transforms
2. Clamp values to safe ranges
3. Adjust transform calculations

```typescript
const safeSpacing = Math.min(Math.max(proportions.eyeSpacing, -0.8), 0.8);
```

**Priority:** P2 - Medium

---

#### 4.2 Feature Overlap

**Detection:** Features render on top of each other incorrectly.

**Symptoms:**
- Nose overlapping mouth
- Eyebrows inside eyes

**Fix Approach:**
1. Review proportion transform calculations
2. Add minimum spacing constraints
3. Adjust position offsets

**Priority:** P1 - High

---

### 5. Accessory Issues

#### 5.1 Incorrect Positioning

**Detection:** Accessory not aligned with facial features.

**Symptoms:**
- Glasses not centered on eyes
- Earrings not at ear position
- Hat floating above head

**Fix Approach:**
1. Check accessory component positioning logic
2. Verify transform values
3. Ensure coordinates match facial feature positions

**Priority:** P2 - Medium

---

#### 5.2 Size Inconsistency

**Detection:** Accessory too large or too small relative to face.

**Symptoms:**
- Oversized glasses
- Tiny earrings

**Fix Approach:**
1. Review scale transform values
2. Check proportion calculations
3. Adjust base size values

**Priority:** P3 - Low

---

### 6. Hair Style Issues

#### 6.1 Gaps Between Hair and Face

**Detection:** Visible background between hair and face edge.

**Symptoms:**
- Background color visible at hairline
- Disconnected appearance

**Fix Approach:**
1. Extend hair path to overlap face slightly
2. Add edge paths that cover transition
3. Adjust hair component positioning

**Priority:** P2 - Medium

---

#### 6.2 Hair Treatment Not Applied

**Detection:** Hair treatment (ombre, highlights) not visible.

**Symptoms:**
- Single color hair when treatment selected
- No gradient effect

**Fix Approach:**
1. Verify hairTreatment prop passed to Hair component
2. Check treatment rendering logic
3. Ensure gradient definitions included

**Priority:** P2 - Medium

---

### 7. Facial Hair Issues

#### 7.1 Beard/Mustache Obscures Features

**Detection:** Facial hair covers important facial features.

**Symptoms:**
- Mouth completely hidden by beard
- Features unrecognizable

**Fix Approach:**
1. Adjust facial hair opacity for coverage areas
2. Review z-ordering
3. Add cutouts for mouth area if needed

**Priority:** P2 - Medium

---

### 8. Size/Scaling Issues

#### 8.1 Element Doesn't Scale Properly

**Detection:** Element looks wrong at different avatar sizes.

**Symptoms:**
- Stroke widths too thick/thin at different sizes
- Features disproportionate at small sizes

**Fix Approach:**
1. Use relative units instead of absolute
2. Scale stroke widths with size
3. Adjust detail level for size

**Priority:** P2 - Medium

---

## Fix Priority Matrix

| Priority | Criteria | Target Response |
|----------|----------|-----------------|
| P0 - Critical | Crashes render or major corruption | Fix immediately |
| P1 - High | Significant visual issue | Fix within 24h |
| P2 - Medium | Minor visual issue | Fix within 1 week |
| P3 - Low | Enhancement/polish | Backlog |

---

## Standard Fix Workflow

1. **Identify** - Use QA Test Harness to identify the issue
2. **Categorize** - Determine issue category from this guide
3. **Document** - Log the specific variant and issue
4. **Fix** - Apply the appropriate fix approach
5. **Verify** - Re-test the variant in QA harness
6. **Snapshot** - Update snapshot tests if applicable

---

## Prevention Checklist

Before adding new styles/variants:

- [ ] Verify SVG paths are within 0-100 coordinate system
- [ ] Test at all avatar sizes (xs through xxl)
- [ ] Test with multiple skin tones
- [ ] Test with various proportion settings
- [ ] Verify layer ordering is correct
- [ ] Check for color inheritance
- [ ] Test edge cases (max/min proportions)
- [ ] Run automated snapshot tests
