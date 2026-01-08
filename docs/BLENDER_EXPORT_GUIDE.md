# Blender Export Guide for Avatar Assets

> Complete workflow for creating and exporting GLB avatar assets from Blender.

---

## Prerequisites

- **Blender 4.0+** (free from [blender.org](https://www.blender.org))
- glTF exporter (built-in, enabled by default)
- Source models from Mixamo (see `MIXAMO_BONE_HIERARCHY.md`)

---

## Project Setup

### Template File

Use the template at `assets/blender/avatar-template.blend` with these pre-configured settings:

| Setting | Value |
|---------|-------|
| Units | Metric, 1 unit = 1 meter |
| Orientation | Y-up, Z-forward |
| Scale | Human height ~1.7m |
| Frame Rate | 30 FPS |

### Creating New Template

1. File > New > General
2. Delete default cube
3. Set units: Scene Properties > Units > Metric
4. Save as `assets/blender/avatar-template.blend`

---

## Importing Mixamo FBX

### Import Settings

1. File > Import > FBX (.fbx)
2. Configure these settings:

| Category | Setting | Value |
|----------|---------|-------|
| Transform | Scale | 0.01 (Mixamo uses cm, Blender uses m) |
| Transform | Apply Transform | Enabled |
| Armature | Automatic Bone Orientation | Enabled |
| Armature | Primary Bone Axis | Y Axis |
| Armature | Secondary Bone Axis | X Axis |

### Post-Import Cleanup

```python
import bpy

# Select armature
armature = bpy.data.objects['Armature']

# Remove "mixamorig:" prefix from bone names
for bone in armature.data.bones:
    if bone.name.startswith('mixamorig:'):
        bone.name = bone.name.replace('mixamorig:', '')
```

---

## Material Setup for Color Tinting

### Skin Material

Create a tintable PBR material:

1. Select mesh > Material Properties > New
2. Name: `Skin_Tintable`
3. Configure Principled BSDF:
   - Base Color: `#F5D5B7` (neutral skin tone)
   - Subsurface: `0.1`
   - Subsurface Color: `#CC8866`
   - Roughness: `0.4`
   - Specular: `0.3`

### Hair Material

1. Create material named `Hair_Tintable`
2. Configure Principled BSDF:
   - Base Color: `#3B3024` (neutral brown)
   - Roughness: `0.6`
   - Specular: `0.2`
   - Anisotropic: `0.5` (optional, for hair shine)

### Clothing Material

1. Create material named `Clothing_Tintable`
2. Configure Principled BSDF:
   - Base Color: `#555555` (neutral gray)
   - Roughness: `0.7`
   - Specular: `0.1`

**Important**: The `Base Color` will be multiplied with the runtime tint color via `material.color` in Three.js.

---

## Modeling Guidelines

### Polygon Budget

| Part Type | Max Triangles | Target |
|-----------|---------------|--------|
| Full body | 5,000 | 3,000-4,000 |
| Head | 2,000 | 1,500 |
| Hair | 1,500 | 800-1,200 |
| Eyes (pair) | 500 | 300 |
| Nose | 300 | 150-200 |
| Mouth | 400 | 200-300 |
| Eyebrows | 200 | 100 |
| Facial hair | 800 | 400-600 |
| Clothing item | 2,000 | 1,000-1,500 |

### Origin and Scale

- **Origin**: Centered at world origin (0, 0, 0)
- **Scale**: 1 unit = 1 meter
- **Orientation**: Y-up
- **Apply transforms**: Ctrl+A > All Transforms before export

### UV Layout

- All variants of a part type should share the same UV layout
- Single UV map per mesh
- No overlapping UVs (except for intentional mirroring)
- Pack UVs efficiently: Mesh > UV > Pack Islands

---

## Creating Part Variants

### Head Shapes

1. Start with base head mesh
2. Enable Proportional Editing (O key)
3. Sculpt/modify to create variant shapes:
   - **Oval**: Default, balanced proportions
   - **Round**: Wider, shorter, soft features
   - **Square**: Angular jaw, flat cheeks
   - **Heart**: Wide forehead, pointed chin
   - **Oblong**: Longer, narrower
   - **Diamond**: Wide cheekbones, narrow forehead/chin

4. Keep same vertex count and UV layout
5. Export each as separate GLB

### Hair Styles

1. Model hair geometry (can use curves converted to mesh)
2. Position at origin where crown of head would be
3. Use single hair material
4. Apply all modifiers
5. Export

### Clothing

1. Model over body mesh with slight offset (1-2mm) to prevent z-fighting
2. Rig to same skeleton using Automatic Weights
3. Paint weights to match body deformation
4. Apply Armature modifier before export
5. Export with skeleton included

---

## Export Settings for GLB

### Access Export Panel

File > Export > glTF 2.0 (.glb/.gltf)

### Required Settings

| Category | Setting | Value |
|----------|---------|-------|
| **Format** | Format | glTF Binary (.glb) |
| **Include** | Selected Objects | Enabled (for single parts) |
| **Include** | Custom Properties | Enabled |
| **Transform** | +Y Up | Enabled |
| **Mesh** | Apply Modifiers | Enabled |
| **Mesh** | UVs | Enabled |
| **Mesh** | Normals | Enabled |
| **Mesh** | Tangents | Enabled |
| **Mesh** | Vertex Colors | Enabled (if used) |
| **Material** | Materials | Export |
| **Material** | Images | Automatic |

### For Skinned Meshes (bodies, clothing)

| Category | Setting | Value |
|----------|---------|-------|
| **Animation** | Armatures | Enabled |
| **Animation** | Rest Position Armature | Enabled |
| **Armature** | Export Deform Bones Only | Enabled |

### For Static Parts (hair, accessories)

| Category | Setting | Value |
|----------|---------|-------|
| **Animation** | Armatures | Disabled |

### Draco Compression (for files > 50KB)

| Setting | Value |
|---------|-------|
| **Compression** | Draco | Enabled |
| **Compression Level** | 6 |
| **Quantization Position** | 14 |
| **Quantization Normal** | 10 |
| **Quantization Texcoord** | 12 |

---

## Batch Export Script

Save this script for exporting multiple parts:

```python
import bpy
import os

# Configuration
OUTPUT_DIR = "//export/"  # Relative to blend file
DRACO_COMPRESSION = True
COMPRESSION_LEVEL = 6

def export_selected_as_glb(name):
    """Export selected objects as GLB"""
    filepath = os.path.join(bpy.path.abspath(OUTPUT_DIR), f"{name}.glb")

    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_texcoords=True,
        export_normals=True,
        export_draco_mesh_compression_enable=DRACO_COMPRESSION,
        export_draco_mesh_compression_level=COMPRESSION_LEVEL,
    )
    print(f"Exported: {filepath}")

# Usage: Select object(s) and run
# export_selected_as_glb("hair-short")
```

---

## Quality Checklist

Before exporting any asset, verify:

- [ ] Origin at world center (0, 0, 0)
- [ ] Transforms applied (Ctrl+A > All Transforms)
- [ ] Single tintable material applied
- [ ] UV map present and valid
- [ ] Triangle count within budget
- [ ] No loose vertices or edges
- [ ] Normals facing outward (recalculate if needed)
- [ ] For rigged: weights normalized and clean
- [ ] For rigged: skeleton uses Mixamo bone names

---

## File Size Optimization

### If file is too large:

1. **Reduce geometry**: Decimate modifier
2. **Optimize UVs**: Pack Islands
3. **Use Draco compression**: Enable in export settings
4. **Remove unused data**: File > Clean Up > Unused Data-Blocks
5. **Check textures**: Embedded textures increase size

### Target File Sizes

| Part Type | Max Size | Recommended |
|-----------|----------|-------------|
| Body | 100 KB | 60-80 KB |
| Head | 50 KB | 30-45 KB |
| Hair | 30 KB | 15-25 KB |
| Facial feature | 10 KB | 3-8 KB |
| Clothing | 50 KB | 25-40 KB |

---

## Testing Exports

### Quick Test in Blender

1. File > Import > glTF 2.0
2. Import the exported GLB
3. Verify mesh and materials look correct

### Test in Three.js

```javascript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

loader.load('model.glb', (gltf) => {
  console.log('Model loaded successfully');
  console.log('Meshes:', gltf.scene.children.length);

  gltf.scene.traverse((node) => {
    if (node.isMesh) {
      console.log(`Mesh: ${node.name}, Triangles: ${node.geometry.index.count / 3}`);
    }
  });

  scene.add(gltf.scene);
});
```

### Test Color Tinting

```javascript
gltf.scene.traverse((node) => {
  if (node.isMesh && node.material) {
    // Apply runtime tint
    node.material.color.set('#FF6B6B');
  }
});
```

---

## Troubleshooting

### Model appears black

- Check materials are exported (not "None")
- Verify normals are facing outward
- Check lighting in scene

### Model is wrong scale

- Apply transforms before export
- Use scale 0.01 when importing Mixamo FBX
- Check "+Y Up" is enabled in export

### Bones missing or wrong

- Ensure bone names match Mixamo convention exactly
- Check "Export Deform Bones Only" for skinned meshes
- Verify armature modifier is present on mesh

### Animation not working

- Ensure skeleton uses same bone names
- Check bone hierarchy matches expected structure
- Verify mesh has valid vertex weights

### Color tinting not working

- Material must use Principled BSDF
- Base Color should not use texture (or use neutral texture)
- Check material mode is "OPAQUE" not "BLEND"

---

## Workflow Summary

```
1. Open avatar-template.blend
2. Import Mixamo FBX (scale 0.01)
3. Clean up bone names
4. Create/modify part geometry
5. Apply tintable materials
6. Apply transforms (Ctrl+A)
7. Export as GLB with settings above
8. Test import
9. Add to manifest.json
10. Upload to Supabase Storage
```

---

## Related Files

| File | Purpose |
|------|---------|
| `assets/blender/avatar-template.blend` | Pre-configured template |
| `assets/source-models/*.fbx` | Mixamo source characters |
| `docs/MIXAMO_BONE_HIERARCHY.md` | Skeleton reference |
| `docs/ASSET_REQUIREMENTS.md` | Technical specifications |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-06 | Initial documentation |
