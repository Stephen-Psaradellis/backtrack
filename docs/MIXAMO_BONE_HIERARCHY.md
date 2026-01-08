# Mixamo Bone Hierarchy Reference

> Documentation for Mixamo-compatible skeleton structure used by the Backtrack avatar system.

---

## Overview

The Backtrack avatar system uses the Mixamo 65-joint skeleton standard. This ensures:
- Compatibility with thousands of free Mixamo animations
- Industry-standard bone naming for tool interoperability
- Consistent rigging across all avatar parts

---

## Full Bone Hierarchy (65 Joints)

```
Hips (Root)
├── Spine
│   └── Spine1
│       └── Spine2
│           ├── Neck
│           │   └── Head
│           │       ├── HeadTop_End
│           │       ├── LeftEye
│           │       ├── RightEye
│           │       └── Jaw (optional)
│           │           └── Jaw_End
│           ├── LeftShoulder
│           │   └── LeftArm
│           │       └── LeftForeArm
│           │           └── LeftHand
│           │               ├── LeftHandThumb1
│           │               │   └── LeftHandThumb2
│           │               │       └── LeftHandThumb3
│           │               │           └── LeftHandThumb4
│           │               ├── LeftHandIndex1
│           │               │   └── LeftHandIndex2
│           │               │       └── LeftHandIndex3
│           │               │           └── LeftHandIndex4
│           │               ├── LeftHandMiddle1
│           │               │   └── LeftHandMiddle2
│           │               │       └── LeftHandMiddle3
│           │               │           └── LeftHandMiddle4
│           │               ├── LeftHandRing1
│           │               │   └── LeftHandRing2
│           │               │       └── LeftHandRing3
│           │               │           └── LeftHandRing4
│           │               └── LeftHandPinky1
│           │                   └── LeftHandPinky2
│           │                       └── LeftHandPinky3
│           │                           └── LeftHandPinky4
│           └── RightShoulder
│               └── RightArm
│                   └── RightForeArm
│                       └── RightHand
│                           ├── RightHandThumb1
│                           │   └── RightHandThumb2
│                           │       └── RightHandThumb3
│                           │           └── RightHandThumb4
│                           ├── RightHandIndex1
│                           │   └── RightHandIndex2
│                           │       └── RightHandIndex3
│                           │           └── RightHandIndex4
│                           ├── RightHandMiddle1
│                           │   └── RightHandMiddle2
│                           │       └── RightHandMiddle3
│                           │           └── RightHandMiddle4
│                           ├── RightHandRing1
│                           │   └── RightHandRing2
│                           │       └── RightHandRing3
│                           │           └── RightHandRing4
│                           └── RightHandPinky1
│                               └── RightHandPinky2
│                                   └── RightHandPinky3
│                                       └── RightHandPinky4
├── LeftUpLeg
│   └── LeftLeg
│       └── LeftFoot
│           └── LeftToeBase
│               └── LeftToe_End
└── RightUpLeg
    └── RightLeg
        └── RightFoot
            └── RightToeBase
                └── RightToe_End
```

---

## Minimum Required Bones (21 Joints)

For basic avatar display without finger articulation:

```
Hips (Root)
├── Spine
│   └── Spine1
│       └── Spine2
│           ├── Neck
│           │   └── Head
│           ├── LeftShoulder
│           │   └── LeftArm
│           │       └── LeftForeArm
│           │           └── LeftHand
│           └── RightShoulder
│               └── RightArm
│                   └── RightForeArm
│                       └── RightHand
├── LeftUpLeg
│   └── LeftLeg
│       └── LeftFoot
└── RightUpLeg
    └── RightLeg
        └── RightFoot
```

---

## Bone Reference Table

| Bone Name | Parent | Purpose |
|-----------|--------|---------|
| **Hips** | - | Root bone, pelvis center |
| **Spine** | Hips | Lower spine |
| **Spine1** | Spine | Middle spine |
| **Spine2** | Spine1 | Upper spine/chest |
| **Neck** | Spine2 | Neck base |
| **Head** | Neck | Head center |
| **HeadTop_End** | Head | Crown of head |
| **LeftEye** | Head | Left eye socket |
| **RightEye** | Head | Right eye socket |
| **LeftShoulder** | Spine2 | Left clavicle |
| **LeftArm** | LeftShoulder | Left upper arm |
| **LeftForeArm** | LeftArm | Left lower arm |
| **LeftHand** | LeftForeArm | Left wrist |
| **RightShoulder** | Spine2 | Right clavicle |
| **RightArm** | RightShoulder | Right upper arm |
| **RightForeArm** | RightArm | Right lower arm |
| **RightHand** | RightForeArm | Right wrist |
| **LeftUpLeg** | Hips | Left thigh |
| **LeftLeg** | LeftUpLeg | Left shin |
| **LeftFoot** | LeftLeg | Left ankle |
| **LeftToeBase** | LeftFoot | Left toe root |
| **RightUpLeg** | Hips | Right thigh |
| **RightLeg** | RightUpLeg | Right shin |
| **RightFoot** | RightLeg | Right ankle |
| **RightToeBase** | RightFoot | Right toe root |

