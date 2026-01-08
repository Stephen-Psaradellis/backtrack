# Avatar Quality Plan: Context-Optimized Implementation

> **Important**: This plan is designed for sequential execution in separate Claude Code conversations to avoid context overflow. Each task should be started in a FRESH conversation.

---

## Quick Reference

| Task | Status File | Conversation Required |
|------|-------------|----------------------|
| Task 1: Design System | `tasks/TASK_1_STATUS.md` | Fresh |
| Task 2: Colorizer | `tasks/TASK_2_STATUS.md` | Fresh |
| Task 3: Head Assets | `tasks/TASK_3_STATUS.md` | Fresh |
| Task 4: Eye Assets | `tasks/TASK_4_STATUS.md` | Fresh |
| Task 5: Nose Assets | `tasks/TASK_5_STATUS.md` | Fresh |
| Task 6: Mouth Assets | `tasks/TASK_6_STATUS.md` | Fresh |
| Task 7: Hair Assets | `tasks/TASK_7_STATUS.md` | Fresh |
| Task 8: Accessories | `tasks/TASK_8_STATUS.md` | Fresh |
| Task 9: Integration | `tasks/TASK_9_STATUS.md` | Fresh |
| Task 10: QA Validation | `tasks/TASK_10_STATUS.md` | Fresh |

---

## Goal

Transform cartoonish avatars into recognizable, semi-realistic portraits where users can identify themselves and others.

**Current State**: Basic SVG shapes with flat colors
**Target State**: Multi-layer shaded vector art with anatomical accuracy

---

## Task 1: Design System Foundation

**Status File**: `tasks/TASK_1_STATUS.md`
**Files to Modify**:
- `components/avatar/design-system.ts` (exists, enhance)
- `components/avatar/types.ts` (add new types)

**Scope** (DO NOT EXCEED):
1. Define `SKIN_TONES_V2` constant with 20 skin tones including undertone variants (cool/warm/neutral)
2. Define `SHADING_TOKENS` constant for multi-layer shading
3. Add TypeScript types: `SkinToneV2`, `ShadingTokenSet`, `UndertoneType`
4. Document the art direction in code comments

**Acceptance Criteria**:
- [ ] `SKIN_TONES_V2` has 20+ entries with base/shadow/highlight/undertone
- [ ] `SHADING_TOKENS` defines 8 token names
- [ ] Types are exported from `types.ts`
- [ ] No breaking changes to existing code

**Prompt to Use**:
```
Read AVATAR_QUALITY_PLAN.md, Task 1 only. Implement exactly what's specified.
Update tasks/TASK_1_STATUS.md when complete with what was done.
```

---

## Task 2: Enhanced Colorizer

**Status File**: `tasks/TASK_2_STATUS.md`
**Depends On**: Task 1 complete
**Files to Modify**:
- `components/avatar/parts/colorizer.ts`

**Scope** (DO NOT EXCEED):
1. Add `generateSkinShades(baseTone)` function that creates 8 shade variants
2. Add `generateHairShades(baseColor)` function for hair shading
3. Update `colorizeAvatar()` to use new shade tokens
4. Maintain backward compatibility with existing token system

**Acceptance Criteria**:
- [ ] `generateSkinShades` returns object with skin, skinShadow1-3, skinHighlight1-2, skinBlush, skinAO
- [ ] `generateHairShades` returns object with hair, hairShadow1-2, hairHighlight
- [ ] Existing avatars still render correctly
- [ ] Tests pass

**Prompt to Use**:
```
Read AVATAR_QUALITY_PLAN.md, Task 2 only. Check tasks/TASK_1_STATUS.md is complete first.
Implement the colorizer enhancements. Update tasks/TASK_2_STATUS.md when done.
```

---

## Task 3: Head/Face Asset Redesign

**Status File**: `tasks/TASK_3_STATUS.md`
**Depends On**: Tasks 1, 2 complete
**Files to Modify**:
- `components/avatar/parts/assets/heads.ts`

**Scope** (DO NOT EXCEED):
Redesign ONE face shape at a time. This task covers the first 3 faces only:
1. `oval` - Add proper bone structure, jaw definition, temple shading
2. `round` - Add cheek definition, soft jaw, forehead contour
3. `square` - Add strong jaw line, cheekbone prominence

**SVG Requirements Per Face**:
- Use gradient fills with `{{skinBase}}`, `{{skinShadow1}}`, `{{skinHighlight1}}`
- Include: forehead contour, temple shadows, cheekbone hints, jaw shadow, chin highlight
- Keep under 3KB per face SVG
- Test renders correctly before moving to next face

**Acceptance Criteria**:
- [ ] `oval` face has multi-layer shading
- [ ] `round` face has multi-layer shading
- [ ] `square` face has multi-layer shading
- [ ] All 3 faces render correctly in app
- [ ] SVG size under 3KB each

