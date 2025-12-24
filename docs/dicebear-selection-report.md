# DiceBear Selection Report

**Date**: 2025-12-24
**Decision**: Replace `avataaars` (v2.0.0) with `@dicebear/core` + `@dicebear/collection` (v9.0.0)

---

## Executive Summary

After evaluating options for replacing the unmaintained `avataaars` library, **DiceBear** was selected as the optimal replacement. The key factors driving this decision were:

1. **Native avataaars style support** - DiceBear includes the exact same avataaars visual style
2. **Active maintenance** - Regular updates with v9.x being the latest major version
3. **Zero breaking changes** - All 12 avatar attributes and 100+ option values remain compatible
4. **Better architecture** - Modern function-based API vs. legacy component-based approach

---

## Problem Statement

The application uses the `avataaars` npm package (v2.0.0) for:
- User profile avatars (stored as JSONB in database)
- "Person of Interest" target avatars for matching
- Real-time avatar builder UI with 12 customizable attributes

### Why Replace avataaars?

| Issue | Impact |
|-------|--------|
| **Unmaintained** | Last meaningful update was years ago; no bug fixes or security patches |
| **Legacy React patterns** | Uses class components and outdated React lifecycle methods |
| **No TypeScript** | Requires manual type declarations, no official types |
| **React 18+ compatibility** | Growing incompatibilities with modern React |
| **npm audit warnings** | Potential transitive dependency vulnerabilities |

---

## Alternatives Evaluated

### 1. DiceBear (@dicebear/core + @dicebear/collection) ✅ SELECTED

| Criteria | Assessment |
|----------|------------|
| **Avataaars compatibility** | ✅ Includes `avataaars` as one of 30+ built-in styles |
| **Attribute value compatibility** | ✅ 100% compatible - same PascalCase naming |
| **Active maintenance** | ✅ v9.x released in 2024, regular updates |
| **TypeScript support** | ✅ First-class TypeScript with full type definitions |
| **License** | ✅ MIT license (core), avataaars style is free for commercial use |
| **Bundle size** | ✅ Tree-shakeable - only import styles you use |
| **Cross-platform** | ✅ Works in browser, Node.js, React Native |
| **Output formats** | ✅ SVG, Data URI, PNG, JPG, WebP, AVIF |

**Benchmark Score (Context7)**: 85.9/100

### 2. react-nice-avatar

| Criteria | Assessment |
|----------|------------|
| **Avataaars compatibility** | ❌ Different art style entirely |
| **Database migration** | ❌ Would require migrating all stored configs |
| **Attribute mapping** | ❌ Different attributes, not 1:1 compatible |

**Verdict**: Rejected - would break backward compatibility

### 3. boring-avatars

| Criteria | Assessment |
|----------|------------|
| **Avataaars compatibility** | ❌ Abstract geometric shapes, not character avatars |
| **Customization** | ❌ Limited to 5 colors, no facial features |
| **Use case** | ❌ Designed for simple identicons, not detailed characters |

**Verdict**: Rejected - wrong use case entirely

### 4. Avataar (react-avataaars fork)

| Criteria | Assessment |
|----------|------------|
| **Avataaars compatibility** | ✅ Same visual style |
| **Maintenance status** | ⚠️ Community fork with uncertain maintenance |
| **TypeScript** | ❌ No official types |
| **Architecture** | ❌ Same legacy component pattern as original |

**Verdict**: Rejected - doesn't solve core maintenance issues

### 5. Custom implementation (SVG generation)

| Criteria | Assessment |
|----------|------------|
| **Avataaars compatibility** | ⚠️ Would need to replicate all 100+ SVG assets |
| **Development effort** | ❌ Significant development time (weeks) |
| **Maintenance burden** | ❌ Our team owns all maintenance |
| **Risk** | ❌ Visual inconsistencies likely |

**Verdict**: Rejected - high effort, high risk

---

## Why DiceBear is the Best Choice

### 1. Perfect Backward Compatibility

DiceBear's `avataaars` style uses **identical attribute values** to the original library:

```typescript
// Old avataaars values:
topType: 'LongHairBob' | 'ShortHairShortFlat' | ...
skinColor: 'Tanned' | 'Pale' | 'Light' | 'Brown' | 'DarkBrown' | ...
eyeType: 'Default' | 'Happy' | 'Wink' | ...

// DiceBear avataaars values:
top: 'LongHairBob' | 'ShortHairShortFlat' | ... // ✅ Same values
skinColor: 'Tanned' | 'Pale' | 'Light' | 'Brown' | 'DarkBrown' | ... // ✅ Same values
eyes: 'Default' | 'Happy' | 'Wink' | ... // ✅ Same values
```

