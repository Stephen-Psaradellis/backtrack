# 3D Avatar Asset Requirements

> Specification document for the Avatar 3D Upgrade (Phase 2: Asset Pipeline)

---

## Overview

This document defines requirements for 3D assets used in the Backtrack avatar system. The system uses modular GLTF/GLB assets that share a common skeleton, enabling customizable avatars rendered via React Three Fiber in a WebView.

---

## Asset Categories

| Category | Asset Count | Priority |
|----------|-------------|----------|
| Base skeleton/armature | 1 | P0 - Critical |
| Head shapes | 6 | P0 - Critical |
| Hair styles | 10 | P0 - Critical |
| Eye shapes | 4 | P1 - High |
| Nose shapes | 4 | P1 - High |
| Mouth expressions | 4 | P1 - High |
| Eyebrow styles | 4 | P1 - High |
| Facial hair | 4 | P2 - Medium |
| Body types | 3 | P2 - Medium |
| **Total** | **40** | |

---

## Technical Specifications

### File Format

| Specification | Requirement |
|---------------|-------------|
| **Format** | GLB (binary GLTF) |
| **Version** | glTF 2.0 |
| **Compression** | Draco mesh compression (optional for <50KB files) |
| **Texture format** | PNG or JPEG embedded |
| **Animation format** | Not required for static parts |

### Polygon Budget

| Part | Max Triangles | Notes |
|------|---------------|-------|
| Base skeleton | 5,000 | Includes body mesh |
| Head | 2,000 | Per head shape variant |
| Hair | 1,500 | Per hair style |
| Eyes (pair) | 500 | Including iris geometry |
| Nose | 300 | Per nose variant |
| Mouth | 400 | Per expression |
| Eyebrows (pair) | 200 | Per style |
| Facial hair | 800 | Per type |
| **Full avatar max** | ~10,000 | Combined loaded parts |

### File Size Budget

| Part | Max Size | Notes |
|------|----------|-------|
| Base skeleton | 100 KB | Includes textures |
| Head shapes | 50 KB | Each variant |
| Hair styles | 30 KB | Each style |
| Facial features | 10 KB | Each (eyes, nose, mouth, etc.) |
| **Total bundle** | 500 KB | All base assets |

---

## Skeleton Structure (Mixamo-Compatible)

The base skeleton must use Mixamo-compatible bone naming for animation compatibility:

```
Hips
├── Spine
│   └── Spine1
│       └── Spine2
│           └── Neck
│               └── Head
│                   ├── LeftEye
│                   ├── RightEye
│                   └── Jaw (optional)
├── LeftUpLeg
│   └── LeftLeg
│       └── LeftFoot
│           └── LeftToeBase
├── RightUpLeg
│   └── RightLeg
│       └── RightFoot
│           └── RightToeBase
├── LeftShoulder
│   └── LeftArm
│       └── LeftForeArm
│           └── LeftHand
│               └── LeftHandIndex1 (optional)
└── RightShoulder
    └── RightArm
        └── RightForeArm
            └── RightHand
                └── RightHandIndex1 (optional)
```

### Required Bones (Minimum)
- Hips, Spine, Spine1, Spine2, Neck, Head
- LeftUpLeg, LeftLeg, LeftFoot
- RightUpLeg, RightLeg, RightFoot
- LeftArm, LeftForeArm, LeftHand
- RightArm, RightForeArm, RightHand

### Bone Naming
- Use exact Mixamo naming convention (PascalCase, no prefixes)
- Consistent naming enables animation retargeting

---

## Attachment Points

### Head Attachment
- **Bone**: `Head`
- **Method**: Parent to Head bone or use bone offset
- Hair, eyes, eyebrows, nose, mouth attach to head

### Body Attachment
- **Bone**: `Hips` (root)
- **Method**: Skinned mesh with shared skeleton
- Body variants share base skeleton weights

---

## Material Requirements

### Skin Materials
- **Type**: PBR (Physically Based Rendering)
- **Maps**: Diffuse/Albedo required; Normal optional
- **Color**: Must support runtime color tinting via `material.color`
- **Skin tones**: 8 color presets (defined in code, not textures)

```javascript
// Skin tone presets
const SKIN_TONES = {
  light1: '#FFDFC4',
  light2: '#F0D5BE',
  medium1: '#D1A684',
  medium2: '#C68642',
  tan1: '#8D5524',
  tan2: '#6B4423',
  dark1: '#4A312C',
  dark2: '#3B2219',
};
```

### Hair Materials
- **Type**: Basic or PBR
- **Maps**: Diffuse only (for tinting)
- **Color**: Must support runtime color tinting
- **Hair colors**: 10 color presets