**Prompt to Use**:
```
Read AVATAR_QUALITY_PLAN.md, Task 3 only. Check tasks/TASK_1_STATUS.md and tasks/TASK_2_STATUS.md are complete.
Redesign the oval, round, and square faces ONE AT A TIME. Test each before moving to the next.
Update tasks/TASK_3_STATUS.md when done.
```

---

## Task 4: Eye Asset Redesign

**Status File**: `tasks/TASK_4_STATUS.md`
**Depends On**: Tasks 1, 2 complete
**Files to Modify**:
- `components/avatar/parts/assets/eyes.ts`

**Scope** (DO NOT EXCEED):
Redesign the first 4 eye shapes only:
1. `almond` - Add iris gradient, pupil, waterline, lid crease
2. `round` - Add iris gradient, pupil, waterline, lid crease
3. `monolid` - Add iris gradient, pupil, subtle lid fold
4. `hooded` - Add iris gradient, pupil, heavy lid shadow

**SVG Requirements Per Eye**:
- Sclera with subtle shadow gradient
- Iris with limbal ring (darker outer ring)
- Pupil with light reflection spots
- Waterline hint
- Lid crease shadow
- Keep under 2KB per eye pair SVG

**Acceptance Criteria**:
- [ ] 4 eye shapes have anatomical detail
- [ ] Iris gradient visible
- [ ] Light reflection on pupils
- [ ] All 4 render correctly in app
- [ ] SVG size under 2KB each

**Prompt to Use**:
```
Read AVATAR_QUALITY_PLAN.md, Task 4 only. Redesign almond, round, monolid, and hooded eyes.
Work on ONE eye shape at a time, test, then move to next.
Update tasks/TASK_4_STATUS.md when done.
```

---

## Task 5: Nose Asset Redesign

**Status File**: `tasks/TASK_5_STATUS.md`
**Depends On**: Tasks 1, 2 complete
**Files to Modify**:
- `components/avatar/parts/assets/noses.ts`

**Scope** (DO NOT EXCEED):
Redesign the first 4 nose shapes:
1. `straight` - Add bridge highlight, nostril shadows, tip shadow
2. `curved` - Add curved bridge line, nostril definition
3. `wide` - Add wider nostrils, flatter bridge
4. `pointed` - Add sharp tip, narrow bridge highlight

**SVG Requirements Per Nose**:
- Bridge highlight on light-facing side
- Nostril shadows
- Tip shadow underneath
- Alar (nostril wing) definition
- Keep under 1KB per nose SVG

**Acceptance Criteria**:
- [ ] 4 nose shapes have depth/shadow
- [ ] Nostrils are defined
- [ ] Bridge is visible
- [ ] All 4 render correctly
- [ ] SVG size under 1KB each

**Prompt to Use**:
```
Read AVATAR_QUALITY_PLAN.md, Task 5 only. Redesign straight, curved, wide, and pointed noses.
Update tasks/TASK_5_STATUS.md when done.
```

---

## Task 6: Mouth Asset Redesign

**Status File**: `tasks/TASK_6_STATUS.md`
**Depends On**: Tasks 1, 2 complete
**Files to Modify**:
- `components/avatar/parts/assets/mouths.ts`

**Scope** (DO NOT EXCEED):
Redesign the first 4 mouth expressions:
1. `neutral` - Add upper/lower lip definition, philtrum hint, lip corners
2. `smile` - Add teeth hint, lip stretch, cheek push
3. `slight` - Subtle smile, lip curvature
4. `serious` - Flat expression, lip line definition

**SVG Requirements Per Mouth**:
- Upper lip shape with cupid's bow
- Lower lip with subtle highlight
- Lip line shadow
- Optional philtrum (indent above upper lip)
- Keep under 1.5KB per mouth SVG

**Acceptance Criteria**:
- [ ] 4 mouth shapes have lip definition
- [ ] Cupid's bow visible on upper lip
- [ ] Lower lip has volume
- [ ] All 4 render correctly
- [ ] SVG size under 1.5KB each

**Prompt to Use**:
```
Read AVATAR_QUALITY_PLAN.md, Task 6 only. Redesign neutral, smile, slight, and serious mouths.
Update tasks/TASK_6_STATUS.md when done.
```

---

## Task 7: Hair Asset Enhancement (First Batch)

**Status File**: `tasks/TASK_7_STATUS.md`
**Depends On**: Tasks 1, 2 complete
**Files to Modify**:
- `components/avatar/parts/assets/hair.ts`

**Scope** (DO NOT EXCEED):
Enhance the first 5 hair styles only:
1. `short` - Add strand texture hints, volume shading
2. `medium` - Add layered strands, flow direction
3. `long` - Add strand groups, shine highlights
4. `curly` - Add curl definition, volume depth
5. `wavy` - Add wave pattern, strand separation

**SVG Requirements Per Hair**:
- Multiple layers (back, mid, front)
- Strand hint patterns (subtle lines suggesting texture)
- Volume shading darker at roots
- Highlight on top surfaces
- Keep under 5KB per hair SVG

