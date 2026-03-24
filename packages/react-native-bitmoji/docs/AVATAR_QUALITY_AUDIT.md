# Avatar Quality Audit Report

**Date**: 2026-02-26
**Rendered**: All 12 presets at 512px via SSR pipeline
**Target Quality**: Bitmoji-level (warm, rounded, polished cartoon style)

---

## CRITICAL Issues (Avatar Doesn't Look Human)

### C1. Long/Volume Hair Completely Obscures Face
**Affected**: casual_maya (LONG_WAVY), casual_jordan (AFRO), cultural_aisha (HIJAB)
**Severity**: Renders are unusable — face is 100% hidden behind hair/headwear
**Root Cause**: Hair paths in Hair.tsx and HairBehind are sized to fill the entire 100x100 viewBox. The "behind" layer covers the face area, and the "front" layer adds even more coverage. No clipping or sizing constraints relative to the head ellipse.
**Fix**: All hair paths must be authored relative to the face ellipse (cx=50, cy=46, rx~24, ry~30). Hair should frame the face, never cover it. HairBehind should only extend behind/below the head, never overlap the face zone (roughly y=20 to y=75, x=26 to x=74).

### C2. Hijab Renders as Solid Blob
**Affected**: cultural_aisha
**Severity**: No face visible at all — just a purple dome shape
**Root Cause**: The hijab path covers the entire head with no face cutout/window.
**Fix**: Hijab should wrap around the head perimeter with a face-opening oval matching the face shape.

### C3. Mohawk Hair is a Giant Rectangle
**Affected**: fun_max (SHORT_MOHAWK)
**Severity**: Hair looks like a tall orange rectangle plastered on the forehead, not a mohawk
**Root Cause**: Mohawk path is a simple Rect with no tapering, no spiky texture
**Fix**: Replace with tapered, spiky path that rises from the center of the head

### C4. fun_max Has One Eye Closed, One Open (Wink) — Eyes Wildly Asymmetric
**Affected**: fun_max (WINK eye style)
**Severity**: The open eye is huge and off-center, closed eye is tiny. Face looks deranged.
**Root Cause**: Wink eye positioning doesn't match — the open eye is too large and positioned oddly.
**Fix**: Both eyes need to be anchored at the same position; wink should just close one lid smoothly.

---

## MAJOR Issues (Looks Amateur/Broken)

### M1. Ears Protrude Excessively on Every Avatar
**Affected**: ALL presets
**Severity**: Ears stick out ~10-15 units past the face edge, looking like satellite dishes
**Root Cause**: In Face.tsx, ears are at `cx ± rx ± 2` with ear radius ~6-8. This puts them far outside the face.
**Fix**: Ears should be tucked closer — overlap slightly with the face edge (at `cx ± rx - 2`) and be smaller (radius ~4-5). Bitmoji ears are subtle, almost hidden by hair.

### M2. Neck is a Flat Rectangle
**Affected**: ALL presets
**Severity**: Neck looks like a column/pillar, not organic
**Root Cause**: Neck rendered as simple Rect from y=70 to y=92
**Fix**: Use a tapered trapezoid or slight hourglass shape. Add skin-tone gradient continuity with face.

### M3. Face Looks Flat Despite Gradients
**Affected**: ALL presets
**Severity**: Faces lack the warm, rounded, 3D feel of Bitmoji
**Root Cause**: Radial gradient on face is too subtle. No strong cheek warmth, no chin shadow, no forehead highlight. The gradient center is at face center rather than offset upward for natural light.
**Fix**: Offset radial gradient center up and slightly left (simulating top-left lighting). Add warm cheek color spots. Add subtle chin/jaw shadow. Increase gradient contrast.

### M4. Forehead is Too Tall / Hairline Too High
**Affected**: ALL short-hair presets (pro_michael, sporty_tyler, casual_alex)
**Severity**: Massive forehead visible between hairline and eyebrows
**Root Cause**: Short hair paths start too high on the head, leaving a huge forehead gap
**Fix**: Lower the hairline for short styles. Hair should start at roughly y=18-22 and curve down toward eyebrows.

### M5. Clothing Renders as Flat Rectangles
**Affected**: pro_sophia (blazer appears as dark rectangle blocks), fun_kai (plain green rectangle)
**Severity**: Clothing has no shape — just flat colored rectangles at the bottom
**Root Cause**: ClothingRenderer uses basic rectangular shapes without shoulder curves or collar detail
**Fix**: Clothing needs curved shoulder lines, proper neckline shapes (V-neck, crew, collar), and subtle shading.

### M6. Hair Behind Layer Shows as Black Rectangles
**Affected**: pro_sophia, cultural_amara, sporty_emma
**Severity**: Long hair behind renders as sharp-cornered black rectangles flanking the neck
**Root Cause**: HairBehind paths use Rect elements instead of flowing curved paths
**Fix**: Use curved bezier paths that flow naturally from the head downward.