```javascript
// Hair color presets
const HAIR_COLORS = {
  black: '#090806',
  darkBrown: '#3B3024',
  brown: '#6A4E42',
  lightBrown: '#A67B5B',
  blonde: '#E6BE8A',
  platinum: '#F5EEE6',
  red: '#8B3A3A',
  auburn: '#922724',
  gray: '#B8B8B8',
  white: '#F5F5F5',
};
```

### Eye Materials
- **Iris**: Separate material for color tinting
- **Sclera**: White, untinted
- **Eye colors**: 6 color presets

```javascript
// Eye color presets
const EYE_COLORS = {
  brown: '#634E34',
  hazel: '#8E7618',
  green: '#3D671D',
  blue: '#2E536F',
  gray: '#6B7B8C',
  amber: '#B5652B',
};
```

---

## Part Swapping Architecture

Following the [gltf-avatar-threejs](https://github.com/shrekshao/gltf-avatar-threejs) pattern:

### Skeleton Sharing
All parts share a single skeleton reference:

```jsx
// In React Three Fiber
function Asset({ url, skeleton, ...props }) {
  const { scene } = useGLTF(url);
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);

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

### UV Consistency
- All head variants must share the same UV layout
- Enables consistent texturing across shapes
- Simplifies material management

### Origin Points
- All parts centered at origin
- Y-up orientation
- Scale: 1 unit = 1 meter

---

## Asset File Structure

```
webgl-avatar/public/models/
├── base/
│   ├── Armature.glb          # Base skeleton (required)
│   └── manifest.json         # Base asset metadata
├── heads/
│   ├── oval.glb
│   ├── round.glb
│   ├── square.glb
│   ├── heart.glb
│   ├── oblong.glb
│   ├── diamond.glb
│   └── manifest.json
├── hair/
│   ├── short.glb
│   ├── medium.glb
│   ├── long.glb
│   ├── curly.glb
│   ├── wavy.glb
│   ├── ponytail.glb
│   ├── bun.glb
│   ├── afro.glb
│   ├── buzz.glb
│   ├── bald.glb              # Empty/scalp only
│   └── manifest.json
├── eyes/
│   ├── almond.glb
│   ├── round.glb
│   ├── monolid.glb
│   ├── hooded.glb
│   └── manifest.json
├── noses/
│   ├── straight.glb
│   ├── roman.glb
│   ├── button.glb
│   ├── wide.glb
│   └── manifest.json
├── mouths/
│   ├── neutral.glb
│   ├── smile.glb
│   ├── slight.glb
│   ├── serious.glb
│   └── manifest.json
├── eyebrows/
│   ├── natural.glb
│   ├── arched.glb
│   ├── thick.glb
│   ├── thin.glb
│   └── manifest.json
└── facial-hair/
    ├── none.glb              # Empty placeholder
    ├── stubble.glb
    ├── goatee.glb
    ├── beard.glb
    └── manifest.json
```

### Manifest File Format

```json
{
  "category": "hair",
  "version": "1.0.0",
  "assets": [
    {
      "id": "short",
      "name": "Short Hair",
      "file": "short.glb",
      "sizeKB": 28,
      "triangles": 1200,
      "colorTintable": true,
      "tags": ["masculine", "feminine", "common"]
    }
  ]
}
```

---

## Asset Source Evaluation

### 1. Ready Player Me

| Aspect | Details |
|--------|---------|
| **License** | CC BY-NC 4.0 (free); Commercial requires partner registration |
| **Format** | GLB native |
| **Quality** | Professional, production-ready |
| **Modularity** | Complete avatars, not modular parts |
| **Verdict** | ❌ Not suitable - dependency on external platform |

**References:**
- [Licensing & Privacy](https://docs.readyplayer.me/ready-player-me/support/terms-of-use)
- [Developer Terms](https://studio.readyplayer.me/terms)

### 2. Mixamo / Adobe Fuse

| Aspect | Details |
|--------|---------|
| **License** | Free with Adobe account; commercial use permitted |
| **Format** | FBX, DAE (requires conversion to GLB) |
| **Quality** | Professional rigging, huge animation library |
| **Modularity** | Complete characters, not modular |
| **Verdict** | ⚠️ Useful for animations/rigging reference, not for parts |

**References:**
- [Mixamo](https://www.mixamo.com/)
- [Mixamo Help](https://helpx.adobe.com/creative-cloud/help/mixamo-rigging-animation.html)

### 3. Quaternius (RECOMMENDED)

| Aspect | Details |
|--------|---------|
| **License** | CC0 (public domain, no restrictions) |
| **Format** | FBX, OBJ, glTF, Blend |
| **Quality** | High-quality low-poly, game-ready |
| **Modularity** | ✅ Modular character packs available |
| **Verdict** | ✅ EXCELLENT - Primary asset source |

**Key Packs:**
- [Ultimate Modular Women Pack](https://quaternius.com/packs/ultimatemodularwomen.html) - 10 characters, 4 swappable parts each
- [Modular Character Outfits - Fantasy](https://quaternius.itch.io/modular-character-outfits-fantasy) - Humanoid rig, animation-compatible

**References:**
- [Quaternius.com](https://quaternius.com/)
- [Quaternius itch.io](https://quaternius.itch.io/)

### 4. 100 Avatars (Polygonal Mind)

| Aspect | Details |
|--------|---------|
| **License** | CC0 (public domain) |
| **Format** | FBX, VRM (glTF-based) |
| **Quality** | Good, diverse styles |
| **Modularity** | Complete avatars, not modular |
| **Verdict** | ⚠️ Good fallback/reference, not for customization |

**References:**
- [GitHub Repository](https://github.com/PolygonalMind/100Avatars)
- [Sketchfab R1](https://sketchfab.com/3d-models/100-avatars-r1-cc0-character-pack-c96f3ac9e8ee4bc192809e4a64bddfc2)
- [Sketchfab R2](https://sketchfab.com/3d-models/100-avatars-r2-cc0-character-pack-80cb24ac52cb4e839930aaa12314f716)

### 5. OpenGameArt / Sketchfab CC0

| Aspect | Details |
|--------|---------|
| **License** | CC0 (varies by asset) |
| **Format** | Various (FBX, OBJ, glTF) |
| **Quality** | Varies widely |
| **Modularity** | Some modular options available |
| **Verdict** | ⚠️ Supplementary source for specific parts |

**References:**
- [OpenGameArt Low Poly Human](https://opengameart.org/content/very-low-poly-human)
- [Sketchfab CC0 Tag](https://sketchfab.com/tags/cc0)
- [Awesome CC0 GitHub List](https://github.com/madjin/awesome-cc0)

---

## Recommended Approach

### Primary Source: Quaternius Modular Packs
1. Download [Ultimate Modular Women Pack](https://quaternius.com/packs/ultimatemodularwomen.html) and equivalent male pack
2. Extract and convert assets to GLB format
3. Adapt to our skeleton structure if needed
4. Create additional variants by modifying base meshes in Blender

### Architecture Reference: gltf-avatar-threejs
- Follow the [gltf-avatar-threejs](https://github.com/shrekshao/gltf-avatar-threejs) pattern
- Skeleton sharing via SkeletonUtils
- Part swapping through component mounting
- Material color override for customization

### Skeleton Standard: Mixamo-Compatible
- Use 65-joint Mixamo skeleton structure
- Enables animation retargeting from Mixamo library
- Industry-standard naming convention

### Fallback: Pre-rendered Sprites
If 3D proves too complex, fall back to pre-rendered PNG sprites:
1. Render all combinations in Blender
2. Export as sprite sheets
3. Composite in-app via Image layers

---

## Quality Checklist

Before adding any asset:

- [ ] File format is GLB (glTF 2.0)
- [ ] Triangle count within budget
- [ ] File size within budget
- [ ] Uses Mixamo-compatible skeleton (if rigged)
- [ ] Materials support color tinting
- [ ] UV layout consistent with category
- [ ] Origin centered, Y-up orientation
- [ ] No external file dependencies
- [ ] License verified as CC0 or compatible
- [ ] Tested in R3F scene
- [ ] Added to manifest.json

---

## Blender Workflow Notes

### Converting FBX to GLB
```bash
# Install gltf-transform CLI
npm install -g @gltf-transform/cli

# Convert with Draco compression
gltf-transform copy input.fbx output.glb --compress draco
```

### Blender Export Settings
- Format: glTF 2.0 Binary (.glb)
- Include: Selected Objects only
- Transform: +Y Up
- Geometry: Apply Modifiers, UVs, Normals
- Compression: Draco (if file > 50KB)

### Batch Processing
```python
# Blender Python script for batch export
import bpy
import os

output_dir = "//export/"

for obj in bpy.context.selected_objects:
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    filepath = os.path.join(output_dir, f"{obj.name}.glb")
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        use_selection=True,
        export_format='GLB',
        export_draco_mesh_compression_enable=True
    )
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-05 | Initial specification |

---

## Related Documents

- [AVATAR_3D_PLAN.md](../AVATAR_3D_PLAN.md) - Overall 3D avatar upgrade plan
- Task 4 Status: `tasks/TASK_4_STATUS.md`
- Task 5-7: Individual part sourcing tasks