**Acceptance Criteria**:
- [ ] 5 hair styles have visible texture
- [ ] Volume shading present
- [ ] Strand hints visible
- [ ] All 5 render correctly
- [ ] SVG size under 5KB each

**Prompt to Use**:
```
Read AVATAR_QUALITY_PLAN.md, Task 7 only. Enhance short, medium, long, curly, and wavy hair styles.
Update tasks/TASK_7_STATUS.md when done.
```

---

## Task 8: Accessories Enhancement

**Status File**: `tasks/TASK_8_STATUS.md`
**Depends On**: Tasks 1, 2 complete
**Files to Modify**:
- `components/avatar/parts/assets/accessories.ts`

**Scope** (DO NOT EXCEED):
Enhance first 4 accessory types:
1. `roundGlasses` - Add frame depth, lens reflection, temple arms
2. `squareGlasses` - Add angular frame, lens shading
3. `baseballCap` - Add fabric texture hint, bill shadow
4. `beanie` - Add knit texture hint, fold definition

**Acceptance Criteria**:
- [ ] Glasses have visible frame depth
- [ ] Glasses have subtle lens reflection
- [ ] Headwear has texture hints
- [ ] All 4 render correctly
- [ ] Layer properly with face features

**Prompt to Use**:
```
Read AVATAR_QUALITY_PLAN.md, Task 8 only. Enhance glasses and headwear accessories.
Update tasks/TASK_8_STATUS.md when done.
```

---

## Task 9: Integration Testing

**Status File**: `tasks/TASK_9_STATUS.md`
**Depends On**: Tasks 3-8 complete
**Files to Create/Modify**:
- `scripts/validate-avatar-assets.ts` (create)
- `components/avatar/parts/composer.ts` (if needed)

**Scope** (DO NOT EXCEED):
1. Create validation script that checks SVG size budgets
2. Test 10 random avatar combinations render correctly
3. Verify matching algorithm still works with enhanced avatars
4. Fix any layering/composition issues found

**Acceptance Criteria**:
- [ ] Validation script runs without errors
- [ ] 10 random avatars render correctly
- [ ] Matching algorithm tests pass
- [ ] No visual glitches in layer composition

**Prompt to Use**:
```
Read AVATAR_QUALITY_PLAN.md, Task 9 only. Create validation script and test avatar combinations.
Update tasks/TASK_9_STATUS.md when done.
```

---

## Task 10: Quality Assurance

**Status File**: `tasks/TASK_10_STATUS.md`
**Depends On**: Task 9 complete
**Files to Modify**:
- Various (based on issues found)
- `tasks/ISSUES.md` (create)

**Scope** (DO NOT EXCEED):
1. Review all STATUS files for completion
2. Run the app and visually inspect avatars
3. Document any issues in `tasks/ISSUES.md`
4. Fix critical issues only (cosmetic issues can be deferred)

**Acceptance Criteria**:
- [ ] All STATUS files show completion
- [ ] App runs without avatar errors
- [ ] ISSUES.md documents any remaining work
- [ ] Critical issues fixed

**Prompt to Use**:
```
Read AVATAR_QUALITY_PLAN.md, Task 10 only. Review all task status files, run the app,
document issues. Update tasks/TASK_10_STATUS.md when done.
```

---

## How to Execute This Plan

### Step 1: Create Task Directory
```bash
mkdir tasks
```

### Step 2: Execute Tasks Sequentially
For each task, start a **new Claude Code conversation** with:
```
Read AVATAR_QUALITY_PLAN.md, Task N only. [task-specific instructions]
Update tasks/TASK_N_STATUS.md when done.
```

### Step 3: Check Status Before Starting Next Task
Before starting Task N+1, verify Task N's status file shows completion.

### Step 4: Handle Failures
If a task fails or is incomplete:
1. Note what was completed in the status file
2. Note what remains in the status file
3. Start fresh conversation to continue

---

## File Structure When Complete

```
tasks/
├── TASK_1_STATUS.md   # Design system status
├── TASK_2_STATUS.md   # Colorizer status
├── TASK_3_STATUS.md   # Heads status
├── TASK_4_STATUS.md   # Eyes status
├── TASK_5_STATUS.md   # Noses status
├── TASK_6_STATUS.md   # Mouths status
├── TASK_7_STATUS.md   # Hair status
├── TASK_8_STATUS.md   # Accessories status
├── TASK_9_STATUS.md   # Integration status
├── TASK_10_STATUS.md  # QA status
└── ISSUES.md          # Remaining issues
```

---

## Notes for Claude Code Agents

1. **DO NOT** try to complete multiple tasks in one conversation
2. **DO NOT** read all asset files at once - work on one at a time
3. **DO** test each change renders correctly before moving on
4. **DO** keep status files updated with what was actually done
5. **DO** note blockers or issues immediately in status files
6. **STAY FOCUSED** on the specific scope - do not expand