### M7. Glasses (Round) Are Too Thick and Boxy
**Affected**: pro_sophia
**Severity**: Glasses frames are extremely thick lines with visible sharp corners on temples
**Root Cause**: Frame stroke-width too large, temple arms rendered as rectangles
**Fix**: Reduce frame stroke-width, use curved temple arms, add subtle shadow under frames.

### M8. Headphones Cover Ears Entirely
**Affected**: fun_kai
**Severity**: Headphones are solid black circles that completely cover the ear area
**Root Cause**: Headphone pads are too large (radius too big) and fully opaque
**Fix**: Size headphone pads proportionally to ears. Add detail (speaker mesh, padding ring).

### M9. Eyes Are Too Large Relative to Face
**Affected**: ALL presets
**Severity**: Eyes dominate the face, giving a "bug-eyed" look rather than Bitmoji's balanced proportions
**Root Cause**: `EYE_RADIUS=5` in a 100-unit viewbox with face rx~24 means eyes take up ~42% of face width
**Fix**: Reduce eye radius to ~3.5-4. Bitmoji eyes are roughly 25-30% of face width.

### M10. Cheek Highlights Are Visible Circles
**Affected**: ALL presets
**Severity**: Cheeks show as distinct lighter circles rather than subtle warm blush
**Root Cause**: Cheek highlight overlays have too high opacity and sharp boundaries
**Fix**: Use larger, softer radial gradients with lower opacity for cheek warmth.

---

## MINOR Issues (Polish Items)

### m1. No Earlobe Detail
Ears are plain circles with no lobe or inner ear detail.

### m2. Eyebrow Hair Strokes Look Mechanical
HairStrokes pattern is evenly spaced, giving a comb-like appearance rather than natural brow texture.

### m3. Teeth Are Flat White Blocks
Open-mouth smiles show teeth as a single white rectangle with simple divider lines.

### m4. No Lip Definition on Closed Mouths
Closed-mouth styles (SMILE, SLIGHT_SMILE) lack cupid's bow or lip gradient distinction.

### m5. Nose Bridge Line Visible as Harsh Vertical Stroke
Several nose styles show a visible dark line down the nose bridge.

### m6. Hair Gradient Transitions Are Abrupt
Hair shading goes from light to dark with no smooth intermediate tones.

### m7. Background Circle Has No Subtle Shadow/Depth
The avatar circle is flat with no drop shadow or inner glow — looks pasted on.

### m8. Crown Accessory Is Crude Zigzag
fun_kai's crown is simple blue triangles with no detail or beveling.

---

## Priority-Ordered Fix Plan

### Phase 2: Establish Coordinate System & Conventions
1. **Define canonical anchor points** document: face center, eye line, mouth line, hairline, ear positions, neck-to-shoulder transition
2. **Fix ear positioning** (M1) — tuck ears, reduce size
3. **Fix neck shape** (M2) — tapered, organic
4. **Improve face shading** (M3) — offset gradient, cheek warmth, chin shadow

### Phase 3: Component-by-Component (order matters)

| Priority | Component | Issues | Est. Complexity |
|----------|-----------|--------|-----------------|
| 1 | **Face/Head** | M1 ears, M2 neck, M3 flat, M4 forehead, M10 cheeks | HIGH |
| 2 | **Eyes** | M9 too large, C4 wink broken | MEDIUM |
| 3 | **Hair** | C1 covers face, C3 mohawk, M4 hairline, M6 rectangles | HIGH |
| 4 | **Mouth/Nose** | m3 teeth, m4 lips, m5 nose bridge | LOW-MEDIUM |
| 5 | **Eyebrows** | m2 mechanical strokes | LOW |
| 6 | **Clothing** | M5 flat rectangles | MEDIUM |
| 7 | **Accessories** | C2 hijab, M7 glasses, M8 headphones, m8 crown | MEDIUM |

### Phase 4: Polish
1. Add consistent top-left lighting model across all components
2. Refine gradient smoothness (m6)
3. Add subtle background shadow (m7)
4. Test all 12 presets + 4 custom edge-case configs
5. Test full-body rendering

---

## Render Summary Table

| Preset | Usable? | Key Issues |
|--------|---------|------------|
| casual_alex | Partial | Huge ears, flat face, jagged hair texture |
| casual_maya | **NO** | Face 100% hidden by LONG_WAVY hair |
| casual_jordan | **NO** | Face 100% hidden by AFRO hair |
| pro_michael | Partial | Huge ears, flat face, high forehead |
| pro_sophia | Partial | Rectangle hair-behind, thick glasses, huge ears |
| fun_luna | Best | Pink hair visible, face visible, but ears/eyes oversized |
| fun_kai | Partial | Crude crown, headphones cover ears, huge forehead |
| fun_max | **NO** | Rectangle mohawk, deranged wink, ugly overall |
| cultural_amara | Partial | Rectangle hair-behind, big ears |
| cultural_aisha | **NO** | Hijab is solid purple blob, no face visible |
| sporty_tyler | Partial | Big ears, big forehead, flat face |
| sporty_emma | Partial | Rectangle hair-behind, cap looks flat |

**4 of 12 presets (33%) are completely unusable. 0 of 12 meet Bitmoji quality bar.**