The only changes are property names (e.g., `topType` → `top`), which we handle in a thin adapter layer:

```typescript
// lib/avatar/dicebear.ts - Simple property mapping
const PROP_NAME_MAP = {
  topType: 'top',
  accessoriesType: 'accessories',
  facialHairType: 'facialHair',
  clotheType: 'clothing',
  // ... etc
}
```

### 2. Zero Database Migration Required

All existing avatar configurations stored in the database work without any modification:

```json
// Existing database record (unchanged)
{
  "topType": "LongHairBob",
  "hairColor": "Brown",
  "skinColor": "Light",
  "eyeType": "Default",
  // ... all 12 attributes
}
```

The adapter layer converts these on-the-fly to DiceBear format.

### 3. Modern Architecture

| Aspect | Old (avataaars) | New (DiceBear) |
|--------|-----------------|----------------|
| API style | React component with 12+ props | Pure function returning SVG |
| React version | Legacy patterns | Modern, works with React 18+ |
| TypeScript | No official support | Full TypeScript with types |
| Output | Rendered JSX only | SVG string, Data URI, or parsed JSON |
| Memoization | Component-level | Function output can be memoized |

### 4. Actively Maintained

- **Version history**: 5.x → 6.x → 7.x → 8.x → 9.x showing steady progression
- **Documentation**: Comprehensive docs at dicebear.com
- **Community**: Active GitHub issues/PRs, responsive maintainers
- **CDN support**: Free HTTP API available for prototyping

### 5. Superior Flexibility

DiceBear provides multiple output options:

```typescript
import { createAvatar } from '@dicebear/core'
import { avataaars } from '@dicebear/collection'

const avatar = createAvatar(avataaars, config)

// Web: Use as image source
<img src={avatar.toDataUri()} />

// React Native: Use SVG string with react-native-svg
<SvgXml xml={avatar.toString()} />

// Export to PNG if needed
const png = await avatar.toPng()
```

### 6. Appropriate License

- **@dicebear/core**: MIT License
- **avataaars style**: Free for personal and commercial use
- No attribution required for the avataaars style

---

## Migration Impact Assessment

### Code Changes Required

| Component | Change Type | Complexity |
|-----------|-------------|------------|
| `lib/avatar/dicebear.ts` | New file | Simple adapter layer |
| `components/AvatarPreview.tsx` | Modified | Use `createAvatarDataUri()` |
| `components/AvatarBuilder.tsx` | Modified | Update preview generation |
| `types/avatar.ts` | Unchanged | ✅ No changes needed |
| `lib/matching.ts` | Unchanged | ✅ Matching algorithm untouched |

### What Stayed the Same

- **AvatarConfig interface** - Unchanged
- **AVATAR_OPTIONS arrays** - Unchanged
- **DEFAULT_AVATAR_CONFIG** - Unchanged
- **Matching algorithm weights** - Unchanged
- **Database schema** - Unchanged
- **All 12 avatar attributes** - Unchanged
- **All 100+ option values** - Unchanged

### Bundle Size Impact

```
Before: avataaars ~150KB (includes all SVG assets)
After:  @dicebear/core ~15KB + avataaars style ~130KB
        Total: ~145KB (comparable, with tree-shaking benefits)
```

---

## Implementation Summary

The implementation was completed with:

1. **Dependency changes**: Removed `avataaars`, added `@dicebear/core` + `@dicebear/collection`
2. **New adapter module**: `lib/avatar/dicebear.ts` with conversion functions
3. **Component updates**: 5 avatar components updated to use DiceBear
4. **Test updates**: Jest mocks updated for new library

### Key Functions Added

```typescript
// Convert stored config to DiceBear format
convertToDiceBearOptions(config: AvatarConfig): DiceBearOptions

// Create avatar for web (img src)
createAvatarDataUri(config: AvatarConfig): string

// Create avatar for React Native
createAvatarSvg(config: AvatarConfig): string
```

---

## Conclusion

DiceBear is the clear winner for replacing avataaars because:

1. **It's the only option that maintains 100% backward compatibility** with existing database configs and UI behavior
2. **It's actively maintained** with a clear roadmap and regular releases
3. **It provides better TypeScript support** and modern JavaScript patterns
4. **The migration is minimal** - a thin adapter layer handles all conversion
5. **It reduces technical debt** by moving to a well-maintained library

The decision minimizes risk while resolving all concerns about the unmaintained avataaars dependency.

---

## References

- DiceBear Documentation: https://dicebear.com
- DiceBear GitHub: https://github.com/dicebear/dicebear
- Avataaars style reference: https://dicebear.com/styles/avataaars
- Context7 Library Analysis: Score 85.9/100, High Source Reputation