---

## Bone Naming Convention

- **Format**: PascalCase with no prefixes or suffixes
- **No prefixes**: Use `LeftArm` not `mixamorig:LeftArm` or `Armature_LeftArm`
- **Consistent L/R naming**: Always use `Left` / `Right` prefix for paired bones
- **Numbering**: Finger bones use 1-4 suffix (1 = base, 4 = tip)

### Common Naming Errors to Avoid

| Wrong | Correct |
|-------|---------|
| `mixamorig:Hips` | `Hips` |
| `Armature_LeftArm` | `LeftArm` |
| `L_Arm` | `LeftArm` |
| `arm.L` | `LeftArm` |
| `LeftHandIndex_1` | `LeftHandIndex1` |

---

## Transform Properties

### Rest Pose (T-Pose)

All Mixamo characters should be rigged in a T-pose with:

| Property | Value |
|----------|-------|
| **Arms** | Extended horizontally, palms down |
| **Legs** | Straight down, feet parallel |
| **Spine** | Upright, no bend |
| **Head** | Facing forward, chin level |

### Coordinate System

| Axis | Direction |
|------|-----------|
| **Y** | Up (height) |
| **Z** | Forward (depth) |
| **X** | Right (width) |

### Scale

- 1 unit = 1 meter
- Average human height: ~1.7 units
- Hips height: ~1.0 unit

---

## Attachment Points for Avatar Parts

### Head Attachments

Parts that attach to the Head bone:

| Part Type | Attachment Bone | Offset Notes |
|-----------|----------------|--------------|
| Hair | Head | Position at crown |
| Eyes | LeftEye / RightEye | Match socket position |
| Eyebrows | Head | Above eye position |
| Nose | Head | Center face, bridge level |
| Mouth | Head | Lower face center |
| Facial Hair | Head | Lower face |
| Glasses | Head | Eye level |
| Headwear | Head | Above hair layer |

### Body Attachments

Parts that use skinned mesh with skeleton:

| Part Type | Key Bones | Notes |
|-----------|-----------|-------|
| Torso | Spine, Spine1, Spine2 | Upper body deformation |
| Tops/Shirts | Spine2, Shoulders, Arms | Follows upper body |
| Bottoms/Pants | Hips, Legs | Follows lower body |
| Accessories | Varies | Depends on item |

---

## Downloading from Mixamo

### Steps to Download Base Characters

1. Go to [mixamo.com](https://www.mixamo.com) (free Adobe account required)
2. Click "Characters" tab
3. Select **Y Bot** (gender-neutral) or **X Bot**
4. Click "Download"
5. Settings:
   - **Format**: FBX Binary (.fbx)
   - **Skin**: With Skin
   - **Pose**: T-Pose
   - **Frames per Second**: 30
   - **Keyframe Reduction**: None

### Recommended Characters

| Character | Use Case | Notes |
|-----------|----------|-------|
| **Y Bot** | Primary base | Gray humanoid, clean geometry |
| **X Bot** | Alternative | Different proportions |
| **Maximo** | Reference | Human proportions |

---

## Verifying Bone Structure

### Blender Verification

```python
import bpy

# Get armature
armature = bpy.data.objects['Armature']

# Print bone hierarchy
def print_bones(bone, indent=0):
    print("  " * indent + bone.name)
    for child in bone.children:
        print_bones(child, indent + 1)

for bone in armature.data.bones:
    if bone.parent is None:
        print_bones(bone)
```

### Three.js Verification

```javascript
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
loader.load('model.glb', (gltf) => {
  gltf.scene.traverse((node) => {
    if (node.isBone) {
      console.log(`Bone: ${node.name}, Parent: ${node.parent?.name || 'None'}`);
    }
  });
});
```

---

## Common Issues

### "Bone not found" errors

- Check for exact spelling (case-sensitive)
- Remove prefixes like `mixamorig:`
- Use Blender's bone renaming to fix

### Animations not working

- Verify skeleton has same bone names as animation
- Check that armature modifier is applied
- Ensure mesh is properly weighted

### Mesh deformation issues

- Check vertex weights (each vertex should have weights summing to 1.0)
- Use Blender's Weight Paint mode to fix
- Normalize weights: Mesh menu > Weights > Normalize All

---

## Related Files

| File | Purpose |
|------|---------|
| `assets/source-models/ybot-tpose.fbx` | Y Bot base character |
| `assets/source-models/xbot-tpose.fbx` | X Bot base character |
| `webgl-avatar/public/models/base/` | Processed base skeleton |
| `docs/BLENDER_EXPORT_GUIDE.md` | Export workflow |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-06 | Initial documentation |
